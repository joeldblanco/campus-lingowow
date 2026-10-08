import hashlib
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("compose-course-builder-inputs.py")
SPEC = importlib.util.spec_from_file_location("compose_course_builder_inputs", SCRIPT)
assert SPEC and SPEC.loader
composer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = composer
SPEC.loader.exec_module(composer)


def published_source(unit: int, lesson_id: str) -> dict:
    return {
        "lessonId": lesson_id,
        "deck": {
            "deckTitle": f"Unit {unit}",
            "sourceUrl": f"https://example.test/unit-{unit}",
            "slides": [{"number": 1, "visibleTexts": [f"Unit {unit}"]}],
        },
    }


class ComposerScopeTests(unittest.TestCase):
    def test_composer_loads_without_sys_modules_registration(self) -> None:
        spec = importlib.util.spec_from_file_location(
            "compose_course_builder_inputs_unregistered",
            SCRIPT,
        )
        assert spec and spec.loader
        unregistered = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(unregistered)

        self.assertEqual(unregistered.DEFAULT_UNIT_SCOPE.first, 2)
        self.assertEqual(unregistered.DEFAULT_UNIT_SCOPE.last, 52)

    def test_default_scope_remains_units_2_to_52(self) -> None:
        args = composer._parse_args(
            [
                "--snapshot",
                "snapshot.json",
                "--source-manifest",
                "sources.json",
                "--staged-media",
                "media.json",
                "--materialized-dir",
                "materialized",
                "--output",
                "draft.json",
                "--audit-output",
                "audit.json",
            ]
        )

        self.assertEqual(args.unit_first, 2)
        self.assertEqual(args.unit_last, 52)

    def test_fresh_scope_selects_only_units_53_to_56_and_keeps_missing_source_strict(self) -> None:
        manifest = {
            "sources": [
                published_source(2, "lesson-2"),
                published_source(53, "lesson-53"),
                published_source(54, "lesson-54"),
                published_source(56, "lesson-56"),
            ]
        }
        snapshot = {
            "courseId": composer.COURSE_ID,
            "lessons": [{"id": f"lesson-{unit}"} for unit in (2, 53, 54, 56)],
        }
        blockers: list[dict] = []

        sources, by_unit, by_lesson = composer._published_sources(
            manifest,
            snapshot,
            blockers,
            scope=composer._unit_scope(53, 56),
        )

        self.assertEqual([composer._unit_from_value(source["deck"]) for source in sources], [53, 54, 56])
        self.assertEqual(sorted(by_unit), [53, 54, 56])
        self.assertEqual(sorted(by_lesson), ["lesson-53", "lesson-54", "lesson-56"])
        self.assertIn(
            {"kind": "source", "unit": 55, "code": "published-source-missing"},
            blockers,
        )
        self.assertNotIn(2, by_unit)

    def test_scoped_audio_does_not_count_old_units_as_fresh_plan_records(self) -> None:
        payload = b"unit-53-original-audio"
        digest = hashlib.sha256(payload).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            audio_path = Path(directory) / "unit-53.mp3"
            audio_path.write_bytes(payload)
            reviewed = {
                "audio": [
                    {
                        "unit": 2,
                        "id": "old-unit-2-audio",
                        "lessonId": "lesson-2",
                        "sourceSha256": digest,
                        "slideNumber": 1,
                        "audioNumber": 1,
                        "transcript": "old",
                        "publicUrl": "https://example.test/old.mp3",
                        "sourcePath": str(audio_path),
                        "status": "ready",
                    },
                    {
                        "unit": 53,
                        "id": "unit-53-audio",
                        "lessonId": "lesson-53",
                        "sourceSha256": digest,
                        "slideNumber": 1,
                        "audioNumber": 1,
                        "transcript": "current",
                        "publicUrl": "https://example.test/unit-53.mp3",
                        "sourcePath": str(audio_path),
                        "status": "ready",
                    },
                ]
            }
            blockers: list[dict] = []
            normalized, counts = composer._normalize_audio(
                {},
                reviewed,
                {53: published_source(53, "lesson-53")},
                [Path(directory)],
                blockers,
                scope=composer._unit_scope(53, 56),
            )

        self.assertEqual([item["unit"] for item in normalized], [53])
        self.assertEqual(counts["reviewedRecords"], 1)
        self.assertFalse(any(item.get("code") == "audio-record-count-mismatch" for item in blockers))

    def test_unit_one_scope_is_rejected(self) -> None:
        with self.assertRaisesRegex(composer.ComposeError, "Unit 1"):
            composer._unit_scope(1, 1)

        with self.assertRaisesRegex(composer.ComposeError, "after last"):
            composer._unit_scope(56, 53)

    def test_parser_accepts_explicit_53_to_56_scope(self) -> None:
        args = composer._parse_args(
            [
                "--unit-first",
                "53",
                "--unit-last",
                "56",
                "--snapshot",
                "snapshot.json",
                "--source-manifest",
                "sources.json",
                "--staged-media",
                "media.json",
                "--materialized-dir",
                "materialized",
                "--output",
                "draft.json",
                "--audit-output",
                "audit.json",
            ]
        )

        self.assertEqual((args.unit_first, args.unit_last), (53, 56))
        self.assertEqual(composer._unit_scope(args.unit_first, args.unit_last).count, 4)


if __name__ == "__main__":
    unittest.main()
