#!/usr/bin/env python3
"""Compose reviewed published-course inputs and run the data-only builder.

This is an audit/composition step.  It never writes a database or copies a
public asset.  Published slide JSON is kept as the source of learner-facing
text.  Native PPTX evidence is filtered to the candidate for each lesson and
is attached only when the builder's strict slide alignment can use it.

The media plan supplied to this command must already contain browser-safe
public URLs and immutable source SHA-256 values.  The command reports missing
or unready media instead of fabricating a URL, an audio ordinal, or a figure.
"""

from __future__ import annotations

import argparse
import copy
from collections import Counter, defaultdict
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
UNIT_FIRST = 2
UNIT_LAST = 52
READY_MEDIA_STATUSES = {"planned", "staged", "already-staged", "ready"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
UNIT_RE = re.compile(r"\bunit\s*[-#]?\s*(\d{1,3})\b", re.IGNORECASE)


class ComposeError(ValueError):
    """Raised when a required audit input cannot be interpreted safely."""


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


def _int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ComposeError(f"cannot read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ComposeError(f"invalid JSON in {path}: {exc}") from exc


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _lesson_id(value: Mapping[str, Any]) -> str:
    lesson = value.get("lesson")
    if isinstance(lesson, Mapping):
        for key in ("id", "lessonId", "contentId"):
            item = _text(lesson.get(key))
            if item:
                return item
    for key in ("lessonId", "contentId", "id"):
        item = _text(value.get(key))
        if item:
            return item
    return ""


def _unit_from_value(value: Mapping[str, Any]) -> int | None:
    for key in ("unit", "unitNumber", "courseUnit", "globalUnit"):
        number = _int(value.get(key))
        if number is not None:
            return number
    for key in ("deckTitle", "title", "name", "sourcePath", "sourceFilename", "path"):
        match = UNIT_RE.search(_text(value.get(key)))
        if match:
            return int(match.group(1))
    lesson = value.get("lesson")
    if isinstance(lesson, Mapping):
        for key in ("title", "name"):
            match = UNIT_RE.search(_text(lesson.get(key)))
            if match:
                return int(match.group(1))
    return None


def _source_deck(source: Mapping[str, Any]) -> Mapping[str, Any]:
    deck = source.get("deck")
    return deck if isinstance(deck, Mapping) else source


def _source_url(source: Mapping[str, Any]) -> str:
    for key in ("sourceUrl", "publishedUrl", "url"):
        value = _text(source.get(key))
        if value:
            return value
    deck = source.get("deck")
    if isinstance(deck, Mapping):
        return _text(deck.get("sourceUrl"))
    return ""


def _source_slides(source: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    raw = _source_deck(source).get("slides", [])
    result = [item for item in _as_list(raw) if isinstance(item, Mapping)]
    return sorted(result, key=lambda item: (_int(item.get("number")) or 0, _text(item.get("title"))))


def _source_slide(source: Mapping[str, Any], number: int) -> Mapping[str, Any] | None:
    return next((item for item in _source_slides(source) if _int(item.get("number")) == number), None)


def _snapshot_lessons(snapshot: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    result: dict[str, Mapping[str, Any]] = {}
    for module in _as_list(snapshot.get("modules")):
        if not isinstance(module, Mapping):
            continue
        for lesson in _as_list(module.get("lessons")):
            if isinstance(lesson, Mapping):
                lesson_id = _text(lesson.get("id") or lesson.get("lessonId") or lesson.get("contentId"))
                if lesson_id:
                    result[lesson_id] = lesson
    for lesson in _as_list(snapshot.get("lessons")):
        if isinstance(lesson, Mapping):
            lesson_id = _text(lesson.get("id") or lesson.get("lessonId") or lesson.get("contentId"))
            if lesson_id:
                result[lesson_id] = lesson
    return result


def _published_sources(
    manifest: Mapping[str, Any],
    snapshot: Mapping[str, Any],
    blockers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[int, dict[str, Any]], dict[str, Mapping[str, Any]]]:
    raw_sources = manifest.get("sources")
    if not isinstance(raw_sources, list):
        raise ComposeError("published source manifest has no sources list")
    snapshot_lessons = _snapshot_lessons(snapshot)
    sources: list[dict[str, Any]] = []
    by_unit: dict[int, dict[str, Any]] = {}
    by_lesson: dict[str, Mapping[str, Any]] = {}
    for raw in raw_sources:
        if not isinstance(raw, Mapping):
            continue
        source = copy.deepcopy(dict(raw))
        unit = _unit_from_value(_source_deck(source))
        if unit is None:
            unit = _unit_from_value(source)
        lesson_id = _lesson_id(source)
        if unit is None or not (UNIT_FIRST <= unit <= UNIT_LAST):
            continue
        if not lesson_id:
            blockers.append({"kind": "source", "unit": unit, "code": "lesson-id-missing"})
            continue
        if unit in by_unit:
            blockers.append(
                {
                    "kind": "source",
                    "unit": unit,
                    "code": "duplicate-published-source",
                    "detail": f"Multiple published source records claim Unit {unit}.",
                }
            )
            continue
        if lesson_id not in snapshot_lessons:
            blockers.append(
                {
                    "kind": "source",
                    "unit": unit,
                    "lessonId": lesson_id,
                    "code": "lesson-missing-from-snapshot",
                }
            )
        if not _source_url(source):
            blockers.append({"kind": "source", "unit": unit, "code": "published-url-missing"})
        if not _source_slides(source):
            blockers.append({"kind": "source", "unit": unit, "code": "published-slides-missing"})
        by_unit[unit] = source
        by_lesson[lesson_id] = source
        sources.append(source)
    expected = set(range(UNIT_FIRST, UNIT_LAST + 1))
    for unit in sorted(expected - set(by_unit)):
        blockers.append({"kind": "source", "unit": unit, "code": "published-source-missing"})
    sources.sort(key=lambda item: _unit_from_value(_source_deck(item)) or 10**6)
    return sources, by_unit, by_lesson


def _record_sha(record: Mapping[str, Any]) -> str:
    for key in (
        "sourceSha256",
        "sourceSHA256",
        "sourceSHA",
        "sha256",
        "sha256Digest",
        "mediaDigest",
        "digest",
    ):
        value = _text(record.get(key))
        if value:
            return value.lower()
    return ""


def _record_id(record: Mapping[str, Any]) -> str:
    for key in ("id", "sourceId", "audioId", "assetId", "mediaId"):
        value = _text(record.get(key))
        if value:
            return value
    return _record_sha(record)


def _record_url(record: Mapping[str, Any]) -> str:
    for key in (
        "publicHref",
        "publicUrl",
        "publicURL",
        "playbackUrl",
        "playbackURL",
        "runtimeUrl",
        "runtimeURL",
        "url",
    ):
        value = _text(record.get(key))
        if value:
            return value
    return ""


def _record_path(record: Mapping[str, Any]) -> str:
    for key in (
        "sourcePath",
        "localPath",
        "localFile",
        "absolutePath",
        "assetPath",
        "imagePath",
        "filePath",
        "path",
        "audioPath",
    ):
        value = _text(record.get(key))
        if value:
            return value
    return ""


def _record_status(record: Mapping[str, Any]) -> str:
    return _text(record.get("status") or record.get("stageStatus") or "ready").casefold()


def _media_records(value: Any, kind: str) -> list[dict[str, Any]]:
    if not isinstance(value, Mapping):
        return []
    values = value.get(kind)
    if isinstance(values, list):
        return [copy.deepcopy(dict(item)) for item in values if isinstance(item, Mapping)]
    # Accept the nested form emitted when --audio-manifest/--image-manifest
    # were supplied to prepare-course-media.
    nested = value.get(f"_{kind}Manifest")
    if isinstance(nested, Mapping):
        return _media_records(nested, kind)
    return []


def _resolve_local_path(raw: Any, roots: Sequence[Path]) -> str:
    candidate = Path(_text(raw))
    if candidate.is_absolute() and candidate.is_file():
        return str(candidate.resolve())
    for root in roots:
        resolved = (root / candidate).resolve()
        if resolved.is_file():
            return str(resolved)
    if candidate.is_absolute():
        return str(candidate)
    return str((roots[0] / candidate).resolve()) if roots else str(candidate)


def _index_reviewed_media(reviewed: Mapping[str, Any] | None) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    audio: dict[str, dict[str, Any]] = {}
    images: dict[str, dict[str, Any]] = {}
    if not isinstance(reviewed, Mapping):
        return audio, images
    for item in _media_records(reviewed, "audio"):
        key = _record_id(item) or _record_sha(item)
        if key:
            audio[key] = item
        digest = _record_sha(item)
        if digest:
            audio.setdefault(digest, item)
    for item in _media_records(reviewed, "images"):
        key = _record_id(item) or _record_sha(item)
        if key:
            images[key] = item
        digest = _record_sha(item)
        if digest:
            images.setdefault(digest, item)
    return audio, images


def _merge_staged_record(
    staged: Mapping[str, Any] | None,
    reviewed: Mapping[str, Any] | None,
) -> dict[str, Any]:
    result = copy.deepcopy(dict(reviewed or {}))
    if staged:
        result.update(copy.deepcopy(dict(staged)))
    # Staging output intentionally omits some review-only provenance fields.
    for key in ("lessonId", "audioNumber", "sourceSlideNumber", "confirmedInstructional", "nativeTrace", "transcript"):
        if key not in result and reviewed and reviewed.get(key) not in (None, "", [], {}):
            result[key] = copy.deepcopy(reviewed[key])
    return result


def _staged_index(records: Sequence[Mapping[str, Any]]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    by_id: dict[str, dict[str, Any]] = {}
    by_sha: dict[str, dict[str, Any]] = {}
    for item in records:
        copied = copy.deepcopy(dict(item))
        identifier = _record_id(copied)
        digest = _record_sha(copied)
        if identifier:
            by_id.setdefault(identifier, copied)
        if digest:
            by_sha.setdefault(digest, copied)
    return by_id, by_sha


def _normalize_audio(
    staged: Mapping[str, Any],
    reviewed: Mapping[str, Any] | None,
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    reviewed_audio_by_key, _ = _index_reviewed_media(reviewed)
    staged_records = _media_records(staged, "audio")
    staged_by_id, staged_by_sha = _staged_index(staged_records)
    reviewed_records = _media_records(reviewed, "audio")
    if not staged_records and reviewed_records:
        # This path is deliberately still blocked below because reviewed media
        # has immutable source data but no staged browser URL.
        staged_records = []
    merged: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for source_item in reviewed_records or staged_records:
        identifier = _record_id(source_item)
        digest = _record_sha(source_item)
        staged_item = staged_by_id.get(identifier) or staged_by_sha.get(digest)
        item = _merge_staged_record(staged_item, source_item)
        if not identifier:
            identifier = _record_id(item)
        unit = _unit_from_value(item)
        if unit is None:
            unit = _unit_from_value(source_item)
        if unit is None or not (UNIT_FIRST <= unit <= UNIT_LAST):
            continue
        key = (identifier, digest)
        if key in seen:
            continue
        seen.add(key)
        lesson_id = _text(item.get("lessonId"))
        if not lesson_id and isinstance(sources_by_unit.get(unit), Mapping):
            lesson_id = _lesson_id(sources_by_unit[unit])
        slide = _int(item.get("slideNumber"))
        if slide is None:
            slide = _int(item.get("sourceSlideNumber"))
        audio_number = _int(item.get("audioNumber"))
        if audio_number is None:
            audio_number = _int(item.get("audioIndex"))
        transcript = _text(item.get("transcript") or item.get("text"))
        public_url = _record_url(item)
        source_path = _resolve_local_path(_record_path(item), asset_roots)
        status = _record_status(item)
        normalized = {
            **item,
            "id": identifier,
            "sourceId": identifier,
            "kind": "audio",
            "mediaType": "audio",
            "unit": unit,
            "lessonId": lesson_id,
            "slideNumber": slide,
            "sourceSlideNumber": slide,
            "audioIndex": audio_number,
            "audioNumber": audio_number,
            "sourceSha256": digest,
            "mediaDigest": digest,
            "transcript": transcript,
            "publicUrl": public_url,
            "publicHref": public_url,
            "sourcePath": source_path,
            "status": status,
        }
        required = (
            ("lesson-id-missing", not lesson_id),
            ("audio-slide-missing", slide is None),
            ("audio-ordinal-missing", audio_number is None),
            ("audio-sha-missing", not SHA256_RE.fullmatch(digest)),
            ("audio-transcript-missing", not transcript),
            ("audio-public-url-missing", not public_url),
            ("audio-source-file-missing", not Path(source_path).is_file()),
        )
        for code, failed in required:
            if failed:
                blockers.append({"kind": "audio", "unit": unit, "sourceId": identifier, "code": code})
        if status not in READY_MEDIA_STATUSES:
            blockers.append(
                {
                    "kind": "audio",
                    "unit": unit,
                    "sourceId": identifier,
                    "code": "audio-stage-not-ready",
                    "status": status,
                    "detail": _text(item.get("reason")),
                }
            )
        merged.append(normalized)
    by_unit = Counter(item["unit"] for item in merged)
    expected = sum(1 for unit in sources_by_unit if UNIT_FIRST <= unit <= UNIT_LAST)
    if len(merged) != len(reviewed_records) and reviewed_records:
        blockers.append(
            {
                "kind": "audio",
                "code": "audio-record-count-mismatch",
                "expected": len(reviewed_records),
                "actual": len(merged),
            }
        )
    return sorted(merged, key=lambda item: (item["unit"], item.get("audioNumber") or 10**6, item["id"])), {
        "reviewedRecords": len(reviewed_records),
        "stagedRecords": len(staged_records),
        "normalizedRecords": len(merged),
        "unitsWithAudio": len(by_unit),
        "expectedUnits": expected,
    }


def _figure_candidates(
    reviewed_figures: Mapping[str, Any] | None,
    correspondence: Mapping[str, Any] | None,
    stage_images: Mapping[str, dict[str, Any]],
    reviewed_images: Mapping[str, dict[str, Any]],
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[tuple[int, int, str]] = set()
    confirmed_units = reviewed_figures.get("units", {}) if isinstance(reviewed_figures, Mapping) else {}
    if isinstance(confirmed_units, list):
        confirmed_units = {str(item.get("unit")): item for item in confirmed_units if isinstance(item, Mapping)}
    for unit in range(UNIT_FIRST, UNIT_LAST + 1):
        unit_entry = confirmed_units.get(str(unit), {}) if isinstance(confirmed_units, Mapping) else {}
        if unit in {33, 34, 35, 36}:
            # These decks have no whole-deck native match.  Their figures are
            # admitted only through the separately reviewed correspondence file.
            continue
        slides = unit_entry.get("slides", {}) if isinstance(unit_entry, Mapping) else {}
        if not isinstance(slides, Mapping):
            continue
        for raw_slide, slide_entry in slides.items():
            if not isinstance(slide_entry, Mapping):
                continue
            slide_number = _int(slide_entry.get("publishedSlideNumber")) or _int(raw_slide)
            if slide_number is None:
                continue
            purpose = _text(slide_entry.get("purpose"))
            for asset in _as_list(slide_entry.get("confirmedInstructionalAssets")):
                if not isinstance(asset, Mapping):
                    continue
                if asset.get("confirmedInstructional") is not True:
                    continue
                digest = _record_sha(asset)
                path = _record_path(asset)
                if not digest or not path:
                    blockers.append({"kind": "image", "unit": unit, "slide": slide_number, "code": "figure-trace-missing"})
                    continue
                candidates.append(
                    {
                        "unit": unit,
                        "slideNumber": slide_number,
                        "sourceSha256": digest,
                        "sourcePath": _resolve_local_path(path, asset_roots),
                        "purpose": purpose,
                        "reviewedFigure": copy.deepcopy(dict(asset)),
                        "mapping": "reviewed-figures",
                    }
                )
    corr_units = correspondence.get("units", []) if isinstance(correspondence, Mapping) else []
    if isinstance(corr_units, Mapping):
        corr_units = list(corr_units.values())
    for unit_entry in _as_list(corr_units):
        if not isinstance(unit_entry, Mapping):
            continue
        unit = _int(unit_entry.get("unit"))
        if unit not in {33, 34, 35, 36}:
            continue
        findings = {
            _int(item.get("sourceSlide")): item
            for item in _as_list(unit_entry.get("slideFindings"))
            if isinstance(item, Mapping) and _int(item.get("sourceSlide")) is not None
        }
        for item in _as_list(unit_entry.get("correspondences")):
            if not isinstance(item, Mapping):
                continue
            source_slide = _int(item.get("sourceSlide"))
            published_slide = _int(item.get("publishedSlide"))
            digest = _record_sha(item)
            path = _record_path(item)
            finding = findings.get(source_slide)
            exact = (
                source_slide is not None
                and published_slide == source_slide
                and finding is not None
                and _text(finding.get("status")).casefold() == "confirmed"
                and bool(digest)
                and bool(path)
            )
            if not exact:
                blockers.append(
                    {
                        "kind": "image",
                        "unit": unit,
                        "slide": published_slide or source_slide,
                        "code": "figure-correspondence-not-exact",
                    }
                )
                continue
            candidates.append(
                {
                    "unit": unit,
                    "slideNumber": published_slide,
                    "sourceSha256": digest,
                    "sourcePath": _resolve_local_path(path, asset_roots),
                    "purpose": _text(finding.get("purpose")),
                    "reviewedFigure": copy.deepcopy(dict(item)),
                    "mapping": "units-33-36-correspondence",
                    "correspondenceEvidence": {
                        "nativeCandidateSha256": _text(unit_entry.get("nativeCandidateSha256")),
                        "publishedTextSequenceRatio": item.get("publishedTextSequenceRatio"),
                    },
                }
            )
    ready_figures: list[dict[str, Any]] = []
    for candidate in candidates:
        unit = candidate["unit"]
        slide = candidate["slideNumber"]
        digest = candidate["sourceSha256"]
        key = (unit, slide, digest)
        if key in seen:
            continue
        seen.add(key)
        staged = stage_images.get(digest) or reviewed_images.get(digest)
        if staged is None:
            blockers.append(
                {
                    "kind": "image",
                    "unit": unit,
                    "slide": slide,
                    "sourceSha256": digest,
                    "code": "figure-media-not-staged",
                }
            )
            continue
        status = _record_status(staged)
        public_url = _record_url(staged)
        source_path = _resolve_local_path(candidate["sourcePath"], asset_roots)
        if status not in READY_MEDIA_STATUSES:
            blockers.append(
                {
                    "kind": "image",
                    "unit": unit,
                    "slide": slide,
                    "sourceSha256": digest,
                    "code": "figure-stage-not-ready",
                    "status": status,
                }
            )
        if not public_url:
            blockers.append(
                {
                    "kind": "image",
                    "unit": unit,
                    "slide": slide,
                    "sourceSha256": digest,
                    "code": "figure-public-url-missing",
                }
            )
        if not Path(source_path).is_file():
            blockers.append(
                {
                    "kind": "image",
                    "unit": unit,
                    "slide": slide,
                    "sourceSha256": digest,
                    "code": "figure-source-file-missing",
                }
            )
        if status not in READY_MEDIA_STATUSES or not public_url or not Path(source_path).is_file():
            continue
        trace = copy.deepcopy(candidate.get("reviewedFigure") or {})
        trace["sourceSha256"] = digest
        trace["sourcePath"] = source_path
        trace["mapping"] = candidate["mapping"]
        ready_figures.append(
            {
                "unit": unit,
                "slideNumber": slide,
                "sourceSha256": digest,
                "assetPath": source_path,
                "publicUrl": public_url,
                "alt": f"Original instructional figure from Unit {unit}, slide {slide}.",
                "role": "instructional-figure",
                "confirmedInstructional": True,
                "nativeEvidence": trace,
            }
        )
    return ready_figures, {
        "candidateReferences": len(candidates),
        "readyReferences": len(ready_figures),
        "uniqueSourceSha256": len({item["sourceSha256"] for item in ready_figures}),
        "unitsWithFigures": len({item["unit"] for item in ready_figures}),
        "mappingCounts": dict(Counter(item.get("mapping") for item in candidates)),
    }


def _native_candidate_ids(
    reviewed_figures: Mapping[str, Any] | None,
    correspondence: Mapping[str, Any] | None,
    native_match: Mapping[str, Any] | None,
) -> dict[int, str]:
    result: dict[int, str] = {}
    units = reviewed_figures.get("units", {}) if isinstance(reviewed_figures, Mapping) else {}
    if isinstance(units, list):
        units = {str(item.get("unit")): item for item in units if isinstance(item, Mapping)}
    if isinstance(units, Mapping):
        for raw_unit, item in units.items():
            if isinstance(item, Mapping):
                candidate = item.get("nativeSource")
                if isinstance(candidate, Mapping) and _text(candidate.get("candidateId")):
                    result[int(raw_unit)] = _text(candidate["candidateId"])
    targets = native_match.get("targets", {}) if isinstance(native_match, Mapping) else {}
    if isinstance(targets, Mapping):
        for raw_unit, target in targets.items():
            unit = _int(raw_unit)
            if unit is None or not isinstance(target, Mapping):
                continue
            best = target.get("bestCandidate")
            if isinstance(best, Mapping) and _text(best.get("candidateId")):
                result[unit] = _text(best["candidateId"])
    # The correspondence file records the native candidate digest, while the
    # native audit records the candidate ID.  The match review above is the
    # only accepted bridge for Units 33-36.
    return result


def _compose_native_audit(
    native_audit: Mapping[str, Any] | None,
    reviewed_figures: Mapping[str, Any] | None,
    correspondence: Mapping[str, Any] | None,
    native_match: Mapping[str, Any] | None,
    figures: Sequence[Mapping[str, Any]],
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    blockers: list[dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(native_audit, Mapping):
        blockers.append({"kind": "native", "code": "native-audit-missing"})
        return {"schemaVersion": 1, "records": []}
    raw_records = [item for item in _as_list(native_audit.get("records")) if isinstance(item, Mapping)]
    candidate_ids = _native_candidate_ids(reviewed_figures, correspondence, native_match)
    figure_map: dict[tuple[int, int], list[Mapping[str, Any]]] = defaultdict(list)
    for figure in figures:
        figure_map[(int(figure["unit"]), int(figure["slideNumber"]))].append(figure)
    selected: list[dict[str, Any]] = []
    for unit in range(UNIT_FIRST, UNIT_LAST + 1):
        source = sources_by_unit.get(unit)
        source_title = _text(_source_deck(source or {}).get("deckTitle"))
        wanted_id = candidate_ids.get(unit)
        records = [record for record in raw_records if _int(record.get("unit")) == unit]
        if wanted_id:
            matching = [
                record
                for record in records
                if isinstance(record.get("candidate"), Mapping)
                and _text(record["candidate"].get("id")) == wanted_id
            ]
            records = matching or records
        records = [
            record
            for record in records
            if _text((record.get("candidate") or {}).get("role") if isinstance(record.get("candidate"), Mapping) else "")
            in {"primary-candidate", ""}
        ] or records
        if not records:
            blockers.append({"kind": "native", "unit": unit, "code": "native-record-missing"})
            continue
        records.sort(
            key=lambda record: (
                0
                if _text((record.get("candidate") or {}).get("title") if isinstance(record.get("candidate"), Mapping) else "")
                == source_title
                else 1,
                _text((record.get("candidate") or {}).get("id") if isinstance(record.get("candidate"), Mapping) else ""),
            )
        )
        record = copy.deepcopy(dict(records[0]))
        native = record.get("native")
        if isinstance(native, Mapping):
            native_copy = copy.deepcopy(dict(native))
            slides: list[dict[str, Any]] = []
            for raw_slide in _as_list(native_copy.get("slides")):
                if not isinstance(raw_slide, Mapping):
                    continue
                slide = copy.deepcopy(dict(raw_slide))
                number = _int(slide.get("number"))
                if number is not None and figure_map.get((unit, number)):
                    slide["figures"] = copy.deepcopy(figure_map[(unit, number)])
                slides.append(slide)
            native_copy["slides"] = slides
            record["native"] = native_copy
        selected.append(record)
    return {
        "schemaVersion": native_audit.get("schemaVersion", 1),
        "source": "composed published-priority native audit",
        "_auditPath": "course-builder-native-audit.json",
        "records": selected,
    }


def _normalize_exercise_review(
    exercise_review: Mapping[str, Any] | None,
    source_by_lesson: Mapping[str, Mapping[str, Any]],
    blockers: list[dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(exercise_review, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-missing"})
        return {"schemaVersion": 1, "courseId": COURSE_ID, "lessons": {}}
    raw_lessons = exercise_review.get("lessons")
    if isinstance(raw_lessons, Mapping):
        iterable = raw_lessons.items()
    elif isinstance(raw_lessons, list):
        iterable = ((_text(item.get("lessonId")), item) for item in raw_lessons if isinstance(item, Mapping))
    else:
        blockers.append({"kind": "exercise", "code": "exercise-review-lessons-missing"})
        return {"schemaVersion": 1, "courseId": COURSE_ID, "lessons": {}}
    lessons: dict[str, Any] = {}
    for raw_id, value in iterable:
        lesson_id = _text(raw_id) or (_text(value.get("lessonId")) if isinstance(value, Mapping) else "")
        if lesson_id not in source_by_lesson:
            continue
        if not isinstance(value, Mapping):
            blockers.append({"kind": "exercise", "lessonId": lesson_id, "code": "exercise-review-entry-invalid"})
            continue
        lessons[lesson_id] = copy.deepcopy(dict(value))
    expected = set(source_by_lesson)
    missing = sorted(expected - set(lessons))
    for lesson_id in missing:
        blockers.append({"kind": "exercise", "lessonId": lesson_id, "code": "exercise-review-lesson-missing"})
    return {
        "schemaVersion": exercise_review.get("schemaVersion", 1),
        "courseId": _text(exercise_review.get("courseId")) or COURSE_ID,
        "sourcePolicy": copy.deepcopy(exercise_review.get("sourcePolicy")),
        "lessons": lessons,
    }


def _normalize_listening(
    documents: Sequence[Mapping[str, Any]],
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    audio: Sequence[Mapping[str, Any]],
    blockers: list[dict[str, Any]],
) -> dict[str, Any]:
    audio_by_lesson = defaultdict(list)
    for item in audio:
        audio_by_lesson[_text(item.get("lessonId"))].append(item)
    exercises: list[dict[str, Any]] = []
    for document in documents:
        for raw in _as_list(document.get("exercises")):
            if not isinstance(raw, Mapping):
                blockers.append({"kind": "listening", "code": "listening-entry-invalid"})
                continue
            entry = copy.deepcopy(dict(raw))
            lesson_id = _text(entry.get("lessonId") or entry.get("sourceLessonId"))
            if lesson_id not in sources_by_lesson:
                continue
            slide = _int(entry.get("slideNumber"))
            if slide is None and _int(entry.get("unit")) == 3:
                candidates = [
                    item
                    for item in audio_by_lesson.get(lesson_id, [])
                    if _int(item.get("audioNumber")) == 2 and _int(item.get("slideNumber")) is not None
                ]
                source_slide = _source_slide(sources_by_lesson[lesson_id], _int(candidates[0].get("slideNumber")) if candidates else -1)
                if len(candidates) == 1 and source_slide and (_int(source_slide.get("mediaSummary", {}).get("audioIconCount")) or 0) > 0:
                    slide = _int(candidates[0].get("slideNumber"))
                    entry["slideNumber"] = slide
                    entry["mappingRationale"] = (
                        "Unit 3 published source exposes only original Audio 2 at slide 4; "
                        "the authored intro reflection reuses that exact clip. No Audio 1 or "
                        "self-study candidate was inferred."
                    )
                else:
                    blockers.append(
                        {
                            "kind": "listening",
                            "unit": 3,
                            "lessonId": lesson_id,
                            "code": "unit3-audio2-slide-mapping-unresolved",
                        }
                    )
            if slide is None:
                blockers.append(
                    {
                        "kind": "listening",
                        "unit": _int(entry.get("unit")),
                        "lessonId": lesson_id,
                        "code": "listening-slide-missing",
                    }
                )
            exercises.append(entry)
    return {"schemaVersion": 1, "exercises": exercises}


def _blocker_summary(blockers: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    counts = Counter(_text(item.get("code")) or _text(item.get("kind")) or "unknown" for item in blockers)
    return {
        "total": len(blockers),
        "byCode": dict(sorted(counts.items())),
        "units": sorted({int(item["unit"]) for item in blockers if _int(item.get("unit")) is not None}),
    }


def _builder_summary(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"status": "missing", "path": str(path)}
    try:
        manifest = _load_json(path)
    except ComposeError as exc:
        return {"status": "invalid", "path": str(path), "error": str(exc)}
    plans = manifest.get("plans") if isinstance(manifest, Mapping) else []
    plans = [plan for plan in _as_list(plans) if isinstance(plan, Mapping)]
    blockers = [
        blocker
        for plan in plans
        for blocker in _as_list(plan.get("blockers"))
        if isinstance(blocker, Mapping)
    ]
    by_code = Counter(_text(item.get("code")) or "unknown" for item in blockers)
    return {
        "status": "ready",
        "path": str(path),
        "sourceCount": manifest.get("sourceCount"),
        "planCount": len(plans),
        "publishableCount": sum(bool(plan.get("publishable")) for plan in plans),
        "blockedCount": sum(not bool(plan.get("publishable")) for plan in plans),
        "blockerCount": len(blockers),
        "blockersByCode": dict(sorted(by_code.items())),
        "blockedLessons": sorted(
            _text(plan.get("lessonId"))
            for plan in plans
            if not plan.get("publishable") and _text(plan.get("lessonId"))
        ),
        "unsupportedSlideCount": sum(len(_as_list(plan.get("unsupportedSlides"))) for plan in plans),
    }


def compose(args: argparse.Namespace) -> tuple[dict[str, Any], int]:
    snapshot = _load_json(args.snapshot)
    source_manifest = _load_json(args.source_manifest)
    staged_media = _load_json(args.staged_media)
    reviewed_media = _load_json(args.reviewed_media) if args.reviewed_media else None
    reviewed_figures = _load_json(args.reviewed_figures) if args.reviewed_figures else None
    correspondence = _load_json(args.figure_correspondence) if args.figure_correspondence else None
    native_audit = _load_json(args.native_audit) if args.native_audit else None
    native_match = _load_json(args.native_match) if args.native_match else None
    exercise_review = _load_json(args.exercise_review) if args.exercise_review else None
    listening_documents = [_load_json(path) for path in args.listening_review]

    if not isinstance(snapshot, Mapping) or not isinstance(source_manifest, Mapping):
        raise ComposeError("snapshot and source manifest must contain objects")
    if _text(snapshot.get("courseId") or (snapshot.get("course") or {}).get("id")) not in {"", COURSE_ID}:
        raise ComposeError("snapshot course id does not match the course builder")
    blockers: list[dict[str, Any]] = []
    sources, sources_by_unit, sources_by_lesson = _published_sources(source_manifest, snapshot, blockers)
    snapshot_lessons = _snapshot_lessons(snapshot)
    source_by_lesson = {lesson_id: source for lesson_id, source in sources_by_lesson.items() if lesson_id in snapshot_lessons}

    _reviewed_audio, reviewed_images = _index_reviewed_media(reviewed_media)
    stage_image_records = _media_records(staged_media, "images")
    _stage_images_by_id, stage_images_by_sha = _staged_index(stage_image_records)
    stage_audio_records = _media_records(staged_media, "audio")
    audio, audio_counts = _normalize_audio(
        staged_media,
        reviewed_media,
        sources_by_unit,
        args.asset_root,
        blockers,
    )
    figures, figure_counts = _figure_candidates(
        reviewed_figures,
        correspondence,
        stage_images_by_sha,
        reviewed_images,
        sources_by_unit,
        args.asset_root,
        blockers,
    )
    filtered_native = _compose_native_audit(
        native_audit,
        reviewed_figures,
        correspondence,
        native_match,
        figures,
        sources_by_unit,
        blockers,
    )
    normalized_exercise = _normalize_exercise_review(exercise_review, source_by_lesson, blockers)
    normalized_listening = _normalize_listening(
        listening_documents,
        source_by_lesson,
        audio,
        blockers,
    )

    materialized = args.materialized_dir.resolve()
    source_dir = materialized / "sources"
    source_dir.mkdir(parents=True, exist_ok=True)
    for source in sources:
        lesson_id = _lesson_id(source)
        if lesson_id:
            _write_json(source_dir / f"{lesson_id}.json", source)
    native_path = materialized / "native-audit.json"
    audio_path = materialized / "audio-manifest.json"
    exercise_path = materialized / "exercise-review.json"
    listening_path = materialized / "listening-review.json"
    _write_json(native_path, filtered_native)
    _write_json(audio_path, {"schemaVersion": 1, "audio": audio})
    _write_json(exercise_path, normalized_exercise)
    _write_json(listening_path, normalized_listening)

    draft = {
        "schemaVersion": 1,
        "courseId": COURSE_ID,
        "scope": {
            "units": [UNIT_FIRST, UNIT_LAST],
            "unitCount": UNIT_LAST - UNIT_FIRST + 1,
            "sourceCount": len(sources),
            "publishedSourcePriority": True,
            "nativeSupplementOnlyWhenAligned": True,
            "unit33To36FiguresRequireCorrespondence": True,
            "unit3AudioPolicy": "reuse-exact-audio2-only-when-slide4-source-match-is-proven",
        },
        "inputPaths": {
            "snapshot": str(args.snapshot),
            "sourceManifest": str(args.source_manifest),
            "stagedMedia": str(args.staged_media),
            "reviewedMedia": str(args.reviewed_media) if args.reviewed_media else None,
            "reviewedFigures": str(args.reviewed_figures) if args.reviewed_figures else None,
            "figureCorrespondence": str(args.figure_correspondence) if args.figure_correspondence else None,
            "nativeAudit": str(args.native_audit) if args.native_audit else None,
            "nativeMatch": str(args.native_match) if args.native_match else None,
            "exerciseReview": str(args.exercise_review) if args.exercise_review else None,
            "listeningReview": [str(path) for path in args.listening_review],
        },
        "materializedInputs": {
            "sourceDir": str(source_dir),
            "nativeAudit": str(native_path),
            "audioManifest": str(audio_path),
            "exerciseReview": str(exercise_path),
            "listeningReview": str(listening_path),
        },
        "sources": [
            {
                "unit": _unit_from_value(_source_deck(source)),
                "lessonId": _lesson_id(source),
                "title": _text((_source_deck(source)).get("deckTitle")),
                "sourceUrl": _source_url(source),
                "slideCount": len(_source_slides(source)),
            }
            for source in sources
        ],
        "audio": audio,
        "figures": figures,
        "counts": {
            "publishedSources": len(sources),
            "expectedPublishedSources": UNIT_LAST - UNIT_FIRST + 1,
            "stageAudioRecords": len(stage_audio_records),
            "stageImageRecords": len(stage_image_records),
            "stageAudioReady": sum(_record_status(item) in READY_MEDIA_STATUSES for item in stage_audio_records),
            "stageImageReady": sum(_record_status(item) in READY_MEDIA_STATUSES for item in stage_image_records),
            "stageImageDuplicates": sum(_record_status(item) == "duplicate" for item in stage_image_records),
            "audio": audio_counts,
            "figures": figure_counts,
            "exerciseReviewLessons": len(normalized_exercise["lessons"]),
            "listeningReviewEntries": len(normalized_listening["exercises"]),
            "listeningReviewItems": sum(
                len(_as_list(entry.get("items")))
                for entry in normalized_listening["exercises"]
                if isinstance(entry, Mapping)
            ),
        },
        "blockers": blockers,
        "blockerSummary": _blocker_summary(blockers),
    }
    _write_json(args.output, draft)

    builder_return_code: int | None = None
    builder_stdout = ""
    builder_stderr = ""
    if args.run_builder:
        if args.builder is None or not args.builder.is_file():
            blockers.append({"kind": "builder", "code": "builder-script-missing"})
        else:
            command = [
                sys.executable,
                str(args.builder),
                "--snapshot",
                str(args.snapshot),
                "--source-dir",
                str(source_dir),
                "--output",
                str(args.builder_output),
                "--audio-manifest",
                str(audio_path),
                "--native-audit",
                str(native_path),
                "--exercise-review",
                str(exercise_path),
                "--expected-source-count",
                str(len(sources)),
            ]
            for path in (listening_path,):
                command.extend(["--listening-review", str(path)])
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
            )
            builder_return_code = completed.returncode
            builder_stdout = completed.stdout[-4000:]
            builder_stderr = completed.stderr[-4000:]

    builder = _builder_summary(args.builder_output) if args.run_builder else {"status": "not-run"}
    audit = {
        "schemaVersion": 1,
        "composer": "scripts/content/compose-course-builder-inputs.py",
        "draftInputs": str(args.output),
        "materializedInputs": draft["materializedInputs"],
        "builder": {
            **builder,
            "returnCode": builder_return_code,
            "stdoutTail": builder_stdout,
            "stderrTail": builder_stderr,
        },
        "counts": draft["counts"],
        "composerBlockers": _blocker_summary(blockers),
        "composerBlockerDetails": blockers,
        "readyForApply": not blockers and builder.get("blockedCount", 0) == 0,
        "policy": {
            "publishedSlidesAuthoritative": True,
            "genericNativeImageRefsExcluded": True,
            "unresolvedUnit33To36FiguresStayBlocked": True,
            "unit3DoesNotInventAudio1": True,
            "databaseOrPublicWrites": False,
        },
    }
    _write_json(args.audit_output, audit)
    # Keep draft's blocker summary in sync with blockers discovered after the
    # draft was written (for example a missing builder executable).
    draft["blockers"] = blockers
    draft["blockerSummary"] = _blocker_summary(blockers)
    _write_json(args.output, draft)
    exit_code = 0
    if args.require_ready and (blockers or builder.get("blockedCount", 0)):
        exit_code = 2
    return audit, exit_code


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--source-manifest", required=True, type=Path)
    parser.add_argument("--staged-media", required=True, type=Path)
    parser.add_argument("--reviewed-media", type=Path)
    parser.add_argument("--reviewed-figures", type=Path)
    parser.add_argument("--figure-correspondence", type=Path)
    parser.add_argument("--native-audit", type=Path)
    parser.add_argument("--native-match", type=Path)
    parser.add_argument("--exercise-review", type=Path)
    parser.add_argument("--listening-review", type=Path, action="append", default=[])
    parser.add_argument("--asset-root", type=Path, action="append", default=[Path.cwd()])
    parser.add_argument("--materialized-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="draft composed inputs JSON")
    parser.add_argument("--audit-output", type=Path, required=True)
    parser.add_argument("--builder", type=Path)
    parser.add_argument("--builder-output", type=Path, default=Path("course-builder-learning-draft.json"))
    parser.add_argument("--run-builder", action="store_true")
    parser.add_argument("--require-ready", action="store_true")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        _audit, exit_code = compose(args)
        return exit_code
    except ComposeError as exc:
        print(f"compose-course-builder-inputs: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
