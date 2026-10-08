"""Focused contract tests for the deterministic course-learning plan builder."""

from __future__ import annotations

import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "content" / "build-course-learning.py"
SPEC = importlib.util.spec_from_file_location("build_course_learning", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


COURSE_ID = builder.COURSE_ID
LESSON_ID = "lesson-guided-fixture"


def snapshot_fixture() -> dict:
    return {
        "courseId": COURSE_ID,
        "modules": [
            {
                "id": "module-1",
                "lessons": [
                    {
                        "id": LESSON_ID,
                        "title": "Where are you from?",
                        "rows": [
                            {
                                "id": "embed-original-1",
                                "title": "Original embed",
                                "order": 1,
                                "contentType": "EMBED",
                                "lessonId": LESSON_ID,
                                "parentId": "parent-1",
                                "data": {"url": "https://slides.example/fixture"},
                            }
                        ],
                    }
                ],
            }
        ],
    }


def source_fixture(*, complete_audio: bool = False) -> dict:
    audio_media = {
        "kind": "audio",
        "url": "https://cdn.example/lesson/audio-6.mp3",
    }
    if complete_audio:
        audio_media.update(
            {
                "digest": "audio-sha256-fixture",
                "transcript": "I come from Peru.",
            }
        )
    return {
        "courseId": COURSE_ID,
        "lesson": {"id": LESSON_ID, "title": "Where are you from?"},
        "contentId": "source-content-fixture",
        "sourceUrl": "https://slides.example/fixture",
        "status": "ok",
        "deck": {
            "deckTitle": "Where are you from?",
            "slideCount": 8,
            "slides": [
                {
                    "number": 1,
                    "title": "Objectives",
                    "visibleTexts": [
                        "Objectives",
                        "Ask and answer where people come from.",
                    ],
                },
                {
                    "number": 2,
                    "title": "Grammar chart",
                    "visibleTexts": ["Grammar chart"],
                    "tables": [
                        {
                            "rows": [
                                ["Subject", "Verb"],
                                ["I", "am"],
                                ["You", "are"],
                            ]
                        }
                    ],
                },
                {
                    "number": 3,
                    "title": "Vocabulary",
                    "visibleTexts": [
                        "Vocabulary",
                        "Peru - Peruvian",
                        "Brazil - Brazilian",
                    ],
                },
                {
                    "number": 4,
                    "title": "Reading",
                    "visibleTexts": [
                        "Read the text and answer the questions. "
                        "Maria is from Peru. She lives in Lima and studies English every day. "
                        "Her friend Joao is from Brazil. They practice together after class. "
                        "Answer the questions about their countries and cities."
                    ],
                },
                {
                    "number": 5,
                    "title": "Speaking",
                    "visibleTexts": [
                        "Act out the conversation with your teacher. Ask and answer where you come from."
                    ],
                },
                {
                    "number": 6,
                    "title": "Listening",
                    "visibleTexts": ["Listen to the audio and write the country."],
                    "media": [audio_media],
                },
                {
                    "number": 7,
                    "title": "Introduction",
                    "visibleTexts": ["Introduction"],
                },
                {
                    "number": 8,
                    "title": "Copyright",
                    "visibleTexts": ["© Lingowow. All rights reserved."],
                },
            ],
        },
    }


class BuildCourseLearningTests(unittest.TestCase):
    def test_plan_is_deterministic_and_preserves_existing_identity(self) -> None:
        source = source_fixture()
        first = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)
        second = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertEqual(first, second)
        self.assertFalse(first["publishable"])
        self.assertTrue(any(blocker["code"] == "audio-digest-missing" for blocker in first["blockers"]))
        self.assertTrue(any(blocker["code"] == "audio-transcript-missing" for blocker in first["blockers"]))

        original = first["previousRows"][0]
        copied = next(row for row in first["nextRows"] if row["id"] == original["id"])
        self.assertEqual(
            (original["title"], original["contentType"], original["lessonId"], original["parentId"]),
            (copied["title"], copied["contentType"], copied["lessonId"], copied["parentId"]),
        )
        self.assertEqual(copied["data"]["type"], "teacher_notes")
        self.assertEqual(copied["data"]["data"]["originalIDs"], ["embed-original-1"])
        self.assertEqual(copied["data"]["data"]["originalSource"], original["data"])
        generated = [row for row in first["nextRows"] if row["id"] != original["id"]]
        self.assertTrue(generated)
        self.assertEqual([row["order"] for row in first["nextRows"]], list(range(len(first["nextRows"]))))
        for row in generated:
            self.assertTrue(row["id"].startswith(f"course-guided-{LESSON_ID}-"))
            self.assertEqual(row["contentType"], "RICH_TEXT")
            self.assertEqual(row["data"]["data"]["learningRevision"], "course-guided-v1")
            self.assertTrue(row["data"]["data"]["sourceSlides"])
            self.assertEqual(row["data"]["data"]["originalSource"]["sourceUrl"], source["sourceUrl"])
            self.assertEqual(row["data"]["data"]["originalSource"]["sourceDigest"], first["sourceDigest"])

        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["headers"], ["Subject", "Verb"])
        self.assertEqual(structured["data"]["content"]["rows"], [["I", "am"], ["You", "are"]])

        vocabulary = next(row for row in generated if row["data"]["type"] == "vocabulary")
        self.assertEqual(vocabulary["data"]["items"][0]["term"], "Peru")
        self.assertEqual(vocabulary["data"]["items"][0]["definition"], "Peruvian")
        self.assertTrue(vocabulary["data"]["items"][0]["id"])

        reading = next(
            row
            for row in generated
            if row["data"]["type"] == "text" and row["data"]["data"]["sourceSlides"] == [4]
        )
        self.assertIn("<p>", reading["data"]["content"])
        self.assertIn("Maria is from Peru", reading["data"]["content"])
        reading_essay = next(row for row in generated if row["data"]["type"] == "essay" and row["data"]["data"]["sourceSlides"] == [4])
        self.assertIn("Authored passage/context", reading_essay["data"]["data"]["aiGradingContext"])
        self.assertIn("Maria is from Peru", reading_essay["data"]["data"]["aiGradingContext"])

        recording = next(row for row in generated if row["data"]["type"] == "recording")
        self.assertIn("Act out the conversation", recording["data"]["instruction"])
        self.assertTrue(recording["data"]["aiGrading"])

        self.assertNotIn(7, first["sourceSlideNumbers"])
        self.assertNotIn(8, first["sourceSlideNumbers"])

    def test_snapshot_rows_without_lesson_id_are_normalized_to_verified_parent(self) -> None:
        snapshot = snapshot_fixture()
        snapshot["modules"][0]["lessons"][0]["rows"][0].pop("lessonId")
        source = source_fixture(complete_audio=True)
        plan = builder.build_plan(snapshot["modules"][0]["lessons"][0], source)

        self.assertEqual(plan["previousRows"][0]["lessonId"], LESSON_ID)
        self.assertEqual(plan["nextRows"][0]["lessonId"], LESSON_ID)
        self.assertEqual([row["order"] for row in plan["nextRows"]], list(range(len(plan["nextRows"]))))

    def test_authored_video_link_becomes_a_native_video_block(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][0]["links"] = [{"url": "https://youtu.be/example", "kind": "video"}]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        video = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "video")
        self.assertEqual(video["data"]["url"], "https://youtu.be/example")
        self.assertEqual(video["contentType"], "RICH_TEXT")

    def test_audio_requires_immutable_media_evidence_and_preserves_transcript(self) -> None:
        source = source_fixture(complete_audio=True)
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["url"], "https://cdn.example/lesson/audio-6.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-fixture")
        self.assertEqual(audio["data"]["transcript"], "I come from Peru.")
        self.assertEqual(audio["data"]["data"]["originalSource"]["audio"]["digest"], "audio-sha256-fixture")

    def test_nested_audio_manifest_is_keyed_by_lesson_and_slide(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5].pop("media")
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        manifest = {
            "audio": {
                LESSON_ID: {
                    "6": {
                        "originalMediaUrl": "https://cdn.example/lesson/audio-6.mp3",
                        "sha256": "audio-sha256-nested",
                        "transcript": "I come from Peru.",
                    }
                }
            }
        }
        plan = builder.build_plan(lesson, source, manifest)

        self.assertTrue(plan["publishable"])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-nested")

    def test_answer_key_is_never_invented_for_an_exercise_prompt(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Practice",
                "visibleTexts": ["Complete the sentences with your own information."],
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "essay")
        self.assertTrue(exercise["data"]["aiGrading"])
        self.assertNotIn("correctAnswer", exercise["data"])
        self.assertNotIn("answer", exercise["data"])

    def test_closed_true_false_prompt_without_reviewed_key_is_blocked_not_essay(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Listening check",
                "visibleTexts": ["Listen to the audio and state if each sentence is true or false."],
                "media": [
                    {
                        "kind": "audio",
                        "url": "https://cdn.example/lesson/audio-check.mp3",
                        "digest": "audio-check-digest",
                        "transcript": "The authored listening passage.",
                    }
                ],
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "closed-answer-key-missing" and blocker["slide"] == 5 for blocker in plan["blockers"]))
        closed_rows = [row for row in plan["nextRows"] if row.get("data", {}).get("data", {}).get("sourceSlides") == [5]]
        self.assertFalse(any(row["data"].get("type") == "essay" for row in closed_rows))
        instruction = next(row for row in closed_rows if row["data"].get("type") == "text")
        self.assertTrue(instruction["data"]["reviewRequired"])
        self.assertEqual(instruction["data"]["reviewReason"], "closed-answer-key-missing")

    def test_open_audio_essay_context_includes_authored_transcript(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][5]["visibleTexts"] = ["Write a response based on what you hear."]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        exercise = next(
            row
            for row in plan["nextRows"]
            if row.get("data", {}).get("type") == "essay" and row["data"]["data"]["sourceSlides"] == [6]
        )
        context = exercise["data"]["data"]["aiGradingContext"]
        self.assertIn("Authored audio transcript", context)
        self.assertIn("I come from Peru.", context)

    def test_explicit_authored_answer_key_is_preserved_when_present(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Choose the answer",
                "visibleTexts": ["Choose the correct country."],
                "options": ["Peru", "Brazil"],
                "correctAnswer": "Peru",
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "multiple_choice")
        self.assertEqual([option["text"] for option in exercise["data"]["options"]], ["Peru", "Brazil"])
        self.assertEqual(exercise["data"]["correctOptionId"], exercise["data"]["options"][0]["id"])

    def test_missing_snapshot_lesson_is_blocked_without_dropping_source_evidence(self) -> None:
        source = source_fixture(complete_audio=True)
        plan = builder.build_plan(None, source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "lesson-missing-from-snapshot" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        self.assertTrue(generated)
        self.assertEqual(generated[0]["data"]["data"]["originalSource"]["contentId"], source["contentId"])

    def test_audio_only_slide_is_reported_as_unsupported_with_source_coverage(self) -> None:
        source = source_fixture()
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].append(
            {
                "number": 9,
                "title": "Introduction",
                "mediaSummary": {"audioIconCount": 1},
            }
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertIn(9, plan["sourceSlideNumbers"])
        self.assertEqual(plan["unsupportedSlides"][0]["slide"], 9)
        self.assertTrue(any(blocker["code"] == "unsupported-slide" and blocker["slide"] == 9 for blocker in plan["blockers"]))

    def test_manifest_reports_source_inventory_and_cli_refuses_unready_output(self) -> None:
        snapshot = snapshot_fixture()
        source = source_fixture(complete_audio=True)
        manifest = builder.build_manifest(snapshot, [source], expected_source_count=55)
        self.assertEqual(manifest["sourceCount"], 1)
        self.assertEqual(manifest["publishableCount"], 1)
        self.assertEqual(manifest["inventoryBlockers"][0]["code"], "source-inventory-count")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            snapshot_path = root / "snapshot.json"
            source_dir = root / "sources"
            output_path = root / "plans.json"
            source_dir.mkdir()
            snapshot_path.write_text(json.dumps(snapshot), encoding="utf-8")
            (source_dir / "fixture.json").write_text(json.dumps(source), encoding="utf-8")
            status = builder.main(
                [
                    "--snapshot",
                    str(snapshot_path),
                    "--source-dir",
                    str(source_dir),
                    "--output",
                    str(output_path),
                    "--expected-source-count",
                    "55",
                    "--require-ready",
                ]
            )
            self.assertEqual(status, 2)
            self.assertTrue(output_path.exists())

    def test_native_audit_merges_aligned_table_paragraph_figure_and_audio_evidence(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "contentId": "source-native-fixture",
            "sourceUrl": "https://slides.example/native-fixture",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 4,
                "slides": [
                    {"number": 1, "title": "Grammar chart", "visibleTexts": ["Grammar chart"]},
                    {"number": 2, "title": "Reading", "visibleTexts": ["Reading"]},
                    {
                        "number": 3,
                        "title": "Listening",
                        "visibleTexts": ["Listening", "Listen to the audio and repeat."],
                        "media": [{"kind": "audio-icon"}],
                    },
                    {"number": 4, "title": "Picture", "visibleTexts": ["Picture"]},
                ],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "instructional-figure.png"
            asset.write_bytes(b"fixture image")
            native_audit = {
                "_auditPath": str(Path(directory) / "native-audit.json"),
                "records": [
                    {
                        "unit": 2,
                        "status": "ok",
                        "candidate": {"id": "native-fixture-2", "title": "Unit 2 - Where are you from?.pptx"},
                        "native": {
                            "slides": [
                                {
                                    "number": 1,
                                    "texts": ["Grammar chart"],
                                    "tables": {"rows": [["Subject", "Verb"], ["I", "am"]]},
                                },
                                {
                                    "number": 2,
                                    "texts": ["Reading"],
                                    "paragraphs": ["The native paragraph remains readable and traceable."],
                                },
                                {
                                    "number": 3,
                                    "texts": ["Listening", "Listen to the audio and repeat."],
                                    "audio": [
                                        {
                                            "originalMediaURL": "https://drive.example/audio-3.mp3",
                                            "sha256": "native-audio-digest",
                                            "transcript": "Repeat the original recording.",
                                        }
                                    ],
                                },
                                {
                                    "number": 4,
                                    "texts": ["Picture"],
                                    "figures": [{"localPath": str(asset), "alt": "Original instructional figure"}],
                                },
                            ]
                        },
                    }
                ],
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["rows"], [["I", "am"]])
        reading = next(row for row in generated if row["data"]["type"] == "text" and row["data"]["data"]["sourceSlides"] == [2])
        self.assertIn("native paragraph remains readable", reading["data"]["content"])
        self.assertEqual(reading["data"]["nativeParagraphs"], ["The native paragraph remains readable and traceable."])
        audio = next(row for row in generated if row["data"]["type"] == "audio")
        self.assertEqual(audio["data"]["url"], "https://drive.example/audio-3.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "native-audio-digest")
        self.assertEqual(audio["data"]["transcript"], "Repeat the original recording.")
        image = next(row for row in generated if row["data"]["type"] == "image")
        self.assertEqual(image["data"]["assetPath"], str(asset.resolve()))
        self.assertNotIn("slides-images-rt", image["data"]["assetPath"])
        self.assertEqual(image["data"]["data"]["originalSource"]["nativeEvidence"]["figures"][0]["assetPath"], str(asset.resolve()))

    def test_native_audit_rejects_slide_mismatch_and_untraceable_figure(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-rejection",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 2,
                "slides": [
                    {"number": 1, "title": "Picture", "visibleTexts": ["Picture"]},
                    {"number": 2, "title": "Listening", "visibleTexts": ["Listening", "Listen to the audio."]},
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-rejection-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {
                        "slides": [
                            {
                                "number": 1,
                                "texts": ["Picture"],
                                "figures": [{"url": "https://docs.google.com/slides-images-rt/rendered-slide.png"}],
                                "audio": [
                                    {
                                        "slideNumber": 99,
                                        "originalMediaURL": "https://audio.example/mismatch.mp3",
                                        "sha256": "mismatch-digest",
                                        "transcript": "Mismatched audio.",
                                    }
                                ],
                            },
                            {"number": 2, "texts": ["A different listening prompt"]},
                        ]
                    },
                }
            ]
        }
        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-untraceable" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "native-audio-mismatch" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "native-slide-mismatch" and blocker["slide"] == 2 for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "image" for row in plan["nextRows"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))

    def test_native_image_refs_require_confirmed_instructional_role(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-image-role",
            "status": "ok",
            "deck": {
                "deckTitle": "Where are you from?",
                "slideCount": 1,
                "slides": [{"number": 1, "title": "Art", "visibleTexts": ["Art"]}],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "instructional-figure.png"
            asset.write_bytes(b"fixture image")
            native_audit = {
                "records": [
                    {
                        "unit": 2,
                        "status": "ok",
                        "candidate": {"id": "native-image-role-2", "title": "Where are you from?"},
                        "native": {
                            "slides": [
                                {
                                    "number": 1,
                                    "texts": ["Art"],
                                    "imageRefs": [
                                        {"localPath": str(Path(directory) / "missing-logo.png"), "role": "logo"},
                                        {"localPath": str(Path(directory) / "missing-candidate.png"), "role": "instructional-candidate"},
                                        {"localPath": str(asset), "classification": "figure", "alt": "Confirmed figure"},
                                    ],
                                }
                            ]
                        },
                    }
                ]
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        images = [row for row in plan["nextRows"] if row["data"].get("type") == "image"]
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]["data"]["assetPath"], str(asset.resolve()))
        self.assertEqual(images[0]["data"]["alt"], "Confirmed figure")

    def test_required_picture_prompt_blocks_without_confirmed_figure_evidence(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/required-picture",
            "status": "ok",
            "deck": {
                "deckTitle": "Where are you from?",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 1,
                        "title": "Picture Practice",
                        "visibleTexts": ["Picture Practice", "Look at the picture and answer the question."],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "required-picture-2", "title": "Where are you from?"},
                    "native": {
                        "slides": [
                            {
                                "number": 1,
                                "texts": ["Picture Practice", "Look at the picture and answer the question."],
                                "imageRefs": [{"url": "https://assets.example/logo.png", "role": "logo"}],
                            }
                        ]
                    },
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] == "native-figure-untraceable" for blocker in plan["blockers"]))

    def test_audio_manifest_with_wrong_lesson_or_slide_is_not_attached(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5].pop("media")
        manifest = {
            "entries": [
                {
                    "lessonId": "another-lesson",
                    "slideNumber": 6,
                    "originalMediaUrl": "https://audio.example/wrong.mp3",
                    "sha256": "wrong-digest",
                    "transcript": "Wrong lesson transcript.",
                }
            ]
        }
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source, manifest)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "audio-media-missing" and blocker["slide"] == 6 for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))


if __name__ == "__main__":
    unittest.main()
