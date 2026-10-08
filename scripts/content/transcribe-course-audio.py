"""Transcribe the reviewed teaching-audio source set without mutating source files.

The source manifest and materialized audio directory are supplied by the audit
workspace. This command only reads them and writes compact transcript JSON to
the requested output directory. Selection is deliberately conservative:
explicit ``Audio 1``, ``Audio 2`` and ``Audio 3`` names from Units 2--52 are
eligible; quiz/test/SSM/self-study/copy names are excluded. A generic Unit 3
file is reported as a review candidate and is never substituted automatically.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path
from statistics import fmean
from typing import Any, Iterable, Mapping, Sequence


MODEL_NAME = "faster-whisper-small-int8"
DEFAULT_OUTPUT_FILE = "course-audio-transcripts.json"
EXPLICIT_AUDIO_RE = re.compile(r"(?i)(?<![a-z0-9])audio\s*([123])(?!\d)")
BANNED_NAME_RE = re.compile(
    r"(?i)(?:^|[^a-z0-9])(?:quiz|test|ssm|self[\s_-]*study)(?:$|[^a-z0-9])"
)
COPY_NAME_RE = re.compile(
    r"(?i)(?:\(\d+\)|(?:^|[^a-z0-9])(?:copia|copy|duplicate)(?:$|[^a-z0-9]))"
)
UNIT3_GENERIC_CANDIDATE_RE = re.compile(r"(?i)unit\s*3.*everyday\s*i")


class TranscriptError(ValueError):
    """Raised when the reviewed source inventory cannot be used safely."""


def _as_int(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TranscriptError(f"{field} must be an integer")
    return value


def _source_name(row: Mapping[str, Any]) -> str:
    title = row.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()
    source_path = row.get("path")
    if isinstance(source_path, str) and source_path.strip():
        return Path(source_path.replace("\\", "/")).name
    raise TranscriptError("source row is missing title/path")


def _source_filename(row: Mapping[str, Any]) -> str:
    source_path = row.get("path")
    if not isinstance(source_path, str) or not source_path.strip():
        return _source_name(row)
    return Path(source_path.replace("\\", "/")).name


def _source_manifest_path(row: Mapping[str, Any]) -> str:
    value = row.get("path")
    return value.replace("\\", "/") if isinstance(value, str) else ""


def _row_unit(row: Mapping[str, Any]) -> int:
    return _as_int(row.get("unit"), "source row unit")


def _row_sha(row: Mapping[str, Any]) -> str:
    digest = row.get("sha256")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
        raise TranscriptError(f"{_source_name(row)} has no valid sha256")
    return digest.lower()


def _row_bytes(row: Mapping[str, Any]) -> int:
    value = row.get("bytes")
    return _as_int(value, f"{_source_name(row)} bytes")


def _audio_index(name: str) -> int | None:
    match = EXPLICIT_AUDIO_RE.search(name)
    return int(match.group(1)) if match else None


def _is_excluded_name(name: str) -> str | None:
    if BANNED_NAME_RE.search(name):
        return "excluded-name"
    if COPY_NAME_RE.search(name):
        return "copy-duplicate-name"
    return None


def _candidate_record(row: Mapping[str, Any], *, reason: str, audio_index: int) -> dict[str, Any]:
    return {
        "unit": _row_unit(row),
        "audioIndex": audio_index,
        "sourceFilename": _source_name(row),
        "sourcePath": _source_manifest_path(row),
        "materializedFilename": _source_filename(row),
        "sourceSha256": _row_sha(row),
        "sourceBytes": _row_bytes(row),
        "reason": reason,
        "substitute": False,
    }


def _excluded_record(row: Mapping[str, Any], *, reason: str, audio_index: int | None = None) -> dict[str, Any]:
    record: dict[str, Any] = {
        "unit": _row_unit(row),
        "sourceFilename": _source_name(row),
        "sourcePath": _source_manifest_path(row),
        "materializedFilename": _source_filename(row),
        "sourceSha256": _row_sha(row),
        "sourceBytes": _row_bytes(row),
        "reason": reason,
    }
    if audio_index is not None:
        record["audioIndex"] = audio_index
    return record


def select_teaching_audios(files: Sequence[Mapping[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Return selected rows plus explicit exclusions, candidates and duplicates.

    The returned selected rows retain the original manifest row under ``row``
    for the transcription phase. Public audit records are JSON-safe metadata.
    """

    eligible: list[tuple[Mapping[str, Any], int]] = []
    copy_rows_by_digest: dict[str, list[tuple[Mapping[str, Any], int]]] = {}
    excluded: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    for row in files:
        if not isinstance(row, Mapping):
            raise TranscriptError("manifest files must contain objects")
        unit = _row_unit(row)
        name = _source_name(row)
        index = _audio_index(name)

        if unit < 2 or unit > 52:
            if index is not None:
                excluded.append(_excluded_record(row, reason="outside-unit-range", audio_index=index))
            continue

        excluded_reason = _is_excluded_name(name)
        if excluded_reason:
            excluded.append(_excluded_record(row, reason=excluded_reason, audio_index=index))
            if excluded_reason == "copy-duplicate-name" and index is not None:
                copy_rows_by_digest.setdefault(_row_sha(row), []).append((row, index))
            continue

        if row.get("role") == "self-study":
            if index is not None:
                excluded.append(_excluded_record(row, reason="self-study-role", audio_index=index))
            elif unit == 3 and UNIT3_GENERIC_CANDIDATE_RE.search(name):
                candidates.append(
                    _candidate_record(
                        row,
                        reason="missing-explicit-audio-1; generic source retained for review",
                        audio_index=1,
                    )
                )
            else:
                excluded.append(_excluded_record(row, reason="self-study-role"))
            continue

        if index is None:
            continue
        eligible.append((row, index))

    # Prefer a non-copy source when the manifest contains the same original
    # bytes more than once. Name-based copies were already excluded above.
    by_digest: dict[str, list[tuple[Mapping[str, Any], int]]] = {}
    for row, index in eligible:
        by_digest.setdefault(_row_sha(row), []).append((row, index))

    selected: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    for digest, rows in by_digest.items():
        canonical_row, canonical_index = sorted(
            rows,
            key=lambda item: (
                bool(COPY_NAME_RE.search(_source_name(item[0]))),
                _row_unit(item[0]),
                item[1],
                _source_name(item[0]).casefold(),
            ),
        )[0]
        selected.append({"row": canonical_row, "audioIndex": canonical_index})
        duplicate_rows = [item for item in rows if item[0] is not canonical_row]
        duplicate_rows.extend(copy_rows_by_digest.get(digest, []))
        for duplicate_row, duplicate_index in duplicate_rows:
            duplicates.append(
                {
                    "sourceSha256": digest,
                    "canonicalSourceFilename": _source_name(canonical_row),
                    "canonicalUnit": _row_unit(canonical_row),
                    "canonicalAudioIndex": canonical_index,
                    "duplicateSourceFilename": _source_name(duplicate_row),
                    "duplicateUnit": _row_unit(duplicate_row),
                    "duplicateAudioIndex": duplicate_index,
                    "reason": "same-original-source-sha256",
                }
            )

    selected.sort(key=lambda item: (_row_unit(item["row"]), item["audioIndex"], _source_name(item["row"]).casefold()))
    duplicates.sort(key=lambda item: (item["duplicateUnit"], item["duplicateAudioIndex"], item["duplicateSourceFilename"].casefold()))
    excluded.sort(key=lambda item: (item["unit"], item.get("audioIndex", 0), item["sourceFilename"].casefold()))
    candidates.sort(key=lambda item: (item["unit"], item["audioIndex"], item["sourceFilename"].casefold()))
    return {
        "selected": selected,
        "excluded": excluded,
        "candidates": candidates,
        "duplicates": duplicates,
    }


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TranscriptError(f"could not read manifest {path}: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("files"), list):
        raise TranscriptError("audio manifest must contain a files array")
    return payload


def source_path(source_root: Path, row: Mapping[str, Any]) -> Path:
    raw = row.get("path")
    if not isinstance(raw, str) or not raw.strip():
        raise TranscriptError(f"{_source_name(row)} has no source path")
    normalized = raw.replace("\\", "/")
    candidate = Path(normalized)
    return candidate if candidate.is_absolute() else source_root / candidate


def verify_source_bytes(path: Path, row: Mapping[str, Any]) -> str:
    """Verify materialized bytes against the audit manifest before transcription."""

    if not path.is_file():
        raise TranscriptError(f"source audio is missing: {path}")
    expected_bytes = _row_bytes(row)
    actual_bytes = path.stat().st_size
    if actual_bytes != expected_bytes:
        raise TranscriptError(f"source byte count changed for {_source_name(row)}: {actual_bytes} != {expected_bytes}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    actual_sha = digest.hexdigest()
    expected_sha = _row_sha(row)
    if actual_sha != expected_sha:
        raise TranscriptError(f"source sha256 changed for {_source_name(row)}: {actual_sha} != {expected_sha}")
    return actual_sha


def _finite_float(value: Any) -> float | None:
    try:
        converted = float(value)
    except (TypeError, ValueError):
        return None
    return converted if math.isfinite(converted) else None


def make_transcript_record(
    row: Mapping[str, Any],
    audio_index: int,
    segments: Iterable[Any],
    info: Any,
    *,
    model_name: str = MODEL_NAME,
) -> dict[str, Any]:
    segment_rows: list[dict[str, Any]] = []
    for segment in segments:
        segment_text = str(getattr(segment, "text", "")).strip()
        average_logprob = _finite_float(getattr(segment, "avg_logprob", None))
        segment_rows.append(
            {
                "start": _finite_float(getattr(segment, "start", None)),
                "end": _finite_float(getattr(segment, "end", None)),
                "text": segment_text,
                "avgLogprob": average_logprob,
            }
        )
    logprobs = [row["avgLogprob"] for row in segment_rows if row["avgLogprob"] is not None]
    transcript_text = " ".join(row["text"] for row in segment_rows if row["text"]).strip()
    return {
        "unit": _row_unit(row),
        "audioIndex": audio_index,
        "sourceFilename": _source_name(row),
        "sourcePath": _source_manifest_path(row),
        "materializedFilename": _source_filename(row),
        "sourceSha256": _row_sha(row),
        "sourceBytes": _row_bytes(row),
        "model": model_name,
        "language": getattr(info, "language", None),
        "languageProbability": _finite_float(getattr(info, "language_probability", None)),
        "avgLogprob": fmean(logprobs) if logprobs else None,
        "text": transcript_text,
        "segments": segment_rows,
    }


def _output_path(output_dir: Path) -> Path:
    return output_dir / DEFAULT_OUTPUT_FILE


def _load_existing(output_file: Path) -> dict[str, dict[str, Any]]:
    if not output_file.exists():
        return {}
    try:
        payload = json.loads(output_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TranscriptError(f"could not read existing transcript output {output_file}: {exc}") from exc
    records = payload.get("transcripts") if isinstance(payload, dict) else None
    if not isinstance(records, list):
        raise TranscriptError(f"existing transcript output has no transcripts array: {output_file}")
    result: dict[str, dict[str, Any]] = {}
    for record in records:
        if isinstance(record, dict) and isinstance(record.get("sourceSha256"), str):
            result[record["sourceSha256"]] = record
    return result


def _write_json_atomic(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def _build_output(
    manifest_path: Path,
    selection: Mapping[str, Any],
    transcripts: Iterable[Mapping[str, Any]],
    *,
    model: str = MODEL_NAME,
    cpu_threads: int = 4,
) -> dict[str, Any]:
    transcript_rows = sorted(
        (dict(row) for row in transcripts),
        key=lambda row: (row["unit"], row["audioIndex"], row["sourceFilename"].casefold()),
    )
    excluded = selection["excluded"]
    reason_counts: dict[str, int] = {}
    for row in excluded:
        reason = row["reason"]
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
    return {
        "schemaVersion": 1,
        "model": model,
        "modelConfig": {"device": "cpu", "computeType": "int8", "cpuThreads": cpu_threads},
        "sourceManifest": str(manifest_path),
        "selection": {
            "unitRange": [2, 52],
            "explicitAudioIndices": [1, 2, 3],
            "selectedCount": len(selection["selected"]),
            "transcribedCount": len(transcript_rows),
            "excludedCount": len(excluded),
            "excludedByReason": reason_counts,
        },
        "candidates": selection["candidates"],
        "duplicates": selection["duplicates"],
        "excluded": excluded,
        "transcripts": transcript_rows,
    }


def _print_json(event: str, **values: Any) -> None:
    print(json.dumps({"event": event, **values}, ensure_ascii=False), flush=True)


def transcribe(
    manifest_path: Path,
    source_root: Path,
    output_dir: Path,
    *,
    cpu_threads: int = 4,
    limit: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    manifest = load_manifest(manifest_path)
    selection = select_teaching_audios(manifest["files"])
    _print_json(
        "selection",
        selected=len(selection["selected"]),
        candidates=len(selection["candidates"]),
        duplicates=len(selection["duplicates"]),
        excluded=len(selection["excluded"]),
    )
    if dry_run:
        return _build_output(manifest_path, selection, [])

    output_file = _output_path(output_dir)
    transcripts_by_sha = _load_existing(output_file)
    pending = selection["selected"][: limit if limit is not None else None]
    if limit is not None and limit < 1:
        raise TranscriptError("limit must be positive")

    # Import lazily so selection, digest checks and unit tests do not require
    # model initialization. The command never downloads a model.
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:  # pragma: no cover - environment-specific
        raise TranscriptError("faster-whisper is required for transcription") from exc

    model = WhisperModel(
        "small",
        device="cpu",
        compute_type="int8",
        cpu_threads=cpu_threads,
        local_files_only=True,
    )

    for position, item in enumerate(pending, start=1):
        row = item["row"]
        digest = _row_sha(row)
        if digest in transcripts_by_sha:
            _print_json("resume", completed=position, total=len(pending), sourceFilename=_source_name(row))
            continue
        path = source_path(source_root, row)
        actual_sha = verify_source_bytes(path, row)
        segments, info = model.transcribe(
            str(path),
            beam_size=5,
            word_timestamps=False,
            vad_filter=True,
        )
        record = make_transcript_record(row, item["audioIndex"], segments, info)
        if record["sourceSha256"] != actual_sha:
            raise TranscriptError(f"transcript digest changed during processing for {_source_name(row)}")
        transcripts_by_sha[digest] = record
        _write_json_atomic(
            output_file,
            _build_output(manifest_path, selection, transcripts_by_sha.values(), cpu_threads=cpu_threads),
        )
        _print_json(
            "transcribed",
            completed=position,
            total=len(pending),
            unit=record["unit"],
            audioIndex=record["audioIndex"],
            sourceFilename=record["sourceFilename"],
            seconds=sum((row["end"] or 0) - (row["start"] or 0) for row in record["segments"]),
        )

    result = _build_output(manifest_path, selection, transcripts_by_sha.values(), cpu_threads=cpu_threads)
    _write_json_atomic(output_file, result)
    _print_json("complete", output=str(output_file), transcribed=result["selection"]["transcribedCount"])
    return result


def _default_source_root(manifest_path: Path) -> Path:
    # The audit manifest lives at <source-root>/docs/audit/...
    return manifest_path.resolve().parents[2]


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True, help="materialized audio manifest JSON")
    parser.add_argument("--source-root", type=Path, help="root used to resolve manifest relative paths")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("docs/audit/course-audio-transcripts"),
        help="directory for compact transcript JSON",
    )
    parser.add_argument("--cpu-threads", type=int, default=4, help="bounded CPU threads for faster-whisper")
    parser.add_argument("--limit", type=int, help="transcribe only the first N selected clips (for a smoke run)")
    parser.add_argument("--dry-run", action="store_true", help="report selection without loading the model")
    args = parser.parse_args(argv)
    if args.cpu_threads < 1 or args.cpu_threads > 4:
        parser.error("--cpu-threads must be between 1 and 4")
    try:
        transcribe(
            args.manifest,
            args.source_root or _default_source_root(args.manifest),
            args.output_dir,
            cpu_threads=args.cpu_threads,
            limit=args.limit,
            dry_run=args.dry_run,
        )
    except TranscriptError as exc:
        print(f"transcription error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
