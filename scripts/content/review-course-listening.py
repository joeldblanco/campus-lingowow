"""Align published listening prompts with reviewed course-audio transcripts.

This is an audit-only adapter. It reads the published exercise review and the
transcript aggregate, then writes a review index. It never edits the source
exercise archive or creates/replaces audio. Audio assignment is based on
published slide context: the opening listening is normally Audio 1 and a
later comprehension listening is normally Audio 2. Teacher-led vocabulary
and role-play prompts stay blocked when the published source has no matching
audio, and the Unit 3 generic file remains a review candidate rather than a
substitute for its missing explicit Audio 1.
"""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
DEFAULT_OUTPUT = Path("docs/audit/course-listening-review.json")
DEFAULT_EXERCISE_REVIEW = Path("docs/audit/course-exercise-review.json")
DEFAULT_TRANSCRIPTS = Path("docs/audit/course-audio-transcripts/course-audio-transcripts.json")

EXPLICIT_INDEX_RE = re.compile(r"(?i)\baudio\s*(?:number|#)?\s*([123])\b")
TF_MARKER_RE = re.compile(r"(?i)\(\s*t\s*\).*?\(\s*f\s*\)|\btrue\s+or\s+false\b")
NUMBERED_CLAIM_RE = re.compile(r"(?:^|\s)(\d+)\.\s*(.+?)(?=\s+\d+\.\s*|$)")
WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "do",
    "does",
    "for",
    "he",
    "her",
    "him",
    "his",
    "i",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "she",
    "that",
    "the",
    "their",
    "them",
    "they",
    "this",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "who",
    "with",
    "you",
    "your",
}
NEGATION_WORDS = {
    "cannot",
    "can't",
    "didn't",
    "doesn't",
    "don't",
    "hardly",
    "never",
    "no",
    "not",
    "nothing",
    "won't",
}
TOKEN_ALIASES = {
    "am": "be",
    "are": "be",
    "called": "call",
    "comes": "come",
    "coming": "come",
    "dad": "father",
    "dads": "father",
    "did": "do",
    "does": "do",
    "doing": "do",
    "fathers": "father",
    "has": "have",
    "having": "have",
    "is": "be",
    "kids": "kid",
    "lives": "live",
    "mothers": "mother",
    "mom": "mother",
    "moms": "mother",
    "parents": "parent",
    "speaks": "speak",
    "talking": "talk",
    "wants": "want",
}
OPPOSITE_TERMS = {
    "visit": {"work"},
    "work": {"visit"},
}


class ListeningReviewError(ValueError):
    """Raised when an audit input does not satisfy the expected contract."""


def _read_json(path: Path, description: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ListeningReviewError(f"could not read {description} {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ListeningReviewError(f"{description} must be a JSON object")
    return payload


def _unit(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ListeningReviewError("lesson unit must be an integer")
    return value


def _slide_number(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ListeningReviewError(f"slide number is not an integer: {value!r}") from exc


def _text_blob(slide: Mapping[str, Any], item: Mapping[str, Any]) -> str:
    source = slide.get("source") if isinstance(slide.get("source"), Mapping) else {}
    visible = source.get("visibleTexts") if isinstance(source.get("visibleTexts"), list) else []
    parts = [str(source.get("title", "")), *[str(value) for value in visible], str(item.get("prompt", ""))]
    return " ".join(part for part in parts if part).strip()


def _source_audio_count(slide: Mapping[str, Any]) -> int:
    source = slide.get("source") if isinstance(slide.get("source"), Mapping) else {}
    media = source.get("mediaSummary") if isinstance(source.get("mediaSummary"), Mapping) else {}
    value = media.get("audioIconCount", 0)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0


def _normalise_prompt(value: str) -> str:
    # Emojis and source labels are presentation noise. Keeping words makes
    # duplicated parser records (for example Unit 4 slide 4/5) share audio.
    return " ".join(WORD_RE.findall(value.casefold()))


def _explicit_audio_index(text: str) -> int | None:
    match = EXPLICIT_INDEX_RE.search(text)
    return int(match.group(1)) if match else None


def _role(slide_number: int, text: str) -> str:
    lower = text.casefold()
    if "listen to your teacher" in lower and not any(
        token in lower for token in ("listen to the audio", "listen to an audio", "listen to the conversation")
    ):
        if any(token in lower for token in ("repeat", "vocabulary", "words", "phrases", "expressions")):
            return "vocabulary-repeat"
        return "teacher-roleplay"
    # The first listening in a lesson is the opening/topic activity even when
    # its question says "answer" or "tell your teacher" rather than naming
    # the topic explicitly.
    if slide_number <= 5:
        return "intro"
    if any(
        token in lower
        for token in ("answer", "complete", "extract", "identify", "classify", "report", "listen to ")
    ):
        return "comprehension"
    if slide_number <= 5:
        return "intro"
    return "other-audio"


def _extract_tf_claims(visible_texts: Sequence[Any]) -> list[str]:
    combined = " ".join(str(value) for value in visible_texts)
    marker = TF_MARKER_RE.search(combined)
    if not marker:
        return []
    # Parse numbered statements from the full slide text. Starting at the
    # first answer marker would discard statement 1 because its marker comes
    # after the statement text.
    tail = re.sub(r"(?i)\(\s*t\s*\)|\(\s*f\s*\)", "", combined)
    claims: list[tuple[int, str]] = []
    for match in NUMBERED_CLAIM_RE.finditer(tail):
        claim = " ".join(match.group(2).split()).strip(" .")
        if claim:
            claims.append((int(match.group(1)), claim))
    return [claim for _, claim in sorted(claims)]


def _tokens(value: str, *, keep_negation: bool = False) -> list[str]:
    result: list[str] = []
    for raw in WORD_RE.findall(value.casefold()):
        token = TOKEN_ALIASES.get(raw, raw)
        if token in NEGATION_WORDS:
            if keep_negation:
                result.append(token)
            continue
        if token in STOP_WORDS:
            continue
        result.append(token)
    return result


def _has_sequence(haystack: Sequence[str], needle: Sequence[str], *, gap: int = 2) -> bool:
    if not needle:
        return False
    if len(needle) == 1:
        return False
    for start, value in enumerate(haystack):
        if value != needle[0]:
            continue
        cursor = start
        matched = 1
        for target in needle[1:]:
            found = False
            for index in range(cursor + 1, min(len(haystack), cursor + gap + 2)):
                if haystack[index] == target:
                    cursor = index
                    matched += 1
                    found = True
                    break
            if not found:
                break
        if matched == len(needle):
            return True
    return False


def _evidence_segment(transcript: Mapping[str, Any], claim: str) -> str | None:
    claim_tokens = _tokens(claim)
    if len(claim_tokens) < 2:
        return None
    for segment in transcript.get("segments", []):
        if not isinstance(segment, Mapping):
            continue
        text = str(segment.get("text", ""))
        if _has_sequence(_tokens(text), claim_tokens) or _has_sequence(
            _tokens(text), [TOKEN_ALIASES.get(token, token) for token in claim_tokens]
        ):
            return text.strip() or None
    # A pronoun or tense variation may prevent a segment-local match. A
    # document-level phrase is still useful as review evidence.
    if _has_sequence(_tokens(str(transcript.get("text", ""))), claim_tokens):
        return str(transcript.get("text", "")).strip() or None
    return None


def _opposition_evidence(transcript: Mapping[str, Any], claim_tokens: Sequence[str]) -> str | None:
    """Find a narrow, shared-anchor contradiction such as USA/work vs USA/visit."""

    segments = [segment for segment in transcript.get("segments", []) if isinstance(segment, Mapping)]
    for segment in segments:
        if not isinstance(segment, Mapping):
            continue
        text = str(segment.get("text", ""))
        segment_tokens = _tokens(text)
        shared = set(claim_tokens) & set(segment_tokens)
        if not shared:
            continue
        for claim_token in claim_tokens:
            opposites = OPPOSITE_TERMS.get(claim_token, set())
            if opposites & set(segment_tokens):
                return text.strip() or None
    # Some short dialogues state the shared context and the opposing purpose
    # in adjacent segments (for example USA/work versus visit). Preserve the
    # conservative shared-anchor requirement at document level.
    all_tokens = _tokens(str(transcript.get("text", "")))
    if set(claim_tokens) & set(all_tokens):
        for claim_token in claim_tokens:
            opposites = OPPOSITE_TERMS.get(claim_token, set())
            if opposites & set(all_tokens):
                for segment in segments:
                    segment_tokens = _tokens(str(segment.get("text", "")))
                    if opposites & set(segment_tokens):
                        return str(segment.get("text", "")).strip() or None
    return None


def resolve_tf_claim(claim: str, transcript: Mapping[str, Any]) -> dict[str, Any]:
    """Resolve only direct transcript support/contradiction.

    A missing relation remains ``not-stated``. The resolver deliberately does
    not turn a missing detail into ``false``; a teacher or editor can review
    the source evidence later.
    """

    claim_tokens = _tokens(claim)
    transcript_text = str(transcript.get("text", ""))
    transcript_tokens = _tokens(transcript_text)
    transcript_tokens_with_negation = _tokens(transcript_text, keep_negation=True)
    claim_with_negation = _tokens(claim, keep_negation=True)
    claim_is_negative = any(token in NEGATION_WORDS for token in claim_with_negation)
    support = _has_sequence(transcript_tokens, claim_tokens)
    evidence = _evidence_segment(transcript, claim)

    if support:
        if claim_is_negative:
            return {
                "correct": "false",
                "resolution": "contradicted",
                "evidence": evidence,
                "evidenceType": "transcript-contradiction",
                "manualReview": False,
            }
        return {
            "correct": "true",
            "resolution": "supported",
            "evidence": evidence,
            "evidenceType": "transcript-support",
            "manualReview": False,
        }

    # A negative claim is false only when its positive wording appears in the
    # transcript; a positive claim is false only when an explicit negation is
    # attached to the same phrase.
    if claim_is_negative:
        positive_tokens = [token for token in claim_tokens if token not in NEGATION_WORDS]
        if _has_sequence(transcript_tokens, positive_tokens):
            return {
                "correct": "false",
                "resolution": "contradicted",
                "evidence": _evidence_segment(transcript, " ".join(positive_tokens)),
                "evidenceType": "transcript-contradiction",
                "manualReview": False,
            }
    else:
        if len(claim_tokens) >= 2:
            for start in range(len(transcript_tokens_with_negation)):
                if transcript_tokens_with_negation[start] not in (
                    "not",
                    "never",
                    "no",
                    "don't",
                    "doesn't",
                    "didn't",
                    "won't",
                ):
                    continue
                if _has_sequence(transcript_tokens_with_negation[start + 1 :], claim_tokens):
                    return {
                        "correct": "false",
                        "resolution": "contradicted",
                        "evidence": _evidence_segment(transcript, " ".join(claim_tokens)),
                        "evidenceType": "transcript-contradiction",
                        "manualReview": False,
                    }
            opposition_evidence = _opposition_evidence(transcript, claim_tokens)
            if opposition_evidence:
                return {
                    "correct": "false",
                    "resolution": "contradicted",
                    "evidence": opposition_evidence,
                    "evidenceType": "transcript-contradiction",
                    "manualReview": False,
                }

    return {
        "correct": "not-stated",
        "resolution": "unsupported-by-transcript",
        "evidence": None,
        "evidenceType": "unsupported",
        "manualReview": True,
    }


def _confidence_flags(transcript: Mapping[str, Any]) -> list[str]:
    flags: list[str] = []
    try:
        if float(transcript.get("languageProbability", 1.0)) < 0.9:
            flags.append("low-language-probability")
        if float(transcript.get("avgLogprob", 0.0)) < -0.3:
            flags.append("low-transcript-confidence")
    except (TypeError, ValueError):
        flags.append("missing-confidence-metadata")
    for segment in transcript.get("segments", []):
        try:
            if float(segment.get("avgLogprob", 0.0)) < -0.6:
                flags.append("low-confidence-clause")
                break
        except (AttributeError, TypeError, ValueError):
            flags.append("missing-segment-confidence")
            break
    return flags


def _iter_listening_items(exercise_review: Mapping[str, Any]) -> Iterable[dict[str, Any]]:
    lessons = exercise_review.get("lessons")
    if not isinstance(lessons, Mapping):
        raise ListeningReviewError("exercise review must contain a lessons object")
    for lesson_id, lesson in sorted(lessons.items(), key=lambda pair: (_unit(pair[1].get("unit")), str(pair[0]))):
        if not isinstance(lesson, Mapping):
            continue
        slides = lesson.get("slides")
        if not isinstance(slides, Mapping):
            continue
        for raw_slide, slide in sorted(slides.items(), key=lambda pair: _slide_number(pair[0])):
            if not isinstance(slide, Mapping):
                continue
            number = _slide_number(raw_slide)
            items = slide.get("items")
            if not isinstance(items, list):
                continue
            for item_position, item in enumerate(items):
                if not isinstance(item, Mapping) or item.get("kind") != "listening":
                    continue
                yield {
                    "lessonId": str(lesson_id),
                    "unit": _unit(lesson.get("unit")),
                    "lessonTitle": str(lesson.get("lessonTitle", "")),
                    "slideNumber": number,
                    "itemPosition": item_position,
                    "item": item,
                    "slide": slide,
                }


def _assign_audio_context(entries: list[dict[str, Any]]) -> None:
    """Assign roles/indexes in place, preserving source context and order."""

    by_unit: dict[int, list[dict[str, Any]]] = {}
    for entry in entries:
        by_unit.setdefault(entry["unit"], []).append(entry)

    for unit_entries in by_unit.values():
        unit_entries.sort(key=lambda entry: (entry["slideNumber"], entry["itemPosition"], entry["item"]["id"]))
        for entry in unit_entries:
            item = entry["item"]
            text = _text_blob(entry["slide"], item)
            entry["sourceText"] = text
            entry["sourceAudioIconCount"] = _source_audio_count(entry["slide"])
            entry["role"] = _role(entry["slideNumber"], text)
            entry["explicitAudioIndex"] = _explicit_audio_index(text)
            entry["promptSignature"] = _normalise_prompt(str(item.get("prompt", "")))
            item_id = str(item.get("id", ""))
            source_match = re.match(r"^(u\d+-s\d+)", item_id, flags=re.IGNORECASE)
            entry["sourceSlideSignature"] = source_match.group(1).casefold() if source_match else None

        # A deck extractor can emit the same listening prompt on adjacent
        # slides. Use the record with an audio icon as the source context and
        # map its duplicate to the same index.
        groups: dict[str, list[dict[str, Any]]] = {}
        for entry in unit_entries:
            if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
                continue
            group_key = entry["sourceSlideSignature"] or entry["promptSignature"]
            groups.setdefault(group_key, []).append(entry)
        duplicate_group: dict[int, list[dict[str, Any]]] = {}
        for group in groups.values():
            if len(group) > 1:
                for entry in group:
                    duplicate_group[id(entry)] = group

        next_index = 1
        used: set[int] = set()
        for entry in unit_entries:
            if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
                entry["audioIndex"] = None
                entry["mappingBasis"] = "teacher-led-source-context"
                continue
            explicit = entry["explicitAudioIndex"]
            if explicit is not None:
                assigned = explicit
                basis = "explicit-source-label"
            elif id(entry) in duplicate_group:
                source_group = duplicate_group[id(entry)]
                source_entry = next((candidate for candidate in source_group if candidate["sourceAudioIconCount"] > 0), source_group[0])
                previous = source_entry.get("audioIndex")
                if isinstance(previous, int):
                    assigned = previous
                    basis = "adjacent-duplicate-source-context"
                else:
                    assigned = 1 if source_entry["role"] == "intro" else max(2, next_index)
                    basis = "adjacent-duplicate-source-context"
            elif entry["role"] == "intro":
                assigned = 1
                basis = "opening-slide-context"
            elif entry["role"] == "comprehension":
                assigned = max(2, next_index)
                basis = "comprehension-slide-context"
            else:
                assigned = next_index
                basis = "ordered-source-context"
            entry["audioIndex"] = assigned
            entry["mappingBasis"] = basis
            used.add(assigned)
            next_index = max(next_index, assigned + 1)

        # Propagate a duplicate's resolved index after the first pass. This is
        # needed when the duplicate appears before the source-icon record.
        for group in duplicate_group.values():
            assigned = next((entry.get("audioIndex") for entry in group if isinstance(entry.get("audioIndex"), int)), None)
            if assigned is not None:
                for entry in group:
                    if entry["role"] not in {"vocabulary-repeat", "teacher-roleplay"}:
                        entry["audioIndex"] = assigned


def _transcript_ref(transcript: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "unit": transcript.get("unit"),
        "audioIndex": transcript.get("audioIndex"),
        "sourceFilename": transcript.get("sourceFilename"),
        "sourcePath": transcript.get("sourcePath"),
        "sourceSha256": transcript.get("sourceSha256"),
        "sourceBytes": transcript.get("sourceBytes"),
        "language": transcript.get("language"),
        "languageProbability": transcript.get("languageProbability"),
        "avgLogprob": transcript.get("avgLogprob"),
        "text": transcript.get("text", ""),
    }


def build_review(exercise_review: Mapping[str, Any], transcripts: Mapping[str, Any]) -> dict[str, Any]:
    """Build an immutable, source-linked listening review index."""

    transcript_rows = transcripts.get("transcripts")
    if not isinstance(transcript_rows, list):
        raise ListeningReviewError("transcript aggregate must contain a transcripts array")
    transcript_by_key: dict[tuple[int, int], Mapping[str, Any]] = {}
    for transcript in transcript_rows:
        if not isinstance(transcript, Mapping):
            continue
        unit = _unit(transcript.get("unit"))
        index = transcript.get("audioIndex")
        if not isinstance(index, int):
            continue
        transcript_by_key[(unit, index)] = transcript

    entries = list(_iter_listening_items(exercise_review))
    _assign_audio_context(entries)
    records: list[dict[str, Any]] = []

    for entry in entries:
        item = entry["item"]
        unit = entry["unit"]
        audio_index = entry["audioIndex"]
        transcript = transcript_by_key.get((unit, audio_index)) if isinstance(audio_index, int) else None
        confidence_flags = _confidence_flags(transcript) if transcript else []
        item_prompt = str(item.get("prompt", ""))
        tf_claims = (
            _extract_tf_claims(
                (entry["slide"].get("source") or {}).get("visibleTexts", [])
                if isinstance(entry["slide"].get("source"), Mapping)
                else []
            )
            if TF_MARKER_RE.search(item_prompt)
            else []
        )
        questions: list[dict[str, Any]] = []
        for claim in tf_claims:
            result = resolve_tf_claim(claim, transcript) if transcript else {
                "correct": None,
                "resolution": "blocked-awaiting-transcript",
                "evidence": None,
                "evidenceType": "no-transcript",
                "manualReview": True,
            }
            questions.append(
                {
                    "prompt": str(item.get("prompt", "")),
                    "question": claim,
                    **result,
                    "audioSha256": transcript.get("sourceSha256") if transcript else None,
                }
            )

        if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
            status = "blocked-teacher-led-no-source-audio"
            manual = True
        elif transcript is None:
            if unit == 3 and audio_index == 1:
                status = "blocked-candidate-only"
            elif unit >= 53:
                status = "blocked-unit-audio-unavailable"
            else:
                status = "blocked-missing-transcript"
            manual = True
        else:
            manual = bool(confidence_flags) or any(question.get("manualReview") for question in questions)
            status = "matched-awaiting-manual-review" if manual else "matched-review"

        records.append(
            {
                "key": {
                    "lessonId": entry["lessonId"],
                    "slideNumber": entry["slideNumber"],
                    "itemId": item.get("id"),
                    "unit": unit,
                    "audioIndex": audio_index,
                },
                "lessonId": entry["lessonId"],
                "unit": unit,
                "lessonTitle": entry["lessonTitle"],
                "slideNumber": entry["slideNumber"],
                "itemId": item.get("id"),
                "prompt": item.get("prompt", ""),
                "responseMode": item.get("responseMode"),
                "role": entry["role"],
                "audioIndex": audio_index,
                "mappingBasis": entry["mappingBasis"],
                "sourceAudioIconCount": entry["sourceAudioIconCount"],
                "sourceEvidence": item.get("sourceEvidence", []),
                "transcript": _transcript_ref(transcript) if transcript else None,
                "uncertaintyFlags": confidence_flags,
                "manualReviewRequired": manual,
                "reviewStatus": status,
                "questions": questions,
                "revision": None,
            }
        )

    counts: dict[str, int] = {
        "listeningItems": len(records),
        "matchedReview": sum(record["reviewStatus"] == "matched-review" for record in records),
        "matchedAwaitingManualReview": sum(record["reviewStatus"] == "matched-awaiting-manual-review" for record in records),
        "blockedMissingTranscript": sum(record["reviewStatus"] == "blocked-missing-transcript" for record in records),
        "blockedCandidateOnly": sum(record["reviewStatus"] == "blocked-candidate-only" for record in records),
        "blockedTeacherLedNoSourceAudio": sum(record["reviewStatus"] == "blocked-teacher-led-no-source-audio" for record in records),
        "blockedUnitAudioUnavailable": sum(record["reviewStatus"] == "blocked-unit-audio-unavailable" for record in records),
        "tfQuestions": sum(len(record["questions"]) for record in records),
        "tfSupported": sum(question["resolution"] == "supported" for record in records for question in record["questions"]),
        "tfContradicted": sum(question["resolution"] == "contradicted" for record in records for question in record["questions"]),
        "tfNotStated": sum(question["resolution"] == "unsupported-by-transcript" for record in records for question in record["questions"]),
    }
    return {
        "schemaVersion": 1,
        "courseId": str(exercise_review.get("courseId", COURSE_ID)),
        "sourcePolicy": {
            "exerciseReview": "read-only published course-exercise-review.json",
            "transcripts": "read-only course-audio-transcripts.json; source SHA is retained per match",
            "audioAssignment": "opening context Audio 1; later comprehension context Audio 2; explicit labels win",
            "unsupportedClaims": "not-stated and manual review; never auto-false",
            "sourceMutation": "none; no audio generation, replacement, or archive edits",
        },
        "counts": counts,
        "items": records,
    }


def write_json_atomic(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exercise-review", type=Path, default=DEFAULT_EXERCISE_REVIEW)
    parser.add_argument("--transcripts", type=Path, default=DEFAULT_TRANSCRIPTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)
    exercise_review = _read_json(args.exercise_review, "exercise review")
    transcripts = _read_json(args.transcripts, "transcript aggregate")
    output = build_review(exercise_review, transcripts)
    write_json_atomic(args.output, output)
    print(json.dumps({"output": args.output.as_posix(), **output["counts"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
