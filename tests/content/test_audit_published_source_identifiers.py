import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).parents[2] / "scripts" / "content" / "audit-published-source-identifiers.py"
SPEC = importlib.util.spec_from_file_location("audit_published_source_identifiers", SCRIPT)
assert SPEC and SPEC.loader
auditor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(auditor)


class PublishedSourceIdentifierTests(unittest.TestCase):
    def test_public_embed_token_does_not_become_native_id(self):
        markup = (
            '<meta property="og:url" content="https://docs.google.com/presentation/d/e/2PACX-public/embed">'
            '<a href="https://docs.google.com/presentation/d/e/2PACX-public/edit">edit</a>'
        )
        identity = auditor._published_identity(
            "https://docs.google.com/presentation/d/e/2PACX-public/embed?start=false", markup
        )

        self.assertEqual(identity["sourceToken"], "2PACX-public")
        self.assertEqual(identity["routesObserved"], ["edit", "embed"])
        self.assertIsNone(identity["nativePresentationIdResolved"])
        self.assertEqual(identity["canonicalLink"], None)

    def test_audio_tuple_keeps_published_media_id_and_slide_number(self):
        markup = (
            '["page-3",3,"",[["element-1","media-audio-identifier-1234567890",1,[1.0],100.0,0,1,[0],[0],"Audio 1 - Unit 53.mp3"]]]'
            '"https://docs.google.com/slides-images-rt/rendered?s=2048"'
        )
        media = auditor._media_refs(markup)

        self.assertEqual(len(media["audioRefs"]), 1)
        self.assertEqual(media["audioRefs"][0]["slideNumber"], 4)
        self.assertEqual(media["audioRefs"][0]["publishedMediaObjectId"], "media-audio-identifier-1234567890")
        self.assertEqual(media["directAudioUrls"], [])
        self.assertEqual(media["originalAssetUrlsObserved"], [])

    def test_build_is_bounded_to_four_manifest_units(self):
        manifest = {
            "sources": [
                {
                    "lesson": {"title": f"Unit {unit}"},
                    "module": {},
                    "contentId": f"content-{unit}",
                    "sourceUrl": f"https://example.test/unit-{unit}",
                    "deck": {"deckTitle": f"Deck {unit}", "slideCount": 17},
                }
                for unit in auditor.TARGET_UNITS
            ]
        }
        drive = {"units": {str(unit): {"presentationCandidates": [], "audioCandidates": []} for unit in auditor.TARGET_UNITS}}
        fetched = lambda source, timeout: {
            "unit": int(source["lesson"]["title"].split()[-1]),
            "published": {},
            "fetch": {},
            "identity": {},
            "media": {},
        }
        with patch.object(auditor, "fetch_source", side_effect=fetched) as fetch:
            result = auditor.build_audit(manifest, drive)

        self.assertEqual(sorted(result["units"]), ["53", "54", "55", "56"])
        self.assertEqual(fetch.call_count, 4)
        self.assertEqual(result["units"]["53"]["authoritativeDriveContext"]["presentationCandidateCount"], 0)


if __name__ == "__main__":
    unittest.main()
