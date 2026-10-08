#!/usr/bin/env python3
"""Compare published course decks with every available native PPTX candidate.

This is a read-only source audit.  It searches all records in the native PPTX
audit (including candidates whose filename unit differs from the published
lesson), then records strong text and slide-count evidence before a native
file can be used as a published-deck replacement.  It does not access the
database, Drive, or change any source file.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


DEFAULT_NATIVE = Path("docs/audit/native-pptx-audit.json")
DEFAULT_PUBLISHED = Path("docs/audit/course-source-manifest.json")
DEFAULT_DRIVE = Path("docs/audit/drive-source-manifest.json")
DEFAULT_OUTPUT = Path("docs/audit/native-published-match-review.json")

# These thresholds intentionally require agreement on both decks' text sets,
# sequence, and slide structure.  A topic or filename match alone is not a
# source match because the published versions contain materially revised
# reading passages and activities in Units 33-36.
STRONG_TOKEN_COVERAGE = 0.90
STRONG_TOKEN_PRECISION = 0.90
STRONG_SEQUENCE_RATIO = 0.90


def _normalise(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value)).casefold().replace("�", " ")
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^\w]+", " ", text, flags=re.UNICODE).strip()


def _tokens(value: Any) -> list[str]:
    return _normalise(value).split()


def _published_slide_text(slide: Mapping[str, Any]) -> str:
    return "\n".join(str(value) for value in slide.get("visibleTexts", []) if value).strip()


def _native_slide_text(slide: Mapping[str, Any]) -> str:
    joined = slide.get("joinedText")
    if joined:
        return str(joined).strip()
    return "\n".join(str(value) for value in slide.get("texts", []) if value).strip()


def _published_text(deck: Mapping[str, Any]) -> str:
    return "\n".join(_published_slide_text(slide) for slide in deck.get("slides", []))


def _native_text(native: Mapping[str, Any]) -> str:
    return "\n".join(_native_slide_text(slide) for slide in native.get("slides", []))


def _ratio(left: Sequence[str], right: Sequence[str]) -> float:
    if not left and not right:
        return 1.0
    if not left or not right:
        return 0.0
    # autojunk keeps this bounded for repeated template words in long decks.
    return difflib.SequenceMatcher(None, left, right).ratio()


def _set_metrics(public_tokens: Sequence[str], native_tokens: Sequence[str]) -> tuple[float, float]:
    public_set = set(public_tokens)
    native_set = set(native_tokens)
    intersection = public_set & native_set
    coverage = len(intersection) / len(public_set) if public_set else 1.0
    precision = len(intersection) / len(native_set) if native_set else (1.0 if not public_set else 0.0)
    return coverage, precision


def _slide_differences(public_slides: Sequence[Mapping[str, Any]], native_slides: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    differences: list[dict[str, Any]] = []
    for index in range(max(len(public_slides), len(native_slides))):
        public_tokens = _tokens(_published_slide_text(public_slides[index])) if index < len(public_slides) else []
        native_tokens = _tokens(_native_slide_text(native_slides[index])) if index < len(native_slides) else []
        coverage, precision = _set_metrics(public_tokens, native_tokens)
        exact = coverage >= STRONG_TOKEN_COVERAGE and precision >= STRONG_TOKEN_PRECISION
        if exact:
            continue
        differences.append(
            {
                "slide": index + 1,
                "publishedTokenCount": len(public_tokens),
                "nativeTokenCount": len(native_tokens),
                "tokenCoverage": round(coverage, 6),
                "tokenPrecision": round(precision, 6),
            }
        )
    return differences


def _topic_text(slides: Sequence[Mapping[str, Any]]) -> str:
    # The second published slide is the competency/function topic in this
    # course.  Keep the source wording intact for an audit reviewer.
    return _published_slide_text(slides[1]) if len(slides) > 1 else ""


def _native_topic_text(slides: Sequence[Mapping[str, Any]]) -> str:
    return _native_slide_text(slides[1]) if len(slides) > 1 else ""


def _audio_index(title: str, role: str) -> str | None:
    match = re.search(r"\baudio\s*([12])\b", title, flags=re.IGNORECASE)
    if match:
        return f"audio-{match.group(1)}"
    if role == "self-study" or re.search(r"\bself\s*\.?\s*s(?:tudy)?\b|\bssm\b", title, flags=re.IGNORECASE):
        return "self-study"
    return None


def _audio_context(drive_manifest: Mapping[str, Any], unit: int) -> dict[str, Any] | None:
    record = drive_manifest.get("units", {}).get(str(unit))
    if not isinstance(record, Mapping):
        return None
    presentations = []
    for candidate in record.get("presentationCandidates", []):
        if isinstance(candidate, Mapping):
            presentations.append(
                {
                    "driveFileId": candidate.get("id"),
                    "title": candidate.get("title"),
                    "role": candidate.get("role"),
                    "localPath": candidate.get("localPath"),
                }
            )
    audio = []
    for candidate in record.get("audioCandidates", []):
        if not isinstance(candidate, Mapping):
            continue
        title = str(candidate.get("title", ""))
        audio.append(
            {
                "driveFileId": candidate.get("id"),
                "title": candidate.get("title"),
                "role": candidate.get("role"),
                "filenameIndex": _audio_index(title, str(candidate.get("role", ""))),
                "localPath": candidate.get("localPath"),
            }
        )
    return {
        "presentationCandidates": presentations,
        "audioCandidates": audio,
        "audioIndexEvidence": "filename-derived Audio 1/Audio 2/self-study labels only; no slide-to-file mapping is asserted",
    }


def _candidate_score(public: Mapping[str, Any], record: Mapping[str, Any]) -> dict[str, Any]:
    deck = public["deck"]
    native = record.get("native", {})
    public_tokens = _tokens(_published_text(deck))
    native_tokens = _tokens(_native_text(native))
    coverage, precision = _set_metrics(public_tokens, native_tokens)
    sequence = _ratio(public_tokens, native_tokens)
    public_title_tokens = set(_tokens(str(deck.get("deckTitle", "")).replace(".pptx", "")))
    native_title_tokens = set(_tokens(record.get("candidate", {}).get("title", "").replace(".pptx", "")))
    title_overlap = len(public_title_tokens & native_title_tokens) / len(public_title_tokens) if public_title_tokens else 1.0
    public_slides = deck.get("slides", [])
    native_slides = native.get("slides", [])
    differences = _slide_differences(public_slides, native_slides)
    slide_count = native.get("slideCount", len(native_slides))
    exact_slide_count = len(public_slides) == len(native_slides) == int(deck.get("slideCount", len(public_slides)))
    strong = bool(
        exact_slide_count
        and coverage >= STRONG_TOKEN_COVERAGE
        and precision >= STRONG_TOKEN_PRECISION
        and sequence >= STRONG_SEQUENCE_RATIO
        and not differences
    )
    candidate = record.get("candidate", {})
    return {
        "candidateId": candidate.get("id"),
        "driveFileId": candidate.get("id"),
        "candidateUnit": record.get("unit"),
        "role": candidate.get("role"),
        "title": candidate.get("title"),
        "topicText": _native_topic_text(native.get("slides", [])),
        "localPath": candidate.get("localPath"),
        "nativeSlideCount": slide_count,
        "publishedSlideCount": deck.get("slideCount", len(public_slides)),
        "exactSlideCount": exact_slide_count,
        "tokenCoverage": round(coverage, 6),
        "tokenPrecision": round(precision, 6),
        "sequenceRatio": round(sequence, 6),
        "titleTokenOverlap": round(title_overlap, 6),
        "slideDifferenceCount": len(differences),
        "differenceSlides": [difference["slide"] for difference in differences],
        "strongTextSetMatch": strong,
    }


def _published_sources(manifest: Mapping[str, Any]) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for source in manifest.get("sources", []):
        lesson = source.get("lesson", {})
        match = re.fullmatch(r"Unit\s+(\d+)", str(lesson.get("title", "")))
        if match:
            yield int(match.group(1)), source


def build_review(
    native_manifest: Mapping[str, Any],
    published_manifest: Mapping[str, Any],
    drive_manifest: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    records = [record for record in native_manifest.get("records", []) if record.get("candidate") and record.get("native")]
    published = dict(_published_sources(published_manifest))
    targets: dict[str, Any] = {}
    for unit in (33, 34, 35, 36):
        source = published.get(unit)
        if source is None:
            continue
        deck = source["deck"]
        scores = [_candidate_score(source, record) for record in records]
        scores.sort(
            key=lambda score: (
                -int(score["strongTextSetMatch"]),
                -score["tokenCoverage"],
                -score["tokenPrecision"],
                -score["sequenceRatio"],
                -score["titleTokenOverlap"],
                score["candidateUnit"] if score["candidateUnit"] is not None else 999,
                score["candidateId"] or "",
            )
        )
        best = scores[0] if scores else None
        selected = best if best and best["strongTextSetMatch"] else None
        same_unit = next((score for score in scores if score["candidateUnit"] == unit and score["role"] == "primary-candidate"), None)
        blocker = None
        if selected is None:
            if best:
                blocker = (
                    "No native candidate meets the strong text-set threshold across all 69 records; "
                    f"best candidate is Unit {best['candidateUnit']} {best['title']!r} with "
                    f"coverage {best['tokenCoverage']:.3f}, precision {best['tokenPrecision']:.3f}, "
                    f"sequence {best['sequenceRatio']:.3f}, and difference slides {best['differenceSlides']}."
                )
            else:
                blocker = "No native candidates were available for comparison."
        topic = _topic_text(deck.get("slides", []))
        target: dict[str, Any] = {
            "published": {
                "unit": unit,
                "module": source.get("module"),
                "lesson": source.get("lesson"),
                "contentId": source.get("contentId"),
                "deckTitle": deck.get("deckTitle"),
                "sourceUrl": source.get("sourceUrl"),
                "slideCount": deck.get("slideCount"),
                "topicText": topic,
            },
            "candidateCount": len(scores),
            "bestCandidate": best,
            "sameUnitPrimaryCandidate": same_unit,
            "selectedStrongMatch": selected,
            "blocker": blocker,
            "candidateScores": scores,
        }
        if drive_manifest is not None:
            target["driveContext"] = _audio_context(drive_manifest, unit)
        targets[str(unit)] = target
    return {
        "schemaVersion": 1,
        "scope": {
            "nativeAudit": str(DEFAULT_NATIVE).replace("\\", "/"),
            "publishedManifest": str(DEFAULT_PUBLISHED).replace("\\", "/"),
            "searchedNativeRecords": len(records),
            "searchedNativeRecordsUnits21To52": sum(21 <= record.get("unit", 0) <= 52 for record in records),
            "searchedNativeUnits": sorted({record.get("unit") for record in records if record.get("unit") is not None}),
            "targetUnits": [33, 34, 35, 36],
            "publishedDecksAreAuthoritativeOnMismatch": True,
        },
        "thresholds": {
            "tokenCoverage": STRONG_TOKEN_COVERAGE,
            "tokenPrecision": STRONG_TOKEN_PRECISION,
            "sequenceRatio": STRONG_SEQUENCE_RATIO,
            "requiredExactSlideCount": True,
            "requiredZeroDifferenceSlides": True,
        },
        "targets": targets,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", type=Path, default=DEFAULT_NATIVE)
    parser.add_argument("--published", type=Path, default=DEFAULT_PUBLISHED)
    parser.add_argument("--drive", type=Path, default=DEFAULT_DRIVE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    native = json.loads(args.native.read_text(encoding="utf-8"))
    published = json.loads(args.published.read_text(encoding="utf-8"))
    drive = json.loads(args.drive.read_text(encoding="utf-8")) if args.drive.exists() else None
    result = build_review(native, published, drive)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "targets": list(result["targets"]), "searched": result["scope"]["searchedNativeRecords"]}))


if __name__ == "__main__":
    main()
