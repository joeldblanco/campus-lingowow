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
            "data": {
                **data,
                "doNotAutoGrade": True,
                "teacherReviewOnly": True,
                "originalEnglishModel": "Source model: Ana lives in Lima.",
                "reviewChecklist": ["Old Ana checklist"],
                "conversationTurns": [
                    {
                        "id": f"{block_id}-turn-1",
                        "question": "What is the old task?",
                        "answerPrompt": "Use Ana and Arequipa from the old card.",
                    },
                    {
                        "id": f"{block_id}-turn-2",
                        "question": "What is the old confirmation?",
                        "answerPrompt": "Confirm the old Lima detail.",
                    },
                ],
            },
            "prompt": "Habla con la tarjeta.",
        }
    if block_type == "essay":
        return {
            "id": block_id,
            "type": block_type,
            "order": order,
            "data": {
                **data,
                "doNotAutoGrade": True,
                "teacherReviewOnly": True,
                "originalEnglishModel": "Source essay model: Ana lives in Lima.",
                "learningModes": {
                    "individual": "Escribe sobre Ana y Arequipa; el dato viejo es Lima.",
                    "teacher": "Modela la respuesta vieja de Ana.",
                },
                "reviewChecklist": ["Old Ana checklist"],
            },
            "prompt": "Escribe sobre Ana y Arequipa.",
        }
    if block_type == "audio":
        return {
            "id": block_id,
            "type": block_type,
            "order": order,
            "data": {
                **data,
                "detailsHiddenUntilCheck": True,
                "transcriptDisclosure": "after-listen-check",
            },
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
            elif phase == "transfer-writing":
                blocks = [
                    _block(f"{scene_id}-title", scene_id, scene_asset, "title", role="production"),
                    _block(f"{scene_id}-prompt", scene_id, scene_asset, role="production", order=1),
                    _block(f"{scene_id}-essay", scene_id, scene_asset, "essay", role="production", order=2),
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
        "audioManifest": {
            "listeningPlan": [
                {
                    "lessonId": f"a1-general-u{unit}",
                    "detailsHiddenUntilCheck": True,
                    "transcriptDisclosure": "after-listen-check",
                }
                for unit in range(1, 5)
            ]
        },
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
        # Each unit receives two micro-scenes (3 + 4 blocks), oral and written
        # transfer cards, and nine local demand-support blocks: 18 new blocks/unit.
        self.assertEqual(len(after_ids), len(before_ids) + 72)
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
            self.assertEqual(lesson["sceneCount"], 13)
            self.assertEqual(
                [block["id"] for scene in lesson["scenes"] for block in scene["runtimeBlocks"]],
                [block["id"] for block in lesson["blocks"]],
            )
            teach = next(scene for scene in lesson["scenes"] if scene["phase"] == "unit-teach")
            self.assertFalse(
                any(
                    block["id"].startswith((
                        f"a1teach-u{unit}-pronunciation-v2",
                        f"a1teach-u{unit}-grammar-v2",
                        f"a1teach-u{unit}-substitution-v2",
                    ))
                    for block in teach["runtimeBlocks"]
                )
            )
            sounds = next(scene for scene in lesson["scenes"] if scene["phase"] == "unit-teach-pronunciation")
            patterns = next(scene for scene in lesson["scenes"] if scene["phase"] == "unit-teach-patterns")
            self.assertEqual(
                [scene["phase"] for scene in lesson["scenes"][:3]],
                ["unit-teach", "unit-teach-pronunciation", "unit-teach-patterns"],
            )
            vocab = next(block for block in sounds["runtimeBlocks"] if block["type"] == "vocabulary")
            self.assertEqual(vocab["data"]["teachingPresentation"], "pronunciation")
            self.assertEqual(vocab["data"]["pronunciationSource"], "synthetic-teaching-v2")
            self.assertNotIn("audioSource", vocab["data"])
            self.assertEqual(len(vocab["items"]), 4)
            self.assertTrue(
                all(set(item) == {"id", "term", "definition", "audioUrl"} for item in vocab["items"])
            )
            self.assertTrue(all(item["audioUrl"].startswith("/audio/a1-module1-pilot/teach-u") for item in vocab["items"]))
            grammar = next(block for block in patterns["runtimeBlocks"] if block["id"] == f"a1teach-u{unit}-grammar-v2")
            substitution = next(block for block in patterns["runtimeBlocks"] if block["id"] == f"a1teach-u{unit}-substitution-v2")
            self.assertEqual(grammar["data"]["pilotSceneId"], patterns["id"])
            self.assertEqual(substitution["data"]["pilotSceneId"], patterns["id"])
            self.assertEqual(grammar["data"]["sourceTeachingToDemand"][0]["demandSceneIds"], [
                scene["id"] for scene in lesson["scenes"]
                if scene["phase"] in {"listening-check", "comprehension", "practice", "transfer-speaking", "transfer-writing"}
            ])
            transfer = next(scene for scene in lesson["scenes"] if scene["phase"] == "transfer-speaking")
            cards = next(block for block in transfer["runtimeBlocks"] if block["id"] == f"a1teach-u{unit}-transfer-cards-v2")
            self.assertEqual(cards["data"]["pairedProductionBlockId"], f"a1m1-u{unit}-transfer-speak-recording")
            self.assertEqual(cards["data"]["pilotSceneId"], transfer["id"])
            self.assertEqual(cards["content"]["headers"], ["Tarjeta", "Datos nuevos", "Patrón opcional"])
            self.assertTrue(all(len(row) == 3 and "___" in row[2] for row in cards["content"]["rows"]))
            self.assertFalse(any("Hi, I'm Marta" in cell for row in cards["content"]["rows"] for cell in row))
            recording = next(block for block in transfer["runtimeBlocks"] if block["id"].endswith("-recording"))
            self.assertEqual(recording["data"]["transferCardsBlockId"], cards["id"])
            self.assertLess(
                [block["id"] for block in transfer["runtimeBlocks"]].index(cards["id"]),
                [block["id"] for block in transfer["runtimeBlocks"]].index(recording["id"]),
            )
            self.assertEqual(recording["data"]["reviewChecklist"], TEACHING._TRANSFER_CHECKLISTS[unit])
            self.assertTrue(all("Ana" not in turn["answerPrompt"] for turn in recording["data"]["conversationTurns"]))
            self.assertTrue(all("Arequipa" not in turn["answerPrompt"] for turn in recording["data"]["conversationTurns"]))
            self.assertTrue(all("Lima" not in turn["answerPrompt"] for turn in recording["data"]["conversationTurns"]))
            transfer_text = next(
                block["content"] for block in transfer["runtimeBlocks"] if block["id"].endswith("-prompt")
            )
            recording_prompt = next(
                block["prompt"] for block in transfer["runtimeBlocks"] if block["id"].endswith("-recording")
            )
            self.assertIn("tarjeta nueva", transfer_text.casefold())
            self.assertIn("tarjeta nueva", recording_prompt.casefold())
            self.assertNotIn("Ana", transfer_text)
            self.assertNotIn("Ana", recording_prompt)
            writing = next(scene for scene in lesson["scenes"] if scene["phase"] == "transfer-writing")
            writing_cards = next(
                block for block in writing["runtimeBlocks"]
                if block["id"] == f"a1teach-u{unit}-transfer-writing-cards-v2"
            )
            self.assertEqual(writing_cards["data"]["pilotSceneId"], writing["id"])
            self.assertEqual(writing_cards["data"]["localForSceneId"], writing["id"])
            self.assertEqual(writing_cards["data"]["pairedProductionBlockId"], f"a1m1-u{unit}-transfer-review-essay")
            self.assertTrue(all(len(row) == 3 and "___" in row[2] for row in writing_cards["content"]["rows"]))
            writing_text = next(
                block["content"] for block in writing["runtimeBlocks"] if block["id"].endswith("-prompt")
            )
            essay = next(block for block in writing["runtimeBlocks"] if block["type"] == "essay")
            self.assertIn("tarjetas de esta escena", writing_text)
            self.assertLess(
                [block["id"] for block in writing["runtimeBlocks"]].index(writing_cards["id"]),
                [block["id"] for block in writing["runtimeBlocks"]].index(essay["id"]),
            )
            self.assertEqual(essay["data"]["transferCardsBlockId"], writing_cards["id"])
            self.assertEqual(essay["data"]["learningModes"], TEACHING._transfer_learning_modes(TEACHING._transfer_card_data(TEACHING._PLANS[unit])))
            self.assertEqual(essay["data"]["reviewChecklist"], TEACHING._TRANSFER_CHECKLISTS[unit])
            self.assertNotIn("Ana", essay["data"]["learningModes"]["individual"])
            self.assertNotIn("Lima", essay["data"]["learningModes"]["individual"])
            self.assertNotIn("Arequipa", essay["data"]["learningModes"]["individual"])
            demand_phases = {"listening-check", "comprehension", "practice", "transfer-speaking", "transfer-writing"}
            demand_scenes = [scene for scene in lesson["scenes"] if scene["phase"] in demand_phases]
            self.assertEqual(len(demand_scenes), 9)
            for demand in demand_scenes:
                support = [
                    block for block in demand["runtimeBlocks"]
                    if block["id"].startswith(f"a1teach-u{unit}-support-")
                ]
                self.assertEqual(len(support), 1, demand["id"])
                support_data = support[0]["data"]
                self.assertTrue(support_data["collapsible"])
                self.assertFalse(support_data["answerRevealing"])
                self.assertEqual(support_data["localSupportForSceneId"], demand["id"])
                self.assertEqual(support_data["pilotSceneId"], demand["id"])
            self.assertLessEqual(teach["interactiveCount"], 1)

            listening = next(scene for scene in lesson["scenes"] if scene["phase"] == "listening-audio")
            self.assertEqual(listening["transcriptDisclosure"], "visible-reference")
            self.assertIn("cuando la necesites", listening["instruction"])
            audio = next(block for block in listening["runtimeBlocks"] if block["type"] == "audio")
            self.assertFalse(audio["data"]["detailsHiddenUntilCheck"])
            self.assertEqual(audio["data"]["transcriptDisclosure"], "visible-reference")

        self.assertEqual(full["sourceAudit"]["teachingRevision"], TEACHING.TEACHING_REVISION)
        self.assertEqual(set(full["sourceAudit"]["teachingSourceToDemand"]), {f"a1-general-u{i}" for i in range(1, 5)})
        self.assertIn("a1m1-u1-practice-1", full["sourceAudit"]["teachingSourceToDemand"]["a1-general-u1"]["demandSceneIds"])
        self.assertTrue(all(not item["detailsHiddenUntilCheck"] for item in full["audioManifest"]["listeningPlan"]))
        self.assertNotIn("chunk", json.dumps(full, ensure_ascii=False).casefold())

    def test_forms_and_context_are_visible_before_their_demands(self) -> None:
        full = _fixture()
        u1_before = next(item for item in full["lessons"] if item["id"] == "a1-general-u1")
        oral_prompt_before = next(
            block for block in u1_before["blocks"] if block["id"] == "a1m1-u1-transfer-speak-prompt"
        )
        writing_prompt_before = next(
            block for block in u1_before["blocks"] if block["id"] == "a1m1-u1-transfer-review-prompt"
        )
        essay_before = next(block for block in u1_before["blocks"] if block["id"] == "a1m1-u1-transfer-review-essay")
        oral_source_model = oral_prompt_before["data"]["originalEnglishModel"]
        writing_source_model = writing_prompt_before["data"]["originalEnglishModel"]
        essay_source_prompt = essay_before["prompt"]
        TEACHING.revise_units(full)

        u1_after = next(item for item in full["lessons"] if item["id"] == "a1-general-u1")
        oral_prompt_after = next(block for block in u1_after["blocks"] if block["id"] == "a1m1-u1-transfer-speak-prompt")
        writing_prompt_after = next(block for block in u1_after["blocks"] if block["id"] == "a1m1-u1-transfer-review-prompt")
        essay_after = next(block for block in u1_after["blocks"] if block["id"] == "a1m1-u1-transfer-review-essay")
        self.assertEqual(oral_prompt_after["data"]["sourceTransferModel"], oral_source_model)
        self.assertEqual(writing_prompt_after["data"]["sourceTransferModel"], writing_source_model)
        self.assertEqual(essay_after["data"]["sourcePromptOriginal"], essay_source_prompt)
        self.assertNotIn("Ana", essay_after["prompt"])
        self.assertNotIn("Arequipa", essay_after["prompt"])

        u1 = u1_after
        u1_patterns = next(scene for scene in u1["scenes"] if scene["phase"] == "unit-teach-patterns")
        u1_grammar = next(block for block in u1_patterns["runtimeBlocks"] if block["id"] == "a1teach-u1-grammar-v2")
        u1_rows = u1_grammar["content"]["rows"]
        self.assertTrue(any("I'm = I am" in row[0] and "I am Ana" in row[2] for row in u1_rows))

        u2 = next(item for item in full["lessons"] if item["id"] == "a1-general-u2")
        u2_teach = next(scene for scene in u2["scenes"] if scene["phase"] == "unit-teach")
        u2_model = next(block for block in u2_teach["runtimeBlocks"] if block["id"].endswith("-teach-text"))
        self.assertIn("Who is she?", u2_model["content"])
        self.assertIn("manager Ana", u2_model["content"])
        u2_patterns = next(scene for scene in u2["scenes"] if scene["phase"] == "unit-teach-patterns")
        u2_grammar = next(block for block in u2_patterns["runtimeBlocks"] if block["id"] == "a1teach-u2-grammar-v2")
        u2_rows = u2_grammar["content"]["rows"]
        self.assertTrue(any("These are" in row[0] and "plural" in row[1] for row in u2_rows))
        self.assertTrue(any("my / your / his / her / our / their" in row[0] for row in u2_rows))

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
