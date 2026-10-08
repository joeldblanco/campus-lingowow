#!/usr/bin/env python3
"""Compare published Slides audio media IDs with authoritative Drive files.

The published HTML contains a public Slides media-object token inside an
audio element tuple.  That token is recorded separately from page and shape
IDs.  A match is accepted only when the exact token is also an authoritative
Drive audio candidate ID; filenames are evidence only and never a join key.

Only exact published URLs from ``course-source-manifest.json`` are fetched.
The raw HTML is hashed and discarded.  Requests are bounded to four workers
and 15 MiB per response.
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
DEFAULT_MATERIALIZATION = Path("docs/audit/drive-audio-materialization.json")
DEFAULT_BLOCKED_IDENTITY = Path("docs/audit/published-source-identity-53-56.json")
DEFAULT_OUTPUT = Path("docs/audit/published-audio-identity-review.json")
UNIT_START = 2
UNIT_END = 52
MAX_HTML_BYTES = 15_000_000
MAX_WORKERS = 4

PUBLIC_TOKEN_RE = re.compile(r"/presentation/d/e/([^/\"'?#]+)", re.IGNORECASE)
AUDIO_LABEL_RE = re.compile(r"\bAudio\s*(?P<index>\d+)\b", re.IGNORECASE)
AUDIO_EXTENSION_RE = re.compile(r"\.(?:mp3|wav|wma|ogg|m4a|aac)(?:$|[?#])", re.IGNORECASE)

# This is the published Slides media tuple shape.  The media token is the
# second ID in the inner tuple; pageObjectId and elementObjectId are retained
# only as location evidence.  The numeric type marker is captured and must be
# 1 before the ref can be called an audio tuple.
AUDIO_REF_RE = re.compile(
    r'\["(?P<page>[^"\\]+)",(?P<slide>\d+),"(?P<tuple_title>(?:\\.|[^"\\])*)",'
    r'\[\["(?P<element>[^"\\]+)","(?P<media>[A-Za-z0-9_-]{20,})",'
    r'(?P<type_marker>\d+),\[(?P<bbox>[^\]]*)\],100\.0,0,1,\[0\],\[0\],'
    r'"(?P<label>[^"]+\.(?:mp3|wav|wma|ogg|m4a|aac))"',
    re.IGNORECASE,
)
URL_RE = re.compile(r"https?://[^\s\"'<>\\]+", re.IGNORECASE)


def _unit_number(deck_title: str) -> int | None:
    match = re.search(r"\bUnit\s*(?P<unit>\d+)\b", deck_title, re.IGNORECASE)
    return int(match.group("unit")) if match else None


def _source_by_unit(manifest: Mapping[str, Any], unit: int) -> Mapping[str, Any]:
    matches = [
        source
        for source in manifest.get("sources", [])
        if _unit_number(str(source.get("deck", {}).get("deckTitle", ""))) == unit
    ]
    if len(matches) != 1:
        raise KeyError(f"expected one published source for Unit {unit}, found {len(matches)}")
    return matches[0]


def parse_published_audio_refs(markup: str) -> list[dict[str, Any]]:
    """Parse explicit audio tuples, excluding page/shape IDs from identity."""

    decoded = html.unescape(markup)
    refs: list[dict[str, Any]] = []
    seen: set[tuple[str, str, int]] = set()
    for match in AUDIO_REF_RE.finditer(decoded):
        zero_based = int(match.group("slide"))
        media_id = match.group("media")
        label = match.group("label")
        key = (media_id, label, zero_based)
        if key in seen:
            continue
        seen.add(key)
        type_marker = int(match.group("type_marker"))
        index_match = AUDIO_LABEL_RE.search(label)
        refs.append(
            {
                "zeroBasedSlideNumber": zero_based,
                "slideNumber": zero_based + 1,
                "pageObjectId": match.group("page"),
                "elementObjectId": match.group("element"),
                "publishedMediaObjectId": media_id,
                "publishedTupleTypeMarker": type_marker,
                "publishedTupleTypeVerified": type_marker == 1,
                "tupleTitle": match.group("tuple_title"),
                "label": label,
                "audioIndex": int(index_match.group("index")) if index_match else None,
                "idKind": "published-media-object",
                "identityEvidence": (
                    "inner Slides media tuple: media token + type marker 1 + audio filename extension"
                    if type_marker == 1
                    else "inner Slides media tuple has a non-audio type marker"
                ),
            }
        )
    return refs


def _direct_audio_urls(markup: str) -> list[str]:
    decoded = html.unescape(markup)
    urls: list[str] = []
    for raw in URL_RE.findall(decoded):
        value = raw.rstrip(",);]")
        parsed = urllib.parse.urlsplit(value)
        if parsed.netloc == "docs.google.com" and parsed.path.startswith("/slides-images-rt/"):
            continue
        if AUDIO_EXTENSION_RE.search(parsed.path) or AUDIO_EXTENSION_RE.search(value):
            if value not in urls:
                urls.append(value)
    return sorted(urls)


def _slide_title(source: Mapping[str, Any], number: int) -> str | None:
    for slide in source.get("deck", {}).get("slides", []):
        if int(slide.get("number", -1)) == number:
            return slide.get("title")
    return None


def fetch_published_source(source: Mapping[str, Any], timeout: int = 45) -> dict[str, Any]:
    """Fetch one exact public URL and retain no raw HTML."""

    deck_title = str(source.get("deck", {}).get("deckTitle", ""))
    unit = _unit_number(deck_title)
    if unit is None:
        raise ValueError(f"cannot determine unit from deck title {deck_title!r}")
    source_url = str(source["sourceUrl"])
    request = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read(MAX_HTML_BYTES + 1)
            final_url = response.geturl()
            status = response.status
            content_type = response.headers.get("content-type")
        if len(payload) > MAX_HTML_BYTES:
            raise ValueError(f"published HTML exceeds {MAX_HTML_BYTES} bytes")
        markup = payload.decode("utf-8", "replace")
        refs = parse_published_audio_refs(markup)
        for ref in refs:
            ref["slideTitle"] = _slide_title(source, int(ref["slideNumber"]))
        token_match = PUBLIC_TOKEN_RE.search(source_url)
        return {
            "unit": unit,
            "published": {
                "module": source.get("module"),
                "lesson": source.get("lesson"),
                "contentId": source.get("contentId"),
                "deckTitle": deck_title,
                "slideCount": source.get("deck", {}).get("slideCount"),
                "sourceUrl": source_url,
                "sourcePublishedToken": token_match.group(1) if token_match else None,
            },
            "fetch": {
                "httpStatus": status,
                "finalUrl": final_url,
                "contentType": content_type,
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "rawHtmlStored": False,
            },
            "audioRefs": refs,
            "directAudioUrls": _direct_audio_urls(markup),
        }
    except Exception as exc:  # retain a bounded per-unit blocker for network/source failures
        return {
            "unit": unit,
            "published": {
                "module": source.get("module"),
                "lesson": source.get("lesson"),
                "contentId": source.get("contentId"),
                "deckTitle": deck_title,
                "slideCount": source.get("deck", {}).get("slideCount"),
                "sourceUrl": source_url,
            },
            "fetch": {"error": f"{type(exc).__name__}: {exc}", "rawHtmlStored": False},
            "audioRefs": [],
            "directAudioUrls": [],
        }


def _materialized_by_id(materialization: Mapping[str, Any] | None) -> dict[str, Mapping[str, Any]]:
    return {
        str(item.get("id")): item
        for item in (materialization or {}).get("files", [])
        if item.get("id")
    }


def _candidate_evidence(candidate: Mapping[str, Any], materialized: Mapping[str, Any] | None) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "driveFileId": candidate.get("id"),
        "title": candidate.get("title"),
        "mimeType": candidate.get("mimeType"),
        "role": candidate.get("role"),
        "path": candidate.get("path"),
        "url": candidate.get("url"),
    }
    if materialized is not None:
        evidence.update(
            {
                "materializedExists": materialized.get("exists"),
                "materializedBytes": materialized.get("bytes"),
                "materializedSha256": materialized.get("sha256"),
                "materializedPath": materialized.get("path"),
            }
        )
    else:
        evidence["materializationLookup"] = "no-entry"
    return evidence


def compare_with_drive(
    record: Mapping[str, Any],
    drive_manifest: Mapping[str, Any],
    materialization: Mapping[str, Any] | None,
) -> dict[str, Any]:
    unit = int(record["unit"])
    unit_drive = drive_manifest.get("units", {}).get(str(unit), {})
    candidates = list(unit_drive.get("audioCandidates", []))
    by_id = {str(candidate.get("id")): candidate for candidate in candidates if candidate.get("id")}
    materialized = _materialized_by_id(materialization)
    candidate_records = [
        _candidate_evidence(candidate, materialized.get(str(candidate.get("id"))))
        for candidate in candidates
    ]
    refs: list[dict[str, Any]] = []
    for original in record.get("audioRefs", []):
        ref = dict(original)
        media_id = str(ref["publishedMediaObjectId"])
        candidate = by_id.get(media_id)
        if candidate is None:
            ref.update(
                {
                    "matchStatus": "published-id-not-in-authoritative-candidates",
                    "driveCandidate": None,
                    "filenameMatchUsed": False,
                    "metadataFetchStatus": "required-for-identity-audit",
                }
            )
        else:
            drive_type_ok = str(candidate.get("mimeType", "")).lower().startswith("audio/")
            tuple_type_ok = bool(ref.get("publishedTupleTypeVerified"))
            materialized_record = materialized.get(media_id)
            ref.update(
                {
                    "matchStatus": "direct-id-match" if drive_type_ok and tuple_type_ok else "id-match-type-unverified",
                    "driveCandidate": _candidate_evidence(candidate, materialized_record),
                    "driveMimeTypeVerified": drive_type_ok,
                    "filenameMatchUsed": False,
                    "materializedShaAvailable": bool(materialized_record and materialized_record.get("sha256")),
                    "metadataFetchStatus": "authoritative-manifest-and-materialization",
                }
            )
        refs.append(ref)
    unmatched = [ref for ref in refs if ref.get("matchStatus") == "published-id-not-in-authoritative-candidates"]
    matched = [ref for ref in refs if ref.get("matchStatus") == "direct-id-match"]
    if record.get("fetch", {}).get("error"):
        status = "published-source-fetch-error"
    elif not record.get("audioRefs"):
        status = "no-explicit-published-audio-tuple"
    elif unmatched:
        status = "published-id-mismatch-requires-observed-drive-metadata"
    elif len(matched) != len(record.get("audioRefs", [])):
        status = "published-audio-type-unverified"
    elif any(not ref.get("materializedShaAvailable") for ref in matched):
        status = "direct-id-match-but-materialized-sha-missing"
    else:
        status = "all-published-audio-ids-directly-match-materialized-authoritative-candidates"
    return {
        "unit": unit,
        "status": status,
        "publishedAudioCount": len(record.get("audioRefs", [])),
        "directIdMatchCount": len(matched),
        "unmatchedPublishedIdCount": len(unmatched),
        "authoritativeAudioCandidateCount": len(candidates),
        "authoritativeAudioCandidates": candidate_records,
        "audioRefs": refs,
        "directAudioUrls": record.get("directAudioUrls", []),
        "metadataFollowupIds": [ref["publishedMediaObjectId"] for ref in unmatched],
    }


def build_review(
    manifest: Mapping[str, Any],
    drive_manifest: Mapping[str, Any],
    materialization: Mapping[str, Any] | None,
    blocked_identity: Mapping[str, Any] | None = None,
    *,
    timeout: int = 45,
    workers: int = MAX_WORKERS,
) -> dict[str, Any]:
    if workers < 1 or workers > MAX_WORKERS:
        raise ValueError(f"workers must be between 1 and {MAX_WORKERS}")
    sources = [_source_by_unit(manifest, unit) for unit in range(UNIT_START, UNIT_END + 1)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        fetched = list(executor.map(lambda source: fetch_published_source(source, timeout), sources))
    units = {
        str(record["unit"]): compare_with_drive(record, drive_manifest, materialization)
        | {"published": record["published"], "fetch": record["fetch"]}
        for record in fetched
    }
    blocked_units: dict[str, Any] = {}
    for unit, prior in (blocked_identity or {}).get("units", {}).items():
        prior_refs = prior.get("media", {}).get("audioRefs", [])
        blocked_units[str(unit)] = {
            "sourceUrl": prior.get("published", {}).get("sourceUrl"),
            "status": "blocked-no-authoritative-audio-candidate",
            "authoritativeAudioCandidateCount": prior.get("authoritativeDriveContext", {}).get("audioCandidateCount"),
            "audioRefs": [
                {
                    "slideNumber": ref.get("slideNumber"),
                    "zeroBasedSlideNumber": ref.get("zeroBasedSlideNumber"),
                    "pageObjectId": ref.get("pageObjectId"),
                    "elementObjectId": ref.get("elementObjectId"),
                    "publishedMediaObjectId": ref.get("publishedMediaObjectId"),
                    "label": ref.get("label"),
                    "idKind": ref.get("idKind"),
                    "driveFileIdVerified": False,
                    "identityEvidence": "previous exact published-HTML audit; no authoritative Drive candidate was found",
                }
                for ref in prior_refs
            ],
        }
    return {
        "schemaVersion": 1,
        "scope": {
            "units": [UNIT_START, UNIT_END],
            "sourceManifest": str(DEFAULT_MANIFEST).replace("\\", "/"),
            "authoritativeDriveManifest": str(DEFAULT_DRIVE_MANIFEST).replace("\\", "/"),
            "audioMaterializationManifest": str(DEFAULT_MATERIALIZATION).replace("\\", "/"),
            "publishedSourcePriority": True,
            "rawHtmlStored": False,
            "shapeIdsUsedAsDriveIds": False,
        },
        "units": units,
        "knownOutOfScopeBlocked": {
            "units": [53, 54, 55, 56],
            "finding": "Published media object IDs were previously observed, but no authoritative audio candidate IDs were available; they remain blocked pending exact Drive identity metadata.",
            "source": "docs/audit/published-source-identity-53-56.json",
            "unitsDetail": blocked_units,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--drive-manifest", type=Path, default=DEFAULT_DRIVE_MANIFEST)
    parser.add_argument("--materialization", type=Path, default=DEFAULT_MATERIALIZATION)
    parser.add_argument("--blocked-identity", type=Path, default=DEFAULT_BLOCKED_IDENTITY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--workers", type=int, default=MAX_WORKERS)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    drive_manifest = json.loads(args.drive_manifest.read_text(encoding="utf-8"))
    materialization = (
        json.loads(args.materialization.read_text(encoding="utf-8")) if args.materialization.exists() else None
    )
    blocked_identity = (
        json.loads(args.blocked_identity.read_text(encoding="utf-8")) if args.blocked_identity.exists() else None
    )
    result = build_review(
        manifest,
        drive_manifest,
        materialization,
        blocked_identity,
        timeout=args.timeout,
        workers=args.workers,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {
        unit: {
            "status": record["status"],
            "publishedAudioCount": record["publishedAudioCount"],
            "directIdMatchCount": record["directIdMatchCount"],
            "unmatchedPublishedIdCount": record["unmatchedPublishedIdCount"],
        }
        for unit, record in result["units"].items()
    }
    print(json.dumps({"output": str(args.output), "units": len(result["units"]), "summary": summary}, ensure_ascii=False))


if __name__ == "__main__":
    main()
