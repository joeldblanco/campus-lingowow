import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "content" / "course-exercise-review.py"
SPEC = importlib.util.spec_from_file_location("course_exercise_review", SCRIPT)
assert SPEC and SPEC.loader
reviewer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reviewer)


def _manifest(*slides):
    return {
        "courseId": "course-test",
        "sources": [
            {
                "module": {"id": "module-test", "order": 1, "title": "Module"},
                "lesson": {"id": "lesson-test", "order": 2, "title": "I come from...", "videoUrl": None},
                "sourceUrl": "https://example.test/published",
                "deck": {"deckTitle": "Unit 2", "slideCount": len(slides), "slides": list(slides)},
            }
        ],
    }


def _slide(number, text, *, audio_icon_count=0):
    return {
        "number": number,
        "title": text,
        "visibleTexts": [text],
        "links": [],
        "tables": [],
        "warnings": [],
        "mediaSummary": {"audioIconCount": audio_icon_count, "audioUrls": [], "tableCount": 0},
    }


class CourseExerciseReviewTests(unittest.TestCase):
    def test_unit2_transform_is_explicit_and_source_keyed(self):
        output = reviewer.build_review(
            _manifest(_slide(12, "A. Change the sentences into interrogative and negative form."))
        )

        lesson = output["lessons"]["lesson-test"]
        item = lesson["slides"]["12"]["items"][0]
        self.assertEqual(item["kind"], "grammar-transform")
        self.assertEqual(item["answerItems"][0]["canonical"], "Does Jared come from Morocco?")
        self.assertTrue(item["builderHints"]["_explicit_answer_key"])

    def test_listening_item_is_blocked_without_an_invented_key(self):
        output = reviewer.build_review(
            _manifest(_slide(4, "B. Listen to the audio and discuss with your teacher.", audio_icon_count=1))
        )

        item = output["lessons"]["lesson-test"]["slides"]["4"]["items"][0]
        self.assertEqual(item["reviewStatus"], "blocked-awaiting-transcript")
        self.assertEqual(item["answerItems"], [])
        self.assertTrue(item["doNotAutoGrade"])

    def test_unkeyed_closed_statement_stays_manual_review(self):
        manifest = _manifest(_slide(12, "1. The answer is in the source. (T) (F)"))
        # Change the lesson order to Unit 1 so this synthetic slide is not one of
        # the hand-authored Unit 2 records.
        manifest["sources"][0]["lesson"]["order"] = 1
        output = reviewer.build_review(manifest)

        item = output["lessons"]["lesson-test"]["slides"]["12"]["items"][0]
        self.assertEqual(item["reviewStatus"], "source-needs-manual-key")
        self.assertEqual(item["answerItems"], [])
        self.assertTrue(item["doNotAutoGrade"])
