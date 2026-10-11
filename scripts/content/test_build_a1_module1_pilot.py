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
        source_paths_available = all(path is not None and path.exists() for path in (EARLY, BLUEPRINT, MAPPING))
        if source_paths_available:
            cls.course, cls.manifest = COMPILER.build_artifacts(EARLY, BLUEPRINT, MAPPING)
        else:
            cls.course, cls.manifest = cls.generated, cls.generated_manifest
        if cls.course is None or cls.manifest is None:
            raise RuntimeError("Provide source paths or generate both the public JSON and its manifest first")

    def test_public_contract_and_fixed_ids(self) -> None:
        self.assertEqual(set(self.course), {"course", "module", "lessons"})
        self.assertEqual(set(self.course["course"]), {"id", "title", "description", "language", "level"})
        self.assertEqual(set(self.course["module"]), {"id", "title", "description", "level", "objectives"})
        self.assertIsInstance(self.course["module"]["objectives"], str)
        self.assertEqual(self.course["course"]["id"], "a1-general-module1-pilot")
        self.assertIn("description", self.course["course"])
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
            order_count += 1
            self.assertEqual(block["type"], "ordering")
            expected = [item["text"] for item in sorted(block["items"], key=lambda item: item["correctPosition"])]
            strip_punctuation = lambda value: re.sub(r"[.,!?]", "", value)
            self.assertEqual(strip_punctuation(" ".join(expected)), strip_punctuation(block["data"]["correctSentence"]))
            self.assertTrue(block["data"]["acceptedSequences"])
            self.assertEqual(len(expected), len({item["correctPosition"] for item in block["items"]}))
        self.assertEqual(order_count, 6)

    def test_every_scene_has_existing_asset_and_at_most_one_interactive(self) -> None:
        interactive = {"multiple_choice", "short_answer", "ordering", "match", "essay", "recording"}
        blocks_by_id = {block["id"]: block for block in _blocks(self.course)}
        for scene in self.manifest["sceneSummaries"]:
            asset = scene["background"]
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
            self.assertIn("learningModes", block["data"], block["id"])
        u1_production = [block for block in self.course["lessons"][1]["blocks"] if block["type"] in {"recording", "essay"}]
        self.assertEqual(u1_production[0]["data"].get("guidedRole"), "conversation")
        self.assertEqual(u1_production[0]["data"]["conversationTurns"][0]["question"], "What is your name and where are you from?")
        self.assertEqual(u1_production[1]["data"].get("unit1Role"), "profile")

    def test_no_audio_is_fabricated_and_role_cards_do_not_claim_hidden_runtime(self) -> None:
        self.assertFalse([block for block in _blocks(self.course) if block["type"] == "audio"])
        manifest = self.manifest["audioManifest"]
        self.assertEqual(manifest["status"], "pending_authorization")
        self.assertTrue(manifest["noAudioBlocksGenerated"])
        self.assertTrue(manifest["preserveExistingAudio"])
        planned_paths = {item["plannedPath"] for item in manifest["plannedScripts"]}
        self.assertIn("/audio/a1-module1-pilot/u1-model.mp3", planned_paths)
        self.assertIn("/audio/a1-module1-pilot/starter-s1-reference.mp3", planned_paths)
        self.assertEqual(manifest["syntheticAudioLabel"], "Audio de práctica con voz sintética")
        self.assertEqual(len(manifest["listeningPlan"]), 4)
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
            audio_manifest = Path(directory) / "audio.json"
            audio_manifest.write_text(
                json.dumps(
                    {
                        "audio": [
                            {
                                "lessonId": "a1-general-u1",
                                "sceneId": "a1m1-u1-teach",
                                "filePath": str(audio_file),
                                "url": "/audio/a1-module1-pilot/u1-model.mp3",
                                "label": "Audio de práctica con voz sintética",
                                "sourceRef": "module1.unit1.model.text",
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
            self.assertEqual(manifest["audioManifest"]["status"], "verified_audio_integrated")
            self.assertFalse(manifest["audioManifest"]["noAudioBlocksGenerated"])

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

    def test_checked_in_json_is_current_compiler_output(self) -> None:
        self.assertIsNotNone(self.generated)
        self.assertIsNotNone(self.generated_manifest)
        self.assertEqual(self.generated["course"]["id"], self.course["course"]["id"])
        self.assertEqual(self.generated_manifest["acceptance"], self.manifest["acceptance"])
        self.assertEqual(self.generated_manifest["sourceAudit"]["counts"], self.manifest["sourceAudit"]["counts"])
        self.assertNotIn("blocks", self.generated_manifest)
        self.assertNotIn("runtimeBlocks", self.generated_manifest)
        self.assertNotIn("originalEnglishModel", json.dumps(self.generated_manifest, ensure_ascii=False))
        self.assertNotIn("audioUrl", json.dumps(self.generated_manifest, ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
