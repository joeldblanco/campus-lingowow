"""Tests for the authoritative Drive source inventory builder."""

from __future__ import annotations

import importlib.util
import unittest


SCRIPT_PATH = __import__("pathlib").Path(__file__).parents[2] / "scripts" / "content" / "drive-source-manifest.py"
SPEC = importlib.util.spec_from_file_location("drive_source_manifest", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def _entry(title: str, mime: str, path: list[str], file_id: str = "id") -> dict[str, object]:
    return {
        "level": "A",
        "path": path,
        "id": file_id,
        "title": title,
        "mimeType": mime,
        "fileOrFolder": "file",
        "url": f"https://drive.google.com/file/d/{file_id}/view",
        "size": "12",
    }


class DriveSourceManifestTests(unittest.TestCase):
    def test_groups_explicit_and_legacy_presentation_candidates(self) -> None:
        tree = {
            "authority": {"folderUrl": "https://drive.google.com/drive/folders/root"},
            "entries": [
                _entry("Unit 9 - How do I get there?.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", ["A levels", "Module 3"], "current"),
                _entry("How do I get there.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", ["A levels", "Module 3"], "legacy"),
                _entry("Hume · SlidesCarnival.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", ["A levels", "Module 1"], "template"),
                _entry("Audio 1 - Unit 9.mp3", "audio/mpeg", ["A levels", "Audios"], "audio"),
            ],
        }
        public = {
            "sources": [
                {
                    "module": {"order": 3, "title": "Module 3", "id": "module"},
                    "lesson": {"order": 2, "title": "How do I get there", "id": "lesson", "videoUrl": None},
                    "contentId": "content",
                    "sourceUrl": "https://example.test/unit2",
                    "status": "ok",
                    "deck": {"slideCount": 18, "mediaSummary": {}, "warnings": []},
                }
            ]
        }

        output = MODULE.build_manifest(tree, public)

        candidates = output["units"]["9"]["presentationCandidates"]
        self.assertEqual([candidate["role"] for candidate in candidates], ["legacy-alternate", "primary-candidate"])
        self.assertEqual(output["units"]["9"]["audioCandidates"][0]["id"], "audio")
        self.assertEqual(output["units"]["9"]["published"]["sourceUrl"], "https://example.test/unit2")
        self.assertEqual([item["id"] for item in output["unassigned"]["presentations"]], ["template"])

    def test_records_empty_module_as_missing_native_source(self) -> None:
        tree = {"authority": {}, "entries": []}
        output = MODULE.build_manifest(tree, {"sources": []})

        self.assertEqual(output["counts"]["unitsWithoutNativePresentation"], 56)
        self.assertIn(
            "no-native-presentation-candidate-in-authoritative-folder",
            output["units"]["53"]["notes"],
        )


if __name__ == "__main__":
    unittest.main()
