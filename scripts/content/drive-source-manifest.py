#!/usr/bin/env python3
"""Build a clean, unit-oriented manifest from an authoritative Drive crawl.

The crawler deliberately receives only the already-authorized folder listing.
This module does not call Drive, infer file IDs, or include private/user data;
it groups the listing's native presentation and audio candidates by course unit
and joins them to the public published-deck manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable, Mapping


UNIT_RE = re.compile(r"\bunit\s*[-_ ]?\s*(\d{1,2})\b", re.IGNORECASE)
MODULE_RE = re.compile(r"^Module\s+(\d+)$", re.IGNORECASE)

# Module 1 has no published Unit 1 record in the public deck inventory. The
# remaining records map one-to-one to lesson order from the content snapshot.
MODULE_STARTS = {
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
DEFAULT_SNAPSHOT = Path(
    r"C:\Users\ACER\.codex\worktrees\lesson-guided-pilot\web\docs\audit"
    r"\lingowow-esencial-course-content-snapshot.json"
)

# These files are templates or SlidesCarnival material, not course lessons.
IGNORED_PRESENTATION_MARKERS = ("slidescarnival",)

# These files carry a unit number but are older/alternate decks. Their
# published-text comparison confirms that the shorter, current deck is the
# source candidate for the corresponding unit.
LEGACY_EXPLICIT_PRESENTATION_TITLES = {
    _title
    for _title in (
        "New Unit 3 - Every day I.pptx",
        "So far Unit 21.pptx",
        "Behaving Properly - Unit 22 .pptx",
        "How Dull! - Unit 23 .pptx",
        "He, who works there... - Unit 24 .pptx",
    )
}


def _norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _module_number(entry: Mapping[str, Any]) -> int | None:
    for component in reversed(entry.get("path", [])):
        match = MODULE_RE.match(str(component).strip())
        if match:
            return int(match.group(1))
    return None


def _explicit_unit(title: str) -> int | None:
    match = UNIT_RE.search(title)
    return int(match.group(1)) if match else None


def _is_ignored_presentation(title: str) -> bool:
    lowered = _norm(title)
    return any(marker in lowered for marker in IGNORED_PRESENTATION_MARKERS)


def _legacy_presentation_unit(entry: Mapping[str, Any], module: int | None) -> tuple[int | None, str]:
    """Map older decks whose names omit a unit number by module/title.

    The mapping is intentionally explicit. A title that cannot be matched is
    left unassigned so a future import cannot silently attach the wrong deck.
    """

    if module == 3:
        names = {
            "how do i get there": 9,
            "such a wonderful place": 10,
            "similar but not the same": 11,
            "the greatest": 12,
        }
    elif module == 4:
        names = {
            "i m working on it": 13,
            "i am working on it": 13,
            "back then": 14,
            "i remember i": 15,
            "when you called": 16,
        }
    elif module == 5:
        names = {
            "that s the plan": 17,
            "we are attending": 18,
            "it is this saturday": 19,
            "don t leave your umbrella": 20,
        }
    elif module == 6:
        names = {
            "so far unit 21": 21,
            "so far i": 21,
            "behaving properly": 22,
            "how dull": 23,
            "he who works there": 24,
            "i dont know why": 24,
        }
    else:
        names = {}
    normalized = _norm(entry.get("title", ""))
    for phrase, unit in names.items():
        if phrase in normalized:
            return unit, "legacy-title-within-module"
    return None, "unmatched-presentation-title"


def _entry_url(entry: Mapping[str, Any]) -> str:
    return str(entry.get("url") or "")


def _candidate(entry: Mapping[str, Any], *, role: str, mapping_reason: str) -> dict[str, Any]:
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "mimeType": entry.get("mimeType"),
        "url": _entry_url(entry),
        "size": entry.get("size"),
        "level": entry.get("level"),
        "path": entry.get("path", []),
        "role": role,
        "mappingReason": mapping_reason,
    }


def _attach_local_paths(result: dict[str, Any], source_dir: Path) -> None:
    """Annotate candidates with deterministic local paths when materialized."""

    audio_extensions = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".mp4",
        "audio/aac-adts": ".aac",
        "audio/x-m4a": ".m4a",
    }
    for unit_record in result.get("units", {}).values():
        unit = int(unit_record["unit"])
        for index, candidate in enumerate(unit_record.get("presentationCandidates", []), 1):
            role = "primary" if candidate.get("role") == "primary-candidate" else "legacy"
            prefix = f"{candidate.get('level')}-unit-{unit:02d}-{role}-{index:02d}-{candidate.get('id')}"
            matches = sorted(source_dir.glob(f"{prefix}.pptx"))
            if matches:
                path = matches[0]
                candidate["localPath"] = str(path)
                candidate["localBytes"] = path.stat().st_size
                digest = hashlib.sha256()
                with path.open("rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(chunk)
                candidate["sha256"] = digest.hexdigest()
        for index, candidate in enumerate(unit_record.get("audioCandidates", []), 1):
            role = "self-study" if candidate.get("role") == "self-study" else "lesson"
            extension = audio_extensions.get(candidate.get("mimeType"), ".audio")
            expected = source_dir / "audio" / f"{candidate.get('level')}-unit-{unit:02d}-{role}-{index:02d}-{candidate.get('id')}{extension}"
            if expected.exists():
                candidate["localPath"] = str(expected)


def _public_unit_records(public_manifest: Mapping[str, Any]) -> dict[int, dict[str, Any]]:
    records: dict[int, dict[str, Any]] = {}
    for source in public_manifest.get("sources", []):
        module = source.get("module", {})
        module_number = int(module.get("order"))
        lesson = source.get("lesson", {})
        lesson_order = int(lesson.get("order"))
        unit = MODULE_STARTS[module_number] + lesson_order - 1
        deck = source.get("deck", {})
        records[unit] = {
            "module": {
                "order": module_number,
                "title": module.get("title"),
                "id": module.get("id"),
            },
            "lesson": {
                "order": lesson_order,
                "title": lesson.get("title"),
                "id": lesson.get("id"),
                "videoUrl": lesson.get("videoUrl"),
            },
            "contentId": source.get("contentId"),
            "sourceUrl": source.get("sourceUrl"),
            "status": source.get("status"),
            "deckTitle": deck.get("deckTitle"),
            "slideCount": deck.get("slideCount"),
            "mediaSummary": deck.get("mediaSummary", {}),
            "warnings": deck.get("warnings", []),
        }
    return records


def _existing_unit1_reference(snapshot_path: Path) -> dict[str, Any] | None:
    if not snapshot_path.exists():
        return None
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    for module in snapshot.get("modules", []):
        for lesson in module.get("lessons", []):
            if _norm(str(lesson.get("title", ""))) != "this is me":
                continue
            urls: list[str] = []

            def visit(value: Any) -> None:
                if isinstance(value, Mapping):
                    for key, child in value.items():
                        if key.lower() in {"url", "videourl"} and isinstance(child, str) and child.startswith(("http://", "https://")):
                            if child not in urls:
                                urls.append(child)
                        else:
                            visit(child)
                elif isinstance(value, list):
                    for child in value:
                        visit(child)

            visit(lesson.get("contents", []))
            return {
                "sourcePath": str(snapshot_path),
                "lessonId": lesson.get("id"),
                "lessonTitle": lesson.get("title"),
                "audioOrVideoUrls": [url for url in urls if re.search(r"\.(?:wav|mp3|m4a|mp4)(?:$|[?#])", url, re.IGNORECASE)],
                "preservationNote": "Existing Unit 1 runtime URLs are carried forward unchanged.",
            }
    return None


def _existing_runtime_audio_references(snapshot_path: Path) -> dict[str, list[dict[str, Any]]]:
    """Collect already-used Unit_N audio URLs without copying other content."""

    if not snapshot_path.exists():
        return {}
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    references: dict[str, list[dict[str, Any]]] = {}
    for module in snapshot.get("modules", []):
        for lesson in module.get("lessons", []):
            urls: list[str] = []

            def visit(value: Any) -> None:
                if isinstance(value, Mapping):
                    for key, child in value.items():
                        if key.lower() in {"url", "videourl"} and isinstance(child, str) and child.startswith(("http://", "https://")):
                            if child not in urls:
                                urls.append(child)
                        else:
                            visit(child)
                elif isinstance(value, list):
                    for child in value:
                        visit(child)

            visit(lesson.get("contents", []))
            for url in urls:
                match = re.search(r"Unit_(\d+)-", url, re.IGNORECASE)
                if not match:
                    continue
                unit_key = match.group(1)
                references.setdefault(unit_key, []).append(
                    {
                        "url": url,
                        "moduleOrder": module.get("order"),
                        "lessonOrder": lesson.get("order"),
                        "lessonId": lesson.get("id"),
                        "lessonTitle": lesson.get("title"),
                    }
                )
    return references


def build_manifest(
    tree_manifest: Mapping[str, Any],
    public_manifest: Mapping[str, Any],
    snapshot_path: Path | None = None,
    source_dir: Path | None = None,
) -> dict[str, Any]:
    """Return a deterministic manifest with entries grouped under units 1..56."""

    units: dict[int, dict[str, Any]] = {}
    public_units = _public_unit_records(public_manifest)
    for unit in range(1, 57):
        module = next((m for m, start in MODULE_STARTS.items() if start <= unit < MODULE_STARTS.get(m + 1, 57)), 14)
        record = public_units.get(unit)
        units[unit] = {
            "unit": unit,
            "module": {
                "order": module,
                "title": (record or {}).get("module", {}).get("title") or f"Module {module}",
                "id": (record or {}).get("module", {}).get("id"),
                "driveTitle": f"Module {module}",
            },
            "published": record,
            "presentationCandidates": [],
            "audioCandidates": [],
            "notes": [],
        }

    unassigned = {"presentations": [], "audio": [], "other": []}
    for entry in tree_manifest.get("entries", []):
        mime = str(entry.get("mimeType") or "")
        title = str(entry.get("title") or "")
        if mime.endswith("presentationml.presentation"):
            if _is_ignored_presentation(title):
                entry_copy = dict(entry)
                entry_copy["reason"] = "template-or-slidescarnival"
                unassigned["presentations"].append(entry_copy)
                continue
            module = _module_number(entry)
            unit = _explicit_unit(title)
            reason = "explicit-unit-in-title"
            if unit is None:
                unit, reason = _legacy_presentation_unit(entry, module)
            if unit is None or unit not in units:
                entry_copy = dict(entry)
                entry_copy["reason"] = reason
                unassigned["presentations"].append(entry_copy)
                continue
            role = (
                "legacy-alternate"
                if title.casefold() in {item.casefold() for item in LEGACY_EXPLICIT_PRESENTATION_TITLES}
                else "primary-candidate"
                if _explicit_unit(title) is not None
                else "legacy-alternate"
            )
            units[unit]["presentationCandidates"].append(
                _candidate(entry, role=role, mapping_reason=reason)
            )
            continue
        if mime.startswith("audio/"):
            unit = _explicit_unit(title)
            if unit is None or unit not in units:
                entry_copy = dict(entry)
                entry_copy["reason"] = "no-unit-in-audio-title"
                unassigned["audio"].append(entry_copy)
                continue
            lowered = _norm("/".join(entry.get("path", [])) + " " + title)
            role = "self-study" if "self study" in lowered or "ssm" in lowered else "lesson-audio-candidate"
            units[unit]["audioCandidates"].append(
                _candidate(entry, role=role, mapping_reason="explicit-unit-in-title")
            )
            continue
        if entry.get("fileOrFolder") == "file":
            unassigned["other"].append(dict(entry))

    for unit_record in units.values():
        presentations = unit_record["presentationCandidates"]
        audio = unit_record["audioCandidates"]
        presentations.sort(key=lambda item: (item["role"], _norm(item["title"] or ""), item["id"] or ""))
        audio.sort(key=lambda item: (item["role"], _norm(item["title"] or ""), item["id"] or ""))
        if not presentations:
            unit_record["notes"].append("no-native-presentation-candidate-in-authoritative-folder")
        if not audio:
            unit_record["notes"].append("no-native-audio-candidate-in-authoritative-folder")

    counts = {
        "units": len(units),
        "unitsWithNativePresentation": sum(bool(v["presentationCandidates"]) for v in units.values()),
        "unitsWithoutNativePresentation": sum(not v["presentationCandidates"] for v in units.values()),
        "unitsWithAudio": sum(bool(v["audioCandidates"]) for v in units.values()),
        "nativePresentationCandidates": sum(len(v["presentationCandidates"]) for v in units.values()),
        "audioCandidates": sum(len(v["audioCandidates"]) for v in units.values()),
    }
    authority = tree_manifest.get("authority", {})
    folder_url = authority.get("folderUrl")
    folder_match = re.search(r"/folders/([^/?]+)", str(folder_url or ""))
    result = {
        "schemaVersion": 1,
        "source": {
            "authorityFolderUrl": folder_url,
            "authorityFolderId": folder_match.group(1) if folder_match else None,
            "allowedRoots": authority.get("allowedLevels", []),
            "excludedDirectItems": authority.get("excludedDirectItems", []),
            "ignoredLevelItems": authority.get("ignoredLevelItems", []),
            "treeManifest": "docs/audit/drive-source-tree-manifest.json",
            "publicManifest": "docs/audit/course-source-manifest.json",
            "nativeAudit": "docs/audit/native-pptx-audit.json",
            "audioMaterialization": "docs/audit/drive-audio-materialization.json",
            "sourceOriginalsDirectory": "docs/audit/source-originals",
        },
        "counts": counts,
        "units": {str(unit): units[unit] for unit in range(1, 57)},
        "unassigned": unassigned,
    }
    if snapshot_path:
        unit1 = _existing_unit1_reference(snapshot_path)
        if unit1:
            result["existingUnit1"] = unit1
        runtime_audio = _existing_runtime_audio_references(snapshot_path)
        if runtime_audio:
            result["existingRuntimeAudio"] = runtime_audio
    if source_dir:
        _attach_local_paths(result, source_dir)
    return result


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tree", type=Path, default=Path("docs/audit/drive-source-tree-manifest.json"))
    parser.add_argument("--public", type=Path, default=Path("docs/audit/course-source-manifest.json"))
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--source-dir", type=Path, default=Path("docs/audit/source-originals"))
    parser.add_argument("--output", type=Path, default=Path("docs/audit/drive-source-manifest.json"))
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    tree = json.loads(args.tree.read_text(encoding="utf-8"))
    public = json.loads(args.public.read_text(encoding="utf-8"))
    manifest = build_manifest(tree, public, args.snapshot, args.source_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
