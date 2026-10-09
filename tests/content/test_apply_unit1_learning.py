"""Safety tests for the reviewed Unit 1 content application script."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[2] / "scripts" / "content" / "apply-unit1-learning.py"
REVIEWED_PLAN_PATH = Path(
    r"C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a"
    r"\unit1-dual-mode-mockups\reviewed-content-plan.json"
)
SPEC = importlib.util.spec_from_file_location("apply_unit1_learning", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def make_plan() -> dict:
    previous = []
    for index in range(17):
        row_id = f"existing-{index:02d}"
        data = {"type": "text", "content": f"old-{index}"}
        if index == 0:
            row_id = MODULE.AUDIO_IDS[0]
            data = {"type": "audio", "url": "https://cdn.example/intro.mp3"}
        elif index == 1:
            row_id = MODULE.AUDIO_IDS[1]
            data = {"type": "audio", "url": "https://cdn.example/unit-1.wav"}
        previous.append(
            {
                "id": row_id,
                "order": index,
                "data": data,
                "lessonId": MODULE.LESSON_ID,
                "title": f"Existing {index}",
                "contentType": "RICH_TEXT",
                "parentId": None,
            }
        )

    next_rows = copy.deepcopy(previous)
    for index, row in enumerate(next_rows):
        row["order"] = index + 1
        if index == 2:
            row["data"] = {"type": "text", "content": "reviewed content"}
    for index, row_id in enumerate(sorted(MODULE.NEW_CONTENT_IDS), start=17):
        next_rows.append(
            {
                "id": row_id,
                "order": index,
                "data": {"type": "text", "content": f"new-{index}"},
                "lessonId": MODULE.LESSON_ID,
                "title": f"New {index}",
                "contentType": "RICH_TEXT",
                "parentId": None,
            }
        )
    return {"lessonId": MODULE.LESSON_ID, "previousRows": previous, "nextRows": next_rows}


class ApplyUnit1LearningSafetyTests(unittest.TestCase):
    def test_valid_plan_accepts_five_whitelisted_top_level_rows(self) -> None:
        plan = make_plan()
        self.assertIs(MODULE.validate_plan(plan), plan)

    def test_reviewed_snapshot_validates_when_available(self) -> None:
        if not REVIEWED_PLAN_PATH.is_file():
            self.skipTest("the local reviewed-content-plan.json artifact is unavailable")
        with REVIEWED_PLAN_PATH.open(encoding="utf-8") as plan_file:
            plan = json.load(plan_file)
        self.assertEqual(len(MODULE.validate_plan(plan)["previousRows"]), 17)
        self.assertEqual(len(plan["nextRows"]), 22)

    def test_invalid_lesson_is_rejected(self) -> None:
        plan = make_plan()
        plan["lessonId"] = "wrong-lesson"
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_plan(plan)

    def test_changed_audio_url_is_rejected(self) -> None:
        plan = make_plan()
        plan["nextRows"][0]["data"]["url"] = "https://cdn.example/changed.mp3"
        with self.assertRaisesRegex(MODULE.PlanError, "audio URL"):
            MODULE.validate_plan(plan)

    def test_deleted_existing_id_is_rejected(self) -> None:
        plan = make_plan()
        plan["nextRows"] = [row for row in plan["nextRows"] if row["id"] != "existing-16"]
        with self.assertRaises(MODULE.PlanError):
            MODULE.validate_plan(plan)

    def test_unexpected_new_id_is_rejected(self) -> None:
        plan = make_plan()
        plan["nextRows"][-1]["id"] = "unreviewed-new-content"
        with self.assertRaisesRegex(MODULE.PlanError, "unexpected new IDs"):
            MODULE.validate_plan(plan)

    def test_modified_existing_title_is_rejected(self) -> None:
        plan = make_plan()
        plan["nextRows"][2]["title"] = "Changed title"
        with self.assertRaisesRegex(MODULE.PlanError, "immutable field title"):
            MODULE.validate_plan(plan)

    def test_reorder_keeps_order_in_the_cas_sql(self) -> None:
        plan = make_plan()
        sql = MODULE.generate_sql(plan)
        self.assertIn('AND c."order" = (previous_row->>\'order\')::integer', sql)
        self.assertIn('"order" = (next_row->>\'order\')::integer', sql)
        self.assertIn('"createdAt", "updatedAt"', sql)
        self.assertIn("CURRENT_TIMESTAMP,\n      CURRENT_TIMESTAMP", sql)
        self.assertIn("Content changed since the reviewed snapshot", sql)

    def test_sql_locks_inventory_and_checks_history_hashes(self) -> None:
        sql = MODULE.generate_sql(make_plan())
        self.assertIn("BEGIN ISOLATION LEVEL SERIALIZABLE;", sql)
        self.assertIn('WHERE c."lessonId" = \'cmk4otvgp0001w1p4ijdkv6i2\'\nFOR UPDATE;', sql)
        self.assertIn("user_contents_digest", sql)
        self.assertIn("block_responses_digest", sql)
        self.assertIn("Saved response history changed", sql)
        self.assertNotIn('count(*) FROM block_responses WHERE', sql)
        self.assertIn("448e4bb1-e411-482d-8e51-7487b209fb45", sql)
        self.assertIn("37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b", sql)

    def test_default_is_rollback_and_apply_is_explicit_commit(self) -> None:
        dry_run_sql = MODULE.generate_sql(make_plan())
        apply_sql = MODULE.generate_sql(make_plan(), apply=True)
        self.assertTrue(dry_run_sql.rstrip().endswith("ROLLBACK;"))
        self.assertFalse(dry_run_sql.rstrip().endswith("COMMIT;"))
        self.assertTrue(apply_sql.rstrip().endswith("COMMIT;"))


if __name__ == "__main__":
    unittest.main()
