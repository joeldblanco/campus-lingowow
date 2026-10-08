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

ENRICHED_SLIDE_XML = """<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id=\"1\" name=\"Text\"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"10\" y=\"20\"/><a:ext cx=\"30\" cy=\"40\"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Brazili</a:t></a:r><a:r><a:t>an</a:t></a:r></a:p><a:p><a:r><a:t>Second</a:t></a:r></a:p></p:txBody></p:sp><p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id=\"2\" name=\"Table\"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x=\"50\" y=\"60\"/><a:ext cx=\"70\" cy=\"80\"/></p:xfrm><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/table\"><a:tbl><a:tblPr/><a:tblGrid><a:gridCol w=\"100\"/></a:tblGrid><a:tr h=\"30\"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Header</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr><a:tr h=\"30\"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Cell</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame><p:pic><p:nvPicPr><p:cNvPr id=\"3\" name=\"Photo\"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed=\"rId5\"/></p:blipFill><p:spPr><a:xfrm><a:off x=\"90\" y=\"100\"/><a:ext cx=\"110\" cy=\"120\"/></a:xfrm></p:spPr></p:pic></p:spTree></p:cSld></p:sld>"""

SLIDE_RELS = """<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId5\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/photo.jpg\"/></Relationships>"""


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

    def test_joins_runs_preserves_tables_bboxes_and_image_references(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "enriched.pptx"
            with zipfile.ZipFile(path, "w") as package:
                package.writestr("ppt/slides/slide1.xml", ENRICHED_SLIDE_XML)
                package.writestr("ppt/slides/_rels/slide1.xml.rels", SLIDE_RELS)
                package.writestr("ppt/media/photo.jpg", b"image-bytes")

            result = MODULE.read_pptx(path)

        slide = result["slides"][0]
        self.assertEqual(slide["texts"], ["Brazilian", "Second", "Header", "Cell"])
        self.assertEqual(slide["shapes"][0]["bbox"], {"x": 10, "y": 20, "cx": 30, "cy": 40, "right": 40, "bottom": 60})
        self.assertEqual(slide["tables"][0]["rows"][0]["cells"][0]["text"], "Header")
        self.assertEqual(slide["tables"][0]["rows"][1]["cells"][0]["text"], "Cell")
        self.assertEqual(slide["imageRefs"][0]["mediaPath"], "ppt/media/photo.jpg")
        self.assertEqual(slide["imageRefs"][0]["bbox"]["x"], 90)

    def test_extracts_image_bytes_and_keeps_repeat_classification_explicit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "image.pptx"
            with zipfile.ZipFile(path, "w") as package:
                package.writestr("ppt/slides/slide1.xml", ENRICHED_SLIDE_XML)
                package.writestr("ppt/slides/_rels/slide1.xml.rels", SLIDE_RELS)
                package.writestr("ppt/media/photo.jpg", b"image-bytes")
            native = MODULE.read_pptx(path)
            records = MODULE.extract_image_members(path, native, root / "images", "A", 2, "candidate")
            self.assertEqual(len(records), 1)
            self.assertTrue(Path(records[0]["localPath"]).exists())
            self.assertEqual(records[0]["classification"], "instructional-candidate")
            self.assertEqual(records[0]["referenceCount"], 1)

    def test_native_source_writer_merges_published_numbers_only_when_aligned(self) -> None:
        audit = {
            "records": [
                {
                    "unit": 2,
                    "module": {"order": 1},
                    "candidate": {"role": "primary-candidate", "localPath": "unit.pptx"},
                    "status": "ok",
                    "native": {
                        "slides": [{"number": 1, "joinedText": "same"}],
                        "media": [],
                        "mediaSummary": {},
                        "imageExtraction": [{"localPath": "images/photo.jpg", "classification": "instructional-candidate"}],
                    },
                    "publishedComparison": {"status": "text-set-aligned", "exactSlideCount": True, "publicSourceUrl": "https://example.test"},
                },
                {
                    "unit": 3,
                    "module": {"order": 1},
                    "candidate": {"role": "primary-candidate", "localPath": "unit3.pptx"},
                    "status": "ok",
                    "native": {"slides": [{"number": 1, "joinedText": "native"}], "media": [], "mediaSummary": {}},
                    "publishedComparison": {"status": "low-overlap", "exactSlideCount": True, "publicSourceUrl": "https://example.test/3"},
                },
            ]
        }
        public = {
            "sources": [
                {"module": {"order": 1}, "lesson": {"order": 2}, "sourceUrl": "https://example.test", "deck": {"slides": [{"number": 1, "visibleTexts": ["same"]}]}},
                {"module": {"order": 1}, "lesson": {"order": 3}, "sourceUrl": "https://example.test/3", "deck": {"slides": [{"number": 1, "visibleTexts": ["published"]}]}},
            ]
        }
        with tempfile.TemporaryDirectory() as directory:
            paths = MODULE.write_native_source_files(audit, public, Path(directory))
            aligned = __import__("json").loads((Path(directory) / "unit-02.json").read_text(encoding="utf-8"))
            mismatch = __import__("json").loads((Path(directory) / "unit-03.json").read_text(encoding="utf-8"))

        self.assertEqual(len(paths), 2)
        self.assertEqual(aligned["slides"][0]["publishedSlideNumber"], 1)
        self.assertEqual(aligned["nativeImageAssets"][0]["localPath"], "images/photo.jpg")
        self.assertNotIn("publishedSlideNumber", mismatch["slides"][0])


if __name__ == "__main__":
    unittest.main()
