#!/usr/bin/env python3
"""Prepare reviewed original course media for a later, explicit publish step.

The command is intentionally dry-run by default.  It reads review manifests,
validates every selected source against its recorded SHA-256, and emits a
deterministic staging plan.  ``--stage`` may then copy audio or format-convert
images into a caller-provided public root.  No database or network operation
is performed.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

try:
    from PIL import Image
except ImportError:  # pragma: no cover - exercised when the optional dependency is absent
    Image = None  # type: ignore[assignment,misc]


PLAN_SCHEMA_VERSION = 1
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac", ".webm"}
RASTER_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
UNSUPPORTED_VECTOR_EXTENSIONS = {".emf", ".wmf"}
IMAGE_MAX_DIMENSION = 1600
IMAGE_WEBP_QUALITY = 90
BLOCKED_ROLE_PATTERN = re.compile(r"\b(?:ssm|self[- ]?study|quiz(?:zes)?|test|copy|duplicate|exam)\b", re.IGNORECASE)
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)


class MediaPlanError(ValueError):
    """Raised when a media manifest cannot be safely interpreted."""


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


def _slug(value: Any) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", _text(value).casefold()).strip("-")
    return candidate or "course"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _record_digest(record: Mapping[str, Any]) -> str:
    for key in (
        "sourceSha256",
        "sourceSHA",
        "sha256",
        "byteSha256",
        "byteSHA",
        "sha256Digest",
        "sourceHash",
        "digest",
        "mediaDigest",
        "sourceDigest",
    ):
        value = _text(record.get(key)).casefold()
        if value:
            return value
    return ""


def _record_path(record: Mapping[str, Any], kind: str) -> str:
    keys = (
        ("sourcePath", "localPath", "localFile", "filePath", "absolutePath", "file", "path", "audioPath")
        if kind == "audio"
        else ("sourcePath", "localPath", "localFile", "assetPath", "imagePath", "filePath", "absolutePath", "file", "mediaPath", "path")
    )
    for key in keys:
        value = _text(record.get(key))
        if value:
            return value
    return ""


def _record_unit(record: Mapping[str, Any]) -> int | None:
    for key in ("unit", "unitNumber", "lessonOrder", "unitOrder"):
        value = record.get(key)
        try:
            if value is not None:
                return int(value)
        except (TypeError, ValueError):
            continue
    for key in ("title", "name", "sourcePath", "path"):
        match = re.search(r"\bunit\s*[-#]?\s*(\d{1,3})\b", _text(record.get(key)).casefold())
        if match:
            return int(match.group(1))
    return None


def _record_slide(record: Mapping[str, Any]) -> int | None:
    for key in ("slideNumber", "sourceSlideNumber", "sourceSlide", "nativeSlide", "slide", "slideNo"):
        value = record.get(key)
        try:
            if value is not None:
                return int(value)
        except (TypeError, ValueError):
            continue
    return None


def _record_id(record: Mapping[str, Any]) -> str:
    for key in ("id", "audioId", "assetId", "sourceId", "mediaId"):
        value = _text(record.get(key))
        if value:
            return value
    return _record_path(record, "audio") or _record_path(record, "image") or _record_digest(record)


def _record_reviewed(record: Mapping[str, Any]) -> bool:
    return record.get("reviewed") is True or _text(record.get("reviewStatus")).casefold() in {
        "reviewed",
        "approved",
    }


def _record_selected(record: Mapping[str, Any]) -> bool:
    if "selected" in record:
        return record.get("selected") is True
    if "include" in record:
        return record.get("include") is True
    if "stage" in record:
        return record.get("stage") is True
    return False


def _native_trace(record: Mapping[str, Any]) -> Any:
    for key in ("nativeTrace", "nativeSource", "sourceTrace", "trace", "nativeEvidence"):
        value = record.get(key)
        if value not in (None, "", [], {}):
            return copy.deepcopy(value)
    values: dict[str, Any] = {}
    for key in (
        "sourceUrl",
        "nativeSourceUrl",
        "sourceSlideNumber",
        "sourceSlide",
        "nativeSlide",
        "slideNumber",
        "slide",
        "lessonId",
        "sourceId",
    ):
        if record.get(key) not in (None, ""):
            values[key] = copy.deepcopy(record.get(key))
    return values or None


def _looks_audio(record: Mapping[str, Any]) -> bool:
    kind = _text(record.get("kind") or record.get("type") or record.get("mediaType")).casefold()
    mime = _text(record.get("mimeType") or record.get("mime")).casefold()
    suffix = Path(_record_path(record, "audio")).suffix.casefold()
    return "audio" in kind or mime.startswith("audio/") or suffix in AUDIO_EXTENSIONS


def _looks_image(record: Mapping[str, Any]) -> bool:
    kind = _text(record.get("kind") or record.get("type") or record.get("assetType")).casefold()
    mime = _text(record.get("mimeType") or record.get("mime")).casefold()
    suffix = Path(_record_path(record, "image")).suffix.casefold()
    return "image" in kind or "figure" in kind or mime.startswith("image/") or suffix in RASTER_EXTENSIONS or suffix in UNSUPPORTED_VECTOR_EXTENSIONS


def _iter_manifest_records(value: Any, inherited: Mapping[str, Any] | None = None) -> Iterable[dict[str, Any]]:
    inherited_values = dict(inherited or {})
    if isinstance(value, list):
        for item in value:
            yield from _iter_manifest_records(item, inherited_values)
        return
    if not isinstance(value, Mapping):
        return
    if _looks_audio(value) or _looks_image(value):
        merged = dict(inherited_values)
        merged.update(value)
        yield merged
        return
    for key, child in value.items():
        next_inherited = dict(inherited_values)
        if re.fullmatch(r"\d{1,3}", _text(key)):
            next_inherited.setdefault("unit", int(_text(key)))
        elif _text(key).casefold() in {"audio", "audios", "images", "figures", "assets", "files", "entries"}:
            next_inherited.setdefault("collection", _text(key))
        yield from _iter_manifest_records(child, next_inherited)


def _load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise MediaPlanError(f"cannot read manifest {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise MediaPlanError(f"invalid JSON in {path}: {exc}") from exc


def _transcript_index(value: Any) -> dict[str, str]:
    result: dict[str, str] = {}

    def visit(item: Any, inherited_key: str = "") -> None:
        if isinstance(item, list):
            for child in item:
                visit(child, inherited_key)
            return
        if not isinstance(item, Mapping):
            if inherited_key and _text(item):
                result[inherited_key] = _text(item)
            return
        transcript = _text(item.get("transcript") or item.get("transcription") or item.get("text"))
        keys = [
            inherited_key,
            *(_text(item.get(key)) for key in ("id", "audioId", "sourceId", "mediaId", "url", "originalMediaUrl", "path", "sourcePath")),
        ]
        if transcript:
            for key in keys:
                if key:
                    result[key] = transcript
        for key, child in item.items():
            if key not in {"transcript", "transcription", "text"}:
                visit(child, _text(key))

    visit(value)
    return result


def _merge_transcript(record: Mapping[str, Any], index: Mapping[str, str]) -> dict[str, Any]:
    merged = dict(record)
    if _text(merged.get("transcript") or merged.get("transcription")):
        return merged
    keys = [
        _record_id(merged),
        _text(merged.get("url")),
        _text(merged.get("originalMediaUrl") or merged.get("originalMediaURL")),
        _record_path(merged, "audio"),
        _record_digest(merged),
    ]
    for key in keys:
        if key and key in index:
            merged["transcript"] = index[key]
            break
    return merged


def _resolve_source_path(raw: str, root: Path) -> tuple[Path | None, str | None]:
    if not raw:
        return None, "source-path-missing"
    try:
        resolved_root = root.expanduser().resolve(strict=True)
    except OSError:
        return None, "source-root-missing"
    raw_path = Path(raw).expanduser()
    candidates = [raw_path] if raw_path.is_absolute() else [resolved_root / raw_path]
    if not raw_path.is_absolute() and raw_path.exists():
        candidates.append(raw_path)
    for candidate in candidates:
        try:
            resolved = candidate.resolve(strict=True)
        except OSError:
            continue
        try:
            resolved.relative_to(resolved_root)
        except ValueError:
            return None, "source-path-escape"
        if resolved.is_file():
            return resolved, None
    # Existing but outside-root paths must be reported as an escape rather than
    # being collapsed into a generic missing-file error.
    if raw_path.is_absolute() or (raw_path.exists() and not raw_path.is_relative_to(resolved_root)):
        return None, "source-path-escape"
    return None, "source-file-missing"


def _blocked_reason(record: Mapping[str, Any]) -> str | None:
    haystack = " ".join(
        _text(record.get(key))
        for key in ("role", "title", "name", "category", "sourceType", "collection", "assetType")
    )
    if BLOCKED_ROLE_PATTERN.search(haystack):
        return "excluded-role"
    if not _record_unit(record):
        return "unit-missing"
    if _native_trace(record) is None:
        return "native-trace-missing"
    if not _record_digest(record):
        return "source-sha256-missing"
    return None


def _stable_public_path(
    kind: str,
    course_slug: str,
    unit: int,
    index: int,
    suffix: str,
    slide: int | None = None,
    source_sha256: str | None = None,
) -> str:
    if kind == "audio":
        return f"public/audio/lessons/{course_slug}/unit-{unit:02d}-audio-{index:02d}{suffix}"
    if kind == "image":
        if not source_sha256:
            raise MediaPlanError("instructional image is missing source SHA-256")
        return f"public/images/lessons/{course_slug}/source-{source_sha256[:16].casefold()}.webp"
    raise MediaPlanError(f"unsupported media kind: {kind}")


def _audio_suffix(item: Mapping[str, Any], source_path: Path) -> str:
    requested = _text(item.get("publicExtension") or item.get("outputExtension")).casefold()
    if requested and not requested.startswith("."):
        requested = "." + requested
    if requested in AUDIO_EXTENSIONS:
        return requested
    suffix = source_path.suffix.casefold()
    return suffix if suffix in AUDIO_EXTENSIONS else ".mp3"


def _public_url(public_path: str) -> str:
    """Map a repo-relative public/ file path to the browser URL root."""

    normalized = public_path.replace("\\", "/")
    if normalized.startswith("public/"):
        normalized = normalized[len("public/") :]
    return "/" + normalized.lstrip("/")


def _validate_record(record: Mapping[str, Any], kind: str, root: Path) -> tuple[dict[str, Any], Path | None]:
    normalized = copy.deepcopy(dict(record))
    reason = _blocked_reason(normalized)
    if reason:
        if reason == "excluded-role":
            return {"status": "skipped", "reason": reason, "sourceId": _record_id(normalized)}, None
        return {"status": "blocked", "reason": reason, "sourceId": _record_id(normalized)}, None
    if not _record_selected(normalized):
        return {"status": "not-selected", "sourceId": _record_id(normalized)}, None
    if not _record_reviewed(normalized):
        return {"status": "not-reviewed", "sourceId": _record_id(normalized)}, None
    source_path, path_error = _resolve_source_path(_record_path(normalized, kind), root)
    if path_error:
        return {"status": "blocked", "reason": path_error, "sourceId": _record_id(normalized)}, None
    assert source_path is not None
    digest = _record_digest(normalized)
    if not SHA256_PATTERN.fullmatch(digest):
        return {"status": "blocked", "reason": "source-sha256-invalid", "sourceId": _record_id(normalized)}, None
    actual_digest = _sha256(source_path)
    if actual_digest.casefold() != digest.casefold():
        return {
            "status": "blocked",
            "reason": "source-sha256-mismatch",
            "sourceId": _record_id(normalized),
            "expectedSha256": digest,
            "actualSha256": actual_digest,
        }, None
    if kind == "image":
        suffix = source_path.suffix.casefold()
        if suffix in UNSUPPORTED_VECTOR_EXTENSIONS:
            return {"status": "blocked", "reason": "image-source-unsupported-vector", "sourceId": _record_id(normalized)}, None
        if suffix not in RASTER_EXTENSIONS:
            return {"status": "blocked", "reason": "image-source-not-raster", "sourceId": _record_id(normalized)}, None
    if kind == "audio" and not _text(normalized.get("transcript") or normalized.get("transcription")):
        return {"status": "blocked", "reason": "transcript-missing", "sourceId": _record_id(normalized)}, None
    audio_number = normalized.get("audioNumber")
    try:
        audio_number = int(audio_number) if audio_number is not None else None
    except (TypeError, ValueError):
        audio_number = None
    return {
        "status": "eligible",
        "sourceId": _record_id(normalized),
        "sourcePath": str(source_path),
        "sourceSha256": digest,
        "unit": _record_unit(normalized),
        "slideNumber": _record_slide(normalized),
        "nativeTrace": _native_trace(normalized),
        "transcript": _text(normalized.get("transcript") or normalized.get("transcription")) or None,
        "title": _text(normalized.get("title") or normalized.get("name")),
        "role": _text(normalized.get("role") or normalized.get("assetType")),
        "originalMediaUrl": _text(normalized.get("originalMediaUrl") or normalized.get("originalMediaURL") or normalized.get("url")) or None,
        "audioNumber": audio_number,
    }, source_path


def _native_image_records(audit: Any) -> list[dict[str, Any]]:
    records = audit.get("records") if isinstance(audit, Mapping) else audit
    result: list[dict[str, Any]] = []
    for record in _as_list(records):
        if not isinstance(record, Mapping):
            continue
        native = record.get("native") if isinstance(record.get("native"), Mapping) else record
        candidate = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
        record_id = _text(candidate.get("id") or record.get("id"))
        media_by_ref: dict[str, Mapping[str, Any]] = {}
        for media in _as_list(native.get("media")):
            if not isinstance(media, Mapping):
                continue
            ref = _text(media.get("path") or media.get("mediaPath") or media.get("ref"))
            if ref:
                media_by_ref[ref] = media
        inherited = {key: copy.deepcopy(record.get(key)) for key in ("unit", "reviewed", "selected", "include") if key in record}
        for slide in _as_list(native.get("slides")):
            if not isinstance(slide, Mapping):
                continue
            for key in ("figures", "instructionalImages", "illustrations", "imageRefs", "images"):
                for figure in _as_list(slide.get(key)):
                    if not isinstance(figure, Mapping):
                        continue
                    if key in {"imageRefs", "images"}:
                        classifications = {
                            re.sub(r"[^a-z0-9]+", "-", _text(figure.get(field)).casefold()).strip("-")
                            for field in ("role", "classification", "assetType", "kind", "sourceType")
                            if _text(figure.get(field))
                        }
                        confirmed = {
                            "figure",
                            "figures",
                            "illustration",
                            "illustrations",
                            "instructional",
                            "instructional-image",
                            "instructional-illustration",
                            "instructional-asset",
                        }
                        if not classifications.intersection(confirmed):
                            continue
                    item = dict(inherited)
                    item.update(figure)
                    media_ref = _text(item.get("mediaPath") or item.get("path"))
                    matching_media = media_by_ref.get(media_ref)
                    if matching_media:
                        for source_key in ("localPath", "assetPath", "filePath", "sourcePath"):
                            if source_key not in item and matching_media.get(source_key):
                                item[source_key] = matching_media[source_key]
                                break
                        if not any(item.get(key) for key in ("sourceSha256", "sha256", "digest")):
                            for digest_key in ("sourceSha256", "sha256", "digest"):
                                if matching_media.get(digest_key):
                                    item["sourceSha256"] = matching_media[digest_key]
                                    break
                    item.setdefault("unit", record.get("unit"))
                    item.setdefault("slideNumber", slide.get("number"))
                    item.setdefault("role", "instructional-image")
                    item.setdefault(
                        "nativeTrace",
                        {"recordId": record_id, "slideNumber": slide.get("number"), "mediaRef": figure.get("mediaPath") or figure.get("path")},
                    )
                    result.append(item)
    return result


def _prepare_image_output(result: dict[str, Any], source_path: Path) -> tuple[bytes | None, str | None]:
    """Encode a reviewed raster as WebP without mutating the source asset."""

    if Image is None:
        result["optimization"] = {
            "status": "unavailable",
            "needed": True,
            "target": ".webp",
            "implemented": False,
            "reason": "pillow-unavailable",
            "originalSha256": result["sourceSha256"],
        }
        return None, "pillow-unavailable"
    try:
        with Image.open(source_path) as image:
            image.load()
            original_dimensions = [int(image.width), int(image.height)]
            has_alpha = "A" in image.getbands() or "transparency" in image.info
            prepared = image.copy()
            if max(original_dimensions) > IMAGE_MAX_DIMENSION:
                resampling = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
                prepared.thumbnail((IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION), resampling)
            output_mode = "RGBA" if has_alpha else "RGB"
            if prepared.mode != output_mode:
                prepared = prepared.convert(output_mode)
            output_dimensions = [int(prepared.width), int(prepared.height)]
            output = io.BytesIO()
            prepared.save(output, format="WEBP", quality=IMAGE_WEBP_QUALITY, method=6)
            payload = output.getvalue()
            prepared.close()
    except (OSError, ValueError, RuntimeError):
        result["optimization"] = {
            "status": "blocked",
            "needed": True,
            "target": ".webp",
            "implemented": False,
            "reason": "image-decode-failed",
            "originalSha256": result["sourceSha256"],
        }
        return None, "image-decode-failed"

    output_digest = hashlib.sha256(payload).hexdigest()
    source_suffix = source_path.suffix.casefold()
    result["outputSha256"] = output_digest
    result["optimization"] = {
        "status": "ready",
        "needed": source_suffix != ".webp" or original_dimensions != output_dimensions or has_alpha,
        "target": ".webp",
        "implemented": True,
        "quality": IMAGE_WEBP_QUALITY,
        "maxDimension": IMAGE_MAX_DIMENSION,
        "originalDimensions": original_dimensions,
        "outputDimensions": output_dimensions,
        "preservedAlpha": has_alpha,
        "originalSha256": result["sourceSha256"],
        "outputSha256": output_digest,
    }
    return payload, None


def _stage_one(
    item: dict[str, Any],
    source_path: Path,
    public_root: Path | None,
    stage: bool,
    payload: bytes | None = None,
) -> None:
    if public_root is None:
        item["status"] = "planned"
        return
    try:
        resolved_public_root = public_root.expanduser().resolve(strict=False)
        destination = (resolved_public_root / item["publicPath"]).resolve(strict=False)
        destination.relative_to(resolved_public_root)
    except (OSError, ValueError):
        item.update({"status": "blocked", "reason": "destination-path-escape"})
        return
    item["destinationPath"] = str(destination)
    expected_digest = _text(item.get("outputSha256") or item["sourceSha256"])
    if destination.exists():
        try:
            destination_digest = _sha256(destination)
        except OSError:
            item.update({"status": "blocked", "reason": "destination-unreadable"})
            return
        if destination_digest.casefold() != expected_digest.casefold():
            item.update({"status": "blocked", "reason": "destination-bytes-mismatch", "actualSha256": destination_digest})
            return
        item["status"] = "already-staged"
        return
    if not stage:
        item["status"] = "planned"
        return
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if payload is None:
            shutil.copyfile(source_path, destination)
        else:
            destination.write_bytes(payload)
        copied_digest = _sha256(destination)
    except OSError as exc:
        item.update({"status": "blocked", "reason": "stage-copy-failed", "detail": str(exc)})
        return
    if copied_digest.casefold() != expected_digest.casefold():
        item.update({"status": "blocked", "reason": "staged-bytes-mismatch", "actualSha256": copied_digest})
        return
    item["status"] = "staged"


def prepare_media_plan(
    manifest: Mapping[str, Any],
    *,
    audio_root: Path,
    image_root: Path,
    course_slug: str = "course",
    transcript_manifest: Any = None,
    native_audit: Any = None,
    public_root: Path | None = None,
    stage: bool = False,
) -> dict[str, Any]:
    """Build and optionally stage a deterministic media plan."""

    slug = _slug(course_slug)
    transcript_index = _transcript_index(transcript_manifest) if transcript_manifest is not None else {}
    raw_audio = [record for record in _iter_manifest_records(manifest) if _looks_audio(record)]
    raw_images = [record for record in _iter_manifest_records(manifest) if _looks_image(record)]
    if isinstance(native_audit, (Mapping, list)):
        raw_images.extend(_native_image_records(native_audit))
    normalized_audio: list[tuple[dict[str, Any], Path]] = []
    normalized_images: list[tuple[dict[str, Any], Path]] = []
    audio_results: list[dict[str, Any]] = []
    image_results: list[dict[str, Any]] = []
    for record in raw_audio:
        merged = _merge_transcript(record, transcript_index)
        result, source_path = _validate_record(merged, "audio", audio_root)
        if source_path is not None:
            normalized_audio.append((result, source_path))
        else:
            audio_results.append(result)
    for record in raw_images:
        result, source_path = _validate_record(record, "image", image_root)
        if source_path is not None:
            normalized_images.append((result, source_path))
        else:
            image_results.append(result)

    normalized_audio.sort(key=lambda pair: (pair[0]["unit"], pair[0].get("audioNumber") or 10**6, pair[0]["sourcePath"], pair[0]["sourceId"]))
    normalized_images.sort(key=lambda pair: (pair[0]["unit"], pair[0].get("slideNumber") or 10**6, pair[0]["sourcePath"], pair[0]["sourceId"]))

    seen_audio: dict[str, dict[str, Any]] = {}
    audio_counters: dict[int, int] = {}
    for result, source_path in normalized_audio:
        duplicate_key = result["sourceSha256"].casefold()
        if duplicate_key in seen_audio:
            duplicate = copy.deepcopy(result)
            duplicate.update(
                {
                    "status": "duplicate",
                    "duplicateOf": seen_audio[duplicate_key]["sourceId"],
                    "publicPath": seen_audio[duplicate_key]["publicPath"],
                    "publicUrl": seen_audio[duplicate_key]["publicUrl"],
                    "publicHref": seen_audio[duplicate_key].get("publicHref"),
                }
            )
            audio_results.append(duplicate)
            continue
        seen_audio[duplicate_key] = result
        unit = int(result["unit"])
        audio_counters[unit] = audio_counters.get(unit, 0) + 1
        index = int(result.get("audioNumber") or audio_counters[unit])
        result["publicPath"] = _stable_public_path("audio", slug, unit, index, _audio_suffix(result, source_path))
        result["publicUrl"] = _public_url(result["publicPath"])
        result["publicHref"] = result["publicUrl"]
        _stage_one(result, source_path, public_root, stage)
        audio_results.append(result)

    seen_images: dict[str, dict[str, Any]] = {}
    for result, source_path in normalized_images:
        duplicate_key = result["sourceSha256"].casefold()
        if duplicate_key in seen_images:
            duplicate = copy.deepcopy(result)
            duplicate.update(
                {
                    "status": "duplicate",
                    "duplicateOf": seen_images[duplicate_key]["sourceId"],
                    "publicPath": seen_images[duplicate_key]["publicPath"],
                    "publicUrl": seen_images[duplicate_key]["publicUrl"],
                    "publicHref": seen_images[duplicate_key].get("publicHref"),
                    "outputSha256": seen_images[duplicate_key].get("outputSha256"),
                    "optimization": copy.deepcopy(seen_images[duplicate_key].get("optimization")),
                }
            )
            image_results.append(duplicate)
            continue
        payload, image_error = _prepare_image_output(result, source_path)
        if image_error:
            result.update({"status": "blocked", "reason": image_error})
            image_results.append(result)
            continue
        seen_images[duplicate_key] = result
        unit = int(result["unit"])
        result["publicPath"] = _stable_public_path(
            "image",
            slug,
            unit,
            1,
            ".webp",
            result.get("slideNumber"),
            result["sourceSha256"],
        )
        result["publicUrl"] = _public_url(result["publicPath"])
        result["publicHref"] = result["publicUrl"]
        _stage_one(result, source_path, public_root, stage, payload=payload)
        image_results.append(result)

    blockers = [
        {"kind": kind, "sourceId": item.get("sourceId"), "reason": item.get("reason")}
        for kind, items in (("audio", audio_results), ("image", image_results))
        for item in items
        if item.get("status") == "blocked"
    ]
    return {
        "schemaVersion": PLAN_SCHEMA_VERSION,
        "mode": "stage" if stage else "dry-run",
        "dryRun": not stage,
        "courseSlug": slug,
        "preserveExistingAudioUrls": True,
        "existingAudioUrls": copy.deepcopy(
            manifest.get("existingAudioUrls")
            or manifest.get("existingAudioURLs")
            or manifest.get("audioUrls")
            or []
        ),
        "audio": sorted(audio_results, key=lambda item: (_text(item.get("publicPath")), _text(item.get("sourceId")))),
        "images": sorted(image_results, key=lambda item: (_text(item.get("publicPath")), _text(item.get("sourceId")))),
        "blockers": blockers,
        "counts": {
            "audio": len(audio_results),
            "images": len(image_results),
            "staged": sum(item.get("status") == "staged" for item in [*audio_results, *image_results]),
            "planned": sum(item.get("status") == "planned" for item in [*audio_results, *image_results]),
            "blocked": len(blockers),
        },
    }


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, help="reviewed media manifest containing audio/images")
    parser.add_argument("--audio-manifest", type=Path, help="reviewed original-audio manifest")
    parser.add_argument("--image-manifest", type=Path, help="reviewed instructional-image manifest")
    parser.add_argument("--output", type=Path, required=True, help="JSON staging plan output")
    parser.add_argument("--audio-root", type=Path, required=True, help="root containing original audio files")
    parser.add_argument("--image-root", type=Path, help="root containing original raster images (defaults to --audio-root)")
    parser.add_argument("--transcript-manifest", type=Path, help="course-runtime transcript manifest")
    parser.add_argument("--native-audit", type=Path, help="native audit containing reviewed instructional figures")
    parser.add_argument("--public-root", type=Path, help="root for public/ files; required with --stage")
    parser.add_argument("--course-slug", default="course")
    parser.add_argument("--stage", action="store_true", help="copy audio and stage WebP images; default is dry-run")
    parser.add_argument("--require-ready", action="store_true", help="exit nonzero if any selected item is blocked")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        if args.stage and args.public_root is None:
            raise MediaPlanError("--public-root is required with --stage")
        manifest: dict[str, Any] = {}
        if args.manifest:
            loaded_manifest = _load_json(args.manifest)
            if not isinstance(loaded_manifest, Mapping):
                raise MediaPlanError("--manifest must contain an object")
            manifest.update(copy.deepcopy(dict(loaded_manifest)))
        if args.audio_manifest:
            manifest["_audioManifest"] = _load_json(args.audio_manifest)
        if args.image_manifest:
            manifest["_imageManifest"] = _load_json(args.image_manifest)
        if not manifest and not args.native_audit:
            raise MediaPlanError("one of --manifest, --audio-manifest, --image-manifest, or --native-audit is required")
        transcripts = _load_json(args.transcript_manifest) if args.transcript_manifest else None
        native_audit = _load_json(args.native_audit) if args.native_audit else None
        plan = prepare_media_plan(
            manifest,
            audio_root=args.audio_root,
            image_root=args.image_root or args.audio_root,
            course_slug=args.course_slug,
            transcript_manifest=transcripts,
            native_audit=native_audit,
            public_root=args.public_root,
            stage=args.stage,
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.require_ready and plan["blockers"]:
            return 2
        return 0
    except MediaPlanError as exc:
        print(f"prepare-course-media: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
