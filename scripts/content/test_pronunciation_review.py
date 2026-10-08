import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REVIEW_PATH = ROOT / "docs" / "audit" / "pronunciation-review-06-14.json"
TRANSCRIPTS_PATH = ROOT / "docs" / "audit" / "course-audio-transcripts" / "course-audio-transcripts.json"


class PronunciationReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review = json.loads(REVIEW_PATH.read_text(encoding="utf-8"))
        transcripts = json.loads(TRANSCRIPTS_PATH.read_text(encoding="utf-8"))["transcripts"]
        cls.transcripts = {(row["unit"], row["audioIndex"]): row for row in transcripts}

    def test_scope_has_the_two_audio3_sources_and_exact_clip_digests(self):
        self.assertEqual(self.review["courseId"], "cmjnr0g5x0001jp04fsw2fejs")
        self.assertEqual({(row["unit"], row["audioIndex"]) for row in self.review["exercises"]}, {(6, 3), (14, 3)})
        for exercise in self.review["exercises"]:
            transcript = self.transcripts[(exercise["unit"], exercise["audioIndex"])]
            self.assertEqual(exercise["sourceAudioSha256"], transcript["sourceSha256"])
            self.assertEqual(exercise["sourceFilename"], transcript["sourceFilename"])

    def test_each_authored_item_has_four_source_words_and_one_supported_answer(self):
        for exercise in self.review["exercises"]:
            transcript = self.transcripts[(exercise["unit"], exercise["audioIndex"])]
            clear_words = {
                entry["word"]
                for entry in exercise["clipWordInventory"]
                if entry["status"].startswith("clear")
            }
            by_word = {entry["word"]: entry for entry in exercise["clipWordInventory"]}
            for item in exercise["items"]:
                options = item["explicitOptions"]
                self.assertEqual(len(options), 4)
                self.assertEqual(len({option.casefold() for option in options}), 4)
                self.assertEqual(options.count(item["correct"]), 1)
                self.assertTrue(set(options) <= clear_words)
                self.assertEqual(item["sourceAudioSha256"], exercise["sourceAudioSha256"])
                self.assertEqual(item["sourceEvidence"]["nativeDeckSha256"], exercise["sourceDeck"]["sha256"])
                self.assertEqual(item["sourceEvidence"]["nativeSlideNumber"], exercise["slideNumber"])
                self.assertIn(item["evidence"], transcript["text"])
                self.assertEqual(by_word[item["correct"]]["targetSound"], item["targetSound"])

    def test_unit6_missing_audio_slots_remain_explicitly_blocked(self):
        unit6 = next(exercise for exercise in self.review["exercises"] if exercise["unit"] == 6)
        self.assertEqual(unit6["coverageStatus"], "partial-source-slots")
        self.assertEqual([slot["slot"] for slot in unit6["unresolvedAudioSlots"]], [6, 7])
        self.assertTrue(all(slot["status"] == "blocked-manual" for slot in unit6["unresolvedAudioSlots"]))
        self.assertEqual(len(unit6["items"]), 3)


if __name__ == "__main__":
    unittest.main()
