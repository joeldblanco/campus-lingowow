"""Invariants and progression checks for the mission teaching revision."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/curriculum/a1-module1-pilot.json"
MODULE_PATH = ROOT / "scripts/content/a1_mission_teaching.py"
SPEC = importlib.util.spec_from_file_location("a1_mission_teaching", MODULE_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover - import setup guard
    raise RuntimeError(f"Cannot load {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def _full_fixture() -> dict[str, Any]:
    """Make the compiler's scene-bearing shape from the published curriculum.

    The test intentionally does not invoke the compiler or touch the database.
    It adds representative post-audio blocks so the revision can prove that
    integration output remains intact.
    """

    course = json.loads(SOURCE.read_text(encoding="utf-8-sig"))
    for lesson in course["lessons"]:
        lesson["scenes"] = []
        if lesson["id"] == "a1-general-mission":
            scenes: dict[str, dict[str, Any]] = {}
            for block in lesson["blocks"]:
                scene_id = block["data"]["pilotSceneId"]
                scene = scenes.setdefault(
                    scene_id,
                    {
                        "id": scene_id,
                        "order": len(scenes) + 1,
                        "phase": scene_id.removeprefix("a1m1-mission-").replace("-", "-"),
                        "background": block["data"].get("scene"),
                        "runtimeBlocks": [],
                    },
                )
                scene["runtimeBlocks"].append(block)
            for scene in scenes.values():
                scene["blocks"] = list(scene["runtimeBlocks"])
                scene["runtimeBlockIds"] = [block["id"] for block in scene["runtimeBlocks"]]
                lesson["scenes"].append(scene)
            continue
        if lesson["id"] == "a1-general-u1":
            # A verified audio block is a representative post-integration row.
            audio = {
                "id": "course-guided-a1-general-u1-pilot-v1-u1-model-audio",
                "type": "audio",
                "data": {"audioVerified": True, "sha256": "a" * 64},
                "url": "/audio/a1-module1-pilot/u1-model.mp3",
            }
            lesson["blocks"].append(audio)
    return course


def _block_ids(course: dict[str, Any]) -> set[str]:
    return {
        block["id"]
        for lesson in course["lessons"]
        for block in lesson.get("blocks", [])
        if isinstance(block, dict) and isinstance(block.get("id"), str)
    }


def _mission(course: dict[str, Any]) -> dict[str, Any]:
    return next(lesson for lesson in course["lessons"] if lesson["id"] == "a1-general-mission")


def _scene(lesson: dict[str, Any], scene_id: str) -> dict[str, Any]:
    return next(scene for scene in lesson["scenes"] if scene["id"] == scene_id)


def _block(scene: dict[str, Any], block_id: str) -> dict[str, Any]:
    return next(block for block in scene["runtimeBlocks"] if block["id"] == block_id)


class MissionTeachingRevisionTests(unittest.TestCase):
    def test_revision_preserves_existing_ids_audio_and_unit_content(self) -> None:
        course = _full_fixture()
        before_ids = _block_ids(course)
        before_units = {
            lesson["id"]: copy.deepcopy(lesson["blocks"])
            for lesson in course["lessons"]
            if lesson["id"] in {"a1-general-u2", "a1-general-u3", "a1-general-u4"}
        }
        before_audio = [
            copy.deepcopy(block)
            for lesson in course["lessons"]
            for block in lesson.get("blocks", [])
            if block.get("type") == "audio"
        ]

        MODULE.revise_mission(course)

        after_ids = _block_ids(course)
        self.assertTrue(before_ids <= after_ids)
        self.assertTrue(after_ids - before_ids)
        self.assertTrue(all(block_id.startswith("a1teach-mission-") for block_id in after_ids - before_ids))
        self.assertEqual(before_units, {
            lesson["id"]: lesson["blocks"]
            for lesson in course["lessons"]
            if lesson["id"] in before_units
        })
        u1 = next(lesson for lesson in course["lessons"] if lesson["id"] == "a1-general-u1")
        after_audio = [
            copy.deepcopy(block)
            for lesson in course["lessons"]
            for block in lesson.get("blocks", [])
            if block.get("type") == "audio"
        ]
        self.assertEqual(after_audio, before_audio)
        self.assertTrue(any(block.get("url") == "/audio/a1-module1-pilot/u1-model.mp3" for block in u1["blocks"]))

    def test_mission_has_local_support_and_progression(self) -> None:
        course = _full_fixture()
        MODULE.revise_mission(course)
        mission = _mission(course)
        self.assertEqual(
            [scene["id"] for scene in mission["scenes"]],
            list(MODULE.MISSION_SCENE_IDS),
        )
        self.assertEqual(
            [block["id"] for scene in mission["scenes"] for block in scene["runtimeBlocks"]],
            [block["id"] for block in mission["blocks"]],
        )
        for scene in mission["scenes"]:
            self.assertEqual(scene["runtimeBlockIds"], [block["id"] for block in scene["runtimeBlocks"]])
            self.assertEqual(scene["blocks"], scene["runtimeBlocks"])

        speak = _scene(mission, "a1m1-mission-speak")
        card = _scene(mission, "a1m1-mission-card")
        self.assertIn("a1teach-mission-speak-support", [block["id"] for block in speak["runtimeBlocks"]])
        self.assertIn("a1teach-mission-card-support", [block["id"] for block in card["runtimeBlocks"]])
        self.assertLess(
            [block["id"] for block in speak["runtimeBlocks"]].index("a1teach-mission-speak-support"),
            next(index for index, block in enumerate(speak["runtimeBlocks"]) if block["type"] == "recording"),
        )
        self.assertLess(
            [block["id"] for block in card["runtimeBlocks"]].index("a1teach-mission-card-support"),
            next(index for index, block in enumerate(card["runtimeBlocks"]) if block["type"] == "essay"),
        )
        self.assertIn("hoja común", mission["routePolicy"]["self"].lower())
        self.assertIn("ensayo", mission["routePolicy"]["self"].lower())
        self.assertNotIn("role-card-only", json.dumps(mission, ensure_ascii=False))
        self.assertNotIn("metadata-only-until-role-card-viewer-exists", json.dumps(mission, ensure_ascii=False))

    def test_model_uses_taught_forms_and_mediation_is_spanish(self) -> None:
        course = _full_fixture()
        MODULE.revise_mission(course)
        mission = _mission(course)
        model = _block(_scene(mission, "a1m1-mission-model"), "a1m1-mission-model-text")
        for phrase in ("This is my blue folder", "My phone number", "I’m free on Tuesday at six", "The room is 204"):
            self.assertIn(phrase, model["content"])
        language = _block(_scene(mission, "a1m1-mission-model"), "a1m1-mission-model-language")
        language_rows = json.dumps(language["content"]["rows"], ensure_ascii=False)
        self.assertIn("This is my", language_rows)
        self.assertIn("My phone number is", language_rows)
        self.assertIn("The room is 204", language_rows)

        mediation = _scene(mission, "a1m1-mission-mediation")
        prompt = _block(mediation, "a1m1-mission-mediation-prompt")
        essay = _block(mediation, "a1m1-mission-mediation-essay")
        self.assertIn("Modelo en español", prompt["content"])
        self.assertIn("La clase de inglés", prompt["content"])
        self.assertEqual(essay["data"]["modelLanguage"], "es")
        checklist = " ".join(essay["data"]["reviewChecklist"])
        for phrase in ("martes", "cuaderno", "Marta", "estacionamiento"):
            self.assertIn(phrase, checklist)
        self.assertNotIn("Tuesday", checklist)
        self.assertNotIn("Room 4", checklist)

    def test_revision_is_idempotent_and_runtime_blockers_are_reported(self) -> None:
        course = _full_fixture()
        MODULE.revise_mission(course)
        first = json.dumps(course, ensure_ascii=False, sort_keys=True)
        MODULE.revise_mission(course)
        second = json.dumps(course, ensure_ascii=False, sort_keys=True)
        self.assertEqual(first, second)
        blocker_text = json.dumps(MODULE.RUNTIME_BLOCKERS, ensure_ascii=False).lower()
        self.assertIn("aigrading", blocker_text)
        self.assertIn("ordering", blocker_text)


if __name__ == "__main__":
    unittest.main()
