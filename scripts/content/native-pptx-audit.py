#!/usr/bin/env python3
"""Audit native PPTX candidates against the ordered public slide records.

The reader uses only the ZIP/XML package already downloaded from the
authoritative Drive listing. It preserves slide text order, media inventory,
and SHA-256 hashes without rendering or rewriting the source decks.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping
from xml.etree import ElementTree as ET


NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")
MEDIA_PREFIX = "ppt/media/"
AUDIO_EXTENSIONS = {".aac", ".m4a", ".mp3", ".ogg", ".wav", ".wma", ".webm"}


def _normalise(value: str) -> str:
    return " ".join(value.casefold().split())


def _sha256(zf: zipfile.ZipFile, member: str) -> str:
    digest = hashlib.sha256()
    with zf.open(member) as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _media_target(slide_number: int, member: str, zf: zipfile.ZipFile) -> str | None:
    rels = f"ppt/slides/_rels/slide{slide_number}.xml.rels"
    if rels not in zf.namelist():
        return None
    try:
        root = ET.fromstring(zf.read(rels))
    except ET.ParseError:
        return None
    target_by_id = {
        item.attrib.get("Id"): item.attrib.get("Target", "")
        for item in root
        if item.attrib.get("Type", "").endswith("/image")
        or item.attrib.get("Type", "").endswith("/audio")
        or item.attrib.get("Type", "").endswith("/video")
    }
    # The slide XML refers to relationship IDs; this helper is intentionally
    # conservative and returns a package-relative path only when the target is
    # one of the media members.
    try:
        slide_root = ET.fromstring(zf.read(member))
    except ET.ParseError:
        return None
    for element in slide_root.iter():
        rel_id = element.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = target_by_id.get(rel_id)
        if not target:
            continue
        path = target.lstrip("/")
        if not path.startswith("ppt/"):
            path = f"ppt/slides/{path}"
        path = path.replace("ppt/slides/../", "ppt/")
        if path in zf.namelist() and path.startswith(MEDIA_PREFIX):
            return path
    return None


def _slide_record(zf: zipfile.ZipFile, member: str, number: int) -> dict[str, Any]:
    try:
        root = ET.fromstring(zf.read(member))
    except ET.ParseError as exc:
        return {"number": number, "texts": [], "error": str(exc), "mediaRefs": []}
    texts = [" ".join(node.text.split()) for node in root.iter(f"{{{NS_A}}}t") if node.text and node.text.strip()]
    rels = f"ppt/slides/_rels/slide{number}.xml.rels"
    media_refs: list[str] = []
    if rels in zf.namelist():
        try:
            rel_root = ET.fromstring(zf.read(rels))
            for item in rel_root:
                target = item.attrib.get("Target", "")
                if "/media/" in target or target.startswith("../media/"):
                    media_refs.append(target)
        except ET.ParseError:
            pass
    return {"number": number, "texts": texts, "mediaRefs": sorted(set(media_refs))}


def read_pptx(path: Path) -> dict[str, Any]:
    """Read ordered text and media metadata from one PPTX without rewriting it."""

    with zipfile.ZipFile(path) as zf:
        slide_members = sorted(
            ((int(match.group(1)), member) for member in zf.namelist() if (match := SLIDE_RE.match(member))),
            key=lambda item: item[0],
        )
        slides = [_slide_record(zf, member, number) for number, member in slide_members]
        media: list[dict[str, Any]] = []
        for member in sorted(name for name in zf.namelist() if name.startswith(MEDIA_PREFIX)):
            suffix = Path(member).suffix.lower()
            info = zf.getinfo(member)
            media.append(
                {
                    "path": member,
                    "extension": suffix,
                    "bytes": info.file_size,
                    "sha256": _sha256(zf, member),
                }
            )
        by_ext = Counter(item["extension"] or "<none>" for item in media)
        audio = [item for item in media if item["extension"] in AUDIO_EXTENSIONS]
        return {
            "path": str(path),
            "fileBytes": path.stat().st_size,
            "slides": slides,
            "slideCount": len(slides),
            "media": media,
            "mediaSummary": {
                "count": len(media),
                "bytes": sum(item["bytes"] for item in media),
                "byExtension": dict(sorted(by_ext.items())),
                "audioCount": len(audio),
                "audioBytes": sum(item["bytes"] for item in audio),
                "audioPaths": [item["path"] for item in audio],
            },
        }


def extract_audio_members(path: Path, output_dir: Path) -> list[str]:
    """Extract embedded audio bytes with stable names and return their paths."""

    output_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    with zipfile.ZipFile(path) as zf:
        for member in sorted(name for name in zf.namelist() if name.startswith(MEDIA_PREFIX)):
            suffix = Path(member).suffix.lower()
            if suffix not in AUDIO_EXTENSIONS:
                continue
            digest = _sha256(zf, member)[:12]
            output = output_dir / f"{path.stem}--{Path(member).stem}-{digest}{suffix}"
            if not output.exists():
                output.write_bytes(zf.read(member))
            extracted.append(str(output))
    return extracted


def _public_slide_texts(record: Mapping[str, Any]) -> list[str]:
    deck = record.get("deck", {})
    return [
        " ".join(_normalise(text) for text in slide.get("visibleTexts", []) if text).strip()
        for slide in deck.get("slides", [])
    ]


def compare_text(native: Mapping[str, Any], public_record: Mapping[str, Any] | None) -> dict[str, Any]:
    if not public_record:
        return {"status": "no-public-record"}
    native_slides = [" ".join(_normalise(text) for text in slide.get("texts", [])).strip() for slide in native.get("slides", [])]
    public_slides = _public_slide_texts(public_record)
    native_all = " ".join(native_slides)
    public_all = " ".join(public_slides)
    sequence_ratio = difflib.SequenceMatcher(None, native_all, public_all).ratio() if native_all or public_all else 1.0
    native_tokens = set(native_all.split())
    public_tokens = set(public_all.split())
    coverage = len(native_tokens & public_tokens) / len(public_tokens) if public_tokens else 1.0
    exact_slide_count = native.get("slideCount") == public_record.get("deck", {}).get("slideCount")
    if exact_slide_count and coverage >= 0.9:
        status = "text-set-aligned"
    elif exact_slide_count and coverage >= 0.75:
        status = "text-set-partial"
    elif not exact_slide_count and coverage >= 0.9:
        status = "slide-count-diff-high-overlap"
    elif coverage >= 0.75:
        status = "slide-count-diff-partial-overlap"
    else:
        status = "low-overlap"
    return {
        "status": status,
        "publicSourceUrl": public_record.get("sourceUrl"),
        "publicSlideCount": public_record.get("deck", {}).get("slideCount"),
        "nativeSlideCount": native.get("slideCount"),
        "exactSlideCount": exact_slide_count,
        "sequenceRatio": round(sequence_ratio, 6),
        "publicTokenCoverage": round(coverage, 6),
    }


def _public_by_unit(public_manifest: Mapping[str, Any]) -> dict[int, Mapping[str, Any]]:
    starts = {1: 1, 2: 5, 3: 8, 4: 13, 5: 17, 6: 21, 7: 25, 8: 29, 9: 33, 10: 37, 11: 41, 12: 45, 13: 49, 14: 53}
    records: dict[int, Mapping[str, Any]] = {}
    for record in public_manifest.get("sources", []):
        module = int(record["module"]["order"])
        lesson = int(record["lesson"]["order"])
        records[starts[module] + lesson - 1] = record
    return records


def audit_manifest(
    drive_manifest: Mapping[str, Any],
    public_manifest: Mapping[str, Any],
    source_dir: Path,
    extra_paths: Iterable[Path] = (),
) -> dict[str, Any]:
    public_by_unit = _public_by_unit(public_manifest)
    records: list[dict[str, Any]] = []
    for unit, unit_record in sorted(drive_manifest.get("units", {}).items(), key=lambda item: int(item[0])):
        unit_number = int(unit)
        for candidate in unit_record.get("presentationCandidates", []):
            role = "primary" if candidate.get("role") == "primary-candidate" else "legacy"
            prefix = f"{candidate.get('level')}-unit-{unit_number:02d}-{role}-"
            matches = sorted(source_dir.glob(f"{prefix}*{candidate.get('id')}*.pptx"))
            if not matches:
                records.append({"unit": unit_number, "candidate": candidate, "status": "missing-local-file"})
                continue
            native = read_pptx(matches[0])
            records.append(
                {
                    "unit": unit_number,
                    "module": unit_record.get("module"),
                    "candidate": candidate,
                    "status": "ok",
                    "native": native,
                    "publishedComparison": compare_text(native, public_by_unit.get(unit_number)),
                }
            )

    extras: list[dict[str, Any]] = []
    for path in extra_paths:
        if path.exists():
            native = read_pptx(path)
            extras.append({"path": str(path), "status": "ok", "native": native})
    return {
        "schemaVersion": 1,
        "source": {
            "driveManifest": "docs/audit/drive-source-manifest.json",
            "publicManifest": "docs/audit/course-source-manifest.json",
            "sourceDirectory": str(source_dir),
        },
        "counts": {
            "candidateRecords": len(records),
            "ok": sum(item.get("status") == "ok" for item in records),
            "missingLocalFile": sum(item.get("status") == "missing-local-file" for item in records),
            "textSetAligned": sum(item.get("publishedComparison", {}).get("status") == "text-set-aligned" for item in records),
            "textSetPartial": sum(item.get("publishedComparison", {}).get("status") == "text-set-partial" for item in records),
            "slideCountDiff": sum("slide-count-diff" in item.get("publishedComparison", {}).get("status", "") for item in records),
            "lowOverlap": sum(item.get("publishedComparison", {}).get("status") == "low-overlap" for item in records),
            "nativeAudioCandidates": sum(item.get("native", {}).get("mediaSummary", {}).get("audioCount", 0) > 0 for item in records),
        },
        "records": records,
        "extraRecords": extras,
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--drive-manifest", type=Path, default=Path("docs/audit/drive-source-manifest.json"))
    parser.add_argument("--public-manifest", type=Path, default=Path("docs/audit/course-source-manifest.json"))
    parser.add_argument("--source-dir", type=Path, default=Path("docs/audit/source-originals"))
    parser.add_argument("--extra", type=Path, action="append", default=[])
    parser.add_argument("--extract-audio-dir", type=Path)
    parser.add_argument("--output", type=Path, default=Path("docs/audit/native-pptx-audit.json"))
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    drive = json.loads(args.drive_manifest.read_text(encoding="utf-8"))
    public = json.loads(args.public_manifest.read_text(encoding="utf-8"))
    result = audit_manifest(drive, public, args.source_dir, args.extra)
    if args.extract_audio_dir:
        result["audioExtraction"] = {
            str(path): extract_audio_members(path, args.extract_audio_dir)
            for path in args.extra
            if path.exists()
        }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
