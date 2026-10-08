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


def unit2_slide8_native_fixture() -> tuple[dict, dict]:
    """The published/native shapes from Unit 2 slide 8, reduced to the table contract."""

    title = (
        "We normally use simple present tense to talk about countries and nationalities. "
        "Not only the verb to be can be useful to talk about this. Revise the following chart and check some examples."
    )
    published = {
        "courseId": COURSE_ID,
        "lesson": {"id": LESSON_ID, "order": 2, "title": "I come from"},
        "contentId": "unit-2-source-fixture",
        "sourceUrl": "https://slides.example/unit-2",
        "status": "ok",
        "deck": {
            "deckTitle": "Unit 2 - I come from.pptx",
            "slideCount": 1,
            "slides": [
                {
                    "number": 8,
                    "title": title,
                    "visibleTexts": [
                        title,
                        "Even when we talk about this topic, the grammar rules must be respected. To Be – works alone. Other verbs – Use auxiliaries.",
                        "MOST COMMON QUESTIONS - Where are you from? - Where do you come from?",
                        "To Be verb Other verbs – Auxiliary Introduction John is American Is he American? She comes from England. Does she come from England? They are from Mexico Where are they from? You speak Italian Do you speak Italian? The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    ],
                    "tables": [],
                }
            ],
        },
    }

    def cell(text: str, *paragraphs: str) -> dict:
        return {
            "text": text,
            "paragraphs": [{"text": paragraph, "runs": [paragraph]} for paragraph in paragraphs] if paragraphs else [],
        }

    native_table = {
        "rows": [
            {
                "height": 465675,
                "cells": [
                    cell("To Be verb", "To Be verb"),
                    cell(""),
                    cell("Other verbs – Auxiliary Introduction", "Other verbs – Auxiliary Introduction"),
                    cell(""),
                ],
            },
            {
                "height": 455900,
                "cells": [
                    cell("John is American", "John is American"),
                    cell("Is he American?", "Is he American?"),
                    cell("She comes from England.", "She comes from England."),
                    cell("Does she come from England?", "Does she come from England?"),
                ],
            },
            {
                "height": 455900,
                "cells": [
                    cell("They are from Mexico", "They are from Mexico"),
                    cell("Where are they from?", "Where are they from?"),
                    cell("You speak Italian", "You speak Italian"),
                    cell("Do you speak Italian?", "Do you speak Italian?"),
                ],
            },
            {
                "height": 1185325,
                "cells": [
                    cell(
                        "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                        "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                    ),
                    cell(""),
                    cell(
                        "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                        "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action.",
                        "Do - I/You/We/They",
                        "Does - He/She/ It (3rd person singular)",
                        "*Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    ),
                    cell(""),
                ],
            },
        ]
    }
    native_slide = {
        "number": 8,
        "texts": published["deck"]["slides"][0]["visibleTexts"],
        "shapes": [
            {
                "kind": "text",
                "paragraphs": [
                    {"text": "Even when we talk about this topic, the grammar rules must be respected."},
                    {"text": "To Be – works alone."},
                    {"text": "Other verbs – Use auxiliaries."},
                    {"text": "MOST COMMON QUESTIONS"},
                ],
            }
        ],
        "tables": [native_table],
    }
    native_audit = {
        "records": [
            {
                "unit": 2,
                "status": "ok",
                "candidate": {"id": "unit-2-native-fixture", "title": "Unit 2 - I come from.pptx"},
                "native": {"slides": [native_slide]},
            }
        ]
    }
    return published, native_audit


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
        self.assertIn(8, first["sourceSlideNumbers"])
        copyright_note = next(
            row
            for row in generated
            if row["data"]["type"] == "teacher_notes" and row["data"]["data"]["sourceSlides"] == [8]
        )
        self.assertTrue(copyright_note["data"]["hiddenFromLearners"])

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

    def test_staged_audio_uses_public_playback_and_retains_drive_provenance(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5]["media"] = [
            {
                "kind": "audio",
                "originalMediaUrl": "https://drive.google.com/file/d/drive-audio/view",
                "publicHref": "/audio/lessons/course/unit-01-audio-01.mp3",
                "sourceSha256": "audio-sha256-staged",
                "transcript": "I come from Peru.",
            }
        ]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertTrue(plan["publishable"])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["url"], "/audio/lessons/course/unit-01-audio-01.mp3")
        self.assertNotIn("drive.google.com/file/d/", audio["data"]["url"])
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-staged")
        self.assertEqual(
            audio["data"]["data"]["originalSource"]["audio"]["originalMediaUrl"],
            "https://drive.google.com/file/d/drive-audio/view",
        )

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
                                    "figures": [
                                        {
                                            "localPath": str(asset),
                                            "publicUrl": "/images/lessons/course/native-fixture.png",
                                            "alt": "Original instructional figure",
                                        }
                                    ],
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
        self.assertEqual(image["data"]["url"], "/images/lessons/course/native-fixture.png")
        self.assertNotIn("slides-images-rt", image["data"]["assetPath"])
        self.assertEqual(image["data"]["data"]["originalSource"]["nativeEvidence"]["figures"][0]["assetPath"], str(asset.resolve()))

    def test_unit2_slide8_native_table_preserves_matrix_and_teaching_prose(self) -> None:
        source, native_audit = unit2_slide8_native_fixture()
        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["headers"], ["To Be verb", "", "Other verbs – Auxiliary Introduction", ""])
        self.assertEqual(
            structured["data"]["content"]["rows"],
            [
                ["John is American", "Is he American?", "She comes from England.", "Does she come from England?"],
                ["They are from Mexico", "Where are they from?", "You speak Italian", "Do you speak Italian?"],
                [
                    "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                    "",
                    "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    "",
                ],
            ],
        )
        serialized = json.dumps(structured["data"]["content"], ensure_ascii=False)
        self.assertNotIn("{'text'", serialized)
        self.assertNotIn('"paragraphs"', serialized)

        context = next(
            row
            for row in generated
            if row["data"]["type"] == "text"
            and row["data"].get("sourceRole") == "teaching-context"
            and row["data"]["data"]["sourceSlides"] == [8]
        )
        self.assertIn("Even when we talk about this topic", context["data"]["content"])
        self.assertIn("To Be", context["data"]["content"])
        self.assertIn("MOST COMMON QUESTIONS", context["data"]["content"])
        self.assertNotIn("To Be verb Other verbs", context["data"]["content"])

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
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "audio-media-missing" and blocker["slide"] == 2 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch", "native-audio-mismatch"} for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "image" for row in plan["nextRows"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))
        published_listening = next(
            row
            for row in plan["nextRows"]
            if row["data"].get("type") == "text" and row["data"]["data"].get("sourceSlides") == [2]
        )
        self.assertIn("Listen to the audio.", published_listening["data"]["content"])

    def test_conflicting_native_reading_is_discarded_but_published_passage_remains(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-reading-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 33 - This is how we do it!.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 13,
                        "title": "Reading",
                        "visibleTexts": [
                            "Read the following passage about a student living in Scotland.",
                            "I was not prepared for the cold weather in Scotland.",
                        ],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 33,
                    "status": "ok",
                    "candidate": {"id": "native-reading-priority-33", "title": "Unit 33 - This is how we do it!.pptx"},
                    "native": {
                        "slides": [
                            {
                                "number": 13,
                                "texts": [
                                    "Cultural Shock",
                                    "I went to study in Taiwan and discovered a different culture.",
                                ],
                                "paragraphs": ["The Taiwan passage is supplemental evidence for a different source."],
                            }
                        ]
                    },
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch"} for blocker in plan["blockers"]))
        reading = next(row for row in plan["nextRows"] if row["data"].get("type") == "text")
        self.assertIn("Scotland", reading["data"]["content"])
        self.assertNotIn("Taiwan", reading["data"]["content"])
        self.assertNotIn("nativeParagraphs", reading["data"])

    def test_conflicting_native_slide_keeps_required_picture_evidence_blocker(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-picture-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 4,
                        "title": "Picture",
                        "visibleTexts": ["Look at the picture and answer the question."],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-picture-priority-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {"slides": [{"number": 4, "texts": ["A different grammar exercise."]}]},
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 4 for blocker in plan["blockers"]))
        published = next(
            row
            for row in plan["nextRows"]
            if row["data"].get("data", {}).get("sourceSlides") == [4]
        )
        self.assertIn("Look at the picture", str(published["data"]))

    def test_conflicting_native_chart_keeps_required_table_blocker(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-chart-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 1,
                "slides": [{"number": 2, "title": "Grammar chart", "visibleTexts": ["Grammar chart", "Check the chart below."]}],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-chart-priority-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {"slides": [{"number": 2, "texts": ["A different reading passage."]}]},
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "table-semantics-missing" and blocker["slide"] == 2 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch"} for blocker in plan["blockers"]))

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
                                    {
                                        "localPath": str(asset),
                                        "publicUrl": "/images/lessons/course/confirmed.png",
                                        "classification": "figure",
                                        "alt": "Confirmed figure",
                                    },
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
        self.assertEqual(images[0]["data"]["url"], "/images/lessons/course/confirmed.png")
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

    def test_exercise_review_maps_distinct_reading_questions_and_accepted_answers(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][3])]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "schemaVersion": 1,
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        str(source_slide["number"]): {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s04-q1",
                                    "kind": "reading-comprehension",
                                    "prompt": "What country is Maria from?",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "answer",
                                            "canonical": "Peru",
                                            "accepted": ["Peru", "the country of Peru"],
                                            "evidence": "Maria is from Peru.",
                                        }
                                    ],
                                    "sourceEvidence": ["Maria is from Peru."],
                                },
                                {
                                    "id": "u02-s04-q2",
                                    "kind": "reading-comprehension",
                                    "prompt": "Where does Joao come from?",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "answer",
                                            "canonical": "Brazil",
                                            "accepted": ["Brazil"],
                                            "evidence": "Joao is from Brazil.",
                                        }
                                    ],
                                    "sourceEvidence": ["Joao is from Brazil."],
                                },
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        short_answer = next(row for row in plan["nextRows"] if row["data"].get("type") == "short_answer")
        self.assertEqual([item["question"] for item in short_answer["data"]["items"]], ["What country is Maria from?", "Where does Joao come from?"])
        self.assertEqual(short_answer["data"]["items"][0]["correctAnswer"], "Peru")
        self.assertEqual(short_answer["data"]["items"][0]["acceptedAnswers"], ["Peru", "the country of Peru"])
        self.assertEqual(short_answer["data"]["data"]["exerciseReviewItems"][0]["id"], "u02-s04-q1")

    def test_exercise_review_maps_grammar_transform_to_labeled_items_and_preserves_options(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Grammar practice", "visibleTexts": ["Grammar practice", "Jared comes from Morocco."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-a1",
                                    "kind": "grammar-transform",
                                    "prompt": "Jared comes from Morocco.",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {"id": "interrogative", "canonical": "Does Jared come from Morocco?", "accepted": ["Does Jared come from Morocco?"], "evidence": "Jared comes from Morocco."},
                                        {"id": "negative", "canonical": "Jared does not come from Morocco.", "accepted": ["Jared does not come from Morocco.", "Jared doesn't come from Morocco."], "evidence": "Jared comes from Morocco."},
                                    ],
                                    "sourceEvidence": ["Jared comes from Morocco."],
                                },
                                {
                                    "id": "u02-s12-choice",
                                    "kind": "grammar-choice",
                                    "prompt": "Choose the correct subject.",
                                    "reviewStatus": "reviewed",
                                    "builderHints": {
                                        "_explicit_options": [
                                            {"id": "a", "text": "Jared"},
                                            {"id": "b", "text": "Morocco"},
                                            {"id": "c", "text": "comes"},
                                            {"id": "d", "text": "from"},
                                        ],
                                        "_explicit_answer_key": "a",
                                    },
                                    "answerItems": [{"id": "answer", "canonical": "Jared", "accepted": ["Jared"], "evidence": "Jared comes from Morocco."}],
                                    "sourceEvidence": ["Jared comes from Morocco."],
                                },
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        short_answer = next(row for row in plan["nextRows"] if row["data"].get("type") == "short_answer")
        self.assertEqual([item["question"] for item in short_answer["data"]["items"]], ["Interrogative: Jared comes from Morocco.", "Negative: Jared comes from Morocco."])
        multiple_choice = next(row for row in plan["nextRows"] if row["data"].get("type") == "multiple_choice")
        self.assertEqual([option["text"] for option in multiple_choice["data"]["options"]], ["Jared", "Morocco", "comes", "from"])
        self.assertEqual(multiple_choice["data"]["correctOptionId"], "a")

    def test_exercise_review_keeps_ambiguous_answer_out_of_native_key(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Grammar practice", "visibleTexts": ["Grammar practice", "Correct the sentence."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-correction",
                                    "kind": "grammar-correction",
                                    "prompt": "Correct the sentence.",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "item-1",
                                            "canonical": "Source wording is insufficient to determine a unique correction.",
                                            "accepted": [],
                                            "status": "source-ambiguous",
                                            "evidence": "Correct the sentence.",
                                        }
                                    ],
                                    "sourceEvidence": ["Correct the sentence."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-answer-ambiguous" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "short_answer" for row in plan["nextRows"]))

    def test_exercise_review_does_not_downgrade_unmatched_choice_key(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Choice", "visibleTexts": ["Choice", "Choose the correct answer."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-choice",
                                    "kind": "multiple-choice",
                                    "prompt": "Choose the correct answer.",
                                    "reviewStatus": "reviewed",
                                    "builderHints": {
                                        "_explicit_options": [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}],
                                        "_explicit_answer_key": "missing-option",
                                    },
                                    "answerItems": [{"id": "answer", "canonical": "A", "accepted": ["A"], "evidence": "Choose the correct answer."}],
                                    "sourceEvidence": ["Choose the correct answer."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-answer-unmatched" for blocker in plan["blockers"]))
        choice_rows = [
            row
            for row in plan["nextRows"]
            if row["data"].get("type") in {"multiple_choice", "short_answer"}
            and row["data"].get("data", {}).get("sourceSlides") == [12]
        ]
        self.assertEqual(choice_rows, [])

    def test_exercise_review_rejects_source_url_text_and_digest_mismatch(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 4, "title": "Reading", "visibleTexts": ["Reading", "Maria is from Peru."]}]
        source["deck"]["slideCount"] = 1
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": "https://slides.example/different-source",
                    "slides": {
                        "4": {
                            "source": {
                                "number": 4,
                                "title": "Changed title",
                                "visibleTexts": ["Changed title", "Different evidence"],
                                "slideTextDigest": "0" * 64,
                            },
                            "items": [],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        codes = {blocker["code"] for blocker in plan["blockers"]}
        self.assertIn("exercise-review-source-url-mismatch", codes)
        self.assertIn("exercise-review-slide-text-mismatch", codes)
        self.assertIn("exercise-review-slide-digest-mismatch", codes)

    def test_blocked_listening_review_never_emits_playable_audio(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and answer the question."],
                "media": [{"kind": "audio", "url": "https://audio.example/original.mp3"}],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "6": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s06-a",
                                    "kind": "listening",
                                    "prompt": "Listen to the audio and answer the question.",
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "answerItems": [],
                                    "sourceEvidence": ["Listen to the audio and answer the question."],
                                    "blocker": "Transcript is not available.",
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))

    def test_listening_review_merges_four_choice_items_with_staged_audio(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][5]["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        options = [
            {"id": "a", "text": "Peru"},
            {"id": "b", "text": "Brazil"},
            {"id": "c", "text": "Chile"},
            {"id": "d", "text": "Mexico"},
        ]
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 0,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [
                        {
                            "id": f"listening-{index}",
                            "prompt": f"Which country is named in sentence {index}?",
                            "explicitOptions": copy.deepcopy(options),
                            "answerItems": [{"canonical": "Peru", "evidence": "I come from Peru."}],
                            "evidence": "I come from Peru.",
                            "reviewStatus": "reviewed",
                        }
                        for index in range(1, 5)
                    ],
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        audio = next(row for row in generated if row["data"].get("type") == "audio")
        multiple_choice = next(row for row in generated if row["data"].get("type") == "multiple_choice")
        self.assertEqual(audio["data"]["url"], "/audio/lessons/course/unit-02-audio-01.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-fixture")
        self.assertEqual(multiple_choice["data"]["data"]["sourceSlides"], [6])
        self.assertEqual(audio["data"]["data"]["sourceSlides"], [6])
        self.assertEqual(len(multiple_choice["data"]["items"]), 4)
        self.assertTrue(all(len(item["options"]) == 4 for item in multiple_choice["data"]["items"]))
        self.assertTrue(all(item["correctOptionId"] == "a" for item in multiple_choice["data"]["items"]))
        self.assertFalse(any(row["data"].get("type") == "text" and row["data"]["data"].get("sourceSlides") == [6] for row in generated))

    def test_listening_review_rejects_transcript_evidence_sha_and_manual_status(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        slide["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 0,
                    "sourceAudioSha256": "wrong-sha",
                    "items": [
                        {
                            "id": "blocked-listening",
                            "prompt": "Which country is named?",
                            "explicitOptions": [
                                {"id": "a", "text": "Peru"},
                                {"id": "b", "text": "Brazil"},
                                {"id": "c", "text": "Chile"},
                                {"id": "d", "text": "Mexico"},
                            ],
                            "answerItems": [{"canonical": "Peru"}],
                            "evidence": "This sentence is absent from the transcript.",
                            "reviewStatus": "manual",
                        }
                    ],
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        codes = {blocker["code"] for blocker in plan["blockers"]}
        self.assertFalse(plan["publishable"])
        self.assertIn("listening-review-audio-sha-mismatch", codes)
        self.assertIn("listening-review-blocked", codes)
        self.assertFalse(any(row["data"].get("type") in {"audio", "multiple_choice"} and row["data"]["data"].get("sourceSlides") == [6] for row in plan["nextRows"]))

        review["exercises"][0]["sourceAudioSha256"] = "audio-sha256-fixture"
        review["exercises"][0]["items"][0]["reviewStatus"] = "reviewed"
        evidence_plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)
        evidence_codes = {blocker["code"] for blocker in evidence_plan["blockers"]}
        self.assertIn("listening-review-evidence-mismatch", evidence_codes)
        self.assertFalse(any(row["data"].get("type") in {"audio", "multiple_choice"} and row["data"]["data"].get("sourceSlides") == [6] for row in evidence_plan["nextRows"]))

    def test_listening_review_rejects_ambiguous_correct_option_and_wrong_scope(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        source["deck"]["slides"][0]["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        review = {
            "exercises": [
                {
                    "lessonId": "another-lesson",
                    "slideNumber": 6,
                    "audioIndex": 0,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [],
                },
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 0,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [
                        {
                            "id": "ambiguous",
                            "prompt": "Which country is named?",
                            "explicitOptions": [
                                {"id": "a", "text": "Peru"},
                                {"id": "b", "text": "Brazil"},
                                {"id": "c", "text": "Chile"},
                                {"id": "d", "text": "Mexico"},
                            ],
                            "answerItems": [{"canonical": "Peru"}, {"canonical": "Brazil"}],
                            "evidence": "I come from Peru.",
                            "reviewStatus": "reviewed",
                        }
                    ],
                },
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "listening-review-answer-ambiguous" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "multiple_choice" for row in plan["nextRows"]))

    def test_listening_review_cli_combines_repeatable_documents(self) -> None:
        combined = builder._listening_review_documents(
            [
                {"exercises": [{"lessonId": LESSON_ID, "slideNumber": 6}]},
                {"exercises": [{"lessonId": LESSON_ID, "slideNumber": 7}]},
            ]
        )

        self.assertEqual(
            [(item["lessonId"], item["slideNumber"]) for item in combined["exercises"]],
            [(LESSON_ID, 6), (LESSON_ID, 7)],
        )
        args = builder._parse_args(
            [
                "--snapshot", "snapshot.json",
                "--source-dir", "sources",
                "--output", "plans.json",
                "--listening-review", "review-a.json",
                "--listening-review", "review-b.json",
            ]
        )
        self.assertEqual([str(path) for path in args.listening_review], ["review-a.json", "review-b.json"])

    def test_exercise_review_keeps_roleplay_and_writing_as_separate_open_blocks(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 5,
                "title": "Practice",
                "visibleTexts": ["Practice", "Act out the situation with your teacher and write a 30-50 word paragraph."],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "5": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s05-roleplay-writing",
                                    "kind": "roleplay-and-writing",
                                    "prompt": "Act out the situation with your teacher and write a 30-50 word paragraph.",
                                    "responseMode": "open-response",
                                    "reviewStatus": "open-response-preserved",
                                    "answerItems": [],
                                    "sourceEvidence": ["Act out the situation with your teacher and write a 30-50 word paragraph."],
                                    "doNotAutoGrade": True,
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        generated_types = [row["data"].get("type") for row in plan["nextRows"]]
        self.assertIn("recording", generated_types)
        self.assertIn("essay", generated_types)
        recording = next(row for row in plan["nextRows"] if row["data"].get("type") == "recording")
        essay = next(row for row in plan["nextRows"] if row["data"].get("type") == "essay")
        self.assertIn("Act out the situation", recording["data"]["instruction"])
        self.assertTrue(recording["data"]["aiGrading"])
        self.assertNotIn("doNotAutoGrade", recording["data"])
        self.assertEqual(recording["data"]["data"]["guidedRole"], "conversation")
        self.assertEqual(recording["data"]["data"]["turns"][0]["question"], review["lessons"][LESSON_ID]["slides"]["5"]["items"][0]["prompt"])
        self.assertEqual(recording["data"]["data"]["turns"][0]["answerPrompt"], "Responde a la situación.")
        self.assertIn("30-50 word paragraph", essay["data"]["prompt"])
        self.assertTrue(essay["data"]["aiGrading"])
        self.assertIn("Authored source prompt", essay["data"]["data"]["aiGradingContext"])
        self.assertEqual(essay["data"]["minWords"], 30)
        self.assertEqual(essay["data"]["maxWords"], 50)

    def test_teacher_listening_with_staged_transcript_keeps_audio_and_open_reflection(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and write two phrases you understood."],
                "media": [
                    {
                        "kind": "audio",
                        "url": "https://cdn.example/lesson/audio-6.mp3",
                        "digest": "audio-sha256-fixture",
                        "transcript": "I come from Peru.",
                    }
                ],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "6": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s06-reflection",
                                    "kind": "listening",
                                    "prompt": "Listen to the audio and write two phrases you understood.",
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "answerItems": [],
                                    "sourceEvidence": ["Listen to the audio and write two phrases you understood."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))
        audio = next(row for row in plan["nextRows"] if row["data"].get("type") == "audio")
        reflection = next(row for row in plan["nextRows"] if row["data"].get("type") == "essay")
        self.assertEqual(audio["data"]["transcript"], "I come from Peru.")
        self.assertTrue(reflection["data"]["aiGrading"])
        self.assertIn("I come from Peru.", reflection["data"]["data"]["aiGradingContext"])
        self.assertIn("write two phrases", reflection["data"]["prompt"])

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
