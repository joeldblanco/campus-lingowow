#!/usr/bin/env python3
"""Audit exact published HTML for native deck and original media identifiers.

The published embed HTML is the only network source read by this script.  It
records public-token metadata and the media object IDs that the page labels as
audio, but it does not invent Drive URLs or probe undocumented presentation
endpoints.  It intentionally stores no raw HTML or rendered slide media.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Mapping, Sequence


DEFAULT_MANIFEST = Path("docs/audit/course-source-manifest.json")
DEFAULT_DRIVE_MANIFEST = Path("docs/audit/drive-source-manifest.json")
DEFAULT_OUTPUT = Path("docs/audit/published-source-identity-53-56.json")
TARGET_UNITS = (53, 54, 55, 56)
MAX_HTML_BYTES = 15_000_000

PUBLIC_TOKEN_RE = re.compile(r"/presentation/d/e/([^/\"'?#]+)", re.IGNORECASE)
ROUTE_RE = re.compile(
    r"/presentation/d/e/(?P<token>[^/\"'?#]+)(?:/(?P<route>embed|edit|preview))?",
    re.IGNORECASE,
)
META_RE = re.compile(
    r"<meta\b[^>]*(?:property|name)=[\"'](?P<name>[^\"']+)[\"'][^>]*>",
    re.IGNORECASE,
)
META_REVERSE = re.compile(
    r"<meta\b[^>]*content=[\"'](?P<content>[^\"']*)[\"'][^>]*(?:property|name)=[\"'](?P<name>[^\"']+)[\"'][^>]*>",
    re.IGNORECASE,
)
# This is the published Slides media tuple shape.  The second ID is retained
# as a published-media object ID, not assumed to be a Drive file ID.
AUDIO_REF_RE = re.compile(
    r'\["(?P<page>[^"\\]+)",(?P<slide>\d+),"[^"\\]*",\[\["(?P<element>[^"\\]+)",'
    r'"(?P<media>[A-Za-z0-9_-]{20,})",1,\[[^\]]+\],100\.0,0,1,\[0\],\[0\],'
    r'"(?P<label>[^"]+\.mp3)"',
    re.IGNORECASE,
)
URL_RE = re.compile(r"https?://[^\s\"'<>\\]+", re.IGNORECASE)
AUDIO_EXTENSION_RE = re.compile(r"\.(?:mp3|wav|wma|ogg|m4a|aac)(?:$|[?#])", re.IGNORECASE)


def _unit_source(manifest: Mapping[str, Any], unit: int) -> Mapping[str, Any]:
    for source in manifest.get("sources", []):
        if str(source.get("lesson", {}).get("title", "")) == f"Unit {unit}":
            return source
    raise KeyError(f"Unit {unit} is missing from the source manifest")


def _meta_value(markup: str, name: str) -> str | None:
    for match in META_RE.finditer(markup):
        if match.group("name").casefold() != name.casefold():
            continue
        content = re.search(r"content=[\"']([^\"']*)[\"']", match.group(0), re.IGNORECASE)
        if content:
            return html.unescape(content.group(1))
    for match in META_REVERSE.finditer(markup):
        if match.group("name").casefold() == name.casefold():
            return html.unescape(match.group("content"))
    return None


def _published_identity(source_url: str, markup: str) -> dict[str, Any]:
    source_token_match = PUBLIC_TOKEN_RE.search(source_url)
    source_token = source_token_match.group(1) if source_token_match else None
    routes: list[str] = []
    tokens: list[str] = []
    for match in ROUTE_RE.finditer(html.unescape(markup)):
        token = match.group("token")
        route = match.group("route") or "root"
        if token not in tokens:
            tokens.append(token)
        if route not in routes:
            routes.append(route)
    canonical = _meta_value(markup, "canonical")
    og_url = _meta_value(markup, "og:url")
    # A native Slides ID uses /d/<id>; the published token uses /d/e/<token>.
    native_routes = sorted(
        set(
            match.group(1)
            for match in re.finditer(r"/presentation/d/([^e/][^/\"'?#]*)", html.unescape(markup), re.IGNORECASE)
        )
    )
    return {
        "sourceToken": source_token,
        "tokensObservedInHtml": tokens,
        "routesObserved": sorted(routes),
        "canonicalLink": canonical,
        "ogUrl": og_url,
        "nativePresentationIdsObserved": native_routes,
        "nativePresentationIdResolved": native_routes[0] if len(native_routes) == 1 else None,
        "identityFinding": (
            "HTML exposes only the published /d/e token; no native /d/<presentation-id> route was observed."
            if not native_routes
            else "A native-looking /d/<presentation-id> route was observed and requires independent verification."
        ),
    }


def _media_refs(markup: str) -> dict[str, Any]:
    decoded = html.unescape(markup)
    refs: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for match in AUDIO_REF_RE.finditer(decoded):
        key = (match.group("media"), match.group("label"), match.group("slide"))
        if key in seen:
            continue
        seen.add(key)
        zero_based = int(match.group("slide"))
        refs.append(
            {
                "zeroBasedSlideNumber": zero_based,
                "slideNumber": zero_based + 1,
                "pageObjectId": match.group("page"),
                "elementObjectId": match.group("element"),
                "publishedMediaObjectId": match.group("media"),
                "label": match.group("label"),
                "idKind": "published-media-object",
                "driveFileIdVerified": False,
            }
        )
    urls = []
    for raw in URL_RE.findall(decoded):
        value = raw.rstrip(",);]")
        parsed = urllib.parse.urlsplit(value)
        if parsed.netloc == "docs.google.com" and parsed.path.startswith("/slides-images-rt/"):
            continue
        if AUDIO_EXTENSION_RE.search(parsed.path) or AUDIO_EXTENSION_RE.search(value):
            if value not in urls:
                urls.append(value)
    rendered_images = {
        value
        for value in URL_RE.findall(decoded)
        if "docs.google.com/slides-images-rt/" in value
    }
    return {
        "audioRefs": refs,
        "directAudioUrls": sorted(urls),
        "renderedSlideImageUrlCount": len(rendered_images),
        "originalAssetUrlsObserved": [],
        "finding": (
            "Audio labels and published media object IDs are present, but no direct audio URL or original asset URL is present."
            if refs and not urls
            else "No direct original audio or asset URL was found in the exact HTML."
        ),
    }


def fetch_source(source: Mapping[str, Any], timeout: int = 45) -> dict[str, Any]:
    unit = int(str(source["lesson"]["title"]).split()[-1])
    source_url = str(source["sourceUrl"])
    request = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = response.read(MAX_HTML_BYTES + 1)
        final_url = response.geturl()
        status = response.status
        content_type = response.headers.get("content-type")
    if len(payload) > MAX_HTML_BYTES:
        raise ValueError(f"published HTML for Unit {unit} exceeds {MAX_HTML_BYTES} bytes")
    markup = payload.decode("utf-8", "replace")
    return {
        "unit": unit,
        "published": {
            "module": source.get("module"),
            "lesson": source.get("lesson"),
            "contentId": source.get("contentId"),
            "deckTitle": source.get("deck", {}).get("deckTitle"),
            "slideCount": source.get("deck", {}).get("slideCount"),
            "sourceUrl": source_url,
        },
        "fetch": {
            "httpStatus": status,
            "finalUrl": final_url,
            "contentType": content_type,
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        },
        "identity": _published_identity(source_url, markup),
        "media": _media_refs(markup),
    }


def _drive_context(drive_manifest: Mapping[str, Any], unit: int) -> dict[str, Any]:
    record = drive_manifest.get("units", {}).get(str(unit), {})
    return {
        "presentationCandidateCount": len(record.get("presentationCandidates", [])),
        "audioCandidateCount": len(record.get("audioCandidates", [])),
        "finding": "No native presentation or audio candidate is present in the authoritative source manifest."
        if not record.get("presentationCandidates") and not record.get("audioCandidates")
        else "Candidates are present in the authoritative source manifest.",
    }


def build_audit(
    manifest: Mapping[str, Any],
    drive_manifest: Mapping[str, Any] | None = None,
    *,
    timeout: int = 45,
) -> dict[str, Any]:
    sources = [_unit_source(manifest, unit) for unit in TARGET_UNITS]
    # Four exact published URLs are independent and remain bounded to four
    # concurrent requests.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        fetched = list(executor.map(lambda source: fetch_source(source, timeout), sources))
    units: dict[str, Any] = {}
    for record in fetched:
        unit = str(record["unit"])
        if drive_manifest is not None:
            record["authoritativeDriveContext"] = _drive_context(drive_manifest, int(unit))
        units[unit] = record
    return {
        "schemaVersion": 1,
        "source": {
            "manifest": str(DEFAULT_MANIFEST).replace("\\", "/"),
            "driveManifest": str(DEFAULT_DRIVE_MANIFEST).replace("\\", "/"),
            "scope": "exact published embed URLs for Units 53-56",
            "rawHtmlStored": False,
            "renderedSlidesStored": False,
        },
        "units": units,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--drive-manifest", type=Path, default=DEFAULT_DRIVE_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=int, default=45)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    drive = json.loads(args.drive_manifest.read_text(encoding="utf-8")) if args.drive_manifest.exists() else None
    result = build_audit(manifest, drive, timeout=args.timeout)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "units": sorted(result["units"])}))


if __name__ == "__main__":
    main()
