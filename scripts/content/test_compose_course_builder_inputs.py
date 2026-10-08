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

    def _published_review_fixture(self, root: Path) -> tuple[dict, dict, dict[int, dict], dict[str, dict]]:
        source = {
            "unit": 53,
            "lesson": {"id": "lesson-53"},
            "sourceUrl": "https://example.test/unit-53",
            "deck": {
                "deckTitle": "Unit 53 - Source",
                "slides": [
                    {
                        "number": 4,
                        "title": "Look at the picture.",
                        "visibleTexts": ["Look at the picture.", "STRUCTURES", "EXAMPLES", "Gerunds"],
                    }
                ],
            },
        }
        review = {
            "courseId": composer.COURSE_ID,
            "records": [
                {
                    "unit": 53,
                    "lessonId": "lesson-53",
                    "sourceUrl": source["sourceUrl"],
                    "status": "reviewed",
                    "sourceProofSlides": [
                        {
                            "slideNumber": 4,
                            "sourceUrl": source["sourceUrl"],
                            "visibleTexts": source["deck"]["slides"][0]["visibleTexts"],
                        }
                    ],
                }
            ],
        }
        return review, source, {53: source}, {"lesson-53": source}

    def test_published_source_review_explicitly_clears_missing_native_record(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            review, source, by_unit, by_lesson = self._published_review_fixture(Path(directory))
            blockers: list[dict] = []
            summary, accepted = composer._apply_published_source_review(
                review,
                by_unit,
                by_lesson,
                [Path(directory)],
                blockers,
                scope=composer._unit_scope(53, 53),
            )
            self.assertEqual(summary["applied"], 1)
            self.assertEqual(blockers, [])
            native = composer._compose_native_audit(
                None,
                None,
                None,
                None,
                [],
                by_unit,
                blockers,
                scope=composer._unit_scope(53, 53),
                published_source_review=accepted,
            )

        self.assertEqual(native["records"], [])
        self.assertEqual(native["publishedSourceReview"][0]["lessonId"], "lesson-53")
        self.assertNotIn("native-record-missing", [item["code"] for item in blockers])
        self.assertFalse(source["deck"]["slides"][0].get("_nativeAudit"))

    def test_published_source_review_rejects_identity_and_proof_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            review, _source, by_unit, by_lesson = self._published_review_fixture(Path(directory))
            review["records"][0]["sourceUrl"] = "https://example.test/other"
            review["records"][0]["sourceProofSlides"][0]["visibleTexts"] = ["different slide"]
            blockers: list[dict] = []
            summary, accepted = composer._apply_published_source_review(
                review,
                by_unit,
                by_lesson,
                [Path(directory)],
                blockers,
                scope=composer._unit_scope(53, 53),
            )

        self.assertEqual(summary["applied"], 0)
        self.assertEqual(accepted, {})
        self.assertIn("published-source-review-identity-mismatch", [item["code"] for item in blockers])
        self.assertIn("published-source-review-proof-mismatch", [item["code"] for item in blockers])

    def test_published_source_review_projects_source_table_and_staged_figure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            review, source, by_unit, by_lesson = self._published_review_fixture(root)
            figure_path = root / "figure.jpg"
            figure_path.write_bytes(b"published source figure")
            digest = hashlib.sha256(figure_path.read_bytes()).hexdigest()
            review["records"][0]["reviewedTables"] = [
                {
                    "slideNumber": 4,
                    "tables": [{"rows": [["STRUCTURES", "EXAMPLES"], ["Gerunds", "Gerunds"]]}],
                }
            ]
            review["records"][0]["reviewedFigures"] = [
                {
                    "slideNumber": 4,
                    "confirmedInstructional": True,
                    "sourceSha256": digest,
                    "sourcePath": figure_path.name,
                }
            ]
            blockers: list[dict] = []
            _summary, accepted = composer._apply_published_source_review(
                review,
                by_unit,
                by_lesson,
                [root],
                blockers,
                scope=composer._unit_scope(53, 53),
            )
            figures, _counts = composer._figure_candidates(
                None,
                None,
                {digest: {"status": "ready", "sourceSha256": digest, "publicUrl": "/figure.webp", "sourcePath": figure_path.name}},
                {},
                by_unit,
                [root],
                blockers,
                scope=composer._unit_scope(53, 53),
                published_source_review=accepted,
            )
            composer._attach_published_source_review(accepted, figures, by_unit, blockers)

        self.assertEqual(blockers, [])
        self.assertEqual(source["deck"]["slides"][0]["tables"][0]["rows"][0], ["STRUCTURES", "EXAMPLES"])
        self.assertFalse(source["deck"]["slides"][0]["tableSemantics"]["nativeIdentityConfirmed"])
        self.assertEqual(figures[0]["nativeEvidence"]["mapping"], "published-source-review")
        self.assertFalse(source["deck"]["slides"][0]["_nativeAudit"]["nativeIdentityConfirmed"])
        self.assertEqual(source["deck"]["slides"][0]["_nativeAudit"]["figures"], figures)
        self.assertTrue(source["deck"]["slides"][0]["_nativeAudit"]["figureEvidencePresent"])

    def test_listening_review_allows_proven_cross_slide_audio_and_preserves_source_slide(self) -> None:
        source = {
            "unit": 53,
            "lesson": {"id": "lesson-53"},
            "deck": {
                "slides": [
                    {"number": 12, "visibleTexts": ["Audio 2: original conversation"]},
                    {"number": 13, "visibleTexts": ["Listen to the audio and answer teacher questions."]},
                ]
            },
        }
        digest = "a" * 64
        audio = [
            {
                "lessonId": "lesson-53",
                "unit": 53,
                "slideNumber": 12,
                "audioNumber": 2,
                "sourceSha256": digest,
            }
        ]
        documents = [
            {
                "exercises": [
                    {
                        "lessonId": "lesson-53",
                        "unit": 53,
                        "slideNumber": 13,
                        "audioIndex": 2,
                        "sourceAudioSha256": digest,
                        "sourceAudioSlideNumber": 12,
                        "sourceAudioSlideEvidence": ["Audio 2: original conversation"],
                        "targetSlideEvidence": ["Listen to the audio and answer teacher questions."],
                    }
                ]
            }
        ]
        blockers: list[dict] = []
        result = composer._normalize_listening(documents, {"lesson-53": source}, audio, blockers)

        self.assertEqual(blockers, [])
        self.assertEqual(result["exercises"][0]["slideNumber"], 13)
        self.assertEqual(result["exercises"][0]["sourceAudioSlideNumber"], 12)
        aliases = [item for item in audio if item.get("activitySlideNumber") == 13]
        self.assertEqual(len(aliases), 1)
        self.assertEqual(aliases[0]["slideNumber"], 13)
        self.assertEqual(aliases[0]["sourceSlideNumber"], 12)
        self.assertEqual(aliases[0]["sourceAudioSlideNumber"], 12)

    def test_listening_review_rejects_cross_slide_without_explicit_target_and_source_proof(self) -> None:
        source = {
            "unit": 53,
            "lesson": {"id": "lesson-53"},
            "deck": {
                "slides": [
                    {"number": 12, "visibleTexts": ["Audio 2: original conversation"]},
                    {"number": 13, "visibleTexts": ["Listen to the audio and answer teacher questions."]},
                ]
            },
        }
        digest = "b" * 64
        audio = [
            {"lessonId": "lesson-53", "slideNumber": 12, "audioNumber": 2, "sourceSha256": digest}
        ]
        documents = [
            {
                "exercises": [
                    {
                        "lessonId": "lesson-53",
                        "unit": 53,
                        "slideNumber": 13,
                        "audioIndex": 2,
                        "sourceAudioSha256": digest,
                        "sourceAudioSlideNumber": 12,
                        "targetSlideEvidence": ["Listen to the audio and answer teacher questions."],
                    }
                ]
            }
        ]
        blockers: list[dict] = []
        result = composer._normalize_listening(documents, {"lesson-53": source}, audio, blockers)

        self.assertEqual(result["exercises"], [])
        self.assertEqual(result["rejectedEntries"][0]["compositionStatus"], "rejected-cross-slide-proof")
        self.assertIn("listening-cross-slide-proof-missing", [item["code"] for item in blockers])

    def test_listening_review_does_not_infer_adjacent_audio_slide(self) -> None:
        source = {
            "unit": 53,
            "lesson": {"id": "lesson-53"},
            "deck": {
                "slides": [
                    {"number": 12, "visibleTexts": ["Audio 2: original conversation"]},
                    {"number": 13, "visibleTexts": ["Listen to the audio and answer teacher questions."]},
                ]
            },
        }
        digest = "c" * 64
        audio = [
            {"lessonId": "lesson-53", "slideNumber": 12, "audioNumber": 2, "sourceSha256": digest}
        ]
        documents = [
            {
                "exercises": [
                    {
                        "lessonId": "lesson-53",
                        "unit": 53,
                        "slideNumber": 13,
                        "audioIndex": 2,
                        "sourceAudioSha256": digest,
                    }
                ]
            }
        ]
        blockers: list[dict] = []
        result = composer._normalize_listening(documents, {"lesson-53": source}, audio, blockers)

        self.assertEqual(result["exercises"], [])
        self.assertIn("listening-source-audio-mismatch", [item["code"] for item in blockers])

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
