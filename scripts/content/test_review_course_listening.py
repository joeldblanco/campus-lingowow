import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("review-course-listening.py")
SPEC = importlib.util.spec_from_file_location("review_course_listening", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def slide(number, prompt, *, audio_icons=1, visible=None, item_id=None):
    return {
        "source": {
            "number": number,
            "title": prompt,
            "visibleTexts": visible or [prompt],
            "mediaSummary": {"audioIconCount": audio_icons},
        },
        "items": [
            {
                "id": item_id or f"u02-s{number:02d}-b",
                "kind": "listening",
                "prompt": prompt,
                "responseMode": "teacher-listening",
                "sourceEvidence": [prompt],
            }
        ],
    }


def transcript(unit, index, text, *, language_probability=0.99, avg_logprob=-0.1):
    return {
        "unit": unit,
        "audioIndex": index,
        "sourceFilename": f"Unit {unit} - Audio {index}.mp3",
        "sourcePath": f"docs/audit/source-originals/audio/unit-{unit}-{index}.mp3",
        "sourceSha256": f"{unit:02d}{index:02d}" + "a" * 60,
        "sourceBytes": 123,
        "language": "en",
        "languageProbability": language_probability,
        "avgLogprob": avg_logprob,
        "text": text,
        "segments": [{"start": 0.0, "end": 1.0, "text": text, "avgLogprob": avg_logprob}],
    }


class CourseListeningReviewTests(unittest.TestCase):
    def test_context_maps_intro_and_comprehension_and_preserves_candidate_block(self):
        exercise = {
            "courseId": MODULE.COURSE_ID,
            "lessons": {
                "lesson-2": {
                    "unit": 2,
                    "lessonTitle": "I come from...",
                    "slides": {
                        "4": slide(4, "B. Listen to the audio and discuss the topic."),
                        "13": slide(13, "B. Listen to the audio and answer questions."),
                    },
                },
                "lesson-3": {
                    "unit": 3,
                    "lessonTitle": "Every Day",
                    "slides": {
                        "4": slide(
                            4,
                            "B. Listen to the audio and tell your teacher the activities.",
                            item_id="u03-s04-b",
                        )
                    },
                },
            },
        }
        output = MODULE.build_review(
            exercise,
            {
                "transcripts": [
                    transcript(2, 1, "The topic is origins."),
                    transcript(2, 2, "He is from Venezuela."),
                    transcript(3, 2, "The generic candidate is available."),
                ]
            },
        )
        by_id = {item["itemId"]: item for item in output["items"]}
        self.assertEqual(by_id["u02-s04-b"]["audioIndex"], 1)
        self.assertEqual(by_id["u02-s13-b"]["audioIndex"], 2)
        self.assertEqual(by_id["u02-s13-b"]["reviewStatus"], "matched-review")
        self.assertEqual(by_id["u03-s04-b"]["audioIndex"], 1)
        self.assertEqual(by_id["u03-s04-b"]["reviewStatus"], "blocked-candidate-only")

    def test_duplicate_source_slide_reuses_audio_and_teacher_led_stays_blocked(self):
        duplicate_a = slide(4, "B. Listen to the audio and answer teacher questions.", audio_icons=0)
        duplicate_a["items"][0]["id"] = "u04-s05-b"
        duplicate_b = slide(5, "👦 👨\nB. Listen to the audio and answer teacher questions.")
        duplicate_b["items"][0]["id"] = "u04-s05-review"
        teacher = slide(15, "D. Listen to your teacher and tell him about your preferences.", audio_icons=0)
        teacher["items"][0]["id"] = "u04-s15-d"
        output = MODULE.build_review(
            {
                "courseId": MODULE.COURSE_ID,
                "lessons": {
                    "lesson-4": {
                        "unit": 4,
                        "lessonTitle": "I love it!",
                        "slides": {"4": duplicate_a, "5": duplicate_b, "15": teacher},
                    }
                },
            },
            {"transcripts": [transcript(4, 1, "I love video games."), transcript(4, 2, "I love cooking.")]},
        )
        by_id = {item["itemId"]: item for item in output["items"]}
        self.assertEqual(by_id["u04-s05-b"]["audioIndex"], 1)
        self.assertEqual(by_id["u04-s05-review"]["audioIndex"], 1)
        self.assertEqual(by_id["u04-s15-d"]["audioIndex"], None)
        self.assertEqual(by_id["u04-s15-d"]["reviewStatus"], "blocked-teacher-led-no-source-audio")

    def test_tf_resolution_is_conservative(self):
        source = transcript(
            2,
            2,
            "He is from Venezuela, but his dad is American. He is here to visit him. Welcome to the USA.",
        )
        self.assertEqual(MODULE.resolve_tf_claim("He is from Venezuela", source)["correct"], "true")
        self.assertEqual(MODULE.resolve_tf_claim("He is in the USA to work", source)["correct"], "false")
        unsupported = MODULE.resolve_tf_claim("His mother lives in the USA", source)
        self.assertEqual(unsupported["correct"], "not-stated")
        self.assertEqual(unsupported["resolution"], "unsupported-by-transcript")
        self.assertTrue(unsupported["manualReview"])

    def test_low_confidence_transcript_requires_manual_review(self):
        output = MODULE.build_review(
            {
                "courseId": MODULE.COURSE_ID,
                "lessons": {
                    "lesson-43": {
                        "unit": 43,
                        "lessonTitle": "Unit 43",
                        "slides": {"4": slide(4, "B. Listen to the audio and discuss the topic.")},
                    }
                },
            },
            {"transcripts": [transcript(43, 1, "A low confidence clause.", language_probability=0.82)]},
        )
        item = output["items"][0]
        self.assertEqual(item["reviewStatus"], "matched-awaiting-manual-review")
        self.assertIn("low-language-probability", item["uncertaintyFlags"])

    def test_reading_true_false_block_is_not_attached_to_listening_prompt(self):
        output = MODULE.build_review(
            {
                "courseId": MODULE.COURSE_ID,
                "lessons": {
                    "lesson-13": {
                        "unit": 13,
                        "lessonTitle": "I am working on it!",
                        "slides": {
                            "13": {
                                "source": {
                                    "visibleTexts": [
                                        "B. Listen to two people talking and report what they are saying.",
                                        "C. Read the paragraph and state if the sentences are true or false.",
                                        "1. Annie is writing the email. (T) (F)",
                                    ],
                                    "mediaSummary": {"audioIconCount": 0},
                                },
                                "items": [
                                    {
                                        "id": "u13-s13-b",
                                        "kind": "listening",
                                        "prompt": "B. Listen to two people talking and report what they are saying.",
                                        "responseMode": "teacher-listening",
                                    }
                                ],
                            }
                        },
                    }
                },
            },
            {"transcripts": [transcript(13, 2, "They are talking about vacations.")]},
        )
        self.assertEqual(output["items"][0]["questions"], [])


if __name__ == "__main__":
    unittest.main()
