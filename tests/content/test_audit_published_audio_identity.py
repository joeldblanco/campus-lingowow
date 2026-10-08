import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "content" / "audit-published-audio-identity.py"
SPEC = importlib.util.spec_from_file_location("published_audio_identity", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_parser_keeps_media_id_distinct_from_page_and_shape_ids():
    markup = (
        '["page-3",3,"Intro",[['
        '"shape-1","published-media-token-123456789",1,[1.0,2.0,3.0,4.0],'
        '100.0,0,1,[0],[0],"Audio 1 - Unit 3.mp3","","","",""]]]'
    )

    refs = MODULE.parse_published_audio_refs(markup)

    assert len(refs) == 1
    ref = refs[0]
    assert ref["publishedMediaObjectId"] == "published-media-token-123456789"
    assert ref["pageObjectId"] == "page-3"
    assert ref["elementObjectId"] == "shape-1"
    assert ref["publishedTupleTypeMarker"] == 1
    assert ref["publishedTupleTypeVerified"] is True
    assert ref["audioIndex"] == 1


def test_parser_accepts_escaped_control_characters_in_slide_titles():
    markup = (
        '["p4",3,"Prompt\\u000bcontinues",[['
        '"shape-1","published-media-token-123456789",1,[1.0,2.0,3.0,4.0],'
        '100.0,0,1,[0],[0],"Audio 1.mp3","","","",""]]]'
    )

    refs = MODULE.parse_published_audio_refs(markup)

    assert len(refs) == 1
    assert refs[0]["publishedMediaObjectId"] == "published-media-token-123456789"


def test_same_filename_does_not_match_a_different_drive_id():
    source = {
        "unit": 3,
        "published": {"sourceUrl": "https://example.test", "deckTitle": "Unit 3"},
        "fetch": {},
        "audioRefs": [
            {
                "publishedMediaObjectId": "published-id",
                "publishedTupleTypeVerified": True,
                "label": "Unit 3 - Audio 1.mp3",
                "slideNumber": 4,
            }
        ],
        "directAudioUrls": [],
    }
    drive = {
        "units": {
            "3": {
                "audioCandidates": [
                    {
                        "id": "different-drive-id",
                        "title": "Unit 3 - Audio 1.mp3",
                        "mimeType": "audio/mpeg",
                    }
                ]
            }
        }
    }
    result = MODULE.compare_with_drive(source, drive, {"files": []})

    assert result["status"] == "published-id-mismatch-requires-observed-drive-metadata"
    assert result["audioRefs"][0]["matchStatus"] == "published-id-not-in-authoritative-candidates"
    assert result["audioRefs"][0]["filenameMatchUsed"] is False
    assert result["metadataFollowupIds"] == ["published-id"]


def test_direct_id_match_requires_audio_mime_and_materialized_sha():
    source = {
        "unit": 2,
        "published": {"sourceUrl": "https://example.test", "deckTitle": "Unit 2"},
        "fetch": {},
        "audioRefs": [
            {
                "publishedMediaObjectId": "drive-id",
                "publishedTupleTypeVerified": True,
                "label": "Audio 1.mp3",
                "slideNumber": 4,
            }
        ],
        "directAudioUrls": [],
    }
    drive = {
        "units": {
            "2": {
                "audioCandidates": [
                    {"id": "drive-id", "title": "Audio 1.mp3", "mimeType": "audio/mpeg"}
                ]
            }
        }
    }
    result = MODULE.compare_with_drive(
        source,
        drive,
        {"files": [{"id": "drive-id", "exists": True, "bytes": 10, "sha256": "abc"}]},
    )

    assert result["status"] == "all-published-audio-ids-directly-match-materialized-authoritative-candidates"
    assert result["audioRefs"][0]["matchStatus"] == "direct-id-match"
    assert result["audioRefs"][0]["driveCandidate"]["materializedSha256"] == "abc"
