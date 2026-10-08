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

    def test_reviewed_exercise_keeps_sha_and_archives_unsupported_source_claims(self):
        source_slide = slide(
            13,
            "B. Listen to the audio. After that state if the sentences are true or false.",
            visible=[
                "B. Listen to the audio. After that state if the sentences are true or false.",
                "1. He is from Venezuela. (T) (F) 2. His mother lives in the USA. (T) (F)",
            ],
            item_id="u02-s13-b",
        )
        exercise = {
            "courseId": MODULE.COURSE_ID,
            "lessons": {
                "lesson-2": {
                    "unit": 2,
                    "lessonTitle": "I come from...",
                    "slides": {"4": slide(4, "B. Listen to the audio and discuss the topic."), "13": source_slide},
                }
            },
        }
        source = transcript(2, 2, "He is from Venezuela. Welcome to the USA.")
        output = MODULE.build_reviewed_exercises(exercise, {"transcripts": [transcript(2, 1, "The topic is origins."), source]})
        item_set = next(item for item in output["exercises"] if item["unit"] == 2)
        self.assertEqual(item_set["reviewStatus"], "reviewed")
        self.assertEqual(item_set["sourceAudioSha256"], source["sourceSha256"])
        self.assertIn("He is from Venezuela.", item_set["items"][0]["answerItems"][0]["evidence"])
        self.assertEqual(len(item_set["originalQuestionsOmitted"]), 1)
        self.assertEqual(item_set["originalQuestionsOmitted"][0]["question"], "His mother lives in the USA")

    def test_missing_source_questions_are_blocked_until_semantic_authoring(self):
        exercise = {
            "courseId": MODULE.COURSE_ID,
            "lessons": {
                "lesson-15": {
                    "unit": 15,
                    "lessonTitle": "I remember I...",
                    "slides": {"4": slide(4, "B. Listen to the audio and discuss the topic.")},
                }
            },
        }
        output = MODULE.build_reviewed_exercises(
            exercise,
            {"transcripts": [transcript(15, 2, "We used to play near the river. We went there every Saturday. We were good kids. We listened to music.")]},
        )
        item_set = output["exercises"][0]
        self.assertEqual(item_set["reviewStatus"], "blocked-unreviewed-pedagogy")
        self.assertEqual(len(item_set["items"]), 4)
        self.assertTrue(all(item["reviewStatus"] == "blocked-unreviewed-pedagogy" for item in item_set["items"]))
        self.assertTrue(all(item["answerItems"] == [] for item in item_set["items"]))
        self.assertTrue(all(item["correct"] is None for item in item_set["items"]))
        self.assertTrue(all(item["originalQuestion"] is None for item in item_set["items"]))

    def test_manual_units_three_to_fifteen_have_four_grounded_multiple_choice_items(self):
        lessons = {
            f"lesson-{unit}": {"unit": unit, "lessonTitle": f"Unit {unit}", "slides": {}}
            for unit in range(3, 16)
        }
        transcripts = {
            "transcripts": [
                transcript(
                    unit,
                    2,
                    " ".join(question["evidence"] for question in MODULE.MANUAL_AUTHORED_03_15[unit]),
                )
                for unit in range(3, 16)
            ]
        }
        source_sets = {
            "exercises": [
                {
                    "unit": unit,
                    "audioIndex": 2,
                    "lessonId": f"lesson-{unit}",
                    "lessonTitle": f"Unit {unit}",
                    "slideNumber": 13,
                    "sourceExactTexts": [f"Unit {unit} source"],
                    "sourceItemIds": [f"u{unit:02d}-s13-b"],
                    "sourcePrompts": ["Listen and answer."],
                }
                for unit in range(3, 16)
            ]
        }
        output = MODULE.build_authored_03_15(
            {"courseId": MODULE.COURSE_ID, "lessons": lessons},
            transcripts,
            source_sets,
        )
        self.assertEqual(output["counts"], {
            "exerciseSets": 13,
            "reviewedSets": 13,
            "blockedSets": 0,
            "reviewedItems": 52,
            "blockedItems": 0,
        })
        for item_set in output["exercises"]:
            self.assertEqual(item_set["reviewStatus"], "reviewed")
            self.assertEqual(len(item_set["items"]), 4)
            for item in item_set["items"]:
                self.assertEqual(item["kind"], "prompt")
                self.assertEqual(item["format"], "multiple-choice")
                self.assertEqual(len(item["explicitOptions"]), 4)
                self.assertEqual(len({option.casefold() for option in item["explicitOptions"]}), 4)
                self.assertIn(item["correct"], item["explicitOptions"])
                self.assertEqual(item["answerItems"][0]["canonical"], item["correct"])
                self.assertEqual(item["answerItems"][0]["sourceAudioSha256"], item_set["sourceAudioSha256"])
                self.assertEqual(item["answerItems"][0]["evidence"], item["evidence"])
                self.assertIn(item["evidence"], next(row for row in transcripts["transcripts"] if row["unit"] == item_set["unit"])["text"])

    def test_audio3_pronunciation_stays_blocked_without_source_answer_labels(self):
        pronunciation = slide(
            13,
            "B. Listen to the word list and classify each inflectional ending.",
            visible=["B. Listen to the word list and classify each inflectional ending."],
            item_id="u14-s13-b",
        )
        exercise = {
            "courseId": MODULE.COURSE_ID,
            "lessons": {
                "lesson-14": {
                    "unit": 14,
                    "lessonTitle": "Back then",
                    "slides": {"4": slide(4, "B. Listen to the audio and discuss the topic."), "13": pronunciation},
                }
            },
        }
        output = MODULE.build_reviewed_exercises(
            exercise,
            {"transcripts": [transcript(14, 3, "Number 1. Walked. Number 2. Played. Number 3. Wanted.")]},
        )
        item_set = output["exercises"][0]
        self.assertEqual(item_set["reviewStatus"], "blocked-manual")
        self.assertEqual(item_set["items"][0]["reviewStatus"], "blocked-manual-source-key")
        self.assertEqual(item_set["items"][0]["answerItems"], [])


if __name__ == "__main__":
    unittest.main()
