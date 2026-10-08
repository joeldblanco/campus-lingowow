"""Compose the Unit 53--56 recovered-media and published-text audit sidecars.

This is a read-only source audit helper. It does not copy or transform media;
it records exact local source bytes, published media identities, visible deck
proof, and the one published text projection whose source has no native PPTX.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from pathlib import Path
from statistics import fmean
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "docs" / "audit"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_source_deck(lesson_id: str) -> tuple[Path, dict[str, Any]]:
    for path in sorted((AUDIT / "source-files").glob("*.json")):
        try:
            value = load(path)
        except (OSError, json.JSONDecodeError):
            continue
        if value.get("lesson", {}).get("id") == lesson_id:
            return path, value
    raise FileNotFoundError(f"published source JSON not found for {lesson_id}")


def slide_for(deck: dict[str, Any], number: int) -> dict[str, Any]:
    for slide in deck["deck"]["slides"]:
        if slide.get("number") == number:
            return slide
    raise KeyError(f"slide {number} not found")


def segments_mean(rows: list[dict[str, Any]]) -> float | None:
    values = [row.get("avgLogprob") for row in rows if isinstance(row.get("avgLogprob"), (int, float))]
    return fmean(values) if values else None


def recovered_audio_record(
    row: dict[str, Any],
    transcript: dict[str, Any],
    published_ref: dict[str, Any],
    published: dict[str, Any],
    source_slide: dict[str, Any],
) -> dict[str, Any]:
    raw_path = row["materializedPathRelative"]
    local_path = ROOT / raw_path
    if not local_path.is_file():
        raise FileNotFoundError(local_path)
    actual_sha = sha256(local_path)
    if actual_sha != row["sha256"]:
        raise ValueError(f"source SHA mismatch for {raw_path}: {actual_sha} != {row['sha256']}")
    segments = transcript["segments"]
    drive_url = row["viewerUrl"]
    return {
        "id": row["sourceId"],
        "kind": "audio",
        "mediaType": "audio",
        "role": "lesson-audio-candidate",
        "unit": row["unit"],
        "lessonId": row["lessonId"],
        "audioIndex": row["audioNumber"],
        "audioNumber": row["audioNumber"],
        "sourceFilename": row["label"],
        "materializedFilename": Path(raw_path).name,
        "sourcePath": raw_path,
        "sourceSha256": row["sha256"],
        "sourceBytes": row["bytes"],
        "mimeType": row["mimeType"],
        "model": transcript["model"],
        "language": transcript["language"],
        "languageProbability": transcript["languageProbability"],
        "avgLogprob": segments_mean(segments),
        "text": transcript["text"],
        "segments": segments,
        "title": row["label"],
        "selected": True,
        "reviewed": True,
        "transcript": transcript["text"],
        "publicPath": row["publicPath"],
        "publicUrl": row["publicUrl"],
        "publicHref": row["publicUrl"],
        "status": "ready",
        "originalMediaUrl": drive_url,
        "reviewScope": (
            "Original published media identity, Drive source bytes, SHA, duration and local transcript; "
            "listening questions remain pending semantic review."
        ),
        "sourceSlideNumber": row["slideNumber"],
        "sourceSlideTitle": source_slide["title"],
        "nativeTrace": {
            "driveFileId": row["sourceId"],
            "driveUrl": drive_url,
            "driveTitle": row["label"],
            "driveMimeType": row["mimeType"],
            "driveRole": "published-original-audio",
            "materializedPath": raw_path,
            "materializedSha256": row["sha256"],
            "publishedSourceUrl": row["publishedSourceUrl"],
            "publishedDeckTitle": row["deckTitle"],
            "publishedSlideNumber": row["slideNumber"],
            "publishedZeroBasedSlideNumber": row["publishedZeroBasedSlide"],
            "publishedSlideTitle": source_slide["title"],
            "publishedPageObjectId": published_ref["pageObjectId"],
            "publishedElementObjectId": published_ref["elementObjectId"],
            "publishedMediaObjectId": published_ref["publishedMediaObjectId"],
            "idKind": published_ref["idKind"],
            "identityEvidence": row["identityEvidence"],
            "downloadMethod": row["downloadMethod"],
            "sourceDurationSeconds": row["durationSeconds"],
            "publishedHtmlSha256": published["fetch"]["sha256"],
        },
        "transcriptEvidence": {
            "path": "docs/audit/unit53-56-audio-transcripts.json",
            "sourceSha256": row["sha256"],
            "reviewStatus": transcript["reviewStatus"],
            "doNotAutoAuthorKeys": True,
            "segmentCount": len(segments),
        },
    }


PROOF = [
    {
        "unit": 53,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vT59Ou8w4N2auwMDKSrQlTTuouQ-koYqWX7tEZFvMD-QDHC_sDusGOreOXhh9jiWg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "screenshotBytes": 63017,
        "screenshotSha256": "757acd55a8507768347555ceee8caf9c117f1515c01d4a112504fd4aab6070ed",
    },
    {
        "unit": 54,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vQSe5443Q89NpWNmd80mpQ3GX942hzqMI-P1c7cbZb4goXDDDfF_i95-I8EtvFgvQ/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "screenshotBytes": 59871,
        "screenshotSha256": "05fe4213a6da49cd8e810c88d1a313caac9ae9ba5adc86ff350060df5c1b85d2",
    },
    {
        "unit": 55,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vQwygT74B4YFgRltVz73gLIMEvyLZr_IP8S6yf_rvQ3Qn6l2EbeYydkL3knPUNA_Q/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "screenshotBytes": 66676,
        "screenshotSha256": "ad16820bc3c0c6f185186a2a4dae701e985b92b1654b6edcaa361c39804f7848",
    },
    {
        "unit": 56,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vTeRpvarj3bbdc9H6Fb4ZN9IYRDOsyQD_zGgZGqjKQ6Wr5fCgO0Ik7pHhOBoEFWDg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "screenshotBytes": 67674,
        "screenshotSha256": "ca9505c66e3bc6ce4b40fb9b47b7c99e1b2ee46c13b599656177580945d2f9c6",
    },
    {
        "unit": 56,
        "slideNumber": 8,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vTeRpvarj3bbdc9H6Fb4ZN9IYRDOsyQD_zGgZGqjKQ6Wr5fCgO0Ik7pHhOBoEFWDg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_86",
        "screenshotBytes": 110946,
        "screenshotSha256": "5c8f95080bd544d777795cdf10f8bec80462cb0df15fa8dcda892ddc0fa68919",
    },
]


# These are individual JPEGs observed and exported by the documented
# pageAssets capability from each visible published slide 4. They are the
# instructional photos used by the published "Look at the picture" prompt;
# they are not native-PPTX identity claims and are not whole-slide captures.
PUBLISHED_FIGURES = [
    {
        "unit": 53,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vT59Ou8w4N2auwMDKSrQlTTuouQ-koYqWX7tEZFvMD-QDHC_sDusGOreOXhh9jiWg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "publishedSlideObjectId": "g72967b2bcc_0_37",
        "assetId": "cb6f934af4114c62",
        "assetName": "AE1YXSbREW5Z1eJYCQlRCAwh3RbpWE5lcBDwY6aw2gLGNNLDEJY8oepYeGpeXclPU-fvT_bBP9agLL4MdJlbQwrpeEgLJWAdUgWMAm172YWpMQT0vVU08EM7QswBPbHu7zRo2USrpPd_uNi2qIyo3R1kIuWmnhwHqnQtQaoNrEDORQBtosKOqdA68U2n=s2048",
        "assetUrl": "https://docs.google.com/u/3/slides-images-rt/AE1YXSbREW5Z1eJYCQlRCAwh3RbpWE5lcBDwY6aw2gLGNNLDEJY8oepYeGpeXclPU-fvT_bBP9agLL4MdJlbQwrpeEgLJWAdUgWMAm172YWpMQT0vVU08EM7QswBPbHu7zRo2USrpPd_uNi2qIyo3R1kIuWmnhwHqnQtQaoNrEDORQBtosKOqdA68U2n=s2048",
        "localPath": "docs/audit/source-originals/published-figures/unit53-slide04.jpg",
        "sourceSha256": "4486f3719bb57c9de6063802041f2c896f46f1d3d6a2c2bf39082232df75ec76",
        "bytes": 60440,
        "mimeType": "image/jpeg",
        "width": 1125,
        "height": 750,
    },
    {
        "unit": 54,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vQSe5443Q89NpWNmd80mpQ3GX942hzqMI-P1c7cbZb4goXDDDfF_i95-I8EtvFgvQ/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "publishedSlideObjectId": "g72967b2bcc_0_37",
        "assetId": "ab763532ad066f5b",
        "assetName": "AE1YXSZ4uvDPy4g1ilaKbhr6mkilEMtATlvduE686r95kvadFq5vBafzQf2i4c4seno69X9qlnZGpP4doltGKpubPmDMJ_2xcGLTAW3CAvw--fx8xEGuhLwjw1Cvg7gNHD2rpY7NO9dlm0onLs9p0xA5LL74YYFHnGKRPM0XTxVSq7DqBqThFLwMBFy0=s2048",
        "assetUrl": "https://docs.google.com/u/3/slides-images-rt/AE1YXSZ4uvDPy4g1ilaKbhr6mkilEMtATlvduE686r95kvadFq5vBafzQf2i4c4seno69X9qlnZGpP4doltGKpubPmDMJ_2xcGLTAW3CAvw--fx8xEGuhLwjw1Cvg7gNHD2rpY7NO9dlm0onLs9p0xA5LL74YYFHnGKRPM0XTxVSq7DqBqThFLwMBFy0=s2048",
        "localPath": "docs/audit/source-originals/published-figures/unit54-slide04.jpg",
        "sourceSha256": "cae379794e78a7481d2d50ae1bbc1369b4f852572ed1fb29c388aa314dbccbc0",
        "bytes": 45990,
        "mimeType": "image/jpeg",
        "width": 1124,
        "height": 750,
    },
    {
        "unit": 55,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vQwygT74B4YFgRltVz73gLIMEvyLZr_IP8S6yf_rvQ3Qn6l2EbeYydkL3knPUNA_Q/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "publishedSlideObjectId": "g72967b2bcc_0_37",
        "assetId": "d9ce42ac50147f8c",
        "assetName": "AE1YXSb4DktDr3B98IH-Dp3PJxtmDOOcIug-evKQwdAUMcHBgt25ZuWQLRtQ4mIiZ8rLExyKmUvJr-9XHr-vG1P9oqhBgpmaiiisoao-Z0OBX62-rExwCzOyxJWH8YEOb48Vurt1Dme5R0hIsafGEYJCDVNzQb0Yj_1I4PLq3R8398YbRAJVJ8sCKDrd=s2048",
        "assetUrl": "https://docs.google.com/u/3/slides-images-rt/AE1YXSb4DktDr3B98IH-Dp3PJxtmDOOcIug-evKQwdAUMcHBgt25ZuWQLRtQ4mIiZ8rLExyKmUvJr-9XHr-vG1P9oqhBgpmaiiisoao-Z0OBX62-rExwCzOyxJWH8YEOb48Vurt1Dme5R0hIsafGEYJCDVNzQb0Yj_1I4PLq3R8398YbRAJVJ8sCKDrd=s2048",
        "localPath": "docs/audit/source-originals/published-figures/unit55-slide04.jpg",
        "sourceSha256": "301b982e820251eaa9012d619672ba80560841fcf38c47d70332e67243a6b7a0",
        "bytes": 73368,
        "mimeType": "image/jpeg",
        "width": 1000,
        "height": 750,
    },
    {
        "unit": 56,
        "slideNumber": 4,
        "publishedSlideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vTeRpvarj3bbdc9H6Fb4ZN9IYRDOsyQD_zGgZGqjKQ6Wr5fCgO0Ik7pHhOBoEFWDg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_37",
        "publishedSlideObjectId": "g72967b2bcc_0_37",
        "assetId": "6fcfbe7a6a0de136",
        "assetName": "AE1YXSZys3HhfDgjct13p1EpzbTvS3ngsEBiHJ8QMtaYUAeImHLSjN2qfjk5Ho5C-cahfNzWQcP5bKxMCJAWHs5WWsSU615IJvKzfm9kwIsLGJJ07Hng1DfO-2cwauLpZ_2adRv6xUd_l_2F1aarPvdcC8ykVoiDm34RYPUXvxpQar55ceEeAdBSmevw=s2048",
        "assetUrl": "https://docs.google.com/u/3/slides-images-rt/AE1YXSZys3HhfDgjct13p1EpzbTvS3ngsEBiHJ8QMtaYUAeImHLSjN2qfjk5Ho5C-cahfNzWQcP5bKxMCJAWHs5WWsSU615IJvKzfm9kwIsLGJJ07Hng1DfO-2cwauLpZ_2adRv6xUd_l_2F1aarPvdcC8ykVoiDm34RYPUXvxpQar55ceEeAdBSmevw=s2048",
        "localPath": "docs/audit/source-originals/published-figures/unit56-slide04.jpg",
        "sourceSha256": "2b96e467487c9664ec1b6d633e2dead5de3f826f0079def6cb959841ce31b9c5",
        "bytes": 104181,
        "mimeType": "image/jpeg",
        "width": 1125,
        "height": 750,
    },
]


def main() -> None:
    recovery_path = AUDIT / "unit53-56-drive-recovery.json"
    transcript_path = AUDIT / "unit53-56-audio-transcripts.json"
    listening_path = AUDIT / "unit53-56-listening-recovery-review.json"
    published_identity = load(AUDIT / "published-source-identity-53-56.json")
    recovery = load(recovery_path)
    transcripts = load(transcript_path)
    listening = load(listening_path)

    corrected_source = {
        "unit": 55,
        "audioNumber": 2,
        "slideNumber": 13,
        "sourceId": "1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQh",
        "label": "Auido 2 - Unit 55.mp3",
        "sourceFile": "unit55-audio2.mp3",
        "bytes": 756259,
        "sha256": "4f7b7625510833363b36f2642eb22efaa3a7413d4f2d96d510ed0a0e19c48301",
        "durationSeconds": 47.182948,
        "pageObjectId": "g729cfa641f_0_32",
        "elementObjectId": "g1c92c3ceb08_0_1",
        "status": "recovered",
        "lessonId": "cmnmm9wiv002zw1qkz23p6kdp",
        "contentId": "cmnmm9wly0030w1qk4vrdc4a7",
        "moduleId": "cmnmm9lx3000fw1qkh6ijo1px",
        "moduleTitle": "M�dulo 14",
        "deckTitle": "NEW That's anyone's call - Unit 55.pptx",
        "publishedSourceUrl": "https://docs.google.com/presentation/d/e/2PACX-1vQwygT74B4YFgRltVz73gLIMEvyLZr_IP8S6yf_rvQ3Qn6l2EbeYydkL3knPUNA_Q/embed?start=false&loop=false&delayms=3000",
        "publishedSourceSlide": 13,
        "publishedZeroBasedSlide": 12,
        "publishedMediaObjectId": "1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQh",
        "idKind": "published-media-object",
        "identityEvidence": "User supplied corrected exact Drive URL with trailing h; visible Drive viewer title matched label and published media object ID.",
        "viewerUrl": "https://drive.google.com/file/d/1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQh/view?usp=sharing",
        "downloadMethod": "Chrome UI: visible Google Drive Download button",
        "accountDisplay": "Lingowow",
        "mimeType": "audio/mpeg",
        "materializedPath": str(ROOT / "docs/audit/source-originals/audio-unit53-56/unit55-audio2.mp3"),
        "materializedPathRelative": "docs/audit/source-originals/audio-unit53-56/unit55-audio2.mp3",
        "sourceBytesVerified": True,
        "sha256Verified": True,
        "durationVerifiedWith": "ffprobe local file",
        "doNotSynthesize": True,
        "publicPath": "public/audio/lessons/course/unit-55-audio-02.mp3",
        "publicUrl": "/audio/lessons/course/unit-55-audio-02.mp3",
        "readyForParentStage": True,
    }
    raw_path = ROOT / corrected_source["materializedPathRelative"]
    if sha256(raw_path) != corrected_source["sha256"]:
        raise ValueError("corrected Unit55 Audio2 bytes do not match the visible Drive download")

    recovery["recovered"] = [row for row in recovery["recovered"] if not (row["unit"] == 55 and row["audioNumber"] == 2)]
    recovery["recovered"].append(corrected_source)
    recovery["recovered"].sort(key=lambda row: (row["unit"], row["audioNumber"]))
    recovery["blockers"] = [row for row in recovery["blockers"] if not (row["unit"] == 55 and row["audioNumber"] == 2)]
    recovery["counts"] = {"expectedAudioRefs": 8, "recovered": 8, "blocked": 0, "missingSubstitution": 0}
    recovery["authority"]["correctedUnit55Audio2"] = {
        "exactUserSuppliedUrl": corrected_source["viewerUrl"],
        "sourceIdObservedInVisibleViewer": corrected_source["sourceId"],
        "downloadVerified": True,
        "sourceSha256": corrected_source["sha256"],
        "sourceBytes": corrected_source["bytes"],
        "durationSeconds": corrected_source["durationSeconds"],
    }
    save(recovery_path, recovery)

    new_transcript = {
        "unit": 55,
        "lessonId": corrected_source["lessonId"],
        "slideNumber": 13,
        "audioIndex": 2,
        "sourceId": corrected_source["sourceId"],
        "sourceLabel": corrected_source["label"],
        "sourcePath": corrected_source["materializedPathRelative"],
        "sourceSha256": corrected_source["sha256"],
        "sourceBytes": corrected_source["bytes"],
        "durationSeconds": corrected_source["durationSeconds"],
        "model": "faster-whisper-small-int8",
        "language": "en",
        "languageProbability": 0.9799962043762207,
        "text": "Dave, did everyone send their documents? Not everyone, but all of them are here. How is that possible? Well, someone gave some other people a free ride. Marcus again? Oh my. If he weren't given people free rides, people would have been more responsible this time. I said the same thing. Nevertheless, he stated that the main issue was to have all documents on time and sent. So what else can we do? Nothing. I mean, he's a great guy always tensing his arm. What really annoys me is people taking advantage of him. Don't even mention it. I'm sure that if they weren't having a good cover for the end of the month, the boss would have sent some of them home already. I know. One can only hope.",
        "segments": [
            {"start": 1.68, "end": 4.68, "text": "Dave, did everyone send their documents?", "avgLogprob": -0.1523483135141768},
            {"start": 4.68, "end": 6.68, "text": "Not everyone, but all of them are here.", "avgLogprob": -0.1523483135141768},
            {"start": 6.68, "end": 8.68, "text": "How is that possible?", "avgLogprob": -0.1523483135141768},
            {"start": 8.68, "end": 11.68, "text": "Well, someone gave some other people a free ride.", "avgLogprob": -0.1523483135141768},
            {"start": 11.68, "end": 12.68, "text": "Marcus again?", "avgLogprob": -0.1523483135141768},
            {"start": 12.68, "end": 13.68, "text": "Oh my.", "avgLogprob": -0.1523483135141768},
            {"start": 13.68, "end": 18.68, "text": "If he weren't given people free rides, people would have been more responsible this time.", "avgLogprob": -0.1523483135141768},
            {"start": 18.68, "end": 20.68, "text": "I said the same thing.", "avgLogprob": -0.1523483135141768},
            {"start": 20.68, "end": 25.68, "text": "Nevertheless, he stated that the main issue was to have all documents on time and sent.", "avgLogprob": -0.1523483135141768},
            {"start": 25.68, "end": 27.68, "text": "So what else can we do?", "avgLogprob": -0.1523483135141768},
            {"start": 27.68, "end": 31.68, "text": "Nothing. I mean, he's a great guy always tensing his arm.", "avgLogprob": -0.07558594781091843},
            {"start": 31.68, "end": 35.68, "text": "What really annoys me is people taking advantage of him.", "avgLogprob": -0.07558594781091843},
            {"start": 35.68, "end": 36.68, "text": "Don't even mention it.", "avgLogprob": -0.07558594781091843},
            {"start": 36.68, "end": 40.68, "text": "I'm sure that if they weren't having a good cover for the end of the month,", "avgLogprob": -0.07558594781091843},
            {"start": 40.68, "end": 43.68, "text": "the boss would have sent some of them home already.", "avgLogprob": -0.07558594781091843},
            {"start": 43.68, "end": 44.68, "text": "I know.", "avgLogprob": -0.07558594781091843},
            {"start": 44.68, "end": 46.68, "text": "One can only hope.", "avgLogprob": -0.07558594781091843},
        ],
        "reviewStatus": "transcribed-source-awaiting-semantic-review",
        "doNotAutoAuthorKeys": True,
    }
    transcripts["transcripts"] = [
        row for row in transcripts["transcripts"] if not (row["unit"] == 55 and row["audioIndex"] == 2)
    ]
    transcripts["transcripts"].append(new_transcript)
    transcripts["transcripts"].sort(key=lambda row: (row["unit"], row["audioIndex"]))
    transcripts["blocked"] = [row for row in transcripts.get("blocked", []) if not (row.get("unit") == 55 and (row.get("audioIndex") == 2 or row.get("audioNumber") == 2))]
    transcripts["counts"] = {"available": 8, "transcribed": 8, "blocked": 0, "expected": 8}
    save(transcript_path, transcripts)

    for item in listening["items"]:
        if item.get("unit") == 55 and item.get("audioIndex") == 2:
            item["reviewStatus"] = "source-recovered-transcript-available"
            item["audioSource"] = {
                "sourceId": corrected_source["sourceId"],
                "label": corrected_source["label"],
                "viewerUrl": corrected_source["viewerUrl"],
                "slideNumber": corrected_source["slideNumber"],
                "status": "recovered",
                "sourceSha256": corrected_source["sha256"],
                "sourceBytes": corrected_source["bytes"],
                "durationSeconds": corrected_source["durationSeconds"],
                "materializedPath": corrected_source["materializedPathRelative"],
                "mimeType": corrected_source["mimeType"],
            }
            item["transcriptEvidence"] = {
                "status": "available",
                "path": "docs/audit/unit53-56-audio-transcripts.json",
                "sourceSha256": corrected_source["sha256"],
                "language": new_transcript["language"],
                "languageProbability": new_transcript["languageProbability"],
                "segmentCount": len(new_transcript["segments"]),
                "transcriptTextAvailable": True,
            }
            break
    listening["counts"] = {
        "items": 8,
        "sourceRecovered": 8,
        "transcriptAvailable": 8,
        "blockedSource": 0,
        "questionsAuthored": 0,
    }
    save(listening_path, listening)

    source_rows = {row["unit"]: row for row in recovery["recovered"]}
    transcript_rows = {(row["unit"], row["audioIndex"]): row for row in transcripts["transcripts"]}
    proof_by_unit_slide = {(row["unit"], row["slideNumber"]): row for row in PROOF}
    figure_records: list[dict[str, Any]] = []
    published_figure_source_refs: dict[str, dict[str, str]] = {}
    for figure in PUBLISHED_FIGURES:
        identity = published_identity["units"][str(figure["unit"])]
        lesson_id = identity["published"]["lesson"]["id"]
        source_path, source_deck = find_source_deck(lesson_id)
        source_ref_path = source_path.relative_to(ROOT).as_posix()
        published_figure_source_refs[source_ref_path] = {
            "kind": "published-visible-source-json",
            "path": source_ref_path,
            "sha256": sha256(source_path),
        }
        local_path = ROOT / figure["localPath"]
        if not local_path.is_file():
            raise FileNotFoundError(local_path)
        actual_sha = sha256(local_path)
        if actual_sha != figure["sourceSha256"]:
            raise ValueError(f"published figure SHA mismatch for {local_path}: {actual_sha} != {figure['sourceSha256']}")
        source_slide = slide_for(source_deck, figure["slideNumber"])
        public_path = f"public/images/lessons/course/source-{figure['sourceSha256'][:16]}.webp"
        figure_records.append(
            {
                "id": f"unit-{figure['unit']:02d}-published-slide-{figure['slideNumber']:02d}-figure-1",
                "kind": "instructional-image",
                "assetType": "instructional-image",
                "role": "instructional",
                "unit": figure["unit"],
                "lessonId": lesson_id,
                "slideNumber": figure["slideNumber"],
                "sourceSlideNumber": figure["slideNumber"],
                "publishedSlideNumber": figure["slideNumber"],
                "localPath": figure["localPath"],
                "sourcePath": figure["localPath"],
                "sourceSha256": figure["sourceSha256"],
                "sha256": figure["sourceSha256"],
                "dedupSha256": figure["sourceSha256"],
                "mimeType": figure["mimeType"],
                "bytes": figure["bytes"],
                "width": figure["width"],
                "height": figure["height"],
                "selected": True,
                "reviewed": True,
                "confirmedInstructional": True,
                "title": source_slide["title"],
                "originalMediaUrl": figure["assetUrl"],
                "publicPath": public_path,
                "publicUrl": "/images/lessons/course/" + public_path.rsplit("/", 1)[-1],
                "publicHref": "/images/lessons/course/" + public_path.rsplit("/", 1)[-1],
                "nativeTrace": {
                    "nativePresentationDriveFileId": None,
                    "nativePresentationPath": None,
                    "nativeIdentityConfirmed": False,
                    "publishedSourceUrl": figure["publishedSlideUrl"].split("&slide=", 1)[0],
                    "publishedSlideUrl": figure["publishedSlideUrl"],
                    "publishedSlideNumber": figure["slideNumber"],
                    "publishedSlideObjectId": figure["publishedSlideObjectId"],
                    "publishedAssetId": figure["assetId"],
                    "publishedAssetName": figure["assetName"],
                    "publishedAssetUrl": figure["assetUrl"],
                    "extractionMethod": "documented pageAssets.list + pageAssets.bundle from visible published deck",
                    "sourceAssetPath": figure["localPath"],
                    "sourceAssetSha256": figure["sourceSha256"],
                    "sourceAssetMimeType": figure["mimeType"],
                    "sourceAssetDimensions": [figure["width"], figure["height"]],
                    "sourceSlideTitle": source_slide["title"],
                },
                "reviewEvidence": [
                    "The visible published slide 4 asks the learner to look at the picture.",
                    "The pageAssets bundle returned this individual JPEG; it is visually the photo shown in the published prompt, not a full-slide render, logo, or audio icon.",
                    "Native PPTX identity is unavailable, so nativeIdentityConfirmed remains false.",
                ],
            }
        )
    figure_by_unit = {figure["unit"]: figure for figure in figure_records}
    figure_by_unit_slide = {(figure["unit"], figure["slideNumber"]): figure for figure in figure_records}
    audio_records: list[dict[str, Any]] = []
    unit_data: dict[str, Any] = {}
    for unit in range(53, 57):
        identity = published_identity["units"][str(unit)]
        lesson_id = identity["published"]["lesson"]["id"]
        source_path, source_deck = find_source_deck(lesson_id)
        recovered = [row for row in recovery["recovered"] if row["unit"] == unit]
        refs = {ref["publishedMediaObjectId"]: ref for ref in identity["media"]["audioRefs"]}
        for row in recovered:
            source_slide = slide_for(source_deck, row["slideNumber"])
            audio_records.append(
                recovered_audio_record(
                    row,
                    transcript_rows[(unit, row["audioNumber"])],
                    refs[row["sourceId"]],
                    identity,
                    source_slide,
                )
            )
        unit_figures = [figure for figure in figure_records if figure["unit"] == unit]
        unit_data[str(unit)] = {
            "unit": unit,
            "module": identity["published"]["module"],
            "lessonId": lesson_id,
            "lesson": identity["published"]["lesson"],
            "contentId": identity["published"]["contentId"],
            "publishedSourceUrl": identity["published"]["sourceUrl"],
            "publishedDeckTitle": identity["published"]["deckTitle"],
            "publishedSlideCount": identity["published"]["slideCount"],
            "nativeImageMappingStatus": "published-instructional-asset-recovered-native-identity-unconfirmed",
            "audioNumbers": [row["audioNumber"] for row in recovered],
            "audioIds": [row["sourceId"] for row in recovered],
            "audioSourceSha256": [row["sha256"] for row in recovered],
            "imageDedupSha256": [figure["dedupSha256"] for figure in unit_figures],
            "imageReferenceCount": len(unit_figures),
            "publishedFigureProofRefs": [
                f"published-figure-unit{unit}-slide{figure['slideNumber']}"
                for figure in unit_figures
            ],
            "mediaBlockers": [],
            "nativeSourceNote": "No authoritative native PPTX identity was found; the published instructional JPEG is traceable and usable while nativeIdentityConfirmed remains false.",
        }

    media_manifest = {
        "schemaVersion": 1,
        "manifestContract": "course-reviewed-media-final-extension-v1",
        "scope": "Original published media recovery and source proof for Units 53-56",
        "generatedAtUtc": recovery["generatedAtUtc"],
        "sourcePriority": ["published-source-identity", "visible Drive original download", "published-visible-text"],
        "sourceManifests": {
            "recovery": "docs/audit/unit53-56-drive-recovery.json",
            "transcripts": "docs/audit/unit53-56-audio-transcripts.json",
            "listeningReview": "docs/audit/unit53-56-listening-recovery-review.json",
            "publishedIdentity": "docs/audit/published-source-identity-53-56.json",
            "publishedDeckSlides": "docs/audit/source-files/*.json",
        },
        "tableReviewRef": "docs/audit/unit53-56-table-review.json",
        "counts": {
            "units": 4,
            "audioRecords": len(audio_records),
            "audioRecordsRecovered": len(audio_records),
            "audioRefsBlocked": 0,
            "confirmedInstructionalImages": len(figure_records),
            "imageReferencesBlockedNativeSource": 0,
            "publishedInstructionalImageAssetsRecovered": len(figure_records),
            "publishedProofs": len(PROOF),
        },
        "validation": {
            "sourceFilesPresentAndSha256Matched": True,
            "publishedAudioObjectIdsMatched": {
                "beforeUnit55Correction": False,
                "afterUnit55Correction": True,
                "matchedCountAfterCorrection": 8,
                "expectedCount": 8,
            },
            "unit55Audio2Correction": {
                "publishedMediaObjectId": "1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQh",
                "exactDriveSourceId": "1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQh",
                "previousTruncatedId": "1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQ",
                "previousTruncatedIdWasNotUsed": True,
                "evidenceRef": "docs/audit/unit53-56-drive-recovery.json",
            },
            "originalDriveDownloadMethod": "visible Google Drive viewer UI",
            "renderedSlidesUsedAsNativeAssets": False,
            "syntheticAudioOrImageUsed": False,
            "semanticListeningKeysAuthored": False,
            "unit55Audio2CorrectedExactId": True,
        },
        "sourceNotes": [
            {
                "kind": "native-presentation",
                "units": [53, 54, 55, 56],
                "status": "unavailable",
                "reason": "No authoritative native PPTX candidate was found. Individual instructional JPEGs were recovered from the visible published deck with pageAssets; nativeIdentityConfirmed remains false.",
                "doNotSubstitute": True,
            }
        ],
        "blockers": [
            {
                "kind": "semantic-listening-review",
                "units": [53, 54, 55, 56],
                "status": "pending",
                "reason": "All eight original audio clips now have source-verified transcripts; no deterministic listening answer keys were authored in this recovery pass.",
                "doNotAutoAuthorKeys": True,
            },
        ],
        "audio": audio_records,
        "images": figure_records,
        "units": unit_data,
        "figureProof": [
            {
                **proof,
                "proofType": "visible-published-slide-plus-page-assets-image",
                "confirmedInstructional": (figure_by_unit_slide.get((proof["unit"], proof["slideNumber"])) is not None),
                "nativeAssetSha256": (figure_by_unit_slide.get((proof["unit"], proof["slideNumber"])) or {}).get("sourceSha256"),
                "sourceAsset": (figure_by_unit_slide.get((proof["unit"], proof["slideNumber"])) or {}).get("nativeTrace"),
                "evidence": "Chrome visible published deck UI showed the picture prompt; documented pageAssets.list + pageAssets.bundle returned and visually confirmed the individual instructional JPEG. The screenshot hash remains audit evidence only.",
            }
            for proof in PROOF
        ],
    }
    save(AUDIT / "course-reviewed-media-extension-53-56.json", media_manifest)

    save(
        AUDIT / "unit53-56-published-figure-extraction.json",
        {
            "schemaVersion": 1,
            "scope": "Individually recovered instructional figures from published Units 53-56 slide 4",
            "sourcePriority": "authoritative published deck visible state",
            "extraction": {
                "method": "Chrome visible published deck + documented pageAssets.list + pageAssets.bundle",
                "wholeSlideScreenshotsAreEvidenceOnly": True,
                "audioIconsAndTemplateLogosExcluded": True,
                "nativeIdentityConfirmed": False,
                "nativeIdentityReason": "No authoritative native presentation bytes were available for Units 53-56.",
            },
            "figures": figure_records,
            "sourceRefs": [
                {
                    "kind": "published-source-identity",
                    "path": "docs/audit/published-source-identity-53-56.json",
                    "sha256": sha256(AUDIT / "published-source-identity-53-56.json"),
                },
                *sorted(published_figure_source_refs.values(), key=lambda ref: ref["path"]),
            ],
        },
    )

    _, unit56_source = find_source_deck(identity["published"]["lesson"]["id"])
    slide8 = slide_for(unit56_source, 8)
    table_review = {
        "schemaVersion": 1,
        "scope": "Published-visible text projection for Unit 56 slide 8",
        "sourcePriority": "published-source-priority; no native presentation identity was available",
        "reviewPolicy": {
            "sourceQuotesRequired": True,
            "nativeShapeProvenanceRequiredWhenNativeExists": True,
            "noInventedCells": True,
            "preserveNotesAsLearnerVisibleText": True,
            "renderedSlideImageNotNativeAsset": True,
        },
        "entries": [
            {
                "unit": 56,
                "lessonId": identity["published"]["lesson"]["id"],
                "sourceSlide": 8,
                "publishedSourceFile": "docs/audit/source-files/cmnmm9wv00032w1qkxr02azgp.json",
                "status": "reviewed-published-source",
                "clearTableSemanticsBlocker": False,
                "review": "Visible published slide shows a two-column STRUCTURES/EXAMPLES table and a separate To Consider note block. Native PPTX is unavailable, so this preserves the visible grouping as a source projection and does not claim native shape identity.",
                "sourceEvidence": {
                    "publishedTitle": slide8["title"],
                    "publishedVisibleTexts": slide8["visibleTexts"],
                    "publishedSlideProof": proof_by_unit_slide[(56, 8)],
                    "publishedVisibleDeckAX": {
                        "slideUrl": "https://docs.google.com/presentation/d/e/2PACX-1vTeRpvarj3bbdc9H6Fb4ZN9IYRDOsyQD_zGgZGqjKQ6Wr5fCgO0Ik7pHhOBoEFWDg/embed?start=false&loop=false&delayms=3000&slide=id.g72967b2bcc_0_86",
                        "observedSlideNumber": 8,
                        "method": "Chrome visible published deck AX state and screenshot",
                        "tableText": "STRUCTURES EXAMPLES Gerunds as nouns + complements Infinitive clauses + complements Relative pronouns Learning quantum physics requires great discipline. To design this crafts will change the way we see space. . What I don’t get is all those references.",
                        "punctuationConfirmed": {
                            "relativePronounExample": "What I don’t get is all those references.",
                            "infinitiveExampleVisibleEnding": "space. .",
                        },
                    },
                    "nativePresentationAvailable": False,
                    "nativeSourceFinding": "No authoritative native presentation candidate in the source folder or published identity HTML.",
                },
                "approvedProjection": {
                    "approved": True,
                    "source": "published-visible-text",
                    "nativeIdentityConfirmed": False,
                    "publishedLayout": "two-column table with a full-width To Consider note block below",
                    "tables": [
                        {
                            "shapeName": "published-visible-text-projection",
                            "shapeId": None,
                            "bbox": None,
                            "rows": [
                                ["STRUCTURES", "EXAMPLES"],
                                ["Gerunds as nouns + complements", "Learning quantum physics requires great discipline."],
                                ["Infinitive clauses + complements", "To design this crafts will change the way we see space. ."],
                                ["Relative pronouns", "What I don\u2019t get is all those references."],
                            ],
                            "literalSourceNote": "The source extraction contains the visible separator `. .` after `space`; it is preserved in the second example rather than silently corrected.",
                        }
                    ],
                    "notes": [
                        {
                            "heading": "To Consider",
                            "text": "1. Having gerunds, infinitive clauses and relative pronouns as subjects is what we called in English nominalization. 2. This nominalization process makes a structure work as the subject of a sentence. 3. Each of the nominalized clause, have specific complements that go before the verb of the sentences 4. Gerunds and Infinitive clauses normally have NOUNS as complements. 5. Relative pronouns work on their own to be the subject of the sentence. 6. This can be used at any tense.",
                        }
                    ],
                },
                "sourceRefs": [
                    {
                        "kind": "published",
                        "path": "docs/audit/source-files/cmnmm9wv00032w1qkxr02azgp.json",
                        "sha256": sha256(AUDIT / "source-files/cmnmm9wv00032w1qkxr02azgp.json"),
                        "slideNumber": 8,
                    },
                    {
                        "kind": "published-html-fetch",
                        "path": "docs/audit/published-source-identity-53-56.json",
                        "sha256": sha256(AUDIT / "published-source-identity-53-56.json"),
                        "publishedHtmlSha256": published_identity["units"]["56"]["fetch"]["sha256"],
                    },
                ],
            }
        ],
    }
    # The composer consumes the shared blocker-classification contract. Keep
    # the legacy root fields for audit readers, while exposing the same review
    # under the required tableReview object for --table-review.
    table_review["tableReview"] = {
        "schemaVersion": 1,
        "purpose": "Manual source-grounded review of the Unit 56 published table projection.",
        "reviewPolicy": {
            "publishedSlidesAuthoritativeOnMismatch": True,
            "sourceQuotesRequired": True,
            "nativeShapeProvenanceRequired": True,
            "noInventedCellsOrExamples": True,
            "preserveExcludedNotesAsLearnerText": True,
            "blockedWhenNativePublishedIdentityIsUnresolved": False,
            "publishedSourceProjectionAllowedWhenNativeDiffers": True,
            "publishedSourceProjectionRequiresLiteralCellQuotes": True,
        },
        "sourceRefs": table_review["entries"][0]["sourceRefs"],
        "entries": table_review["entries"],
        "summary": {
            "auditedCount": 1,
            "approvedProjectionCount": 1,
            "clearTableSemanticsBlockerCount": 1,
            "blockedCount": 0,
            "approvedUnits": [56],
            "blockedUnits": [],
        },
    }
    save(AUDIT / "unit53-56-table-review.json", table_review)


if __name__ == "__main__":
    main()
