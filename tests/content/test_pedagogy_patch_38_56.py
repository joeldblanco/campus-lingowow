import copy
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PATCH_PATH = ROOT / "docs" / "audit" / "pedagogy" / "patch-38-56.json"
REPORT_PATH = Path(
    r"C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a"
) / "pedagogical-review" / "hallazgos-56-unidades.json"
UNITS = list(range(38, 57))
IMMUTABLE_ROW_FIELDS = {"id", "title", "contentType", "order", "parentId"}
IMMUTABLE_SOURCE_FIELDS = {
    "originalIDs",
    "originalIds",
    "originalSource",
    "sourceText",
    "nativeParagraphs",
    "teacher_notes",
    "sourceUrl",
    "sourceDigest",
    "audiosURL",
    "transcripts",
    "SHA",
    "sha256",
    "scenes",
    "sourceSlides",
    "URLs",
    "url",
    "transcript",
    "mediaDigest",
    "sourceAudioSha256",
    "scene",
    "sceneSide",
    "assetPath",
    "learningRevision",
}


def _read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def _row_index():
    baselines = [
        _read(ROOT / "docs" / "audit" / "course-builder-learning-draft.json"),
        _read(ROOT / "docs" / "audit" / "course53-56-learning-draft.json"),
    ]
    manifest = _read(ROOT / "docs" / "audit" / "drive-source-manifest.json")
    lesson_to_unit = {}
    for entry in manifest["units"].values():
        published = entry.get("published") or {}
        lesson = published.get("lesson") or {}
        if lesson.get("id"):
            lesson_to_unit[lesson["id"]] = entry["unit"]
    rows = {}
    for baseline in baselines:
        for plan in baseline["plans"]:
            unit = lesson_to_unit.get(plan["lessonId"])
            for row in plan["nextRows"]:
                rows[(unit, row["id"])] = row
    return rows


def _value_at(row, path):
    value = row["data"]
    for key in path:
        if isinstance(value, dict):
            if key not in value:
                return None, False
            value = value[key]
        elif isinstance(value, list) and isinstance(key, int) and 0 <= key < len(value):
            value = value[key]
        else:
            return None, False
    return value, True


class PedagogyPatch38To56Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.patch = _read(PATCH_PATH)
        cls.rows = _row_index()

    def test_schema_coverage_exact_befores_and_immutable_boundaries(self):
        self.assertEqual(self.patch["schemaVersion"], 1)
        self.assertEqual(self.patch["units"], UNITS)
        self.assertEqual({entry["unit"] for entry in self.patch["patches"]}, set(UNITS))
        for entry in self.patch["patches"]:
            row = self.rows[(entry["unit"], entry["rowId"])]
            self.assertEqual(entry["lessonId"], row["lessonId"])
            seen_paths = []
            for change in entry["changes"]:
                path = change["path"]
                self.assertTrue(path)
                self.assertFalse(any(path[: len(previous)] == previous or previous[: len(path)] == path for previous in seen_paths))
                seen_paths.append(path)
                self.assertNotIn(path[0], IMMUTABLE_ROW_FIELDS)
                self.assertTrue(IMMUTABLE_SOURCE_FIELDS.isdisjoint(path))
                if change["after"] != {"$delete": True}:
                    self.assertNotEqual(change["before"], change["after"])
                value, exists = _value_at(row, path)
                if exists:
                    self.assertEqual(change["before"], value)
                else:
                    self.assertEqual(change["before"], {"$missing": True})

    def test_oral_turns_have_structured_three_to_five_turn_scaffolds(self):
        turn_changes = [
            change
            for entry in self.patch["patches"]
            for change in entry["changes"]
            if change["path"] == ["data", "turns"]
        ]
        self.assertGreaterEqual(len(turn_changes), 17)
        for change in turn_changes:
            if isinstance(change["after"], list):
                self.assertGreaterEqual(len(change["after"]), 3)
                self.assertLessEqual(len(change["after"]), 5)
                for turn in change["after"]:
                    self.assertEqual(set(turn), {"id", "question", "answerPrompt"})
                    self.assertTrue(turn["id"])
                    self.assertTrue(turn["question"])
                    self.assertTrue(turn["answerPrompt"])

    def test_writing_conversions_remove_recording_only_fields(self):
        converted = {
            (38, "036"),
            (51, "026"),
        }
        for unit, suffix in converted:
            entry = next(
                item
                for item in self.patch["patches"]
                if item["unit"] == unit and item["rowId"].endswith(f"-{suffix}")
            )
            changes = {tuple(change["path"]): change for change in entry["changes"]}
            self.assertEqual(changes[("type",)]["after"], "essay")
            for path in (("instruction",), ("data", "guidedRole"), ("data", "turns"), ("data", "learnerPrompt")):
                self.assertEqual(changes[path]["after"], {"$delete": True})
            self.assertIn("word", changes[("prompt",)]["after"])
            self.assertIsInstance(changes[("minWords",)]["after"], int)
            self.assertIsInstance(changes[("maxWords",)]["after"], int)
            self.assertEqual(changes[("data", "exerciseReview", "kind")]["after"], "writing")

    def test_reported_speech_and_future_perfect_boundaries_are_explicit(self):
        reported = next(entry for entry in self.patch["patches"] if entry["unit"] == 42 and "short-answer" in entry["rowId"])
        item_questions = [change["after"] for change in reported["changes"] if change["path"][-1:] == ["question"]]
        self.assertEqual(len(item_questions), 9)
        self.assertTrue(all("Direct statement:" in question or "Direct request:" in question for question in item_questions))
        accepted = [change["after"] for change in reported["changes"] if change["path"][-1:] == ["acceptedAnswers"]]
        self.assertEqual(len(accepted), 9)
        self.assertTrue(any(" that " in answer for answers in accepted for answer in answers))
        self.assertTrue(any("They said they" in answer for answers in accepted for answer in answers))

        unit_52_turns = [
            change["after"]
            for entry in self.patch["patches"]
            if entry["unit"] == 52
            for change in entry["changes"]
            if change["path"] == ["data", "turns"] and isinstance(change["after"], list)
        ]
        self.assertTrue(any("Where will we have gotten as a society in 40 years?" in turn["question"] for turns in unit_52_turns for turn in turns))
        self.assertFalse(any(entry["unit"] == 52 and "short-answer" in entry["rowId"] for entry in self.patch["patches"]))

    def test_report_records_verified_changes_and_context(self):
        report = {entry["unit"]: entry for entry in _read(REPORT_PATH)}
        self.assertTrue(set(UNITS).issubset(report))
        for unit in UNITS:
            self.assertEqual(report[unit]["evaluationContext"]["status"], "verified-and-patched")
            self.assertTrue(report[unit]["verifiedErrors"])
            self.assertIn("immutableFields", report[unit]["evaluationContext"])
        self.assertIn("not bugs", report[38]["evaluationContext"]["notes"])
        self.assertIn("valid", report[52]["evaluationContext"]["notes"])


if __name__ == "__main__":
    unittest.main()
