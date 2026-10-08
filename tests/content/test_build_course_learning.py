"""Focused contract tests for the deterministic course-learning plan builder."""

from __future__ import annotations

import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "content" / "build-course-learning.py"
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
        self.assertEqual(copied["data"]["metadata"]["originalIDs"], ["embed-original-1"])
        self.assertEqual(copied["data"]["metadata"]["originalSource"]["sourceUrl"], source["sourceUrl"])
        generated = [row for row in first["nextRows"] if row["id"] != original["id"]]
        self.assertTrue(generated)
        for row in generated:
            self.assertTrue(row["id"].startswith(f"course-guided-{LESSON_ID}-"))
            self.assertEqual(row["contentType"], "RICH_TEXT")
            self.assertEqual(row["data"]["metadata"]["learningRevision"], "course-guided-v1")
            self.assertTrue(row["data"]["metadata"]["sourceSlides"])
            self.assertEqual(row["data"]["metadata"]["originalSource"]["sourceUrl"], source["sourceUrl"])
            self.assertEqual(row["data"]["metadata"]["originalSource"]["sourceDigest"], first["sourceDigest"])

        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["headers"], ["Subject", "Verb"])
        self.assertEqual(structured["data"]["content"]["rows"], [["I", "am"], ["You", "are"]])

        vocabulary = next(row for row in generated if row["data"]["type"] == "vocabulary")
        self.assertEqual(vocabulary["data"]["items"][0], {"term": "Peru", "definition": "Peruvian"})

        reading = next(
            row
            for row in generated
            if row["data"]["type"] == "text" and row["data"]["metadata"]["sourceSlides"] == [4]
        )
        self.assertIn("<p>", reading["data"]["content"])
        self.assertIn("Maria is from Peru", reading["data"]["content"])

        recording = next(row for row in generated if row["data"]["type"] == "recording")
        self.assertIn("Act out the conversation", recording["data"]["instruction"])
        self.assertTrue(recording["data"]["aiGrading"])

        self.assertNotIn(7, first["sourceSlideNumbers"])
        self.assertNotIn(8, first["sourceSlideNumbers"])

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
        self.assertEqual(audio["data"]["metadata"]["originalSource"]["audio"]["digest"], "audio-sha256-fixture")

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
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "short-answer")
        self.assertTrue(exercise["data"]["aiGrading"])
        self.assertNotIn("correctAnswer", exercise["data"])
        self.assertNotIn("answer", exercise["data"])

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
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "multiple-choice")
        self.assertEqual(exercise["data"]["options"], ["Peru", "Brazil"])
        self.assertEqual(exercise["data"]["correctAnswer"], "Peru")

    def test_missing_snapshot_lesson_is_blocked_without_dropping_source_evidence(self) -> None:
        source = source_fixture(complete_audio=True)
        plan = builder.build_plan(None, source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "lesson-missing-from-snapshot" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        self.assertTrue(generated)
        self.assertEqual(generated[0]["data"]["metadata"]["originalSource"]["contentId"], source["contentId"])

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


if __name__ == "__main__":
    unittest.main()
