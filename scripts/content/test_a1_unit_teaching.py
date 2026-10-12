"""Regression tests for the dependency-free U1–U4 teaching revision."""

from __future__ import annotations

import copy
import importlib.util
import json
import re
import unittest
from pathlib import Path
from typing import Any


MODULE_PATH = Path(__file__).with_name("a1_unit_teaching.py")
SPEC = importlib.util.spec_from_file_location("a1_unit_teaching_under_test", MODULE_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover - import guard
    raise RuntimeError(f"Cannot import {MODULE_PATH}")
TEACHING = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TEACHING)


def _metadata(scene_id: str, scene: str, role: str = "teaching") -> dict[str, Any]:
    return {
        "learningRevision": "course-guided-v1",
        "pilotRevision": "a1-module1-pilot-v1",
        "pilotSceneId": scene_id,
        "guidedTitle": "Unidad piloto",
        "scene": scene,
        "sceneSide": "right",
        "contentRole": role,
        "sourceRefs": [f"module1.{scene_id}"],
    }


def _block(
    block_id: str,
    scene_id: str,
    scene: str,
    block_type: str = "text",
    *,
    role: str = "teaching",
    order: int = 0,
) -> dict[str, Any]:
    data = _metadata(scene_id, scene, role)
    if block_type == "text":
        return {
            "id": block_id,
            "type": "text",
            "order": order,
            "data": {
                **data,
                "originalEnglishModel": (
                    "A long original model remains in provenance. It describes the scene, repeats the greeting, "
                    "adds a second speaker, explains the relationship, and includes several details for the "
                        "reading and listening demands that follow. It also repeats context, names, locations, "
                        "timing, and background information that the learner can consult later as source evidence. "
                        "The source narrative keeps extra framing so the test can distinguish learner copy from provenance."
                ),
            },
            "content": "<p><strong>Consigna:</strong> Lee el modelo.</p><p><strong>Modelo:</strong> A long original model.</p>",
            "format": "html",
        }
    if block_type == "structured-content":
        return {
            "id": block_id,
            "type": "structured-content",
            "order": order,
            "data": {**data, "supportLabel": "Abrir significados", "collapsible": True},
            "title": "Significados de apoyo",
            "config": {"hasHeaderRow": True},
            "content": {"headers": ["English", "Español / uso"], "rows": [["Base", "Base"]]},
        }
    if block_type == "multiple_choice":
        return {
            "id": block_id,
            "type": block_type,
            "order": order,
            "data": {**data, "sourceItems": [{"sourceKey": block_id, "sourceType": "choice"}]},
            "items": [
                {
                    "id": f"{block_id}-item-1",
                    "question": "¿Cuál es la opción?",
                    "options": [
                        {"id": f"{block_id}-option-1", "text": "A"},
                        {"id": f"{block_id}-option-2", "text": "B"},
                    ],
                    "correctOptionId": f"{block_id}-option-1",
                }
            ],
        }
    if block_type == "recording":
        return {
            "id": block_id,
            "type": block_type,
            "order": order,
            "data": {**data, "doNotAutoGrade": True, "teacherReviewOnly": True},
            "prompt": "Habla con la tarjeta.",
        }
    if block_type == "audio":
        return {
            "id": block_id,
            "type": block_type,
            "order": order,
            "data": data,
            "url": f"/audio/a1-module1-pilot/u{block_id.split('-')[1]}-model.mp3",
            "sha256": f"hash-{block_id}",
            "transcript": "Original verified transcript.",
        }
    return {"id": block_id, "type": block_type, "order": order, "data": data}


def _fixture() -> dict[str, Any]:
    lessons: list[dict[str, Any]] = []
    for unit in range(1, 5):
        lesson_id = f"a1-general-u{unit}"
        scene_asset = f"/images/lessons/backgrounds/u{unit}.webp"
        phases = [
            ("teach", "unit-teach"),
            ("listening", "listening-audio"),
            ("listening-check", "listening-check"),
            ("comprehension", "comprehension"),
            ("practice-1", "practice"),
            ("practice-2", "practice"),
            ("practice-3", "practice"),
            ("practice-4", "practice"),
            ("practice-5", "practice"),
            ("transfer-speak", "transfer-speaking"),
            ("transfer-review", "transfer-writing"),
        ]
        scenes: list[dict[str, Any]] = []
        for order, (suffix, phase) in enumerate(phases, start=1):
            scene_id = f"a1m1-u{unit}-{suffix}"
            if phase == "unit-teach":
                blocks = [
                    _block(f"{scene_id}-title", scene_id, scene_asset, "title"),
                    _block(f"{scene_id}-text", scene_id, scene_asset),
                    _block(f"{scene_id}-language-support", scene_id, scene_asset, "structured-content"),
                ]
            elif phase == "listening-audio":
                blocks = [
                    _block(f"{scene_id}-title", scene_id, scene_asset, "title"),
                    _block(f"{scene_id}-transcript", scene_id, scene_asset),
                    _block(f"a1-general-u{unit}-verified-audio", scene_id, scene_asset, "audio"),
                ]
            elif phase == "transfer-speaking":
                blocks = [
                    _block(f"{scene_id}-title", scene_id, scene_asset, "title", role="production"),
                    _block(f"{scene_id}-prompt", scene_id, scene_asset, role="production", order=1),
                    _block(f"{scene_id}-recording", scene_id, scene_asset, "recording", role="production", order=2),
                ]
            else:
                block_type = "multiple_choice" if phase in {"comprehension", "practice"} else "text"
                blocks = [
                    _block(f"{scene_id}-title", scene_id, scene_asset, "title", role=phase),
                    _block(f"{scene_id}-instruction", scene_id, scene_asset, role=phase, order=1),
                    _block(f"{scene_id}-items", scene_id, scene_asset, block_type, role=phase, order=2),
                ]
            scenes.append(
                {
                    "id": scene_id,
                    "lessonId": lesson_id,
                    "order": order,
                    "phase": phase,
                    "title": f"Unidad {unit}",
                    "instruction": "Instrucción original.",
                    "route": "learner",
                    "sourceRefs": [f"module1.unit{unit}"],
                    "interactiveCount": sum(block["type"] in TEACHING._INTERACTIVE_TYPES for block in blocks),
                    "runtimeBlockIds": [block["id"] for block in blocks],
                    "runtimeBlocks": blocks,
                    "background": scene_asset,
                    "sceneSide": "right",
                }
            )
        lessons.append(
            {
                "id": lesson_id,
                "title": f"Unidad {unit}",
                "description": "Piloto",
                "order": unit,
                "sceneCount": len(scenes),
                "scenes": scenes,
                "blocks": [block for scene in scenes for block in scene["runtimeBlocks"]],
            }
        )

    untouched = {
        "id": "a1-general-start",
        "title": "Starter",
        "order": 0,
        "scenes": [],
        "blocks": [],
        "sceneCount": 0,
    }
    lessons.insert(0, untouched)
    return {
        "lessons": lessons,
        "module": {"lessons": lessons},
        "sourceAudit": {"counts": {"unitPractice": 20}},
        "runtimeMappingGuidance": {"oneInteractiveBlockPerScene": True},
        "acceptance": {"audioPending": False},
    }


class A1UnitTeachingTests(unittest.TestCase):
    def test_audio_specs_are_namespaced_and_within_limit(self) -> None:
        specs = TEACHING.unit_audio_specs()
        self.assertEqual(len(specs), 16)
        self.assertEqual(len({item["filename"] for item in specs}), len(specs))
        for unit in range(1, 5):
            unit_specs = [item for item in specs if item["filename"].startswith(f"teach-u{unit}-")]
            self.assertLessEqual(len(unit_specs), 8)
            self.assertEqual(len(unit_specs), 4)
            for item in unit_specs:
                self.assertRegex(item["filename"], rf"teach-u{unit}-.+-v2\.mp3")
                self.assertTrue(item["text"])
                self.assertTrue(item["sourceRef"].startswith(f"module1.unit{unit}.teaching."))

    def test_revision_preserves_original_demands_audio_and_adds_teaching(self) -> None:
        full = _fixture()
        before_ids = {
            block["id"]
            for lesson in full["lessons"]
            for block in lesson["blocks"]
        }
        before_questions = {
            block["id"]: (copy.deepcopy(block.get("items")), block.get("data", {}).get("sourceItems"))
            for lesson in full["lessons"]
            for block in lesson["blocks"]
            if block.get("type") == "multiple_choice"
        }
        before_audio = {
            block["id"]: (block.get("url"), block.get("sha256"), block.get("transcript"))
            for lesson in full["lessons"]
            for block in lesson["blocks"]
            if block.get("type") == "audio"
        }

        TEACHING.revise_units(full)

        after_ids = {block["id"] for lesson in full["lessons"] for block in lesson["blocks"]}
        self.assertTrue(before_ids <= after_ids)
        self.assertEqual(len(after_ids), len(before_ids) + 16)
        self.assertEqual(
            before_questions,
            {
                block["id"]: (copy.deepcopy(block.get("items")), block.get("data", {}).get("sourceItems"))
                for lesson in full["lessons"]
                for block in lesson["blocks"]
                if block.get("type") == "multiple_choice"
            },
        )
        self.assertEqual(
            before_audio,
            {
                block["id"]: (block.get("url"), block.get("sha256"), block.get("transcript"))
                for lesson in full["lessons"]
                for block in lesson["blocks"]
                if block.get("type") == "audio"
            },
        )

        for unit in range(1, 5):
            lesson = next(item for item in full["lessons"] if item["id"] == f"a1-general-u{unit}")
            self.assertEqual(lesson["sceneCount"], 11)
            self.assertEqual(
                [block["id"] for scene in lesson["scenes"] for block in scene["runtimeBlocks"]],
                [block["id"] for block in lesson["blocks"]],
            )
            teach = next(scene for scene in lesson["scenes"] if scene["phase"] == "unit-teach")
            vocab = next(block for block in teach["runtimeBlocks"] if block["type"] == "vocabulary")
            self.assertEqual(vocab["data"]["teachingPresentation"], "pronunciation")
            self.assertEqual(len(vocab["items"]), 4)
            self.assertTrue(all(item["audioUrl"].startswith("/audio/a1-module1-pilot/teach-u") for item in vocab["items"]))
            self.assertTrue(any(block["id"] == f"a1teach-u{unit}-grammar-v2" for block in teach["runtimeBlocks"]))
            self.assertTrue(any(block["id"] == f"a1teach-u{unit}-substitution-v2" for block in teach["runtimeBlocks"]))
            transfer = next(scene for scene in lesson["scenes"] if scene["phase"] == "transfer-speaking")
            cards = next(block for block in transfer["runtimeBlocks"] if block["id"] == f"a1teach-u{unit}-transfer-cards-v2")
            self.assertEqual(cards["data"]["pairedProductionBlockId"], f"a1m1-u{unit}-transfer-speak-recording")
            self.assertLessEqual(teach["interactiveCount"], 1)

        self.assertEqual(full["sourceAudit"]["teachingRevision"], TEACHING.TEACHING_REVISION)
        self.assertEqual(set(full["sourceAudit"]["teachingSourceToDemand"]), {f"a1-general-u{i}" for i in range(1, 5)})
        self.assertIn("a1m1-u1-practice-1", full["sourceAudit"]["teachingSourceToDemand"]["a1-general-u1"]["demandSceneIds"])

    def test_visible_model_is_shorter_and_revision_is_idempotent(self) -> None:
        full = _fixture()
        TEACHING.revise_units(full)
        first = json.dumps(full, ensure_ascii=False, sort_keys=True)
        for unit in range(1, 5):
            lesson = next(item for item in full["lessons"] if item["id"] == f"a1-general-u{unit}")
            teach_text = next(block for block in lesson["blocks"] if block["id"] == f"a1m1-u{unit}-teach-text")
            visible_words = re.findall(r"[A-Za-zÀ-ÿ']+", re.sub(r"<[^>]+>", " ", teach_text["content"]))
            original_words = re.findall(r"[A-Za-zÀ-ÿ']+", teach_text["data"]["originalEnglishModel"])
            self.assertLess(len(visible_words), len(original_words) + 10)
            self.assertIn("<strong>Consigna:</strong>", teach_text["content"])
            self.assertIn("<strong>Modelo:</strong>", teach_text["content"])
            self.assertIn("<strong>Sentido:</strong>", teach_text["content"])
        TEACHING.revise_units(full)
        self.assertEqual(first, json.dumps(full, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
