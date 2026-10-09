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
import hashlib
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
REVIEW_ITEM_ID_RE = re.compile(r"^u(?P<unit>\d+)[-_]s(?P<slide>\d+)(?:[-_]|$)", re.IGNORECASE)
TABLE_REVIEW_POLICY_KEYS = (
    "publishedSlidesAuthoritativeOnMismatch",
    "sourceQuotesRequired",
    "nativeShapeProvenanceRequired",
    "noInventedCellsOrExamples",
    "publishedSourceProjectionRequiresLiteralCellQuotes",
)
PUBLISHED_SOURCE_REVIEW_STATUS = "reviewed"


class ComposeError(ValueError):
    """Raised when a required audit input cannot be interpreted safely."""


class UnitScope:
    """The inclusive unit range admitted by one composition run."""

    def __init__(self, first: int, last: int) -> None:
        self.first = first
        self.last = last

    @property
    def units(self) -> range:
        return range(self.first, self.last + 1)

    @property
    def count(self) -> int:
        return self.last - self.first + 1

    def includes(self, unit: int | None) -> bool:
        return unit is not None and self.first <= unit <= self.last


def _unit_scope(first: int, last: int) -> UnitScope:
    if first < 2:
        raise ComposeError("unit scope must start at Unit 2 or later; Unit 1 uses its authored pipeline")
    if last < first:
        raise ComposeError(f"unit scope is invalid: first unit {first} is after last unit {last}")
    return UnitScope(first=first, last=last)


DEFAULT_UNIT_SCOPE = UnitScope(first=UNIT_FIRST, last=UNIT_LAST)


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


def _table_review_refs(entry: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    refs = [item for item in _as_list(entry.get("sourceRefs")) if isinstance(item, Mapping)]
    if refs:
        return refs
    fallback: list[Mapping[str, Any]] = []
    for kind, key in (("published", "publishedSourceFile"), ("native", "nativeSourceFile")):
        path = _text(entry.get(key))
        if path:
            fallback.append({"kind": kind, "path": path})
    return fallback


def _table_review_ref(refs: Sequence[Mapping[str, Any]], kind: str) -> Mapping[str, Any] | None:
    return next((ref for ref in refs if _text(ref.get("kind")).casefold() == kind), None)


def _table_review_cells(projection: Mapping[str, Any]) -> list[list[list[str]]]:
    """Return the reviewed matrix while rejecting non-source cell values."""

    tables: list[list[list[str]]] = []
    for raw_table in _as_list(projection.get("tables")):
        if not isinstance(raw_table, Mapping):
            raise ComposeError("table review projection table must be an object")
        raw_rows = raw_table.get("rows")
        if not isinstance(raw_rows, list) or not raw_rows:
            raise ComposeError("table review projection table has no rows")
        rows: list[list[str]] = []
        for raw_row in raw_rows:
            if not isinstance(raw_row, list) or not raw_row:
                raise ComposeError("table review projection row must be a non-empty list")
            row: list[str] = []
            for value in raw_row:
                if not isinstance(value, str):
                    raise ComposeError("table review projection cells must be strings")
                row.append(value.strip())
            rows.append(row)
        if any(value for row in rows for value in row):
            tables.append(rows)
    return tables


def _table_review_source_text(slide: Mapping[str, Any]) -> str:
    return _normalise_review_text("\n".join(_text(value) for value in _as_list(slide.get("visibleTexts"))))


def _table_review_contains(source_text: str, value: str) -> bool:
    """Match authored cell quotes while tolerating extractor punctuation joins."""

    normalized = _normalise_review_text(value)
    if normalized and normalized in source_text:
        return True
    compact = re.sub(r"[^a-z0-9]+", "", normalized)
    compact_source = re.sub(r"[^a-z0-9]+", "", source_text)
    return bool(compact and compact in compact_source)


def _table_review_file_sha(path: Path) -> str:
    return _sha256_file(path).casefold()


def _table_review_metadata(
    entry: Mapping[str, Any],
    projection: Mapping[str, Any],
    refs: Sequence[Mapping[str, Any]],
    tables: Sequence[Sequence[Sequence[str]]],
) -> dict[str, Any]:
    source = _text(projection.get("source"))
    approved = projection.get("approved") is True
    return {
        "schemaVersion": 1,
        "unit": _int(entry.get("unit")),
        "lessonId": _text(entry.get("lessonId")),
        "sourceSlide": _int(entry.get("sourceSlide")),
        "reviewStatus": _text(entry.get("status")),
        "clearTableSemanticsBlocker": entry.get("clearTableSemanticsBlocker") is True,
        "tableReferenceResolved": entry.get("clearTableSemanticsBlocker") is True,
        "projection": {
            "approved": approved,
            "mode": _text(projection.get("mode")) or ("structured" if tables else "text-only"),
            "source": source,
            "nativeIdentityConfirmed": projection.get("nativeIdentityConfirmed") is True,
            "notes": _text(projection.get("notes")),
            "tableCount": len(tables),
        },
        "tableBlock": {
            "mode": _text(projection.get("mode")) or ("structured" if tables else "text-only"),
            "source": source,
            "tableCount": len(tables),
            "tableReferenceResolved": entry.get("clearTableSemanticsBlocker") is True,
            "publishedSourceProjection": source == "published-visible-text",
            "nativeShapeProvenance": [
                {
                    key: copy.deepcopy(table[key])
                    for key in ("shapeId", "shapeName", "bbox", "columnWidths")
                    if key in table
                }
                for table in _as_list(projection.get("tables"))
                if isinstance(table, Mapping)
            ],
        },
        "sourceRefs": copy.deepcopy(list(refs)),
        "sourceEvidence": {
            "publishedTitle": _text((entry.get("sourceEvidence") or {}).get("publishedTitle"))
            if isinstance(entry.get("sourceEvidence"), Mapping)
            else "",
            "publishedVisibleTexts": copy.deepcopy(
                _as_list((entry.get("sourceEvidence") or {}).get("publishedVisibleTexts"))
            )
            if isinstance(entry.get("sourceEvidence"), Mapping)
            else [],
            "differences": copy.deepcopy((entry.get("sourceEvidence") or {}).get("differences", []))
            if isinstance(entry.get("sourceEvidence"), Mapping)
            else [],
        },
    }


def _apply_table_review(
    table_review_document: Mapping[str, Any] | None,
    sources: Sequence[Mapping[str, Any]],
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
) -> tuple[dict[str, Any], dict[tuple[int, int], dict[str, Any]]]:
    """Attach source-grounded table matrices without replacing published prose.

    The review artifact is deliberately applied before native-audit composition.
    A reviewed projection is therefore visible to the builder, while the
    native table payload is explicitly removed whenever the review records a
    published projection or correction so a mismatched PPTX candidate cannot
    override it later.
    """

    empty = {
        "status": "not-supplied",
        "entries": 0,
        "applied": 0,
        "structured": 0,
        "textOnly": 0,
        "publishedProjections": 0,
        "nativeProjections": 0,
        "excludedNativeTables": 0,
        "rejected": 0,
    }
    if table_review_document is None:
        return empty, {}
    raw_review = table_review_document.get("tableReview")
    if not isinstance(raw_review, Mapping):
        raise ComposeError("table review input must contain a tableReview object")
    policy = raw_review.get("reviewPolicy")
    if not isinstance(policy, Mapping) or any(policy.get(key) is not True for key in TABLE_REVIEW_POLICY_KEYS):
        raise ComposeError("table review source policy is incomplete or unsafe")
    raw_entries = raw_review.get("entries")
    if not isinstance(raw_entries, list):
        raise ComposeError("table review input has no entries list")

    summary = {**empty, "status": "applied", "entries": len(raw_entries)}
    decisions: dict[tuple[int, int], dict[str, Any]] = {}
    seen_keys: set[tuple[int, int]] = set()
    for raw_entry in raw_entries:
        if not isinstance(raw_entry, Mapping):
            blockers.append({"kind": "table", "code": "table-review-entry-invalid"})
            summary["rejected"] += 1
            continue
        unit = _int(raw_entry.get("unit"))
        lesson_id = _text(raw_entry.get("lessonId"))
        slide_number = _int(raw_entry.get("sourceSlide"))
        key = (unit or 0, slide_number or 0)
        if unit is None or slide_number is None or not lesson_id:
            blockers.append({"kind": "table", "unit": unit, "code": "table-review-identity-missing"})
            summary["rejected"] += 1
            continue
        if key in seen_keys:
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-duplicate-entry"})
            summary["rejected"] += 1
            continue
        seen_keys.add(key)
        source = sources_by_lesson.get(lesson_id)
        if source is None or sources_by_unit.get(unit) is not source:
            blockers.append(
                {
                    "kind": "table",
                    "unit": unit,
                    "lessonId": lesson_id,
                    "slide": slide_number,
                    "code": "table-review-source-identity-mismatch",
                }
            )
            summary["rejected"] += 1
            continue
        slide = _source_slide(source, slide_number)
        if slide is None:
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-slide-missing"})
            summary["rejected"] += 1
            continue

        refs = _table_review_refs(raw_entry)
        published_ref = _table_review_ref(refs, "published")
        native_ref = _table_review_ref(refs, "native")
        valid_refs = True
        for ref in refs:
            path_value = _text(ref.get("path"))
            expected_sha = _text(ref.get("sha256")).casefold()
            path = Path(_resolve_local_path(path_value, asset_roots)) if path_value else Path()
            if not path_value or not path.is_file() or not SHA256_RE.fullmatch(expected_sha):
                valid_refs = False
                blockers.append(
                    {
                        "kind": "table",
                        "unit": unit,
                        "slide": slide_number,
                        "code": "table-review-source-ref-missing-or-invalid",
                        "referenceKind": _text(ref.get("kind")),
                    }
                )
                continue
            if _table_review_file_sha(path) != expected_sha:
                valid_refs = False
                blockers.append(
                    {
                        "kind": "table",
                        "unit": unit,
                        "slide": slide_number,
                        "code": "table-review-source-ref-sha-mismatch",
                        "referenceKind": _text(ref.get("kind")),
                    }
                )
        if published_ref is None:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-published-ref-missing"})
        projection = raw_entry.get("approvedProjection")
        if not isinstance(projection, Mapping):
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-projection-missing"})
            summary["rejected"] += 1
            continue
        try:
            tables = _table_review_cells(projection)
        except ComposeError as exc:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-projection-invalid", "detail": str(exc)})
            tables = []

        source_kind = _text(projection.get("source"))
        approved = projection.get("approved") is True
        native_identity = projection.get("nativeIdentityConfirmed") is True
        mode = _text(projection.get("mode"))
        if source_kind == "native-a:tbl":
            if not approved or not native_identity or native_ref is None:
                valid_refs = False
                blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-native-projection-unproven"})
            for table in _as_list(projection.get("tables")):
                if not isinstance(table, Mapping) or not _text(table.get("shapeId")) or not isinstance(table.get("bbox"), Mapping) or not isinstance(table.get("columnWidths"), list):
                    valid_refs = False
                    blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-native-shape-provenance-missing"})
                    break
        elif source_kind == "published-visible-text":
            if not bool(policy.get("publishedSourceProjectionAllowedWhenNativeDiffers")) or not bool(policy.get("publishedSourceProjectionRequiresLiteralCellQuotes")):
                valid_refs = False
                blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-published-projection-policy-missing"})
            if native_identity:
                valid_refs = False
                blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-published-projection-native-identity-conflict"})
        elif source_kind:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-source-kind-unsupported"})

        if not raw_entry.get("clearTableSemanticsBlocker") is True:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-clearance-missing"})
        if not approved:
            if mode != "text-only" or tables:
                valid_refs = False
                blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-unapproved-projection"})
        elif not tables:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-approved-projection-empty"})

        published_document: Mapping[str, Any] | None = None
        if published_ref is not None:
            published_path_value = _text(published_ref.get("path"))
            published_path = Path(_resolve_local_path(published_path_value, asset_roots)) if published_path_value else Path()
            if published_path.is_file():
                loaded = _load_json(published_path)
                if isinstance(loaded, Mapping):
                    published_document = loaded
                    published_slide = _source_slide(loaded, slide_number)
                    if published_slide is None:
                        valid_refs = False
                        blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-published-slide-missing"})
                    elif _source_url(source) and _source_url(loaded) and _source_url(source) != _source_url(loaded):
                        valid_refs = False
                        blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-published-url-mismatch"})
            else:
                valid_refs = False
        source_text = _table_review_source_text(slide)
        evidence = raw_entry.get("sourceEvidence")
        evidence_text = _normalise_review_text("\n".join(_text(value) for value in _as_list(evidence.get("publishedVisibleTexts")))) if isinstance(evidence, Mapping) else ""
        if not evidence_text:
            valid_refs = False
            blockers.append({"kind": "table", "unit": unit, "slide": slide_number, "code": "table-review-source-quotes-missing"})
        for table in tables:
            for row in table:
                for cell in row:
                    if not cell:
                        continue
                    normalized_cell = _normalise_review_text(cell)
                    if not _table_review_contains(source_text, cell) or not _table_review_contains(evidence_text, cell):
                        valid_refs = False
                        blockers.append(
                            {
                                "kind": "table",
                                "unit": unit,
                                "slide": slide_number,
                                "code": "table-review-cell-source-mismatch",
                                "cell": cell,
                            }
                        )

        if not valid_refs:
            summary["rejected"] += 1
            continue
        metadata = _table_review_metadata(raw_entry, projection, refs, tables)
        # ``tables`` is the only learner-facing matrix. Shape/bbox evidence is
        # retained in tableReview/data and never substituted into cell text.
        slide["tables"] = [{"rows": copy.deepcopy(table)} for table in tables]
        slide["tableReview"] = metadata
        current_data = slide.get("data") if isinstance(slide.get("data"), Mapping) else {}
        slide["data"] = {**copy.deepcopy(dict(current_data)), "tableReview": copy.deepcopy(metadata)}
        if not approved:
            slide["tableSemantics"] = {
                "mode": "text-only",
                "tables": [],
                "tableReferenceResolved": True,
            }
            summary["textOnly"] += 1
        else:
            slide["tableSemantics"] = {
                "mode": _text(projection.get("mode")) or "structured",
                "tables": copy.deepcopy(tables),
                "tableReferenceResolved": True,
                "source": source_kind,
            }
            summary["structured"] += 1
            if source_kind == "published-visible-text":
                summary["publishedProjections"] += 1
            elif source_kind == "native-a:tbl":
                summary["nativeProjections"] += 1
        evidence_differences = raw_entry.get("sourceEvidence", {}).get("differences", []) if isinstance(raw_entry.get("sourceEvidence"), Mapping) else []
        exclude_native_tables = bool(evidence_differences) or (approved and source_kind == "published-visible-text")
        decision = {
            **metadata,
            "excludeNativeTables": exclude_native_tables,
            "excludeNativeTablesReason": (
                "published-projection" if source_kind == "published-visible-text" else "published-correction"
            ) if exclude_native_tables else "",
        }
        decisions[key] = decision
        if decision["excludeNativeTables"]:
            summary["excludedNativeTables"] += 1
        summary["applied"] += 1

    return summary, decisions


def _published_source_review_records(document: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Return the explicit published-source review records in stable order."""

    raw_records = document.get("records")
    if raw_records is None:
        raw_records = document.get("entries")
    if raw_records is None:
        raw_records = document.get("units")
    if isinstance(raw_records, Mapping):
        records: list[dict[str, Any]] = []
        for raw_unit, raw_record in raw_records.items():
            if not isinstance(raw_record, Mapping):
                continue
            record = copy.deepcopy(dict(raw_record))
            record.setdefault("unit", raw_unit)
            records.append(record)
        return records
    return [copy.deepcopy(dict(item)) for item in _as_list(raw_records) if isinstance(item, Mapping)]


def _published_source_review_proof_slides(record: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_proof = record.get("sourceProofSlides")
    if raw_proof is None:
        raw_proof = record.get("proofSlides")
    if raw_proof is None and isinstance(record.get("sourceProof"), Mapping):
        raw_proof = record["sourceProof"].get("slides")
    if raw_proof is None and isinstance(record.get("sourceEvidence"), Mapping):
        # The audit review writer stores the exact published-slide proof next
        # to its quoted visible text. Keep this compatibility path explicit;
        # identity and status are still validated by the caller.
        published_proof = record["sourceEvidence"].get("publishedSlideProof")
        if isinstance(published_proof, Mapping):
            raw_proof = [published_proof]
    if isinstance(raw_proof, Mapping):
        result: list[dict[str, Any]] = []
        for raw_number, raw_slide in raw_proof.items():
            if not isinstance(raw_slide, Mapping):
                continue
            slide = copy.deepcopy(dict(raw_slide))
            slide.setdefault("slideNumber", raw_number)
            result.append(slide)
        return result
    return [copy.deepcopy(dict(item)) for item in _as_list(raw_proof) if isinstance(item, Mapping)]


def _published_source_review_slide_text_sha_candidates(slide: Mapping[str, Any]) -> set[str]:
    values = [_text(value) for value in _as_list(slide.get("visibleTexts")) if _text(value)]
    if not values and _text(slide.get("title")):
        values = [_text(slide.get("title"))]
    raw_joined = "\n".join(values)
    normalized_joined = "\n".join(_normalise_review_text(value) for value in values)
    payloads = (
        raw_joined,
        normalized_joined,
        json.dumps(values, ensure_ascii=False, separators=(",", ":")),
    )
    return {hashlib.sha256(payload.encode("utf-8")).hexdigest() for payload in payloads}


def _published_source_review_proof_matches(
    proof: Mapping[str, Any],
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    asset_roots: Sequence[Path],
) -> bool:
    proof_container = proof.get("publishedSlideProof") or proof.get("slideProof") or proof.get("sourceProof")
    if isinstance(proof_container, Mapping):
        proof = {**copy.deepcopy(dict(proof_container)), **dict(proof)}
    proof_url = _text(
        proof.get("sourceUrl")
        or proof.get("sourceURL")
        or proof.get("publishedSourceUrl")
        or proof.get("publishedUrl")
    )
    if proof_url and proof_url != _source_url(source):
        return False
    proof_texts = proof.get("visibleTexts") or proof.get("publishedVisibleTexts")
    if proof_texts is None and isinstance(proof.get("sourceEvidence"), Mapping):
        proof_texts = proof["sourceEvidence"].get("visibleTexts") or proof["sourceEvidence"].get("publishedVisibleTexts")
    if proof_texts is None and isinstance(proof.get("sourceEvidence"), list):
        proof_texts = proof.get("sourceEvidence")
    if proof_texts is not None:
        actual = [_normalise_review_text(value) for value in _as_list(slide.get("visibleTexts")) if _text(value)]
        expected = [_normalise_review_text(value) for value in _as_list(proof_texts) if _text(value)]
        return bool(expected) and expected == actual
    digest = _text(
        proof.get("sourceSlideTextSha256")
        or proof.get("publishedSlideTextSha256")
        or proof.get("sourceTextSha256")
        or proof.get("textDigest")
    ).casefold()
    if digest:
        return bool(SHA256_RE.fullmatch(digest)) and digest in _published_source_review_slide_text_sha_candidates(slide)
    raw_ref = proof.get("proofRef") or proof.get("sourceRef")
    if isinstance(raw_ref, Mapping):
        raw_path = _text(raw_ref.get("path") or raw_ref.get("file"))
        expected_sha = _text(raw_ref.get("sha256") or raw_ref.get("sourceSha256")).casefold()
        path = Path(_resolve_local_path(raw_path, asset_roots)) if raw_path else Path()
        if raw_path and path.is_file() and SHA256_RE.fullmatch(expected_sha):
            try:
                return _sha256_file(path).casefold() == expected_sha
            except OSError:
                return False
    proof_sha = _text(proof.get("screenshotSha256") or proof.get("proofSha256")).casefold()
    proof_slide_url = _text(proof.get("publishedSlideUrl") or proof.get("slideUrl"))
    if (
        SHA256_RE.fullmatch(proof_sha)
        and proof_slide_url
        and _source_url(source)
        and proof_slide_url.startswith(_source_url(source))
    ):
        return True
    return False


def _published_source_review_tables(record: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_tables = record.get("reviewedTables")
    if raw_tables is None:
        raw_tables = record.get("tables")
    result: list[dict[str, Any]] = []
    for raw_table in _as_list(raw_tables):
        if not isinstance(raw_table, Mapping):
            continue
        table = copy.deepcopy(dict(raw_table))
        table.setdefault("slideNumber", table.get("sourceSlide"))
        result.append(table)
    return result


def _published_source_review_figures(record: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_figures = record.get("reviewedFigures")
    if raw_figures is None:
        raw_figures = record.get("figures")
    result: list[dict[str, Any]] = []
    for raw_figure in _as_list(raw_figures):
        if not isinstance(raw_figure, Mapping):
            continue
        figure = copy.deepcopy(dict(raw_figure))
        figure.setdefault("slideNumber", figure.get("sourceSlide"))
        result.append(figure)
    return result


def _published_source_review_table_rows(raw_table: Mapping[str, Any]) -> list[list[list[str]]]:
    projection = raw_table.get("approvedProjection") if isinstance(raw_table.get("approvedProjection"), Mapping) else raw_table
    raw_tables = projection.get("tables") if isinstance(projection, Mapping) else None
    if raw_tables is None and isinstance(projection, Mapping) and "rows" in projection:
        raw_tables = [projection]
    tables: list[list[list[str]]] = []
    for table in _as_list(raw_tables):
        raw_rows = table.get("rows") if isinstance(table, Mapping) else table
        if not isinstance(raw_rows, list) or not raw_rows:
            raise ComposeError("published source review table has no rows")
        rows: list[list[str]] = []
        for raw_row in raw_rows:
            if not isinstance(raw_row, list) or not raw_row:
                raise ComposeError("published source review table row must be a non-empty list")
            if any(not isinstance(value, str) for value in raw_row):
                raise ComposeError("published source review table cells must be strings")
            rows.append([value.strip() for value in raw_row])
        tables.append(rows)
    if not tables:
        raise ComposeError("published source review table has no reviewed matrix")
    return tables


def _published_source_review_notes(projection: Mapping[str, Any]) -> list[dict[str, str]]:
    """Normalize reviewed explanatory notes without flattening them away."""

    notes: list[dict[str, str]] = []
    for raw_note in _as_list(projection.get("notes")):
        if isinstance(raw_note, Mapping):
            heading = _text(raw_note.get("heading") or raw_note.get("title"))
            text = _text(raw_note.get("text") or raw_note.get("content") or raw_note.get("body"))
        else:
            heading = ""
            text = _text(raw_note)
        if not heading and not text:
            continue
        notes.append({"heading": heading, "text": text})
    return notes


def _published_source_review_notes_text(notes: Sequence[Mapping[str, Any]]) -> str:
    """Return the learner-visible note text while retaining every note."""

    parts: list[str] = []
    for note in notes:
        heading = _text(note.get("heading"))
        text = _text(note.get("text"))
        if heading and text:
            parts.append(f"{heading}: {text}")
        elif heading or text:
            parts.append(heading or text)
    return "\n".join(parts)


def _apply_published_source_review(
    document: Mapping[str, Any] | None,
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    scope: UnitScope = DEFAULT_UNIT_SCOPE,
) -> tuple[dict[str, Any], dict[int, dict[str, Any]]]:
    """Validate source-only review proof without creating native identity.

    A reviewed record is an explicit admission for a unit whose editable native
    presentation is unavailable.  It must still identify the exact published
    lesson and URL, prove every referenced slide, and keep table/figure
    projections tied to those slides.  A malformed or partial record never
    suppresses the normal native blocker.
    """

    empty = {
        "status": "not-supplied",
        "records": 0,
        "applied": 0,
        "reviewedSlides": 0,
        "reviewedTables": 0,
        "reviewedFigures": 0,
        "rejected": 0,
    }
    if document is None:
        return empty, {}
    if not isinstance(document, Mapping):
        raise ComposeError("published source review input must contain an object")
    course_id = _text(document.get("courseId"))
    if course_id and course_id != COURSE_ID:
        raise ComposeError("published source review course id does not match the course builder")
    records = _published_source_review_records(document)
    if not records:
        raise ComposeError("published source review input has no records list")
    summary = {**empty, "status": "applied", "records": len(records)}
    accepted: dict[int, dict[str, Any]] = {}
    seen_units: set[int] = set()
    for raw_record in records:
        unit = _int(raw_record.get("unit"))
        lesson_id = _text(raw_record.get("lessonId") or raw_record.get("sourceLessonId"))
        source_url = _text(raw_record.get("sourceUrl") or raw_record.get("sourceURL") or raw_record.get("publishedSourceUrl"))
        source = sources_by_unit.get(unit or 0)
        valid = True
        if unit is None or not scope.includes(unit) or unit in seen_units:
            if unit in seen_units:
                blockers.append({"kind": "source-review", "unit": unit, "code": "published-source-review-duplicate"})
            continue
        seen_units.add(unit)
        if source is None or not lesson_id or lesson_id != _lesson_id(source) or source_url != _source_url(source):
            blockers.append(
                {
                    "kind": "source-review",
                    "unit": unit,
                    "lessonId": lesson_id,
                    "code": "published-source-review-identity-mismatch",
                }
            )
            valid = False
        if _text(raw_record.get("status")).casefold() != PUBLISHED_SOURCE_REVIEW_STATUS:
            blockers.append(
                {
                    "kind": "source-review",
                    "unit": unit,
                    "code": "published-source-review-status-invalid",
                }
            )
            valid = False
        if source is None:
            continue
        proof_slides = _published_source_review_proof_slides(raw_record)
        if not proof_slides:
            blockers.append({"kind": "source-review", "unit": unit, "code": "published-source-review-proof-missing"})
            valid = False
        proof_by_slide: dict[int, dict[str, Any]] = {}
        for raw_proof in proof_slides:
            slide_number = _int(raw_proof.get("slideNumber") or raw_proof.get("publishedSlide") or raw_proof.get("number"))
            slide = _source_slide(source, slide_number or -1)
            if slide_number is None or slide is None:
                blockers.append(
                    {
                        "kind": "source-review",
                        "unit": unit,
                        "slide": slide_number,
                        "code": "published-source-review-slide-missing",
                    }
                )
                valid = False
                continue
            if slide_number in proof_by_slide:
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-duplicate-slide"})
                valid = False
                continue
            if not _published_source_review_proof_matches(raw_proof, source, slide, asset_roots):
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-proof-mismatch"})
                valid = False
                continue
            proof_by_slide[slide_number] = raw_proof
        tables_by_slide: dict[int, list[list[list[str]]]] = defaultdict(list)
        reviewed_tables_by_slide: dict[int, list[dict[str, Any]]] = defaultdict(list)
        review_tables = _published_source_review_tables(raw_record)
        for raw_table in review_tables:
            slide_number = _int(raw_table.get("slideNumber") or raw_table.get("sourceSlide"))
            if slide_number is None or slide_number not in proof_by_slide:
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-table-slide-unproven"})
                valid = False
                continue
            try:
                tables = _published_source_review_table_rows(raw_table)
            except ComposeError as exc:
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-table-invalid", "detail": str(exc)})
                valid = False
                continue
            source_text = _table_review_source_text(_source_slide(source, slide_number) or {})
            if any(
                value and not _table_review_contains(source_text, value)
                for table in tables
                for row in table
                for value in row
            ):
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-table-source-mismatch"})
                valid = False
                continue
            projection = raw_table.get("approvedProjection") if isinstance(raw_table.get("approvedProjection"), Mapping) else raw_table
            notes = _published_source_review_notes(projection)
            if any(
                value
                and not _table_review_contains(source_text, value)
                for note in notes
                for value in (note.get("text"),)
            ):
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-note-source-mismatch"})
                valid = False
                continue
            tables_by_slide[slide_number].extend(tables)
            reviewed_tables_by_slide[slide_number].append(
                {
                    **copy.deepcopy(dict(raw_table)),
                    "slideNumber": slide_number,
                    "tables": [{"rows": copy.deepcopy(matrix)} for matrix in tables],
                    "notes": copy.deepcopy(notes),
                }
            )
        figures = _published_source_review_figures(raw_record)
        canonical_figures: list[dict[str, Any]] = []
        for raw_figure in figures:
            slide_number = _int(raw_figure.get("slideNumber") or raw_figure.get("sourceSlide"))
            digest = _record_sha(raw_figure)
            path = _record_path(raw_figure)
            resolved_path = _resolve_local_path(path, asset_roots) if path else ""
            if (
                slide_number is None
                or slide_number not in proof_by_slide
                or raw_figure.get("confirmedInstructional") is not True
                or not SHA256_RE.fullmatch(digest)
                or not path
                or not Path(resolved_path).is_file()
            ):
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-figure-invalid"})
                valid = False
                continue
            canonical_figures.append(
                {
                    **copy.deepcopy(raw_figure),
                    "unit": unit,
                    "slideNumber": slide_number,
                    "sourceSha256": digest,
                    "sourcePath": resolved_path,
                    "sourceReview": True,
                }
            )
        if not valid:
            summary["rejected"] += 1
            continue
        canonical = {
            "unit": unit,
            "lessonId": lesson_id,
            "sourceUrl": source_url,
            "status": PUBLISHED_SOURCE_REVIEW_STATUS,
            "sourceProofSlides": [copy.deepcopy(proof_by_slide[number]) for number in sorted(proof_by_slide)],
            "reviewedTables": [
                table
                for number in sorted(reviewed_tables_by_slide)
                for table in reviewed_tables_by_slide[number]
            ],
            "reviewedFigures": canonical_figures,
        }
        table_conflict = False
        for number, matrices in tables_by_slide.items():
            slide = _source_slide(source, number)
            if slide is None:
                continue
            existing_tables = slide.get("tables") if isinstance(slide.get("tables"), list) else []
            existing_rows = [
                copy.deepcopy(table.get("rows"))
                for table in existing_tables
                if isinstance(table, Mapping) and isinstance(table.get("rows"), list)
            ]
            rows = [row for matrix in matrices for row in matrix]
            if existing_rows and existing_rows != rows:
                blockers.append({"kind": "source-review", "unit": unit, "slide": number, "code": "published-source-review-table-conflict"})
                table_conflict = True
                break
        if table_conflict:
            summary["rejected"] += 1
            continue
        for number, matrices in tables_by_slide.items():
            slide = _source_slide(source, number)
            if slide is None:
                continue
            existing_tables = slide.get("tables") if isinstance(slide.get("tables"), list) else []
            existing_rows = [
                copy.deepcopy(table.get("rows"))
                for table in existing_tables
                if isinstance(table, Mapping) and isinstance(table.get("rows"), list)
            ]
            if not existing_rows:
                slide["tables"] = [{"rows": copy.deepcopy(matrix)} for matrix in matrices]
            reviewed_slide_tables = reviewed_tables_by_slide[number]
            reviewed_table = reviewed_slide_tables[0] if reviewed_slide_tables else {}
            projection = reviewed_table.get("approvedProjection") if isinstance(reviewed_table.get("approvedProjection"), Mapping) else reviewed_table
            notes = [
                note
                for reviewed_slide_table in reviewed_slide_tables
                for note in _published_source_review_notes(
                    reviewed_slide_table.get("approvedProjection")
                    if isinstance(reviewed_slide_table.get("approvedProjection"), Mapping)
                    else reviewed_slide_table
                )
            ]
            projection = copy.deepcopy(dict(projection)) if isinstance(projection, Mapping) else {}
            projection["notes"] = copy.deepcopy(notes)
            source_evidence = reviewed_table.get("sourceEvidence")
            source_evidence = copy.deepcopy(dict(source_evidence)) if isinstance(source_evidence, Mapping) else {}
            note_text = _published_source_review_notes_text(notes)
            if note_text and not _text(source_evidence.get("publishedNote")):
                source_evidence["publishedNote"] = note_text
            review_status = _text(reviewed_table.get("status")) or PUBLISHED_SOURCE_REVIEW_STATUS
            table_review = {
                "schemaVersion": 1,
                "unit": unit,
                "lessonId": lesson_id,
                "sourceSlide": number,
                "reviewStatus": review_status,
                "clearTableSemanticsBlocker": reviewed_table.get("clearTableSemanticsBlocker") is not False,
                "tableReferenceResolved": reviewed_table.get("clearTableSemanticsBlocker") is not False,
                "projection": {
                    "approved": projection.get("approved") is not False,
                    "mode": _text(projection.get("mode")) or "structured",
                    "source": _text(projection.get("source")) or "published-visible-text",
                    "nativeIdentityConfirmed": projection.get("nativeIdentityConfirmed") is True,
                    "notes": copy.deepcopy(notes),
                    "tableCount": len(matrices),
                },
                "sourceRefs": copy.deepcopy(_as_list(reviewed_table.get("sourceRefs"))),
                "sourceEvidence": source_evidence,
            }
            slide["tableReview"] = table_review
            slide["tableSemantics"] = {
                "mode": "structured",
                "tables": copy.deepcopy(matrices),
                "tableReferenceResolved": True,
                "source": "published-visible-text",
                "nativeIdentityConfirmed": False,
                "approvedProjection": copy.deepcopy(projection),
            }
            slide_data = slide.get("data") if isinstance(slide.get("data"), Mapping) else {}
            slide["data"] = {
                **copy.deepcopy(dict(slide_data)),
                "tableReview": copy.deepcopy(slide["tableReview"]),
                "tableSemantics": copy.deepcopy(slide["tableSemantics"]),
            }
        if not canonical:
            continue
        for number, proof in proof_by_slide.items():
            slide = _source_slide(source, number)
            if slide is None:
                continue
            metadata = {
                "reviewStatus": PUBLISHED_SOURCE_REVIEW_STATUS,
                "nativeIdentityConfirmed": False,
                "unit": unit,
                "lessonId": lesson_id,
                "sourceUrl": source_url,
                "slideNumber": number,
                "proof": copy.deepcopy(proof),
            }
            slide["publishedSourceReview"] = metadata
            slide_data = slide.get("data") if isinstance(slide.get("data"), Mapping) else {}
            slide["data"] = {**copy.deepcopy(dict(slide_data)), "publishedSourceReview": copy.deepcopy(metadata)}
        accepted[unit] = canonical
        summary["applied"] += 1
        summary["reviewedSlides"] += len(proof_by_slide)
        summary["reviewedTables"] += sum(len(item.get("tables", [])) for item in canonical["reviewedTables"])
        summary["reviewedFigures"] += len(canonical_figures)
    for unit in scope.units:
        if unit not in accepted:
            blockers.append({"kind": "source-review", "unit": unit, "code": "published-source-review-record-missing"})
    return summary, accepted


def _normalise_review_text(value: Any) -> str:
    """Collapse published text for a conservative source-evidence comparison."""

    return " ".join(_text(value).split()).casefold()


def _review_item_evidence(item: Mapping[str, Any]) -> list[str]:
    values = [_text(value) for value in _as_list(item.get("sourceEvidence")) if _text(value)]
    for answer in _as_list(item.get("answerItems")):
        if isinstance(answer, Mapping):
            values.extend(_text(value) for value in _as_list(answer.get("evidence")) if _text(value))
    return values


def _review_item_source_slide(item: Mapping[str, Any], unit: int | None) -> int | None:
    """Read the explicit ``uNN-sNN`` source identity when it is trustworthy."""

    match = REVIEW_ITEM_ID_RE.match(_text(item.get("id")))
    if not match or unit is None or int(match.group("unit")) != unit:
        return None
    return int(match.group("slide"))


def _review_item_matches_slide(item: Mapping[str, Any], slide: Mapping[str, Any]) -> bool:
    """Require an exact published evidence substring before moving an item."""

    haystack = _normalise_review_text("\n".join(_as_list(slide.get("visibleTexts"))))
    if not haystack:
        return False
    return any(_normalise_review_text(value) in haystack for value in _review_item_evidence(item))


def _review_item_matching_slides(
    item: Mapping[str, Any],
    published_slides: Mapping[int, Mapping[str, Any]],
) -> list[int]:
    return [
        number
        for number, slide in published_slides.items()
        if _review_item_matches_slide(item, slide)
    ]


def _listening_evidence_values(entry: Mapping[str, Any], keys: Sequence[str]) -> list[str]:
    """Read explicit listening placement evidence without inferring it."""

    values: list[str] = []
    for key in keys:
        raw = entry.get(key)
        if isinstance(raw, Mapping):
            raw = raw.get("evidence") or raw.get("visibleTexts") or raw.get("text")
        values.extend(_text(value) for value in _as_list(raw) if _text(value))
        if values:
            break
    return values


def _listening_evidence_matches_slide(
    source: Mapping[str, Any],
    slide_number: int | None,
    evidence: Sequence[str],
) -> bool:
    """Require each supplied evidence string to occur on the exact source slide."""

    if slide_number is None or not evidence:
        return False
    slide = _source_slide(source, slide_number)
    if not slide:
        return False
    haystack = _normalise_review_text("\n".join(_as_list(slide.get("visibleTexts"))))
    return bool(haystack) and all(_normalise_review_text(value) in haystack for value in evidence)


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
    scope: UnitScope = DEFAULT_UNIT_SCOPE,
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
        if not scope.includes(unit):
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
    expected = set(scope.units)
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


def _record_destination_path(record: Mapping[str, Any]) -> str:
    """Return the staged browser asset path when staging records expose it."""

    for key in (
        "destinationPath",
        "outputPath",
        "stagedPath",
        "optimizedPath",
        "publicPath",
    ):
        value = _text(record.get(key))
        if value:
            return value
    return ""


def _verified_media_source_path(
    candidate_path: Any,
    staged: Mapping[str, Any],
    expected_sha256: str,
    roots: Sequence[Path],
) -> str | None:
    """Resolve the immutable original from either review or staging evidence.

    Review records can retain a path from the source-import worktree while the
    composer runs from the application worktree.  A staged record carries the
    authoritative absolute source path in that case.  A path is accepted only
    after hashing its bytes against the reviewed source digest.
    """

    expected = _text(expected_sha256).casefold()
    if not SHA256_RE.fullmatch(expected):
        return None
    paths: list[str] = []
    for raw in (candidate_path, _record_path(staged)):
        resolved = _resolve_local_path(raw, roots)
        if resolved and resolved not in paths:
            paths.append(resolved)
    for raw in paths:
        path = Path(raw)
        if not path.is_file():
            continue
        try:
            actual = _sha256_file(path).casefold()
        except OSError:
            continue
        if actual == expected:
            return str(path.resolve())
    return None


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
    scope: UnitScope = DEFAULT_UNIT_SCOPE,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    reviewed_audio_by_key, _ = _index_reviewed_media(reviewed)
    staged_records = _media_records(staged, "audio")
    staged_by_id, staged_by_sha = _staged_index(staged_records)
    scoped_staged_records = [
        record for record in staged_records if scope.includes(_unit_from_value(record))
    ]
    reviewed_records = _media_records(reviewed, "audio")
    scoped_reviewed_records = [
        record for record in reviewed_records if scope.includes(_unit_from_value(record))
    ]
    if not staged_records and reviewed_records:
        # This path is deliberately still blocked below because reviewed media
        # has immutable source data but no staged browser URL.
        staged_records = []
    merged: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for source_item in scoped_reviewed_records or scoped_staged_records:
        identifier = _record_id(source_item)
        digest = _record_sha(source_item)
        staged_item = staged_by_id.get(identifier) or staged_by_sha.get(digest)
        item = _merge_staged_record(staged_item, source_item)
        if not identifier:
            identifier = _record_id(item)
        unit = _unit_from_value(item)
        if unit is None:
            unit = _unit_from_value(source_item)
        if not scope.includes(unit):
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
    expected = sum(1 for unit in sources_by_unit if scope.includes(unit))
    if len(merged) != len(scoped_reviewed_records) and scoped_reviewed_records:
        blockers.append(
            {
                "kind": "audio",
                "code": "audio-record-count-mismatch",
                "expected": len(scoped_reviewed_records),
                "actual": len(merged),
            }
        )
    return sorted(merged, key=lambda item: (item["unit"], item.get("audioNumber") or 10**6, item["id"])), {
        "reviewedRecords": len(scoped_reviewed_records),
        "stagedRecords": len(scoped_staged_records),
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
    figure_proof: Mapping[str, Any] | None = None,
    figure_proof_ref: str = "",
    scope: UnitScope = DEFAULT_UNIT_SCOPE,
    published_source_review: Mapping[int, Mapping[str, Any]] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[tuple[int, int, str]] = set()
    proof_refs: dict[tuple[int, int, str], dict[str, Any]] = {}
    confirmed_units = reviewed_figures.get("units", {}) if isinstance(reviewed_figures, Mapping) else {}
    if isinstance(confirmed_units, list):
        confirmed_units = {str(item.get("unit")): item for item in confirmed_units if isinstance(item, Mapping)}
    for unit in scope.units:
        unit_entry = confirmed_units.get(str(unit), {}) if isinstance(confirmed_units, Mapping) else {}
        if unit in {33, 34, 35, 36}:
            # These decks have no whole-deck native match.  Their figures are
            # admitted only through the separately reviewed proof/correspondence
            # artifact handled below.
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
    for raw_unit, review in (published_source_review or {}).items():
        unit = _int(raw_unit)
        if unit is None or not scope.includes(unit) or not isinstance(review, Mapping):
            continue
        for raw_figure in _as_list(review.get("reviewedFigures")):
            if not isinstance(raw_figure, Mapping):
                continue
            slide_number = _int(raw_figure.get("slideNumber") or raw_figure.get("sourceSlide"))
            digest = _record_sha(raw_figure)
            path = _record_path(raw_figure)
            resolved_path = _resolve_local_path(path, asset_roots) if path else ""
            if slide_number is None or not digest or not path or not Path(resolved_path).is_file():
                # The source-review validator normally catches this first; keep
                # this guard so a direct helper call cannot admit an unscoped
                # figure into the staged media path.
                blockers.append({"kind": "image", "unit": unit, "slide": slide_number, "code": "published-source-review-figure-invalid"})
                continue
            candidates.append(
                {
                    "unit": unit,
                    "slideNumber": slide_number,
                    "sourceSha256": digest,
                    "sourcePath": resolved_path,
                    "purpose": _text(raw_figure.get("purpose") or raw_figure.get("sourcePurpose")),
                    "reviewedFigure": copy.deepcopy(dict(raw_figure)),
                    "mapping": "published-source-review",
                    "sourceProofRef": copy.deepcopy(raw_figure.get("sourceProof"))
                    if isinstance(raw_figure.get("sourceProof"), Mapping)
                    else {},
                }
            )
    if isinstance(figure_proof, Mapping):
        # A proof entry may independently verify a figure on any published
        # slide. Units 33-36 have no reviewed-figures admission path, while
        # Unit 5 uses this same exact proof to preserve its portrait when the
        # native prose alignment remains below threshold.
        proof_units = figure_proof.get("units", [])
        if isinstance(proof_units, Mapping):
            proof_units = list(proof_units.values())
        for unit_entry in _as_list(proof_units):
            if not isinstance(unit_entry, Mapping):
                continue
            unit = _int(unit_entry.get("unit"))
            for slide_entry in _as_list(unit_entry.get("requiredSlides")):
                if not isinstance(slide_entry, Mapping):
                    continue
                published_slide = _int(slide_entry.get("publishedSlide"))
                observed_slide = _text(slide_entry.get("observedSlideUrlSuffix"))
                for item in _as_list(slide_entry.get("candidates")):
                    if not isinstance(item, Mapping):
                        continue
                    candidate_slide = _int(item.get("publishedSlide"))
                    native_digest = _text(item.get("nativeSha256")).casefold()
                    published_digest = _text(item.get("publishedReferenceSha256")).casefold()
                    path = _text(item.get("nativePath"))
                    exact = (
                        unit is not None
                        and
                        published_slide is not None
                        and candidate_slide == published_slide
                        and bool(observed_slide)
                        and _text(item.get("visualStatus")).casefold() == "confirmed"
                        and item.get("byteExactMatch") is True
                        and bool(SHA256_RE.fullmatch(native_digest))
                        and native_digest == published_digest
                        and bool(path)
                    )
                    if not exact:
                        blockers.append(
                            {
                                "kind": "image",
                                "unit": unit,
                                "slide": published_slide or candidate_slide,
                                "code": "figure-proof-not-exact",
                            }
                        )
                        continue
                    proof_ref = {
                        "manifest": figure_proof_ref,
                        "unit": unit,
                        "publishedSlideNumber": published_slide,
                        "publishedMediaOrdinal": _int(item.get("publishedMediaOrdinal")),
                        "observedSlideUrlSuffix": observed_slide,
                        "publishedReferencePath": _text(item.get("publishedReferencePath")),
                        "publishedReferenceSha256": published_digest,
                        "publishedReferenceBytes": _int(item.get("publishedReferenceBytes")),
                        "byteExactMatch": True,
                    }
                    proof_refs[(unit, published_slide, native_digest)] = proof_ref
                    candidates.append(
                        {
                            "unit": unit,
                            "slideNumber": published_slide,
                            "sourceSha256": native_digest,
                            "sourcePath": _resolve_local_path(path, asset_roots),
                            "purpose": _text(slide_entry.get("publishedTitle")),
                            "reviewedFigure": copy.deepcopy(dict(item)),
                            "mapping": (
                                "units-33-36-visual-proof"
                                if unit in {33, 34, 35, 36}
                                else "visual-proof"
                            ),
                            "sourceProofRef": proof_ref,
                        }
                    )
    else:
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
    for candidate in candidates:
        proof_ref = proof_refs.get(
            (
                _int(candidate.get("unit")) or 0,
                _int(candidate.get("slideNumber")) or 0,
                _text(candidate.get("sourceSha256")).casefold(),
            )
        )
        if proof_ref is not None:
            candidate["sourceProofRef"] = copy.deepcopy(proof_ref)
            if candidate.get("mapping") == "reviewed-figures":
                candidate["mapping"] = "reviewed-figures+visual-proof"
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
        source_path = _verified_media_source_path(
            candidate["sourcePath"],
            staged,
            digest,
            asset_roots,
        )
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
        if source_path is None:
            candidate_path = _resolve_local_path(candidate["sourcePath"], asset_roots)
            source_exists = Path(candidate_path).is_file()
            blockers.append(
                {
                    "kind": "image",
                    "unit": unit,
                    "slide": slide,
                    "sourceSha256": digest,
                    "code": "figure-source-sha-mismatch" if source_exists else "figure-source-file-missing",
                }
            )
        destination_path = _record_destination_path(staged)
        destination_sha = _text(
            staged.get("outputSha256")
            or staged.get("destinationSha256")
            or staged.get("optimizedSha256")
        ).casefold()
        if destination_path:
            resolved_destination = _resolve_local_path(destination_path, asset_roots)
            if not Path(resolved_destination).is_file():
                blockers.append(
                    {
                        "kind": "image",
                        "unit": unit,
                        "slide": slide,
                        "sourceSha256": digest,
                        "code": "figure-destination-file-missing",
                    }
                )
            elif destination_sha and SHA256_RE.fullmatch(destination_sha):
                try:
                    actual_destination_sha = _sha256_file(Path(resolved_destination)).casefold()
                except OSError:
                    actual_destination_sha = ""
                if actual_destination_sha != destination_sha:
                    blockers.append(
                        {
                            "kind": "image",
                            "unit": unit,
                            "slide": slide,
                            "sourceSha256": digest,
                            "code": "figure-destination-sha-mismatch",
                            "destinationSha256": destination_sha,
                            "observedDestinationSha256": actual_destination_sha,
                        }
                    )
        destination_ready = True
        if destination_path:
            resolved_destination = _resolve_local_path(destination_path, asset_roots)
            destination_ready = Path(resolved_destination).is_file()
            if destination_ready and destination_sha and SHA256_RE.fullmatch(destination_sha):
                try:
                    destination_ready = _sha256_file(Path(resolved_destination)).casefold() == destination_sha
                except OSError:
                    destination_ready = False
        if status not in READY_MEDIA_STATUSES or not public_url or source_path is None or not destination_ready:
            continue
        trace = copy.deepcopy(candidate.get("reviewedFigure") or {})
        trace["sourceSha256"] = digest
        trace["sourcePath"] = source_path
        trace["verifiedSourceSha256"] = digest
        if destination_path:
            trace["stagedDestinationPath"] = _resolve_local_path(destination_path, asset_roots)
            if destination_sha:
                trace["stagedDestinationSha256"] = destination_sha
        trace["mapping"] = candidate["mapping"]
        if candidate.get("sourceProofRef"):
            trace["sourceProofRef"] = copy.deepcopy(candidate["sourceProofRef"])
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
                **(
                    {"sourceProofRef": copy.deepcopy(candidate["sourceProofRef"])}
                    if candidate.get("sourceProofRef")
                    else {}
                ),
            }
        )
    return ready_figures, {
        "candidateReferences": len(candidates),
        "readyReferences": len(ready_figures),
        "uniqueSourceSha256": len({item["sourceSha256"] for item in ready_figures}),
        "unitsWithFigures": len({item["unit"] for item in ready_figures}),
        "mappingCounts": dict(Counter(item.get("mapping") for item in candidates)),
    }


def _attach_published_source_review(
    published_source_review: Mapping[int, Mapping[str, Any]],
    figures: Sequence[Mapping[str, Any]],
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    blockers: list[dict[str, Any]],
) -> None:
    """Expose reviewed source-only media through the builder's slide contract."""

    figure_map: dict[tuple[int, int], list[Mapping[str, Any]]] = defaultdict(list)
    for figure in figures:
        unit = _int(figure.get("unit"))
        slide = _int(figure.get("slideNumber"))
        evidence = figure.get("nativeEvidence")
        mapping = evidence.get("mapping") if isinstance(evidence, Mapping) else None
        if unit is not None and slide is not None and mapping == "published-source-review":
            figure_map[(unit, slide)].append(figure)
    for raw_unit, review in published_source_review.items():
        unit = _int(raw_unit)
        source = sources_by_unit.get(unit or 0)
        if unit is None or not isinstance(review, Mapping) or not isinstance(source, Mapping):
            continue
        for proof in _as_list(review.get("sourceProofSlides")):
            if not isinstance(proof, Mapping):
                continue
            slide_number = _int(proof.get("slideNumber") or proof.get("publishedSlide") or proof.get("number"))
            slide = _source_slide(source, slide_number or -1)
            if slide is None or slide_number is None:
                continue
            existing = slide.get("_nativeAudit") if isinstance(slide.get("_nativeAudit"), Mapping) else {}
            if existing.get("nativeIdentityConfirmed") is True:
                blockers.append({"kind": "source-review", "unit": unit, "slide": slide_number, "code": "published-source-review-native-identity-conflict"})
                continue
            payload = copy.deepcopy(dict(existing))
            payload.update(
                {
                    "recordId": f"published-source-review-u{unit}-s{slide_number}",
                    "slideNumber": slide_number,
                    "sourceRole": "published-source-review",
                    "nativeIdentityConfirmed": False,
                    "sourceReview": {
                        "unit": unit,
                        "lessonId": _lesson_id(source),
                        "sourceUrl": _source_url(source),
                        "status": PUBLISHED_SOURCE_REVIEW_STATUS,
                        "proof": copy.deepcopy(dict(proof)),
                    },
                }
            )
            payload.setdefault("paragraphs", [])
            payload.setdefault("tables", None)
            payload["figures"] = copy.deepcopy(figure_map.get((unit, slide_number), []))
            payload["figureEvidencePresent"] = bool(payload["figures"])
            payload.setdefault("audio", [])
            payload.setdefault("nativeTexts", [])
            slide["_nativeAudit"] = payload


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


def _vector_review_index(vector_review: Mapping[str, Any] | None) -> dict[tuple[int, int], Mapping[str, Any]]:
    """Index source-verified vector projections by unit and published slide."""

    if not isinstance(vector_review, Mapping):
        return {}
    entries: list[Mapping[str, Any]] = []
    raw_units = vector_review.get("units")
    if isinstance(raw_units, Mapping):
        entries.extend(item for item in raw_units.values() if isinstance(item, Mapping))
    elif isinstance(raw_units, list):
        entries.extend(item for item in raw_units if isinstance(item, Mapping))
    else:
        entries.append(vector_review)
    result: dict[tuple[int, int], Mapping[str, Any]] = {}
    for entry in entries:
        scope = entry.get("scope") if isinstance(entry.get("scope"), Mapping) else entry
        slide = entry.get("slide") if isinstance(entry.get("slide"), Mapping) else entry
        unit = _int(scope.get("unit") if isinstance(scope, Mapping) else None)
        published_slide = _int(
            slide.get("publishedSlide")
            if isinstance(slide, Mapping)
            else None
        )
        if published_slide is None and isinstance(scope, Mapping):
            published_slide = _int(scope.get("publishedSlide"))
        if unit is None or published_slide is None:
            continue
        result[(unit, published_slide)] = entry
    return result


def _vector_review_source_url(vector_review: Mapping[str, Any]) -> str:
    source = vector_review.get("source")
    if isinstance(source, Mapping):
        return _text(source.get("publishedSourceUrl") or source.get("sourceUrl"))
    return _text(vector_review.get("publishedSourceUrl") or vector_review.get("sourceUrl"))


def _compose_native_audit(
    native_audit: Mapping[str, Any] | None,
    reviewed_figures: Mapping[str, Any] | None,
    correspondence: Mapping[str, Any] | None,
    native_match: Mapping[str, Any] | None,
    figures: Sequence[Mapping[str, Any]],
    sources_by_unit: Mapping[int, Mapping[str, Any]],
    blockers: list[dict[str, Any]],
    table_reviews: Mapping[tuple[int, int], Mapping[str, Any]] | None = None,
    vector_review: Mapping[str, Any] | None = None,
    scope: UnitScope = DEFAULT_UNIT_SCOPE,
    published_source_review: Mapping[int, Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    reviewed_units = {
        unit
        for unit in (published_source_review or {})
        if isinstance(unit, int) and scope.includes(unit)
    }
    if not isinstance(native_audit, Mapping) and not reviewed_units:
        blockers.append({"kind": "native", "code": "native-audit-missing"})
        return {"schemaVersion": 1, "records": []}
    raw_records = [item for item in _as_list(native_audit.get("records")) if isinstance(item, Mapping)] if isinstance(native_audit, Mapping) else []
    candidate_ids = _native_candidate_ids(reviewed_figures, correspondence, native_match)
    vector_reviews = _vector_review_index(vector_review)
    figure_map: dict[tuple[int, int], list[Mapping[str, Any]]] = defaultdict(list)
    for figure in figures:
        figure_map[(int(figure["unit"]), int(figure["slideNumber"]))].append(figure)
    selected: list[dict[str, Any]] = []
    for unit in scope.units:
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
            if unit in reviewed_units:
                continue
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
                vector_entry = vector_reviews.get((unit, number or 0))
                if vector_entry is not None:
                    expected_url = _vector_review_source_url(vector_entry)
                    if expected_url and expected_url != _source_url(source or {}):
                        blockers.append(
                            {
                                "kind": "native",
                                "unit": unit,
                                "slide": number,
                                "code": "vector-review-source-url-mismatch",
                            }
                        )
                    else:
                        structured = vector_entry.get("structuredContent")
                        if isinstance(structured, Mapping):
                            tables = structured.get("tables")
                            if tables and not slide.get("tables"):
                                slide["tables"] = copy.deepcopy(tables)
                            slide["vectorStructuredContent"] = copy.deepcopy(dict(structured))
                            data = structured.get("data")
                            figure_proof = data.get("figureProof") if isinstance(data, Mapping) else None
                            if isinstance(figure_proof, Mapping):
                                # Keep the vector proof separate from raster
                                # ``figures``. The builder/control layer can
                                # accept this as a confirmed visual source
                                # without fabricating an image URL.
                                slide["vectorFigureProof"] = copy.deepcopy(dict(figure_proof))
                table_review = (table_reviews or {}).get((unit, number or 0))
                if isinstance(table_review, Mapping) and table_review.get("excludeNativeTables") is True:
                    # A published-visible-text projection is authoritative for
                    # this reviewed mismatch. Remove both the explicit table
                    # payload and table-like shapes so the builder cannot fall
                    # back to the rejected native matrix.
                    for key in ("tables", "actualTables", "tableData", "structuredTables"):
                        if key in slide:
                            slide[key] = []
                    shapes = slide.get("shapes")
                    if isinstance(shapes, list):
                        slide["shapes"] = [
                            shape
                            for shape in shapes
                            if not (
                                isinstance(shape, Mapping)
                                and (
                                    "table" in _text(shape.get("kind") or shape.get("type")).casefold()
                                    or "table" in _text(shape.get("shapeType")).casefold()
                                    or any(key in shape for key in ("rows", "cells", "columns"))
                                )
                            )
                        ]
                    slide["tableReview"] = copy.deepcopy(dict(table_review))
                if number is not None and figure_map.get((unit, number)):
                    slide["figures"] = copy.deepcopy(figure_map[(unit, number)])
                slides.append(slide)
            native_copy["slides"] = slides
            record["native"] = native_copy
        selected.append(record)
    return {
        "schemaVersion": native_audit.get("schemaVersion", 1) if isinstance(native_audit, Mapping) else 1,
        "source": "composed published-priority native audit",
        "_auditPath": "course-builder-native-audit.json",
        "records": selected,
        "publishedSourceReview": [
            copy.deepcopy(dict(reviewed))
            for unit, reviewed in sorted((published_source_review or {}).items())
            if isinstance(reviewed, Mapping) and scope.includes(_int(unit))
        ],
        **({"vectorReview": copy.deepcopy(dict(vector_review))} if isinstance(vector_review, Mapping) else {}),
    }


def _normalise_review_placements(
    lesson_id: str,
    lesson_review: Mapping[str, Any],
    source: Mapping[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Repair only deterministic source-item placement errors.

    The review export occasionally nests an item under the preceding slide
    while its stable ``uNN-sNN`` id and source evidence identify the next
    published slide.  Moving that item is metadata normalization: the item
    text, answer, status, and evidence remain byte-for-byte unchanged.  A
    move is admitted only when the target slide exists and one of the item's
    evidence strings is an exact published-text substring.  Ambiguous entries
    stay where they were and remain subject to the builder's blockers.
    """

    result = copy.deepcopy(dict(lesson_review))
    raw_slides = result.get("slides")
    if not isinstance(raw_slides, Mapping):
        return result, []
    unit = _unit_from_value(_source_deck(source))
    published_slides = {
        number: slide
        for number in (_int(item.get("number")) for item in _source_slides(source))
        if number is not None
        for slide in [_source_slide(source, number)]
        if slide is not None
    }
    slides = {str(key): copy.deepcopy(value) for key, value in raw_slides.items()}
    moves: list[tuple[str, str, dict[str, Any]]] = []
    fixes: list[dict[str, Any]] = []
    for raw_key, raw_slide in slides.items():
        current = _int(raw_key)
        if current is None or not isinstance(raw_slide, Mapping):
            continue
        items = raw_slide.get("items")
        if not isinstance(items, list):
            continue
        kept: list[Any] = []
        for raw_item in items:
            if not isinstance(raw_item, Mapping):
                kept.append(raw_item)
                continue
            target = _review_item_source_slide(raw_item, unit)
            evidence_targets = _review_item_matching_slides(raw_item, published_slides)
            # A few source exports have a stable item id with the preceding
            # slide number (for example ``u46-s13-b``), while the exact source
            # evidence occurs on the following published slide.  Use that
            # unique evidence location only when the current slide does not
            # match and no competing slide matches.
            if not _review_item_matches_slide(raw_item, published_slides.get(current, {})) and len(evidence_targets) == 1:
                target = evidence_targets[0]
            if (
                target is None
                or target == current
                or target not in published_slides
                or not _review_item_matches_slide(raw_item, published_slides[target])
            ):
                kept.append(raw_item)
                continue
            target_key = str(target)
            moves.append((raw_key, target_key, copy.deepcopy(dict(raw_item))))
            fixes.append(
                {
                    "lessonId": lesson_id,
                    "itemId": _text(raw_item.get("id")),
                    "fromSlide": current,
                    "toSlide": target,
                    "evidenceMatchedPublishedSource": True,
                }
            )
        raw_slide["items"] = kept
    for _from_key, target_key, item in moves:
        target_slide = slides.get(target_key)
        if not isinstance(target_slide, Mapping):
            # The target was checked against the published source above. Keep
            # this defensive branch so a malformed review map cannot drop an
            # item during normalization.
            continue
        target_items = target_slide.get("items")
        if not isinstance(target_items, list):
            target_slide["items"] = []
        target_slide["items"].append(item)
    result["slides"] = slides
    return result, fixes


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _semantic_patch_entries(patch: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    entries: list[Mapping[str, Any]] = []
    for key in ("resolved", "reviewedOpenResponse"):
        entries.extend(item for item in _as_list(patch.get(key)) if isinstance(item, Mapping))
    return entries


def _patch_item_parts(item_id: str) -> tuple[str, str | None]:
    base, separator, nested = item_id.partition(":")
    return base, nested if separator and nested else None


def _patch_rekey_item(item_id: str, source_slide: int | None) -> str:
    if source_slide is None:
        return item_id
    match = re.match(r"^(u\d+-)s\d+(-.+)$", item_id, flags=re.IGNORECASE)
    if not match:
        return item_id
    return f"{match.group(1)}s{source_slide:02d}{match.group(2)}"


def _published_source_text(source: Mapping[str, Any]) -> str:
    return "\n".join(
        _text(value)
        for slide in _source_slides(source)
        for value in _as_list(slide.get("visibleTexts"))
        if _text(value)
    )


def _apply_exercise_semantic_patch(
    exercise_review: Mapping[str, Any] | None,
    patch: Mapping[str, Any] | None,
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    patch_ref: str,
) -> tuple[Mapping[str, Any] | None, dict[str, Any]]:
    """Apply an explicitly supplied, source-validated semantic review patch.

    The patch is opt-in at the CLI.  Every applied entry must identify the
    current review item, its published source slide, a provenance file whose
    SHA-256 matches, and source evidence present in the published manifest.
    Remaining hard blocks are reported by the patch and are deliberately not
    applied.
    """

    if not isinstance(patch, Mapping):
        return exercise_review, {"status": "not-supplied", "applied": 0, "remainingHardBlocks": 0}
    if not isinstance(exercise_review, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-missing-for-semantic-patch"})
        return exercise_review, {"status": "blocked", "applied": 0, "remainingHardBlocks": len(_as_list(patch.get("remainingHardBlocks")))}
    policy = patch.get("sourcePolicy")
    required_policy = (
        "publishedSlidesAuthoritative",
        "sourceFilesReadOnly",
        "preserveOriginalPromptsAndProvenance",
        "noInventedAudioOrIdentities",
        "ambiguousClaimsMustBeRewordedOrRemainBlocked",
        "openResponseNeverGetsSyntheticAnswerKey",
        "reviewedOpenResponseHasNoSyntheticAnswerKey",
    )
    if not isinstance(policy, Mapping) or any(policy.get(key) is not True for key in required_policy):
        raise ComposeError("semantic patch source policy is incomplete or unsafe")
    result = copy.deepcopy(dict(exercise_review))
    raw_lessons = result.get("lessons")
    if not isinstance(raw_lessons, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-lessons-missing-for-semantic-patch"})
        return result, {"status": "blocked", "applied": 0, "remainingHardBlocks": len(_as_list(patch.get("remainingHardBlocks")))}
    entries = _semantic_patch_entries(patch)
    applied: list[str] = []
    rejected: list[dict[str, Any]] = []
    seen_patch_ids: set[str] = set()
    for patch_item in entries:
        raw_item_id = _text(patch_item.get("itemId") or patch_item.get("sourceItemId"))
        base_item_id, nested_id = _patch_item_parts(raw_item_id)
        lesson_id = _text(patch_item.get("lessonId"))
        lesson = raw_lessons.get(lesson_id)
        provenance = patch_item.get("provenance")
        source = sources_by_lesson.get(lesson_id)
        reason: str | None = None
        target_item: dict[str, Any] | None = None
        current_slide: int | None = None
        current_slide_items: list[Any] | None = None
        target_slide = _int(patch_item.get("publishedSourceSlide"))
        if not base_item_id or not lesson_id or not isinstance(lesson, Mapping):
            reason = "item-or-lesson-missing"
        elif not isinstance(source, Mapping):
            reason = "published-source-missing"
        elif raw_item_id in seen_patch_ids:
            reason = "duplicate-patch-item"
        else:
            seen_patch_ids.add(raw_item_id)
        if reason is None:
            for raw_slide, slide in lesson.get("slides", {}).items() if isinstance(lesson.get("slides"), Mapping) else []:
                if not isinstance(slide, Mapping) or not isinstance(slide.get("items"), list):
                    continue
                for item in slide["items"]:
                    if not isinstance(item, Mapping) or _text(item.get("id")) != base_item_id:
                        continue
                    target_item = item
                    current_slide = _int(raw_slide)
                    current_slide_items = slide["items"]
                    break
                if target_item is not None:
                    break
            if target_item is None:
                reason = "review-item-missing"
        if reason is None and target_slide is None:
            reason = "published-source-slide-missing"
        published_slide = _source_slide(source or {}, target_slide or -1)
        if reason is None and published_slide is None:
            reason = "published-source-slide-not-found"
        if reason is None and isinstance(provenance, Mapping):
            provenance_file = _text(provenance.get("file"))
            provenance_path = Path(_resolve_local_path(provenance_file, asset_roots))
            expected_sha = _text(provenance.get("sha256")).casefold()
            if not provenance_file or not provenance_path.is_file() or not SHA256_RE.fullmatch(expected_sha):
                reason = "provenance-file-missing-or-sha-invalid"
            elif _sha256_file(provenance_path).casefold() != expected_sha:
                reason = "provenance-sha-mismatch"
            elif _text(provenance.get("sourceUrl")) != _source_url(source or {}):
                reason = "provenance-source-url-mismatch"
            elif _source_slide(source or {}, _int(provenance.get("publishedSlide")) or -1) is None:
                reason = "provenance-slide-missing"
        elif reason is None:
            reason = "provenance-missing"
        if reason is None and isinstance(target_item, Mapping):
            original_prompt = _text(patch_item.get("originalPrompt"))
            if original_prompt and _normalise_review_text(original_prompt) != _normalise_review_text(target_item.get("prompt")):
                reason = "original-prompt-mismatch"
        source_text = _normalise_review_text(_published_source_text(source or {}))
        source_evidence = [_text(value) for value in _as_list(patch_item.get("sourceEvidence")) if _text(value)]
        if reason is None and not source_evidence:
            reason = "source-evidence-missing"
        if reason is None and not all(_normalise_review_text(value) in source_text for value in source_evidence):
            reason = "source-evidence-mismatch"
        if reason is not None:
            blocker = {
                "kind": "exercise",
                "lessonId": lesson_id,
                "itemId": raw_item_id,
                "unit": _int(patch_item.get("unit")),
                "code": f"exercise-semantic-patch-{reason}",
            }
            blockers.append(blocker)
            rejected.append(blocker)
            continue

        assert target_item is not None and current_slide_items is not None and current_slide is not None
        updated = target_item
        original_prompt = _text(updated.get("prompt"))
        original_status = _text(updated.get("reviewStatus"))
        revised_prompt = _text(patch_item.get("revisedPrompt"))
        if revised_prompt:
            updated["prompt"] = revised_prompt
        if _text(patch_item.get("reviewStatus")):
            patch_status = _text(patch_item.get("reviewStatus"))
            # Keep the manual status in semanticPatch provenance while using
            # the builder's small, explicit status vocabulary for the merged
            # review. Open response remains teacher/AI formative feedback and
            # never receives a deterministic answer key.
            if (
                _text(patch_item.get("responseMode")).casefold() == "open-response"
                or patch_item.get("doNotAutoGrade") is True
                or "open-response" in patch_status.casefold()
            ):
                updated["reviewStatus"] = "open-response-preserved"
            else:
                updated["reviewStatus"] = "reviewed"
        if source_evidence:
            updated["sourceEvidence"] = copy.deepcopy(source_evidence)
        if "sourceEvidenceLocations" in patch_item:
            updated["sourceEvidenceLocations"] = copy.deepcopy(patch_item["sourceEvidenceLocations"])
        if "responseMode" in patch_item:
            updated["responseMode"] = copy.deepcopy(patch_item["responseMode"])
        if "doNotAutoGrade" in patch_item:
            updated["doNotAutoGrade"] = patch_item["doNotAutoGrade"] is True
        # Preserve source-scoped formative metadata supplied by a manual
        # review.  The builder consumes these fields for teacher-led notes and
        # ambiguous open responses; they never create an audio URL or answer
        # key by themselves.
        for key in (
            "sourcePrompt",
            "sourceInstruction",
            "openResponse",
            "nativeOpenType",
            "aiGrading",
            "teacherNotes",
            "teacherNotesReviewed",
        ):
            if key in patch_item:
                updated[key] = copy.deepcopy(patch_item[key])
        if isinstance(patch_item.get("builderHints"), Mapping):
            hints = updated.get("builderHints") if isinstance(updated.get("builderHints"), Mapping) else {}
            updated["builderHints"] = {**copy.deepcopy(dict(hints)), **copy.deepcopy(dict(patch_item["builderHints"]))}
        answer_items = patch_item.get("answerItems")
        if isinstance(answer_items, list) and nested_id is None:
            updated["answerItems"] = copy.deepcopy(answer_items)
        elif nested_id is not None:
            nested_answers = updated.get("answerItems")
            nested_target = next(
                (answer for answer in nested_answers if isinstance(answer, Mapping) and _text(answer.get("id")) == nested_id),
                None,
            ) if isinstance(nested_answers, list) else None
            if nested_target is None:
                reason = "nested-answer-item-missing"
            else:
                for key in ("canonical", "accepted", "evidence", "rationale", "status"):
                    if key in patch_item:
                        nested_target[key] = copy.deepcopy(patch_item[key])
                # A reviewed source correction can replace an older
                # ``source-ambiguous`` marker with an explicit, source-backed
                # answer.  Do not leave the stale marker in place when the
                # patch supplies a canonical value and no replacement status.
                if "status" not in patch_item and _text(patch_item.get("canonical")):
                    nested_target.pop("status", None)
        if reason is not None:
            blocker = {
                "kind": "exercise",
                "lessonId": lesson_id,
                "itemId": raw_item_id,
                "unit": _int(patch_item.get("unit")),
                "code": f"exercise-semantic-patch-{reason}",
            }
            blockers.append(blocker)
            rejected.append(blocker)
            continue
        updated.setdefault("originalPrompt", original_prompt)
        updated.setdefault("originalReviewStatus", original_status)
        updated["semanticPatch"] = {
            "sourcePatchRef": patch_ref,
            "originalPrompt": original_prompt,
            "originalReviewStatus": original_status,
            "patchItemId": raw_item_id,
            "provenance": copy.deepcopy(provenance),
            "sourceEvidence": copy.deepcopy(source_evidence),
            "originalSourceEvidence": copy.deepcopy(patch_item.get("originalSourceEvidence", [])),
            "validatedProvenanceSha256": _text((provenance or {}).get("sha256")),
            "patchReviewStatus": _text(patch_item.get("reviewStatus")),
            "validatedPublishedSourceSlide": target_slide,
        }
        if target_slide != current_slide:
            target_slide_record = lesson.get("slides", {}).get(str(target_slide)) if isinstance(lesson.get("slides"), Mapping) else None
            if not isinstance(target_slide_record, Mapping) or not isinstance(target_slide_record.get("items"), list):
                blocker = {
                    "kind": "exercise",
                    "lessonId": lesson_id,
                    "itemId": raw_item_id,
                    "unit": _int(patch_item.get("unit")),
                    "code": "exercise-semantic-patch-target-slide-missing",
                }
                blockers.append(blocker)
                rejected.append(blocker)
                continue
            current_slide_items.remove(updated)
            target_slide_record["items"].append(updated)
        updated["id"] = _patch_rekey_item(base_item_id, target_slide)
        applied.append(raw_item_id)

    result["semanticPatch"] = {
        "sourcePatchRef": patch_ref,
        "validated": not rejected,
        "appliedItemIds": applied,
        "rejectedItemIds": [item["itemId"] for item in rejected],
        "remainingHardBlocks": copy.deepcopy(patch.get("remainingHardBlocks", [])),
    }
    return result, {
        "status": "applied" if not rejected else "partially-applied",
        "applied": len(applied),
        "rejected": len(rejected),
        "remainingHardBlocks": len(_as_list(patch.get("remainingHardBlocks"))),
        "sourcePatchRef": patch_ref,
    }


def _sidecar_file(
    reference: Mapping[str, Any] | None,
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    *,
    code_prefix: str,
) -> Path | None:
    """Validate a sidecar's immutable JSON reference and return its path."""

    if not isinstance(reference, Mapping):
        blockers.append({"kind": "exercise", "code": f"{code_prefix}-reference-missing"})
        return None
    raw_path = _text(reference.get("path") or reference.get("file"))
    expected = _text(reference.get("sha256")).casefold()
    path = Path(_resolve_local_path(raw_path, asset_roots))
    if not raw_path or not path.is_file() or not SHA256_RE.fullmatch(expected):
        blockers.append({"kind": "exercise", "code": f"{code_prefix}-file-missing-or-sha-invalid", "path": raw_path})
        return None
    try:
        observed = _sha256_file(path).casefold()
    except OSError:
        observed = ""
    if observed != expected:
        blockers.append(
            {
                "kind": "exercise",
                "code": f"{code_prefix}-sha-mismatch",
                "path": raw_path,
                "expectedSha256": expected,
                "observedSha256": observed,
            }
        )
        return None
    return path


def _review_item_by_id(
    lesson: Mapping[str, Any],
    item_id: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, int | None]:
    slides = lesson.get("slides")
    if not isinstance(slides, Mapping):
        return None, None, None
    for raw_slide, slide in slides.items():
        if not isinstance(slide, Mapping) or not isinstance(slide.get("items"), list):
            continue
        for item in slide["items"]:
            if isinstance(item, dict) and _text(item.get("id")) == item_id:
                return item, slide, _int(raw_slide)
    return None, None, None


def _apply_exercise_teacher_notes_review(
    exercise_review: Mapping[str, Any] | None,
    sidecar: Mapping[str, Any] | None,
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    sidecar_ref: str,
) -> tuple[Mapping[str, Any] | None, dict[str, Any]]:
    """Merge reviewed teacher-led vocabulary/listening instructions.

    These entries preserve the published prompt as teacher notes.  They do
    not attach a clip, infer an audio ordinal, or create a deterministic key.
    Every entry is tied to a published source slide and a SHA-verified source
    file before it can clear the builder's listening gate.
    """

    if not isinstance(sidecar, Mapping):
        return exercise_review, {"status": "not-supplied", "applied": 0, "rejected": 0}
    if not isinstance(exercise_review, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-missing-for-teacher-notes"})
        return exercise_review, {"status": "blocked", "applied": 0, "rejected": 0}
    if _text(sidecar.get("courseId")) not in {"", COURSE_ID}:
        raise ComposeError("teacher-notes review course id does not match the course builder")
    policy = sidecar.get("sourcePolicy")
    required_policy = (
        "publishedSlidesAuthoritative",
        "sourceFilesReadOnly",
        "preserveOriginalPromptsAndProvenance",
        "noAudioSubstitution",
        "noSyntheticAnswerKey",
        "teacherNotesOnly",
    )
    if not isinstance(policy, Mapping) or any(policy.get(key) is not True for key in required_policy):
        raise ComposeError("teacher-notes review source policy is incomplete or unsafe")
    base_path = _sidecar_file(
        sidecar.get("baseReview"),
        asset_roots,
        blockers,
        code_prefix="teacher-notes-base-review",
    )
    result = copy.deepcopy(dict(exercise_review))
    raw_lessons = result.get("lessons")
    if not isinstance(raw_lessons, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-lessons-missing-for-teacher-notes"})
        return result, {"status": "blocked", "applied": 0, "rejected": 0}
    entries = [item for item in _as_list(sidecar.get("entries")) if isinstance(item, Mapping)]
    applied: list[str] = []
    rejected: list[dict[str, Any]] = []
    for entry in entries:
        lesson_id = _text(entry.get("lessonId"))
        item_id = _text(entry.get("itemId"))
        lesson = raw_lessons.get(lesson_id)
        source = sources_by_lesson.get(lesson_id)
        reason: str | None = None
        if not lesson_id or not item_id or not isinstance(lesson, Mapping):
            reason = "item-or-lesson-missing"
        elif not isinstance(source, Mapping):
            reason = "published-source-missing"
        source_ref = entry.get("publishedSource")
        source_path: Path | None = None
        if reason is None:
            source_path = _sidecar_file(
                source_ref,
                asset_roots,
                blockers,
                code_prefix="teacher-notes-published-source",
            )
            if source_path is None:
                reason = "published-source-reference-invalid"
        target_item: dict[str, Any] | None = None
        target_slide: dict[str, Any] | None = None
        current_slide: int | None = None
        if reason is None:
            target_item, target_slide, current_slide = _review_item_by_id(lesson, item_id)
            if target_item is None:
                reason = "review-item-missing"
        source_slide_number = _int(entry.get("publishedSlide") or (source_ref or {}).get("slideNumber"))
        published_slide = _source_slide(source or {}, source_slide_number or -1)
        if reason is None and published_slide is None:
            reason = "published-source-slide-not-found"
        source_prompt = _text(entry.get("sourcePrompt") or entry.get("sourceInstruction"))
        if reason is None and not source_prompt:
            reason = "source-prompt-missing"
        if reason is None:
            visible_text = _normalise_review_text(
                "\n".join(_text(value) for value in _as_list((published_slide or {}).get("visibleTexts")))
            )
            if _normalise_review_text(source_prompt) not in visible_text:
                reason = "source-prompt-mismatch"
        source_url = _text((source_ref or {}).get("sourceUrl")) if isinstance(source_ref, Mapping) else ""
        if reason is None and source_url != _source_url(source or {}):
            reason = "published-source-url-mismatch"
        original_prompt = _text(entry.get("originalPrompt"))
        if reason is None and original_prompt and _normalise_review_text(original_prompt) != _normalise_review_text((target_item or {}).get("prompt")):
            reason = "original-prompt-mismatch"
        if reason is None and _text((target_item or {}).get("kind")).casefold() != "listening":
            reason = "item-is-not-listening"
        if reason is None and _text((target_item or {}).get("responseMode")).casefold() != "teacher-listening":
            reason = "item-is-not-teacher-listening"
        if reason is None and _as_list((target_item or {}).get("answerItems")):
            reason = "answer-key-present"
        merge_contract = entry.get("mergeContract")
        contract_keys = (
            "preserveOriginalPrompt",
            "preserveOriginalProvenance",
            "noAudioSubstitution",
            "noSyntheticAnswerKey",
            "teacherNotesOnly",
        )
        if reason is None and (not isinstance(merge_contract, Mapping) or any(merge_contract.get(key) is not True for key in contract_keys)):
            reason = "merge-contract-incomplete"
        if reason is not None:
            blocker = {
                "kind": "exercise",
                "lessonId": lesson_id,
                "itemId": item_id,
                "unit": _int(entry.get("unit")),
                "code": f"exercise-teacher-notes-{reason}",
            }
            blockers.append(blocker)
            rejected.append(blocker)
            continue
        assert target_item is not None and published_slide is not None and source_path is not None
        previous_prompt = _text(target_item.get("prompt"))
        previous_status = _text(target_item.get("reviewStatus"))
        notes = {
            "reviewed": True,
            "reviewStatus": "reviewed-teacher-notes",
            "sourceInstruction": source_prompt,
            "sourcePrompt": source_prompt,
            "content": source_prompt,
            "responseMode": "teacher-notes-preserved",
            "originalPrompt": previous_prompt,
            "originalReviewStatus": previous_status,
            "noAudioSubstitution": True,
            "noSyntheticAnswerKey": True,
            "provenance": {
                "review": sidecar_ref,
                "publishedSourceFile": _text((source_ref or {}).get("path")) if isinstance(source_ref, Mapping) else "",
                "publishedSourceSha256": _text((source_ref or {}).get("sha256")) if isinstance(source_ref, Mapping) else "",
                "publishedSourceSlide": source_slide_number,
                "sourceUrl": source_url,
            },
        }
        target_item.setdefault("originalPrompt", previous_prompt)
        target_item.setdefault("originalReviewStatus", previous_status)
        target_item["sourcePrompt"] = source_prompt
        target_item["sourceInstruction"] = source_prompt
        target_item["teacherNotes"] = notes
        target_item["teacherNotesReviewed"] = True
        target_item["reviewStatus"] = "reviewed-teacher-notes"
        target_item["doNotAutoGrade"] = True
        target_item["answerItems"] = []
        target_item["teacherNotesReview"] = {
            "sourceReviewRef": sidecar_ref,
            "sourcePath": str(source_path.resolve()),
            "sourceSha256": _text((source_ref or {}).get("sha256")) if isinstance(source_ref, Mapping) else "",
            "publishedSlide": source_slide_number,
            "preservedPrompt": previous_prompt,
        }
        applied.append(item_id)
    expected_count = _int(sidecar.get("expectedEntryCount"))
    if expected_count is not None and expected_count != len(entries):
        blockers.append(
            {
                "kind": "exercise",
                "code": "exercise-teacher-notes-entry-count-mismatch",
                "expected": expected_count,
                "actual": len(entries),
            }
        )
    return result, {
        "status": "applied" if not rejected else "partially-applied",
        "applied": len(applied),
        "rejected": len(rejected),
        "appliedItemIds": applied,
        "rejectedItemIds": [item["itemId"] for item in rejected],
        "baseReviewPath": str(base_path) if base_path else None,
        "sourceReviewRef": sidecar_ref,
    }


def _apply_exercise_errata_review(
    exercise_review: Mapping[str, Any] | None,
    sidecar: Mapping[str, Any] | None,
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    sidecar_ref: str,
) -> tuple[Mapping[str, Any] | None, dict[str, Any]]:
    """Merge the Unit 38 slide-13 source erratum under its exact contract."""

    if not isinstance(sidecar, Mapping):
        return exercise_review, {"status": "not-supplied", "applied": 0, "rejected": 0}
    if not isinstance(exercise_review, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-missing-for-errata"})
        return exercise_review, {"status": "blocked", "applied": 0, "rejected": 0}
    if _text(sidecar.get("courseId")) not in {"", COURSE_ID}:
        raise ComposeError("exercise errata course id does not match the course builder")
    base_path = _sidecar_file(sidecar.get("baseReview"), asset_roots, blockers, code_prefix="exercise-errata-base-review")
    result = copy.deepcopy(dict(exercise_review))
    raw_lessons = result.get("lessons")
    if not isinstance(raw_lessons, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-lessons-missing-for-errata"})
        return result, {"status": "blocked", "applied": 0, "rejected": 0}
    applied: list[str] = []
    rejected: list[dict[str, Any]] = []
    for patch in [item for item in _as_list(sidecar.get("patches")) if isinstance(item, Mapping)]:
        lesson_id = _text(patch.get("lessonId"))
        item_id = _text(patch.get("itemId"))
        lesson = raw_lessons.get(lesson_id)
        source = sources_by_lesson.get(lesson_id)
        reason: str | None = None
        source_ref = sidecar.get("publishedSource")
        if not lesson_id or not item_id or not isinstance(lesson, Mapping):
            reason = "item-or-lesson-missing"
        elif not isinstance(source, Mapping):
            reason = "published-source-missing"
        source_path: Path | None = None
        if reason is None:
            source_path = _sidecar_file(source_ref, asset_roots, blockers, code_prefix="exercise-errata-published-source")
            if source_path is None:
                reason = "published-source-reference-invalid"
        target_item: dict[str, Any] | None = None
        current_slide: int | None = None
        if reason is None:
            target_item, _slide, current_slide = _review_item_by_id(lesson, item_id)
            if target_item is None:
                reason = "review-item-missing"
        source_slide_number = _int(patch.get("slideNumber") or (source_ref or {}).get("slideNumber"))
        published_slide = _source_slide(source or {}, source_slide_number or -1)
        if reason is None and published_slide is None:
            reason = "published-source-slide-not-found"
        source_prompt = _text(patch.get("sourcePrompt"))
        if reason is None and (not source_prompt or _normalise_review_text(source_prompt) not in _normalise_review_text("\n".join(_as_list((published_slide or {}).get("visibleTexts"))))):
            reason = "source-prompt-mismatch"
        source_url = _text((source_ref or {}).get("sourceUrl")) if isinstance(source_ref, Mapping) else ""
        if reason is None and source_url != _source_url(source or {}):
            reason = "published-source-url-mismatch"
        if reason is None and _text(patch.get("originalPrompt")) and _text(patch.get("originalPrompt")) != _text((target_item or {}).get("prompt")):
            reason = "original-prompt-mismatch"
        contract = patch.get("mergeContract")
        required_contract = (
            "replaceReviewStatus",
            "setOpenResponse",
            "setAmbiguousAnswerCanonicalToNull",
            "setAmbiguousAnswerAcceptedToEmpty",
            "nativeOpenType",
            "aiGrading",
            "responseMode",
            "archiveOriginalPromptInMetadata",
        )
        if reason is None and (not isinstance(contract, Mapping) or any(key not in contract for key in required_contract)):
            reason = "merge-contract-incomplete"
        open_response = patch.get("openResponse")
        if reason is None and (
            not isinstance(open_response, Mapping)
            or not _text(open_response.get("prompt"))
            or not _text(open_response.get("sourcePrompt"))
            or not _text(open_response.get("feedbackContext"))
        ):
            reason = "open-response-metadata-missing"
        answers = (target_item or {}).get("answerItems")
        if reason is None and not isinstance(answers, list):
            reason = "answer-items-missing"
        nested_id = _text(patch.get("nestedAnswerItemId")) or "item-3"
        nested = next((item for item in _as_list(answers) if isinstance(item, Mapping) and _text(item.get("id")) == nested_id), None)
        if reason is None and nested is None:
            reason = "ambiguous-answer-item-missing"
        deterministic_ids = {_text(value) for value in _as_list(patch.get("deterministicItems")) if _text(value)}
        answer_ids = {_text(value.get("id")) for value in _as_list(answers) if isinstance(value, Mapping) and _text(value.get("id"))}
        if reason is None and deterministic_ids != answer_ids - {nested_id}:
            reason = "deterministic-item-set-mismatch"
        answer_policy = patch.get("answerPolicy")
        if reason is None and (
            not isinstance(answer_policy, Mapping)
            or answer_policy.get("canonicalAnswer") is not None
            or _as_list(answer_policy.get("acceptedAnswers"))
            or answer_policy.get("preserveOriginalItem") is not True
        ):
            reason = "answer-policy-unsafe"
        if reason is not None:
            blocker = {
                "kind": "exercise",
                "lessonId": lesson_id,
                "itemId": item_id,
                "unit": _int(patch.get("unit")),
                "code": f"exercise-errata-{reason}",
            }
            blockers.append(blocker)
            rejected.append(blocker)
            continue
        assert target_item is not None and nested is not None and source_path is not None
        previous_prompt = _text(target_item.get("prompt"))
        previous_status = _text(target_item.get("reviewStatus"))
        nested["canonical"] = None
        nested["accepted"] = []
        nested["evidence"] = source_prompt
        nested["rationale"] = _text(patch.get("rationale"))
        nested["status"] = "source-ambiguous"
        target_item["reviewStatus"] = "open-response-preserved"
        target_item["responseMode"] = "formative-open-response"
        target_item["openResponse"] = copy.deepcopy(dict(open_response))
        target_item["nativeOpenType"] = "essay"
        target_item["aiGrading"] = True
        target_item["doNotAutoGrade"] = True
        target_item["sourceEvidence"] = [source_prompt]
        target_item.setdefault("originalPrompt", previous_prompt)
        target_item.setdefault("originalReviewStatus", previous_status)
        target_item["errataReview"] = {
            "sourceReviewRef": sidecar_ref,
            "sourcePath": str(source_path.resolve()),
            "sourceSha256": _text((source_ref or {}).get("sha256")) if isinstance(source_ref, Mapping) else "",
            "publishedSlide": source_slide_number,
            "preservedPrompt": previous_prompt,
            "preservedReviewStatus": previous_status,
        }
        target_item["semanticPatch"] = {
            "sourcePatchRef": sidecar_ref,
            "patchItemId": f"{item_id}:{nested_id}",
            "originalPrompt": previous_prompt,
            "originalReviewStatus": previous_status,
            "provenance": copy.deepcopy(source_ref),
            "sourceEvidence": [source_prompt],
            "patchReviewStatus": _text(patch.get("reviewStatus")),
            "validatedPublishedSourceSlide": source_slide_number,
        }
        if source_slide_number != current_slide:
            target_item["id"] = _patch_rekey_item(item_id, source_slide_number)
        applied.append(item_id)
    return result, {
        "status": "applied" if not rejected else "partially-applied",
        "applied": len(applied),
        "rejected": len(rejected),
        "appliedItemIds": applied,
        "rejectedItemIds": [item["itemId"] for item in rejected],
        "baseReviewPath": str(base_path) if base_path else None,
        "sourceReviewRef": sidecar_ref,
    }


def _apply_unit6_recovery(
    exercise_review: Mapping[str, Any] | None,
    recovery: Mapping[str, Any] | None,
    sources_by_lesson: Mapping[str, Mapping[str, Any]],
    asset_roots: Sequence[Path],
    blockers: list[dict[str, Any]],
    recovery_ref: str,
) -> tuple[Mapping[str, Any] | None, dict[str, Any]]:
    """Add the reviewed Unit 6 vocabulary source slide as teacher notes only."""

    if not isinstance(recovery, Mapping):
        return exercise_review, {"status": "not-supplied", "applied": 0, "rejected": 0}
    if not isinstance(exercise_review, Mapping):
        blockers.append({"kind": "exercise", "code": "exercise-review-missing-for-unit6-recovery"})
        return exercise_review, {"status": "blocked", "applied": 0, "rejected": 0}
    if _text(recovery.get("courseId")) not in {"", COURSE_ID}:
        raise ComposeError("Unit 6 recovery course id does not match the course builder")
    policy = recovery.get("sourcePolicy")
    required_policy = (
        "publishedDeckReadOnly",
        "sourceFileReadOnly",
        "noSourceArchiveWrites",
        "noSyntheticExerciseItem",
        "noSyntheticAnswerKey",
        "originalMediaPreserved",
    )
    if not isinstance(policy, Mapping) or any(policy.get(key) is not True for key in required_policy):
        raise ComposeError("Unit 6 recovery source policy is incomplete or unsafe")
    lesson_id = _text(recovery.get("lessonId"))
    source = sources_by_lesson.get(lesson_id)
    if not isinstance(source, Mapping):
        blockers.append({"kind": "exercise", "unit": 6, "lessonId": lesson_id, "code": "unit6-recovery-source-missing"})
        return exercise_review, {"status": "blocked", "applied": 0, "rejected": 1}
    source_manifest = recovery.get("sourceManifest") if isinstance(recovery.get("sourceManifest"), Mapping) else {}
    source_path = _sidecar_file(source_manifest, asset_roots, blockers, code_prefix="unit6-recovery-source")
    source_slide_data = source_manifest.get("slide") if isinstance(source_manifest.get("slide"), Mapping) else {}
    source_slide_number = _int(source_slide_data.get("number")) or 6
    source_slide = _source_slide(source, source_slide_number)
    reason: str | None = None
    if source_path is None:
        reason = "source-reference-invalid"
    elif _text(recovery.get("recoveryStatus")) != "recovered-source-slide":
        reason = "status-invalid"
    elif source_slide is None:
        reason = "source-slide-missing"
    elif _text((recovery.get("publishedDeck") or {}).get("sourceUrl")) != _source_url(source):
        reason = "source-url-mismatch"
    elif _text(source_manifest.get("contentId")) and _text(source.get("contentId")) != _text(source_manifest.get("contentId")):
        reason = "content-id-mismatch"
    expected_texts = [_text(value) for value in _as_list(source_slide_data.get("visibleTexts")) if _text(value)]
    actual_texts = [_text(value) for value in _as_list(source_slide.get("visibleTexts")) if _text(value)] if source_slide else []
    if reason is None and any(_normalise_review_text(value) not in _normalise_review_text("\n".join(actual_texts)) for value in expected_texts):
        reason = "source-slide-evidence-mismatch"
    evidence = [_text(value) for value in _as_list(recovery.get("sourceEvidence")) if _text(value)]
    if reason is None and any(_normalise_review_text(value) not in _normalise_review_text("\n".join(actual_texts)) for value in evidence):
        reason = "source-evidence-mismatch"
    exercise_use = recovery.get("exerciseUse") if isinstance(recovery.get("exerciseUse"), Mapping) else {}
    if reason is None and (exercise_use.get("itemId") is not None or _as_list(exercise_use.get("answerItems"))):
        reason = "synthetic-exercise-policy-violation"
    result = copy.deepcopy(dict(exercise_review))
    lessons = result.get("lessons")
    lesson = lessons.get(lesson_id) if isinstance(lessons, Mapping) else None
    if reason is None and not isinstance(lesson, Mapping):
        reason = "review-lesson-missing"
    if reason is not None:
        blocker = {"kind": "exercise", "unit": 6, "lessonId": lesson_id, "code": f"unit6-recovery-{reason}"}
        blockers.append(blocker)
        return result, {"status": "blocked", "applied": 0, "rejected": 1}
    assert source_slide is not None and source_path is not None and isinstance(lesson, Mapping)
    slides = lesson.get("slides")
    if not isinstance(slides, dict):
        slides = {}
        lesson["slides"] = slides
    review_slide = slides.get(str(source_slide_number))
    if not isinstance(review_slide, dict):
        review_slide = {
            "source": copy.deepcopy(dict(source_slide)),
            "number": source_slide_number,
            "title": _text(source_slide.get("title")),
            "visibleTexts": copy.deepcopy(_as_list(source_slide.get("visibleTexts"))),
            "items": [],
        }
        slides[str(source_slide_number)] = review_slide
    else:
        review_slide.setdefault("source", copy.deepcopy(dict(source_slide)))
        review_slide.setdefault("number", source_slide_number)
        review_slide.setdefault("title", _text(source_slide.get("title")))
        review_slide.setdefault("visibleTexts", copy.deepcopy(_as_list(source_slide.get("visibleTexts"))))
    if not isinstance(review_slide.get("items"), list):
        review_slide["items"] = []
    item_id = "unit6-slide6-teacher-notes"
    existing = next((item for item in review_slide["items"] if isinstance(item, Mapping) and _text(item.get("id")) == item_id), None)
    source_prompt = next(
        (_text(value) for value in actual_texts if "repeat the words" in _text(value).casefold()),
        _text(source_slide.get("title")),
    )
    if existing is None:
        review_slide["items"].append(
            {
                "id": item_id,
                "kind": "listening",
                "prompt": source_prompt,
                "sourcePrompt": source_prompt,
                "sourceInstruction": source_prompt,
                "responseMode": "teacher-listening",
                "reviewStatus": "reviewed-teacher-notes",
                "teacherNotesReviewed": True,
                "teacherNotes": {
                    "reviewed": True,
                    "reviewStatus": "reviewed-teacher-notes",
                    "sourceInstruction": source_prompt,
                    "sourcePrompt": source_prompt,
                    "content": source_prompt,
                    "responseMode": "teacher-notes-preserved",
                    "sourceEvidence": evidence,
                    "rationale": "Published Unit 6 slide is a teacher-led vocabulary repetition activity; no clip or answer key is present on the source slide.",
                    "provenance": {
                        "recoveryReview": recovery_ref,
                        "sourceManifest": _text(source_manifest.get("path") or source_manifest.get("file")),
                        "sourceSha256": _text(source_manifest.get("sha256")),
                        "publishedSlide": source_slide_number,
                    },
                },
                "answerItems": [],
                "doNotAutoGrade": True,
                "sourceEvidence": evidence,
                "recoveryProvenance": {
                    "recoveryReview": recovery_ref,
                    "sourcePath": str(source_path.resolve()),
                    "sourceSha256": _text(source_manifest.get("sha256")),
                    "publishedSlide": source_slide_number,
                    "originalMediaPreserved": True,
                },
            }
        )
        status = "applied"
        applied = 1
    else:
        status = "already-present"
        applied = 0
    return result, {
        "status": status,
        "applied": applied,
        "rejected": 0,
        "itemId": item_id,
        "sourceReviewRef": recovery_ref,
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
    placement_fixes: list[dict[str, Any]] = []
    for raw_id, value in iterable:
        lesson_id = _text(raw_id) or (_text(value.get("lessonId")) if isinstance(value, Mapping) else "")
        if lesson_id not in source_by_lesson:
            continue
        if not isinstance(value, Mapping):
            blockers.append({"kind": "exercise", "lessonId": lesson_id, "code": "exercise-review-entry-invalid"})
            continue
        normalized, fixes = _normalise_review_placements(lesson_id, value, source_by_lesson[lesson_id])
        lessons[lesson_id] = normalized
        placement_fixes.extend(fixes)
    expected = set(source_by_lesson)
    missing = sorted(expected - set(lessons))
    for lesson_id in missing:
        blockers.append({"kind": "exercise", "lessonId": lesson_id, "code": "exercise-review-lesson-missing"})
    normalized = {
        "schemaVersion": exercise_review.get("schemaVersion", 1),
        "courseId": _text(exercise_review.get("courseId")) or COURSE_ID,
        "sourcePolicy": copy.deepcopy(exercise_review.get("sourcePolicy")),
        "lessons": lessons,
        "placementFixes": placement_fixes,
    }
    if isinstance(exercise_review.get("semanticPatch"), Mapping):
        normalized["semanticPatch"] = copy.deepcopy(exercise_review["semanticPatch"])
    return normalized


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
    rejected: list[dict[str, Any]] = []
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
            # A listening review is source-scoped by the published prompt
            # slide, the 1-based audio ordinal, and the audio digest.  A
            # reviewed source may explicitly place its media on a different
            # source slide, but that mapping must carry both exact source and
            # target-slide evidence.  Never infer a cross-slide relationship
            # from adjacency or from a matching digest alone.
            audio_index = _int(entry.get("audioIndex"))
            digest = _text(entry.get("sourceAudioSha256")).casefold()
            source_audio_slide = _int(entry.get("sourceAudioSlideNumber"))
            audio_match_slide = source_audio_slide if source_audio_slide is not None else slide
            cross_slide = (
                slide is not None
                and source_audio_slide is not None
                and source_audio_slide != slide
            )
            if cross_slide:
                source_audio_evidence = _listening_evidence_values(
                    entry,
                    (
                        "sourceAudioSlideEvidence",
                        "audioSourceEvidence",
                        "sourceAudioEvidence",
                    ),
                )
                target_prompt_evidence = _listening_evidence_values(
                    entry,
                    (
                        "targetSlideEvidence",
                        "targetPromptEvidence",
                        "publishedPromptEvidence",
                        "sourceEvidence",
                    ),
                )
                proof_ok = (
                    audio_index is not None
                    and bool(digest)
                    and _listening_evidence_matches_slide(
                        sources_by_lesson[lesson_id],
                        source_audio_slide,
                        source_audio_evidence,
                    )
                    and _listening_evidence_matches_slide(
                        sources_by_lesson[lesson_id],
                        slide,
                        target_prompt_evidence,
                    )
                )
                if not proof_ok:
                    blockers.append(
                        {
                            "kind": "listening",
                            "unit": _int(entry.get("unit")),
                            "lessonId": lesson_id,
                            "slide": slide,
                            "sourceAudioSlideNumber": source_audio_slide,
                            "audioIndex": audio_index,
                            "code": "listening-cross-slide-proof-missing",
                            "detail": (
                                "Cross-slide listening placement requires exact source-audio "
                                "and target-prompt evidence on the declared slides."
                            ),
                        }
                    )
                    entry["compositionStatus"] = "rejected-cross-slide-proof"
                    rejected.append(entry)
                    continue
            if slide is not None and audio_index is not None and digest:
                scoped = [
                    item
                    for item in audio_by_lesson.get(lesson_id, [])
                    if _int(item.get("slideNumber")) == audio_match_slide
                    and _int(item.get("audioNumber") or item.get("audioIndex")) == audio_index
                    and _record_sha(item).casefold() == digest
                ]
                if not scoped:
                    observed = [
                        {
                            "audioIndex": _int(item.get("audioNumber") or item.get("audioIndex")),
                            "slideNumber": _int(item.get("slideNumber")),
                            "sourceAudioSha256": _record_sha(item),
                        }
                        for item in audio_by_lesson.get(lesson_id, [])
                    ]
                    blockers.append(
                        {
                            "kind": "listening",
                            "unit": _int(entry.get("unit")),
                            "lessonId": lesson_id,
                            "slide": slide,
                            "sourceAudioSlideNumber": source_audio_slide,
                            "audioIndex": audio_index,
                            "sourceAudioSha256": _text(entry.get("sourceAudioSha256")),
                            "observedAudio": observed,
                            "code": "listening-source-audio-mismatch",
                            "detail": "Reviewed listening coordinates do not identify the same source audio record at the published slide.",
                        }
                    )
                    entry["compositionStatus"] = "rejected-source-audio-mismatch"
                    rejected.append(entry)
                    continue
                if cross_slide:
                    # The learning builder resolves audio by the activity's
                    # published slide.  Add a deliberate manifest alias while
                    # preserving the immutable source slide and digest.  The
                    # alias is created only after the exact coordinates and
                    # cross-slide proof above have passed.
                    if not isinstance(audio, list):
                        blockers.append(
                            {
                                "kind": "listening",
                                "unit": _int(entry.get("unit")),
                                "lessonId": lesson_id,
                                "slide": slide,
                                "sourceAudioSlideNumber": source_audio_slide,
                                "code": "listening-cross-slide-audio-alias-unavailable",
                            }
                        )
                        entry["compositionStatus"] = "rejected-cross-slide-audio-alias"
                        rejected.append(entry)
                        continue
                    source_audio = scoped[0]
                    alias_exists = any(
                        _int(item.get("activitySlideNumber")) == slide
                        and _int(item.get("sourceAudioSlideNumber")) == source_audio_slide
                        and _record_sha(item).casefold() == digest
                        for item in audio_by_lesson.get(lesson_id, [])
                    )
                    if not alias_exists:
                        alias = copy.deepcopy(dict(source_audio))
                        alias["slideNumber"] = slide
                        alias["activitySlideNumber"] = slide
                        alias["sourceSlideNumber"] = source_audio_slide
                        alias["sourceAudioSlideNumber"] = source_audio_slide
                        alias["sourceAudioMapping"] = {
                            "sourceAudioSlideNumber": source_audio_slide,
                            "activitySlideNumber": slide,
                            "audioIndex": audio_index,
                            "sourceAudioSha256": digest,
                        }
                        audio.append(alias)
                        audio_by_lesson[lesson_id].append(alias)
                    entry["sourceAudioSlideNumber"] = source_audio_slide
                    entry["sourceAudioMapping"] = {
                        "sourceAudioSlideNumber": source_audio_slide,
                        "activitySlideNumber": slide,
                        "audioIndex": audio_index,
                        "sourceAudioSha256": digest,
                    }
            exercises.append(entry)
    return {"schemaVersion": 1, "exercises": exercises, "rejectedEntries": rejected}


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
    scope = _unit_scope(
        getattr(args, "unit_first", UNIT_FIRST),
        getattr(args, "unit_last", UNIT_LAST),
    )
    snapshot = _load_json(args.snapshot)
    source_manifest = _load_json(args.source_manifest)
    staged_media = _load_json(args.staged_media)
    reviewed_media = _load_json(args.reviewed_media) if args.reviewed_media else None
    reviewed_figures = _load_json(args.reviewed_figures) if args.reviewed_figures else None
    correspondence = _load_json(args.figure_correspondence) if args.figure_correspondence else None
    figure_proof = _load_json(args.figure_proof) if args.figure_proof else None
    vector_review = _load_json(args.vector_review) if args.vector_review else None
    vector_review_index = _vector_review_index(vector_review)
    native_audit = _load_json(args.native_audit) if args.native_audit else None
    native_match = _load_json(args.native_match) if args.native_match else None
    exercise_review = _load_json(args.exercise_review) if args.exercise_review else None
    exercise_semantic_patch = _load_json(args.exercise_semantic_patch) if args.exercise_semantic_patch else None
    exercise_teacher_notes_review = _load_json(args.exercise_teacher_notes_review) if args.exercise_teacher_notes_review else None
    exercise_errata_review = _load_json(args.exercise_errata_review) if args.exercise_errata_review else None
    unit6_recovery = _load_json(args.unit6_recovery) if args.unit6_recovery else None
    table_review = _load_json(args.table_review) if args.table_review else None
    published_source_review = _load_json(args.published_source_review) if args.published_source_review else None
    listening_documents = [_load_json(path) for path in args.listening_review]
    pronunciation_review = getattr(args, "pronunciation_review", None)
    if pronunciation_review:
        listening_documents.append(_load_json(pronunciation_review))

    if not isinstance(snapshot, Mapping) or not isinstance(source_manifest, Mapping):
        raise ComposeError("snapshot and source manifest must contain objects")
    if _text(snapshot.get("courseId") or (snapshot.get("course") or {}).get("id")) not in {"", COURSE_ID}:
        raise ComposeError("snapshot course id does not match the course builder")
    blockers: list[dict[str, Any]] = []
    sources, sources_by_unit, sources_by_lesson = _published_sources(
        source_manifest,
        snapshot,
        blockers,
        scope=scope,
    )
    table_review_summary, table_review_decisions = _apply_table_review(
        table_review,
        sources,
        sources_by_unit,
        sources_by_lesson,
        args.asset_root,
        blockers,
    )
    published_source_review_summary, published_source_review_by_unit = _apply_published_source_review(
        published_source_review,
        sources_by_unit,
        sources_by_lesson,
        args.asset_root,
        blockers,
        scope=scope,
    )
    snapshot_lessons = _snapshot_lessons(snapshot)
    source_by_lesson = {lesson_id: source for lesson_id, source in sources_by_lesson.items() if lesson_id in snapshot_lessons}
    exercise_patch_summary = {"status": "not-supplied", "applied": 0, "remainingHardBlocks": 0}
    if exercise_semantic_patch is not None:
        exercise_review, exercise_patch_summary = _apply_exercise_semantic_patch(
            exercise_review,
            exercise_semantic_patch,
            source_by_lesson,
            args.asset_root,
            blockers,
            str(args.exercise_semantic_patch),
        )
    teacher_notes_summary = {"status": "not-supplied", "applied": 0, "rejected": 0}
    if exercise_teacher_notes_review is not None:
        exercise_review, teacher_notes_summary = _apply_exercise_teacher_notes_review(
            exercise_review,
            exercise_teacher_notes_review,
            source_by_lesson,
            args.asset_root,
            blockers,
            str(args.exercise_teacher_notes_review),
        )
    errata_summary = {"status": "not-supplied", "applied": 0, "rejected": 0}
    if exercise_errata_review is not None:
        exercise_review, errata_summary = _apply_exercise_errata_review(
            exercise_review,
            exercise_errata_review,
            source_by_lesson,
            args.asset_root,
            blockers,
            str(args.exercise_errata_review),
        )
    unit6_recovery_summary = {"status": "not-supplied", "applied": 0, "rejected": 0}
    if unit6_recovery is not None:
        exercise_review, unit6_recovery_summary = _apply_unit6_recovery(
            exercise_review,
            unit6_recovery,
            source_by_lesson,
            args.asset_root,
            blockers,
            str(args.unit6_recovery),
        )

    _reviewed_audio, reviewed_images = _index_reviewed_media(reviewed_media)
    stage_image_records = _media_records(staged_media, "images")
    scoped_stage_image_records = [
        record for record in stage_image_records if scope.includes(_unit_from_value(record))
    ]
    _stage_images_by_id, stage_images_by_sha = _staged_index(stage_image_records)
    stage_audio_records = _media_records(staged_media, "audio")
    scoped_stage_audio_records = [
        record for record in stage_audio_records if scope.includes(_unit_from_value(record))
    ]
    audio, audio_counts = _normalize_audio(
        staged_media,
        reviewed_media,
        sources_by_unit,
        args.asset_root,
        blockers,
        scope=scope,
    )
    figures, figure_counts = _figure_candidates(
        reviewed_figures,
        correspondence,
        stage_images_by_sha,
        reviewed_images,
        sources_by_unit,
        args.asset_root,
        blockers,
        figure_proof,
        str(args.figure_proof) if args.figure_proof else "",
        scope=scope,
        published_source_review=published_source_review_by_unit,
    )
    _attach_published_source_review(
        published_source_review_by_unit,
        figures,
        sources_by_unit,
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
        table_review_decisions,
        vector_review,
        scope=scope,
        published_source_review=published_source_review_by_unit,
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
            "units": [scope.first, scope.last],
            "unitCount": scope.count,
            "sourceCount": len(sources),
            "publishedSourcePriority": True,
            "nativeSupplementOnlyWhenAligned": True,
            "unit33To36FiguresRequireVisualProof": True,
            "oldFigureCorrespondenceIgnoredWhenProofProvided": bool(figure_proof),
            "unit3AudioPolicy": "reuse-exact-audio2-only-when-slide4-source-match-is-proven",
            "tableReviewPublishedPriority": bool(table_review),
            "publishedSourceReviewExplicitOnly": bool(published_source_review),
            "vectorReviewExplicitOnly": True,
            "unit3VectorReview": bool(vector_review),
        },
        "inputPaths": {
            "snapshot": str(args.snapshot),
            "sourceManifest": str(args.source_manifest),
            "stagedMedia": str(args.staged_media),
            "reviewedMedia": str(args.reviewed_media) if args.reviewed_media else None,
            "reviewedFigures": str(args.reviewed_figures) if args.reviewed_figures else None,
            "figureCorrespondence": str(args.figure_correspondence) if args.figure_correspondence else None,
            "figureProof": str(args.figure_proof) if args.figure_proof else None,
            "vectorReview": str(args.vector_review) if args.vector_review else None,
            "nativeAudit": str(args.native_audit) if args.native_audit else None,
            "nativeMatch": str(args.native_match) if args.native_match else None,
            "exerciseReview": str(args.exercise_review) if args.exercise_review else None,
            "exerciseSemanticPatch": str(args.exercise_semantic_patch) if args.exercise_semantic_patch else None,
            "exerciseTeacherNotesReview": str(args.exercise_teacher_notes_review) if args.exercise_teacher_notes_review else None,
            "exerciseErrataReview": str(args.exercise_errata_review) if args.exercise_errata_review else None,
            "unit6Recovery": str(args.unit6_recovery) if args.unit6_recovery else None,
            "tableReview": str(args.table_review) if args.table_review else None,
            "publishedSourceReview": str(args.published_source_review) if args.published_source_review else None,
            "listeningReview": [str(path) for path in args.listening_review],
            "pronunciationReview": str(pronunciation_review) if pronunciation_review else None,
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
            "expectedPublishedSources": scope.count,
            "stageAudioRecords": len(scoped_stage_audio_records),
            "stageImageRecords": len(scoped_stage_image_records),
            "stageAudioReady": sum(_record_status(item) in READY_MEDIA_STATUSES for item in scoped_stage_audio_records),
            "stageImageReady": sum(_record_status(item) in READY_MEDIA_STATUSES for item in scoped_stage_image_records),
            "stageImageDuplicates": sum(_record_status(item) == "duplicate" for item in scoped_stage_image_records),
            "audio": audio_counts,
            "figures": figure_counts,
            "exerciseReviewLessons": len(normalized_exercise["lessons"]),
            "exerciseSemanticPatch": exercise_patch_summary,
            "exerciseTeacherNotesReview": teacher_notes_summary,
            "exerciseErrataReview": errata_summary,
            "unit6Recovery": unit6_recovery_summary,
            "tableReview": table_review_summary,
            "publishedSourceReview": published_source_review_summary,
            "vectorReview": {
                "status": "supplied" if isinstance(vector_review, Mapping) else "not-supplied",
                "entries": [
                    {"unit": unit, "publishedSlide": slide}
                    for unit, slide in sorted(vector_review_index)
                ],
            },
            "listeningReviewEntries": len(normalized_listening["exercises"]),
            "listeningReviewRejectedEntries": len(normalized_listening.get("rejectedEntries", [])),
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
            "unit33To36FiguresRequireVisualProof": True,
            "oldFigureCorrespondenceIgnoredWhenProofProvided": bool(figure_proof),
            "exerciseSemanticPatchExplicitOnly": True,
            "teacherNotesReviewExplicitOnly": True,
            "exerciseErrataReviewExplicitOnly": True,
            "unit6RecoveryExplicitOnly": True,
            "tableReviewPublishedPriority": bool(table_review),
            "tableReviewNativeMismatchesExcluded": table_review_summary["excludedNativeTables"] > 0,
            "publishedSourceReviewExplicitOnly": True,
            "publishedSourceReviewSupplied": bool(published_source_review),
            "vectorReviewExplicitOnly": True,
            "unit3VectorReviewSupplied": bool(vector_review),
            "exerciseSemanticPatchSummary": exercise_patch_summary,
            "unresolvedUnit33To36FiguresStayBlocked": not any(
                item.get("mapping") == "units-33-36-visual-proof" for item in figures
            ),
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
    parser.add_argument(
        "--unit-first",
        type=int,
        default=UNIT_FIRST,
        help=f"inclusive first unit to compose (default: {UNIT_FIRST})",
    )
    parser.add_argument(
        "--unit-last",
        type=int,
        default=UNIT_LAST,
        help=f"inclusive last unit to compose (default: {UNIT_LAST})",
    )
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--source-manifest", required=True, type=Path)
    parser.add_argument("--staged-media", required=True, type=Path)
    parser.add_argument("--reviewed-media", type=Path)
    parser.add_argument("--reviewed-figures", type=Path)
    parser.add_argument("--figure-correspondence", type=Path)
    parser.add_argument(
        "--figure-proof",
        type=Path,
        help="exact visual published/native proof; supersedes old correspondence when supplied",
    )
    parser.add_argument(
        "--vector-review",
        type=Path,
        help="source-verified editable vector projection keyed by unit and published slide",
    )
    parser.add_argument("--native-audit", type=Path)
    parser.add_argument("--native-match", type=Path)
    parser.add_argument("--exercise-review", type=Path)
    parser.add_argument(
        "--exercise-semantic-patch",
        type=Path,
        help="explicit source-validated semantic exercise patch; remaining hard blocks stay blocked",
    )
    parser.add_argument(
        "--exercise-teacher-notes-review",
        type=Path,
        help="source-validated teacher-led vocabulary/listening notes review",
    )
    parser.add_argument(
        "--exercise-errata-review",
        type=Path,
        help="source-validated exercise errata merge contract",
    )
    parser.add_argument(
        "--unit6-recovery",
        type=Path,
        help="source-validated Unit 6 slide-6 teacher-notes recovery",
    )
    parser.add_argument(
        "--table-review",
        type=Path,
        help="source-grounded tableReview contract; published projections override mismatched native tables",
    )
    parser.add_argument(
        "--published-source-review",
        type=Path,
        help="explicit reviewed published-source projections for units without editable native presentations",
    )
    parser.add_argument("--listening-review", type=Path, action="append", default=[])
    parser.add_argument(
        "--pronunciation-review",
        type=Path,
        help="optional pronunciation review artifact; appended as a listening-review document",
    )
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
