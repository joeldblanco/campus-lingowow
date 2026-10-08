#!/usr/bin/env python3
"""Build deterministic, reviewable guided-learning plans from published slides.

The builder is deliberately data-only.  It reads an existing course snapshot,
reads the published source extraction, and emits plans that can be inspected by
the caller before any database operation is considered.  An optional native
audit can enrich only text-aligned slides with authored tables, paragraphs,
figures, and audio provenance.  A plan is marked unpublishable whenever an
authored listening asset cannot be traced to an original URL, digest, and
transcript.
"""

from __future__ import annotations

import argparse
import copy
from difflib import SequenceMatcher
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
LEARNING_REVISION = "course-guided-v1"
ROW_ID_PREFIX = "course-guided-"


class PlanError(ValueError):
    """Raised when an input cannot be safely interpreted as a course plan."""


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise(value: Any) -> str:
    return re.sub(r"\s+", " ", _text(value)).strip()


def _unique_texts(values: Iterable[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = _normalise(value)
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _canonical_digest(value: Any) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _source_digest(source: Mapping[str, Any]) -> str:
    for key in ("sourceDigest", "digest", "sha256"):
        candidate = _text(source.get(key))
        if candidate:
            return candidate
    without_digest = {
        key: value
        for key, value in source.items()
        if key not in {"sourceDigest", "digest", "sha256", "_sourceFile"}
    }
    return _canonical_digest(without_digest)


def _lesson_id(lesson: Mapping[str, Any]) -> str:
    for key in ("id", "lessonId", "contentId"):
        value = _text(lesson.get(key))
        if value:
            return value
    raise PlanError("lesson has no stable id")


def _source_lesson_id(source: Mapping[str, Any]) -> str:
    lesson = source.get("lesson")
    if isinstance(lesson, Mapping):
        value = _text(lesson.get("id") or lesson.get("lessonId") or lesson.get("contentId"))
        if value:
            return value
    for key in ("lessonId", "contentId"):
        value = _text(source.get(key))
        if value:
            return value
    raise PlanError("source record has no stable lesson id")


def _source_url(source: Mapping[str, Any]) -> str:
    for key in ("sourceUrl", "url", "publishedUrl"):
        value = _text(source.get(key))
        if value:
            return value
    deck = source.get("deck")
    if isinstance(deck, Mapping):
        return _text(deck.get("sourceUrl"))
    return ""


def _deck(source: Mapping[str, Any]) -> Mapping[str, Any]:
    deck = source.get("deck")
    return deck if isinstance(deck, Mapping) else source


def _slides(source: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    raw = _deck(source).get("slides", source.get("slides", []))
    result = [item for item in _as_list(raw) if isinstance(item, Mapping)]
    return sorted(result, key=lambda item: (_slide_number(item), _text(item.get("title"))))


def _slide_number(slide: Mapping[str, Any]) -> int:
    for key in ("number", "slideNumber", "slide", "index"):
        value = slide.get(key)
        if isinstance(value, bool):
            continue
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        return number
    return 0


def _slide_texts(slide: Mapping[str, Any]) -> list[str]:
    values: list[Any] = []
    values.extend(_as_list(slide.get("visibleTexts")))
    values.extend(_as_list(slide.get("texts")))
    if not values and slide.get("text") is not None:
        values.append(slide.get("text"))
    title = _text(slide.get("title"))
    result = _unique_texts(values)
    if title and title not in result:
        result.insert(0, title)
    return result


def _nested_text(value: Any) -> str:
    """Read text from the small paragraph records emitted by audit extractors."""

    if isinstance(value, Mapping):
        for key in ("text", "content", "value", "plainText", "body"):
            candidate = _text(value.get(key))
            if candidate:
                return candidate
        return ""
    return _text(value)


def _native_audit_payload(slide: Mapping[str, Any]) -> Mapping[str, Any] | None:
    value = slide.get("_nativeAudit")
    return value if isinstance(value, Mapping) else None


def _native_paragraphs(slide: Mapping[str, Any]) -> list[str]:
    native = _native_audit_payload(slide)
    if native is None:
        return []
    values: list[Any] = []
    for key in ("paragraphs", "paragraphTexts", "textBlocks", "richText", "bodyText"):
        raw = native.get(key)
        if raw is not None:
            values.extend(_as_list(raw))
    for shape in _as_list(native.get("shapes")):
        if isinstance(shape, Mapping):
            values.extend(_as_list(shape.get("paragraphs")))
    return _unique_texts(_nested_text(value) for value in values)


def _evidence_texts(slide: Mapping[str, Any]) -> list[str]:
    """Keep published text first, then append only explicitly audited paragraphs."""

    return _unique_texts([*_meaningful_texts(slide), *_native_paragraphs(slide)])


_TECHNICAL_LABELS = {
    "introduction",
    "vocabulary introduction",
    "grammar analysis",
    "grammar focus",
    "language use",
    "language targets",
    "language bricks",
    "functional english",
    "let's practice",
    "practice makes perfect",
    "contents",
    "content",
    "copyright",
}


def _is_technical_text(value: str) -> bool:
    lowered = _normalise(value).casefold()
    if not lowered:
        return True
    if lowered in _TECHNICAL_LABELS:
        return True
    if re.fullmatch(r"(?:unit\s*)?\d{1,3}", lowered):
        return True
    if "all rights reserved" in lowered or lowered.startswith("©") or lowered.startswith("copyright"):
        return True
    if re.fullmatch(r"(?:slide\s*)?\d{1,3}", lowered):
        return True
    return False


def _meaningful_texts(slide: Mapping[str, Any]) -> list[str]:
    texts = _slide_texts(slide)
    title = _normalise(slide.get("title"))
    result: list[str] = []
    title_removed = False
    for value in texts:
        if title and value == title and not title_removed:
            title_removed = True
            if not _is_technical_text(value):
                result.append(value)
            continue
        if not _is_technical_text(value):
            result.append(value)
    return _unique_texts(result)


def _prompt_text(slide: Mapping[str, Any], texts: Sequence[str] | None = None) -> str:
    """Return authored prompt text without duplicating the slide heading."""

    values = list(texts if texts is not None else _meaningful_texts(slide))
    title = _normalise(slide.get("title"))
    if title and values and values[0] == title:
        values = values[1:]
    return "\n".join(values).strip() or "\n".join(texts or _slide_texts(slide)).strip()


def _word_limits(text: str) -> tuple[int | None, int | None]:
    match = re.search(r"\b(\d{1,3})\s*[-–—]\s*(\d{1,3})\s+words?\b", text.casefold())
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _time_limit(text: str) -> int | None:
    lowered = text.casefold()
    range_match = re.search(r"\b(\d{1,3})\s*(?:[-–—]|to)\s*(\d{1,3})\s*(?:seconds?|secs?)\b", lowered)
    if range_match:
        # For a range, keep the authored upper bound; no duration is invented
        # when the source gives no recording limit.
        return int(range_match.group(2))
    match = re.search(r"\b(\d{1,3})\s*(?:seconds?|secs?)\b", lowered)
    return int(match.group(1)) if match else None


def _tables(slide: Mapping[str, Any]) -> list[list[list[str]]]:
    def parse(raw_tables: Any) -> list[list[list[str]]]:
        result: list[list[list[str]]] = []
        for raw_table in _as_list(raw_tables):
            if isinstance(raw_table, Mapping):
                raw_rows = raw_table.get("rows", raw_table.get("cells", raw_table.get("values", [])))
            else:
                raw_rows = raw_table
            rows: list[list[str]] = []
            for raw_row in _as_list(raw_rows):
                if isinstance(raw_row, Mapping):
                    raw_row = raw_row.get("cells", raw_row.get("values", raw_row.get("columns", [])))
                cells = [_normalise(cell) for cell in _as_list(raw_row)]
                if cells and any(cells):
                    rows.append(cells)
            if rows:
                result.append(rows)
        return result

    raw_tables = slide.get("tables")
    if raw_tables is None and isinstance(slide.get("table"), Mapping):
        raw_tables = [slide.get("table")]
    parsed = parse(raw_tables)
    if parsed:
        return parsed
    native = slide.get("_nativeAudit")
    if isinstance(native, Mapping):
        for key in ("tables", "actualTables", "tableData", "structuredTables"):
            parsed = parse(native.get(key))
            if parsed:
                return parsed
    return []


def _media(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for item in _as_list(slide.get("media")) + _as_list(slide.get("audio")):
        if isinstance(item, Mapping):
            result.append(item)
        elif _text(item):
            result.append({"url": _text(item), "kind": "audio"})
    summary = slide.get("mediaSummary")
    if isinstance(summary, Mapping):
        for key in ("audioUrls", "audio", "audios"):
            for value in _as_list(summary.get(key)):
                if isinstance(value, Mapping):
                    result.append(value)
                elif _text(value):
                    result.append({"url": _text(value), "kind": "audio"})
        icon_count = summary.get("audioIconCount")
        try:
            if int(icon_count or 0) > 0 and not any(_media_kind(item) == "audio" for item in result):
                result.append({"kind": "audio", "iconOnly": True})
        except (TypeError, ValueError):
            pass
    return result


def _media_kind(item: Mapping[str, Any]) -> str:
    kind = _normalise(item.get("kind") or item.get("type") or "").casefold()
    if "audio" in kind or "sound" in kind:
        return "audio"
    return kind


def _is_audio_required(slide: Mapping[str, Any]) -> bool:
    if any(_media_kind(item) == "audio" for item in _media(slide)):
        return True
    lowered = " ".join(_meaningful_texts(slide)).casefold()
    return bool(re.search(r"\b(?:listen|audio|hear)\b", lowered)) and (
        "audio" in lowered or "listen to" in lowered or "listen for" in lowered
    )


def _video_urls(slide: Mapping[str, Any]) -> list[str]:
    values: list[str] = []
    for item in _as_list(slide.get("media")):
        if isinstance(item, Mapping) and "video" in _media_kind(item):
            values.append(_text(item.get("url") or item.get("mediaUrl") or item.get("sourceUrl")))
    summary = slide.get("mediaSummary")
    if isinstance(summary, Mapping):
        values.extend(_text(value) for value in _as_list(summary.get("videoUrls")))
    for item in _as_list(slide.get("links")):
        if not isinstance(item, Mapping):
            continue
        kind = _normalise(item.get("kind")).casefold()
        url = _text(item.get("url") or item.get("href"))
        if "video" in kind or re.search(r"(?:youtube\.com|youtu\.be|vimeo\.com)/", url.casefold()):
            values.append(url)
    values.append(_text(slide.get("videoUrl")))
    return list(dict.fromkeys(value for value in values if value))


def _native_figures(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    """Return explicitly classified instructional figures from native evidence.

    Generic PPTX ``mediaRefs`` are intentionally excluded here.  They often point
    at a decorative slide background and are not sufficient evidence for a
    student-facing figure.  The audit producer must classify an image as a
    figure/instructional image and provide a local asset path before it can be
    emitted as a native image block.
    """

    native = _native_audit_payload(slide)
    if native is None:
        return []
    result: list[Mapping[str, Any]] = []
    for key in ("figures", "instructionalImages", "illustrations", "imageRefs", "images"):
        for item in _as_list(native.get(key)):
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"path": _text(item)})
    return result


def _audio_url(item: Mapping[str, Any]) -> str:
    for key in ("originalMediaUrl", "originalMediaURL", "mediaUrl", "mediaURL", "url", "sourceUrl", "href"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _audio_digest(item: Mapping[str, Any]) -> str:
    for key in ("mediaDigest", "digest", "sha256", "mediaSHA256", "sha256Digest", "sourceDigest"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _audio_transcript(item: Mapping[str, Any]) -> str:
    for key in ("transcript", "transcription", "transcriptText", "text"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _native_audio_items(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    native = _native_audit_payload(slide)
    if native is None:
        return []
    result: list[Mapping[str, Any]] = []
    for key in ("audio", "audios", "audioRefs", "audioEvidence"):
        for item in _as_list(native.get(key)):
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"url": _text(item), "kind": "audio"})
    return result


def _audio_manifest_entries(
    manifest: Any,
    lesson_id: str,
    slide_number: int,
) -> list[Mapping[str, Any]]:
    if manifest is None:
        return []
    candidates: list[Mapping[str, Any]] = []

    def visit(value: Any, inherited_lesson: str = "", inherited_slide: int | None = None) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item, inherited_lesson, inherited_slide)
            return
        if not isinstance(value, Mapping):
            return
        candidate = dict(value)
        candidate_lesson = _text(
            candidate.get("lessonId") or candidate.get("sourceLessonId") or candidate.get("contentId") or inherited_lesson
        )
        candidate_slide = candidate.get("slideNumber", candidate.get("slide", candidate.get("slideNo", inherited_slide)))
        if _audio_url(candidate) or _audio_transcript(candidate) or _audio_digest(candidate):
            if candidate_lesson:
                candidate["lessonId"] = candidate_lesson
            if candidate_slide is not None:
                candidate["slideNumber"] = candidate_slide
            candidates.append(candidate)
            return
        for key, child in value.items():
            lowered = _text(key).casefold()
            if lowered in {"audio", "audios", "entries", "media", "units", "lessons"}:
                visit(child, inherited_lesson, inherited_slide)
                continue
            next_lesson = inherited_lesson
            next_slide = inherited_slide
            if _text(key) == lesson_id:
                next_lesson = lesson_id
            else:
                try:
                    next_slide = int(key)
                except (TypeError, ValueError):
                    pass
            visit(child, next_lesson, next_slide)

    visit(manifest)
    result: list[Mapping[str, Any]] = []
    for candidate in candidates:
        candidate_lesson = _text(
            candidate.get("lessonId") or candidate.get("sourceLessonId") or candidate.get("contentId")
        )
        candidate_slide = candidate.get("slideNumber", candidate.get("slide", candidate.get("slideNo")))
        if not candidate_lesson and candidate_slide is None:
            # An unscoped manifest entry cannot be safely assigned to a slide.
            continue
        if candidate_lesson and candidate_lesson != lesson_id:
            continue
        if candidate_slide is not None:
            try:
                if int(candidate_slide) != slide_number:
                    continue
            except (TypeError, ValueError):
                continue
        if _audio_url(candidate) or _audio_transcript(candidate) or _audio_digest(candidate):
            result.append(candidate)
    return result


def _native_audit_records(audit: Any) -> list[Mapping[str, Any]]:
    if isinstance(audit, list):
        return [item for item in audit if isinstance(item, Mapping)]
    if not isinstance(audit, Mapping):
        return []
    records = audit.get("records")
    if isinstance(records, list):
        return [item for item in records if isinstance(item, Mapping)]
    # Small audit fixtures often expose a single record directly.
    if audit.get("native") is not None or audit.get("slides") is not None:
        return [audit]
    return []


def _native_record_native(record: Mapping[str, Any]) -> Mapping[str, Any]:
    native = record.get("native")
    if isinstance(native, Mapping):
        return native
    return record


def _source_unit_number(source: Mapping[str, Any]) -> int | None:
    lesson = source.get("lesson")
    if isinstance(lesson, Mapping):
        value = lesson.get("order")
        try:
            if value is not None:
                return int(value)
        except (TypeError, ValueError):
            pass
    title = _text(_deck(source).get("deckTitle") or source.get("title"))
    match = re.search(r"\bunit\s*[-#]?\s*(\d{1,3})\b", title.casefold())
    return int(match.group(1)) if match else None


def _native_record_score(record: Mapping[str, Any], source: Mapping[str, Any]) -> int:
    candidate = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    comparison = record.get("publishedComparison") if isinstance(record.get("publishedComparison"), Mapping) else {}
    score = 0
    source_url = _source_url(source)
    candidate_url = _text(comparison.get("publicSourceUrl") or candidate.get("publicSourceUrl"))
    if source_url and candidate_url and source_url == candidate_url:
        score += 40
    source_unit = _source_unit_number(source)
    try:
        if source_unit is not None and int(record.get("unit")) == source_unit:
            score += 25
    except (TypeError, ValueError):
        pass
    record_lesson = _text(record.get("lessonId") or record.get("sourceLessonId"))
    if record_lesson and record_lesson == _source_lesson_id(source):
        score += 50
    source_title = _normalise(_deck(source).get("deckTitle") or source.get("title")).casefold()
    candidate_title = _normalise(candidate.get("title") or record.get("title")).casefold()
    if source_title and candidate_title:
        if source_title == candidate_title:
            score += 20
        elif source_title.replace(".pptx", "") == candidate_title.replace(".pptx", ""):
            score += 15
    role = _text(candidate.get("role")).casefold()
    if role == "primary-candidate":
        score += 5
    comparison_status = _text(comparison.get("status")).casefold()
    if comparison_status == "text-set-aligned":
        score += 8
    elif comparison_status in {"slide-count-diff-partial-overlap", "mismatch", "unmatched"}:
        score -= 15
    if _text(record.get("status")).casefold() not in {"", "ok", "ready", "published"}:
        score -= 100
    return score


def _select_native_record(
    audit: Any,
    source: Mapping[str, Any],
) -> tuple[Mapping[str, Any] | None, str | None]:
    records = _native_audit_records(audit)
    if not records:
        return None, "native audit has no records"
    scored = sorted(
        ((_native_record_score(record, source), record) for record in records),
        key=lambda item: (-item[0], _text(item[1].get("candidate", {}).get("id") if isinstance(item[1].get("candidate"), Mapping) else item[1].get("id"))),
    )
    best_score, best = scored[0]
    if best_score < 0:
        return None, "no native audit record matched the published source"
    tied = [record for score, record in scored if score == best_score]
    if len(tied) > 1:
        ids = {
            _text(record.get("candidate", {}).get("id") if isinstance(record.get("candidate"), Mapping) else record.get("id"))
            for record in tied
        }
        if len(ids) > 1:
            return None, "multiple native audit records matched with equal confidence"
    return best, None


def _alignment_texts(value: Any) -> list[str]:
    if isinstance(value, Mapping):
        values: list[Any] = []
        for key in ("visibleTexts", "texts", "paragraphs", "paragraphTexts", "title", "text"):
            if key in value:
                values.extend(_as_list(value.get(key)))
        return _unique_texts(_nested_text(item) for item in values)
    return _unique_texts(_nested_text(item) for item in _as_list(value))


def _alignment_score(published: Mapping[str, Any], native: Mapping[str, Any]) -> float:
    published_text = " ".join(_alignment_texts(published)).casefold()
    native_text = " ".join(_alignment_texts(native)).casefold()
    published_text = re.sub(r"[^\w\s]", " ", published_text, flags=re.UNICODE)
    native_text = re.sub(r"[^\w\s]", " ", native_text, flags=re.UNICODE)
    published_text = _normalise(published_text)
    native_text = _normalise(native_text)
    if not published_text or not native_text:
        return 0.0
    if published_text == native_text:
        return 1.0
    published_tokens = set(published_text.split())
    native_tokens = set(native_text.split())
    if not published_tokens or not native_tokens:
        return 0.0
    coverage = len(published_tokens & native_tokens) / len(published_tokens)
    sequence = SequenceMatcher(None, published_text, native_text).ratio()
    same_number = _slide_number(published) == _slide_number(native)
    score = max(sequence, coverage * 0.92)
    if same_number:
        score += 0.03
    return min(score, 1.0)


def _native_slide_matches(
    slides: Sequence[Mapping[str, Any]],
    native_slides: Sequence[Mapping[str, Any]],
) -> dict[int, Mapping[str, Any]]:
    result: dict[int, Mapping[str, Any]] = {}
    used: set[int] = set()
    for published in slides:
        candidates: list[tuple[float, int, Mapping[str, Any]]] = []
        for index, native in enumerate(native_slides):
            if index in used:
                continue
            score = _alignment_score(published, native)
            if score >= 0.76:
                candidates.append((score, index, native))
        candidates.sort(key=lambda item: (-item[0], item[1]))
        if not candidates:
            continue
        best_score, best_index, best_native = candidates[0]
        if len(candidates) > 1 and candidates[1][0] >= best_score - 0.01:
            continue
        result[_slide_number(published)] = best_native
        used.add(best_index)
    return result


def _native_figure_entries(native_slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for key in ("figures", "instructionalImages", "illustrations", "imageRefs", "images"):
        for item in _as_list(native_slide.get(key)):
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"path": _text(item)})
    return result


def _native_tables_payload(native_slide: Mapping[str, Any]) -> Any:
    for key in ("tables", "actualTables", "tableData", "structuredTables"):
        candidate = native_slide.get(key)
        if candidate not in (None, "", [], {}):
            return copy.deepcopy(candidate)
    shape_tables: list[Any] = []
    for shape in _as_list(native_slide.get("shapes")):
        if not isinstance(shape, Mapping):
            continue
        kind = _text(shape.get("kind") or shape.get("type")).casefold()
        if "table" not in kind and not any(key in shape for key in ("rows", "cells", "columns")):
            continue
        table = shape.get("table") if isinstance(shape.get("table"), Mapping) else shape
        shape_tables.append(table)
    return shape_tables or None


def _native_audio_entries(native_slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for key in ("audio", "audios", "audioRefs", "audioEvidence"):
        for item in _as_list(native_slide.get(key)):
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"url": _text(item), "kind": "audio"})
    return result


def _resolve_native_asset_path(
    value: Any,
    record: Mapping[str, Any],
    native_slide: Mapping[str, Any],
    audit_path: str,
) -> str | None:
    raw = _text(value)
    native = _native_record_native(record)
    if raw:
        for media in _as_list(native.get("media")):
            if not isinstance(media, Mapping):
                continue
            media_key = _text(media.get("path") or media.get("mediaPath") or media.get("ref"))
            if media_key and media_key == raw:
                raw = _text(media.get("localPath") or media.get("assetPath") or media.get("filePath")) or raw
                break
        asset_map = native.get("assetMap")
        if isinstance(asset_map, Mapping):
            mapped = _text(asset_map.get(raw))
            if mapped:
                raw = mapped
    if not raw or re.match(r"^[a-z]+://", raw.casefold()) or "slides-images-rt" in raw.casefold():
        return None
    lowered = raw.casefold()
    if "rendered-slide" in lowered or lowered.endswith(".pptx"):
        return None
    candidate_record = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    bases: list[Path] = []
    if audit_path:
        path = Path(audit_path)
        bases.append(path.parent if path.suffix else path)
    for owner in (candidate_record, native, record, native_slide):
        if not isinstance(owner, Mapping):
            continue
        for key in ("assetRoot", "mediaRoot", "extractedDir", "localRoot", "basePath"):
            base = _text(owner.get(key))
            if base:
                bases.append(Path(base))
        local = _text(owner.get("localPath") or owner.get("path"))
        if local and not local.casefold().endswith(".pptx"):
            bases.append(Path(local).parent)
    bases.extend([Path.cwd()])
    paths = [Path(raw)] if Path(raw).is_absolute() else [base / raw for base in bases]
    for path in paths:
        try:
            resolved = path.resolve()
        except OSError:
            continue
        if resolved.is_file():
            return str(resolved)
    return None


def _prepare_native_audit(
    source: Mapping[str, Any],
    native_audit: Any,
    blockers: list[dict[str, Any]],
) -> dict[str, Any]:
    """Attach only unambiguously aligned native evidence to a source copy."""

    copied = copy.deepcopy(dict(source))
    if native_audit is None:
        return copied
    record, error = _select_native_record(native_audit, source)
    if record is None:
        _add_blocker(blockers, _blocker("native-audit-missing", detail=error or "No native audit record matched the source."))
        return copied
    status = _text(record.get("status")).casefold()
    if status and status not in {"ok", "ready", "published"}:
        _add_blocker(blockers, _blocker("native-source-not-ready", detail=f"Native audit status is {record.get('status')!r}."))
    native = _native_record_native(record)
    native_slides = [item for item in _as_list(native.get("slides")) if isinstance(item, Mapping)]
    source_slides = _slides(copied)
    matched = _native_slide_matches(source_slides, native_slides)
    audit_path = _text(native_audit.get("_auditPath")) if isinstance(native_audit, Mapping) else ""
    candidate = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    record_id = _text(candidate.get("id") or record.get("id"))
    comparison = record.get("publishedComparison") if isinstance(record.get("publishedComparison"), Mapping) else {}
    comparison_status = _text(comparison.get("status")).casefold()
    if comparison_status in {"mismatch", "unmatched", "slide-count-diff-partial-overlap"}:
        _add_blocker(
            blockers,
            _blocker("native-source-mismatch", detail=f"Native audit comparison status is {comparison.get('status')!r}."),
        )
    for slide in source_slides:
        number = _slide_number(slide)
        native_slide = matched.get(number)
        if native_slide is None:
            if _meaningful_texts(slide) or _tables(slide) or _is_audio_required(slide):
                _add_blocker(blockers, _blocker("native-slide-mismatch", number, "Published slide text did not align to native audit text."))
            continue
        paragraphs = _unique_texts(
            _nested_text(value)
            for key in ("paragraphs", "paragraphTexts", "textBlocks", "richText", "bodyText")
            for value in _as_list(native_slide.get(key))
        )
        for shape in _as_list(native_slide.get("shapes")):
            if isinstance(shape, Mapping):
                paragraphs = _unique_texts([*paragraphs, *(_nested_text(value) for value in _as_list(shape.get("paragraphs")))])
        native_tables = _native_tables_payload(native_slide)
        figures: list[dict[str, Any]] = []
        for figure in _native_figure_entries(native_slide):
            figure_lesson = _text(figure.get("lessonId") or figure.get("sourceLessonId"))
            figure_slide = figure.get("slideNumber", figure.get("slide", figure.get("slideNo")))
            if figure_lesson and figure_lesson != _source_lesson_id(source):
                _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure evidence is scoped to another lesson."))
                continue
            if figure_slide is not None:
                try:
                    if int(figure_slide) != number:
                        _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure evidence is scoped to another slide."))
                        continue
                except (TypeError, ValueError):
                    _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure slide scope is invalid."))
                    continue
            path_value = ""
            for key in ("localPath", "assetPath", "filePath", "imagePath", "mediaPath", "path", "src", "url"):
                path_value = _text(figure.get(key))
                if path_value:
                    break
            asset_path = _resolve_native_asset_path(path_value, record, native_slide, audit_path)
            if not asset_path:
                _add_blocker(
                    blockers,
                    _blocker("native-figure-untraceable", number, "Instructional figure has no traceable local asset path."),
                )
                continue
            figures.append(
                {
                    "assetPath": asset_path,
                    "alt": _text(figure.get("alt") or figure.get("description")) or _text(slide.get("title")) or "Source figure",
                    **({"caption": _text(figure.get("caption"))} if _text(figure.get("caption")) else {}),
                }
            )
        audio_entries: list[Mapping[str, Any]] = []
        for audio_entry in _native_audio_entries(native_slide):
            entry_lesson = _text(audio_entry.get("lessonId") or audio_entry.get("sourceLessonId"))
            entry_slide = audio_entry.get("slideNumber", audio_entry.get("slide", audio_entry.get("slideNo")))
            slide_mismatch = False
            if entry_lesson and entry_lesson != _source_lesson_id(source):
                slide_mismatch = True
            if entry_slide is not None:
                try:
                    slide_mismatch = slide_mismatch or int(entry_slide) != number
                except (TypeError, ValueError):
                    slide_mismatch = True
            if slide_mismatch:
                _add_blocker(
                    blockers,
                    _blocker("native-audio-mismatch", number, "Native audio evidence is scoped to another lesson or slide."),
                )
                continue
            audio_entries.append(audio_entry)
        if native_tables is not None and not _tables({"tables": native_tables}):
            _add_blocker(blockers, _blocker("native-table-unreadable", number, "Native audit table evidence has no usable cells."))
            native_tables = None
        slide["_nativeAudit"] = {
            "recordId": record_id,
            "slideNumber": _slide_number(native_slide),
            "paragraphs": paragraphs,
            "tables": native_tables,
            "figures": figures,
            "audio": copy.deepcopy(audio_entries),
            "nativeTexts": copy.deepcopy(_alignment_texts(native_slide)),
        }
    return copied


def _audio_candidates(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    audio_manifest: Any,
) -> list[Mapping[str, Any]]:
    candidates: list[Mapping[str, Any]] = []
    for item in _media(slide):
        if _media_kind(item) == "audio":
            candidates.append(item)
    candidates.extend(_native_audio_items(slide))
    candidates.extend(_audio_manifest_entries(audio_manifest, lesson_id, _slide_number(slide)))
    source_audio = source.get("audio") or source.get("audioManifest")
    candidates.extend(_audio_manifest_entries(source_audio, lesson_id, _slide_number(slide)))
    # A source-level manifest may use a unit and slide key instead of entries.
    source_deck = _deck(source)
    candidates.extend(_audio_manifest_entries(source_deck.get("audio"), lesson_id, _slide_number(slide)))
    deduped: list[Mapping[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for item in candidates:
        key = (_audio_url(item), _audio_digest(item), _audio_transcript(item))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _readable_html(texts: Sequence[str]) -> str:
    paragraphs: list[str] = []
    for value in texts:
        escaped = html.escape(value, quote=True)
        if "\n" in value:
            escaped = "<br />".join(html.escape(part.strip(), quote=True) for part in value.splitlines() if part.strip())
        paragraphs.append(f"<p>{escaped}</p>")
    return "".join(paragraphs)


def _extract_pairs(texts: Sequence[str]) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    pattern = re.compile(r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{1,38}?)\s*[-–—]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{1,58})")
    for text in texts:
        for match in pattern.finditer(text):
            term = _normalise(match.group(1)).strip(" .,:;()")
            definition = _normalise(match.group(2)).strip(" .,:;()")
            if term and definition and len(term.split()) <= 6 and len(definition.split()) <= 10:
                pair = {"term": term, "definition": definition}
                if pair not in pairs:
                    pairs.append(pair)
    return pairs


def _has_explicit_answer_key(slide: Mapping[str, Any]) -> bool:
    def walk(value: Any, key: str = "") -> bool:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold()
                if any(token in lowered for token in ("correctanswer", "answerkey", "correct_option", "answer")):
                    if _text(child_value) or isinstance(child_value, (list, tuple, dict)):
                        return True
                if walk(child_value, lowered):
                    return True
        elif isinstance(value, list):
            return any(walk(item, key) for item in value)
        return False

    return walk(slide)


def _explicit_answer_key(slide: Mapping[str, Any]) -> Any:
    keys = {"answer", "answerkey", "correctanswer", "correct_option", "correctoption"}

    def walk(value: Any) -> Any:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold().replace("-", "_")
                if lowered in keys and child_value not in (None, "", [], {}):
                    return copy.deepcopy(child_value)
                found = walk(child_value)
                if found is not None:
                    return found
        elif isinstance(value, list):
            for child in value:
                found = walk(child)
                if found is not None:
                    return found
        return None

    return walk(slide)


def _explicit_options(slide: Mapping[str, Any]) -> Any:
    keys = {"options", "choices", "answeroptions"}

    def walk(value: Any) -> Any:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold().replace("-", "_")
                if lowered in keys and isinstance(child_value, (list, tuple)) and child_value:
                    return copy.deepcopy(child_value)
                found = walk(child_value)
                if found is not None:
                    return found
        elif isinstance(value, list):
            for child in value:
                found = walk(child)
                if found is not None:
                    return found
        return None

    return walk(slide)


def _multiple_choice_options(options: Any, answer: Any, slide_number: int) -> tuple[list[dict[str, str]], str]:
    normalized: list[dict[str, str]] = []
    for index, option in enumerate(_as_list(options), start=1):
        if isinstance(option, Mapping):
            option_id = _text(option.get("id") or option.get("value"))
            option_text = _text(option.get("text") or option.get("label") or option.get("value"))
        else:
            option_id = ""
            option_text = _text(option)
        option_id = option_id or f"course-choice-{slide_number}-{index:03d}"
        normalized.append({"id": option_id, "text": option_text})

    answer_id = ""
    answer_text = ""
    if isinstance(answer, Mapping):
        answer_id = _text(answer.get("id") or answer.get("optionId") or answer.get("correctOptionId"))
        answer_text = _text(answer.get("text") or answer.get("label") or answer.get("value"))
    else:
        answer_text = _text(answer)
        answer_id = answer_text
    for option in normalized:
        if option["id"] == answer_id or option["text"] == answer_text:
            return normalized, option["id"]
    return normalized, answer_id


def _is_speaking_prompt(text: str) -> bool:
    return bool(
        re.search(
            r"\b(?:act out|role[- ]?play|conversation|talk with|speak with|practice with your teacher|read .* aloud|record(?: yourself)?|dialogue)",
            text.casefold(),
        )
    )


def _is_essay_prompt(text: str) -> bool:
    lowered = text.casefold()
    return bool(
        re.search(
            r"\b(?:write (?:a|an|your|two|three)|write down|compose|create .* sentences|paragraph|essay|\d+\s*[-–]\s*\d+\s+words)",
            lowered,
        )
    )


def _is_short_answer_prompt(text: str) -> bool:
    lowered = text.casefold()
    return bool(
        re.search(
            r"\b(?:answer the questions?|complete|fill in|change .* sentence|transform|identify|state whether|true or false)",
            lowered,
        )
    )


def _is_reading(text: str) -> bool:
    lowered = text.casefold()
    return len(text) >= 160 or bool(re.search(r"\b(?:read the text|reading|read aloud)\b", lowered))


def _slide_warning_codes(slide: Mapping[str, Any]) -> list[str]:
    warnings: list[str] = []
    for warning in _as_list(slide.get("warnings")):
        if isinstance(warning, Mapping):
            value = _text(warning.get("code") or warning.get("message") or warning)
        else:
            value = _text(warning)
        if value:
            warnings.append(value.casefold())
    return warnings


def _blocker(code: str, slide: int | None = None, detail: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {"code": code}
    if slide is not None:
        result["slide"] = slide
    if detail:
        result["detail"] = detail
    return result


def _add_blocker(blockers: list[dict[str, Any]], value: dict[str, Any]) -> None:
    if value not in blockers:
        blockers.append(value)


def _original_source(
    source: Mapping[str, Any],
    lesson_id: str,
    source_digest: str,
    slide: Mapping[str, Any],
    audio: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    slide_number = _slide_number(slide)
    result: dict[str, Any] = {
        "sourceUrl": _source_url(source),
        "sourceDigest": source_digest,
        "contentId": _text(source.get("contentId")),
        "lessonId": lesson_id,
        "slideNumbers": [slide_number],
        "originalIds": [f"{lesson_id}:slide:{slide_number}"],
        "originalIDs": [f"{lesson_id}:slide:{slide_number}"],
        "deckTitle": _text(_deck(source).get("deckTitle") or source.get("title")),
        "title": _text(slide.get("title")),
        "visibleTexts": _slide_texts(slide),
        "links": copy.deepcopy(_as_list(slide.get("links"))),
        "tables": copy.deepcopy(_as_list(slide.get("tables"))),
        "media": copy.deepcopy(_as_list(slide.get("media"))),
    }
    if audio is not None:
        result["audio"] = {
            "url": _audio_url(audio),
            "digest": _audio_digest(audio),
            "transcript": _audio_transcript(audio),
        }
    native = _native_audit_payload(slide)
    if native is not None:
        result["nativeEvidence"] = {
            "recordId": _text(native.get("recordId")),
            "slideNumber": native.get("slideNumber"),
            "paragraphs": copy.deepcopy(_as_list(native.get("paragraphs"))),
            "tables": copy.deepcopy(native.get("tables")),
            "figures": copy.deepcopy(_as_list(native.get("figures"))),
            "audio": copy.deepcopy(_as_list(native.get("audio"))),
        }
    return result


def _native_block_specs(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    source_digest: str,
    audio_manifest: Any,
    blockers: list[dict[str, Any]],
) -> list[tuple[str, dict[str, Any]]]:
    number = _slide_number(slide)
    texts = _meaningful_texts(slide)
    evidence_texts = _evidence_texts(slide)
    full_text = "\n".join(evidence_texts).strip()
    tables = _tables(slide)
    audio_required = _is_audio_required(slide) or bool(_native_audio_items(slide))
    audio_items = _audio_candidates(source, slide, lesson_id, audio_manifest) if audio_required else []
    # Prefer a complete authored evidence record over a rendered audio icon
    # placeholder from the published extraction.
    audio_item = next(
        (item for item in audio_items if _audio_url(item) or _audio_digest(item) or _audio_transcript(item)),
        audio_items[0] if audio_items else None,
    )
    video_urls = _video_urls(slide)
    if audio_required:
        if audio_item is None or not _audio_url(audio_item):
            _add_blocker(
                blockers,
                _blocker(
                    "audio-media-missing",
                    number,
                    "Listening content has no original media URL in the source or media manifest.",
                ),
            )
        else:
            if not _audio_digest(audio_item):
                _add_blocker(blockers, _blocker("audio-digest-missing", number, "Original audio digest is required."))
            if not _audio_transcript(audio_item):
                _add_blocker(
                    blockers,
                    _blocker("audio-transcript-missing", number, "Listening content requires the authored transcript."),
                )

    specs: list[tuple[str, dict[str, Any]]] = []
    prompt_text = _prompt_text(slide, texts)
    common = {
        "sourceText": texts,
        "sourceTitle": _text(slide.get("title")),
    }
    native_paragraphs = _native_paragraphs(slide)
    if native_paragraphs:
        common["nativeParagraphs"] = copy.deepcopy(native_paragraphs)
    if re.search(r"\b(?:objective|competenc|communicative function|learning goal)\w*\b", full_text.casefold()):
        common["objectives"] = copy.deepcopy(texts)
    if tables:
        combined_rows: list[list[str]] = []
        for table in tables:
            combined_rows.extend(copy.deepcopy(table))
        headers = combined_rows[0] if combined_rows else []
        rows = combined_rows[1:] if len(combined_rows) > 1 else []
        specs.append(
            (
                "structured-content",
                {
                    **common,
                    "content": {"headers": headers, "rows": rows},
                    "tables": copy.deepcopy(tables),
                },
            )
        )
    warning_text = " ".join(_slide_warning_codes(slide))
    if not tables and re.search(r"\b(?:table|chart|grid|columns?)\b", full_text.casefold()) and any(
        token in warning_text for token in ("table", "chart", "semantic")
    ):
        _add_blocker(
            blockers,
            _blocker("table-semantics-missing", number, "The source mentions a table or chart without authored cell semantics."),
        )

    pairs = _extract_pairs(texts)
    lower_title = _text(slide.get("title")).casefold()
    if len(pairs) >= 2 and ("vocab" in lower_title or "word" in lower_title or all(len(item["term"].split()) <= 3 for item in pairs)):
        vocabulary_items = [
            {"id": f"course-vocabulary-{number}-{index:03d}", **pair}
            for index, pair in enumerate(pairs, start=1)
        ]
        specs.append(
            (
                "vocabulary",
                {
                    **common,
                    "title": _text(slide.get("title")) or "Vocabulary",
                    "items": vocabulary_items,
                },
            )
        )

    explicit_answer = _explicit_answer_key(slide)
    explicit_options = _explicit_options(slide)
    if explicit_answer is not None:
        if explicit_options:
            choice_options, correct_option_id = _multiple_choice_options(explicit_options, explicit_answer, number)
            if correct_option_id not in {option["id"] for option in choice_options}:
                _add_blocker(
                    blockers,
                    _blocker("answer-key-unmatched", number, "The authored answer key does not match any authored option."),
                )
            else:
                specs.append(
                    (
                        "multiple_choice",
                        {
                            **common,
                            "question": prompt_text,
                            "options": choice_options,
                            "correctOptionId": correct_option_id,
                        },
                    )
                )
        else:
            specs.append(
                (
                    "short_answer",
                    {
                        **common,
                        "items": [
                            {
                                "id": f"course-short-answer-{number}-001",
                                "question": prompt_text,
                                "correctAnswer": _text(explicit_answer),
                            }
                        ],
                    },
                )
            )

    if audio_required and audio_item is not None and _audio_url(audio_item) and _audio_digest(audio_item) and _audio_transcript(audio_item):
        specs.append(
            (
                "audio",
                {
                    **common,
                    "instruction": prompt_text,
                    "url": _audio_url(audio_item),
                    "transcript": _audio_transcript(audio_item),
                    "mediaDigest": _audio_digest(audio_item),
                },
            )
        )

    for video_url in video_urls:
        specs.append(
            (
                "video",
                {
                    **common,
                    "url": video_url,
                    "title": _text(slide.get("title")) or "Video",
                },
            )
        )

    for figure in _native_figures(slide):
        asset_path = _text(figure.get("assetPath"))
        if not asset_path:
            continue
        specs.append(
            (
                "image",
                {
                    **common,
                    "url": asset_path,
                    "assetPath": asset_path,
                    "alt": _text(figure.get("alt")) or _text(slide.get("title")) or "Source figure",
                    **({"caption": _text(figure.get("caption"))} if _text(figure.get("caption")) else {}),
                },
            )
        )

    if _is_speaking_prompt(prompt_text):
        recording_time_limit = _time_limit(prompt_text)
        specs.append(
            (
                "recording",
                {
                    **common,
                    "instruction": prompt_text,
                    **({"timeLimit": recording_time_limit} if recording_time_limit is not None else {}),
                    "mode": "teacher-and-self-study",
                    "aiGrading": True,
                    "data": {
                        "aiGradingContext": "No authored answer key is assumed; evaluate the learner recording against the instruction.",
                    },
                },
            )
        )

    if _is_essay_prompt(prompt_text):
        min_words, max_words = _word_limits(prompt_text)
        specs.append(
            (
                "essay",
                {
                    **common,
                    "prompt": prompt_text,
                    "aiGrading": True,
                    **({"minWords": min_words} if min_words is not None else {}),
                    **({"maxWords": max_words} if max_words is not None else {}),
                    "data": {
                        "aiGradingContext": "No authored answer key is assumed; evaluate the learner response against the source prompt.",
                    },
                },
            )
        )
    elif explicit_answer is None and _is_short_answer_prompt(prompt_text):
        min_words, max_words = _word_limits(prompt_text)
        specs.append(
            (
                "essay",
                {
                    **common,
                    "prompt": prompt_text,
                    "aiGrading": True,
                    **({"minWords": min_words} if min_words is not None else {}),
                    **({"maxWords": max_words} if max_words is not None else {}),
                    "data": {
                        "aiGradingContext": "No authored answer key is assumed; evaluate the learner response against the source prompt.",
                    },
                },
            )
        )

    # Preserve a long authored reading passage as readable HTML even when the
    # same slide also has questions or a read-aloud instruction.
    if _is_reading(full_text) and not tables:
        specs.append(("text", {**common, "content": _readable_html(evidence_texts), "format": "html"}))

    if not specs and full_text:
        specs.append(("text", {**common, "content": _readable_html(evidence_texts), "format": "html"}))
    if audio_required and not audio_item and not full_text:
        # The blocker is the evidence for an audio-only source slide; do not
        # fabricate a playable block or a transcript.
        return specs
    if audio_required and audio_item and not _audio_url(audio_item) and full_text and not specs:
        specs.append(("text", {**common, "content": _readable_html(evidence_texts), "format": "html"}))
    return specs


def _row_data_metadata(
    source: Mapping[str, Any],
    source_digest: str,
    lesson_id: str,
    slide: Mapping[str, Any],
    native_type: str,
    audio: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    original_ids = [f"{lesson_id}:slide:{_slide_number(slide)}"]
    return {
        "learningRevision": LEARNING_REVISION,
        "sourceSlides": [_slide_number(slide)],
        "originalIDs": original_ids,
        "originalSource": _original_source(source, lesson_id, source_digest, slide, audio),
    }


def _row_sort_key(row: Mapping[str, Any]) -> tuple[float, str]:
    value = row.get("order", 0)
    try:
        order = float(value)
    except (TypeError, ValueError):
        order = 0
    return order, _text(row.get("id"))


def _existing_rows(lesson: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw = lesson.get("rows")
    if raw is None:
        raw = lesson.get("contents", lesson.get("content", []))
    result = [copy.deepcopy(item) for item in _as_list(raw) if isinstance(item, Mapping)]
    return sorted(result, key=_row_sort_key)


def _archive_existing_rows(
    rows: Sequence[Mapping[str, Any]],
    source: Mapping[str, Any],
    source_digest: str,
    lesson_id: str,
) -> list[dict[str, Any]]:
    """Archive old embeds as teacher-only notes without changing row identity."""

    result: list[dict[str, Any]] = []
    for row in rows:
        copied = copy.deepcopy(dict(row))
        original_data = copy.deepcopy(copied.get("data"))
        data = original_data if isinstance(original_data, Mapping) else {}
        is_embed = _text(copied.get("contentType")).casefold() == "embed" or _text(data.get("type")).casefold() == "embed"
        if is_embed:
            original_id = _text(copied.get("id"))
            copied["data"] = {
                "type": "teacher_notes",
                "title": _text(copied.get("title")) or "Archived source",
                "content": "Original source embed archived for teacher review.",
                "data": {
                    "learningRevision": LEARNING_REVISION,
                    "originalIDs": [original_id],
                    "originalSource": original_data,
                    "sourceUrl": _source_url(source),
                    "sourceDigest": source_digest,
                    "lessonId": lesson_id,
                },
            }
        result.append(copied)
    return result


def _native_row(
    lesson_id: str,
    source: Mapping[str, Any],
    source_digest: str,
    slide: Mapping[str, Any],
    native_type: str,
    payload: Mapping[str, Any],
    sequence: int,
    order: int,
) -> dict[str, Any]:
    title = _text(slide.get("title")) or native_type.replace("-", " ").title()
    slug_source = f"{native_type}-{_slide_number(slide)}-{title}"
    slug = re.sub(r"[^a-z0-9]+", "-", slug_source.casefold()).strip("-")[:72] or native_type
    row_id = f"{ROW_ID_PREFIX}{lesson_id}-{slug}-{sequence:03d}"
    audio_evidence = None
    if native_type == "audio":
        audio_evidence = {
            "url": _text(payload.get("url")),
            "digest": _text(payload.get("mediaDigest")),
            "transcript": _text(payload.get("transcript")),
        }
    metadata = _row_data_metadata(source, source_digest, lesson_id, slide, native_type, audio_evidence)
    data = copy.deepcopy(dict(payload))
    existing_metadata = data.pop("metadata", None)
    existing_nested = data.get("data")
    if isinstance(existing_nested, Mapping):
        metadata = {**copy.deepcopy(dict(existing_nested)), **metadata}
    if isinstance(existing_metadata, Mapping):
        metadata = {**copy.deepcopy(dict(existing_metadata)), **metadata}
    data["type"] = native_type
    data["data"] = metadata
    return {
        "id": row_id,
        "title": title,
        "order": order,
        "contentType": "RICH_TEXT",
        "lessonId": lesson_id,
        "parentId": None,
        "data": data,
    }


def _row_original_identity(row: Mapping[str, Any]) -> tuple[Any, Any, Any, Any]:
    return (row.get("title"), row.get("contentType"), row.get("lessonId"), row.get("parentId"))


def _lesson_from_snapshot(snapshot: Mapping[str, Any], lesson_id: str) -> Mapping[str, Any] | None:
    lessons: list[Mapping[str, Any]] = []
    raw_lessons = snapshot.get("lessons")
    if raw_lessons is not None:
        lessons.extend(item for item in _as_list(raw_lessons) if isinstance(item, Mapping))
    course = snapshot.get("course")
    course_modules = course.get("modules") if isinstance(course, Mapping) else None
    for module in _as_list(snapshot.get("modules")) + _as_list(snapshot.get("units")) + _as_list(course_modules):
        if not isinstance(module, Mapping):
            continue
        lessons.extend(item for item in _as_list(module.get("lessons")) if isinstance(item, Mapping))
        content = module.get("content")
        if isinstance(content, Mapping):
            lessons.extend(item for item in _as_list(content.get("lessons")) if isinstance(item, Mapping))
    for lesson in lessons:
        try:
            if _lesson_id(lesson) == lesson_id:
                return lesson
        except PlanError:
            continue
    return None


def _validate_course_id(value: Any) -> None:
    candidate = _text(value)
    if candidate and candidate != COURSE_ID:
        raise PlanError(f"unexpected course id: {candidate}")


def _validate_native_payload(data: Mapping[str, Any], row_id: str) -> None:
    native_type = _text(data.get("type"))
    if native_type == "text":
        if not isinstance(data.get("content"), str):
            raise PlanError(f"text row has no string content: {row_id}")
    elif native_type == "video":
        if not isinstance(data.get("url"), str) or not data.get("url"):
            raise PlanError(f"video row has no source URL: {row_id}")
    elif native_type == "image":
        if not all(isinstance(data.get(key), str) and data.get(key) for key in ("url", "assetPath", "alt")):
            raise PlanError(f"image row has no traceable asset path and alt text: {row_id}")
        try:
            if not Path(data["assetPath"]).is_file():
                raise PlanError(f"image row asset path does not exist: {row_id}")
        except OSError as exc:
            raise PlanError(f"image row asset path is unreadable: {row_id}") from exc
    elif native_type == "audio":
        if not all(isinstance(data.get(key), str) and data.get(key) for key in ("url", "mediaDigest", "transcript")):
            raise PlanError(f"audio row is missing immutable media evidence: {row_id}")
    elif native_type == "vocabulary":
        if not isinstance(data.get("title"), str) or not isinstance(data.get("items"), list):
            raise PlanError(f"vocabulary row has an invalid shape: {row_id}")
        for item in data["items"]:
            if not isinstance(item, Mapping) or not all(isinstance(item.get(key), str) and item.get(key) for key in ("id", "term", "definition")):
                raise PlanError(f"vocabulary row has an invalid item: {row_id}")
    elif native_type == "structured-content":
        content = data.get("content")
        if not isinstance(content, Mapping) or not isinstance(content.get("headers"), list) or not isinstance(content.get("rows"), list):
            raise PlanError(f"structured-content row has an invalid table shape: {row_id}")
    elif native_type == "essay":
        if not isinstance(data.get("prompt"), str) or not data.get("prompt"):
            raise PlanError(f"essay row has no source prompt: {row_id}")
        for key in ("minWords", "maxWords"):
            if key in data and (not isinstance(data[key], int) or isinstance(data[key], bool)):
                raise PlanError(f"essay row has an invalid {key}: {row_id}")
    elif native_type == "recording":
        if not isinstance(data.get("instruction"), str) or not data.get("instruction"):
            raise PlanError(f"recording row has no source instruction: {row_id}")
        if "timeLimit" in data and (not isinstance(data["timeLimit"], int) or isinstance(data["timeLimit"], bool)):
            raise PlanError(f"recording row has an invalid timeLimit: {row_id}")
    elif native_type == "multiple_choice":
        options = data.get("options")
        if not isinstance(data.get("question"), str) or not isinstance(options, list) or not isinstance(data.get("correctOptionId"), str):
            raise PlanError(f"multiple_choice row has an invalid shape: {row_id}")
        option_ids: list[str] = []
        for option in options:
            if not isinstance(option, Mapping) or not isinstance(option.get("id"), str) or not isinstance(option.get("text"), str):
                raise PlanError(f"multiple_choice row has an invalid option: {row_id}")
            option_ids.append(option["id"])
        if data["correctOptionId"] not in option_ids:
            raise PlanError(f"multiple_choice row has an unmatched answer: {row_id}")
    elif native_type == "short_answer":
        items = data.get("items")
        if not isinstance(items, list):
            raise PlanError(f"short_answer row has no items: {row_id}")
        for item in items:
            if not isinstance(item, Mapping) or not all(isinstance(item.get(key), str) and item.get(key) for key in ("id", "question", "correctAnswer")):
                raise PlanError(f"short_answer row has an invalid item: {row_id}")
    else:
        raise PlanError(f"generated row uses unsupported native type {native_type!r}: {row_id}")


def build_plan(
    lesson: Mapping[str, Any] | None,
    source: Mapping[str, Any],
    audio_manifest: Any = None,
    native_audit: Any = None,
) -> dict[str, Any]:
    """Build one deterministic plan while preserving the existing row identities."""

    source_lesson_id = _source_lesson_id(source)
    lesson_id = _lesson_id(lesson) if lesson is not None else source_lesson_id
    if lesson is not None and lesson_id != source_lesson_id:
        raise PlanError(f"source lesson {source_lesson_id} does not match snapshot lesson {lesson_id}")
    _validate_course_id(source.get("courseId"))
    source_digest = _source_digest(source)
    blockers: list[dict[str, Any]] = []
    source_with_native = _prepare_native_audit(source, native_audit, blockers)
    if lesson is None:
        _add_blocker(blockers, _blocker("lesson-missing-from-snapshot", detail=f"No snapshot lesson matched {source_lesson_id}."))
    if _text(source.get("status")) and _text(source.get("status")).casefold() not in {"ok", "published", "ready"}:
        _add_blocker(blockers, _blocker("source-not-ready", detail=f"Source status is {source.get('status')!r}."))
    if not _source_url(source):
        _add_blocker(blockers, _blocker("source-url-missing", detail="Published source URL is required for provenance."))
    deck = _deck(source_with_native)
    slides = _slides(source_with_native)
    if not slides:
        _add_blocker(blockers, _blocker("source-slides-missing", detail="The published source has no extracted slides."))
    declared_count = deck.get("slideCount")
    if declared_count is not None:
        try:
            if int(declared_count) != len(slides):
                _add_blocker(
                    blockers,
                    _blocker("source-slide-count-mismatch", detail=f"Declared {declared_count} slides but extracted {len(slides)}."),
                )
        except (TypeError, ValueError):
            _add_blocker(blockers, _blocker("source-slide-count-invalid", detail=f"Invalid slideCount {declared_count!r}."))

    previous_rows = _existing_rows(lesson or {})
    for row in previous_rows:
        if not _text(row.get("lessonId")):
            row["lessonId"] = lesson_id
        elif _text(row.get("lessonId")) != lesson_id:
            raise PlanError(f"existing row {row.get('id')} belongs to another lesson")
    next_rows = _archive_existing_rows(previous_rows, source, source_digest, lesson_id)
    next_order = max([int(row.get("order", 0)) for row in previous_rows if str(row.get("order", "")).lstrip("-").isdigit()] or [0]) + 1
    generated_sequence = 1
    covered_slides: set[int] = set()
    unsupported_slides: list[dict[str, Any]] = []
    for slide in slides:
        number = _slide_number(slide)
        specs = _native_block_specs(source_with_native, slide, lesson_id, source_digest, audio_manifest, blockers)
        source_has_content = bool(
            _evidence_texts(slide)
            or _tables(slide)
            or _native_figures(slide)
            or _is_audio_required(slide)
        )
        if specs or source_has_content:
            covered_slides.add(number)
        if source_has_content and not specs:
            unsupported = {
                "slide": number,
                "title": _text(slide.get("title")),
                "reason": "No native block was emitted; source evidence is retained in blockers.",
            }
            unsupported_slides.append(unsupported)
            _add_blocker(blockers, _blocker("unsupported-slide", number, unsupported["reason"]))
        for native_type, payload in specs:
            row = _native_row(lesson_id, source, source_digest, slide, native_type, payload, generated_sequence, next_order)
            next_rows.append(row)
            generated_sequence += 1
            next_order += 1

    next_rows = sorted(next_rows, key=_row_sort_key)
    for index, row in enumerate(next_rows):
        row["order"] = index
    plan = {
        "courseId": COURSE_ID,
        "lessonId": lesson_id,
        "previousRows": previous_rows,
        "nextRows": next_rows,
        "publishable": not blockers,
        "blockers": blockers,
        "sourceUrl": _source_url(source),
        "sourceDigest": source_digest,
        "sourceSlideNumbers": sorted(covered_slides),
        "sourceSlideCount": len(slides),
        "unsupportedSlides": unsupported_slides,
    }
    validate_plan(plan)
    return plan


def build_plans(
    snapshot: Mapping[str, Any],
    sources: Sequence[Mapping[str, Any]],
    audio_manifest: Any = None,
    native_audit: Any = None,
) -> list[dict[str, Any]]:
    """Build source plans sorted by stable lesson/module/source identifiers."""

    snapshot_course_id = snapshot.get("courseId")
    snapshot_course = snapshot.get("course")
    if not snapshot_course_id and isinstance(snapshot_course, Mapping):
        snapshot_course_id = snapshot_course.get("id")
    _validate_course_id(snapshot_course_id)
    ordered_sources = sorted(
        [source for source in sources if isinstance(source, Mapping)],
        key=lambda source: (_source_lesson_id(source), _source_url(source), _source_digest(source)),
    )
    plans: list[dict[str, Any]] = []
    for source in ordered_sources:
        source_lesson_id = _source_lesson_id(source)
        lesson = _lesson_from_snapshot(snapshot, source_lesson_id)
        plans.append(build_plan(lesson, source, audio_manifest, native_audit))
    return plans


def validate_plan(plan: Mapping[str, Any]) -> None:
    """Validate the immutable row contract and native metadata contract."""

    if _text(plan.get("courseId")) != COURSE_ID:
        raise PlanError("plan has an unexpected course id")
    lesson_id = _text(plan.get("lessonId"))
    if not lesson_id:
        raise PlanError("plan has no lesson id")
    previous = [row for row in _as_list(plan.get("previousRows")) if isinstance(row, Mapping)]
    following = [row for row in _as_list(plan.get("nextRows")) if isinstance(row, Mapping)]
    previous_by_id = {_text(row.get("id")): row for row in previous}
    next_by_id = {_text(row.get("id")): row for row in following}
    if "" in previous_by_id or "" in next_by_id:
        raise PlanError("all rows need a stable id")
    if len(next_by_id) != len(following):
        raise PlanError("nextRows contains duplicate ids")
    missing = set(previous_by_id) - set(next_by_id)
    if missing:
        raise PlanError(f"nextRows dropped existing rows: {sorted(missing)}")
    for row_id, before in previous_by_id.items():
        after = next_by_id[row_id]
        if _row_original_identity(before) != _row_original_identity(after):
            raise PlanError(f"existing row identity changed: {row_id}")
        if _text(after.get("lessonId")) != lesson_id:
            raise PlanError(f"existing row has wrong lesson id: {row_id}")
        before_data = before.get("data")
        before_data_map = before_data if isinstance(before_data, Mapping) else {}
        if _text(before.get("contentType")).casefold() == "embed" or _text(before_data_map.get("type")).casefold() == "embed":
            after_data = after.get("data")
            if not isinstance(after_data, Mapping) or after_data.get("type") != "teacher_notes":
                raise PlanError(f"existing embed must be archived as teacher_notes: {row_id}")
            nested = after_data.get("data")
            if not isinstance(nested, Mapping) or nested.get("originalSource") != before_data:
                raise PlanError(f"existing embed archive lost original source data: {row_id}")
    for row in following:
        row_id = _text(row.get("id"))
        if _text(row.get("lessonId")) != lesson_id:
            raise PlanError(f"row has wrong lesson id: {row_id}")
        if row_id in previous_by_id:
            continue
        if not row_id.startswith(f"{ROW_ID_PREFIX}{lesson_id}-"):
            raise PlanError(f"generated row id is unstable or unscoped: {row_id}")
        if _text(row.get("contentType")) != "RICH_TEXT":
            raise PlanError(f"generated row is not RICH_TEXT: {row_id}")
        data = row.get("data")
        if not isinstance(data, Mapping):
            raise PlanError(f"generated row has no data: {row_id}")
        metadata = data.get("data")
        if not isinstance(metadata, Mapping) or metadata.get("learningRevision") != LEARNING_REVISION:
            raise PlanError(f"generated row has no learning revision metadata: {row_id}")
        if not _as_list(metadata.get("sourceSlides")):
            raise PlanError(f"generated row has no source slide metadata: {row_id}")
        original = metadata.get("originalSource")
        if not isinstance(original, Mapping) or not _text(original.get("sourceDigest")):
            raise PlanError(f"generated row has no archived source metadata: {row_id}")
        _validate_native_payload(data, row_id)


def build_manifest(
    snapshot: Mapping[str, Any],
    sources: Sequence[Mapping[str, Any]],
    audio_manifest: Any = None,
    expected_source_count: int | None = None,
    native_audit: Any = None,
) -> dict[str, Any]:
    plans = build_plans(snapshot, sources, audio_manifest, native_audit)
    inventory_blockers: list[dict[str, Any]] = []
    if expected_source_count is not None and len(sources) != expected_source_count:
        inventory_blockers.append(
            _blocker(
                "source-inventory-count",
                detail=f"Expected {expected_source_count} published sources but found {len(sources)}.",
            )
        )
    return {
        "schemaVersion": 1,
        "courseId": COURSE_ID,
        "learningRevision": LEARNING_REVISION,
        "sourceCount": len(sources),
        "publishableCount": sum(1 for plan in plans if plan["publishable"]),
        "blockedCount": sum(1 for plan in plans if not plan["publishable"]),
        "inventoryBlockers": inventory_blockers,
        "plans": plans,
    }


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise PlanError(f"cannot read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise PlanError(f"invalid JSON in {path}: {exc}") from exc


def load_sources(source_dir: Path) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for path in sorted(source_dir.glob("*.json")):
        value = load_json(path)
        if not isinstance(value, Mapping):
            raise PlanError(f"source file must contain an object: {path}")
        source = copy.deepcopy(dict(value))
        source["_sourceFile"] = str(path)
        sources.append(source)
    return sources


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path, help="authoritative course snapshot JSON")
    parser.add_argument("--source-dir", required=True, type=Path, help="directory containing published source JSON files")
    parser.add_argument("--output", required=True, type=Path, help="plan manifest JSON output")
    parser.add_argument("--audio-manifest", type=Path, help="optional original media URL/digest/transcript manifest")
    parser.add_argument("--native-audit", type=Path, help="optional native PPTX audit/enrichment JSON")
    parser.add_argument("--expected-source-count", type=int, default=55)
    parser.add_argument("--require-ready", action="store_true", help="exit nonzero when inventory or plan blockers exist")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        snapshot = load_json(args.snapshot)
        if not isinstance(snapshot, Mapping):
            raise PlanError("snapshot must contain an object")
        sources = load_sources(args.source_dir)
        audio_manifest = load_json(args.audio_manifest) if args.audio_manifest else None
        native_audit = None
        if args.native_audit:
            loaded_native_audit = load_json(args.native_audit)
            if isinstance(loaded_native_audit, Mapping):
                native_audit = copy.deepcopy(dict(loaded_native_audit))
                native_audit["_auditPath"] = str(args.native_audit)
            else:
                native_audit = loaded_native_audit
        manifest = build_manifest(
            snapshot,
            sources,
            audio_manifest,
            args.expected_source_count,
            native_audit,
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.require_ready and (manifest["inventoryBlockers"] or manifest["blockedCount"]):
            return 2
        return 0
    except PlanError as exc:
        print(f"build-course-learning: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
