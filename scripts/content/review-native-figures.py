#!/usr/bin/env python3
"""Review native PPTX image references for use in the illustrated lesson builder.

The native audit intentionally labels every image as a candidate.  This pass
applies a conservative, content-only review: repeated brand/footer media and
audio icons are excluded, browser/source screenshots stay unresolved, and
content images are confirmed only when their pixels and slide purpose support
an instructional role.  Published slide numbers are attached only when the
native/public text audit establishes a safe mapping.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Mapping

try:
    from PIL import Image
except ImportError:  # pragma: no cover - the audit can still run without PIL
    Image = None  # type: ignore[assignment]


DEFAULT_NATIVE_AUDIT = Path("docs/audit/native-pptx-audit.json")
DEFAULT_PUBLIC_MANIFEST = Path("docs/audit/course-source-manifest.json")
DEFAULT_OUTPUT = Path("docs/audit/reviewed-figures.json")

STARTS = {
    1: 1,
    2: 5,
    3: 8,
    4: 13,
    5: 17,
    6: 21,
    7: 25,
    8: 29,
    9: 33,
    10: 37,
    11: 41,
    12: 45,
    13: 49,
    14: 53,
}

# These are the exact SHA-256 values of the two audio buttons and the
# repeated brand/footer variants found across the primary decks.  They are
# excluded by visual identity and cross-deck recurrence, never by recurrence
# alone.
KNOWN_TEMPLATE_ROLES = {
    "ce7ad2a5f9eaaf5bb72c2767c86511982c60096abdd6d172eba3ec9c0f1f15d1": "template-logo",
    "5bd18f07c366ae91ac8a070df4537f57120e53656339a572427adf1589150f38": "template-logo",
    "0f448667c37b019279cc829ff81d19a1f266db6e03bdcffc6ad45b2833d37ac6": "template-logo",
    "a8d0df9898f29ff5c4732db2353e04d410ca23589e8135185bf8cdbd98208475": "template-logo",
    "a41c4a5a06acbba33fa8a2c26fbed54b40958f6c412efb73c06dc8f5384b41e9": "template-footer",
    "4a86d45eec89fcc550e9d11430b2a5ad62e373d744c314055b492735d0a06f3e": "template-footer",
    "0fdd09f9557fe6e265af4b096f031625b571bae5022bf1d65cee1d07113642a0": "audio-icon",
    "b15efd82d219b2c9635243082af313003f4d463176d1ac3ea9cb285f12f6fc5a": "audio-icon",
    "2e46d2d020a11fb341d578a922995a529939aa245dfb8af03ac7e676d7fee064": "unreferenced-media",
}


def _unit_for_public(source: Mapping[str, Any]) -> int:
    return STARTS[int(source["module"]["order"])] + int(source["lesson"]["order"]) - 1


def _normalise_text(value: str) -> str:
    return " ".join(value.casefold().split())


def _public_by_unit(manifest: Mapping[str, Any]) -> dict[int, Mapping[str, Any]]:
    return {_unit_for_public(source): source for source in manifest.get("sources", [])}


def _native_path(value: str) -> Path:
    return Path(value.replace("\\", os.sep))


def _image_size(local_path: str) -> tuple[int, int] | None:
    if Image is None:
        return None
    path = _native_path(local_path)
    if not path.exists():
        return None
    try:
        with Image.open(path) as image:
            return tuple(int(v) for v in image.size)
    except (OSError, ValueError):
        return None


def _slide_text(native_slide: Mapping[str, Any], public_slide: Mapping[str, Any] | None) -> str:
    if public_slide:
        return "\n".join(str(value) for value in public_slide.get("visibleTexts", []) if value).strip()
    joined = str(native_slide.get("joinedText") or "").strip()
    if joined:
        return joined
    return "\n".join(str(value) for value in native_slide.get("texts", []) if value).strip()


def _slide_purpose(number: int, text: str) -> str:
    lower = text.casefold()
    if "copyright" in lower or "worldwide language community" in lower:
        return "copyright-footer"
    if number == 1:
        return "unit-cover"
    if number in {2, 3} and any(token in lower for token in ("communicative function", "competencies", "introduction")):
        return "lesson-orientation"
    if "look at the picture" in lower or "what is today" in lower:
        return "intro-look-at-picture"
    if "look at the pictures" in lower:
        return "picture-observation"
    if "look at the information" in lower or "repeat the words" in lower or "repeat the phrases" in lower:
        return "vocabulary-visual"
    if "read the following article" in lower or "read the article" in lower:
        return "reading-article"
    if "read the following paragraph" in lower or "read the paragraph" in lower:
        return "reading-paragraph"
    if re.search(r"\b(?:listen|audio)\b", lower):
        return "listening-or-teacher-prompt"
    if re.search(r"\b(?:write|complete|change|create|extract|identify|answer|state|describe|discuss)\b", lower):
        return "exercise-or-language-target"
    return "lesson-content"


def _is_screenshot(size: tuple[int, int] | None) -> bool:
    # The source decks contain a small, visually distinct set of full browser
    # captures (1366x768).  Native photos use portrait or ~2500x1250 imagery;
    # this dimension rule avoids promoting search-result screenshots to figures.
    return size == (1366, 768)


def _mapping_status(record: Mapping[str, Any]) -> str:
    comparison = record.get("publishedComparison", {})
    if comparison.get("status") == "text-set-aligned" and comparison.get("exactSlideCount"):
        return "published-slide-aligned"
    if comparison.get("status") == "no-public-record":
        return "native-only-no-public-record"
    return "native-only-published-mismatch"


def _public_slides_by_number(public_record: Mapping[str, Any] | None) -> dict[int, Mapping[str, Any]]:
    if not public_record:
        return {}
    return {int(slide["number"]): slide for slide in public_record.get("deck", {}).get("slides", [])}


def _evidence(
    *,
    role: str,
    unit: int,
    native_number: int,
    source_text: str,
    digest_deck_count: int,
    mapping_status: str,
) -> list[str]:
    evidence = [
        f"Contact-sheet visual review classified the extracted pixels as {role}.",
        f"Published/native slide purpose for Unit {unit} slide {native_number}: {_slide_purpose(native_number, source_text)}.",
    ]
    if digest_deck_count > 1:
        evidence.append(f"The same SHA-256 occurs in {digest_deck_count} primary deck(s); recurrence supports the template decision only together with the visual review.")
    else:
        evidence.append("The figure is a one-deck or two-reference asset; confirmation relies on its visible content and the source slide purpose, not recurrence.")
    if mapping_status == "native-only-published-mismatch":
        evidence.append("Published/native text is low-overlap, so the native figure is retained as a candidate without a published-slide confirmation.")
    elif mapping_status == "native-only-no-public-record":
        evidence.append("No published course record is available for this native deck; published slide-number confirmation is unavailable.")
    return evidence


def _asset_role(asset: Mapping[str, Any], source_text: str, mapping_status: str, deck_count: int) -> tuple[str, bool, str]:
    sha = str(asset.get("sha256", ""))
    if sha in KNOWN_TEMPLATE_ROLES:
        role = KNOWN_TEMPLATE_ROLES[sha]
        return role, False, "Repeated branded/audio asset verified by visual identity and cross-deck placement."
    if not asset.get("references"):
        return "unreferenced-media", False, "Package image has no slide picture relationship."
    size = _image_size(str(asset.get("localPath", "")))
    if _is_screenshot(size):
        return "source-screenshot-candidate", False, "Full-browser/source screenshot retained for manual review; no single instructional figure is confirmed."
    if "copyright" in source_text.casefold() or "worldwide language community" in source_text.casefold():
        return "template-footer-candidate", False, "The slide is a copyright/footer screen; media is excluded from instructional figures."
    if mapping_status == "native-only-published-mismatch":
        return "instructional-candidate-published-mismatch", False, "The native pixels look instructional, but the published deck cannot be safely aligned by slide number."
    return "instructional-figure", True, "Visible content is a concrete photo, illustration, icon or diagram used in a mapped lesson slide."


def review_figures(native_audit: Mapping[str, Any], public_manifest: Mapping[str, Any]) -> dict[str, Any]:
    public_by_unit = _public_by_unit(public_manifest)
    primary_records = [
        record
        for record in native_audit.get("records", [])
        if record.get("candidate", {}).get("role") == "primary-candidate" and record.get("status") == "ok"
    ]
    digest_decks: Counter[str] = Counter()
    digest_units: defaultdict[str, set[int]] = defaultdict(set)
    for record in primary_records:
        for asset in record.get("native", {}).get("imageExtraction", []):
            digest = str(asset.get("sha256", ""))
            digest_decks[digest] += 1
            digest_units[digest].add(int(record["unit"]))

    units: dict[str, Any] = {}
    asset_records: dict[str, dict[str, Any]] = {}
    role_counts: Counter[str] = Counter()
    confirmed_references = 0
    total_references = 0
    total_assets = 0
    mismatch_units: list[int] = []

    for record in sorted(primary_records, key=lambda value: int(value["unit"])):
        unit = int(record["unit"])
        mapping_status = _mapping_status(record)
        if mapping_status == "native-only-published-mismatch":
            mismatch_units.append(unit)
        public_record = public_by_unit.get(unit)
        public_slides = _public_slides_by_number(public_record)
        slides: dict[str, Any] = {}
        native_slides = {int(slide["number"]): slide for slide in record.get("native", {}).get("slides", [])}
        assets_by_slide: defaultdict[int, list[Mapping[str, Any]]] = defaultdict(list)
        for asset in record.get("native", {}).get("imageExtraction", []):
            total_assets += 1
            digest = str(asset.get("sha256", ""))
            if not asset.get("references"):
                summary = asset_records.setdefault(
                    digest,
                    {
                        "sha256": digest,
                        "bytes": asset.get("bytes"),
                        "mimeType": asset.get("mimeType"),
                        "representativeLocalPath": asset.get("localPath"),
                        "primaryDeckCount": len(digest_units[digest]),
                        "units": sorted(digest_units[digest]),
                        "roles": set(),
                        "confirmedInstructional": False,
                    },
                )
                summary["roles"].add("unreferenced-media")
            for reference in asset.get("references", []):
                assets_by_slide[int(reference["slide"])].append({"asset": asset, "reference": reference})

        for native_number, refs in sorted(assets_by_slide.items()):
            native_slide = native_slides.get(native_number, {})
            public_slide = public_slides.get(native_number) if mapping_status == "published-slide-aligned" else None
            source_text = _slide_text(native_slide, public_slide)
            purpose = _slide_purpose(native_number, source_text)
            published_number = native_number if mapping_status == "published-slide-aligned" else None
            key = str(published_number) if published_number is not None else f"native-{native_number}"
            slide_record = {
                "nativeSlideNumber": native_number,
                "publishedSlideNumber": published_number,
                "mappingStatus": mapping_status,
                "purpose": purpose,
                "sourceText": source_text,
                "confirmedInstructionalAssets": [],
                "excludedOrBlockedAssets": [],
            }
            for ref_item in refs:
                asset = ref_item["asset"]
                reference = ref_item["reference"]
                digest = str(asset.get("sha256", ""))
                role, confirmed, decision = _asset_role(asset, source_text, mapping_status, len(digest_units[digest]))
                total_references += 1
                role_counts[role] += 1
                evidence = _evidence(
                    role=role,
                    unit=unit,
                    native_number=native_number,
                    source_text=source_text,
                    digest_deck_count=len(digest_units[digest]),
                    mapping_status=mapping_status,
                )
                evidence.append(decision)
                reference_record = {
                    "mediaPath": asset.get("mediaPath"),
                    "localPath": asset.get("localPath"),
                    "mimeType": asset.get("mimeType"),
                    "bytes": asset.get("bytes"),
                    "sha256": digest,
                    "bbox": reference.get("bbox"),
                    "shapeId": reference.get("shapeId"),
                    "shapeName": reference.get("shapeName"),
                    "role": role,
                    "confirmedInstructional": confirmed,
                    "reviewEvidence": evidence,
                }
                if confirmed:
                    confirmed_references += 1
                    slide_record["confirmedInstructionalAssets"].append(reference_record)
                else:
                    slide_record["excludedOrBlockedAssets"].append(reference_record)

                summary = asset_records.setdefault(
                    digest,
                    {
                        "sha256": digest,
                        "bytes": asset.get("bytes"),
                        "mimeType": asset.get("mimeType"),
                        "representativeLocalPath": asset.get("localPath"),
                        "primaryDeckCount": len(digest_units[digest]),
                        "units": sorted(digest_units[digest]),
                        "roles": set(),
                        "confirmedInstructional": False,
                    },
                )
                summary["roles"].add(role)
                summary["confirmedInstructional"] = bool(summary["confirmedInstructional"] or confirmed)

            slides[key] = slide_record

        candidate = record.get("candidate", {})
        units[str(unit)] = {
            "unit": unit,
            "module": record.get("module"),
            "lesson": public_record.get("lesson") if public_record else None,
            "nativeSource": {
                "path": candidate.get("localPath"),
                "title": candidate.get("title"),
                "sha256": candidate.get("sha256"),
                "candidateId": candidate.get("id"),
            },
            "mappingStatus": mapping_status,
            "publishedSourceUrl": record.get("publishedComparison", {}).get("publicSourceUrl"),
            "slides": slides,
            "blockers": (["No published deck record; native-only figure references cannot be tied to published slide numbers."] if mapping_status == "native-only-no-public-record" else []),
        }

    for unit in range(53, 57):
        public_record = public_by_unit.get(unit)
        units[str(unit)] = {
            "unit": unit,
            "module": public_record.get("module") if public_record else None,
            "lesson": public_record.get("lesson") if public_record else None,
            "nativeSource": None,
            "mappingStatus": "native-source-unavailable",
            "publishedSourceUrl": public_record.get("sourceUrl") if public_record else None,
            "slides": {},
            "blockers": ["No downloaded authoritative native PPTX was available for image extraction; published rendered media cannot identify original instructional assets."],
        }

    assets = []
    for summary in sorted(asset_records.values(), key=lambda value: value["sha256"]):
        summary["roles"] = sorted(summary["roles"])
        assets.append(summary)

    return {
        "schemaVersion": 1,
        "scope": "Primary native PPTX instructional-media review; no raw media bytes are embedded.",
        "sources": {
            "nativeAudit": "docs/audit/native-pptx-audit.json",
            "publishedManifest": "docs/audit/course-source-manifest.json",
            "contactSheetReview": "docs/audit/_figure-contact-sheets (local QA only; not committed)",
        },
        "policy": {
            "confirmedInstructional": "A concrete visual was contact-sheet reviewed and its mapped source slide purpose supports an instructional role.",
            "excluded": "Brand/footer art, audio buttons and unreferenced package media are excluded even when native extraction initially labels them candidates.",
            "screenshot": "Browser/source screenshots remain candidates and are never confirmed as learning figures.",
            "publishedPriority": "Low-overlap native decks keep native figures blocked until published slide alignment is resolved.",
            "assetUse": "Use only confirmedInstructionalAssets in the builder; preserve localPath and sha256 for provenance.",
        },
        "counts": {
            "nativePrimaryUnits": len(primary_records),
            "outputUnits": len(units),
            "nativeImageAssets": total_assets,
            "uniqueDigests": len(asset_records),
            "imageReferences": total_references,
            "confirmedInstructionalReferences": confirmed_references,
            "confirmedInstructionalSlides": sum(bool(slide["confirmedInstructionalAssets"]) for unit in units.values() for slide in unit.get("slides", {}).values()),
            "roleCounts": dict(sorted(role_counts.items())),
            "publishedMappingBlockerUnits": mismatch_units,
            "nativeSourceUnavailableUnits": [53, 54, 55, 56],
        },
        "assets": assets,
        "units": units,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native-audit", type=Path, default=DEFAULT_NATIVE_AUDIT)
    parser.add_argument("--public-manifest", type=Path, default=DEFAULT_PUBLIC_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    native_audit = json.loads(args.native_audit.read_text(encoding="utf-8"))
    public_manifest = json.loads(args.public_manifest.read_text(encoding="utf-8"))
    output = review_figures(native_audit, public_manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["counts"], ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
