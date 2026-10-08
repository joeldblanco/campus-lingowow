"""Safety and determinism tests for the reviewed media staging helper."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

try:
    from PIL import Image as PILImage
except ImportError:  # pragma: no cover - the conversion test is skipped without Pillow
    PILImage = None


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "content" / "prepare-course-media.py"
SPEC = importlib.util.spec_from_file_location("prepare_course_media", SCRIPT)
assert SPEC and SPEC.loader
media = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(media)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audio_record(path: Path, *, source_id: str = "audio-1", **extra: object) -> dict:
    record = {
        "id": source_id,
        "kind": "audio",
        "role": "lesson-audio-candidate",
        "unit": 2,
        "sourcePath": path.name,
        "sourceSha256": digest(path),
        "selected": True,
        "reviewed": True,
        "sourceSlideNumber": 4,
        "transcript": "Original authored transcript.",
        "originalMediaUrl": "https://drive.example/original.mp3",
    }
    record.update(extra)
    return record


class PrepareCourseMediaTests(unittest.TestCase):
    def test_dry_run_has_stable_url_and_preserves_existing_audio_urls(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            public_root = root / "public-root"
            audio_root.mkdir()
            image_root.mkdir()
            source = audio_root / "lesson-02.mp3"
            source.write_bytes(b"reviewed audio bytes")
            manifest = {
                "existingAudioUrls": ["/legacy/unit-1.mp3"],
                "audio": [audio_record(source, sourcePath=source.name)],
            }
            plan = media.prepare_media_plan(
                manifest,
                audio_root=audio_root,
                image_root=image_root,
                course_slug="course",
                public_root=public_root,
            )

            self.assertTrue(plan["dryRun"])
            self.assertEqual(plan["existingAudioUrls"], ["/legacy/unit-1.mp3"])
            item = plan["audio"][0]
            self.assertEqual(item["status"], "planned")
            self.assertEqual(item["publicPath"], "public/audio/lessons/course/unit-02-audio-01.mp3")
            self.assertEqual(item["publicUrl"], "/audio/lessons/course/unit-02-audio-01.mp3")
            self.assertEqual(item["publicHref"], item["publicUrl"])
            self.assertFalse((public_root / item["publicPath"]).exists())

    def test_transcript_manifest_is_joined_by_original_id(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            audio_root.mkdir()
            image_root.mkdir()
            source = audio_root / "lesson-02.mp3"
            source.write_bytes(b"transcript join")
            record = audio_record(source, source_id="audio-transcript", sourcePath=source.name)
            record.pop("transcript")
            plan = media.prepare_media_plan(
                {"audio": [record]},
                audio_root=audio_root,
                image_root=image_root,
                transcript_manifest={"entries": [{"id": "audio-transcript", "transcript": "Joined transcript."}]},
            )

            self.assertEqual(plan["blockers"], [])
            self.assertEqual(plan["audio"][0]["transcript"], "Joined transcript.")

    def test_sha_mismatch_and_path_escape_are_blocked_without_copy(self) -> None:
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as outside_directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            public_root = root / "public-root"
            audio_root.mkdir()
            image_root.mkdir()
            source = audio_root / "lesson-02.mp3"
            source.write_bytes(b"actual bytes")
            outside = Path(outside_directory) / "outside.mp3"
            outside.write_bytes(b"outside bytes")
            mismatch = audio_record(source, source_id="mismatch", sourcePath=source.name, sourceSha256="0" * 64)
            escape = audio_record(outside, source_id="escape", sourcePath=str(outside), sourceSha256=digest(outside))
            plan = media.prepare_media_plan(
                {"audio": [mismatch, escape]},
                audio_root=audio_root,
                image_root=image_root,
                public_root=public_root,
                stage=True,
            )

            reasons = {item["reason"] for item in plan["blockers"]}
            self.assertIn("source-sha256-mismatch", reasons)
            self.assertIn("source-path-escape", reasons)
            self.assertFalse(public_root.exists())

    def test_repeated_identical_stage_is_idempotent_and_does_not_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            public_root = root / "public-root"
            audio_root.mkdir()
            image_root.mkdir()
            source = audio_root / "lesson-02.mp3"
            source.write_bytes(b"same bytes every run")
            manifest = {"audio": [audio_record(source, sourcePath=source.name)]}
            first = media.prepare_media_plan(
                manifest,
                audio_root=audio_root,
                image_root=image_root,
                public_root=public_root,
                stage=True,
            )
            second = media.prepare_media_plan(
                manifest,
                audio_root=audio_root,
                image_root=image_root,
                public_root=public_root,
                stage=True,
            )

            self.assertEqual(first["audio"][0]["status"], "staged")
            self.assertEqual(second["audio"][0]["status"], "already-staged")
            self.assertEqual(first["audio"][0]["publicUrl"], second["audio"][0]["publicUrl"])
            staged = public_root / first["audio"][0]["publicPath"]
            self.assertEqual(staged.read_bytes(), source.read_bytes())

            staged.write_bytes(b"do not overwrite this reviewed destination")
            mismatched = media.prepare_media_plan(
                manifest,
                audio_root=audio_root,
                image_root=image_root,
                public_root=public_root,
                stage=True,
            )
            self.assertEqual(mismatched["audio"][0]["status"], "blocked")
            self.assertEqual(mismatched["audio"][0]["reason"], "destination-bytes-mismatch")
            self.assertEqual(staged.read_bytes(), b"do not overwrite this reviewed destination")

    def test_duplicate_bytes_share_one_public_url_and_quiz_ssm_test_are_skipped(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            audio_root.mkdir()
            image_root.mkdir()
            source = audio_root / "lesson-02.mp3"
            source.write_bytes(b"one source file")
            duplicate = audio_root / "lesson-02-alt.mp3"
            duplicate.write_bytes(source.read_bytes())
            records = [
                audio_record(source, source_id="selected-audio", sourcePath=source.name),
                audio_record(duplicate, source_id="duplicate-audio", sourcePath=duplicate.name),
                audio_record(source, source_id="quiz-audio", role="Quiz Unit 2", sourcePath=source.name),
            ]
            plan = media.prepare_media_plan(
                {"audio": records},
                audio_root=audio_root,
                image_root=image_root,
            )

            by_id = {item["sourceId"]: item for item in plan["audio"]}
            self.assertEqual(
                {by_id["selected-audio"]["status"], by_id["duplicate-audio"]["status"]},
                {"planned", "duplicate"},
            )
            self.assertEqual(by_id["duplicate-audio"]["publicUrl"], by_id["selected-audio"]["publicUrl"])
            self.assertEqual(by_id["quiz-audio"]["status"], "skipped")
            self.assertEqual(plan["blockers"], [])

    @unittest.skipUnless(PILImage is not None, "Pillow is required for raster conversion coverage")
    def test_native_raster_image_gets_traceable_plan_and_webp_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            public_root = root / "public-root"
            audio_root.mkdir()
            image_root.mkdir()
            source = image_root / "figure.png"
            assert PILImage is not None
            source_image = PILImage.new("RGBA", (2000, 1000), (255, 32, 16, 128))
            source_image.save(source, format="PNG")
            source_image.close()
            image = {
                "id": "figure-1",
                "kind": "instructional-image",
                "role": "instructional-image",
                "unit": 2,
                "slideNumber": 4,
                "sourcePath": source.name,
                "sourceSha256": digest(source),
                "nativeTrace": {"recordId": "native-2", "slideNumber": 4},
                "selected": True,
                "reviewed": True,
            }
            plan = media.prepare_media_plan(
                {"images": [image]},
                audio_root=audio_root,
                image_root=image_root,
            )

            self.assertEqual(plan["blockers"], [])
            item = plan["images"][0]
            self.assertEqual(item["status"], "planned")
            self.assertEqual(item["publicPath"], f"public/images/lessons/course/source-{digest(source)[:16]}.webp")
            self.assertEqual(item["publicUrl"], f"/images/lessons/course/source-{digest(source)[:16]}.webp")
            self.assertTrue(item["optimization"]["needed"])
            self.assertTrue(item["optimization"]["implemented"])
            self.assertEqual(item["optimization"]["originalDimensions"], [2000, 1000])
            self.assertEqual(item["optimization"]["outputDimensions"], [1600, 800])
            self.assertTrue(item["optimization"]["preservedAlpha"])
            self.assertEqual(item["optimization"]["originalSha256"], digest(source))
            self.assertEqual(item["optimization"]["outputSha256"], item["outputSha256"])
            self.assertFalse(public_root.exists())

            staged_plan = media.prepare_media_plan(
                {"images": [image]},
                audio_root=audio_root,
                image_root=image_root,
                public_root=public_root,
                stage=True,
            )
            staged_item = staged_plan["images"][0]
            self.assertEqual(staged_item["status"], "staged")
            staged = public_root / staged_item["publicPath"]
            self.assertTrue(staged.exists())
            self.assertEqual(digest(staged), staged_item["outputSha256"])
            with PILImage.open(staged) as output_image:
                self.assertEqual(output_image.size, (1600, 800))
                self.assertIn("A", output_image.getbands())

    def test_unknown_vector_image_is_rejected_without_rasterization(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            audio_root.mkdir()
            image_root.mkdir()
            source = image_root / "figure.wmf"
            source.write_bytes(b"opaque vector placeholder")
            image = {
                "id": "vector-1",
                "kind": "instructional-image",
                "role": "instructional-image",
                "unit": 2,
                "slideNumber": 4,
                "sourcePath": source.name,
                "sourceSha256": digest(source),
                "nativeTrace": {"recordId": "native-2", "slideNumber": 4},
                "selected": True,
                "reviewed": True,
            }

            plan = media.prepare_media_plan(
                {"images": [image]},
                audio_root=audio_root,
                image_root=image_root,
            )

            self.assertEqual(plan["images"][0]["status"], "blocked")
            self.assertEqual(plan["images"][0]["reason"], "image-source-unsupported-vector")
            self.assertEqual(plan["blockers"], [{"kind": "image", "sourceId": "vector-1", "reason": "image-source-unsupported-vector"}])

    @unittest.skipUnless(PILImage is not None, "Pillow is required for native image staging coverage")
    def test_native_audit_skips_unclassified_image_refs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "audio"
            image_root = root / "images"
            audio_root.mkdir()
            image_root.mkdir()
            source = image_root / "figure.png"
            assert PILImage is not None
            source_image = PILImage.new("RGB", (80, 40), (32, 64, 96))
            source_image.save(source, format="PNG")
            source_image.close()
            native_audit = {
                "records": [
                    {
                        "id": "native-2",
                        "unit": 2,
                        "reviewed": True,
                        "selected": True,
                        "native": {
                            "media": [{"path": "asset-ref", "sourcePath": source.name, "sourceSha256": digest(source)}],
                            "slides": [
                                {
                                    "number": 4,
                                    "imageRefs": [
                                        {"path": "asset-ref", "role": "template-icon"},
                                        {"path": "asset-ref", "role": "instructional-image"},
                                    ],
                                }
                            ],
                        },
                    }
                ]
            }

            plan = media.prepare_media_plan(
                {},
                audio_root=audio_root,
                image_root=image_root,
                native_audit=native_audit,
            )

            self.assertEqual(len(plan["images"]), 1)
            self.assertEqual(plan["images"][0]["nativeTrace"]["recordId"], "native-2")
            self.assertEqual(plan["images"][0]["status"], "planned")


if __name__ == "__main__":
    unittest.main()
