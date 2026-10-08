import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("transcribe-course-audio.py")
SPEC = importlib.util.spec_from_file_location("transcribe_course_audio", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def row(unit, title, *, role="lesson-audio-candidate", payload=None):
    if payload is None:
        payload = title.encode("utf-8")
    source_filename = f"source-{unit}-{title.replace(' ', '_')}.mp3"
    return {
        "unit": unit,
        "title": title,
        "role": role,
        "path": f"docs\\audit\\source-originals\\audio\\{source_filename}",
        "exists": True,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


class CourseAudioSelectionTests(unittest.TestCase):
    def test_selects_explicit_teaching_audio_and_keeps_unit3_candidate_unsubstituted(self):
        files = [
            row(1, "Unit 1 - Audio 1.mp3"),
            row(2, "Quiz Unit 2 - Audio 1.mp3"),
            row(2, "Unit 2 - The greatest - Audio 1.mp3"),
            row(2, "Unit 2 - The greatest - Audio 2.mp3"),
            row(3, "Unit 3 - Everyday I... - Audio 2.mp3"),
            row(3, "Unit 3 - Everyday I....mp3", role="self-study"),
            row(4, "Unit 4 - Audio 1 (1).mp3"),
            row(5, "Unit 5 - Audio 1 - copia.mp3"),
        ]

        result = MODULE.select_teaching_audios(files)

        self.assertEqual(
            [(item["row"]["unit"], item["audioIndex"]) for item in result["selected"]],
            [(2, 1), (2, 2), (3, 2)],
        )
        self.assertEqual(len(result["candidates"]), 1)
        self.assertEqual(result["candidates"][0]["unit"], 3)
        self.assertFalse(result["candidates"][0]["substitute"])
        self.assertTrue(any(item["reason"] == "copy-duplicate-name" for item in result["excluded"]))
        self.assertTrue(any(item["reason"] == "outside-unit-range" for item in result["excluded"]))

    def test_deduplicates_by_original_sha_and_prefers_the_noncopy_source(self):
        payload = b"same original"
        files = [
            row(47, "Audio 1 - Unit 47 - copia.mp3", payload=payload),
            row(47, "Audio 1 - Unit 47.mp3", payload=payload),
        ]

        result = MODULE.select_teaching_audios(files)

        self.assertEqual(len(result["selected"]), 1)
        self.assertEqual(result["selected"][0]["row"]["title"], "Audio 1 - Unit 47.mp3")
        self.assertEqual(len(result["duplicates"]), 1)
        self.assertEqual(result["duplicates"][0]["reason"], "same-original-source-sha256")

    def test_test_token_does_not_drop_unrelated_words(self):
        files = [row(12, "Unit 12 - The greatest - Audio 1.mp3")]

        result = MODULE.select_teaching_audios(files)

        self.assertEqual(len(result["selected"]), 1)

    def test_verify_source_bytes_checks_manifest_digest_without_writing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            payload = b"source bytes"
            path = root / "clip.mp3"
            path.write_bytes(payload)
            manifest_row = {
                "unit": 2,
                "title": "Unit 2 - Audio 1.mp3",
                "path": "clip.mp3",
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }

            self.assertEqual(MODULE.verify_source_bytes(path, manifest_row), manifest_row["sha256"])
            self.assertEqual(path.read_bytes(), payload)


if __name__ == "__main__":
    unittest.main()
