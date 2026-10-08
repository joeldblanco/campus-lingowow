"""Tests for the library-free native PPTX audit reader."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[2] / "scripts" / "content" / "native-pptx-audit.py"
SPEC = importlib.util.spec_from_file_location("native_pptx_audit", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


SLIDE_XML = """<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>I come from</a:t></a:r></a:p><a:p><a:r><a:t>Practice</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>"""


class NativePptxAuditTests(unittest.TestCase):
    def test_reads_ordered_slide_text_and_media_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "unit.pptx"
            with zipfile.ZipFile(path, "w") as package:
                package.writestr("ppt/slides/slide1.xml", SLIDE_XML)
                package.writestr("ppt/media/media1.wma", b"audio-bytes")

            result = MODULE.read_pptx(path)

        self.assertEqual(result["slideCount"], 1)
        self.assertEqual(result["slides"][0]["texts"], ["I come from", "Practice"])
        self.assertEqual(result["mediaSummary"]["audioCount"], 1)
        self.assertEqual(result["mediaSummary"]["audioPaths"], ["ppt/media/media1.wma"])
        self.assertEqual(len(result["media"][0]["sha256"]), 64)

    def test_compares_public_visible_text_without_requiring_same_layout_order(self) -> None:
        native = {"slideCount": 1, "slides": [{"texts": ["I come from", "Practice"]}]}
        public = {
            "sourceUrl": "https://example.test/published",
            "deck": {
                "slideCount": 1,
                "slides": [{"visibleTexts": ["Practice", "I come from"]}],
            },
        }

        result = MODULE.compare_text(native, public)

        self.assertEqual(result["status"], "text-set-aligned")
        self.assertEqual(result["publicSlideCount"], 1)
        self.assertGreaterEqual(result["publicTokenCoverage"], 0.99)


if __name__ == "__main__":
    unittest.main()
