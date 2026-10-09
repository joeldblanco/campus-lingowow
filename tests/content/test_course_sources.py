"""Tests for the published Google Slides source reader."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[2] / "scripts" / "content" / "course-sources.py"
SPEC = importlib.util.spec_from_file_location("course_sources", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


SAMPLE_HTML = """
<html>
  <head><meta property="og:title" content="Unit 2 - I come from.pptx"></head>
  <body>
    <svg version="1.1" viewBox="0 0 960 540"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         xmlns="http://www.w3.org/2000/svg">
      <g id="p1">
        <g id="a11y-p1_i1" role="img" aria-label="I come from…"></g>
        <g id="a11y-p1_i2" role="img" aria-label="Listen to the audio"></g>
        <image xlink:href="https://docs.google.com/slides-images-rt/rendered=s2048" />
        <image xlink:href="https://ssl.gstatic.com/docs/drawings/images/audio.png" />
      </g>
    </svg>
    <svg version="1.1" viewBox="0 0 960 540"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         xmlns="http://www.w3.org/2000/svg">
      <g id="p2">
        <g id="a11y-p2_i1" role="img" aria-label="Practice"></g>
        <a xlink:href="https://www.google.com/url?q=https://youtu.be/example&amp;sa=D"
           role="link" aria-label="https://youtu.be/example"></a>
      </g>
    </svg>
  </body>
</html>
"""


class CourseSourceReaderTests(unittest.TestCase):
    def test_google_escape_decoder_restores_svg_markup(self) -> None:
        escaped = r"\x3csvg\x3ehello\x3c/svg\x3e"
        self.assertEqual(MODULE._decode_google_markup(escaped), "<svg>hello</svg>")

    def test_svg_chunker_ignores_nested_svg_icons(self) -> None:
        chunks = MODULE._extract_svg_chunks(
            '<svg id="slide-1"><svg id="icon"></svg></svg><svg id="slide-2"></svg>'
        )
        self.assertEqual(len(chunks), 2)
        self.assertIn('id="slide-1"', chunks[0])

    def test_parser_preserves_slide_order_text_and_missing_audio_signal(self) -> None:
        parsed = MODULE.parse_published_html(SAMPLE_HTML, "https://example.test/unit2/pub")

        self.assertEqual(parsed["deckTitle"], "Unit 2 - I come from.pptx")
        self.assertEqual(parsed["slideCount"], 2)
        self.assertEqual(parsed["slides"][0]["title"], "I come from…")
        self.assertEqual(parsed["slides"][1]["title"], "Practice")
        self.assertEqual(parsed["mediaSummary"]["audioIconCount"], 1)
        self.assertEqual(parsed["mediaSummary"]["missingAudioSourceCount"], 1)
        self.assertEqual(parsed["mediaSummary"]["videoUrls"], ["https://youtu.be/example"])
        self.assertEqual(parsed["mediaSummary"]["tableCount"], 0)

    def test_source_inventory_selects_published_embed_lessons_only(self) -> None:
        snapshot = {
            "course": {"id": MODULE.COURSE_ID},
            "modules": [
                {
                    "id": "module-1",
                    "order": 1,
                    "title": "Module 1",
                    "lessons": [
                        {
                            "id": "lesson-published",
                            "order": 1,
                            "title": "Published",
                            "isPublished": True,
                            "contents": [
                                {
                                    "id": "content-published",
                                    "data": {
                                        "type": "embed",
                                        "url": "https://example.test/published",
                                    }
                                }
                            ],
                        },
                        {
                            "id": "lesson-hidden",
                            "order": 2,
                            "title": "Hidden",
                            "isPublished": False,
                            "contents": [
                                {
                                    "id": "content-hidden",
                                    "data": {
                                        "type": "embed",
                                        "url": "https://example.test/hidden",
                                    }
                                }
                            ],
                        },
                    ],
                }
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.json"
            path.write_text(json.dumps(snapshot), encoding="utf-8")
            records = MODULE.load_published_sources(path)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["lesson"]["id"], "lesson-published")

    def test_writer_emits_content_json_without_raw_html(self) -> None:
        record = {
            "courseId": MODULE.COURSE_ID,
            "module": {"id": "module-1", "order": 1, "title": "Module 1"},
            "lesson": {"id": "lesson-1", "order": 1, "title": "Lesson 1", "videoUrl": None},
            "sourceUrl": "https://example.test/pub",
            "status": "ok",
            "deck": MODULE.parse_published_html(SAMPLE_HTML, "https://example.test/pub"),
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            MODULE.write_outputs([record], manifest_path=root / "manifest.json", source_dir=root / "sources")
            output = json.loads((root / "sources" / "lesson-1.json").read_text(encoding="utf-8"))

        self.assertNotIn("html", output)
        self.assertEqual(output["deck"]["slideCount"], 2)


if __name__ == "__main__":
    unittest.main()
