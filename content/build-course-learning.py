#!/usr/bin/env python3
"""Build deterministic, reviewable guided-learning plans from published slides.

The builder is deliberately data-only.  It reads an existing course snapshot,
reads the published source extraction, and emits plans that can be inspected by
the caller before any database operation is considered.  A plan is marked
unpublishable whenever an authored listening asset cannot be traced to an
original URL, digest, and transcript.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
LEARNING_REVISION = "course-guided-v1"
ROW_ID_PREFIX = "course-guided-"


class PlanError(ValueError):
    """Raised when an input cannot be safely interpreted as a course plan."""


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise(value: Any) -> str:
    return re.sub(r"\s+", " ", _text(value)).strip()


def _unique_texts(values: Iterable[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = _normalise(value)
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _canonical_digest(value: Any) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _source_digest(source: Mapping[str, Any]) -> str:
    for key in ("sourceDigest", "digest", "sha256"):
        candidate = _text(source.get(key))
        if candidate:
            return candidate
    without_digest = {
        key: value
        for key, value in source.items()
        if key not in {"sourceDigest", "digest", "sha256", "_sourceFile"}
    }
    return _canonical_digest(without_digest)


def _lesson_id(lesson: Mapping[str, Any]) -> str:
    for key in ("id", "lessonId", "contentId"):
        value = _text(lesson.get(key))
        if value:
            return value
    raise PlanError("lesson has no stable id")


def _source_lesson_id(source: Mapping[str, Any]) -> str:
    lesson = source.get("lesson")
    if isinstance(lesson, Mapping):
        value = _text(lesson.get("id") or lesson.get("lessonId") or lesson.get("contentId"))
        if value:
            return value
    for key in ("lessonId", "contentId"):
        value = _text(source.get(key))
        if value:
            return value
    raise PlanError("source record has no stable lesson id")


def _source_url(source: Mapping[str, Any]) -> str:
    for key in ("sourceUrl", "url", "publishedUrl"):
        value = _text(source.get(key))
        if value:
            return value
    deck = source.get("deck")
    if isinstance(deck, Mapping):
        return _text(deck.get("sourceUrl"))
    return ""


def _deck(source: Mapping[str, Any]) -> Mapping[str, Any]:
    deck = source.get("deck")
    return deck if isinstance(deck, Mapping) else source


def _slides(source: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    raw = _deck(source).get("slides", source.get("slides", []))
    result = [item for item in _as_list(raw) if isinstance(item, Mapping)]
    return sorted(result, key=lambda item: (_slide_number(item), _text(item.get("title"))))


def _slide_number(slide: Mapping[str, Any]) -> int:
    for key in ("number", "slideNumber", "slide", "index"):
        value = slide.get(key)
        if isinstance(value, bool):
            continue
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        return number
    return 0


def _slide_texts(slide: Mapping[str, Any]) -> list[str]:
    values: list[Any] = []
    values.extend(_as_list(slide.get("visibleTexts")))
    values.extend(_as_list(slide.get("texts")))
    if not values and slide.get("text") is not None:
        values.append(slide.get("text"))
    title = _text(slide.get("title"))
    result = _unique_texts(values)
    if title and title not in result:
        result.insert(0, title)
    return result


_TECHNICAL_LABELS = {
    "introduction",
    "vocabulary introduction",
    "grammar analysis",
    "grammar focus",
    "language use",
    "language targets",
    "language bricks",
    "functional english",
    "let's practice",
    "practice makes perfect",
    "contents",
    "content",
    "copyright",
}


def _is_technical_text(value: str) -> bool:
    lowered = _normalise(value).casefold()
    if not lowered:
        return True
    if lowered in _TECHNICAL_LABELS:
        return True
    if re.fullmatch(r"(?:unit\s*)?\d{1,3}", lowered):
        return True
    if "all rights reserved" in lowered or lowered.startswith("©") or lowered.startswith("copyright"):
        return True
    if re.fullmatch(r"(?:slide\s*)?\d{1,3}", lowered):
        return True
    return False


def _meaningful_texts(slide: Mapping[str, Any]) -> list[str]:
    texts = _slide_texts(slide)
    title = _normalise(slide.get("title"))
    result: list[str] = []
    title_removed = False
    for value in texts:
        if title and value == title and not title_removed:
            title_removed = True
            if not _is_technical_text(value):
                result.append(value)
            continue
        if not _is_technical_text(value):
            result.append(value)
    return _unique_texts(result)


def _tables(slide: Mapping[str, Any]) -> list[list[list[str]]]:
    raw_tables = slide.get("tables")
    if raw_tables is None and isinstance(slide.get("table"), Mapping):
        raw_tables = [slide.get("table")]
    result: list[list[list[str]]] = []
    for raw_table in _as_list(raw_tables):
        if isinstance(raw_table, Mapping):
            raw_rows = raw_table.get("rows", raw_table.get("cells", []))
        else:
            raw_rows = raw_table
        rows: list[list[str]] = []
        for raw_row in _as_list(raw_rows):
            if isinstance(raw_row, Mapping):
                raw_row = raw_row.get("cells", raw_row.get("values", []))
            cells = [_normalise(cell) for cell in _as_list(raw_row)]
            if cells and any(cells):
                rows.append(cells)
        if rows:
            result.append(rows)
    return result


def _media(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for item in _as_list(slide.get("media")) + _as_list(slide.get("audio")):
        if isinstance(item, Mapping):
            result.append(item)
        elif _text(item):
            result.append({"url": _text(item), "kind": "audio"})
    summary = slide.get("mediaSummary")
    if isinstance(summary, Mapping):
        for key in ("audioUrls", "audio", "audios"):
            for value in _as_list(summary.get(key)):
                if isinstance(value, Mapping):
                    result.append(value)
                elif _text(value):
                    result.append({"url": _text(value), "kind": "audio"})
        icon_count = summary.get("audioIconCount")
        try:
            if int(icon_count or 0) > 0 and not any(_media_kind(item) == "audio" for item in result):
                result.append({"kind": "audio", "iconOnly": True})
        except (TypeError, ValueError):
            pass
    return result


def _media_kind(item: Mapping[str, Any]) -> str:
    kind = _normalise(item.get("kind") or item.get("type") or "").casefold()
    if "audio" in kind or "sound" in kind:
        return "audio"
    return kind


def _is_audio_required(slide: Mapping[str, Any]) -> bool:
    if any(_media_kind(item) == "audio" for item in _media(slide)):
        return True
    lowered = " ".join(_meaningful_texts(slide)).casefold()
    return bool(re.search(r"\b(?:listen|audio|hear)\b", lowered)) and (
        "audio" in lowered or "listen to" in lowered or "listen for" in lowered
    )


def _audio_url(item: Mapping[str, Any]) -> str:
    for key in ("originalMediaUrl", "originalMediaURL", "mediaUrl", "mediaURL", "url", "sourceUrl", "href"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _audio_digest(item: Mapping[str, Any]) -> str:
    for key in ("mediaDigest", "digest", "sha256", "mediaSHA256", "sha256Digest", "sourceDigest"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _audio_transcript(item: Mapping[str, Any]) -> str:
    for key in ("transcript", "transcription", "transcriptText", "text"):
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _audio_manifest_entries(
    manifest: Any,
    lesson_id: str,
    slide_number: int,
) -> list[Mapping[str, Any]]:
    if manifest is None:
        return []
    candidates: list[Mapping[str, Any]] = []

    def visit(value: Any, inherited_lesson: str = "", inherited_slide: int | None = None) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item, inherited_lesson, inherited_slide)
            return
        if not isinstance(value, Mapping):
            return
        candidate = dict(value)
        candidate_lesson = _text(
            candidate.get("lessonId") or candidate.get("sourceLessonId") or candidate.get("contentId") or inherited_lesson
        )
        candidate_slide = candidate.get("slideNumber", candidate.get("slide", candidate.get("slideNo", inherited_slide)))
        if _audio_url(candidate) or _audio_transcript(candidate) or _audio_digest(candidate):
            if candidate_lesson:
                candidate["lessonId"] = candidate_lesson
            if candidate_slide is not None:
                candidate["slideNumber"] = candidate_slide
            candidates.append(candidate)
            return
        for key, child in value.items():
            lowered = _text(key).casefold()
            if lowered in {"audio", "audios", "entries", "media", "units", "lessons"}:
                visit(child, inherited_lesson, inherited_slide)
                continue
            next_lesson = inherited_lesson
            next_slide = inherited_slide
            if _text(key) == lesson_id:
                next_lesson = lesson_id
            else:
                try:
                    next_slide = int(key)
                except (TypeError, ValueError):
                    pass
            visit(child, next_lesson, next_slide)

    visit(manifest)
    result: list[Mapping[str, Any]] = []
    for candidate in candidates:
        candidate_lesson = _text(
            candidate.get("lessonId") or candidate.get("sourceLessonId") or candidate.get("contentId")
        )
        candidate_slide = candidate.get("slideNumber", candidate.get("slide", candidate.get("slideNo")))
        if not candidate_lesson and candidate_slide is None:
            # An unscoped manifest entry cannot be safely assigned to a slide.
            continue
        if candidate_lesson and candidate_lesson != lesson_id:
            continue
        if candidate_slide is not None:
            try:
                if int(candidate_slide) != slide_number:
                    continue
            except (TypeError, ValueError):
                continue
        if _audio_url(candidate) or _audio_transcript(candidate) or _audio_digest(candidate):
            result.append(candidate)
    return result


def _audio_candidates(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    audio_manifest: Any,
) -> list[Mapping[str, Any]]:
    candidates: list[Mapping[str, Any]] = []
    for item in _media(slide):
        if _media_kind(item) == "audio":
            candidates.append(item)
    candidates.extend(_audio_manifest_entries(audio_manifest, lesson_id, _slide_number(slide)))
    source_audio = source.get("audio") or source.get("audioManifest")
    candidates.extend(_audio_manifest_entries(source_audio, lesson_id, _slide_number(slide)))
    # A source-level manifest may use a unit and slide key instead of entries.
    source_deck = _deck(source)
    candidates.extend(_audio_manifest_entries(source_deck.get("audio"), lesson_id, _slide_number(slide)))
    deduped: list[Mapping[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for item in candidates:
        key = (_audio_url(item), _audio_digest(item), _audio_transcript(item))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _readable_html(texts: Sequence[str]) -> str:
    paragraphs: list[str] = []
    for value in texts:
        escaped = html.escape(value, quote=True)
        if "\n" in value:
            escaped = "<br />".join(html.escape(part.strip(), quote=True) for part in value.splitlines() if part.strip())
        paragraphs.append(f"<p>{escaped}</p>")
    return "".join(paragraphs)


def _extract_pairs(texts: Sequence[str]) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    pattern = re.compile(r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{1,38}?)\s*[-–—]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{1,58})")
    for text in texts:
        for match in pattern.finditer(text):
            term = _normalise(match.group(1)).strip(" .,:;()")
            definition = _normalise(match.group(2)).strip(" .,:;()")
            if term and definition and len(term.split()) <= 6 and len(definition.split()) <= 10:
                pair = {"term": term, "definition": definition}
                if pair not in pairs:
                    pairs.append(pair)
    return pairs


def _has_explicit_answer_key(slide: Mapping[str, Any]) -> bool:
    def walk(value: Any, key: str = "") -> bool:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold()
                if any(token in lowered for token in ("correctanswer", "answerkey", "correct_option", "answer")):
                    if _text(child_value) or isinstance(child_value, (list, tuple, dict)):
                        return True
                if walk(child_value, lowered):
                    return True
        elif isinstance(value, list):
            return any(walk(item, key) for item in value)
        return False

    return walk(slide)


def _explicit_answer_key(slide: Mapping[str, Any]) -> Any:
    keys = {"answer", "answerkey", "correctanswer", "correct_option", "correctoption"}

    def walk(value: Any) -> Any:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold().replace("-", "_")
                if lowered in keys and child_value not in (None, "", [], {}):
                    return copy.deepcopy(child_value)
                found = walk(child_value)
                if found is not None:
                    return found
        elif isinstance(value, list):
            for child in value:
                found = walk(child)
                if found is not None:
                    return found
        return None

    return walk(slide)


def _explicit_options(slide: Mapping[str, Any]) -> Any:
    keys = {"options", "choices", "answeroptions"}

    def walk(value: Any) -> Any:
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                lowered = _text(child_key).casefold().replace("-", "_")
                if lowered in keys and isinstance(child_value, (list, tuple)) and child_value:
                    return copy.deepcopy(child_value)
                found = walk(child_value)
                if found is not None:
                    return found
        elif isinstance(value, list):
            for child in value:
                found = walk(child)
                if found is not None:
                    return found
        return None

    return walk(slide)


def _is_speaking_prompt(text: str) -> bool:
    return bool(
        re.search(
            r"\b(?:act out|role[- ]?play|conversation|talk with|speak with|practice with your teacher|read .* aloud|record(?: yourself)?|dialogue)",
            text.casefold(),
        )
    )


def _is_essay_prompt(text: str) -> bool:
    lowered = text.casefold()
    return bool(
        re.search(
            r"\b(?:write (?:a|an|your|two|three)|write down|compose|create .* sentences|paragraph|essay|\d+\s*[-–]\s*\d+\s+words)",
            lowered,
        )
    )


def _is_short_answer_prompt(text: str) -> bool:
    lowered = text.casefold()
    return bool(
        re.search(
            r"\b(?:answer the questions?|complete|fill in|change .* sentence|transform|identify|state whether|true or false)",
            lowered,
        )
    )


def _is_reading(text: str) -> bool:
    lowered = text.casefold()
    return len(text) >= 160 or bool(re.search(r"\b(?:read the text|reading|read aloud)\b", lowered))


def _slide_warning_codes(slide: Mapping[str, Any]) -> list[str]:
    warnings: list[str] = []
    for warning in _as_list(slide.get("warnings")):
        if isinstance(warning, Mapping):
            value = _text(warning.get("code") or warning.get("message") or warning)
        else:
            value = _text(warning)
        if value:
            warnings.append(value.casefold())
    return warnings


def _blocker(code: str, slide: int | None = None, detail: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {"code": code}
    if slide is not None:
        result["slide"] = slide
    if detail:
        result["detail"] = detail
    return result


def _add_blocker(blockers: list[dict[str, Any]], value: dict[str, Any]) -> None:
    if value not in blockers:
        blockers.append(value)


def _original_source(
    source: Mapping[str, Any],
    lesson_id: str,
    source_digest: str,
    slide: Mapping[str, Any],
    audio: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    slide_number = _slide_number(slide)
    result: dict[str, Any] = {
        "sourceUrl": _source_url(source),
        "sourceDigest": source_digest,
        "contentId": _text(source.get("contentId")),
        "lessonId": lesson_id,
        "slideNumbers": [slide_number],
        "originalIds": [f"{lesson_id}:slide:{slide_number}"],
        "originalIDs": [f"{lesson_id}:slide:{slide_number}"],
        "deckTitle": _text(_deck(source).get("deckTitle") or source.get("title")),
        "title": _text(slide.get("title")),
        "visibleTexts": _slide_texts(slide),
        "links": copy.deepcopy(_as_list(slide.get("links"))),
        "tables": copy.deepcopy(_as_list(slide.get("tables"))),
        "media": copy.deepcopy(_as_list(slide.get("media"))),
    }
    if audio is not None:
        result["audio"] = {
            "url": _audio_url(audio),
            "digest": _audio_digest(audio),
            "transcript": _audio_transcript(audio),
        }
    return result


def _native_block_specs(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    source_digest: str,
    audio_manifest: Any,
    blockers: list[dict[str, Any]],
) -> list[tuple[str, dict[str, Any]]]:
    number = _slide_number(slide)
    texts = _meaningful_texts(slide)
    full_text = "\n".join(texts).strip()
    tables = _tables(slide)
    audio_required = _is_audio_required(slide)
    audio_items = _audio_candidates(source, slide, lesson_id, audio_manifest) if audio_required else []
    audio_item = audio_items[0] if audio_items else None
    if audio_required:
        if audio_item is None or not _audio_url(audio_item):
            _add_blocker(
                blockers,
                _blocker(
                    "audio-media-missing",
                    number,
                    "Listening content has no original media URL in the source or media manifest.",
                ),
            )
        else:
            if not _audio_digest(audio_item):
                _add_blocker(blockers, _blocker("audio-digest-missing", number, "Original audio digest is required."))
            if not _audio_transcript(audio_item):
                _add_blocker(
                    blockers,
                    _blocker("audio-transcript-missing", number, "Listening content requires the authored transcript."),
                )

    specs: list[tuple[str, dict[str, Any]]] = []
    common = {
        "sourceText": texts,
        "sourceTitle": _text(slide.get("title")),
    }
    if re.search(r"\b(?:objective|competenc|communicative function|learning goal)\w*\b", full_text.casefold()):
        common["objectives"] = copy.deepcopy(texts)
    if tables:
        combined_rows: list[list[str]] = []
        for table in tables:
            combined_rows.extend(copy.deepcopy(table))
        headers = combined_rows[0] if combined_rows else []
        rows = combined_rows[1:] if len(combined_rows) > 1 else []
        specs.append(
            (
                "structured-content",
                {
                    **common,
                    "content": {"headers": headers, "rows": rows},
                    "tables": copy.deepcopy(tables),
                },
            )
        )
    warning_text = " ".join(_slide_warning_codes(slide))
    if not tables and re.search(r"\b(?:table|chart|grid|columns?)\b", full_text.casefold()) and any(
        token in warning_text for token in ("table", "chart", "semantic")
    ):
        _add_blocker(
            blockers,
            _blocker("table-semantics-missing", number, "The source mentions a table or chart without authored cell semantics."),
        )

    pairs = _extract_pairs(texts)
    lower_title = _text(slide.get("title")).casefold()
    if len(pairs) >= 2 and ("vocab" in lower_title or "word" in lower_title or all(len(item["term"].split()) <= 3 for item in pairs)):
        specs.append(("vocabulary", {**common, "items": pairs, "content": _readable_html(texts)}))

    explicit_answer = _explicit_answer_key(slide)
    explicit_options = _explicit_options(slide)
    if explicit_answer is not None:
        if explicit_options:
            specs.append(
                (
                    "multiple-choice",
                    {
                        **common,
                        "prompt": full_text,
                        "options": explicit_options,
                        "correctAnswer": explicit_answer,
                    },
                )
            )
        else:
            specs.append(
                (
                    "short-answer",
                    {
                        **common,
                        "prompt": full_text,
                        "answerKey": explicit_answer,
                        "aiGrading": False,
                        "gradingContext": "Use the authored source answer key.",
                    },
                )
            )

    if audio_required and audio_item is not None and _audio_url(audio_item) and _audio_digest(audio_item) and _audio_transcript(audio_item):
        specs.append(
            (
                "audio",
                {
                    **common,
                    "instruction": full_text,
                    "url": _audio_url(audio_item),
                    "transcript": _audio_transcript(audio_item),
                    "mediaDigest": _audio_digest(audio_item),
                },
            )
        )

    if _is_speaking_prompt(full_text):
        specs.append(
            (
                "recording",
                {
                    **common,
                    "instruction": full_text,
                    "mode": "teacher-and-self-study",
                    "aiGrading": True,
                    "gradingContext": "No authored answer key is assumed; evaluate the learner recording against the instruction.",
                },
            )
        )

    if _is_essay_prompt(full_text):
        specs.append(
            (
                "essay",
                {
                    **common,
                    "prompt": full_text,
                    "aiGrading": True,
                    "gradingContext": "No authored answer key is assumed; evaluate the learner response against the source prompt.",
                },
            )
        )
    elif explicit_answer is None and _is_short_answer_prompt(full_text):
        specs.append(
            (
                "short-answer",
                {
                    **common,
                    "prompt": full_text,
                    "aiGrading": True,
                    "gradingContext": "No authored answer key is assumed; evaluate the learner response against the source prompt.",
                },
            )
        )

    # Preserve a long authored reading passage as readable HTML even when the
    # same slide also has questions or a read-aloud instruction.
    if _is_reading(full_text) and not tables:
        specs.append(("text", {**common, "content": _readable_html(texts)}))

    if not specs and full_text:
        specs.append(("text", {**common, "content": _readable_html(texts)}))
    if audio_required and not audio_item and not full_text:
        # The blocker is the evidence for an audio-only source slide; do not
        # fabricate a playable block or a transcript.
        return specs
    if audio_required and audio_item and not _audio_url(audio_item) and full_text and not specs:
        specs.append(("text", {**common, "content": _readable_html(texts)}))
    return specs


def _row_data_metadata(
    source: Mapping[str, Any],
    source_digest: str,
    lesson_id: str,
    slide: Mapping[str, Any],
    native_type: str,
    audio: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    original_ids = [f"{lesson_id}:slide:{_slide_number(slide)}"]
    return {
        "learningRevision": LEARNING_REVISION,
        "sourceSlides": [_slide_number(slide)],
        "originalIDs": original_ids,
        "originalSource": _original_source(source, lesson_id, source_digest, slide, audio),
    }


def _row_sort_key(row: Mapping[str, Any]) -> tuple[float, str]:
    value = row.get("order", 0)
    try:
        order = float(value)
    except (TypeError, ValueError):
        order = 0
    return order, _text(row.get("id"))


def _existing_rows(lesson: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw = lesson.get("rows")
    if raw is None:
        raw = lesson.get("contents", lesson.get("content", []))
    result = [copy.deepcopy(item) for item in _as_list(raw) if isinstance(item, Mapping)]
    return sorted(result, key=_row_sort_key)


def _archive_existing_rows(
    rows: Sequence[Mapping[str, Any]],
    source: Mapping[str, Any],
    source_digest: str,
    lesson_id: str,
) -> list[dict[str, Any]]:
    """Attach source provenance while retaining each existing row's identity."""

    result: list[dict[str, Any]] = []
    for row in rows:
        copied = copy.deepcopy(dict(row))
        data = copied.get("data")
        if not isinstance(data, Mapping):
            data = {"originalData": copy.deepcopy(data)}
        else:
            data = copy.deepcopy(dict(data))
        metadata = data.get("metadata")
        metadata = copy.deepcopy(dict(metadata)) if isinstance(metadata, Mapping) else {}
        original_id = _text(copied.get("id"))
        metadata.setdefault("originalIDs", [original_id])
        metadata.setdefault(
            "originalSource",
            {
                "sourceUrl": _source_url(source),
                "sourceDigest": source_digest,
                "contentId": _text(source.get("contentId")),
                "lessonId": lesson_id,
                "originalIds": [original_id],
                "originalIDs": [original_id],
                "slideNumbers": [],
            },
        )
        data["metadata"] = metadata
        copied["data"] = data
        result.append(copied)
    return result


def _native_row(
    lesson_id: str,
    source: Mapping[str, Any],
    source_digest: str,
    slide: Mapping[str, Any],
    native_type: str,
    payload: Mapping[str, Any],
    sequence: int,
    order: int,
) -> dict[str, Any]:
    title = _text(slide.get("title")) or native_type.replace("-", " ").title()
    slug_source = f"{native_type}-{_slide_number(slide)}-{title}"
    slug = re.sub(r"[^a-z0-9]+", "-", slug_source.casefold()).strip("-")[:72] or native_type
    row_id = f"{ROW_ID_PREFIX}{lesson_id}-{slug}-{sequence:03d}"
    audio_evidence = None
    if native_type == "audio":
        audio_evidence = {
            "url": _text(payload.get("url")),
            "digest": _text(payload.get("mediaDigest")),
            "transcript": _text(payload.get("transcript")),
        }
    metadata = _row_data_metadata(source, source_digest, lesson_id, slide, native_type, audio_evidence)
    data = copy.deepcopy(dict(payload))
    existing_metadata = data.get("metadata")
    if isinstance(existing_metadata, Mapping):
        metadata = {**metadata, **copy.deepcopy(dict(existing_metadata))}
        metadata["learningRevision"] = LEARNING_REVISION
        metadata["sourceSlides"] = [_slide_number(slide)]
        metadata["originalSource"] = _original_source(source, lesson_id, source_digest, slide)
    data["type"] = native_type
    data["metadata"] = metadata
    return {
        "id": row_id,
        "title": title,
        "order": order,
        "contentType": "RICH_TEXT",
        "lessonId": lesson_id,
        "parentId": None,
        "data": data,
    }


def _row_original_identity(row: Mapping[str, Any]) -> tuple[Any, Any, Any, Any]:
    return (row.get("title"), row.get("contentType"), row.get("lessonId"), row.get("parentId"))


def _lesson_from_snapshot(snapshot: Mapping[str, Any], lesson_id: str) -> Mapping[str, Any] | None:
    lessons: list[Mapping[str, Any]] = []
    raw_lessons = snapshot.get("lessons")
    if raw_lessons is not None:
        lessons.extend(item for item in _as_list(raw_lessons) if isinstance(item, Mapping))
    for module in _as_list(snapshot.get("modules")) + _as_list(snapshot.get("units")):
        if not isinstance(module, Mapping):
            continue
        lessons.extend(item for item in _as_list(module.get("lessons")) if isinstance(item, Mapping))
        content = module.get("content")
        if isinstance(content, Mapping):
            lessons.extend(item for item in _as_list(content.get("lessons")) if isinstance(item, Mapping))
    for lesson in lessons:
        try:
            if _lesson_id(lesson) == lesson_id:
                return lesson
        except PlanError:
            continue
    return None


def _validate_course_id(value: Any) -> None:
    candidate = _text(value)
    if candidate and candidate != COURSE_ID:
        raise PlanError(f"unexpected course id: {candidate}")


def build_plan(
    lesson: Mapping[str, Any] | None,
    source: Mapping[str, Any],
    audio_manifest: Any = None,
) -> dict[str, Any]:
    """Build one deterministic plan while preserving the existing row identities."""

    source_lesson_id = _source_lesson_id(source)
    lesson_id = _lesson_id(lesson) if lesson is not None else source_lesson_id
    if lesson is not None and lesson_id != source_lesson_id:
        raise PlanError(f"source lesson {source_lesson_id} does not match snapshot lesson {lesson_id}")
    _validate_course_id(source.get("courseId"))
    source_digest = _source_digest(source)
    blockers: list[dict[str, Any]] = []
    if lesson is None:
        _add_blocker(blockers, _blocker("lesson-missing-from-snapshot", detail=f"No snapshot lesson matched {source_lesson_id}."))
    if _text(source.get("status")) and _text(source.get("status")).casefold() not in {"ok", "published", "ready"}:
        _add_blocker(blockers, _blocker("source-not-ready", detail=f"Source status is {source.get('status')!r}."))
    if not _source_url(source):
        _add_blocker(blockers, _blocker("source-url-missing", detail="Published source URL is required for provenance."))
    deck = _deck(source)
    slides = _slides(source)
    if not slides:
        _add_blocker(blockers, _blocker("source-slides-missing", detail="The published source has no extracted slides."))
    declared_count = deck.get("slideCount")
    if declared_count is not None:
        try:
            if int(declared_count) != len(slides):
                _add_blocker(
                    blockers,
                    _blocker("source-slide-count-mismatch", detail=f"Declared {declared_count} slides but extracted {len(slides)}."),
                )
        except (TypeError, ValueError):
            _add_blocker(blockers, _blocker("source-slide-count-invalid", detail=f"Invalid slideCount {declared_count!r}."))

    previous_rows = _existing_rows(lesson or {})
    next_rows = _archive_existing_rows(previous_rows, source, source_digest, lesson_id)
    next_order = max([int(row.get("order", 0)) for row in previous_rows if str(row.get("order", "")).lstrip("-").isdigit()] or [0]) + 1
    generated_sequence = 1
    covered_slides: set[int] = set()
    unsupported_slides: list[dict[str, Any]] = []
    for slide in slides:
        number = _slide_number(slide)
        specs = _native_block_specs(source, slide, lesson_id, source_digest, audio_manifest, blockers)
        source_has_content = bool(_meaningful_texts(slide) or _tables(slide) or _is_audio_required(slide))
        if specs or source_has_content:
            covered_slides.add(number)
        if source_has_content and not specs:
            unsupported = {
                "slide": number,
                "title": _text(slide.get("title")),
                "reason": "No native block was emitted; source evidence is retained in blockers.",
            }
            unsupported_slides.append(unsupported)
            _add_blocker(blockers, _blocker("unsupported-slide", number, unsupported["reason"]))
        for native_type, payload in specs:
            row = _native_row(lesson_id, source, source_digest, slide, native_type, payload, generated_sequence, next_order)
            next_rows.append(row)
            generated_sequence += 1
            next_order += 1

    next_rows = sorted(next_rows, key=_row_sort_key)
    plan = {
        "courseId": COURSE_ID,
        "lessonId": lesson_id,
        "previousRows": previous_rows,
        "nextRows": next_rows,
        "publishable": not blockers,
        "blockers": blockers,
        "sourceUrl": _source_url(source),
        "sourceDigest": source_digest,
        "sourceSlideNumbers": sorted(covered_slides),
        "sourceSlideCount": len(slides),
        "unsupportedSlides": unsupported_slides,
    }
    validate_plan(plan)
    return plan


def build_plans(
    snapshot: Mapping[str, Any],
    sources: Sequence[Mapping[str, Any]],
    audio_manifest: Any = None,
) -> list[dict[str, Any]]:
    """Build source plans sorted by stable lesson/module/source identifiers."""

    snapshot_course_id = snapshot.get("courseId")
    snapshot_course = snapshot.get("course")
    if not snapshot_course_id and isinstance(snapshot_course, Mapping):
        snapshot_course_id = snapshot_course.get("id")
    _validate_course_id(snapshot_course_id)
    ordered_sources = sorted(
        [source for source in sources if isinstance(source, Mapping)],
        key=lambda source: (_source_lesson_id(source), _source_url(source), _source_digest(source)),
    )
    plans: list[dict[str, Any]] = []
    for source in ordered_sources:
        source_lesson_id = _source_lesson_id(source)
        lesson = _lesson_from_snapshot(snapshot, source_lesson_id)
        plans.append(build_plan(lesson, source, audio_manifest))
    return plans


def validate_plan(plan: Mapping[str, Any]) -> None:
    """Validate the immutable row contract and native metadata contract."""

    if _text(plan.get("courseId")) != COURSE_ID:
        raise PlanError("plan has an unexpected course id")
    lesson_id = _text(plan.get("lessonId"))
    if not lesson_id:
        raise PlanError("plan has no lesson id")
    previous = [row for row in _as_list(plan.get("previousRows")) if isinstance(row, Mapping)]
    following = [row for row in _as_list(plan.get("nextRows")) if isinstance(row, Mapping)]
    previous_by_id = {_text(row.get("id")): row for row in previous}
    next_by_id = {_text(row.get("id")): row for row in following}
    if "" in previous_by_id or "" in next_by_id:
        raise PlanError("all rows need a stable id")
    if len(next_by_id) != len(following):
        raise PlanError("nextRows contains duplicate ids")
    missing = set(previous_by_id) - set(next_by_id)
    if missing:
        raise PlanError(f"nextRows dropped existing rows: {sorted(missing)}")
    for row_id, before in previous_by_id.items():
        after = next_by_id[row_id]
        if _row_original_identity(before) != _row_original_identity(after):
            raise PlanError(f"existing row identity changed: {row_id}")
        if _text(after.get("lessonId")) != lesson_id:
            raise PlanError(f"existing row has wrong lesson id: {row_id}")
    for row in following:
        row_id = _text(row.get("id"))
        if _text(row.get("lessonId")) != lesson_id:
            raise PlanError(f"row has wrong lesson id: {row_id}")
        if row_id in previous_by_id:
            continue
        if not row_id.startswith(f"{ROW_ID_PREFIX}{lesson_id}-"):
            raise PlanError(f"generated row id is unstable or unscoped: {row_id}")
        if _text(row.get("contentType")) != "RICH_TEXT":
            raise PlanError(f"generated row is not RICH_TEXT: {row_id}")
        data = row.get("data")
        if not isinstance(data, Mapping):
            raise PlanError(f"generated row has no data: {row_id}")
        metadata = data.get("metadata")
        if not isinstance(metadata, Mapping) or metadata.get("learningRevision") != LEARNING_REVISION:
            raise PlanError(f"generated row has no learning revision metadata: {row_id}")
        if not _as_list(metadata.get("sourceSlides")):
            raise PlanError(f"generated row has no source slide metadata: {row_id}")
        original = metadata.get("originalSource")
        if not isinstance(original, Mapping) or not _text(original.get("sourceDigest")):
            raise PlanError(f"generated row has no archived source metadata: {row_id}")
        if _text(data.get("type")) == "audio":
            if not _text(data.get("url")) or not _text(data.get("mediaDigest")) or not _text(data.get("transcript")):
                raise PlanError(f"audio row is missing immutable media evidence: {row_id}")


def build_manifest(
    snapshot: Mapping[str, Any],
    sources: Sequence[Mapping[str, Any]],
    audio_manifest: Any = None,
    expected_source_count: int | None = None,
) -> dict[str, Any]:
    plans = build_plans(snapshot, sources, audio_manifest)
    inventory_blockers: list[dict[str, Any]] = []
    if expected_source_count is not None and len(sources) != expected_source_count:
        inventory_blockers.append(
            _blocker(
                "source-inventory-count",
                detail=f"Expected {expected_source_count} published sources but found {len(sources)}.",
            )
        )
    return {
        "schemaVersion": 1,
        "courseId": COURSE_ID,
        "learningRevision": LEARNING_REVISION,
        "sourceCount": len(sources),
        "publishableCount": sum(1 for plan in plans if plan["publishable"]),
        "blockedCount": sum(1 for plan in plans if not plan["publishable"]),
        "inventoryBlockers": inventory_blockers,
        "plans": plans,
    }


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise PlanError(f"cannot read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise PlanError(f"invalid JSON in {path}: {exc}") from exc


def load_sources(source_dir: Path) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for path in sorted(source_dir.glob("*.json")):
        value = load_json(path)
        if not isinstance(value, Mapping):
            raise PlanError(f"source file must contain an object: {path}")
        source = copy.deepcopy(dict(value))
        source["_sourceFile"] = str(path)
        sources.append(source)
    return sources


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path, help="authoritative course snapshot JSON")
    parser.add_argument("--source-dir", required=True, type=Path, help="directory containing published source JSON files")
    parser.add_argument("--output", required=True, type=Path, help="plan manifest JSON output")
    parser.add_argument("--audio-manifest", type=Path, help="optional original media URL/digest/transcript manifest")
    parser.add_argument("--expected-source-count", type=int, default=55)
    parser.add_argument("--require-ready", action="store_true", help="exit nonzero when inventory or plan blockers exist")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        snapshot = load_json(args.snapshot)
        if not isinstance(snapshot, Mapping):
            raise PlanError("snapshot must contain an object")
        sources = load_sources(args.source_dir)
        audio_manifest = load_json(args.audio_manifest) if args.audio_manifest else None
        manifest = build_manifest(snapshot, sources, audio_manifest, args.expected_source_count)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.require_ready and (manifest["inventoryBlockers"] or manifest["blockedCount"]):
            return 2
        return 0
    except PlanError as exc:
        print(f"build-course-learning: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
