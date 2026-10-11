"""Safety tests for the A1 Module 1 insert-only seed script."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[2] / "scripts" / "content" / "apply-a1-module1-pilot.py"
SPEC = importlib.util.spec_from_file_location("apply_a1_module1_pilot", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def make_plan() -> dict:
    scene_names = (
        "campus",
        "community-bookshop",
        "library",
        "listening-lounge",
        "city-directions",
        "travel-station",
    )
    lessons = []
    for order, (lesson_id, scene_name) in enumerate(zip(MODULE.LESSON_IDS, scene_names)):
        block = {
            "id": f"{lesson_id}-scene-0",
            "type": "text",
            "order": 0,
            "title": f"Scene {order}",
            "content": f"Source block {order}",
            "data": {
                "learningRevision": MODULE.REVISION,
                "pilotSceneId": f"a1m1-{order}-scene-0",
                "scene": f"/images/lessons/backgrounds/{scene_name}.webp",
                "sceneSide": "right",
            },
        }
        lessons.append(
            {
                "id": lesson_id,
                "title": f"Lesson {order}",
                "description": f"Description {order}",
                "order": order,
                "blocks": [block],
            }
        )
    return {
        "course": {
            "id": MODULE.COURSE_ID,
            "title": "A1 Module 1 pilot",
            "description": "Isolated DEV pilot",
            "language": "Inglés",
            "level": "A1",
        },
        "module": {
            "id": MODULE.MODULE_ID,
            "title": "Primer contacto y ayuda",
            "description": "Four units and a mission",
            "level": "A1",
            "objectives": "Build first-contact communication.",
        },
        "lessons": lessons,
    }


def identities() -> dict[str, str]:
    return {
        "creatorId": "creator-root",
        "studentId": "joel-student",
        "academicPeriodId": "period-2026",
    }


def audio_plan() -> dict:
    plan = make_plan()
    plan["lessons"][1]["blocks"][0] = {
        "id": "a1-general-u1-audio-0",
        "type": "audio",
        "order": 0,
        "title": "Unit 1 model audio",
        "url": "/audio/a1-module1-pilot/u1-model.mp3",
        "data": {
            "learningRevision": MODULE.REVISION,
            "pilotRevision": MODULE.PILOT_REVISION,
            "pilotSceneId": "a1m1-1-scene-0",
            "scene": "/images/lessons/backgrounds/community-bookshop.webp",
            "sceneSide": "right",
        },
    }
    return plan


class A1Module1PilotSafetyTests(unittest.TestCase):
    def test_valid_plan_accepts_exact_source_inventory_and_strips_runtime_identity(self) -> None:
        plan = make_plan()
        self.assertIs(MODULE.validate_plan(plan), plan)
        rows = MODULE._content_rows(plan)
        self.assertEqual(len(rows), 6)
        self.assertEqual({row["lessonId"] for row in rows}, set(MODULE.LESSON_IDS))
        for row in rows:
            self.assertNotIn("id", row["data"])
            self.assertNotIn("order", row["data"])
            self.assertEqual(row["data"]["type"], "text")

    def test_default_transaction_rolls_back_and_apply_is_explicit_commit(self) -> None:
        dry_run_sql = MODULE.build_sql(make_plan(), identities())
        apply_sql = MODULE.build_sql(make_plan(), identities(), apply=True)
        self.assertTrue(dry_run_sql.rstrip().endswith("ROLLBACK;"))
        self.assertFalse(dry_run_sql.rstrip().endswith("COMMIT;"))
        self.assertTrue(apply_sql.rstrip().endswith("COMMIT;"))

    def test_database_and_runtime_guards_are_before_insert_behavior(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        self.assertIn("current_database() <> 'lingowow_dev'", sql)
        self.assertIn("Dev database required", sql)
        self.assertIn("pg_advisory_xact_lock", sql)
        self.assertIn("SET LOCAL lock_timeout = '10s'", sql)
        self.assertIn("SET LOCAL statement_timeout = '120s'", sql)
        self.assertIn('AND status = \'ACTIVE\'::"UserStatus"', sql)
        self.assertIn('\'STUDENT\'::"UserRole" = ANY(roles)', sql)
        self.assertIn('SELECT 1 FROM "User"', sql)
        self.assertNotIn("SELECT 1 FROM users", sql)

    def test_collision_guard_and_expected_counts_are_fail_closed(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        self.assertIn("Expected seed source counts are invalid", sql)
        self.assertIn("Seed identity collision; refusing insert", sql)
        self.assertIn("WHERE id = course_id", sql)
        self.assertIn("WHERE id = module_id", sql)
        self.assertIn("a1_module1_expected_contents", sql)
        self.assertNotIn("ON CONFLICT", sql.upper())

    def test_enrollment_composite_collision_is_guarded_before_insert(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        guard = """Enrollment composite identity collision; refusing insert"""
        self.assertIn(guard, sql)
        self.assertIn('existing."studentId" = p->\'identities\'->>\'studentId\'', sql)
        self.assertIn('existing."courseId" = p->\'course\'->>\'id\'', sql)
        self.assertIn('existing."academicPeriodId" = p->\'identities\'->>\'academicPeriodId\'', sql)
        self.assertLess(sql.index(guard), sql.index("INSERT INTO courses"))

    def test_malformed_source_count_is_rejected(self) -> None:
        plan = make_plan()
        plan["lessons"].pop()
        with self.assertRaisesRegex(MODULE.PlanError, "exactly 6 lessons"):
            MODULE.validate_plan(plan)

    def test_wrong_lesson_identity_or_order_is_rejected(self) -> None:
        plan = make_plan()
        plan["lessons"][0]["id"] = "another-lesson"
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_plan(plan)

        plan = make_plan()
        plan["lessons"][2]["order"] = 5
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_plan(plan)

    def test_unapproved_scene_and_block_type_are_rejected(self) -> None:
        plan = make_plan()
        plan["lessons"][0]["blocks"][0]["data"]["scene"] = "/images/not-approved.webp"
        with self.assertRaisesRegex(MODULE.PlanError, "unapproved illustrated scene"):
            MODULE.validate_plan(plan)

        plan = make_plan()
        plan["lessons"][0]["blocks"][0]["type"] = "untrusted_widget"
        with self.assertRaisesRegex(MODULE.PlanError, "supported runtime block type"):
            MODULE.validate_plan(plan)

    def test_audio_is_rejected_without_touching_existing_audio(self) -> None:
        plan = make_plan()
        plan["lessons"][0]["blocks"][0]["type"] = "audio"
        with self.assertRaisesRegex(MODULE.PlanError, "unapproved audio"):
            MODULE.validate_plan(plan)

        plan = make_plan()
        plan["lessons"][0]["blocks"][0]["data"]["url"] = "https://cdn.example/voice.mp3"
        with self.assertRaisesRegex(MODULE.PlanError, "unapproved audio URL"):
            MODULE.validate_plan(plan)

    def test_verified_new_audio_manifest_allows_only_matching_local_asset(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            old_audio_root = MODULE.AUDIO_ROOT
            try:
                MODULE.AUDIO_ROOT = Path(temporary) / "public" / "audio" / "a1-module1-pilot"
                MODULE.AUDIO_ROOT.mkdir(parents=True)
                asset = MODULE.AUDIO_ROOT / "u1-model.mp3"
                asset.write_bytes(b"synthetic audio bytes")
                manifest = {
                    "files": [
                        {
                            "path": "public/audio/a1-module1-pilot/u1-model.mp3",
                            "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
                            "sourceEnglishTranscript": "Hi, I am Ana.",
                        }
                    ]
                }
                MODULE.validate_plan(audio_plan(), audio_manifest=manifest)
                sql = MODULE.build_sql(audio_plan(), identities(), audio_manifest=manifest)
                self.assertTrue(sql.rstrip().endswith("ROLLBACK;"))
                self.assertIn("AND (data ? 'id' OR data ? 'order')", sql)
                self.assertNotIn(
                    "AND (data ? 'id' OR data ? 'order' OR data->>'type' = 'audio')",
                    sql,
                )
            finally:
                MODULE.AUDIO_ROOT = old_audio_root

    def test_audio_manifest_missing_file_is_rejected(self) -> None:
        manifest = {
            "files": [
                {
                    "path": "public/audio/a1-module1-pilot/missing.mp3",
                    "sha256": "0" * 64,
                    "sourceEnglishTranscript": "Missing asset.",
                }
            ]
        }
        with self.assertRaisesRegex(MODULE.PlanError, "asset is missing"):
            MODULE.validate_audio_manifest(manifest)

    def test_audio_manifest_hash_mismatch_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            old_audio_root = MODULE.AUDIO_ROOT
            try:
                MODULE.AUDIO_ROOT = Path(temporary) / "public" / "audio" / "a1-module1-pilot"
                MODULE.AUDIO_ROOT.mkdir(parents=True)
                (MODULE.AUDIO_ROOT / "u1-model.mp3").write_bytes(b"actual bytes")
                manifest = {
                    "files": [
                        {
                            "path": "public/audio/a1-module1-pilot/u1-model.mp3",
                            "sha256": "0" * 64,
                            "sourceEnglishTranscript": "The transcript is present.",
                        }
                    ]
                }
                with self.assertRaisesRegex(MODULE.PlanError, "hash mismatch"):
                    MODULE.validate_audio_manifest(manifest)
            finally:
                MODULE.AUDIO_ROOT = old_audio_root

    def test_audio_manifest_traversal_external_and_original_paths_are_rejected(self) -> None:
        cases = (
            "public/audio/a1-module1-pilot/../old.mp3",
            "https://cdn.example/audio.mp3",
            "public/audio/lessons/course/unit-02-audio-01.mp3",
        )
        for path in cases:
            with self.subTest(path=path):
                manifest = {
                    "files": [
                        {
                            "path": path,
                            "sha256": "0" * 64,
                            "sourceEnglishTranscript": "Source transcript.",
                        }
                    ]
                }
                with self.assertRaises(MODULE.PlanError):
                    MODULE.validate_audio_manifest(manifest)

    def test_audio_manifest_rejects_inline_source_and_unverified_extra(self) -> None:
        plan = audio_plan()
        plan["lessons"][1]["blocks"][0]["url"] = "data:audio/mpeg;base64,AAAA"
        with self.assertRaisesRegex(MODULE.PlanError, "unapproved audio"):
            MODULE.validate_plan(plan)

        with tempfile.TemporaryDirectory() as temporary:
            old_audio_root = MODULE.AUDIO_ROOT
            try:
                MODULE.AUDIO_ROOT = Path(temporary) / "public" / "audio" / "a1-module1-pilot"
                MODULE.AUDIO_ROOT.mkdir(parents=True)
                asset = MODULE.AUDIO_ROOT / "u1-model.mp3"
                asset.write_bytes(b"synthetic audio bytes")
                (MODULE.AUDIO_ROOT / "extra.mp3").write_bytes(b"synthetic audio bytes")
                manifest = {
                    "files": [
                        {
                            "path": "public/audio/a1-module1-pilot/u1-model.mp3",
                            "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
                            "sourceEnglishTranscript": "Hi, I am Ana.",
                        },
                        {
                            "path": "public/audio/a1-module1-pilot/extra.mp3",
                            "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
                            "sourceEnglishTranscript": "Unused source.",
                        },
                    ]
                }
                with self.assertRaisesRegex(MODULE.PlanError, "unreferenced manifest"):
                    MODULE.validate_plan(audio_plan(), audio_manifest=manifest)
            finally:
                MODULE.AUDIO_ROOT = old_audio_root

    def test_runtime_revision_matches_generic_guided_runtime_and_optional_pilot_revision(self) -> None:
        self.assertEqual(MODULE.REVISION, "course-guided-v1")
        plan = make_plan()
        plan["lessons"][0]["blocks"][0]["data"]["pilotRevision"] = MODULE.PILOT_REVISION
        MODULE.validate_plan(plan)
        plan["lessons"][0]["blocks"][0]["data"]["pilotRevision"] = "wrong-revision"
        with self.assertRaisesRegex(MODULE.PlanError, "pilotRevision"):
            MODULE.validate_plan(plan)

    def test_private_identities_are_strict_and_safe(self) -> None:
        MODULE.validate_identities(identities())
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_identities({**identities(), "email": "joel@example.test"})
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_identities({**identities(), "studentId": "joel'; DROP TABLE users;--"})

    def test_history_audio_and_enrollment_baselines_are_verified(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        for digest in (
            "courses_digest",
            "modules_digest",
            "lessons_digest",
            "contents_digest",
            "audio_urls_digest",
            "lesson_progress_digest",
            "user_contents_digest",
            "block_responses_digest",
            "user_activities_digest",
            "enrollments_digest",
        ):
            self.assertIn(digest, sql)
        self.assertIn("Existing courses, lessons, contents, audio, progress, responses, or enrollments changed", sql)
        self.assertIn("WHERE row.id <> p->'course'->>'id'", sql)
        self.assertIn("WHERE row.id <> p->>'enrollmentId'", sql)
        self.assertIn("data ? 'audioUrl'", sql)
        self.assertGreaterEqual(sql.count("FROM user_activities AS row"), 2)
        self.assertGreaterEqual(sql.count('ORDER BY row."userId", row."activityId"'), 2)

    def test_audio_digest_covers_complete_row_payload(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        self.assertIn("Hash the complete existing audio row, including audioUrl and nested data.", sql)
        self.assertNotIn(
            "jsonb_build_object('id', row.id, 'url', row.data->>'url')",
            sql,
        )
        self.assertGreaterEqual(sql.count("jsonb_agg(to_jsonb(row) ORDER BY row.id)"), 10)

    def test_seed_is_insert_only_and_never_writes_users_or_history_tables(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        upper_sql = sql.upper()
        self.assertNotIn("UPDATE ", upper_sql)
        self.assertNotIn("DELETE ", upper_sql)
        self.assertNotIn("INSERT INTO USERS", upper_sql)
        self.assertNotIn("INSERT INTO LESSON_PROGRESS", upper_sql)
        self.assertNotIn("INSERT INTO USER_CONTENTS", upper_sql)
        self.assertNotIn("INSERT INTO BLOCK_RESPONSES", upper_sql)
        self.assertNotIn("INSERT INTO USER_ACTIVITIES", upper_sql)
        for table in ("courses", "modules", "lessons", "contents", "enrollments"):
            self.assertIn(f"INSERT INTO {table}", sql)

    def test_untrusted_text_is_base64_encoded_and_cannot_inject_sql(self) -> None:
        plan = make_plan()
        malicious = "name'); DROP TABLE courses; --"
        plan["course"]["title"] = malicious
        sql = MODULE.build_sql(plan, identities())
        self.assertNotIn(malicious, sql)
        self.assertNotIn("DROP TABLE", sql.upper())
        self.assertIn("convert_from(decode(", sql)

    def test_remote_wrapper_checks_config_and_suppresses_remote_output(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        remote = MODULE.build_remote_script(sql)
        self.assertIn("root@137.184.8.53", MODULE.SERVER)
        self.assertIn("lingowow_dev", remote)
        self.assertIn("wnzn19ljdvtk84yzz4j3orj1", remote)
        self.assertIn('u.pathname !== "/lingowow_dev"', remote)
        self.assertIn("psql -X -v ON_ERROR_STOP=1", remote)
        self.assertNotIn("echo $DATABASE_URL", remote)
        self.assertNotIn("set -x", remote)

    def test_sql_includes_exact_seed_identities_and_publish_state(self) -> None:
        sql = MODULE.build_sql(make_plan(), identities())
        self.assertIn("a1-general-module1-pilot", MODULE.COURSE_ID)
        self.assertIn("a1-general-module1", MODULE.MODULE_ID)
        self.assertIn("a1-general-pilot-joel", MODULE.ENROLLMENT_ID)
        self.assertIn('"isPublished"', sql)
        self.assertIn("TRUE", sql)
        self.assertIn("'ACTIVE'::\"EnrollmentStatus\"", sql)


if __name__ == "__main__":
    unittest.main()
