#!/usr/bin/env python3
"""Extract content-only records from published Google Slides decks.

Google's published Slides page embeds each slide as SVG markup.  This reader
keeps the ordered accessibility text, slide titles, links, rendered image
references, and any media URLs that are actually exposed by the page.  It
does not query Drive internals or infer missing audio URLs.

The command is intentionally read-only with respect to the course data.  It
reads the reviewed course snapshot and public published URLs, then writes a
manifest plus one content-only JSON record per lesson.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
DEFAULT_SNAPSHOT = Path(
    r"C:\Users\ACER\.codex\worktrees\lesson-guided-pilot\web\docs\audit"
    r"\lingowow-esencial-course-content-snapshot.json"
)
DEFAULT_MANIFEST = Path("docs/audit/course-source-manifest.json")
DEFAULT_SOURCE_DIR = Path("docs/audit/source-files")
DEFAULT_WORKERS = 4
DEFAULT_TIMEOUT_SECONDS = 45
MAX_HTML_BYTES = 15_000_000

SVG_TAG_RE = re.compile(r"<(/?)svg\b[^>]*>", re.IGNORECASE)
SLIDE_NUMBER_RE = re.compile(r'\bid=["\']p(\d+)\.0["\']', re.IGNORECASE)
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"


class SourceExtractionError(RuntimeError):
    """Raised for malformed input that cannot safely produce a source record."""


def _decode_google_markup(markup: str) -> str:
    """Decode the JavaScript-style markup wrapper used by published Slides."""

    decoded = re.sub(
        r"\\x([0-9A-Fa-f]{2})",
        lambda match: chr(int(match.group(1), 16)),
        markup,
    )
    # The SVG payload is JavaScript-string escaped after the hex escapes.
    return decoded.replace(r"\/", "/").replace(r'\"', '"')


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(html.unescape(value).replace("\xa0", " ").split())


def _clean_url(value: str | None) -> str:
    if not value:
        return ""
    return html.unescape(value).strip()


def _normalise_link(value: str) -> str:
    """Unwrap the Google redirect used around links inside SVG anchors."""

    value = _clean_url(value)
    if not value:
        return ""
    if value.startswith("//"):
        value = f"https:{value}"

    match = re.search(r"[?&]q=([^&]+)", value)
    if match and "google.com/url" in value:
        value = urllib.parse.unquote(match.group(1))

    return value.rstrip(".,;)")


def _href(element: ET.Element) -> str:
    return _clean_url(element.attrib.get("href") or element.attrib.get(XLINK_HREF))


def _element_tag(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1].lower()


def _extract_meta(markup: str, name: str) -> str:
    pattern = re.compile(
        rf"<meta\b[^>]*(?:property|name)=[\"']{re.escape(name)}[\"'][^>]*>",
        re.IGNORECASE,
    )
    reverse_pattern = re.compile(
        rf"<meta\b[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:property|name)=[\"']{re.escape(name)}[\"'][^>]*>",
        re.IGNORECASE,
    )
    for match in pattern.finditer(markup):
        content = re.search(r"content=[\"']([^\"']*)[\"']", match.group(0), re.IGNORECASE)
        if content:
            return _clean_text(content.group(1))
    reverse = reverse_pattern.search(markup)
    return _clean_text(reverse.group(1)) if reverse else ""


def _parse_table(element: ET.Element) -> dict[str, Any]:
    rows: list[list[str]] = []
    for row in element.iter():
        if _element_tag(row) not in {"tr", "row"}:
            continue
        cells: list[str] = []
        for cell in row.iter():
            if _element_tag(cell) in {"td", "th", "cell"}:
                cells.append(_clean_text("".join(cell.itertext())))
        if cells:
            rows.append(cells)
    return {"rows": rows}


def _extract_svg_chunks(decoded_markup: str) -> list[str]:
    """Return top-level slide SVGs, ignoring nested SVG icons."""

    chunks: list[str] = []
    depth = 0
    start: int | None = None
    for match in SVG_TAG_RE.finditer(decoded_markup):
        closing = bool(match.group(1))
        if not closing:
            if depth == 0:
                start = match.start()
            depth += 1
            continue
        if depth == 0:
            continue
        depth -= 1
        if depth == 0 and start is not None:
            chunks.append(decoded_markup[start : match.end()])
            start = None
    return chunks


def _media_kind(url: str, tag: str) -> tuple[str, bool]:
    lowered = url.lower()
    if "slides-images-rt" in lowered:
        return "rendered-slide-image", False
    if lowered.endswith("/audio.png") or "drawings/images/audio.png" in lowered:
        return "audio-icon", False
    if tag in {"audio", "source"} or lowered.endswith((".mp3", ".wav", ".wma", ".ogg", ".m4a", ".aac")):
        return "audio", True
    if tag == "video" or lowered.endswith((".webm", ".mp4")):
        return "video", True
    if "youtube.com/" in lowered or "youtu.be/" in lowered or "vimeo.com/" in lowered:
        return "video", True
    return "image", True


def _link_kind(url: str) -> str:
    lowered = url.lower()
    if "youtube.com/" in lowered or "youtu.be/" in lowered or "vimeo.com/" in lowered:
        return "video"
    if lowered.endswith((".mp3", ".wav", ".wma", ".ogg", ".m4a", ".aac")):
        return "audio"
    if lowered.endswith((".webm", ".mp4")):
        return "video"
    return "link"


def _unique_dicts(items: Iterable[Mapping[str, Any]], keys: Sequence[str]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        key = tuple(item.get(name) for name in keys)
        if key in seen:
            continue
        seen.add(key)
        result.append(dict(item))
    return result


def _parse_slide(raw_svg: str, index: int) -> dict[str, Any]:
    # Published decks occasionally reuse an internal page id after a slide
    # containing an audio icon.  DOM order is the reliable slide order.
    number_match = SLIDE_NUMBER_RE.search(raw_svg)
    internal_page_id = int(number_match.group(1)) if number_match else None
    number = index
    try:
        root = ET.fromstring(raw_svg)
    except ET.ParseError as exc:
        raise SourceExtractionError(f"slide {number} SVG parse failed: {exc}") from exc

    labels: list[str] = []
    links: list[dict[str, str]] = []
    media: list[dict[str, Any]] = []
    direct_media_urls: list[str] = []

    for element in root.iter():
        label = _clean_text(element.attrib.get("aria-label"))
        if label:
            labels.append(label)

        tag = _element_tag(element)
        href = _href(element)
        if href and tag in {"a", "image", "audio", "video", "source"}:
            normalized = _normalise_link(href)
            if not normalized:
                continue
            kind, original = _media_kind(normalized, tag) if tag != "a" else (_link_kind(normalized), True)
            if tag == "a":
                links.append({"url": normalized, "kind": kind, "source": "anchor"})
                if kind in {"audio", "video"}:
                    direct_media_urls.append(normalized)
            else:
                media.append({"url": normalized, "kind": kind, "original": original, "source": tag})
                if kind in {"audio", "video"} and original:
                    direct_media_urls.append(normalized)

    # Some published decks expose a video/audio URL only as visible text.
    for label in labels:
        for match in URL_RE.findall(label):
            normalized = _normalise_link(match)
            kind = _link_kind(normalized)
            if kind in {"audio", "video"}:
                links.append({"url": normalized, "kind": kind, "source": "visible-text"})
                direct_media_urls.append(normalized)

    tables = [_parse_table(element) for element in root.iter() if _element_tag(element) == "table"]
    media = _unique_dicts(media, ("url", "kind", "source"))
    links = _unique_dicts(links, ("url", "kind", "source"))
    audio_urls = sorted({url for url in direct_media_urls if _link_kind(url) == "audio"})
    video_urls = sorted({url for url in direct_media_urls if _link_kind(url) == "video"})
    audio_icon_count = sum(1 for item in media if item["kind"] == "audio-icon")
    warnings: list[str] = []
    if audio_icon_count and not audio_urls:
        warnings.append("audio-icon-without-original-url")
    if not tables and re.search(r"\b(?:table|chart|grid)\b", " ".join(labels), re.IGNORECASE):
        warnings.append("table-or-chart-mentioned-without-table-semantics")

    return {
        "number": number,
        "internalPageId": internal_page_id,
        "title": labels[0] if labels else "",
        "visibleTexts": labels,
        "links": links,
        "media": media,
        "tables": tables,
        "warnings": warnings,
        "mediaSummary": {
            "audioUrls": audio_urls,
            "videoUrls": video_urls,
            "audioIconCount": audio_icon_count,
            "renderedSlideImageCount": sum(
                1 for item in media if item["kind"] == "rendered-slide-image"
            ),
            "tableCount": len(tables),
        },
    }


def parse_published_html(markup: str, source_url: str) -> dict[str, Any]:
    """Parse one published Slides response into content-only JSON data."""

    decoded = _decode_google_markup(markup)
    svg_chunks = _extract_svg_chunks(decoded)
    slides = [_parse_slide(chunk, index) for index, chunk in enumerate(svg_chunks, start=1)]
    slides.sort(key=lambda slide: slide["number"])
    audio_urls = sorted(
        {url for slide in slides for url in slide["mediaSummary"]["audioUrls"]}
    )
    video_urls = sorted(
        {url for slide in slides for url in slide["mediaSummary"]["videoUrls"]}
    )
    audio_icons = sum(slide["mediaSummary"]["audioIconCount"] for slide in slides)
    return {
        "sourceUrl": source_url,
        "deckTitle": _extract_meta(markup, "og:title") or _extract_meta(markup, "title"),
        "slideCount": len(slides),
        "slides": slides,
        "mediaSummary": {
            "audioUrls": audio_urls,
            "videoUrls": video_urls,
            "audioIconCount": audio_icons,
            "missingAudioSourceCount": audio_icons if audio_icons and not audio_urls else 0,
            "renderedSlideImageCount": sum(
                slide["mediaSummary"]["renderedSlideImageCount"] for slide in slides
            ),
            "tableCount": sum(slide["mediaSummary"]["tableCount"] for slide in slides),
        },
        "warnings": sorted(
            {
                warning
                for slide in slides
                for warning in slide["warnings"]
            }
        ),
    }


def _fetch_url(url: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "Lingowow-course-source-audit/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content = response.read(MAX_HTML_BYTES + 1)
        if len(content) > MAX_HTML_BYTES:
            raise SourceExtractionError(f"response exceeded {MAX_HTML_BYTES} bytes")
        charset = response.headers.get_content_charset() or "utf-8"
        markup = content.decode(charset, errors="replace")
        parsed = parse_published_html(markup, url)
        parsed["httpStatus"] = response.status
        parsed["finalUrl"] = response.geturl()
        parsed["contentType"] = response.headers.get_content_type()
        return parsed


def load_published_sources(snapshot_path: Path) -> list[dict[str, Any]]:
    with snapshot_path.open(encoding="utf-8") as snapshot_file:
        snapshot = json.load(snapshot_file)
    course = snapshot.get("course")
    if not isinstance(course, Mapping) or course.get("id") != COURSE_ID:
        raise SourceExtractionError(f"snapshot is not course {COURSE_ID}")

    records: list[dict[str, Any]] = []
    for module in snapshot.get("modules", []):
        for lesson in module.get("lessons", []):
            if not lesson.get("isPublished"):
                continue
            embeds = [
                content
                for content in lesson.get("contents", [])
                if isinstance(content.get("data"), Mapping)
                and content["data"].get("type") == "embed"
                and isinstance(content["data"].get("url"), str)
                and content["data"]["url"]
            ]
            if len(embeds) != 1:
                continue
            records.append(
                {
                    "module": {
                        "id": module["id"],
                        "order": module["order"],
                        "title": module["title"],
                    },
                    "lesson": {
                        "id": lesson["id"],
                        "order": lesson["order"],
                        "title": lesson["title"],
                        "videoUrl": lesson.get("videoUrl"),
                    },
                    "contentId": embeds[0]["id"],
                    "sourceUrl": embeds[0]["data"]["url"],
                }
            )
    records.sort(key=lambda record: (record["module"]["order"], record["lesson"]["order"], record["lesson"]["id"]))
    return records


def _attach_source_metadata(
    source: Mapping[str, Any],
    extracted: Mapping[str, Any] | None,
    error: str | None,
) -> dict[str, Any]:
    record = {
        "courseId": COURSE_ID,
        "module": dict(source["module"]),
        "lesson": dict(source["lesson"]),
        "contentId": source["contentId"],
        "sourceUrl": source["sourceUrl"],
    }
    if extracted is None:
        record.update({"status": "error", "error": error or "unknown source error"})
    else:
        record.update({"status": "ok", "deck": dict(extracted)})
    return record


def extract_sources(
    snapshot_path: Path,
    *,
    workers: int = DEFAULT_WORKERS,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> list[dict[str, Any]]:
    if workers < 1 or workers > 4:
        raise ValueError("workers must be between 1 and 4")
    sources = load_published_sources(snapshot_path)
    by_url: dict[str, dict[str, Any] | Exception] = {}
    urls = sorted({source["sourceUrl"] for source in sources})
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(_fetch_url, url, timeout): url for url in urls}
        for future in concurrent.futures.as_completed(futures):
            url = futures[future]
            try:
                by_url[url] = future.result()
            except Exception as exc:  # preserve per-source audit output
                by_url[url] = exc

    output: list[dict[str, Any]] = []
    for source in sources:
        result = by_url[source["sourceUrl"]]
        if isinstance(result, Exception):
            output.append(_attach_source_metadata(source, None, str(result)))
        else:
            output.append(_attach_source_metadata(source, result, None))
    return output


def write_outputs(
    records: Sequence[Mapping[str, Any]],
    *,
    manifest_path: Path = DEFAULT_MANIFEST,
    source_dir: Path = DEFAULT_SOURCE_DIR,
) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    source_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "courseId": COURSE_ID,
        "sourceType": "google-slides-published-html",
        "sourceCount": len(records),
        "okCount": sum(record.get("status") == "ok" for record in records),
        "errorCount": sum(record.get("status") == "error" for record in records),
        "sources": list(records),
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for record in records:
        lesson_id = record["lesson"]["id"]
        (source_dir / f"{lesson_id}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_SECONDS)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    records = extract_sources(
        args.snapshot,
        workers=args.workers,
        timeout=args.timeout,
    )
    write_outputs(records, manifest_path=args.manifest, source_dir=args.source_dir)
    print(
        json.dumps(
            {
                "sourceCount": len(records),
                "okCount": sum(record.get("status") == "ok" for record in records),
                "errorCount": sum(record.get("status") == "error" for record in records),
                "manifest": str(args.manifest),
                "sourceDir": str(args.source_dir),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
