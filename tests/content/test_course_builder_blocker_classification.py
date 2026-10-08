"""Contract checks for the source-grounded table blocker review artifact."""

from __future__ import annotations

import hashlib
import json
import os
import re
import unittest
from pathlib import Path


REVIEW = Path(__file__).resolve().parents[2] / "docs" / "audit" / "course-builder-blocker-classification.json"
EXPECTED_UNITS = {4, 5, 30, 33, 34, 35, 42, 44, 46, 48}


class CourseBuilderBlockerClassificationTests(unittest.TestCase):
    def test_table_review_covers_exact_remaining_blockers(self) -> None:
        document = json.loads(REVIEW.read_text(encoding="utf-8"))
        review = document["tableReview"]
        entries = review["entries"]
        self.assertEqual({entry["unit"] for entry in entries}, EXPECTED_UNITS)
        self.assertEqual(review["summary"]["auditedCount"], len(EXPECTED_UNITS))
        self.assertEqual(
            review["summary"]["approvedUnits"],
            [4, 30, 33, 34, 35, 42, 44, 46, 48],
        )
        self.assertEqual(review["summary"]["blockedUnits"], [])
        self.assertEqual(review["summary"]["textOnlyUnits"], [5])

        for entry in entries:
            evidence = entry["sourceEvidence"]
            self.assertTrue(evidence["publishedVisibleTexts"])
            self.assertTrue(entry["sourceRefs"])
            for reference in entry["sourceRefs"]:
                self.assertRegex(reference["sha256"], r"^[0-9a-f]{64}$")
            approved = entry["approvedProjection"]
            self.assertTrue(entry["clearTableSemanticsBlocker"])
            for table in approved["tables"]:
                self.assertTrue(table["rows"])
                self.assertTrue(all(isinstance(row, list) for row in table["rows"]))
                if approved["source"] == "native-a:tbl":
                    self.assertTrue(table["shapeId"])
                    self.assertTrue(table["bbox"])
                    self.assertTrue(table["columnWidths"])

        unit5 = next(entry for entry in entries if entry["unit"] == 5)
        self.assertEqual(unit5["sourceEvidence"]["nativeTables"], [])
        self.assertFalse(unit5["approvedProjection"]["approved"])
        self.assertEqual(unit5["approvedProjection"]["mode"], "text-only")

        for unit in (44, 46, 48):
            entry = next(item for item in entries if item["unit"] == unit)
            self.assertEqual(entry["status"], "reviewed-published-source")
            self.assertEqual(entry["approvedProjection"]["source"], "published-visible-text")
            self.assertFalse(entry["approvedProjection"]["nativeIdentityConfirmed"])
            self.assertTrue(entry["sourceEvidence"]["differences"])

    def test_declared_hashes_match_audit_files_when_source_root_is_available(self) -> None:
        """Set COURSE_SOURCE_AUDIT_ROOT to the audit docs directory for byte validation."""

        raw_root = os.environ.get("COURSE_SOURCE_AUDIT_ROOT", "")
        if not raw_root:
            return
        root = Path(raw_root)
        self.assertTrue(root.is_dir(), raw_root)
        document = json.loads(REVIEW.read_text(encoding="utf-8"))
        for entry in document["tableReview"]["entries"]:
            published_path = root / Path(entry["publishedSourceFile"]).relative_to("docs/audit")
            published_document = json.loads(published_path.read_text(encoding="utf-8"))
            published_slide = next(
                slide
                for slide in published_document["deck"]["slides"]
                if int(slide.get("number", 0) or 0) == entry["sourceSlide"]
            )
            published_text = re.sub(
                r"[^a-z0-9]+",
                "",
                "".join(str(value) for value in published_slide.get("visibleTexts", [])).casefold(),
            )
            for table in entry["approvedProjection"]["tables"]:
                for row in table["rows"]:
                    for cell in row:
                        if cell:
                            self.assertIn(
                                re.sub(r"[^a-z0-9]+", "", cell.casefold()),
                                published_text,
                                f"Unit {entry['unit']} cell is absent from the published quote: {cell}",
                            )
            for reference in entry["sourceRefs"]:
                relative = Path(reference["path"])
                if relative.parts[:2] == ("docs", "audit"):
                    relative = Path(*relative.parts[2:])
                source = root / relative
                self.assertTrue(source.is_file(), str(source))
                self.assertEqual(
                    hashlib.sha256(source.read_bytes()).hexdigest(),
                    reference["sha256"],
                    str(source),
                )


if __name__ == "__main__":
    unittest.main()
