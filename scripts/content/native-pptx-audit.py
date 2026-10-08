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
import mimetypes
import posixpath
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable, Mapping
from xml.etree import ElementTree as ET


NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")
MEDIA_PREFIX = "ppt/media/"
AUDIO_EXTENSIONS = {".aac", ".m4a", ".mp3", ".ogg", ".wav", ".wma", ".webm"}
IMAGE_EXTENSIONS = {".bmp", ".emf", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".tif", ".tiff", ".wmf"}


def _tag_name(value: str) -> str:
    return value.rsplit("}", 1)[-1]


def _int_attr(element: ET.Element | None, name: str) -> int | None:
    if element is None or element.attrib.get(name) is None:
        return None
    try:
        return int(element.attrib[name])
    except ValueError:
        return None


def _bbox(element: ET.Element) -> dict[str, int] | None:
    xfrm = next((child for child in element.iter() if _tag_name(child.tag) == "xfrm"), None)
    if xfrm is None:
        return None
    x = _int_attr(next((child for child in xfrm if _tag_name(child.tag) == "off"), None), "x")
    y = _int_attr(next((child for child in xfrm if _tag_name(child.tag) == "off"), None), "y")
    cx = _int_attr(next((child for child in xfrm if _tag_name(child.tag) == "ext"), None), "cx")
    cy = _int_attr(next((child for child in xfrm if _tag_name(child.tag) == "ext"), None), "cy")
    if None in {x, y, cx, cy}:
        return None
    return {"x": x, "y": y, "cx": cx, "cy": cy, "right": x + cx, "bottom": y + cy}


def _shape_identity(element: ET.Element) -> tuple[str | None, str | None]:
    c_nv_pr = next((child for child in element.iter(f"{{{NS_P}}}cNvPr")), None)
    if c_nv_pr is None:
        return None, None
    return c_nv_pr.attrib.get("id"), c_nv_pr.attrib.get("name")


def _paragraphs(tx_body: ET.Element | None) -> list[dict[str, Any]]:
    """Join a:p runs while preserving paragraph and explicit line breaks."""

    if tx_body is None:
        return []
    result: list[dict[str, Any]] = []
    for paragraph in tx_body.findall(f"{{{NS_A}}}p"):
        parts: list[str] = []
        runs: list[str] = []
        for child in paragraph:
            local = _tag_name(child.tag)
            if local in {"r", "fld", "endParaRPr"}:
                run_text = "".join(node.text or "" for node in child.iter(f"{{{NS_A}}}t"))
                if run_text:
                    parts.append(run_text)
                    if local != "endParaRPr":
                        runs.append(run_text)
            elif local == "br":
                parts.append("\n")
            elif local == "tab":
                parts.append("\t")
        text = "".join(parts)
        if not text:
            text = "".join(node.text or "" for node in paragraph.iter(f"{{{NS_A}}}t"))
        result.append({"text": text, "runs": runs})
    return result


def _joined_text(paragraphs: list[Mapping[str, Any]]) -> str:
    return "\n".join(str(paragraph.get("text") or "") for paragraph in paragraphs).strip()


def _relationship_map(zf: zipfile.ZipFile, slide_number: int) -> dict[str, str]:
    rels = f"ppt/slides/_rels/slide{slide_number}.xml.rels"
    if rels not in zf.namelist():
        return {}
    try:
        root = ET.fromstring(zf.read(rels))
    except ET.ParseError:
        return {}
    base = "ppt/slides"
    result: dict[str, str] = {}
    for item in root:
        rel_id = item.attrib.get("Id")
        target = item.attrib.get("Target")
        if not rel_id or not target or item.attrib.get("TargetMode") == "External":
            continue
        resolved = posixpath.normpath(posixpath.join(base, target))
        result[rel_id] = resolved
    return result


def _table_record(graphic_frame: ET.Element, shape_id: str | None, shape_name: str | None) -> dict[str, Any] | None:
    table = next((child for child in graphic_frame.iter(f"{{{NS_A}}}tbl")), None)
    if table is None:
        return None
    columns = [
        _int_attr(column, "w")
        for column in table.findall(f"{{{NS_A}}}tblGrid/{{{NS_A}}}gridCol")
    ]
    rows: list[dict[str, Any]] = []
    for row in table.findall(f"{{{NS_A}}}tr"):
        cells: list[dict[str, Any]] = []
        for cell in row.findall(f"{{{NS_A}}}tc"):
            paragraphs = _paragraphs(cell.find(f"{{{NS_A}}}txBody"))
            cells.append({"text": _joined_text(paragraphs), "paragraphs": paragraphs})
        rows.append({"height": _int_attr(row, "h"), "cells": cells})
    return {
        "shapeId": shape_id,
        "shapeName": shape_name,
        "bbox": _bbox(graphic_frame),
        "columnWidths": columns,
        "rows": rows,
    }


def _normalise(value: str) -> str:
    return " ".join(value.casefold().split())


def _sha256(zf: zipfile.ZipFile, member: str) -> str:
    digest = hashlib.sha256()
    with zf.open(member) as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _slide_record(zf: zipfile.ZipFile, member: str, number: int) -> dict[str, Any]:
    try:
        root = ET.fromstring(zf.read(member))
    except ET.ParseError as exc:
        return {"number": number, "texts": [], "error": str(exc), "mediaRefs": []}
    relationships = _relationship_map(zf, number)
    shapes: list[dict[str, Any]] = []
    tables: list[dict[str, Any]] = []
    image_refs: list[dict[str, Any]] = []
    media_refs: list[dict[str, Any]] = []

    def visit(container: ET.Element, parent_id: str | None = None) -> None:
        for element in list(container):
            local = _tag_name(element.tag)
            if local == "grpSp":
                group_id, group_name = _shape_identity(element)
                shapes.append(
                    {
                        "shapeId": group_id,
                        "shapeName": group_name,
                        "kind": "group",
                        "bbox": _bbox(element),
                        "parentShapeId": parent_id,
                    }
                )
                visit(element, group_id)
                continue
            if local not in {"sp", "pic", "graphicFrame", "cxnSp"}:
                continue
            shape_id, shape_name = _shape_identity(element)
            shape_kind = {
                "sp": "text",
                "pic": "picture",
                "graphicFrame": "graphic-frame",
                "cxnSp": "connector",
            }[local]
            paragraphs = _paragraphs(element.find(f"{{{NS_P}}}txBody"))
            shape: dict[str, Any] = {
                "shapeId": shape_id,
                "shapeName": shape_name,
                "kind": shape_kind,
                "bbox": _bbox(element),
                "parentShapeId": parent_id,
                "paragraphs": paragraphs,
                "texts": [p["text"] for p in paragraphs if p.get("text")],
                "joinedText": _joined_text(paragraphs),
            }
            table = _table_record(element, shape_id, shape_name) if local == "graphicFrame" else None
            if table:
                shape["kind"] = "table"
                shape["tableIndex"] = len(tables)
                table_paragraphs = [
                    {"text": cell["text"], "runs": []}
                    for row in table["rows"]
                    for cell in row["cells"]
                    if cell.get("text")
                ]
                shape["paragraphs"].extend(table_paragraphs)
                shape["texts"] = [p["text"] for p in shape["paragraphs"] if p.get("text")]
                shape["joinedText"] = _joined_text(shape["paragraphs"])
                tables.append(table)
            shapes.append(shape)

            if local == "pic":
                for blip in element.iter(f"{{{NS_A}}}blip"):
                    rel_id = blip.attrib.get(f"{{{NS_R}}}embed") or blip.attrib.get(f"{{{NS_R}}}link")
                    target = relationships.get(rel_id or "")
                    if not target:
                        continue
                    ref = {
                        "mediaPath": target,
                        "relationshipId": rel_id,
                        "shapeId": shape_id,
                        "shapeName": shape_name,
                        "bbox": _bbox(element),
                        "slide": number,
                    }
                    image_refs.append(ref)
                    media_refs.append({"mediaPath": target, "relationshipId": rel_id, "slide": number})
            else:
                for blip in element.iter(f"{{{NS_A}}}blip"):
                    rel_id = blip.attrib.get(f"{{{NS_R}}}embed") or blip.attrib.get(f"{{{NS_R}}}link")
                    target = relationships.get(rel_id or "")
                    if target and target.startswith(MEDIA_PREFIX):
                        media_refs.append({"mediaPath": target, "relationshipId": rel_id, "slide": number})

    sp_tree = root.find(f".//{{{NS_P}}}spTree")
    if sp_tree is not None:
        visit(sp_tree)
    texts = [
        paragraph["text"]
        for shape in shapes
        for paragraph in shape.get("paragraphs", [])
        if paragraph.get("text")
    ]
    return {
        "number": number,
        "texts": texts,
        "joinedText": "\n".join(shape["joinedText"] for shape in shapes if shape.get("joinedText")).strip(),
        "shapes": shapes,
        "tables": tables,
        "imageRefs": image_refs,
        "mediaRefs": media_refs,
    }


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
            mime_type = mimetypes.guess_type(member)[0] or "application/octet-stream"
            media.append(
                {
                    "path": member,
                    "extension": suffix,
                    "mimeType": mime_type,
                    "bytes": info.file_size,
                    "sha256": _sha256(zf, member),
                }
            )
        by_ext = Counter(item["extension"] or "<none>" for item in media)
        audio = [item for item in media if item["extension"] in AUDIO_EXTENSIONS]
        images = [item for item in media if item["extension"] in IMAGE_EXTENSIONS]
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
                "imageCount": len(images),
                "imageBytes": sum(item["bytes"] for item in images),
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


def extract_image_members(
    path: Path,
    native: dict[str, Any],
    output_dir: Path,
    level: str,
    unit: int,
    candidate_id: str,
) -> list[dict[str, Any]]:
    """Extract every package image and annotate all slide references.

    Classification is deliberately conservative: repeated or unreferenced
    images remain available for manual review and are never silently dropped.
    """

    deck_dir = output_dir / f"{level}-unit-{unit:02d}-{candidate_id}"
    deck_dir.mkdir(parents=True, exist_ok=True)
    references_by_path: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for slide in native.get("slides", []):
        for reference in slide.get("imageRefs", []):
            references_by_path[reference["mediaPath"]].append(reference)
    digest_counts: Counter[str] = Counter(
        item.get("sha256", "")
        for item in native.get("media", [])
        if item.get("extension") in IMAGE_EXTENSIONS
    )
    extracted: list[dict[str, Any]] = []
    with zipfile.ZipFile(path) as zf:
        for item in native.get("media", []):
            if item.get("extension") not in IMAGE_EXTENSIONS:
                continue
            media_path = str(item["path"])
            output = deck_dir / Path(media_path).name
            if not output.exists():
                output.write_bytes(zf.read(media_path))
            references = references_by_path.get(media_path, [])
            repeat_count = digest_counts[item.get("sha256", "")]
            reference_count = len(references)
            if not references:
                classification = "unreferenced-media"
                reason = "package image has no slide image relationship"
            elif reference_count >= 3 or repeat_count >= 3:
                classification = "repeated-media-candidate"
                reason = "repeated source image retained for manual template-versus-instruction review"
            else:
                classification = "instructional-candidate"
                reason = "referenced by one or two slide picture shapes"
            extracted.append(
                {
                    "mediaPath": media_path,
                    "localPath": str(output),
                    "mimeType": item.get("mimeType"),
                    "bytes": item.get("bytes"),
                    "sha256": item.get("sha256"),
                    "referenceCount": reference_count,
                    "sameDigestCountInDeck": repeat_count,
                    "classification": classification,
                    "classificationReason": reason,
                    "references": references,
                }
            )
    return extracted


def _public_slide_texts(record: Mapping[str, Any]) -> list[str]:
    deck = record.get("deck", {})
    return [
        " ".join(_normalise(text) for text in slide.get("visibleTexts", []) if text).strip()
        for slide in deck.get("slides", [])
    ]


def _public_slide_text(slide: Mapping[str, Any]) -> str:
    return " ".join(str(text) for text in slide.get("visibleTexts", []) if text).strip()


def _slide_differences(
    native_slides: list[Mapping[str, Any]],
    public_slides: list[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    differences: list[dict[str, Any]] = []
    for index in range(max(len(native_slides), len(public_slides))):
        native_text = str(native_slides[index].get("joinedText") or "") if index < len(native_slides) else ""
        if not native_text and index < len(native_slides):
            native_text = "\n".join(str(text) for text in native_slides[index].get("texts", []))
        public_text = _public_slide_text(public_slides[index]) if index < len(public_slides) else ""
        if _normalise(native_text) == _normalise(public_text):
            continue
        differences.append(
            {
                "slide": index + 1,
                "nativeText": native_text,
                "publishedText": public_text,
                "sequenceRatio": round(difflib.SequenceMatcher(None, _normalise(native_text), _normalise(public_text)).ratio(), 6),
            }
        )
    return differences


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
    slide_differences = _slide_differences(native.get("slides", []), public_record.get("deck", {}).get("slides", []))
    return {
        "status": status,
        "publicSourceUrl": public_record.get("sourceUrl"),
        "publicSlideCount": public_record.get("deck", {}).get("slideCount"),
        "nativeSlideCount": native.get("slideCount"),
        "exactSlideCount": exact_slide_count,
        "sequenceRatio": round(sequence_ratio, 6),
        "publicTokenCoverage": round(coverage, 6),
        "slideDifferenceCount": len(slide_differences),
        "slideDifferences": slide_differences,
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
    extract_images_dir: Path | None = None,
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
            if extract_images_dir and candidate.get("role") == "primary-candidate":
                native["imageExtraction"] = extract_image_members(
                    matches[0],
                    native,
                    extract_images_dir,
                    str(candidate.get("level") or "unknown"),
                    unit_number,
                    str(candidate.get("id")),
                )
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


def write_native_source_files(
    audit: Mapping[str, Any],
    public_manifest: Mapping[str, Any],
    output_dir: Path,
) -> list[str]:
    """Write one native content record per primary unit candidate.

    Published slide numbers are joined only for exact-count, text-set-aligned
    records. Mismatches retain the full native record and comparison evidence,
    but do not receive inferred published numbering.
    """

    public_by_unit = _public_by_unit(public_manifest)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []
    for record in audit.get("records", []):
        candidate = record.get("candidate", {})
        if candidate.get("role") != "primary-candidate" or record.get("status") != "ok":
            continue
        unit = int(record["unit"])
        comparison = record.get("publishedComparison", {})
        merge_published = comparison.get("status") == "text-set-aligned" and comparison.get("exactSlideCount")
        public_record = public_by_unit.get(unit)
        slides: list[dict[str, Any]] = []
        native_slides = record.get("native", {}).get("slides", [])
        public_slides = (public_record or {}).get("deck", {}).get("slides", [])
        for index, native_slide in enumerate(native_slides):
            merged_slide = {"number": native_slide.get("number", index + 1), "native": native_slide}
            if merge_published and index < len(public_slides):
                merged_slide["publishedSlideNumber"] = index + 1
                merged_slide["published"] = public_slides[index]
            slides.append(merged_slide)
        payload = {
            "schemaVersion": 1,
            "unit": unit,
            "module": record.get("module"),
            "candidate": candidate,
            "source": {
                "nativePptx": candidate.get("localPath"),
                "publicSourceUrl": comparison.get("publicSourceUrl"),
                "mergeRule": "published slide numbers are present only for exact-count text-set-aligned records",
            },
            "mergeStatus": "merged-published-slide-numbers" if merge_published else "native-only-published-mismatch",
            "publishedComparison": comparison,
            "nativeMedia": record.get("native", {}).get("media", []),
            "nativeMediaSummary": record.get("native", {}).get("mediaSummary", {}),
            "nativeImageAssets": record.get("native", {}).get("imageExtraction", []),
            "slides": slides,
        }
        output = output_dir / f"unit-{unit:02d}.json"
        output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        paths.append(str(output))
    return paths


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--drive-manifest", type=Path, default=Path("docs/audit/drive-source-manifest.json"))
    parser.add_argument("--public-manifest", type=Path, default=Path("docs/audit/course-source-manifest.json"))
    parser.add_argument("--source-dir", type=Path, default=Path("docs/audit/source-originals"))
    parser.add_argument("--extra", type=Path, action="append", default=[])
    parser.add_argument("--extract-audio-dir", type=Path)
    parser.add_argument("--extract-images-dir", type=Path)
    parser.add_argument("--native-source-dir", type=Path, default=Path("docs/audit/source-files-native"))
    parser.add_argument("--output", type=Path, default=Path("docs/audit/native-pptx-audit.json"))
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    drive = json.loads(args.drive_manifest.read_text(encoding="utf-8"))
    public = json.loads(args.public_manifest.read_text(encoding="utf-8"))
    result = audit_manifest(drive, public, args.source_dir, args.extra, args.extract_images_dir)
    if args.extract_audio_dir:
        result["audioExtraction"] = {
            str(path): extract_audio_members(path, args.extract_audio_dir)
            for path in args.extra
            if path.exists()
        }
    result["nativeSourceFiles"] = write_native_source_files(result, public, args.native_source_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
