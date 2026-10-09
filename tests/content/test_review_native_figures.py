import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "content" / "review-native-figures.py"
SPEC = importlib.util.spec_from_file_location("review_native_figures", SCRIPT)
assert SPEC and SPEC.loader
reviewer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reviewer)


AUDIO_SHA = "0fdd09f9557fe6e265af4b096f031625b571bae5022bf1d65cee1d07113642a0"


def _asset(sha, slide, *, local_path="images/figure.jpg"):
    return {
        "mediaPath": "ppt/media/image1.jpg",
        "localPath": local_path,
        "mimeType": "image/jpeg",
        "bytes": 100,
        "sha256": sha,
        "references": [{"slide": slide, "bbox": {"x": 1, "y": 2, "cx": 3, "cy": 4, "right": 4, "bottom": 6}, "shapeId": "7"}],
    }


def _audit(*, unit=2, comparison=None, assets=None, slide_text="A. Look at the picture and describe it."):
    comparison = comparison or {"status": "text-set-aligned", "exactSlideCount": True, "publicSourceUrl": "https://example.test"}
    return {
        "records": [
            {
                "unit": unit,
                "module": {"order": 1, "title": "Module 1"},
                "candidate": {"role": "primary-candidate", "localPath": "native.pptx", "title": "Unit"},
                "status": "ok",
                "native": {
                    "slides": [{"number": 4, "joinedText": slide_text, "texts": [slide_text]}],
                    "imageExtraction": assets or [],
                },
                "publishedComparison": comparison,
            }
        ]
    }


def _public(*, unit=2, slide_text="A. Look at the picture and describe it."):
    return {
        "sources": [
            {
                "module": {"order": 1, "title": "Module 1"},
                "lesson": {"id": "lesson-2", "order": unit - 1, "title": "Unit", "videoUrl": None},
                "sourceUrl": "https://example.test",
                "deck": {"slideCount": 1, "slides": [{"number": 4, "visibleTexts": [slide_text]}]},
            }
        ]
    }


class ReviewNativeFiguresTests(unittest.TestCase):
    def test_audio_icon_is_excluded_with_bbox_provenance(self):
        output = reviewer.review_figures(_audit(assets=[_asset(AUDIO_SHA, 4)]), _public())

        slide = output["units"]["2"]["slides"]["4"]
        self.assertEqual(slide["confirmedInstructionalAssets"], [])
        self.assertEqual(slide["excludedOrBlockedAssets"][0]["role"], "audio-icon")
        self.assertEqual(slide["excludedOrBlockedAssets"][0]["bbox"]["x"], 1)

    def test_picture_on_mapped_intro_slide_is_confirmed(self):
        output = reviewer.review_figures(_audit(assets=[_asset("a" * 64, 4)]), _public())

        figure = output["units"]["2"]["slides"]["4"]["confirmedInstructionalAssets"][0]
        self.assertTrue(figure["confirmedInstructional"])
        self.assertEqual(figure["role"], "instructional-figure")
        self.assertEqual(figure["sha256"], "a" * 64)

    def test_low_overlap_native_asset_cannot_claim_published_slide(self):
        output = reviewer.review_figures(
            _audit(
                unit=33,
                comparison={"status": "low-overlap", "exactSlideCount": True, "publicSourceUrl": "https://example.test"},
                assets=[_asset("b" * 64, 4)],
            ),
            _public(unit=33),
        )

        unit = output["units"]["33"]
        self.assertEqual(unit["mappingStatus"], "native-only-published-mismatch")
        self.assertIn("native-4", unit["slides"])
        blocked = unit["slides"]["native-4"]["excludedOrBlockedAssets"][0]
        self.assertFalse(blocked["confirmedInstructional"])
        self.assertEqual(blocked["role"], "instructional-candidate-published-mismatch")


if __name__ == "__main__":
    unittest.main()
