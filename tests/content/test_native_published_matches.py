import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "content" / "review-native-published-matches.py"
SPEC = importlib.util.spec_from_file_location("review_native_published_matches", SCRIPT)
assert SPEC and SPEC.loader
reviewer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reviewer)


def _published_slide(text):
    return {"visibleTexts": [text]}


def _native_slide(text):
    return {"joinedText": text}


def _published_manifest(*slides, unit=33):
    return {
        "sources": [
            {
                "module": {"id": "module-9", "order": 9, "title": "Module 9"},
                "lesson": {"id": f"lesson-{unit}", "order": 1, "title": f"Unit {unit}", "videoUrl": None},
                "contentId": f"content-{unit}",
                "sourceUrl": f"https://example.test/unit-{unit}",
                "deck": {
                    "deckTitle": f"New Sample - Unit {unit}.pptx",
                    "slideCount": len(slides),
                    "slides": [_published_slide(text) for text in slides],
                },
            }
        ]
    }


def _native_record(unit, title, *slides, role="primary-candidate"):
    return {
        "unit": unit,
        "candidate": {"id": f"drive-{unit}-{title}", "role": role, "title": title, "localPath": f"native-{unit}.pptx"},
        "native": {"slideCount": len(slides), "slides": [_native_slide(text) for text in slides]},
    }


class NativePublishedMatchTests(unittest.TestCase):
    def test_searches_other_unit_candidates_before_blocking(self):
        published = _published_manifest("33 Sample", "Topic customs around world", "Practice answer", unit=33)
        exact_other_unit = _native_record(52, "Sample - Unit 52.pptx", "33 Sample", "Topic customs around world", "Practice answer")
        same_unit_partial = _native_record(33, "Sample - Unit 33.pptx", "33 Sample", "Topic customs around world", "Different")
        result = reviewer.build_review({"records": [same_unit_partial, exact_other_unit]}, published)

        target = result["targets"]["33"]
        self.assertEqual(target["selectedStrongMatch"]["candidateUnit"], 52)
        self.assertEqual(target["bestCandidate"]["candidateId"], exact_other_unit["candidate"]["id"])

    def test_published_revision_blocks_filename_only_match(self):
        published = _published_manifest("33 Sample", "Published article Scotland Netherlands", "Practice answer", unit=33)
        native = _native_record(33, "Sample - Unit 33.pptx", "33 Sample", "Older article Taiwan", "Practice answer")
        result = reviewer.build_review({"records": [native]}, published)

        target = result["targets"]["33"]
        self.assertIsNone(target["selectedStrongMatch"])
        self.assertEqual(target["bestCandidate"]["candidateUnit"], 33)
        self.assertIn("No native candidate meets", target["blocker"])

    def test_audio_index_is_filename_evidence_only(self):
        published = _published_manifest("33 Sample", "Topic", "Practice", unit=33)
        native = _native_record(33, "Sample - Unit 33.pptx", "33 Sample", "Topic", "Practice")
        drive = {
            "units": {
                "33": {
                    "presentationCandidates": [{"id": "drive-presentation", "title": "Sample - Unit 33.pptx", "role": "primary-candidate"}],
                    "audioCandidates": [
                        {"id": "a1", "title": "Module 9 - Unit 33 - Audio 1.mp3", "role": "lesson-audio-candidate"},
                        {"id": "a2", "title": "Module 9 - Unit 33 - Audio 2.mp3", "role": "lesson-audio-candidate"},
                        {"id": "ssm", "title": "Module 9 - Self S. - Unit 33.mp3", "role": "self-study"},
                    ],
                }
            }
        }
        result = reviewer.build_review({"records": [native]}, published, drive)

        audio = result["targets"]["33"]["driveContext"]["audioCandidates"]
        self.assertEqual([item["filenameIndex"] for item in audio], ["audio-1", "audio-2", "self-study"])
        self.assertIn("no slide-to-file mapping", result["targets"]["33"]["driveContext"]["audioIndexEvidence"])


if __name__ == "__main__":
    unittest.main()
