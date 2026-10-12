"""Focused invariants for the A1 starter teaching post-processor."""

from __future__ import annotations

import importlib.util
import unittest
from copy import deepcopy
from pathlib import Path
from typing import Any


MODULE_PATH = Path(__file__).with_name("a1_starter_teaching.py")
SPEC = importlib.util.spec_from_file_location("a1_starter_teaching", MODULE_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover - import guard
    raise RuntimeError(f"Cannot import {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


COUNTS = {"S1": 3, "S2": 6, "S3": 6, "S4": 3, "S5": 4}


def _data(scene_id: str, role: str, scene: str) -> dict[str, Any]:
    return {
        "learningRevision": "course-guided-v1",
        "pilotRevision": "a1-module1-pilot-v1",
        "pilotSceneId": scene_id,
        "guidedTitle": "Starter",
        "scene": scene,
        "sceneSide": "right",
        "contentRole": role,
        "sourceRefs": [f"starter.{scene_id}"],
    }


def _block(block_id: str, block_type: str, scene_id: str, role: str, scene: str, **fields: Any) -> dict[str, Any]:
    return {"id": block_id, "type": block_type, "order": 0, "data": _data(scene_id, role, scene), **fields}


def _fixture() -> dict[str, Any]:
    scenes: list[dict[str, Any]] = []
    scene_order = 1
    for activity_id, practice_count in COUNTS.items():
        teach_id = f"a1m1-start-{activity_id.lower()}-teach"
        background = f"/images/{activity_id.lower()}.webp"
        support_rows = [["20", "twenty"], ["20", "twenty"]] if activity_id == "S3" else [["Hello", "Hola"]]
        teach_blocks = [
            _block(f"{teach_id}-title", "title", teach_id, "teaching", background, title="Starter"),
            _block(
                f"{teach_id}-text",
                "text",
                teach_id,
                "teaching",
                background,
                format="html",
                content="<p>Modelo. Señala la tarjeta y lee.</p>",
                teacherReadScript="Usa la tarjeta del modelo.",
            ),
            _block(
                f"a1m1-start-{activity_id.lower()}-support",
                "structured-content",
                teach_id,
                "support",
                background,
                title="Ayuda",
                config={"hasHeaderRow": True},
                content={"headers": ["Número", "Lectura"], "rows": support_rows},
                data=_data(teach_id, "support", background),
            ),
        ]
        if activity_id == "S4":
            teach_blocks.append(
                _block(
                    f"{teach_id}-starter-s4-listening-audio",
                    "audio",
                    teach_id,
                    "reference-audio",
                    background,
                    url="/audio/a1-module1-pilot/starter-s4-listening.mp3",
                    title="Referencia",
                    transcript="I’m from Peru. I live in Lima.",
                )
            )
        scenes.append(
            {
                "id": teach_id,
                "lessonId": "a1-general-start",
                "order": scene_order,
                "phase": "starter-teach",
                "title": f"{activity_id} teaching",
                "instruction": "Lee el modelo.",
                "route": "learner",
                "sourceRefs": [f"starter.{activity_id}"],
                "interactiveCount": 0,
                "runtimeBlockIds": [item["id"] for item in teach_blocks],
                "runtimeBlocks": teach_blocks,
                "background": background,
                "sceneSide": "right",
                "activityId": activity_id,
                "routeModes": {"self": "Usa apoyo.", "teacher": "Modela."},
            }
        )
        scene_order += 1
        for index in range(1, practice_count + 1):
            check_id = f"a1m1-start-{activity_id.lower()}-check-{index}"
            practice_id = f"a1m1-start-{activity_id.lower()}-practice-{index}"
            if index % 3 == 1:
                interactive = _block(
                    practice_id,
                    "multiple_choice",
                    check_id,
                    "practice",
                    background,
                    items=[{"id": f"{practice_id}-item-1", "question": f"Question {activity_id}-{index}", "options": [], "correctOptionId": ""}],
                )
            elif index % 3 == 2:
                interactive = _block(
                    practice_id,
                    "short_answer",
                    check_id,
                    "practice",
                    background,
                    items=[{"id": f"{practice_id}-item-1", "question": f"Question {activity_id}-{index}", "correctAnswer": "Ana", "acceptedAnswers": ["Ana"]}],
                )
            else:
                interactive = _block(
                    practice_id,
                    "ordering",
                    check_id,
                    "practice",
                    background,
                    items=[],
                )
            blocks = [
                _block(f"{check_id}-title", "title", check_id, "practice", background, title="Check"),
                _block(
                    f"{check_id}-instruction",
                    "text",
                    check_id,
                    "practice",
                    background,
                    format="html",
                    content="<p>Responde.</p>",
                ),
                interactive,
            ]
            scenes.append(
                {
                    "id": check_id,
                    "lessonId": "a1-general-start",
                    "order": scene_order,
                    "phase": "starter-practice",
                    "title": f"{activity_id} practice {index}",
                    "instruction": "Responde.",
                    "route": "learner",
                    "sourceRefs": [f"starter.{activity_id}.practice.{index}"],
                    "interactiveCount": 1,
                    "runtimeBlockIds": [item["id"] for item in blocks],
                    "runtimeBlocks": blocks,
                    "background": background,
                    "sceneSide": "right",
                    "activityId": activity_id,
                    "practiceIndex": index,
                }
            )
            scene_order += 1

    lesson = {
        "id": "a1-general-start",
        "moduleId": "a1-general-module1",
        "order": 0,
        "title": "Starter",
        "description": "Ruta con tarjeta.",
        "durationMinutes": 35,
        "prerequisites": [],
        "learningOutcomes": ["Usa una tarjeta."],
        "sourceRef": "starter.S1–S5",
        "background": "/images/s1.webp",
        "sceneCount": len(scenes),
        "scenes": scenes,
        "blocks": [block for scene in scenes for block in scene["runtimeBlocks"]],
        "routePolicy": {"self": "Consulta la tarjeta.", "teacher": "Muestra la tarjeta."},
    }
    return {
        "schemaVersion": "test",
        "course": {"id": "course"},
        "module": {"id": "module"},
        "lessons": [lesson],
        "backgroundAssignment": {"lessons": [{"lessonId": "a1-general-start", "sceneCount": len(scenes), "scenes": []}]},
        "visualAcceptanceManifest": {"lessonSceneMapping": {"a1-general-start": {"sceneCount": len(scenes), "sceneAssets": []}}},
        "audioManifest": {"status": "verified_audio_integrated", "verifiedFileCount": 11},
    }


def _all_blocks(lesson: dict[str, Any]):
    for scene in lesson["scenes"]:
        yield from scene["runtimeBlocks"]


class StarterTeachingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.full = _fixture()
        self.lesson = self.full["lessons"][0]

    def test_every_demand_has_visible_teaching_and_local_help(self) -> None:
        original_questions = {
            item["id"]: item.get("question")
            for block in _all_blocks(self.lesson)
            for item in block.get("items", [])
            if "question" in item
        }
        original_ids = {block["id"] for block in _all_blocks(self.lesson)} | {scene["id"] for scene in self.lesson["scenes"]}
        MODULE.revise_starter(self.full)
        lesson = self.full["lessons"][0]
        self.assertEqual(lesson["sceneCount"], 28)
        self.assertEqual(len(lesson["scenes"]), 28)
        self.assertTrue(original_ids <= ({block["id"] for block in lesson["blocks"]} | {scene["id"] for scene in lesson["scenes"]}))
        self.assertEqual(
            {item["id"]: item.get("question") for block in _all_blocks(lesson) for item in block.get("items", []) if "question" in item},
            {**original_questions, "a1teach-start-s5-transfer-practice-item-1": "Escribe el mensaje completo con la ficha nueva."},
        )
        for scene in lesson["scenes"]:
            if scene["phase"] != "starter-practice":
                continue
            blocks = scene["runtimeBlocks"]
            interactive_index = next(i for i, block in enumerate(blocks) if block["type"] in MODULE._INTERACTIVE_TYPES)
            teaching_index = next(i for i, block in enumerate(blocks) if block["id"].endswith("-teaching"))
            help_index = next(i for i, block in enumerate(blocks) if block["id"].endswith("-help"))
            self.assertLess(teaching_index, interactive_index, scene["id"])
            self.assertLess(help_index, interactive_index, scene["id"])
            interactive = blocks[interactive_index]
            self.assertTrue(interactive["data"]["autoCheck"])
            self.assertTrue(interactive["data"]["autoAdvance"])
            self.assertFalse(interactive["data"]["manualNext"])
        for activity_id in COUNTS:
            teach = next(scene for scene in lesson["scenes"] if scene["id"] == f"a1m1-start-{activity_id.lower()}-teach")
            self.assertIn(f"a1teach-start-{activity_id.lower()}-explicit", {block["id"] for block in teach["runtimeBlocks"]})
            vocab = [block for block in teach["runtimeBlocks"] if block["type"] == "vocabulary"]
            self.assertTrue(vocab)
            for block in vocab:
                self.assertEqual(block["data"]["teachingPresentation"], "pronunciation")
                self.assertTrue(all(set(item) == {"id", "term", "definition", "audioUrl"} for item in block["items"]))
        s3 = next(scene for scene in lesson["scenes"] if scene["id"] == "a1m1-start-s3-teach")
        table = next(block for block in s3["runtimeBlocks"] if block["id"] == "a1m1-start-s3-support")
        rows = table["content"]["rows"]
        self.assertEqual(sum(row[0] == "20" for row in rows), 1)
        self.assertIn(["Room 204", "two oh four"], rows)
        s5 = next(scene for scene in lesson["scenes"] if scene["id"] == "a1m1-start-s5-teach")
        s5_card = next(block for block in s5["runtimeBlocks"] if block["id"] == "a1m1-start-s5-support")
        self.assertEqual(s5_card["data"]["cardKind"], "data-card")
        self.assertEqual(s5_card["data"]["materialAvailability"], "learner-visible-runtime")
        self.assertEqual(lesson["blocks"], list(_all_blocks(lesson)))
        self.assertEqual([block["order"] for block in lesson["blocks"]], list(range(len(lesson["blocks"]))))

    def test_original_s4_audio_is_reused_locally_and_transfer_has_new_data(self) -> None:
        MODULE.revise_starter(self.full)
        lesson = self.full["lessons"][0]
        s4_checks = [scene for scene in lesson["scenes"] if scene.get("activityId") == "S4" and scene["phase"] == "starter-practice"]
        self.assertEqual(len(s4_checks), 3)
        for scene in s4_checks:
            self.assertTrue(
                any(
                    block.get("type") == "audio" and block.get("url") == "/audio/a1-module1-pilot/starter-s4-listening.mp3"
                    for block in scene["runtimeBlocks"]
                )
            )
        transfer = next(scene for scene in lesson["scenes"] if scene["id"] == "a1teach-start-s5-transfer")
        self.assertEqual(transfer["transferData"]["Name"], "Luis Vega")
        self.assertEqual(transfer["transferData"]["Origin"], "Chile")
        card = next(block for block in transfer["runtimeBlocks"] if block.get("data", {}).get("cardKind") == "data-card")
        self.assertIn(["Room", "Room 105"], card["content"]["rows"])
        practice = next(block for block in transfer["runtimeBlocks"] if block["type"] == "short_answer")
        self.assertIn("Luis", practice["items"][0]["correctAnswer"])
        self.assertIn("Chile", practice["items"][0]["correctAnswer"])
        self.assertTrue(practice["data"]["autoCheck"])
        self.assertTrue(practice["data"]["autoAdvance"])
        self.assertFalse(practice["data"]["manualNext"])
        self.assertNotIn("Siguiente", " ".join(str(block.get("content", "")) for block in transfer["runtimeBlocks"]))

    def test_audio_specs_are_bounded_and_match_vocabulary_urls(self) -> None:
        specs = MODULE.starter_audio_specs()
        self.assertLessEqual(len(specs), 45)
        self.assertEqual(len({item["filename"] for item in specs}), len(specs))
        self.assertTrue(all(item["filename"].startswith("teach-start-") and item["filename"].endswith("-v2.mp3") for item in specs))
        self.assertTrue(all(item["text"] and item["sourceRef"].startswith("starter.S") for item in specs))
        self.assertTrue(all("audioUrl" in item for block in MODULE._VOCABULARY_GROUPS["S3"] for item in block["items"]))
        spec_urls = {f"/audio/a1-module1-pilot/{item['filename']}" for item in specs}
        self.assertTrue(
            all(
                item["audioUrl"] in spec_urls
                for activity in MODULE._VOCABULARY_GROUPS.values()
                for group in activity
                for item in group["items"]
            )
        )

    def test_revision_is_idempotent_and_removes_physical_material_language(self) -> None:
        MODULE.revise_starter(self.full)
        first_ids = [block["id"] for block in self.full["lessons"][0]["blocks"]]
        first_scene_ids = [scene["id"] for scene in self.full["lessons"][0]["scenes"]]
        MODULE.revise_starter(self.full)
        lesson = self.full["lessons"][0]
        self.assertEqual(first_ids, [block["id"] for block in lesson["blocks"]])
        self.assertEqual(first_scene_ids, [scene["id"] for scene in lesson["scenes"]])
        self.assertNotIn("tarjeta", str(lesson).lower())
        self.assertNotIn("tarjetas", str(lesson).lower())
        self.assertEqual(self.full["audioManifest"]["verifiedFileCount"], 11)
        self.assertEqual(self.full["visualAcceptanceManifest"]["lessonSceneMapping"]["a1-general-start"]["sceneCount"], 28)


if __name__ == "__main__":
    unittest.main()
