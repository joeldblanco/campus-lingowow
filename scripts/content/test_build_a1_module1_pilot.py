#!/usr/bin/env python3
"""Meaningful regression checks for the standalone A1 module 1 compiler."""

from __future__ import annotations

import importlib.util
import json
import os
import re
import tempfile
import unittest
from pathlib import Path
from typing import Any, Iterable


WORKTREE = Path(__file__).resolve().parents[2]
COMPILER_PATH = WORKTREE / "scripts/content/build-a1-module1-pilot.py"
EARLY = Path(os.environ["A1_PILOT_SOURCE"]) if os.environ.get("A1_PILOT_SOURCE") else None
BLUEPRINT = Path(os.environ["A1_PILOT_BLUEPRINT"]) if os.environ.get("A1_PILOT_BLUEPRINT") else None
MAPPING = Path(os.environ["A1_PILOT_MAPPING"]) if os.environ.get("A1_PILOT_MAPPING") else None
GENERATED = WORKTREE / "docs/curriculum/a1-module1-pilot.json"
GENERATED_MANIFEST = WORKTREE / "docs/curriculum/a1-module1-pilot-manifest.json"
AUDIO_MANIFEST_ENV = Path(os.environ["A1_PILOT_AUDIO_MANIFEST"]) if os.environ.get("A1_PILOT_AUDIO_MANIFEST") else None
DEFAULT_AUDIO_MANIFEST = WORKTREE / "docs/curriculum/a1-module1-audio-integration.json"
APPLY_SCRIPT = WORKTREE / "scripts/content/apply-a1-module1-pilot.py"


def _load_compiler():
    spec = importlib.util.spec_from_file_location("a1_module1_pilot_compiler", COMPILER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import compiler from {COMPILER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COMPILER = _load_compiler()


def _blocks(course: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for lesson in course["lessons"]:
        yield from lesson["blocks"]


def _source_keys(block: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for item in block.get("items", []):
        if item.get("sourceKey"):
            keys.add(item["sourceKey"])
    for item in block.get("sourceItems", []):
        if item.get("sourceKey"):
            keys.add(item["sourceKey"])
    for item in block.get("data", {}).get("sourceItems", []):
        if item.get("sourceKey"):
            keys.add(item["sourceKey"])
    keys.update(value for value in block.get("data", {}).get("sourceRefs", []) if value.startswith("module1."))
    return keys


def _source_types(block: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for item in block.get("items", []):
        if item.get("sourceType"):
            values.append(item["sourceType"])
    for item in block.get("sourceItems", []):
        if item.get("sourceType"):
            values.append(item["sourceType"])
    for item in block.get("data", {}).get("sourceItems", []):
        if item.get("sourceType"):
            values.append(item["sourceType"])
    return values


class A1Module1PilotCompilerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.generated = json.loads(GENERATED.read_text(encoding="utf-8")) if GENERATED.exists() else None
        cls.generated_manifest = json.loads(GENERATED_MANIFEST.read_text(encoding="utf-8")) if GENERATED_MANIFEST.exists() else None
        cls.audio_manifest_path = next(
            (
                candidate
                for candidate in (AUDIO_MANIFEST_ENV, DEFAULT_AUDIO_MANIFEST)
                if candidate is not None and candidate.exists()
            ),
            None,
        )
        source_paths_available = all(path is not None and path.exists() for path in (EARLY, BLUEPRINT, MAPPING))
        if source_paths_available:
            cls.course, cls.manifest = COMPILER.build_artifacts(
                EARLY,
                BLUEPRINT,
                MAPPING,
                cls.audio_manifest_path,
            )
        else:
            cls.course, cls.manifest = cls.generated, cls.generated_manifest
        if cls.course is None or cls.manifest is None:
            raise RuntimeError("Provide source paths or generate both the public JSON and its manifest first")
        cls.audio_enabled = any(block["type"] == "audio" for block in _blocks(cls.course))

    def test_u1_farewell_question_attributes_the_spoken_speaker(self) -> None:
        question = COMPILER.LISTENING_CHECKS[1][4]
        self.assertEqual(question['prompt'], '¿Qué dice Luis al final?')
        self.assertEqual(question['feedback'], 'Luis termina con See you in class.')
        self.assertEqual(question['answer'], 'See you in class')
        if self.audio_enabled:
            published = next(item for block in _blocks(self.course)
                             for item in block.get('items', [])
                             if item.get('id') == 'a1m1-u1-listening-check-items-q5')
            self.assertEqual(published['question'], question['prompt'])
            self.assertEqual(published['explanation'], question['feedback'])

    def test_public_contract_and_fixed_ids(self) -> None:
        self.assertEqual(set(self.course), {"course", "module", "lessons"})
        self.assertEqual(set(self.course["course"]), {"id", "title", "description", "language", "level"})
        self.assertEqual(set(self.course["module"]), {"id", "title", "description", "level", "objectives"})
        self.assertIsInstance(self.course["module"]["objectives"], str)
        self.assertEqual(self.course["course"]["id"], "a1-general-module1-pilot")
        self.assertIn("description", self.course["course"])
        if self.audio_enabled:
            for block in _blocks(self.course):
                self.assertEqual(block['data']['teachingRevision'], 'a1-teaching-v2', block['id'])
        self.assertEqual(self.course["module"]["id"], "a1-general-module1")
        self.assertEqual(
            [lesson["id"] for lesson in self.course["lessons"]],
            [
                "a1-general-start",
                "a1-general-u1",
                "a1-general-u2",
                "a1-general-u3",
                "a1-general-u4",
                "a1-general-mission",
            ],
        )
        self.assertEqual([lesson["order"] for lesson in self.course["lessons"]], list(range(6)))
        for lesson in self.course["lessons"]:
            self.assertEqual(set(lesson), {"id", "title", "description", "order", "blocks"})
            self.assertTrue(lesson["blocks"], lesson["id"])

    def test_runtime_ids_are_new_and_unique(self) -> None:
        identifiers = [lesson["id"] for lesson in self.course["lessons"]]
        identifiers.extend(block["id"] for block in _blocks(self.course))
        identifiers.extend(scene["id"] for scene in self.manifest["sceneSummaries"])
        self.assertEqual(len(identifiers), len(set(identifiers)))
        source_ids = {"starter", "S1", "S2", "S3", "S4", "S5", "M01", "1", "2", "3", "4"}
        self.assertTrue(source_ids.isdisjoint(identifiers))
        self.assertTrue(all(re.fullmatch(r"[a-z0-9_-]+", identifier) for identifier in identifiers), identifiers)

    def test_text_blocks_are_safe_html_and_carry_pilot_revision(self) -> None:
        text_blocks = [block for block in _blocks(self.course) if block["type"] == "text"]
        self.assertTrue(text_blocks)
        self.assertEqual(self.manifest["runtimeMappingGuidance"]["pilotRevision"], "a1-module1-pilot-v1")
        for lesson in self.course["lessons"]:
            public_orders = [block["order"] for block in lesson["blocks"]]
            self.assertEqual(public_orders, list(range(len(public_orders))), lesson["id"])
        for block in _blocks(self.course):
            self.assertEqual(block["data"].get("pilotRevision"), "a1-module1-pilot-v1", block["id"])
        for block in text_blocks:
            self.assertEqual(block.get("format"), "html", block["id"])
            self.assertNotIn("**", block["content"], block["id"])
            self.assertNotIn("\n", block["content"], block["id"])
            self.assertRegex(block["content"], r"<(?:p|details|ul)>", block["id"])

    def test_learner_copy_is_compact_and_spanish_guided(self) -> None:
        teaching_ids = {
            "a1m1-start-s1-teach-text",
            "a1m1-start-s2-teach-text",
            "a1m1-start-s3-teach-text",
            "a1m1-start-s4-teach-text",
            "a1m1-start-s5-teach-text",
            "a1m1-u1-teach-text",
            "a1m1-u2-teach-text",
            "a1m1-u3-teach-text",
            "a1m1-u4-teach-text",
        }
        blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
        for block_id in teaching_ids:
            content = blocks_by_id[block_id]["content"]
            if self.audio_enabled:
                scene_id = blocks_by_id[block_id]['data']['pilotSceneId']
                scene_text = ' '.join(block.get('content', '') for block in _blocks(self.course) if block['type'] == 'text' and block['data']['pilotSceneId'] == scene_id)
                self.assertRegex(scene_text, r'<strong>(?:Consigna|Aprende antes de responder):</strong>', block_id)
                self.assertLess(len(re.sub('<[^>]+>', '', content).split()), 100, block_id)
            else:
                self.assertIn("<strong>Consigna:</strong>", content, block_id)
            self.assertIn("<strong>Modelo:</strong>", content, block_id)
            self.assertNotIn("Modelo original", content, block_id)
            self.assertNotIn("Ruta docente", content, block_id)
            self.assertNotIn("Ruta autónoma", content, block_id)
        comp_blocks = [block for block in _blocks(self.course) if block["data"].get("contentRole") == "comprehension"]
        questions = [item["question"] for block in comp_blocks for item in block.get("items", [])]
        self.assertTrue(questions)
        self.assertTrue(all("¿" in question or question.startswith("¿") for question in questions))
        practice_prompts = [
            item.get("question", "")
            for block in _blocks(self.course)
            if block["data"].get("contentRole") == "practice"
            for item in block.get("items", [])
        ]
        self.assertTrue(any("¿" in prompt or prompt.startswith(("Completa", "Ordena", "Responde", "Identifica", "Da", "Confirma", "Al ")) for prompt in practice_prompts))

    def test_source_counts_and_coverage(self) -> None:
        unit_lessons = self.course["lessons"][1:5]
        comp_keys = {
            key
            for lesson in unit_lessons
            for block in lesson["blocks"]
            for key in _source_keys(block)
            if ".comprehension." in key
        }
        practice_keys = {
            key
            for lesson in unit_lessons
            for block in lesson["blocks"]
            for key in _source_keys(block)
            if ".practice." in key
        }
        self.assertEqual(len(comp_keys), 12)
        self.assertEqual(len(practice_keys), 20)
        self.assertEqual(self.manifest["sourceAudit"]["counts"]["unitComprehension"], 12)
        self.assertEqual(self.manifest["sourceAudit"]["counts"]["unitPractice"], 20)
        self.assertEqual(self.manifest["sourceAudit"]["counts"]["starterPractice"], 22)
        self.assertEqual(self.manifest["acceptance"]["starterActivities"], ["S1", "S2", "S3", "S4", "S5"])
        practice_blocks = [
            block
            for lesson in self.course["lessons"]
            for block in lesson["blocks"]
            if block["data"].get("contentRole") == "practice" and block["type"] in {"multiple_choice", "short_answer", "ordering", "match"}
        ]
        self.assertEqual(len(practice_blocks), 42)
        for block in practice_blocks:
            feedback = block.get("sourceFeedback") or block["data"].get("sourceFeedback")
            self.assertTrue(feedback, block["id"])

    def test_choice_keys_are_unique_and_correct_answers_are_reachable(self) -> None:
        source_choice_keys: set[str] = set()
        for block in _blocks(self.course):
            if block["type"] != "multiple_choice":
                continue
            for item in block.get("items", []):
                option_ids = [option["id"] for option in item["options"]]
                option_texts = [option["text"] for option in item["options"]]
                self.assertEqual(len(option_ids), len(set(option_ids)), item["id"])
                self.assertEqual(len(option_texts), len(set(option_texts)), item["id"])
                self.assertIn(item["correctOptionId"], option_ids, item["id"])
                if item.get("sourceType") == "choice":
                    source_choice_keys.add(item["sourceKey"])
        self.assertGreaterEqual(len(source_choice_keys), 18)

    def test_cloze_uses_inline_blank_and_preserves_source_blank(self) -> None:
        cloze_count = 0
        for block in _blocks(self.course):
            if "cloze" not in _source_types(block):
                continue
            cloze_count += 1
            self.assertEqual(block["type"], "short_answer")
            self.assertEqual(block["data"]["answerLayout"], "inlineBlank")
            self.assertIn("___", block["items"][0]["question"])
            self.assertTrue(block["items"][0]["acceptedAnswers"])
            self.assertIn(block["items"][0]["correctAnswer"], block["items"][0]["acceptedAnswers"])
        self.assertEqual(cloze_count, 10)

    def test_ordering_uses_actual_sentence_and_accepted_sequences(self) -> None:
        order_count = 0
        for block in _blocks(self.course):
            if "order" not in _source_types(block):
                continue
            if block["type"] == "ordering":
                order_count += 1
                expected = [item["text"] for item in sorted(block["items"], key=lambda item: item["correctPosition"])]
                strip_punctuation = lambda value: re.sub(r"[.,!?]", "", value)
                self.assertEqual(strip_punctuation(" ".join(expected)), strip_punctuation(block["data"]["correctSentence"]))
                self.assertTrue(block["data"]["acceptedSequences"])
                self.assertEqual(len(expected), len({item["correctPosition"] for item in block["items"]}))
        self.assertEqual(order_count, 5)
        reconstruction = next(
            block
            for block in _blocks(self.course)
            if block["type"] == "short_answer"
            and block["data"].get("sourceRefs") == ["module1.unit1.practice.5"]
        )
        self.assertEqual(reconstruction["type"], "short_answer")
        self.assertEqual(reconstruction["data"]["expectedAnswer"], "Nice to meet you")
        self.assertEqual(reconstruction["items"][0]["correctAnswer"], "Nice to meet you")
        self.assertEqual(reconstruction["items"][0]["sourceType"], "order")
        self.assertEqual(reconstruction["data"]["sourceItems"][0]["sourceType"], "order")
        self.assertEqual(reconstruction["data"]["answerLayout"], "freeText")
        self.assertNotEqual(reconstruction["data"]["answerLayout"], "inlineBlank")
        for token in ("meet", "you", "Nice", "to"):
            self.assertIn(token, reconstruction["items"][0]["question"])

    def test_every_scene_has_existing_asset_and_at_most_one_interactive(self) -> None:
        interactive = {"multiple_choice", "short_answer", "ordering", "match", "essay", "recording"}
        blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
        for scene in self.manifest["sceneSummaries"]:
            asset = scene["background"]
            self.assertEqual(scene["backgroundSrc"], asset)
            self.assertTrue((WORKTREE / "public" / asset.lstrip("/")).exists(), asset)
            self.assertLessEqual(scene["interactiveCount"], 1, scene["id"])
            scene_blocks = [blocks_by_id[block_id] for block_id in scene["runtimeBlockIds"]]
            for block in scene_blocks:
                metadata = block["data"]
                for key in ("learningRevision", "pilotSceneId", "guidedTitle", "scene", "sceneSide"):
                    self.assertIn(key, metadata, block["id"])
                self.assertEqual(metadata["learningRevision"], "course-guided-v1")
                self.assertEqual(metadata["pilotSceneId"], scene["id"])
                self.assertEqual(metadata["sceneSide"], "right")
            self.assertEqual(scene["interactiveCount"], sum(block["type"] in interactive for block in scene_blocks))
        for lesson in self.course["lessons"]:
            scenes = [scene for scene in self.manifest["sceneSummaries"] if scene["lessonId"] == lesson["id"]]
            unique_assets = {scene["background"] for scene in scenes}
            expected_unique = min(len(scenes), len(COMPILER.APPROVED_BACKGROUND_CATALOG))
            self.assertEqual(len(unique_assets), expected_unique, lesson["id"])
            assignment = next(item for item in self.manifest["backgroundAssignment"]["lessons"] if item["lessonId"] == lesson["id"])
            self.assertEqual(assignment["sceneCount"], len(scenes))
            self.assertEqual(len(assignment["scenes"]), len(scenes))
            if len(scenes) > len(COMPILER.APPROVED_BACKGROUND_CATALOG):
                self.assertTrue(assignment["reuseReason"])
            else:
                self.assertIsNone(assignment["reuseReason"])

    def test_starter_support_tables_are_collapsible(self) -> None:
        blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
        teach_scenes = [scene for scene in self.manifest["sceneSummaries"] if scene["phase"] == "starter-teach"]
        self.assertEqual([scene["activityId"] for scene in teach_scenes], ["S1", "S2", "S3", "S4", "S5"])
        for scene in teach_scenes:
            tables = [block for block_id in scene["runtimeBlockIds"] if (block := blocks_by_id[block_id])["type"] == "structured-content"]
            self.assertEqual(len(tables), 1, scene["id"])
            self.assertTrue(tables[0]["data"].get("collapsible"))
            self.assertTrue(tables[0]["data"].get("supportLabel"))

    def test_production_blocks_are_human_review_only_and_have_routes(self) -> None:
        production = [block for block in _blocks(self.course) if block["type"] in {"recording", "essay"}]
        self.assertGreaterEqual(len(production), 10)
        for block in production:
            self.assertIs(block.get("aiGrading"), False, block["id"])
            self.assertIs(block["data"].get("aiGrading"), False, block["id"])
            self.assertTrue(block["data"].get("doNotAutoGrade"), block["id"])
            self.assertTrue(block["data"].get("teacherReviewOnly"), block["id"])
            self.assertIn("reviewChecklist", block["data"], block["id"])
            if block["type"] == "recording":
                self.assertNotIn("learningModes", block["data"], block["id"])
                self.assertTrue(block["data"].get("conversationTurns"), block["id"])
            else:
                self.assertIn("learningModes", block["data"], block["id"])
                self.assertEqual(set(block["data"]["learningModes"]), {"individual", "teacher"}, block["id"])
                self.assertTrue(all(isinstance(value, str) for value in block["data"]["learningModes"].values()), block["id"])
        for block in [block for block in production if block["type"] == "essay"]:
            self.assertEqual(block["data"].get("unit1Role"), "profile", block["id"])
        u1_production = [block for block in self.course["lessons"][1]["blocks"] if block["type"] in {"recording", "essay"}]
        self.assertEqual(u1_production[0]["data"].get("guidedRole"), "conversation")
        self.assertEqual(u1_production[0]["data"]["conversationTurns"][0]["question"], "What is your name and where are you from?")
        self.assertEqual(u1_production[1]["data"].get("unit1Role"), "profile")
        self.assertIn("Quito", json.dumps(u1_production[1]['data']['transferCard'],ensure_ascii=False)) if self.audio_enabled else self.assertIn("Arequipa", u1_production[1]["data"]["learningModes"]["individual"])
        self.assertNotIn("Lima", u1_production[1]["data"]["learningModes"]["individual"])
        review_intro = next(
            block
            for block in self.course["lessons"][1]["blocks"]
            if block["id"] == "a1m1-u1-transfer-review-prompt"
        )
        if not self.audio_enabled:
            self.assertIn("<details><summary>Ver ejemplo</summary>", review_intro["content"])
        else:
            self.assertIn('tarjeta visible aquí', review_intro['content'])
        self.assertIn("<details><summary>Guía docente</summary>", review_intro["content"])
        self.assertNotIn("<strong>Instrucción:</strong>", review_intro["content"])
        self.assertNotIn("La tarjeta confirma que Ana vive en Lima", review_intro["content"])
        active_transfer_markers = ("Quito", "green folder hers", "marta.cruz@example.org", "room 206") if self.audio_enabled else ("Arequipa", "credencial 17", "maria.soto@example.org", "Friday at 4:00")
        stale_transfer_markers = ("Lima", "carpeta azul", "Saturday morning", "Thursday at 3:30")
        for lesson, active_marker, stale_marker in zip(
            self.course["lessons"][1:5], active_transfer_markers, stale_transfer_markers
        ):
            essay = next(block for block in lesson["blocks"] if block["type"] == "essay")
            current_task = json.dumps(essay['data']['transferCard'],ensure_ascii=False) if self.audio_enabled else essay["data"]["learningModes"]["individual"]
            self.assertIn(active_marker, current_task, lesson["id"])
            self.assertNotIn(stale_marker, essay["data"]["learningModes"]["individual"], lesson["id"])
        essays = [block for block in production if block["type"] == "essay"]
        for essay in essays:
            individual_guidance = essay["data"]["learningModes"]["individual"].lower()
            self.assertNotIn("graba", individual_guidance, essay["id"])
            self.assertNotIn("cambia el rol", individual_guidance, essay["id"])
        mission_intro = next(
            block
            for block in self.course["lessons"][-1]["blocks"]
            if block["id"] == "a1m1-mission-card-prompt"
        )
        self.assertIn("<details><summary>Ver ejemplo</summary>", mission_intro["content"])
        if not self.audio_enabled:
            self.assertIn("<details><summary>Guía docente</summary>", mission_intro["content"])
        else:
            self.assertIn('hoja común', mission_intro['content'])
        self.assertNotIn("<strong>Instrucción:</strong>", mission_intro["content"])
        mission_card = next(
            block
            for block in self.course["lessons"][-1]["blocks"]
            if block["id"] == "a1m1-mission-card-essay"
        )
        card_guidance = mission_card["data"]["learningModes"]["individual"]
        self.assertIn("Escribe", card_guidance)
        self.assertIn("tarjeta", card_guidance.lower())
        self.assertNotIn("graba", card_guidance.lower())
        self.assertNotIn("cambia el rol", card_guidance.lower())
        self.assertEqual(
            mission_card["data"]["reviewChecklist"],
            [
                "Incluye el nombre.",
                "Incluye contacto.",
                "Incluye día y hora.",
                "Incluye la sala.",
                "Añade una frase para pedir repetición.",
            ],
        )
        self.assertNotIn("Saluda y se presenta.", mission_card["data"]["reviewChecklist"])
        self.assertNotIn("Identifica dos personas u objetos.", mission_card["data"]["reviewChecklist"])
        mission_briefing = next(
            block
            for block in self.course["lessons"][-1]["blocks"]
            if block["id"] == "a1m1-mission-briefing-instructions"
        )
        self.assertIn("<strong>Escenario:</strong>", mission_briefing["content"])
        self.assertIn("<strong>Consigna:</strong>", mission_briefing["content"])
        self.assertIn("<details><summary>Roles y entrega</summary>", mission_briefing["content"])
        self.assertIn("<details><summary>Ayuda</summary>", mission_briefing["content"])
        for block in _blocks(self.course):
            for field in ("content", "prompt", "instruction"):
                value = block.get(field)
                if isinstance(value, str):
                    self.assertNotRegex(
                        value,
                        r"runtime|visor|aplicaci[oó]n|role-card-only|reveal-on-start|modo oculto",
                        f"{block['id']}.{field}",
                    )
        all_blocks = list(_blocks(self.course))
        for recording in [block for block in all_blocks if block["type"] == "recording"]:
            intro = next(
                block
                for block in all_blocks
                if block["type"] == "text"
                and block["data"].get("pilotSceneId") == recording["data"].get("pilotSceneId")
            )
            self.assertEqual(intro["content"].count("<strong>Consigna:</strong>"), 1, recording["id"])
            example_label = 'Ver ejemplo de estructura' if self.audio_enabled and recording['id'].startswith('a1m1-u') else 'Ver ejemplo'
            self.assertEqual(intro["content"].count(f"<details><summary>{example_label}</summary>"), 1, recording["id"])
            if self.audio_enabled and recording['id'] == 'a1m1-mission-speak-recording':
                self.assertTrue(recording['data']['learningModeGuidance']['teacher'])
                self.assertIn('hoja común', recording['data']['learningModeGuidance']['self'])
            else:
                self.assertEqual(intro["content"].count("<details><summary>Guía docente</summary>"), 1, recording["id"])
            self.assertNotIn("<strong>Modelo:</strong>", intro["content"], recording["id"])

    def test_no_audio_is_fabricated_and_role_cards_do_not_claim_hidden_runtime(self) -> None:
        manifest = self.manifest["audioManifest"]
        if self.audio_enabled:
            audio_blocks = [block for block in _blocks(self.course) if block["type"] == "audio"]
            original_audio = [block for block in audio_blocks if block["data"].get("audioKind") != "practice-reference"]
            self.assertEqual(len(original_audio), 11)
            self.assertEqual(len({block['url'] for block in original_audio}), 11)
            self.assertTrue(all(block['url'] in {original['url'] for original in original_audio} for block in audio_blocks))
            self.assertEqual(manifest["status"], "verified_audio_integrated")
            self.assertFalse(manifest["noAudioBlocksGenerated"])
            self.assertEqual(manifest["verifiedFileCount"], 11)
            self.assertEqual(manifest["plannedScripts"], [])
            self.assertFalse(self.manifest["acceptance"]["audioPending"])
        else:
            self.assertFalse([block for block in _blocks(self.course) if block["type"] == "audio"])
        if self.audio_enabled:
            self.assertEqual(manifest["status"], "verified_audio_integrated")
            self.assertTrue(all(item["status"] == "verified_audio_integrated" for item in manifest["starterReferencePlan"]))
        else:
            self.assertEqual(manifest["status"], "pending_authorization")
            self.assertTrue(manifest["noAudioBlocksGenerated"])
        self.assertTrue(manifest["preserveExistingAudio"])
        if self.audio_enabled:
            briefing = next(scene for scene in self.manifest["sceneSummaries"] if scene["id"] == "a1m1-mission-briefing")
            self.assertNotIn("roleCardRevealMode", briefing)
            self.assertNotIn("roleCardRuntimeStatus", briefing)
            mission_summary = next(lesson for lesson in self.manifest['lessonSummaries'] if lesson['id'] == 'a1-general-mission')
            self.assertIn('hoja común', mission_summary['routePolicy']['self'])
            self.assertIn('ensayo', mission_summary['routePolicy']['self'])
            blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
            notes = [blocks_by_id[block_id] for block_id in briefing["runtimeBlockIds"] if blocks_by_id[block_id]["type"] == "teacher_notes"]
            self.assertEqual(len(notes), 1)
            self.assertNotIn('roleCardReveal', notes[0])
            self.assertIn('hoja común', notes[0]['content'])
            return
        planned_paths = {item["plannedPath"] for item in manifest["plannedScripts"]}
        self.assertIn("/audio/a1-module1-pilot/u1-model.mp3", planned_paths)
        self.assertIn("/audio/a1-module1-pilot/starter-s1-greeting.mp3", planned_paths)
        self.assertIn("/audio/a1-module1-pilot/starter-s3-numbers-0-20.mp3", planned_paths)
        self.assertIn("/audio/a1-module1-pilot/starter-s3-contact-time.mp3", planned_paths)
        self.assertIn("/audio/a1-module1-pilot/starter-u4-help-phrases.mp3", planned_paths)
        self.assertEqual(len(planned_paths), 11)
        self.assertEqual(manifest["syntheticAudioLabel"], "Audio de práctica con voz sintética")
        self.assertEqual(len(manifest["listeningPlan"]), 4)
        self.assertEqual(len(manifest["starterReferencePlan"]), 7)
        self.assertTrue(all(item["referenceOnly"] for item in manifest["starterReferencePlan"]))
        self.assertTrue(all(item["detailsHiddenUntilCheck"] for item in manifest["listeningPlan"]))
        self.assertTrue(all(item["followUpQuestionCount"] == 6 for item in manifest["listeningPlan"]))
        briefing = next(scene for scene in self.manifest["sceneSummaries"] if scene["id"] == "a1m1-mission-briefing")
        self.assertEqual(briefing["roleCardRevealMode"], "role-card-only")
        self.assertEqual(briefing["roleCardRuntimeStatus"], "metadata-only-until-role-card-viewer-exists")
        blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
        notes = [blocks_by_id[block_id] for block_id in briefing["runtimeBlockIds"] if blocks_by_id[block_id]["type"] == "teacher_notes"]
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["roleCardReveal"]["runtimeSupport"], "planned-no-runtime-claim")

    @unittest.skipUnless(all(path is not None and path.exists() for path in (EARLY, BLUEPRINT, MAPPING)), "verified audio integration needs the private source files")
    def test_verified_audio_manifest_is_the_only_audio_insertion_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio_file = Path(directory) / "u1-model.mp3"
            audio_file.write_bytes(b"verified test fixture")
            spoken_transcript = "Ana meets Luis at the door. five five five."
            audio_manifest = Path(directory) / "audio.json"
            audio_manifest.write_text(
                json.dumps(
                    {
                        "audio": [
                            {
                                "lessonId": "a1-general-u1",
                                "sceneId": "a1m1-u1-listening",
                                "filePath": str(audio_file),
                                "url": "/audio/a1-module1-pilot/u1-model.mp3",
                                "label": "Audio de práctica con voz sintética",
                                "sourceRef": "module1.unit1.model.text",
                                "sha256": COMPILER._sha256(audio_file),
                                "sourceEnglishTranscript": spoken_transcript,
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            course, manifest = COMPILER.build_artifacts(EARLY, BLUEPRINT, MAPPING, audio_manifest)
            audio_blocks = [block for block in _blocks(course) if block["type"] == "audio"]
            self.assertEqual(len(audio_blocks), 1)
            self.assertEqual(audio_blocks[0]["url"], "/audio/a1-module1-pilot/u1-model.mp3")
            self.assertTrue(audio_blocks[0]["data"]["audioVerified"])
            self.assertEqual(audio_blocks[0]["data"]["spokenTranscript"], spoken_transcript)
            self.assertEqual(audio_blocks[0]["data"]["pilotRevision"], "a1-module1-pilot-v1")
            listening_scene = next(
                scene for scene in manifest["sceneSummaries"] if scene["id"] == "a1m1-u1-listening"
            )
            check_scene = next(
                scene for scene in manifest["sceneSummaries"] if scene["id"] == "a1m1-u1-listening-check"
            )
            self.assertEqual(listening_scene["phase"], "listening-audio")
            self.assertEqual(check_scene["phase"], "listening-check")
            self.assertEqual(check_scene["interactiveCount"], 1)
            self.assertLess(listening_scene["order"], next(
                scene["order"]
                for scene in manifest["sceneSummaries"]
                if scene["id"] == "a1m1-u1-comprehension"
            ))
            blocks_by_id = {block["id"]: block for block in _blocks(course)}
            transcript = blocks_by_id["a1m1-u1-listening-transcript"]
            self.assertEqual(transcript["format"], "html")
            self.assertIn("<details><summary>Ver transcripción</summary>", transcript["content"])
            self.assertEqual(
                transcript["content"].count("<details><summary>Ver transcripción</summary>"),
                1,
            )
            self.assertIn("five five five", transcript["content"])
            self.assertNotIn("originalEnglishModel", transcript["data"])
            self.assertNotIn("supportLabel", audio_blocks[0]["data"])
            listening_check = blocks_by_id["a1m1-u1-listening-check-items"]
            self.assertEqual(listening_check["data"]["contentRole"], "listening-check")
            self.assertEqual(len(listening_check["items"]), 6)
            self.assertEqual({item["sourceType"] for item in listening_check["items"]}, {"listening"})
            self.assertEqual(manifest["audioManifest"]["status"], "verified_audio_integrated")
            self.assertFalse(manifest["audioManifest"]["noAudioBlocksGenerated"])
            self.assertFalse(manifest["acceptance"]["audioPending"])
            self.assertEqual(manifest["audioManifest"]["verifiedFileCount"], 1)
            self.assertEqual(manifest["audioManifest"]["plannedScripts"], [])

    @unittest.skipUnless(all(path is not None and path.exists() for path in (EARLY, BLUEPRINT, MAPPING)), "verified audio integration needs the private source files")
    def test_verified_manifest_attaches_all_eleven_real_clips(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            entries = []
            for index, target in enumerate(COMPILER.STARTER_REFERENCE_AUDIO, start=1):
                audio_file = Path(directory) / target["filename"]
                audio_file.write_bytes(f"starter verified fixture {index}".encode("utf-8"))
                transcript = f"Starter reference {index}; spoken value five five five."
                entries.append(
                    {
                        "lessonId": target["lessonId"],
                        "sceneId": target["sceneId"],
                        "path": str(audio_file),
                        "url": f"/audio/a1-module1-pilot/{target['filename']}",
                        "sha256": COMPILER._sha256(audio_file),
                        "sourceEnglishTranscript": transcript,
                    }
                )
            for unit_number in range(1, 5):
                target = COMPILER.UNIT_REFERENCE_AUDIO[f"u{unit_number}-model.mp3"]
                filename = f"u{unit_number}-model.mp3"
                audio_file = Path(directory) / filename
                audio_file.write_bytes(f"unit verified fixture {unit_number}".encode("utf-8"))
                entries.append(
                    {
                        "lessonId": target["lessonId"],
                        "sceneId": target["sceneId"],
                        "path": str(audio_file),
                        "url": f"/audio/a1-module1-pilot/{filename}",
                        "sha256": COMPILER._sha256(audio_file),
                        "sourceEnglishTranscript": f"Unit {unit_number} spoken transcript with five five five.",
                    }
                )
            audio_manifest = Path(directory) / "starter-audio.json"
            audio_manifest.write_text(json.dumps({"files": entries}), encoding="utf-8")
            course, manifest = COMPILER.build_artifacts(EARLY, BLUEPRINT, MAPPING, audio_manifest)
            all_blocks = list(_blocks(course))
            for lesson in course["lessons"]:
                self.assertEqual(
                    [block["order"] for block in lesson["blocks"]],
                    list(range(len(lesson["blocks"]))),
                    lesson["id"],
                )
            self.assertTrue(all(re.fullmatch(r"[a-z0-9_-]+", block["id"]) for block in all_blocks))
            audio_blocks = [
                block
                for block in _blocks(course)
                if block["type"] == "audio" and block["data"].get("audioKind") == "starter-reference"
            ]
            self.assertEqual(len(audio_blocks), 7)
            self.assertEqual(
                {
                    block["data"]["pilotSceneId"]: sum(
                        item["data"].get("pilotSceneId") == block["data"]["pilotSceneId"]
                        and item["type"] == "audio"
                        for item in audio_blocks
                    )
                    for block in audio_blocks
                },
                {
                    "a1m1-start-s1-teach": 1,
                    "a1m1-start-s2-teach": 1,
                    "a1m1-start-s3-teach": 2,
                    "a1m1-start-s4-teach": 2,
                    "a1m1-start-s5-teach": 1,
                },
            )
            for block in audio_blocks:
                self.assertIn("prompt", block)
                self.assertIn("sintética", block["prompt"])
                self.assertTrue(block["data"]["audioLabel"].startswith("Referencia sintética · "))
                self.assertTrue(block["data"]["syntheticReference"])
                self.assertTrue(block["data"]["noListeningAssessment"])
                self.assertFalse(block["data"]["gradedListening"])
                self.assertEqual(block["data"]["spokenTranscript"], block["transcript"])
            self.assertEqual(
                {block["data"]["audioLabel"] for block in audio_blocks},
                {
                    "Referencia sintética · saludo y nombre",
                    "Referencia sintética · abecedario y deletreo",
                    "Referencia sintética · números 0–20",
                    "Referencia sintética · teléfono, hora y sala",
                    "Referencia sintética · frases de ayuda",
                    "Referencia sintética · saludo, origen, ciudad y hora",
                    "Referencia sintética · puente de presentación",
                },
            )
            all_audio_blocks = [block for block in _blocks(course) if block["type"] == "audio"]
            self.assertEqual(len([block for block in all_audio_blocks if block['data'].get('audioKind') != 'practice-reference']), 11)
            self.assertEqual(len([block for block in all_audio_blocks if block['data'].get('audioKind') == 'practice-reference']), 3)
            self.assertEqual({block['url'] for block in all_audio_blocks}, {entry['url'] for entry in entries})
            self.assertTrue(all("sintética" in block["prompt"] for block in all_audio_blocks))
            unit_audio_blocks = [
                block for block in all_audio_blocks if block["data"].get("audioKind") == "unit-model"
            ]
            self.assertEqual(len(unit_audio_blocks), 4)
            self.assertTrue(all("supportLabel" not in block["data"] for block in unit_audio_blocks))
            blocks_by_id = {block["id"]: block for block in all_blocks}
            for unit_number in range(1, 5):
                transcript = blocks_by_id[f"a1m1-u{unit_number}-listening-transcript"]
                self.assertEqual(
                    transcript["content"].count("<details><summary>Ver transcripción</summary>"),
                    1,
                )
            audio_manifest_data = manifest["audioManifest"]
            self.assertEqual(audio_manifest_data["verifiedFileCount"], 11)
            self.assertEqual(
                {item["url"] for item in audio_manifest_data["verifiedFiles"]},
                {entry["url"] for entry in entries},
            )
            self.assertEqual(audio_manifest_data["plannedScripts"], [])
            self.assertTrue(all(item["status"] == "verified_audio_integrated" for item in audio_manifest_data["listeningPlan"]))
            self.assertNotIn("pending_authorization", json.dumps(audio_manifest_data))
            self.assertNotIn("planned_pending_file_verification", json.dumps(audio_manifest_data))

    @unittest.skipUnless(all(path is not None and path.exists() for path in (EARLY, BLUEPRINT, MAPPING)), "verified audio integration needs the private source files")
    def test_verified_audio_rejects_wrong_hash(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio_file = Path(directory) / "starter-s1-greeting.mp3"
            audio_file.write_bytes(b"verified test fixture")
            audio_manifest = Path(directory) / "bad-audio.json"
            audio_manifest.write_text(
                json.dumps(
                    {
                        "files": [
                            {
                                "lessonId": "a1-general-start",
                                "sceneId": "a1m1-start-s1-teach",
                                "path": str(audio_file),
                                "url": "/audio/a1-module1-pilot/starter-s1-greeting.mp3",
                                "sha256": "0" * 64,
                                "sourceEnglishTranscript": "Hello.",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "sha256 mismatch"):
                COMPILER.build_artifacts(EARLY, BLUEPRINT, MAPPING, audio_manifest)

    def test_blueprint_m01_and_visual_references_are_recorded(self) -> None:
        mediation = [
            block
            for block in self.course["lessons"][-1]["blocks"]
            if block["id"] == "a1m1-mission-mediation-prompt"
        ]
        self.assertEqual(len(mediation), 1)
        case = mediation[0]["data"]["blueprintCase"]
        self.assertEqual(case["module"], "M01")
        self.assertIn("Tuesday at 18:00", case["source_en"])
        references = self.manifest["visualAcceptanceManifest"]["approvedReferences"]
        for reference in references[:3]:
            self.assertTrue((WORKTREE / reference).exists(), reference)
        mapping = self.manifest["visualAcceptanceManifest"]["lessonSceneMapping"]
        self.assertEqual(set(mapping), {lesson["id"] for lesson in self.course["lessons"]})

    @unittest.skipUnless(APPLY_SCRIPT.exists(), "seed validator is supplied by the isolated seed worktree")
    def test_checked_in_public_plan_passes_seed_validator(self) -> None:
        self.assertIsNotNone(self.generated)
        spec = importlib.util.spec_from_file_location("a1_module1_pilot_apply_validator", APPLY_SCRIPT)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        generated_has_audio = any(
            block["type"] == "audio"
            for lesson in self.generated["lessons"]
            for block in lesson["blocks"]
        )
        audio_manifest = None
        if generated_has_audio:
            self.assertIsNotNone(self.audio_manifest_path)
            raw_audio_manifest = json.loads((WORKTREE / "docs/curriculum/a1-module1-audio-manifest.json").read_text(encoding="utf-8"))
            audio_manifest = {
                "files": [
                    {
                        key: entry[key]
                        for key in ("path", "sha256", "sourceEnglishTranscript")
                    }
                    for entry in raw_audio_manifest["files"]
                ]
            }
        validator.validate_plan(self.generated, audio_manifest=audio_manifest)

    def test_checked_in_json_is_current_compiler_output(self) -> None:
        self.assertIsNotNone(self.generated)
        self.assertIsNotNone(self.generated_manifest)
        self.assertEqual(self.generated["course"]["id"], self.course["course"]["id"])
        generated_acceptance = self.generated_manifest["acceptance"]
        current_acceptance = self.manifest["acceptance"]
        if self.audio_manifest_path is not None:
            # A caller that supplies a real manifest is asking for an exact
            # checked-in artifact comparison.  The relaxed pending-versus-
            # verified branch below is only for source-only local builds.
            self.assertEqual(generated_acceptance, current_acceptance)
            self.assertEqual(
                self.generated_manifest["audioManifest"]["status"],
                self.manifest["audioManifest"]["status"],
            )
        elif generated_acceptance.get("audioPending") != current_acceptance.get("audioPending"):
            self.assertEqual(
                {key: value for key, value in generated_acceptance.items() if key != "audioPending"},
                {key: value for key, value in current_acceptance.items() if key != "audioPending"},
            )
            self.assertNotEqual(
                self.generated_manifest["audioManifest"]["status"],
                self.manifest["audioManifest"]["status"],
            )
        else:
            self.assertEqual(generated_acceptance, current_acceptance)
        self.assertEqual(self.generated_manifest["sourceAudit"]["counts"], self.manifest["sourceAudit"]["counts"])
        self.assertNotIn("blocks", self.generated_manifest)
        self.assertNotIn("runtimeBlocks", self.generated_manifest)
        self.assertNotIn("originalEnglishModel", json.dumps(self.generated_manifest, ensure_ascii=False))
        self.assertNotIn("audioUrl", json.dumps(self.generated_manifest, ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
