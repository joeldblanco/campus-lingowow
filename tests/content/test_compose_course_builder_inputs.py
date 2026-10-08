import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "content" / "compose-course-builder-inputs.py"
SPEC = importlib.util.spec_from_file_location("compose_course_builder_inputs", SCRIPT)
assert SPEC and SPEC.loader
composer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(composer)


class ComposeCourseBuilderInputsTests(unittest.TestCase):
    def test_unit3_missing_slide_reuses_only_the_verified_audio2_slide(self) -> None:
        source = {
            "lesson": {"id": "lesson-3"},
            "deck": {
                "slides": [
                    {
                        "number": 4,
                        "visibleTexts": ["Look at the picture.", "Listen to the audio."],
                        "mediaSummary": {"audioIconCount": 1},
                    }
                ]
            },
        }
        blockers = []
        result = composer._normalize_listening(
            [
                {
                    "exercises": [
                        {
                            "lessonId": "lesson-3",
                            "unit": 3,
                            "slideNumber": None,
                            "audioIndex": 2,
                            "items": [],
                        }
                    ]
                }
            ],
            {"lesson-3": source},
            [
                {
                    "lessonId": "lesson-3",
                    "unit": 3,
                    "audioNumber": 2,
                    "slideNumber": 4,
                }
            ],
            blockers,
        )

        self.assertEqual(result["exercises"][0]["slideNumber"], 4)
        self.assertIn("original Audio 2", result["exercises"][0]["mappingRationale"])
        self.assertEqual(blockers, [])

    def test_correspondence_is_the_only_source_for_units33_to36(self) -> None:
        blockers = []
        figures, counts = composer._figure_candidates(
            {
                "units": {
                    "33": {
                        "unit": 33,
                        "slides": {
                            "4": {
                                "confirmedInstructionalAssets": [
                                    {
                                        "confirmedInstructional": True,
                                        "sha256": "a" * 64,
                                        "localPath": "figure-a.jpg",
                                    }
                                ]
                            }
                        },
                    }
                }
            },
            {
                "units": [
                    {
                        "unit": 33,
                        "slideFindings": [{"sourceSlide": 4, "status": "confirmed", "purpose": "picture"}],
                        "correspondences": [
                            {
                                "sourceSlide": 4,
                                "publishedSlide": 4,
                                "sha256": "b" * 64,
                                "localPath": "figure-b.jpg",
                            }
                        ],
                    }
                ]
            },
            {"b" * 64: {"status": "ready", "publicUrl": "/figure-b.webp", "sourceSha256": "b" * 64}},
            {},
            {33: {"lesson": {"id": "lesson-33"}}},
            [Path.cwd()],
            blockers,
        )

        self.assertEqual(counts["candidateReferences"], 1)
        self.assertEqual([item["sourceSha256"] for item in figures], [])
        self.assertIn("figure-source-file-missing", [item["code"] for item in blockers])
        self.assertNotIn("a" * 64, {item["sourceSha256"] for item in figures})

    def test_staged_audio_overrides_review_record_with_public_url(self) -> None:
        source = {"lesson": {"id": "lesson-2"}}
        blockers = []
        records, counts = composer._normalize_audio(
            {
                "audio": [
                    {
                        "sourceId": "audio-2",
                        "unit": 2,
                        "slideNumber": 4,
                        "sourceSha256": "c" * 64,
                        "publicUrl": "/audio-2.mp3",
                        "status": "planned",
                        "transcript": "A source transcript.",
                        "audioNumber": 2,
                        "sourcePath": str(SCRIPT),
                    }
                ]
            },
            {
                "audio": [
                    {
                        "id": "audio-2",
                        "unit": 2,
                        "lessonId": "lesson-2",
                        "sourceSlideNumber": 4,
                        "sourceSha256": "c" * 64,
                        "transcript": "A source transcript.",
                        "audioNumber": 2,
                    }
                ]
            },
            {2: source},
            [Path.cwd()],
            blockers,
        )

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["lessonId"], "lesson-2")
        self.assertEqual(records[0]["publicUrl"], "/audio-2.mp3")
        self.assertEqual(records[0]["mediaDigest"], "c" * 64)
        self.assertEqual(counts["normalizedRecords"], 1)
        self.assertNotIn("audio-public-url-missing", [item["code"] for item in blockers])


if __name__ == "__main__":
    unittest.main()
