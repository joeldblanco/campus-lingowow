#!/usr/bin/env python3
"""Build deterministic, reviewable guided-learning plans from published slides.

The builder is deliberately data-only.  It reads an existing course snapshot,
reads the published source extraction, and emits plans that can be inspected by
the caller before any database operation is considered.  An optional native
audit can enrich only text-aligned slides with authored tables, paragraphs,
figures, and audio provenance.  A plan is marked unpublishable whenever an
authored listening asset cannot be traced to an original URL, digest, and
transcript.
"""

from __future__ import annotations

import argparse
import copy
from difflib import SequenceMatcher
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


def _nested_text(value: Any) -> str:
    """Read text from the small paragraph records emitted by audit extractors."""

    if isinstance(value, Mapping):
        for key in ("text", "plainText", "value", "content", "body"):
            raw_candidate = value.get(key)
            candidate = _nested_text(raw_candidate) if isinstance(raw_candidate, (Mapping, list, tuple)) else _normalise(raw_candidate)
            if candidate:
                return candidate
        for key in ("paragraphs", "runs", "spans", "segments", "lines"):
            nested = _unique_texts(_nested_text(item) for item in _as_list(value.get(key)))
            if nested:
                return " ".join(nested)
        return ""
    if isinstance(value, (list, tuple)):
        return " ".join(_unique_texts(_nested_text(item) for item in value))
    return _text(value)


def _native_audit_payload(slide: Mapping[str, Any]) -> Mapping[str, Any] | None:
    value = slide.get("_nativeAudit")
    return value if isinstance(value, Mapping) else None


def _native_vector_projection(slide: Mapping[str, Any]) -> Mapping[str, Any] | None:
    """Return a reviewed editable-vector projection attached to a slide.

    Vector evidence is deliberately kept separate from ``figures``.  A native
    shape calendar is usable as structured content, but it is not a raster
    image and must never be emitted as an ``image`` block.
    """

    native = _native_audit_payload(slide)
    if native is None:
        return None
    value = native.get("vectorSemanticProjection")
    return value if isinstance(value, Mapping) else None


_VECTOR_REVIEW_KEYS = (
    "vectorReview",
    "vectorCalendarReview",
    "vectorSemanticProjection",
    "semanticProjection",
    "vectorProjection",
)


def _native_vector_review_candidates(audit: Any) -> list[Mapping[str, Any]]:
    """Find standalone or wrapped reviewed vector projections.

    The native PPTX audit remains the generic ``records`` contract.  The
    Unit 3 calendar review is a small, independently authored record, so the
    loader accepts that record directly and the named wrapper forms used by
    audit composition without traversing arbitrary source payloads.
    """

    result: list[Mapping[str, Any]] = []
    seen: set[int] = set()

    def visit(value: Any) -> None:
        if isinstance(value, Mapping):
            if (
                isinstance(value.get("scope"), Mapping)
                and isinstance(value.get("structuredContent"), Mapping)
                and isinstance(value.get("slide"), Mapping)
            ):
                marker = id(value)
                if marker not in seen:
                    seen.add(marker)
                    result.append(value)
                return
            for key in ("records", "reviews", "vectorReviews", "projections", *_VECTOR_REVIEW_KEYS):
                child = value.get(key)
                if isinstance(child, (Mapping, list, tuple)):
                    visit(child)
            return
        for item in _as_list(value):
            if isinstance(item, Mapping):
                visit(item)

    visit(audit)
    return result


def _valid_vector_bbox(value: Any) -> bool:
    if not isinstance(value, Mapping):
        return False
    numeric_keys = ("x", "y", "cx", "cy", "right", "bottom")
    if any(
        key not in value
        or isinstance(value.get(key), bool)
        or not isinstance(value.get(key), (int, float))
        for key in numeric_keys
    ):
        return False
    return float(value["cx"]) > 0 and float(value["cy"]) > 0


def _vector_digest(value: Any) -> bool:
    return bool(re.fullmatch(r"[0-9a-f]{64}", _text(value).casefold()))


def _vector_shape_id(shape: Any) -> str:
    return _text(shape.get("shapeId")) if isinstance(shape, Mapping) else ""


def _vector_shape_text(shape: Any) -> str:
    if not isinstance(shape, Mapping):
        return ""
    return _normalise(shape.get("text") or shape.get("label"))


def _vector_calendar_projection_for_slide(
    review: Mapping[str, Any],
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
) -> tuple[dict[str, Any] | None, str | None]:
    """Validate the Unit 3 slide 4 editable calendar evidence.

    The review must prove the exact published slide, native shape boundaries,
    and every authored day/activity pair before it can clear the normal
    picture-evidence blocker.  The returned projection contains only reviewed
    data and is safe to store as provenance on the generated row.
    """

    scope = review.get("scope")
    source_evidence = review.get("source")
    native_evidence = review.get("native")
    slide_evidence = review.get("slide")
    structured = review.get("structuredContent")
    if not all(isinstance(value, Mapping) for value in (scope, source_evidence, native_evidence, slide_evidence, structured)):
        return None, "vector review is missing scope, source, native, slide, or structuredContent evidence"

    source_unit = _source_unit_number(source)
    source_lesson = _source_lesson_id(source)
    source_number = _slide_number(slide)
    if source_unit != 3 or source_number != 4:
        return None, "vector calendar projection is scoped only to Unit 3 slide 4"
    try:
        scope_unit = int(scope.get("unit"))
        scope_slide = int(scope.get("publishedSlide"))
        native_slide_number = int(scope.get("nativeSlide"))
    except (TypeError, ValueError):
        return None, "vector review scope has invalid unit or slide numbers"
    if scope_unit != 3 or _text(scope.get("lessonId")) != source_lesson or scope_slide != source_number or native_slide_number != source_number:
        return None, "vector review scope does not match Unit 3 slide 4"

    errors: list[str] = []
    published_url = _text(source_evidence.get("publishedSourceUrl"))
    if not published_url or published_url != _source_url(source):
        errors.append("published source URL does not match the source extraction")
    published_title = _normalise(source_evidence.get("publishedDeckTitle"))
    source_title = _normalise(_deck(source).get("deckTitle") or source.get("title"))
    if not published_title or published_title != source_title:
        errors.append("published deck title does not match the source extraction")
    expected_texts = [_normalise(value) for value in _slide_texts(slide) if _normalise(value)]
    reviewed_texts = [_normalise(value) for value in _as_list(source_evidence.get("publishedVisibleTexts")) if _normalise(value)]
    if reviewed_texts != expected_texts:
        errors.append("published visible text evidence does not match the source slide")
    published_text_digest = _text(source_evidence.get("publishedSlideTextSha256"))
    if not _vector_digest(published_text_digest):
        errors.append("published slide text SHA-256 is missing or malformed")

    joined_text = _normalise(native_evidence.get("joinedText"))
    if not joined_text or joined_text != _normalise("\n".join(expected_texts)):
        errors.append("native joined text does not match the published slide text")
    for key in ("presentationSha256", "slideTextSha256", "joinedTextSha256"):
        if not _vector_digest(native_evidence.get(key)):
            errors.append(f"native {key} is missing or malformed")

    title_shape = slide_evidence.get("titleShape")
    if not isinstance(title_shape, Mapping) or not _vector_shape_id(title_shape) or not _valid_vector_bbox(title_shape.get("bbox")):
        errors.append("native title shape is missing a shapeId or complete bbox")
    elif _vector_shape_text(title_shape) != _normalise(_text(slide.get("title"))):
        errors.append("native title shape text does not match the published title")

    expected_days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    weekday_shapes = [item for item in _as_list(slide_evidence.get("weekdayShapes")) if isinstance(item, Mapping)]
    if len(weekday_shapes) != len(expected_days):
        errors.append("native weekday shape evidence must contain seven columns")
    else:
        weekday_ids: list[str] = []
        for expected_day, shape in zip(expected_days, weekday_shapes):
            if _vector_shape_text(shape).casefold() != expected_day.casefold() or not _valid_vector_bbox(shape.get("bbox")):
                errors.append(f"native weekday shape for {expected_day} is incomplete or out of order")
            weekday_ids.append(_vector_shape_id(shape))
        if not all(weekday_ids) or len(set(weekday_ids)) != len(weekday_ids):
            errors.append("native weekday shape IDs must be unique")

    activity_shapes = [item for item in _as_list(slide_evidence.get("activityShapes")) if isinstance(item, Mapping)]
    activity_by_day: dict[str, str] = {}
    if len(activity_shapes) != len(expected_days):
        errors.append("native activity shape evidence must contain seven rows")
    else:
        activity_ids: list[str] = []
        for expected_day, shape in zip(expected_days, activity_shapes):
            day = _text(shape.get("day")).upper()
            activity = _vector_shape_text(shape)
            if day != expected_day or not activity or not _valid_vector_bbox(shape.get("bbox")):
                errors.append(f"native activity shape for {expected_day} is incomplete or out of order")
            activity_ids.append(_vector_shape_id(shape))
            if day and activity:
                activity_by_day[day] = activity
        if not all(activity_ids) or len(set(activity_ids)) != len(activity_ids):
            errors.append("native activity shape IDs must be unique")

    prompt_shapes = [item for item in _as_list(slide_evidence.get("promptShapes")) if isinstance(item, Mapping)]
    if not prompt_shapes:
        errors.append("native prompt shape evidence is missing")
    for prompt_shape in prompt_shapes:
        if not _vector_shape_id(prompt_shape) or not _valid_vector_bbox(prompt_shape.get("bbox")):
            errors.append("native prompt shape is missing a shapeId or complete bbox")
    prompt_texts = {_normalise(_vector_shape_text(item)).casefold() for item in prompt_shapes if _vector_shape_text(item)}
    authored_prompts = [
        value
        for value in expected_texts
        if re.search(r"\b(?:look\s+at\s+the\s+picture|listen\s+to\s+the\s+audio)\b", value, flags=re.IGNORECASE)
    ]
    if any(value.casefold() not in prompt_texts for value in authored_prompts):
        errors.append("native prompt shapes do not preserve the authored picture/audio instructions")

    if _text(structured.get("nativeType")).casefold() != "structured-content":
        errors.append("vector review structuredContent must be structured-content")
    if _text(structured.get("sourceRole")).casefold() != "native-vector-calendar":
        errors.append("vector review sourceRole must be native-vector-calendar")
    content = structured.get("content")
    table_groups = structured.get("data", {}).get("tableGroups") if isinstance(structured.get("data"), Mapping) else None
    content_headers = list(content.get("headers")) if isinstance(content, Mapping) and isinstance(content.get("headers"), list) else []
    content_rows = content.get("rows") if isinstance(content, Mapping) else None
    if content_headers != ["DAY", "ACTIVITIES"] or not isinstance(content_rows, list) or len(content_rows) != 7:
        errors.append("vector structured content must expose DAY/ACTIVITIES rows for all seven days")
        content_rows = []
    normalized_rows: list[list[str]] = []
    for index, row in enumerate(content_rows):
        if not isinstance(row, list) or len(row) != 2 or not all(_normalise(value) for value in row):
            errors.append(f"vector structured row {index + 1} is empty or malformed")
            continue
        normalized_rows.append([_normalise(row[0]), _normalise(row[1])])
    if len(normalized_rows) == 7:
        if [row[0].upper() for row in normalized_rows] != expected_days:
            errors.append("vector structured rows must retain Sunday through Saturday order")
        for day, activity in normalized_rows:
            source_values = {_normalise(value).casefold() for value in expected_texts}
            if day.casefold() not in source_values or activity.casefold() not in source_values:
                errors.append(f"vector structured row {day!r} contains text absent from the published slide")
            if activity_by_day.get(day.upper(), "").casefold() != activity.casefold():
                errors.append(f"vector structured row {day!r} does not match its native activity shape")

    raw_tables = structured.get("tables")
    if not isinstance(raw_tables, list) or len(raw_tables) != 1 or not isinstance(raw_tables[0], list):
        errors.append("vector structured content must retain its source table matrix")
    else:
        expected_matrix = [content_headers, *normalized_rows]
        matrix = [[_normalise(cell) for cell in row] for row in raw_tables[0] if isinstance(row, list)]
        if matrix != expected_matrix:
            errors.append("vector source table matrix does not match structured rows")

    if not isinstance(table_groups, list) or len(table_groups) != 1 or not isinstance(table_groups[0], Mapping):
        errors.append("vector structured content must expose one day tableGroup")
        table_group: Mapping[str, Any] = {}
    else:
        table_group = table_groups[0]
        if _text(table_group.get("sourceHeader")).casefold() != _normalise(_text(slide.get("title"))).casefold():
            errors.append("vector tableGroup sourceHeader does not match the authored slide title")
        if list(table_group.get("headers") or []) != content_headers:
            errors.append("vector tableGroup headers do not match structured content")
        group_rows = table_group.get("rows")
        if group_rows != normalized_rows:
            errors.append("vector tableGroup rows do not match structured content")
        traces = [item for item in _as_list(table_group.get("rowShapeTrace")) if isinstance(item, Mapping)]
        if len(traces) != 7:
            errors.append("vector tableGroup must trace all seven day/activity shape pairs")
        else:
            weekday_ids = [_vector_shape_id(item) for item in weekday_shapes]
            activity_ids = [_vector_shape_id(item) for item in activity_shapes]
            for index, trace in enumerate(traces):
                if _text(trace.get("day")).upper() != expected_days[index]:
                    errors.append("vector tableGroup shape trace is out of order")
                if _text(trace.get("headerShapeId")) != weekday_ids[index] or _text(trace.get("activityShapeId")) != activity_ids[index]:
                    errors.append("vector tableGroup shape trace does not match native shape IDs")

    figure_proof = structured.get("figureProof")
    if not isinstance(figure_proof, Mapping):
        errors.append("vector structured content is missing figureProof")
    else:
        if _text(figure_proof.get("kind")).casefold() != "native-vector" or _text(figure_proof.get("visualRole")).casefold() != "week-calendar":
            errors.append("vector figureProof has an unsupported visual role")
        if figure_proof.get("confirmedInstructional") is not True or figure_proof.get("rasterRequired") is not False:
            errors.append("vector figureProof must be confirmed instructional editable evidence")
        try:
            proof_source_slide = int(figure_proof.get("sourceSlideNumber"))
            proof_published_slide = int(figure_proof.get("publishedSlideNumber"))
        except (TypeError, ValueError):
            proof_source_slide = proof_published_slide = 0
        if proof_source_slide != source_number or proof_published_slide != source_number:
            errors.append("vector figureProof slide scope does not match slide 4")
        if _text(figure_proof.get("sourcePresentationSha256")) != _text(native_evidence.get("presentationSha256")):
            errors.append("vector figureProof source presentation digest does not match native evidence")
        if _text(figure_proof.get("publishedSlideTextSha256")) != published_text_digest:
            errors.append("vector figureProof published text digest does not match source evidence")
        if _text(figure_proof.get("nativeSlideTextSha256")) != _text(native_evidence.get("slideTextSha256")):
            errors.append("vector figureProof native text digest does not match native evidence")
        if not _text(figure_proof.get("visualEvidence")):
            errors.append("vector figureProof is missing visual evidence text")
        required_shape_ids = {
            _vector_shape_id(title_shape),
            *[_vector_shape_id(item) for item in weekday_shapes],
            *[_vector_shape_id(item) for item in activity_shapes],
        }
        proof_shape_ids = [_text(item) for item in _as_list(figure_proof.get("sourceShapeIds"))]
        if not required_shape_ids or not required_shape_ids.issubset(set(proof_shape_ids)) or len(set(proof_shape_ids)) != len(proof_shape_ids):
            errors.append("vector figureProof does not trace every title/day/activity shape")

    if errors:
        return None, "; ".join(dict.fromkeys(errors))

    return copy.deepcopy(dict(review)), None


def _native_paragraphs(slide: Mapping[str, Any]) -> list[str]:
    native = _native_audit_payload(slide)
    if native is None:
        return []
    values: list[Any] = []
    for key in ("paragraphs", "paragraphTexts", "textBlocks", "richText", "bodyText"):
        raw = native.get(key)
        if raw is not None:
            values.extend(_as_list(raw))
    for shape in _as_list(native.get("shapes")):
        if isinstance(shape, Mapping):
            values.extend(_as_list(shape.get("paragraphs")))
    return _unique_texts(_nested_text(value) for value in values)


def _evidence_texts(slide: Mapping[str, Any]) -> list[str]:
    """Keep published text first, then append only explicitly audited paragraphs."""

    return _unique_texts([*_meaningful_texts(slide), *_native_paragraphs(slide)])


_TECHNICAL_LABELS = {
    "unit",
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
    "let's talk",
    "let’s talk",
    "let' talk",
    "let's write",
    "let’s write",
    "let' write",
    "copyright",
}


_GOAL_LABELS = {
    "communicative function",
    "competencies",
    "competency",
    "learning goal",
    "learning goals",
    "learning objective",
    "learning objectives",
    "objective",
    "objectives",
    "outcomes",
}


def _goal_label(value: Any) -> str:
    """Return a normalized authored goal heading, when present."""

    return _normalise(value).casefold().rstrip(":  –—-.")


def _is_goal_slide(slide: Mapping[str, Any]) -> bool:
    """Identify a source slide that states learner goals rather than an activity."""

    values = [_text(slide.get("title")), *_meaningful_texts(slide)]
    labels = {_goal_label(value) for value in values if _goal_label(value) in _GOAL_LABELS}
    if not labels:
        return False
    # A slide carrying an authored task or media remains an activity even when
    # its prompt mentions competencies. Goal slides are text-only declarations.
    return not (
        _is_audio_required(slide)
        or _is_picture_prompt_required(slide)
        or _video_urls(slide)
        or _tables(slide)
    )


def _goal_title(slide: Mapping[str, Any], texts: Sequence[str]) -> str:
    """Choose a short authored heading for the learner-facing goal block."""

    for value in [_text(slide.get("title")), *texts]:
        if _goal_label(value) in _GOAL_LABELS:
            return _normalise(value).rstrip(":  –—-.")
    return _normalise(slide.get("title"))


def _goal_visible_texts(slide: Mapping[str, Any], texts: Sequence[str]) -> list[str]:
    """Render goal prose once while retaining every authored value in metadata."""

    title = _normalise(slide.get("title"))
    candidates = _unique_texts([*texts, *_native_paragraphs(slide)])
    # The selected goal heading is rendered as the block title. Remove it from
    # the body, including a generic published title such as ``Lectura``.
    if candidates and title and candidates[0].casefold() == title.casefold():
        candidates = candidates[1:]

    result: list[str] = []
    for value in candidates:
        key = value.casefold()
        matching_prior = [
            prior
            for prior in result
            if len(prior) >= 8 and prior.casefold() in key
        ]
        if len(matching_prior) >= 2:
            covered_length = sum(len(prior) for prior in matching_prior)
            if covered_length / max(len(value), 1) >= 0.5:
                # Native audits can add one joined paragraph after the
                # published extractor's individual goal values. Published
                # values are authoritative and already cover that paragraph.
                continue
        result.append(value)
    return result


def _is_technical_text(value: str) -> bool:
    lowered = _normalise(value).casefold().replace("\ufffd", "'").replace("�", "'").replace("’", "'")
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


def _looks_like_flattened_source_chart(value: str) -> bool:
    """Recognize a published chart serialized as one long text value."""

    lowered = _normalise(value).casefold()
    markers = (
        "phrases meaning example",
        "grammar examples observation",
        "structures statements questions",
        "non-finite clause",
        "relative clause",
    )
    return len(lowered) >= 180 and any(marker in lowered for marker in markers)


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


_SOURCE_DIVIDER_TITLES = {
    "introduction",
    "vocabulary introduction",
    "grammar analysis",
    "grammar focus",
    "language use",
    "language targets",
    "language bricks",
    "functional english",
    "let's practice",
}


def _is_overhead_source_slide(slide: Mapping[str, Any]) -> bool:
    """Identify clearly noninstructional cover/divider/closing source slides."""

    raw_texts = _slide_texts(slide)
    if not raw_texts:
        return False
    raw = " ".join(raw_texts)
    lowered = raw.casefold()
    if re.search(r"(?:all rights reserved|copyright|©)", lowered):
        return True
    # Match closing slides by their own authored line. A chart/example can
    # legitimately contain a word such as "congrats" and must stay visible.
    if any(
        re.search(r"^\s*(?:congrats|congratulations|lesson complete|end of (?:the )?lesson)\b", _normalise(value).casefold())
        for value in raw_texts
    ):
        return True
    if _tables(slide) or _is_audio_required(slide) or _is_picture_prompt_required(slide):
        return False

    title = _normalise(slide.get("title")).casefold().replace("�", "'").replace("’", "'")
    meaningful = _meaningful_texts(slide)
    if title in _SOURCE_DIVIDER_TITLES:
        # Keep a bare section heading out of the learner stream. If the slide
        # has a short authored subtitle, retain it as teacher-only provenance;
        # actionable text remains learner-facing below.
        # Native extraction can add the heading and slide number as separate
        # paragraphs, while the published record only carries the heading. A
        # heading with no learner prose is still a divider and belongs in the
        # source archive, even when there is no secondary subtitle.
        if not meaningful:
            return True
        if _extract_pairs(meaningful) or re.search(
            r"\b(?:complete|answer|choose|describe|discuss|identify|listen|match|read|select|talk|write)\b",
            " ".join(meaningful),
            flags=re.IGNORECASE,
        ):
            return False
        return True

    # Unit title covers generally appear at the start of a deck and contain no
    # authored task. Keep the complete source text in teacher notes while
    # avoiding false positives for instructional objectives.
    if _slide_number(slide) <= 2 and re.search(r"\bunit\b", lowered) and re.search(r"\b\d{1,3}\b", lowered):
        return not re.search(
            r"\b(?:objective|competenc|goal|learn|complete|answer|choose|describe|discuss|listen|match|read|select|talk|write)\w*\b",
            lowered,
        )
    return False


def _prompt_text(slide: Mapping[str, Any], texts: Sequence[str] | None = None) -> str:
    """Return authored prompt text without duplicating the slide heading."""

    values = list(texts if texts is not None else _meaningful_texts(slide))
    title = _normalise(slide.get("title"))
    if title and values and values[0] == title:
        values = values[1:]
    return "\n".join(values).strip() or "\n".join(texts or _slide_texts(slide)).strip()


def _word_limits(text: str) -> tuple[int | None, int | None]:
    match = re.search(r"\b(\d{1,3})\s*[-–—]\s*(\d{1,3})\s+words?\b", text.casefold())
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _time_limit(text: str) -> int | None:
    lowered = text.casefold()
    range_match = re.search(r"\b(\d{1,3})\s*(?:[-–—]|to)\s*(\d{1,3})\s*(?:seconds?|secs?)\b", lowered)
    if range_match:
        # For a range, keep the authored upper bound; no duration is invented
        # when the source gives no recording limit.
        return int(range_match.group(2))
    match = re.search(r"\b(\d{1,3})\s*(?:seconds?|secs?)\b", lowered)
    return int(match.group(1)) if match else None


def _tables(slide: Mapping[str, Any]) -> list[list[list[str]]]:
    def cell_text(value: Any) -> str:
        """Extract authored cell text without serializing the cell mapping."""

        if isinstance(value, Mapping):
            for key in ("text", "plainText", "value", "content"):
                raw_candidate = value.get(key)
                candidate = cell_text(raw_candidate) if isinstance(raw_candidate, (Mapping, list, tuple)) else _normalise(raw_candidate)
                if candidate:
                    return candidate
            for key in ("paragraphs", "runs", "spans", "segments", "lines"):
                nested = _unique_texts(cell_text(item) for item in _as_list(value.get(key)))
                if nested:
                    return " ".join(nested)
            return ""
        if isinstance(value, (list, tuple)):
            return " ".join(_unique_texts(cell_text(item) for item in value))
        return _normalise(value)

    def parse(raw_tables: Any) -> list[list[list[str]]]:
        result: list[list[list[str]]] = []
        for raw_table in _as_list(raw_tables):
            if isinstance(raw_table, Mapping):
                raw_rows = raw_table.get("rows", raw_table.get("cells", raw_table.get("values", [])))
            else:
                raw_rows = raw_table
            rows: list[list[str]] = []
            for raw_row in _as_list(raw_rows):
                if isinstance(raw_row, Mapping):
                    raw_row = raw_row.get("cells", raw_row.get("values", raw_row.get("columns", [])))
                cells = [cell_text(cell) for cell in _as_list(raw_row)]
                # Keep empty cells in the matrix: their positions carry the
                # authored column layout. Empty rows are retained when the
                # table has other content, but an entirely empty table is not
                # usable evidence.
                if cells:
                    rows.append(cells)
            if rows and any(cell for row in rows for cell in row):
                result.append(rows)
        return result

    raw_tables = slide.get("tables")
    if raw_tables is None and isinstance(slide.get("table"), Mapping):
        raw_tables = [slide.get("table")]
    published = parse(raw_tables)
    native = slide.get("_nativeAudit")
    if isinstance(native, Mapping):
        for key in ("tables", "actualTables", "tableData", "structuredTables"):
            native_tables = parse(native.get(key))
            if native_tables:
                # Native table evidence contains the real cell boundaries and
                # text. Prefer it whenever attached, even when the published
                # extractor supplied a Python-like cell repr.
                return native_tables
    return published


def _table_cell_texts(tables: Sequence[Sequence[Sequence[str]]]) -> set[str]:
    return {
        _normalise(cell).casefold()
        for table in tables
        for row in table
        for cell in row
        if _normalise(cell)
    }


def _learner_context_texts(
    slide: Mapping[str, Any],
    tables: Sequence[Sequence[Sequence[str]]],
    prompt_text: str,
    covered_texts: Sequence[str] | None = None,
    activity_prompts: Sequence[str] | None = None,
) -> list[str]:
    """Return authored teaching prose that needs its own visible text block.

    Published extraction can flatten a whole table into one long string while
    the native audit supplies the real matrix. Keep the surrounding
    explanation and rules, but omit exact table cells and flat strings that
    repeat several table cells. Activity prompts remain in their structured
    block; they are added back only when a blocked activity needs a source
    fallback later.
    """

    cell_texts = _table_cell_texts(tables)
    video_urls = {_normalise(url).casefold() for url in _video_urls(slide)}
    covered_keys = {
        _normalise(value).casefold()
        for value in (covered_texts or [])
        if _normalise(value)
    }
    prompt_values = list(activity_prompts or [])
    # ``_prompt_text`` is also used as a source fallback and can therefore be
    # an entire reading/chart paragraph. Only treat it as a duplicate activity
    # prompt when it is short or carries an explicit activity signal.
    if prompt_text and (
        len(_normalise(prompt_text)) < 120
        or _is_speaking_prompt(prompt_text)
        or _is_essay_prompt(prompt_text)
        or _is_short_answer_prompt(prompt_text)
        or _is_closed_answer_prompt(prompt_text)
    ):
        prompt_values.insert(0, prompt_text)
    prompt_keys = {
        _normalise(value).casefold()
        for value in prompt_values
        if _normalise(value)
    }
    source_open_prompts = {
        _normalise(prompt).casefold()
        for _native_type, prompt in _source_open_parts(slide)
        if _normalise(prompt)
    }
    source_open_labels = {
        label
        for label, prompt in _authored_letter_prompts(slide).items()
        if _normalise(prompt).casefold() in source_open_prompts
    }
    # Published extraction is authoritative. Put it first so a native audit's
    # joined paragraph is recognized as coverage of already-visible source
    # values instead of becoming a second learner paragraph.
    # A long published passage is authoritative; without a verified table,
    # native shape fragments from a different deck must not add a continuation.
    published_values = _meaningful_texts(slide)
    native_values = _native_paragraphs(slide)
    if any(len(value) >= 160 for value in published_values) and not tables:
        native_values = []
    candidates = [*published_values, *native_values]
    result: list[str] = []
    seen: set[str] = set()
    for raw_value in candidates:
        value = _normalise(raw_value)
        key = value.casefold()
        if not value or key in seen or key in prompt_keys or key in video_urls or key in covered_keys:
            continue
        activity_label = re.match(r"\s*([C-E])\.\s+", value)
        if activity_label and activity_label.group(1).upper() in source_open_labels:
            # Native audits sometimes preserve a corrected or differently
            # wrapped copy of a final D/E prompt. The source-open control owns
            # that learner action; retain the exact published copy in
            # originalSource without rendering a second prose block.
            continue
        # Native shape extraction can split “Let's Talk/Write” into tiny
        # fragments (for example ``Let�s`` + ``Talk``). Those section labels
        # are already represented by the structured control and are not
        # learner teaching prose.
        if len(value) <= 8 and (key.startswith("let") or key in {"talk", "write"}):
            continue
        if _is_technical_text(value):
            continue
        if key in cell_texts:
            continue
        if cell_texts:
            # A published flattened table often contains many cell values in
            # one string. Do not turn that serialization into a second giant
            # paragraph beside the structured matrix.
            matching_cells = sum(
                1
                for cell in cell_texts
                if len(cell) >= 8 and cell in key
            )
            if matching_cells >= 2:
                continue
        # Native paragraphs commonly arrive one-per-cell while the published
        # extractor also supplies one flattened paragraph. Once at least two
        # authored paragraphs are already visible, discard a later value that
        # is mostly their concatenation. This keeps rules and explanations
        # while avoiding a second rendered copy of the same table or heading.
        matching_prior = [
            prior
            for prior in result
            if len(prior) >= 8 and prior.casefold() in key
        ]
        if len(matching_prior) >= 2:
            covered_length = sum(len(prior) for prior in matching_prior)
            if covered_length / max(len(value), 1) >= 0.5:
                continue
        # Published extraction is authoritative. Native audits often split a
        # published paragraph into several shape-level fragments; once the
        # complete published value is retained, those fragments are already
        # learner-visible and must not become a second copy of the passage.
        if any(
            len(prior) >= len(value)
            and len(value) >= 40
            and key in prior.casefold()
            for prior in result
        ):
            continue
        seen.add(key)
        result.append(value)
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


def _is_teacher_led_listening_prompt(text: str) -> bool:
    lowered = _normalise(text).casefold()
    if not lowered:
        return False
    return bool(
        re.search(r"\b(?:listen|hear)\s+to\s+(?:your|the)\s+teacher\b", lowered)
        or re.search(r"\brepeat\b[^.!?\n]{0,100}\b(?:after|with)\s+(?:your|the)\s+teacher\b", lowered)
        or re.search(r"\bread\b[^.!?\n]{0,100}\baloud\s+to\s+(?:your|the)\s+teacher\b", lowered)
    )


def _teacher_led_listening_prompts(slide: Mapping[str, Any]) -> list[str]:
    return [
        value
        for value in _meaningful_texts(slide)
        if _is_teacher_led_listening_prompt(value)
    ]


def _is_replaced_listening_instruction(text: str) -> bool:
    """Identify old listening directions hidden by a reviewed replacement."""

    lowered = _normalise(text).casefold()
    return bool(
        re.search(
            r"(?:listen\s+to\s+(?:the\s+)?audio|answer\s+(?:the\s+)?questions?(?:\s+(?:your|the)\s+teacher)?|questions?\s+(?:your|the)\s+teacher|take\s+notes|\(\s*t\s*\)\s*\(\s*f\s*\)|\bt\s*/\s*f\b|\btrue\s*(?:/|or|-)?\s*false\b)",
            lowered,
        )
    )


def _is_audio_required(slide: Mapping[str, Any]) -> bool:
    media_audio = [item for item in _media(slide) if _media_kind(item) == "audio"]
    meaningful = _meaningful_texts(slide)
    if media_audio:
        # A real source clip is authoritative. Audio icons are only evidence
        # of a possible listening prompt; teacher-led and incidental prose
        # still needs to pass the textual listening check below.
        if any(not _is_audio_placeholder(item) for item in media_audio):
            return True
        if not meaningful:
            return True
    lowered = " ".join(meaningful).casefold()
    if not lowered or _is_teacher_led_listening_prompt(lowered):
        return False
    # Do not turn a reading sentence such as "listen to good music" into a
    # missing-audio blocker. Require a source-listening object or action.
    return bool(
        re.search(
            r"\blisten\s+(?:carefully\s+)?to\s+(?:(?:the|an?)\s+)?(?:audio|recording|conversation|dialogue|speaker|people\b[^.!?\n]{0,50}\b(?:talk|speak|say)|[a-z]+\s+[^.!?\n]{0,50}\b(?:talk|speak|say))",
            lowered,
        )
        or re.search(r"\blisten\s+for\s+(?:the\s+)?(?:words?|information|details?|sentences?|answer)", lowered)
        or re.search(r"\blisten\s+and\s+(?:answer|choose|identify|write|state|complete|select)", lowered)
        or re.search(r"\bhear\s+(?:the\s+)?(?:audio|recording|conversation|dialogue)", lowered)
    )


_PICTURE_REFERENCE_PATTERN = re.compile(r"\b(?:picture|photo(?:graph)?|image|illustration)\b", re.IGNORECASE)
_PICTURE_VISUAL_DIRECTIVE_PATTERN = re.compile(
    r"(?:"
    r"\b(?:look\s+(?:closely\s+)?at|observe|study|examine|view|describe|"
    r"discuss|talk\s+about|use|refer\s+to)\s+"
    r"(?:(?:the|a|an|this|that|these|those)\s+)?"
    r"(?:picture|photo(?:graph)?|image|illustration)s?\b"
    r"|\b(?:identify|find|match|point\s+to)\b[^.!?\n]{0,50}\b"
    r"(?:in|on|with|to)\s+(?:(?:the|a|an|this|that|these|those)\s+)?"
    r"(?:picture|photo(?:graph)?|image|illustration)s?\b"
    r"|\bwhat\s+(?:do\s+you\s+see|is|are)\b[^.!?\n]{0,40}\b"
    r"(?:in|on)\s+(?:(?:the|a|an|this|that|these|those)\s+)?"
    r"(?:picture|photo(?:graph)?|image|illustration)s?\b"
    r"|\b(?:answer|complete|write)\b[^.!?\n]{0,40}\b"
    r"(?:about|from|using|of)\s+(?:(?:the|a|an|this|that|these|those)\s+)?"
    r"(?:picture|photo(?:graph)?|image|illustration)s?\b"
    r")",
    re.IGNORECASE,
)
_PICTURE_TITLE_LABELS = {"picture", "pictures", "photo", "photos", "image", "images", "illustration", "illustrations"}
_PICTURE_NOUN_CONTEXT_PATTERN = re.compile(
    r"\b(?:the|a|an|this|that|these|those)\s+"
    r"(?:picture|photo(?:graph)?|image|illustration)s?\b",
    re.IGNORECASE,
)


def _is_picture_prompt_required(slide: Mapping[str, Any]) -> bool:
    """Return whether authored slide text requires a confirmed instructional image."""

    evidence = " ".join(_evidence_texts(slide)).strip()
    if not evidence or not _PICTURE_REFERENCE_PATTERN.search(evidence):
        return False
    title = _normalise(slide.get("title")).casefold()
    if title in _PICTURE_TITLE_LABELS:
        return True
    # A visual asset is required only when the source gives a visual
    # instruction or names a concrete picture/photo/image context. A broad
    # action-word check misclassified ordinary language such as “what clothes
    # you picture him/her wearing”, vocabulary lists containing PHOTOGRAPH,
    # and examples such as “Just picture how awkward it would be.”
    return bool(
        _PICTURE_VISUAL_DIRECTIVE_PATTERN.search(evidence)
        or _PICTURE_NOUN_CONTEXT_PATTERN.search(evidence)
    )


def _picture_prompt_texts(slide: Mapping[str, Any]) -> list[str]:
    """Return the authored visual instruction for learner-visible rendering."""

    if not _is_picture_prompt_required(slide):
        return []
    values = _meaningful_texts(slide)
    prompts = [value for value in values if _PICTURE_VISUAL_DIRECTIVE_PATTERN.search(value)]
    if prompts:
        return _unique_texts(prompts)
    return values[:1]


_CONFIRMED_FIGURE_LABELS = {
    "figure",
    "figures",
    "illustration",
    "illustrations",
    "instructional",
    "instructional-asset",
    "instructional-figure",
    "instructional-image",
    "instructional-illustration",
}


def _is_confirmed_native_figure(item: Any, collection: str) -> bool:
    """Accept generic image collections only with an explicit reviewed role."""

    if collection in {"figures", "instructionalImages", "illustrations"}:
        return True
    if not isinstance(item, Mapping):
        return False
    labels = {
        re.sub(r"[^a-z0-9]+", "-", _text(item.get(field)).casefold()).strip("-")
        for field in ("role", "classification", "assetType", "kind", "sourceType")
        if _text(item.get(field))
    }
    return bool(labels & _CONFIRMED_FIGURE_LABELS)


def _video_urls(slide: Mapping[str, Any]) -> list[str]:
    values: list[str] = []
    for item in _as_list(slide.get("media")):
        if isinstance(item, Mapping) and "video" in _media_kind(item):
            values.append(_text(item.get("url") or item.get("mediaUrl") or item.get("sourceUrl")))
    summary = slide.get("mediaSummary")
    if isinstance(summary, Mapping):
        values.extend(_text(value) for value in _as_list(summary.get("videoUrls")))
    for item in _as_list(slide.get("links")):
        if not isinstance(item, Mapping):
            continue
        kind = _normalise(item.get("kind")).casefold()
        url = _text(item.get("url") or item.get("href"))
        if "video" in kind or re.search(r"(?:youtube\.com|youtu\.be|vimeo\.com)/", url.casefold()):
            values.append(url)
    values.append(_text(slide.get("videoUrl")))
    return list(dict.fromkeys(value for value in values if value))


def _native_figures(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    """Return explicitly classified instructional figures from native evidence.

    Generic PPTX ``mediaRefs`` are intentionally excluded here.  They often point
    at a decorative slide background and are not sufficient evidence for a
    student-facing figure.  The audit producer must classify an image as a
    figure/instructional image and provide a local asset path before it can be
    emitted as a native image block.
    """

    native = _native_audit_payload(slide)
    if native is None:
        return []
    result: list[Mapping[str, Any]] = []
    for key in ("figures", "instructionalImages", "illustrations", "imageRefs", "images"):
        for item in _as_list(native.get(key)):
            if not _is_confirmed_native_figure(item, key):
                continue
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"path": _text(item)})
    return result


def _audio_url(item: Mapping[str, Any]) -> str:
    # Staged media exposes a browser-safe playback URL alongside the original
    # Drive asset. Prefer the staged/runtime URL so a Drive UI page is never
    # placed in an audio src. Existing direct media URLs remain supported.
    for key in (
        "playbackUrl",
        "playbackURL",
        "publicHref",
        "publicUrl",
        "publicURL",
        "runtimeUrl",
        "runtimeURL",
        "mediaUrl",
        "mediaURL",
        "url",
        "sourceUrl",
        "href",
        "originalMediaUrl",
        "originalMediaURL",
    ):
        value = _text(item.get(key))
        lowered = value.casefold()
        if value and not _is_drive_ui_url(value) and "slides-images-rt" not in lowered:
            return value
    return ""


def _is_drive_ui_url(value: str) -> bool:
    lowered = value.casefold()
    return "drive.google.com/file/d/" in lowered or "drive.google.com/open?id=" in lowered


def _audio_digest(item: Mapping[str, Any]) -> str:
    for key in ("mediaDigest", "digest", "sha256", "sourceSha256", "sourceSHA256", "mediaSHA256", "sha256Digest", "sourceDigest"):
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


def _is_audio_placeholder(item: Mapping[str, Any]) -> bool:
    """Identify published icons/rendered slide images that are not audio."""

    if item.get("iconOnly") is True:
        return True
    kind = _normalise(item.get("kind") or item.get("type") or "").casefold()
    return any(
        marker in kind
        for marker in ("audio-icon", "audio icon", "rendered-slide-image", "rendered slide image")
    )


def _audio_ordinal(item: Mapping[str, Any]) -> int | None:
    """Read the source audio ordinal; review manifests use 1-based values."""

    for key in ("audioIndex", "audioNumber", "audioOrdinal", "ordinal"):
        value = item.get(key)
        if isinstance(value, bool):
            continue
        try:
            ordinal = int(value)
        except (TypeError, ValueError):
            continue
        if ordinal > 0:
            return ordinal
    return None


def _audio_provenance(item: Mapping[str, Any]) -> dict[str, str]:
    fields: dict[str, str] = {}
    for key in (
        "originalMediaUrl",
        "originalMediaURL",
        "sourceUrl",
        "mediaUrl",
        "mediaURL",
        "playbackUrl",
        "playbackURL",
        "publicHref",
        "publicUrl",
        "publicURL",
    ):
        value = _text(item.get(key))
        if value:
            fields[key] = value
    return fields


def _native_audio_items(slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    native = _native_audit_payload(slide)
    if native is None:
        return []
    result: list[Mapping[str, Any]] = []
    for key in ("audio", "audios", "audioRefs", "audioEvidence"):
        for item in _as_list(native.get(key)):
            if isinstance(item, Mapping):
                if not _is_audio_placeholder(item):
                    result.append(item)
            elif _text(item):
                result.append({"url": _text(item), "kind": "audio"})
    return result


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
        if not _is_audio_placeholder(candidate) and (_audio_url(candidate) or _audio_transcript(candidate) or _audio_digest(candidate)):
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


def _native_audit_records(audit: Any) -> list[Mapping[str, Any]]:
    if isinstance(audit, list):
        return [item for item in audit if isinstance(item, Mapping)]
    if not isinstance(audit, Mapping):
        return []
    records = audit.get("records")
    if isinstance(records, list):
        return [item for item in records if isinstance(item, Mapping)]
    # Small audit fixtures often expose a single record directly.
    if audit.get("native") is not None or audit.get("slides") is not None:
        return [audit]
    return []


def _native_record_native(record: Mapping[str, Any]) -> Mapping[str, Any]:
    native = record.get("native")
    if isinstance(native, Mapping):
        return native
    return record


def _source_unit_number(source: Mapping[str, Any]) -> int | None:
    lesson = source.get("lesson")
    if isinstance(lesson, Mapping):
        value = lesson.get("order")
        try:
            if value is not None:
                return int(value)
        except (TypeError, ValueError):
            pass
    title = _text(_deck(source).get("deckTitle") or source.get("title"))
    match = re.search(r"\bunit\s*[-#]?\s*(\d{1,3})\b", title.casefold())
    return int(match.group(1)) if match else None


def _native_record_score(record: Mapping[str, Any], source: Mapping[str, Any]) -> int:
    candidate = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    comparison = record.get("publishedComparison") if isinstance(record.get("publishedComparison"), Mapping) else {}
    score = 0
    source_url = _source_url(source)
    candidate_url = _text(comparison.get("publicSourceUrl") or candidate.get("publicSourceUrl"))
    if source_url and candidate_url and source_url == candidate_url:
        score += 40
    source_unit = _source_unit_number(source)
    try:
        if source_unit is not None and int(record.get("unit")) == source_unit:
            score += 25
    except (TypeError, ValueError):
        pass
    record_lesson = _text(record.get("lessonId") or record.get("sourceLessonId"))
    if record_lesson and record_lesson == _source_lesson_id(source):
        score += 50
    source_title = _normalise(_deck(source).get("deckTitle") or source.get("title")).casefold()
    candidate_title = _normalise(candidate.get("title") or record.get("title")).casefold()
    if source_title and candidate_title:
        if source_title == candidate_title:
            score += 20
        elif source_title.replace(".pptx", "") == candidate_title.replace(".pptx", ""):
            score += 15
    role = _text(candidate.get("role")).casefold()
    if role == "primary-candidate":
        score += 5
    comparison_status = _text(comparison.get("status")).casefold()
    if comparison_status == "text-set-aligned":
        score += 8
    elif comparison_status in {"slide-count-diff-partial-overlap", "mismatch", "unmatched"}:
        score -= 15
    if _text(record.get("status")).casefold() not in {"", "ok", "ready", "published"}:
        score -= 100
    return score


def _select_native_record(
    audit: Any,
    source: Mapping[str, Any],
) -> tuple[Mapping[str, Any] | None, str | None]:
    records = _native_audit_records(audit)
    if not records:
        return None, "native audit has no records"
    scored = sorted(
        ((_native_record_score(record, source), record) for record in records),
        key=lambda item: (-item[0], _text(item[1].get("candidate", {}).get("id") if isinstance(item[1].get("candidate"), Mapping) else item[1].get("id"))),
    )
    best_score, best = scored[0]
    if best_score < 0:
        return None, "no native audit record matched the published source"
    tied = [record for score, record in scored if score == best_score]
    if len(tied) > 1:
        ids = {
            _text(record.get("candidate", {}).get("id") if isinstance(record.get("candidate"), Mapping) else record.get("id"))
            for record in tied
        }
        if len(ids) > 1:
            return None, "multiple native audit records matched with equal confidence"
    return best, None


def _alignment_texts(value: Any) -> list[str]:
    if isinstance(value, Mapping):
        values: list[Any] = []
        for key in ("visibleTexts", "texts", "paragraphs", "paragraphTexts", "title", "text"):
            if key in value:
                values.extend(_as_list(value.get(key)))
        return _unique_texts(_nested_text(item) for item in values)
    return _unique_texts(_nested_text(item) for item in _as_list(value))


def _alignment_match_texts(value: Any) -> list[str]:
    """Return authored slide text used to align supplemental native evidence.

    Native audits can carry paragraphs and tables that the published
    extraction missed.  Those payloads are supplemental and therefore are
    deliberately excluded from the first-pass slide match.  A native slide
    whose authored text itself differs still fails the strict match before any
    supplemental evidence can be merged.
    """

    if isinstance(value, Mapping):
        values: list[Any] = []
        for key in ("visibleTexts", "texts", "title", "text"):
            if key in value:
                values.extend(_as_list(value.get(key)))
        return _unique_texts(_nested_text(item) for item in values)
    return _unique_texts(_nested_text(item) for item in _as_list(value))


def _alignment_metrics(published: Mapping[str, Any], native: Mapping[str, Any]) -> tuple[float, float, float]:
    """Return published coverage, native precision, and text sequence scores."""

    published_text = " ".join(_alignment_match_texts(published)).casefold()
    native_text = " ".join(_alignment_match_texts(native)).casefold()
    published_text = _normalise(re.sub(r"[^\w\s]", " ", published_text, flags=re.UNICODE))
    native_text = _normalise(re.sub(r"[^\w\s]", " ", native_text, flags=re.UNICODE))
    if not published_text or not native_text:
        return 0.0, 0.0, 0.0
    published_tokens = set(published_text.split())
    native_tokens = set(native_text.split())
    if not published_tokens or not native_tokens:
        return 0.0, 0.0, 0.0
    overlap = len(published_tokens & native_tokens)
    coverage = overlap / len(published_tokens)
    precision = overlap / len(native_tokens)
    sequence = SequenceMatcher(None, published_text, native_text).ratio()
    return coverage, precision, sequence


def _alignment_score(published: Mapping[str, Any], native: Mapping[str, Any]) -> float:
    published_text = " ".join(_alignment_match_texts(published)).casefold()
    native_text = " ".join(_alignment_match_texts(native)).casefold()
    published_text = re.sub(r"[^\w\s]", " ", published_text, flags=re.UNICODE)
    native_text = re.sub(r"[^\w\s]", " ", native_text, flags=re.UNICODE)
    published_text = _normalise(published_text)
    native_text = _normalise(native_text)
    if not published_text or not native_text:
        return 0.0
    if published_text == native_text:
        return 1.0
    coverage, _precision, sequence = _alignment_metrics(published, native)
    same_number = _slide_number(published) == _slide_number(native)
    score = max(sequence, coverage * 0.92)
    if same_number:
        score += 0.03
    return min(score, 1.0)


def _native_slide_matches(
    slides: Sequence[Mapping[str, Any]],
    native_slides: Sequence[Mapping[str, Any]],
) -> dict[int, Mapping[str, Any]]:
    result: dict[int, Mapping[str, Any]] = {}
    used: set[int] = set()
    for published in slides:
        candidates: list[tuple[float, int, Mapping[str, Any]]] = []
        for index, native in enumerate(native_slides):
            if index in used:
                continue
            if _slide_number(published) != _slide_number(native):
                continue
            coverage, precision, sequence = _alignment_metrics(published, native)
            # Native evidence is supplemental. Require the strict per-slide
            # evidence bar used by the audit review before attaching it. A
            # low-confidence native slide is ignored so published content can
            # still produce readable source blocks.
            if min(coverage, precision, sequence) < 0.90:
                continue
            score = _alignment_score(published, native)
            if score >= 0.76:
                candidates.append((score, index, native))
        candidates.sort(key=lambda item: (-item[0], item[1]))
        if not candidates:
            continue
        best_score, best_index, best_native = candidates[0]
        if len(candidates) > 1 and candidates[1][0] >= best_score - 0.01:
            continue
        result[_slide_number(published)] = best_native
        used.add(best_index)
    return result


def _native_figure_entries(native_slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for key in ("figures", "instructionalImages", "illustrations", "imageRefs", "images"):
        for item in _as_list(native_slide.get(key)):
            if not _is_confirmed_native_figure(item, key):
                continue
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"path": _text(item)})
    return result


def _native_tables_payload(native_slide: Mapping[str, Any]) -> Any:
    for key in ("tables", "actualTables", "tableData", "structuredTables"):
        candidate = native_slide.get(key)
        if candidate not in (None, "", [], {}):
            return copy.deepcopy(candidate)
    shape_tables: list[Any] = []
    for shape in _as_list(native_slide.get("shapes")):
        if not isinstance(shape, Mapping):
            continue
        kind = _text(shape.get("kind") or shape.get("type")).casefold()
        if "table" not in kind and not any(key in shape for key in ("rows", "cells", "columns")):
            continue
        table = shape.get("table") if isinstance(shape.get("table"), Mapping) else shape
        shape_tables.append(table)
    return shape_tables or None


_FIGURE_DIGEST_KEYS = (
    "sourceSha256",
    "verifiedSourceSha256",
    "sha256",
    "dedupSha256",
    "sourceDigest",
)


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _independently_verified_figure(
    figure: Any,
    record: Mapping[str, Any],
    native_slide: Mapping[str, Any],
    source_slide_number: int,
    audit_path: str,
) -> Mapping[str, Any] | None:
    """Validate a figure whose native slide text did not meet alignment.

    A figure may be admitted independently when the source audit attached an
    explicit reviewed proof and the local payload bytes match its SHA-256.
    This keeps the native text alignment threshold strict while allowing an
    independently verified original image to survive a prose mismatch.
    """

    if not isinstance(figure, Mapping) or figure.get("confirmedInstructional") is not True:
        return None
    try:
        figure_slide = int(
            figure.get("publishedSlideNumber")
            or figure.get("sourceSlideNumber")
            or figure.get("slideNumber")
            or figure.get("slide")
        )
    except (TypeError, ValueError):
        return None
    if figure_slide != source_slide_number:
        return None
    figure_unit = figure.get("unit")
    if figure_unit not in (None, ""):
        try:
            if int(figure_unit) != int(record.get("unit")):
                return None
        except (TypeError, ValueError):
            return None

    evidence = figure.get("nativeEvidence")
    if not isinstance(evidence, Mapping):
        return None
    proof_ref = figure.get("sourceProofRef")
    if not isinstance(proof_ref, Mapping):
        proof_ref = evidence.get("sourceProofRef") if isinstance(evidence.get("sourceProofRef"), Mapping) else None
    proof_reviewed = evidence.get("reviewed") is True or bool(_text(evidence.get("mapping")))
    proof_exact = isinstance(proof_ref, Mapping) and proof_ref.get("byteExactMatch") is True
    if not proof_reviewed and not proof_exact:
        return None

    digests: list[str] = []
    for container in (figure, evidence, proof_ref or {}):
        if not isinstance(container, Mapping):
            continue
        for key in _FIGURE_DIGEST_KEYS + ("publishedReferenceSha256",):
            candidate = _text(container.get(key)).casefold()
            if candidate:
                if not re.fullmatch(r"[0-9a-f]{64}", candidate):
                    return None
                digests.append(candidate)
    if not digests or len(set(digests)) != 1:
        return None
    digest = digests[0]

    path_value = ""
    for key in ("assetPath", "localPath", "sourcePath", "filePath", "imagePath", "mediaPath", "path"):
        path_value = _text(figure.get(key))
        if path_value:
            break
    asset_path = _resolve_native_asset_path(path_value, record, native_slide, audit_path)
    if not asset_path:
        return None
    try:
        if _file_sha256(Path(asset_path)).casefold() != digest:
            return None
    except OSError:
        return None
    browser_url = _native_figure_browser_url(figure, asset_path)
    if not browser_url:
        return None

    normalized = copy.deepcopy(dict(figure))
    normalized["assetPath"] = asset_path
    normalized["localPath"] = asset_path
    normalized["publicUrl"] = browser_url
    normalized["sourceSha256"] = digest
    normalized["verifiedSourceSha256"] = digest
    normalized["_independentProof"] = True
    return normalized


def _native_audio_entries(native_slide: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    result: list[Mapping[str, Any]] = []
    for key in ("audio", "audios", "audioRefs", "audioEvidence"):
        for item in _as_list(native_slide.get(key)):
            if isinstance(item, Mapping):
                result.append(item)
            elif _text(item):
                result.append({"url": _text(item), "kind": "audio"})
    return result


def _resolve_native_asset_path(
    value: Any,
    record: Mapping[str, Any],
    native_slide: Mapping[str, Any],
    audit_path: str,
) -> str | None:
    raw = _text(value)
    native = _native_record_native(record)
    if raw:
        for media in _as_list(native.get("media")):
            if not isinstance(media, Mapping):
                continue
            media_key = _text(media.get("path") or media.get("mediaPath") or media.get("ref"))
            if media_key and media_key == raw:
                raw = _text(media.get("localPath") or media.get("assetPath") or media.get("filePath")) or raw
                break
        asset_map = native.get("assetMap")
        if isinstance(asset_map, Mapping):
            mapped = _text(asset_map.get(raw))
            if mapped:
                raw = mapped
    if not raw or re.match(r"^[a-z]+://", raw.casefold()) or "slides-images-rt" in raw.casefold():
        return None
    lowered = raw.casefold()
    if "rendered-slide" in lowered or lowered.endswith(".pptx"):
        return None
    candidate_record = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    bases: list[Path] = []
    if audit_path:
        path = Path(audit_path)
        bases.append(path.parent if path.suffix else path)
    for owner in (candidate_record, native, record, native_slide):
        if not isinstance(owner, Mapping):
            continue
        for key in ("assetRoot", "mediaRoot", "extractedDir", "localRoot", "basePath"):
            base = _text(owner.get(key))
            if base:
                bases.append(Path(base))
        local = _text(owner.get("localPath") or owner.get("path"))
        if local and not local.casefold().endswith(".pptx"):
            bases.append(Path(local).parent)
    bases.extend([Path.cwd()])
    paths = [Path(raw)] if Path(raw).is_absolute() else [base / raw for base in bases]
    for path in paths:
        try:
            resolved = path.resolve()
        except OSError:
            continue
        if resolved.is_file():
            return str(resolved)
    return None


def _native_figure_browser_url(figure: Mapping[str, Any], asset_path: str) -> str | None:
    """Resolve a browser-safe image URL while retaining the local asset path."""

    for key in ("playbackUrl", "playbackURL", "publicHref", "publicUrl", "publicURL", "browserUrl", "src", "url"):
        candidate = _text(figure.get(key))
        if not candidate or _is_drive_ui_url(candidate):
            continue
        lowered = candidate.casefold()
        if lowered.startswith("public/"):
            return "/" + candidate[7:].lstrip("/").replace("\\", "/")
        if lowered.startswith(("/", "http://", "https://")):
            return candidate
        if lowered.startswith(("images/", "audio/")):
            return "/" + candidate.replace("\\", "/")

    # Staged local assets live under the repository's public directory. Derive
    # the browser path only for that explicit public root; a private temporary
    # filesystem path cannot be published safely.
    try:
        resolved = Path(asset_path).resolve()
    except OSError:
        return None
    for parent in (resolved, *resolved.parents):
        if parent.name.casefold() != "public":
            continue
        try:
            relative = resolved.relative_to(parent)
        except ValueError:
            continue
        return "/" + relative.as_posix().lstrip("/")
    return None


def _prepare_native_audit(
    source: Mapping[str, Any],
    native_audit: Any,
    blockers: list[dict[str, Any]],
) -> dict[str, Any]:
    """Attach only unambiguously aligned native evidence to a source copy."""

    copied = copy.deepcopy(dict(source))
    if native_audit is None:
        return copied
    record, error = _select_native_record(native_audit, source)
    if record is None:
        # Native extraction is an optional enrichment. A missing or unrelated
        # record must not make the published text unpublishable; required
        # authored media/table evidence is validated from the published source
        # below.
        return copied
    status = _text(record.get("status")).casefold()
    if status and status not in {"ok", "ready", "published"}:
        # Keep the record unavailable as supplemental evidence, while letting
        # the published extraction proceed through its own readiness checks.
        return copied
    native = _native_record_native(record)
    native_slides = [item for item in _as_list(native.get("slides")) if isinstance(item, Mapping)]
    source_slides = _slides(copied)
    matched = _native_slide_matches(source_slides, native_slides)
    audit_path = _text(native_audit.get("_auditPath")) if isinstance(native_audit, Mapping) else ""
    candidate = record.get("candidate") if isinstance(record.get("candidate"), Mapping) else {}
    record_id = _text(candidate.get("id") or record.get("id"))
    vector_projection_by_slide: dict[int, Mapping[str, Any]] = {}
    for vector_review in _native_vector_review_candidates(native_audit):
        scope = vector_review.get("scope")
        if not isinstance(scope, Mapping):
            continue
        try:
            scoped_unit = int(scope.get("unit"))
            scoped_lesson = _text(scope.get("lessonId"))
            scoped_slide = int(scope.get("publishedSlide"))
        except (TypeError, ValueError):
            continue
        if scoped_unit != _source_unit_number(source) or scoped_lesson != _source_lesson_id(source):
            continue
        target_slide = next((item for item in source_slides if _slide_number(item) == scoped_slide), None)
        if target_slide is None:
            continue
        projection, projection_error = _vector_calendar_projection_for_slide(vector_review, source, target_slide)
        if projection is None:
            _add_blocker(
                blockers,
                _blocker(
                    "native-vector-calendar-invalid",
                    scoped_slide,
                    projection_error or "Reviewed vector calendar evidence failed validation.",
                ),
            )
            continue
        if scoped_slide in vector_projection_by_slide:
            _add_blocker(
                blockers,
                _blocker(
                    "native-vector-calendar-ambiguous",
                    scoped_slide,
                    "More than one reviewed vector calendar projection matched the published slide.",
                ),
            )
            continue
        vector_projection_by_slide[scoped_slide] = projection
    for slide in source_slides:
        number = _slide_number(slide)
        native_slide = matched.get(number)
        if native_slide is None:
            # A mismatched native slide is discarded as supplemental prose and
            # table evidence. A separately reviewed, byte-verified figure may
            # still be attached to the exact published slide without lowering
            # the whole-slide alignment threshold.
            if _is_picture_prompt_required(slide):
                independent_figures: list[Mapping[str, Any]] = []
                seen_digests: set[str] = set()
                for candidate_slide in native_slides:
                    for figure in _native_figure_entries(candidate_slide):
                        verified = _independently_verified_figure(
                            figure,
                            record,
                            candidate_slide,
                            number,
                            audit_path,
                        )
                        if verified is None:
                            continue
                        digest = _text(verified.get("sourceSha256")).casefold()
                        if digest in seen_digests:
                            continue
                        seen_digests.add(digest)
                        independent_figures.append(verified)
                if independent_figures:
                    slide["_nativeAudit"] = {
                        "recordId": record_id,
                        "slideNumber": number,
                        "paragraphs": [],
                        "tables": None,
                        "figures": copy.deepcopy(independent_figures),
                        "figureEvidencePresent": True,
                        "audio": [],
                        "nativeTexts": [],
                    }
            continue
        paragraphs = _unique_texts(
            _nested_text(value)
            for key in ("paragraphs", "paragraphTexts", "textBlocks", "richText", "bodyText")
            for value in _as_list(native_slide.get(key))
        )
        for shape in _as_list(native_slide.get("shapes")):
            if isinstance(shape, Mapping):
                paragraphs = _unique_texts([*paragraphs, *(_nested_text(value) for value in _as_list(shape.get("paragraphs")))])
        native_tables = _native_tables_payload(native_slide)
        figures: list[dict[str, Any]] = []
        required_figure = _is_picture_prompt_required(slide)
        figure_entries = _native_figure_entries(native_slide)
        for figure in figure_entries:
            figure_lesson = _text(figure.get("lessonId") or figure.get("sourceLessonId"))
            figure_slide = figure.get("slideNumber", figure.get("slide", figure.get("slideNo")))
            if figure_lesson and figure_lesson != _source_lesson_id(source):
                if required_figure:
                    _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure evidence is scoped to another lesson."))
                continue
            if figure_slide is not None:
                try:
                    if int(figure_slide) != number:
                        if required_figure:
                            _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure evidence is scoped to another slide."))
                        continue
                except (TypeError, ValueError):
                    if required_figure:
                        _add_blocker(blockers, _blocker("native-figure-mismatch", number, "Native figure slide scope is invalid."))
                    continue
            source_purpose = _text(figure.get("sourcePurpose") or figure.get("sourcePrompt") or figure.get("sourceQuestion"))
            if source_purpose:
                purpose_key = _normalise(re.sub(r"[^\w\s]", " ", source_purpose, flags=re.UNICODE)).casefold()
                published_key = _normalise(
                    re.sub(r"[^\w\s]", " ", " ".join(_alignment_match_texts(slide)), flags=re.UNICODE)
                ).casefold()
                if purpose_key not in published_key and published_key not in purpose_key:
                    if required_figure:
                        _add_blocker(
                            blockers,
                            _blocker("native-figure-mismatch", number, "Native figure purpose does not match the published slide."),
                        )
                    continue
            path_value = ""
            for key in ("localPath", "assetPath", "filePath", "imagePath", "mediaPath", "path", "src", "url"):
                path_value = _text(figure.get(key))
                if path_value:
                    break
            asset_path = _resolve_native_asset_path(path_value, record, native_slide, audit_path)
            if not asset_path:
                if required_figure:
                    _add_blocker(
                        blockers,
                        _blocker("native-figure-untraceable", number, "Instructional figure has no traceable local asset path."),
                    )
                continue
            browser_url = _native_figure_browser_url(figure, asset_path)
            if not browser_url:
                if required_figure:
                    _add_blocker(
                        blockers,
                        _blocker("native-figure-unpublishable", number, "Instructional figure has no public browser URL."),
                    )
                continue
            figures.append(
                {
                    "assetPath": asset_path,
                    "url": browser_url,
                    "alt": _text(figure.get("alt") or figure.get("description")) or _text(slide.get("title")) or "Source figure",
                    **({"caption": _text(figure.get("caption"))} if _text(figure.get("caption")) else {}),
                    **({"sourcePurpose": source_purpose} if source_purpose else {}),
                }
            )
        audio_entries: list[Mapping[str, Any]] = []
        for audio_entry in _native_audio_entries(native_slide):
            entry_lesson = _text(audio_entry.get("lessonId") or audio_entry.get("sourceLessonId"))
            entry_slide = audio_entry.get("slideNumber", audio_entry.get("slide", audio_entry.get("slideNo")))
            slide_mismatch = False
            if entry_lesson and entry_lesson != _source_lesson_id(source):
                slide_mismatch = True
            if entry_slide is not None:
                try:
                    slide_mismatch = slide_mismatch or int(entry_slide) != number
                except (TypeError, ValueError):
                    slide_mismatch = True
            if slide_mismatch:
                if _is_audio_required(slide):
                    _add_blocker(
                        blockers,
                        _blocker("native-audio-mismatch", number, "Native audio evidence is scoped to another lesson or slide."),
                    )
                continue
            audio_entries.append(audio_entry)
        if native_tables is not None and not _tables({"tables": native_tables}):
            if re.search(r"\b(?:table|chart|grid|columns?)\b", " ".join(_meaningful_texts(slide)).casefold()):
                _add_blocker(blockers, _blocker("native-table-unreadable", number, "Native audit table evidence has no usable cells."))
            native_tables = None
        slide["_nativeAudit"] = {
            "recordId": record_id,
            "slideNumber": _slide_number(native_slide),
            "paragraphs": paragraphs,
            "tables": native_tables,
            "figures": figures,
            "figureEvidencePresent": bool(figure_entries),
            "audio": copy.deepcopy(audio_entries),
            "nativeTexts": copy.deepcopy(_alignment_texts(native_slide)),
        }
    for slide in source_slides:
        projection = vector_projection_by_slide.get(_slide_number(slide))
        if projection is None:
            continue
        existing = slide.get("_nativeAudit") if isinstance(slide.get("_nativeAudit"), Mapping) else {}
        merged = copy.deepcopy(dict(existing))
        merged.setdefault("recordId", record_id or "vector-calendar-review")
        merged.setdefault("slideNumber", _slide_number(slide))
        merged.setdefault("paragraphs", [])
        merged.setdefault("tables", None)
        merged.setdefault("figures", [])
        merged.setdefault("figureEvidencePresent", False)
        merged.setdefault("audio", [])
        merged.setdefault("nativeTexts", [])
        merged["vectorSemanticProjection"] = copy.deepcopy(dict(projection))
        slide["_nativeAudit"] = merged
    return copied


def _audio_candidates(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    audio_manifest: Any,
) -> list[Mapping[str, Any]]:
    candidates: list[Mapping[str, Any]] = []
    for item in _media(slide):
        if _media_kind(item) == "audio" and not _is_audio_placeholder(item):
            candidates.append(item)
    candidates.extend(_native_audio_items(slide))
    candidates.extend(_audio_manifest_entries(audio_manifest, lesson_id, _slide_number(slide)))
    source_audio = source.get("audio") or source.get("audioManifest")
    candidates.extend(_audio_manifest_entries(source_audio, lesson_id, _slide_number(slide)))
    # A source-level manifest may use a unit and slide key instead of entries.
    source_deck = _deck(source)
    candidates.extend(_audio_manifest_entries(source_deck.get("audio"), lesson_id, _slide_number(slide)))
    deduped: list[Mapping[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for item in candidates:
        key = (
            _audio_url(item),
            _audio_digest(item),
            _audio_transcript(item),
            str(_audio_ordinal(item) or ""),
        )
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


def _plain_learner_text(value: Any) -> str:
    """Return learner-visible text for strict duplicate containment checks."""

    # The builder creates paragraph wrappers itself. Strip those wrappers
    # before comparing, while leaving punctuation and authored wording intact.
    without_tags = re.sub(r"<[^>]*>", " ", _text(value))
    return _normalise(html.unescape(without_tags)).casefold()


def _drop_contained_passage_specs(
    specs: Sequence[tuple[str, dict[str, Any]]],
    source_slide_number: int,
) -> list[tuple[str, dict[str, Any]]]:
    """Remove a repeated long passage from one published source slide.

    A native audit can cause the published passage to be emitted once in the
    teaching context and again as the dedicated reading passage. The context
    is the learner-visible source block we keep: a shorter text is removable
    only when its complete normalized text occurs literally inside a longer
    learner-visible text from this same slide. Activities, audio, teacher
    notes, and short labels are never candidates.
    """

    # ``specs`` is assembled for one slide by ``_native_block_specs``. Keep an
    # explicit slide argument in the helper contract so callers cannot reuse
    # this rule across source slides accidentally.
    if source_slide_number <= 0:
        return list(specs)
    text_candidates: list[tuple[int, str, str]] = []
    for index, (native_type, payload) in enumerate(specs):
        if native_type != "text" or payload.get("hiddenFromLearners") is True:
            continue
        content = payload.get("content")
        if not isinstance(content, str):
            continue
        plain = _plain_learner_text(content)
        if len(plain) < 300:
            continue
        text_candidates.append((index, plain, _text(payload.get("sourceRole"))))

    remove: set[int] = set()
    for shorter_index, shorter, _shorter_role in text_candidates:
        for longer_index, longer, _longer_role in text_candidates:
            if shorter_index == longer_index or len(longer) <= len(shorter):
                continue
            # The current list is source-slide scoped; this guard documents and
            # enforces the intended provenance when a caller adds metadata.
            shorter_slide = specs[shorter_index][1].get("sourceSlide")
            longer_slide = specs[longer_index][1].get("sourceSlide")
            if shorter_slide not in (None, source_slide_number) or longer_slide not in (None, source_slide_number):
                continue
            if shorter in longer:
                remove.add(shorter_index)
                break

    return [item for index, item in enumerate(specs) if index not in remove]


def _dedupe_picture_instruction_specs(
    specs: Sequence[tuple[str, dict[str, Any]]],
    source_slide_number: int,
) -> list[tuple[str, dict[str, Any]]]:
    """Keep one protected picture prompt while retaining any new suffix prose."""

    if source_slide_number <= 0:
        return list(specs)
    protected = [
        (index, payload)
        for index, (native_type, payload) in enumerate(specs)
        if native_type == "text"
        and not payload.get("hiddenFromLearners") is True
        and _text(payload.get("sourceRole")).casefold() == "picture-instruction"
        and isinstance(payload.get("content"), str)
    ]
    if not protected:
        return list(specs)

    remove: set[int] = set()
    replacements: dict[int, dict[str, Any]] = {}
    for index, (native_type, payload) in enumerate(specs):
        if (
            native_type != "text"
            or payload.get("hiddenFromLearners") is True
            or _text(payload.get("sourceRole")).casefold() == "picture-instruction"
            or not isinstance(payload.get("content"), str)
        ):
            continue
        ordinary_content = _text(payload["content"])
        ordinary_plain = _plain_learner_text(ordinary_content)
        if not ordinary_plain:
            continue
        for _protected_index, protected_payload in protected:
            protected_content = _text(protected_payload["content"])
            protected_plain = _plain_learner_text(protected_content)
            if not protected_plain or not ordinary_plain.startswith(protected_plain):
                continue
            # A strict raw-prefix match is required before changing a longer
            # block. This preserves every suffix paragraph byte-for-byte and
            # avoids trimming prose when normalization only made two strings
            # look similar.
            if ordinary_content == protected_content:
                remove.add(index)
                break
            if not ordinary_content.startswith(protected_content):
                continue
            suffix = ordinary_content[len(protected_content) :].lstrip()
            if not _plain_learner_text(suffix):
                remove.add(index)
                break
            copied = copy.deepcopy(payload)
            copied["content"] = suffix
            replacements[index] = copied
            break

    return [
        (native_type, replacements.get(index, payload))
        for index, (native_type, payload) in enumerate(specs)
        if index not in remove
    ]


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


def _multiple_choice_options(options: Any, answer: Any, slide_number: int) -> tuple[list[dict[str, str]], str]:
    normalized: list[dict[str, str]] = []
    for index, option in enumerate(_as_list(options), start=1):
        if isinstance(option, Mapping):
            option_id = _text(option.get("id") or option.get("value"))
            option_text = _text(option.get("text") or option.get("label") or option.get("value"))
        else:
            option_id = ""
            option_text = _text(option)
        option_id = option_id or f"course-choice-{slide_number}-{index:03d}"
        normalized.append({"id": option_id, "text": option_text})

    answer_id = ""
    answer_text = ""
    if isinstance(answer, Mapping):
        answer_id = _text(answer.get("id") or answer.get("optionId") or answer.get("correctOptionId"))
        answer_text = _text(answer.get("text") or answer.get("label") or answer.get("value"))
    else:
        answer_text = _text(answer)
        answer_id = answer_text
    for option in normalized:
        if option["id"] == answer_id or option["text"] == answer_text:
            return normalized, option["id"]
    return normalized, answer_id


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


def _is_closed_answer_prompt(text: str) -> bool:
    """Identify activities that need an authored key before native grading."""

    lowered = text.casefold()
    if re.search(r"\b(?:your own|personal information|about yourself|own answer|own opinion)\b", lowered):
        return False
    return bool(
        re.search(
            r"\b(?:true\s*(?:/|or|-)?\s*false|multiple[- ]?choice|choose|select|pick|fill\s+in|complete\s+(?:the|each|these)\s+(?:sentence|blank|space)|identify|state whether|change .*\b(?:interrogative|negative|question|form)|transform)\b",
            lowered,
        )
    )


def _is_reading(text: str) -> bool:
    lowered = text.casefold()
    return len(text) >= 160 or bool(re.search(r"\b(?:read the text|reading|read aloud)\b", lowered))


def _reading_passage_texts(slide: Mapping[str, Any], evidence_texts: Sequence[str]) -> list[str]:
    """Select the authored passage while leaving reviewed questions in activity rows.

    Published slide extraction often puts a reading passage, its instruction,
    and a compact question list in one slide. The question review already has
    native rows, so rendering every evidence string here repeats the activity
    and can put the questions before the passage. Prefer the longest authored
    prose that is not an instruction/question list; keep all evidence only as
    a conservative fallback for unusual short readings.
    """

    values = _unique_texts(evidence_texts)
    if not values:
        return []
    source_activity_keys = {
        _normalise(prompt).casefold()
        for _native_type, prompt in _source_open_parts(slide)
        if _normalise(prompt)
    }
    source_activity_labels = {
        label
        for label, prompt in _authored_letter_prompts(slide).items()
        if _normalise(prompt).casefold() in source_activity_keys
    }

    def collect(values_to_check: Sequence[str]) -> list[str]:
        candidates: list[str] = []
        for value in _unique_texts(values_to_check):
            lowered = value.casefold()
            if lowered in source_activity_keys:
                continue
            activity_label = re.match(r"\s*([C-E])\.\s+", value)
            if activity_label and activity_label.group(1).upper() in source_activity_labels:
                continue
            # Only treat the leading sentence as a slide instruction when it
            # actually starts with a directive. A reading passage can contain
            # ordinary prose such as “After that…” or dialogue questions; the
            # old broad search truncated those authored paragraphs.
            instruction_prefix = re.match(
                r"\s*(?:[A-Z]\.\s*)?(?:read\b|answer\b|after that\b|questions?\s+below\b|read\s+.*\baloud\b|choose\b|select\b|complete\b|listen\s+to\s+the\s+audio\b|write\b|act\s+out\b|discuss\b|look\s+at\b)",
                lowered,
            )
            # Some published extractors flatten the instruction and passage
            # into one string. Preserve the authored prose after its closing
            # instruction sentence, including extraction/dialogue variants.
            if instruction_prefix:
                instruction_tail = re.search(
                    r"\b(?:questions?\s*(?:below)?|space\s+provided|corresponding\s+function|read\s+the\s+(?:text|dialogue|paragraph)|teacher)\s*[.!?]\s+",
                    lowered,
                )
                if instruction_tail:
                    tail = value[instruction_tail.end() :].strip()
                    if len(tail) >= 120 and not re.search(
                        r"\b(?:write|act out|listen to the audio|choose|select|complete)\b",
                        tail.casefold(),
                    ):
                        candidates.append(tail)
                        continue
                continue
            # Final D/E activities can mention a reading section and are often
            # long enough to look like a passage. Their native controls own
            # that text; never promote the authored activity into a duplicate
            # reading block.
            if re.match(r"\s*[A-E]\.\s+", value) and (
                _is_essay_prompt(value) or _is_speaking_prompt(value)
            ):
                continue
            # A question list extracted as one paragraph is activity metadata,
            # not the reading passage.
            question_count = len(re.findall(r"\b\d+\.\s+[^.!?]*\?", value))
            if instruction_prefix and question_count >= 2:
                continue
            if len(value) >= 120:
                candidates.append(value)
        return candidates

    # Published text is authoritative. Native paragraphs are supplemental and
    # must never replace an aligned published reading with another deck's text.
    published_values = _unique_texts(_meaningful_texts(slide))
    published_candidates = collect(published_values)
    candidates = published_candidates or collect([value for value in values if value not in published_values])
    if candidates:
        longest = max(candidates, key=lambda value: (len(value), -values.index(value) if value in values else 0))
        return [longest]
    if any(
        re.search(
            r"\b(?:write|act out|listen to the audio|answer the questions?|complete|choose|select|look at|discuss with)\b",
            value.casefold(),
        )
        for value in values
    ):
        return []
    return [
        value
        for value in values
        if _normalise(value).casefold() not in source_activity_keys
        and not (
            (activity_label := re.match(r"\s*([C-E])\.\s+", value))
            and activity_label.group(1).upper() in source_activity_labels
        )
    ]


def _ai_grading_context(
    slide: Mapping[str, Any],
    prompt_text: str,
    audio_item: Mapping[str, Any] | None = None,
    source: Mapping[str, Any] | None = None,
) -> str:
    parts = ["Evaluate the learner response against the authored source prompt."]
    source_text = "\n".join(_meaningful_texts(slide)).strip()
    if source_text and _is_reading(source_text):
        parts.append(f"Authored passage/context:\n{source_text}")
    elif source is not None and re.search(r"\b(?:passage|text|reading|according to|based on|following|answer)", prompt_text.casefold()):
        current_number = _slide_number(slide)
        previous = [
            candidate
            for candidate in _slides(source)
            if _slide_number(candidate) < current_number and _is_reading("\n".join(_meaningful_texts(candidate)))
        ]
        if previous:
            passage = "\n".join(_meaningful_texts(previous[-1])).strip()
            if passage:
                parts.append(f"Authored preceding passage/context:\n{passage}")
    transcript = _audio_transcript(audio_item) if audio_item is not None else ""
    if transcript:
        parts.append(f"Authored audio transcript:\n{transcript}")
    return "\n\n".join(parts)


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


def _exercise_review_text_signature(slide: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "number": _slide_number(slide),
        "title": _normalise(slide.get("title")),
        "visibleTexts": _unique_texts(_slide_texts(slide)),
    }


def _exercise_review_text_digest_variants(slide: Mapping[str, Any]) -> set[str]:
    signature = _exercise_review_text_signature(slide)
    visible_texts = signature["visibleTexts"]
    raw_visible_texts = _unique_texts([*_as_list(slide.get("visibleTexts")), *_as_list(slide.get("texts"))])
    if not raw_visible_texts and slide.get("text") is not None:
        raw_visible_texts = _unique_texts([slide.get("text")])
    payloads: list[Any] = [
        signature,
        {"title": signature["title"], "visibleTexts": visible_texts},
        visible_texts,
        "\n".join(visible_texts),
        raw_visible_texts,
        "\n".join(raw_visible_texts),
    ]
    variants = {_canonical_digest(payload) for payload in payloads}
    for payload in payloads:
        if isinstance(payload, str):
            variants.add(hashlib.sha256(payload.encode("utf-8")).hexdigest())
    return variants


def _exercise_review_evidence_matches(evidence: Any, slide: Mapping[str, Any]) -> bool:
    needle = _normalise(evidence).casefold()
    if not needle:
        return False
    haystack = _normalise("\n".join(_slide_texts(slide))).casefold()
    if needle in haystack:
        return True
    chunks = [chunk.strip() for chunk in re.split(r"(?:\.\.\.|…)", needle) if chunk.strip()]
    if len(chunks) > 1 and all(chunk in haystack for chunk in chunks):
        return True
    tokens = [token for token in re.findall(r"[a-z0-9']+", needle) if len(token) > 2]
    if not tokens:
        return False
    matched = sum(token in haystack for token in tokens)
    if len(tokens) <= 4:
        return matched == len(tokens)
    return matched >= max(3, int(len(tokens) * 0.65))


def _exercise_review_item_evidence(item: Mapping[str, Any]) -> list[str]:
    evidence = [_text(value) for value in _as_list(item.get("sourceEvidence")) if _text(value)]
    for answer_item in _as_list(item.get("answerItems")):
        if isinstance(answer_item, Mapping):
            evidence.extend(_text(value) for value in _as_list(answer_item.get("evidence")) if _text(value))
    return _unique_texts(evidence)


def _exercise_review_required_for_slide(slide: Mapping[str, Any]) -> bool:
    """Require review only for authored activity cues, not explanatory charts.

    Grammar reference slides often contain example questions, ``complete`` in
    explanatory prose, or the word ``conversation`` in their objectives. Those
    are source material but not exercise items in the review manifest. Require
    a review entry when the slide has a direct activity instruction or
    confirmed listening/image evidence.
    """

    prompt = _prompt_text(slide, _meaningful_texts(slide))
    picture_activity = bool(
        re.search(
            r"\b(?:look\s+at|match|choose|select|identify|describe)\b[^\n]{0,120}\b(?:picture|pictures|image|images|photo|photos|illustration)\b",
            prompt,
            re.IGNORECASE,
        )
    )
    direct_instruction = bool(
        re.search(
            r"(?:^|\n)\s*(?:[A-Z]\.)?\s*(?:answer|complete|fill(?:\s+in)?|change|transform|identify|state\s+whether|true\s+or\s+false|choose|select|pick|match|write|create|act\s+out|improvise|role[- ]?play|talk\s+with|speak\s+with|record|read\s+[^\n]{0,40}\s+aloud)\b",
            prompt,
            re.IGNORECASE,
        )
    )
    return bool(
        _is_audio_required(slide)
        or picture_activity
        or direct_instruction
    )


def _exercise_review_index(
    exercise_review: Any,
    source: Mapping[str, Any],
    lesson_id: str,
    blockers: list[dict[str, Any]],
) -> dict[int, list[Mapping[str, Any]]]:
    """Validate and index reviewed exercises by their published slide number."""

    if exercise_review is None:
        return {}
    if not isinstance(exercise_review, Mapping):
        _add_blocker(blockers, _blocker("exercise-review-invalid", detail="Exercise review must contain an object."))
        return {}
    review_course_id = _text(exercise_review.get("courseId"))
    if not review_course_id:
        _add_blocker(blockers, _blocker("exercise-review-course-missing", detail="Exercise review has no course id."))
    elif review_course_id != COURSE_ID:
        _add_blocker(
            blockers,
            _blocker("exercise-review-course-mismatch", detail=f"Exercise review is for course {review_course_id!r}.")
        )
    lessons = exercise_review.get("lessons")
    if not isinstance(lessons, Mapping):
        _add_blocker(blockers, _blocker("exercise-review-lessons-missing", detail="Exercise review has no lesson map."))
        return {}
    review_lesson = lessons.get(lesson_id)
    if not isinstance(review_lesson, Mapping):
        _add_blocker(
            blockers,
            _blocker("exercise-review-lesson-missing", detail=f"No exercise review entry matched lesson {lesson_id!r}."),
        )
        return {}
    expected_source_url = _source_url(source)
    review_source_url = _text(review_lesson.get("sourceUrl") or review_lesson.get("sourceURL"))
    if not review_source_url or review_source_url != expected_source_url:
        _add_blocker(
            blockers,
            _blocker(
                "exercise-review-source-url-mismatch",
                detail=f"Exercise review source URL {review_source_url!r} does not match {expected_source_url!r}.",
            ),
        )
    review_slides = review_lesson.get("slides")
    if not isinstance(review_slides, Mapping):
        _add_blocker(blockers, _blocker("exercise-review-slides-missing", detail="Exercise review lesson has no slide map."))
        return {}
    source_slides = {_slide_number(slide): slide for slide in _slides(source)}
    indexed: dict[int, list[Mapping[str, Any]]] = {}
    for raw_key, raw_entry in review_slides.items():
        if not isinstance(raw_entry, Mapping):
            _add_blocker(blockers, _blocker("exercise-review-slide-invalid", detail=f"Review slide {raw_key!r} is not an object."))
            continue
        reviewed_source = raw_entry.get("source") if isinstance(raw_entry.get("source"), Mapping) else raw_entry
        number_value = reviewed_source.get("number", raw_entry.get("slideNumber", raw_key))
        try:
            number = int(number_value)
        except (TypeError, ValueError):
            _add_blocker(blockers, _blocker("exercise-review-slide-invalid", detail=f"Review slide {raw_key!r} has no numeric number."))
            continue
        try:
            if int(raw_key) != number:
                _add_blocker(
                    blockers,
                    _blocker("exercise-review-slide-key-mismatch", number, f"Review key {raw_key!r} does not match slide number {number}."),
                )
        except (TypeError, ValueError):
            _add_blocker(blockers, _blocker("exercise-review-slide-key-mismatch", number, f"Review key {raw_key!r} is not numeric."))
        actual_slide = source_slides.get(number)
        if actual_slide is None:
            _add_blocker(blockers, _blocker("exercise-review-slide-missing", number, "Reviewed slide is absent from the published source."))
            continue
        expected_title = _normalise(reviewed_source.get("title"))
        expected_texts = _unique_texts(_as_list(reviewed_source.get("visibleTexts")))
        if expected_title and expected_title not in expected_texts:
            expected_texts.insert(0, expected_title)
        actual_signature = _exercise_review_text_signature(actual_slide)
        if expected_title and expected_title != actual_signature["title"]:
            _add_blocker(blockers, _blocker("exercise-review-slide-text-mismatch", number, "Reviewed slide title does not match the published source."))
        if expected_texts and expected_texts != actual_signature["visibleTexts"]:
            _add_blocker(blockers, _blocker("exercise-review-slide-text-mismatch", number, "Reviewed slide visible text does not match the published source."))
        if not expected_title and not expected_texts:
            _add_blocker(blockers, _blocker("exercise-review-slide-evidence-missing", number, "Reviewed slide has no title, visible text, or digest evidence."))
        digest_value = _text(
            reviewed_source.get("slideTextDigest")
            or reviewed_source.get("sourceTextDigest")
            or reviewed_source.get("textDigest")
            or reviewed_source.get("digest")
            or raw_entry.get("slideTextDigest")
        )
        if digest_value and digest_value.casefold() not in _exercise_review_text_digest_variants(actual_slide):
            _add_blocker(blockers, _blocker("exercise-review-slide-digest-mismatch", number, "Reviewed slide text digest does not match the published source."))
        raw_items = raw_entry.get("items")
        if not isinstance(raw_items, list):
            _add_blocker(blockers, _blocker("exercise-review-items-missing", number, "Reviewed exercise slide has no item list."))
            indexed[number] = []
            continue
        valid_items: list[Mapping[str, Any]] = []
        for item in raw_items:
            if not isinstance(item, Mapping):
                _add_blocker(blockers, _blocker("exercise-review-item-invalid", number, "Reviewed exercise item is not an object."))
                continue
            item_id = _text(item.get("id")) or "unnamed"
            evidence = _exercise_review_item_evidence(item)
            if not evidence:
                _add_blocker(blockers, _blocker("exercise-review-evidence-missing", number, f"Exercise review item {item_id!r} has no source evidence."))
            elif not any(_exercise_review_evidence_matches(value, actual_slide) for value in evidence) and not _review_item_uses_source_open_parts(item, actual_slide):
                _add_blocker(
                    blockers,
                    _blocker("exercise-review-evidence-mismatch", number, f"Exercise review item {item_id!r} has no matching published evidence."),
                )
            valid_items.append(item)
        indexed[number] = valid_items
    for number, actual_slide in source_slides.items():
        if _exercise_review_required_for_slide(actual_slide) and number not in indexed:
            _add_blocker(
                blockers,
                _blocker("exercise-review-slide-missing", number, "Published exercise content has no reviewed exercise entry."),
            )
    return indexed


def _is_listening_review_item(item: Mapping[str, Any]) -> bool:
    value = " ".join(
        _text(item.get(key))
        for key in ("kind", "responseMode", "prompt")
    ).casefold()
    return bool(re.search(r"\b(?:listen|listening|audio|hear|teacher-listening)\b", value))


def _listening_review_documents(documents: Sequence[Any]) -> dict[str, Any] | None:
    """Combine repeatable listening-review files into one deterministic manifest."""

    exercises: list[dict[str, Any]] = []
    for document in documents:
        if isinstance(document, Mapping):
            values = document.get("exercises")
        elif isinstance(document, list):
            values = document
        else:
            raise PlanError("listening review must contain an exercises list")
        if not isinstance(values, list):
            raise PlanError("listening review must contain an exercises list")
        for item in values:
            exercises.append(copy.deepcopy(dict(item)) if isinstance(item, Mapping) else item)
    return {"schemaVersion": 1, "exercises": exercises} if documents else None


def _listening_review_audio_evidence(item: Mapping[str, Any]) -> list[str]:
    values = _as_list(item.get("evidence"))
    if not values:
        values = _as_list(item.get("sourceEvidence"))
    for answer in _as_list(item.get("answerItems")):
        if isinstance(answer, Mapping):
            values.extend(_as_list(answer.get("evidence") or answer.get("sourceEvidence")))
    return _unique_texts(values)


def _listening_review_answer_values(answer_items: Sequence[Mapping[str, Any]]) -> list[str]:
    marked = [
        answer
        for answer in answer_items
        if answer.get("isCorrect") is True or answer.get("correct") is True
    ]
    candidates = marked if marked else list(answer_items)
    values: list[str] = []
    for answer in candidates:
        value = answer.get("canonical") or answer.get("canonicalCorrect") or answer.get("canonicalAnswer")
        if value in (None, "", [], {}):
            value = answer.get("correctAnswer")
        if value in (None, "", [], {}):
            value = answer.get("optionId") or answer.get("correctOptionId") or answer.get("correctOption") or answer.get("option")
        if value in (None, "", [], {}):
            marked_value = answer.get("correct")
            value = answer.get("answer") or (marked_value if not isinstance(marked_value, bool) else None) or answer.get("correctText")
        for candidate in _as_list(value):
            text = _text(candidate)
            if text and text not in values:
                values.append(text)
    return values


def _listening_review_item_status(item: Mapping[str, Any]) -> str:
    return _text(item.get("reviewStatus") or item.get("status")).casefold()


def _is_listening_closed_slide(slide: Mapping[str, Any]) -> bool:
    if not (_is_audio_required(slide) or _native_audio_items(slide)):
        return False
    prompt = _prompt_text(slide, _meaningful_texts(slide))
    return _is_closed_answer_prompt(prompt)


def _listening_review_index(
    listening_review: Any,
    source: Mapping[str, Any],
    lesson_id: str,
    audio_manifest: Any,
    blockers: list[dict[str, Any]],
) -> dict[int, Mapping[str, Any]]:
    """Validate listening-review scope and index entries by published slide."""

    if listening_review is None:
        return {}
    exercises = listening_review.get("exercises") if isinstance(listening_review, Mapping) else None
    if not isinstance(exercises, list):
        _add_blocker(blockers, _blocker("listening-review-invalid", detail="Listening review must contain an exercises list."))
        return {}
    source_slides = {_slide_number(slide): slide for slide in _slides(source)}
    indexed: dict[int, Mapping[str, Any]] = {}
    for raw_entry in exercises:
        if not isinstance(raw_entry, Mapping):
            _add_blocker(blockers, _blocker("listening-review-entry-invalid", detail="Listening review exercise is not an object."))
            continue
        entry = copy.deepcopy(dict(raw_entry))
        entry_lesson = _text(entry.get("lessonId") or entry.get("sourceLessonId"))
        if entry_lesson != lesson_id:
            # A unified manifest is shared by all source decks. Entries for a
            # different lesson belong to that lesson's plan and must not bleed
            # into this one.
            continue
        raw_slide = entry.get("slideNumber", entry.get("slide"))
        try:
            slide_number = int(raw_slide)
        except (TypeError, ValueError):
            _add_blocker(blockers, _blocker("listening-review-slide-invalid", detail="Listening review has no numeric slideNumber."))
            continue
        entry["slideNumber"] = slide_number
        slide = source_slides.get(slide_number)
        if slide is None:
            _add_blocker(blockers, _blocker("listening-review-slide-missing", slide_number, "Listening review slide is absent from the published source."))
            continue
        if slide_number in indexed:
            _add_blocker(blockers, _blocker("listening-review-duplicate", slide_number, "Multiple listening review entries target the same lesson and slide."))
            continue
        entry_status = _text(entry.get("reviewStatus") or entry.get("status")).casefold()
        if entry_status in {"blocked", "manual", "manual-review", "blocked-manual", "needs-manual-review", "blocked-awaiting-transcript", "awaiting-review"}:
            _add_blocker(blockers, _blocker("listening-review-blocked", slide_number, _text(entry.get("blocker")) or "Listening review remains blocked for manual review."))
        elif entry_status and entry_status not in {"reviewed", "approved", "ready"}:
            _add_blocker(blockers, _blocker("listening-review-status-missing", slide_number, f"Listening review has unsupported status {entry_status!r}."))
        audio_index = entry.get("audioIndex")
        if isinstance(audio_index, bool) or not isinstance(audio_index, int) or audio_index <= 0:
            _add_blocker(blockers, _blocker("listening-review-audio-index-invalid", slide_number, "Listening review audioIndex must be a positive source audio ordinal."))
        if not _text(entry.get("sourceAudioSha256")):
            _add_blocker(blockers, _blocker("listening-review-audio-sha-missing", slide_number, "Listening review requires sourceAudioSha256."))
        raw_items = entry.get("items")
        if not isinstance(raw_items, list) or not raw_items:
            _add_blocker(blockers, _blocker("listening-review-items-missing", slide_number, "Listening review has no question items."))
            entry["items"] = []
        else:
            item_ids: set[str] = set()
            for item in raw_items:
                if not isinstance(item, Mapping):
                    _add_blocker(blockers, _blocker("listening-review-item-invalid", slide_number, "Listening review item is not an object."))
                    continue
                prompt = _text(item.get("prompt") or item.get("question"))
                item_id = _text(item.get("id"))
                if item_id and item_id in item_ids:
                    _add_blocker(blockers, _blocker("listening-review-item-duplicate", slide_number, f"Listening review item id {item_id!r} is duplicated."))
                if item_id:
                    item_ids.add(item_id)
                if not prompt:
                    _add_blocker(blockers, _blocker("listening-review-prompt-missing", slide_number, "Listening review item has no authored prompt."))
                options = item.get("explicitOptions")
                if not isinstance(options, list) or len(options) != 4:
                    _add_blocker(blockers, _blocker("listening-review-options-invalid", slide_number, "Each reviewed listening question requires exactly four explicit options."))
                else:
                    option_ids: list[str] = []
                    option_texts: list[str] = []
                    for option in options:
                        if isinstance(option, Mapping):
                            option_id = _text(option.get("id") or option.get("value"))
                            option_text = _text(option.get("text") or option.get("label") or option.get("value"))
                        else:
                            option_id = ""
                            option_text = _text(option)
                        if not option_id or not option_text:
                            if not option_text:
                                _add_blocker(blockers, _blocker("listening-review-option-invalid", slide_number, "Listening review options require non-empty text."))
                        option_ids.append(option_id or f"course-choice-{slide_number}-{len(option_ids) + 1:03d}")
                        option_texts.append(option_text)
                    if len(set(option_ids)) != len(option_ids) or len(set(option_texts)) != len(option_texts):
                        _add_blocker(blockers, _blocker("listening-review-options-duplicate", slide_number, "Listening review options must be unique."))
                answer_items = [value for value in _as_list(item.get("answerItems")) if isinstance(value, Mapping)]
                answer_values = _listening_review_answer_values(answer_items)
                if len(answer_values) != 1:
                    _add_blocker(blockers, _blocker("listening-review-answer-ambiguous", slide_number, "Each reviewed listening question must identify exactly one correct option."))
                evidence = _listening_review_audio_evidence(item)
                if not evidence:
                    _add_blocker(blockers, _blocker("listening-review-evidence-missing", slide_number, "Listening review requires transcript evidence for each question."))
                status = _listening_review_item_status(item) or entry_status
                if status in {"blocked", "manual", "manual-review", "blocked-manual", "needs-manual-review", "blocked-awaiting-transcript", "awaiting-review"}:
                    _add_blocker(blockers, _blocker("listening-review-blocked", slide_number, _text(item.get("blocker")) or "Listening review remains blocked for manual review."))
                elif status not in {"reviewed", "approved", "ready"}:
                    _add_blocker(blockers, _blocker("listening-review-status-missing", slide_number, f"Listening review item has unsupported status {status!r}."))
        indexed[slide_number] = entry

    for number, slide in source_slides.items():
        if _is_listening_closed_slide(slide) and number not in indexed:
            _add_blocker(blockers, _blocker("listening-review-slide-missing", number, "Published closed listening content has no reviewed listening entry."))
    return indexed


def _listening_review_audio(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    audio_manifest: Any,
    review_entry: Mapping[str, Any],
    blockers: list[dict[str, Any]],
) -> Mapping[str, Any] | None:
    number = _slide_number(slide)
    candidates = [
        candidate
        for candidate in _audio_candidates(source, slide, lesson_id, audio_manifest)
        if not _is_audio_placeholder(candidate)
        and (_audio_digest(candidate) or _audio_url(candidate) or _audio_transcript(candidate))
    ]
    audio_index = review_entry.get("audioIndex")
    digest = _text(review_entry.get("sourceAudioSha256"))
    if isinstance(audio_index, bool) or not isinstance(audio_index, int) or audio_index <= 0:
        _add_blocker(blockers, _blocker("listening-review-audio-index-invalid", number, "Listening review audioIndex must identify a 1-based source audio ordinal."))
        return None
    ordinal_candidates = [candidate for candidate in candidates if _audio_ordinal(candidate) == audio_index]
    if not ordinal_candidates:
        _add_blocker(
            blockers,
            _blocker(
                "listening-review-audio-index-invalid",
                number,
                "Listening review audioIndex does not match a source audio ordinal.",
            ),
        )
        return None
    matched = [candidate for candidate in ordinal_candidates if _audio_digest(candidate).casefold() == digest.casefold()]
    if not matched:
        _add_blocker(blockers, _blocker("listening-review-audio-sha-mismatch", number, "Listening review sourceAudioSha256 does not match the staged source audio."))
        return None
    if len(matched) > 1:
        _add_blocker(blockers, _blocker("listening-review-audio-scope-mismatch", number, "Listening review audioIndex and sourceAudioSha256 identify multiple source audio entries."))
        return None
    audio = matched[0]
    if not _text(audio.get("publicHref") or audio.get("publicUrl") or audio.get("publicURL") or audio.get("playbackUrl") or audio.get("playbackURL")):
        staged_matches = [
            candidate
            for candidate in matched
            if _text(candidate.get("publicHref") or candidate.get("publicUrl") or candidate.get("publicURL") or candidate.get("playbackUrl") or candidate.get("playbackURL"))
        ]
        if len(staged_matches) == 1:
            audio = staged_matches[0]
    if not _text(audio.get("publicHref") or audio.get("publicUrl") or audio.get("publicURL") or audio.get("playbackUrl") or audio.get("playbackURL")):
        _add_blocker(blockers, _blocker("listening-review-audio-public-missing", number, "Reviewed listening audio requires a staged publicHref or playback URL."))
        return None
    if not _audio_url(audio):
        _add_blocker(blockers, _blocker("listening-review-audio-media-missing", number, "Reviewed listening audio has no browser playback URL."))
        return None
    transcript = _audio_transcript(audio)
    if not transcript:
        _add_blocker(blockers, _blocker("listening-review-audio-transcript-missing", number, "Reviewed listening audio requires its staged transcript."))
        return None
    evidence_mismatch = False
    for item in _as_list(review_entry.get("items")):
        if not isinstance(item, Mapping):
            continue
        for evidence in _listening_review_audio_evidence(item):
            if evidence not in transcript:
                _add_blocker(blockers, _blocker("listening-review-evidence-mismatch", number, f"Listening review evidence is not an exact substring of the staged transcript: {evidence!r}."))
                evidence_mismatch = True
    if evidence_mismatch:
        return None
    return audio


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
        audio_source = {
            "url": _audio_url(audio),
            "digest": _audio_digest(audio),
            "transcript": _audio_transcript(audio),
        }
        # Keep the immutable source identity and staged playback provenance
        # together. ``url`` is the verified browser playback URL; the original
        # Drive URL is metadata only and never substitutes for playback.
        for key in (
            "originalMediaUrl",
            "originalMediaURL",
            "sourceUrl",
            "mediaUrl",
            "mediaURL",
            "playbackUrl",
            "playbackURL",
            "publicHref",
            "publicUrl",
            "publicURL",
        ):
            value = _text(audio.get(key))
            if value:
                audio_source[key] = value
        result["audio"] = audio_source
    slide_data = slide.get("data") if isinstance(slide.get("data"), Mapping) else {}
    for key in ("tableReview", "tableSemantics"):
        value = slide.get(key)
        if not isinstance(value, Mapping):
            value = slide_data.get(key)
        if isinstance(value, Mapping):
            result[key] = copy.deepcopy(dict(value))
    native = _native_audit_payload(slide)
    if native is not None:
        result["nativeEvidence"] = {
            "recordId": _text(native.get("recordId")),
            "slideNumber": native.get("slideNumber"),
            "paragraphs": copy.deepcopy(_as_list(native.get("paragraphs"))),
            "tables": copy.deepcopy(native.get("tables")),
            "figures": copy.deepcopy(_as_list(native.get("figures"))),
            "figureEvidencePresent": bool(native.get("figureEvidencePresent")),
            "audio": copy.deepcopy(_as_list(native.get("audio"))),
        }
        vector_projection = _native_vector_projection(slide)
        if vector_projection is not None:
            result["nativeEvidence"]["vectorSemanticProjection"] = copy.deepcopy(dict(vector_projection))
    return result


def _exercise_review_metadata(item: Mapping[str, Any]) -> dict[str, Any]:
    return {"exerciseReview": copy.deepcopy(dict(item))}


def _reviewed_grammar_prompt(item: Mapping[str, Any], prompt: str | None = None) -> str:
    """Turn a reviewed grammar answer label into a short learner instruction.

    The source sentence remains in ``sourcePrompt`` and in the immutable review
    metadata.  The native control needs an actionable prompt, though, rather
    than a label such as ``interrogative`` that does not tell the learner what
    to do.
    """

    original = _text(prompt if prompt is not None else item.get("prompt"))
    label = _text(item.get("_answerLabel") or item.get("answerLabel")).casefold()
    if label in {"interrogative", "question", "questions", "interrogation"}:
        return f"Convierte en pregunta: {original}" if original else "Convierte en pregunta."
    if label in {"negative", "negation", "negative form", "negativa"}:
        return f"Convierte en negativa: {original}" if original else "Convierte en negativa."
    return original


def _reviewed_listening_reflection_prompt(item: Mapping[str, Any]) -> str:
    """Adapt a teacher/chat listening prompt for independent study.

    This only handles the known authored reflection pattern.  Other listening
    prompts stay blocked until their transcript and answer evidence are ready.
    """

    prompt = _text(item.get("prompt"))
    lowered = prompt.casefold()
    if not prompt or "listen" not in lowered:
        return ""
    markers = (
        "discuss with your teacher",
        "what is the topic",
        "what are the topic",
        "phrases you know",
        "chat box",
    )
    return "¿De qué trata el audio? Escribe las frases que reconoces." if any(marker in lowered for marker in markers) else ""


def _exercise_review_context(review_items: Sequence[Mapping[str, Any]]) -> str:
    """Give reviewed controls one concise context line without prompt dumps."""

    kinds = {_text(item.get("kind")).casefold() for item in review_items}
    non_grammar_support = {
        kind
        for kind in kinds
        if "grammar-transform" not in kind
        and "grammar-choice" not in kind
        and "grammar-production" not in kind
    }
    if any("grammar-transform" in kind for kind in kinds) and not non_grammar_support:
        return "Convierte cada frase en pregunta y negativa."
    if any("reading" in kind or "comprehension" in kind for kind in kinds):
        return "Responde las preguntas de comprensión."
    if len(review_items) == 1:
        return _text(review_items[0].get("prompt"))
    return "Completa cada respuesta de la actividad."


def _grammar_worksheet_projection(
    tables: Sequence[Sequence[Sequence[str]]],
    review_items: Sequence[Mapping[str, Any]] | None,
) -> tuple[list[str], list[list[str]], dict[str, Any]] | None:
    """Project a reviewed transform worksheet to its authored worked example.

    Unit 2's worksheet contains four answerable prompts plus blank authoring
    rows.  Those prompts are represented by reviewed short-answer items.  The
    learner-facing table therefore keeps the worked example only; ``tables``
    on the emitted payload still carries every original row for provenance.
    """

    if not review_items or not any("grammar-transform" in _text(item.get("kind")).casefold() for item in review_items):
        return None
    for table in tables:
        if len(table) < 2:
            continue
        headers = list(table[0])
        normalized_headers = [_normalise(value).casefold() for value in headers]
        has_statements = any("statement" in value for value in normalized_headers)
        has_questions = any("question" in value for value in normalized_headers)
        has_negative = any("negative" in value for value in normalized_headers)
        if not (has_statements and has_questions and has_negative):
            continue
        for source_index, row in enumerate(table[1:], start=1):
            nonempty = [value for value in row if _normalise(value)]
            # A worked example has the statement, question, and negative form;
            # numbered blank rows and empty practice cells do not qualify.
            if len(nonempty) >= 4 or (len(row) >= 3 and len(nonempty) >= 3):
                return headers, [list(row)], {
                    "mode": "worked-example-only",
                    "sourceRowCount": len(table) - 1,
                    "sourceWorkedExampleRow": source_index,
                    "learnerRowCount": 1,
                }
    return None


def _table_group_key(source_header: str, index: int) -> str:
    normalized = _normalise(source_header).casefold().replace("–", "-").replace("—", "-")
    if normalized.startswith("to be"):
        return "to-be"
    if normalized.startswith("other verbs"):
        return "other-verbs"
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or f"table-group-{index + 1}"


def _table_groups(tables: Sequence[Sequence[Sequence[str]]]) -> list[dict[str, Any]]:
    """Expose explicitly paired source columns for the guided table renderer."""

    groups: list[dict[str, Any]] = []
    for table in tables:
        if len(table) < 2:
            continue
        source_headers = list(table[0])
        paired_columns = [
            column
            for column in range(0, len(source_headers) - 1, 2)
            if _normalise(source_headers[column]) and not _normalise(source_headers[column + 1])
        ]
        if len(paired_columns) < 2:
            continue
        for group_index, column in enumerate(paired_columns):
            source_header = _normalise(source_headers[column])
            rows: list[list[str]] = []
            notes: list[str] = []
            for row in table[1:]:
                left = row[column] if column < len(row) else ""
                right = row[column + 1] if column + 1 < len(row) else ""
                # A long single-cell explanation is authored prose, not a
                # second table entry. Keep it as a full-width note so the
                # paired columns remain readable while ``tables`` retains the
                # complete source matrix for provenance.
                if (
                    _normalise(left)
                    and not _normalise(right)
                    and len(_normalise(left).split()) > 15
                ) or (
                    _normalise(right)
                    and not _normalise(left)
                    and len(_normalise(right).split()) > 15
                ):
                    notes.append(_normalise(left or right))
                    continue
                rows.append([left, right])
            groups.append(
                {
                    "key": _table_group_key(source_header, group_index),
                    "sourceHeader": source_header,
                    "headers": [source_headers[column], source_headers[column + 1]],
                    "rows": rows,
                    **({"notes": notes} if notes else {}),
                }
            )
    return groups


def _has_table_instruction(slide: Mapping[str, Any], full_text: str) -> bool:
    """Detect an authored chart/table instruction without matching incidental nouns."""

    title = _text(slide.get("title"))
    combined = f"{title} {full_text}".casefold()
    if re.fullmatch(r"\s*(?:table|chart|grid|columns?)\s*", title, flags=re.IGNORECASE):
        return True
    reference = r"(?:table|chart|grid|columns?)"
    instruction = (
        r"(?:check|consider|complete|consult|fill|look\s+at|read|refer\s+to|review|see|study|use|following|below|above)"
    )
    return bool(
        re.search(rf"\b{instruction}\b[^.!?\n]{{0,80}}\b{reference}\b", combined)
        or re.search(rf"\b{reference}\b[^.!?\n]{{0,80}}\b{instruction}\b", combined)
    )


def _reviewed_text_only_table(
    slide: Mapping[str, Any],
    lesson_id: str,
) -> dict[str, Any] | None:
    """Return a source-audited text-only table decision when it is exact.

    Composer review is an explicit clearance for a chart reference whose
    authored cells were not recoverable. It must match the published slide and
    carry its own reviewed evidence before it can resolve the table blocker.
    """

    raw_review = slide.get("tableReview")
    if not isinstance(raw_review, Mapping):
        slide_data = slide.get("data")
        raw_review = slide_data.get("tableReview") if isinstance(slide_data, Mapping) else None
    semantics = slide.get("tableSemantics")
    if not isinstance(raw_review, Mapping) or not isinstance(semantics, Mapping):
        return None

    try:
        review_slide = int(raw_review.get("sourceSlide"))
    except (TypeError, ValueError):
        return None
    if review_slide != _slide_number(slide):
        return None
    if raw_review.get("schemaVersion") != 1:
        return None
    review_lesson = _text(raw_review.get("lessonId"))
    if review_lesson and review_lesson != lesson_id:
        return None
    review_status = _text(raw_review.get("reviewStatus")).casefold().replace("_", "-")
    if review_status not in {"reviewed-text-only", "text-only-reviewed"}:
        return None
    # Older audit payloads omitted this redundant boolean; the explicit
    # text-only status, resolved semantics, and source evidence are the
    # authoritative review fields. If present, a false value still rejects
    # the override rather than silently clearing a blocker.
    if "clearTableSemanticsBlocker" in raw_review and raw_review.get("clearTableSemanticsBlocker") is not True:
        return None
    if raw_review.get("tableReferenceResolved") is False:
        return None
    if _text(semantics.get("mode")).casefold() != "text-only":
        return None
    if semantics.get("tables") not in (None, []):
        return None
    if semantics.get("tableReferenceResolved") is not True:
        return None

    projection = raw_review.get("projection")
    if not isinstance(projection, Mapping):
        return None
    if _text(projection.get("mode")).casefold() != "text-only":
        return None
    if projection.get("approved") is True or projection.get("tables") not in (None, []):
        return None
    if "tableCount" in projection and projection.get("tableCount") != 0:
        return None
    projection_source = _text(projection.get("source")).casefold()
    if projection_source and projection_source not in {"published-visible-text", "text-only-source"}:
        return None

    table_block = raw_review.get("tableBlock")
    if table_block is not None:
        if not isinstance(table_block, Mapping):
            return None
        if _text(table_block.get("mode")).casefold() != "text-only":
            return None
        if table_block.get("tableCount") not in (None, 0):
            return None
        if table_block.get("tableReferenceResolved") is False:
            return None

    evidence = raw_review.get("sourceEvidence")
    if not isinstance(evidence, Mapping):
        return None
    published_texts = _unique_texts(evidence.get("publishedVisibleTexts"))
    if not published_texts:
        return None
    actual_texts = {_normalise(value).casefold() for value in _slide_texts(slide)}
    if any(value.casefold() not in actual_texts for value in published_texts):
        return None

    references = [value for value in _as_list(raw_review.get("sourceRefs")) if isinstance(value, Mapping)]
    ref_hash = ""
    for key, value in raw_review.items():
        if _text(key).casefold() in {"refhash", "sourcerefhash", "sourcesha256", "sourcedigest"}:
            ref_hash = _text(value)
            break
    valid_hash = bool(ref_hash and re.fullmatch(r"[0-9a-f]{64}", ref_hash.casefold()))
    valid_reference = any(
        bool(re.fullmatch(r"[0-9a-f]{64}", _text(reference.get("sha256")).casefold()))
        for reference in references
    )
    if not valid_hash and not valid_reference:
        return None

    return {
        "tableReview": copy.deepcopy(dict(raw_review)),
        "tableSemantics": copy.deepcopy(dict(semantics)),
    }


def _exercise_review_ai_context(
    slide: Mapping[str, Any],
    item: Mapping[str, Any],
    prompt: str,
    audio_item: Mapping[str, Any] | None = None,
    source: Mapping[str, Any] | None = None,
) -> str:
    """Build a grounded rubric context for open self-study responses."""

    original_prompt = _text(item.get("prompt"))
    context = _ai_grading_context(slide, prompt, audio_item, source)
    if original_prompt:
        context += f"\n\nAuthored source prompt:\n{original_prompt}"
    rubric_values: list[str] = []
    for key in ("constraints", "rubric", "criteria", "sourceContext", "readingPassage", "audioTranscript"):
        value = item.get(key)
        if isinstance(value, Mapping):
            value = json.dumps(value, ensure_ascii=False, sort_keys=True)
        elif isinstance(value, (list, tuple)):
            value = "\n".join(_text(entry) for entry in value if _text(entry))
        else:
            value = _text(value)
        if value:
            rubric_values.append(f"{key}:\n{value}")
    if rubric_values:
        context += "\n\nAuthored review criteria/context:\n" + "\n\n".join(rubric_values)
    return context


def _exercise_review_answer_key(item: Mapping[str, Any]) -> Any:
    hints = item.get("builderHints") if isinstance(item.get("builderHints"), Mapping) else {}
    if isinstance(hints, Mapping) and hints.get("_explicit_answer_key") not in (None, "", [], {}):
        return copy.deepcopy(hints.get("_explicit_answer_key"))
    answer_items = [value for value in _as_list(item.get("answerItems")) if isinstance(value, Mapping)]
    if answer_items:
        answer = answer_items[0]
        accepted = answer.get("accepted")
        accepted_value = accepted[0] if isinstance(accepted, (list, tuple)) and accepted else accepted
        return copy.deepcopy(answer.get("canonical") or answer.get("correctAnswer") or accepted_value)
    return None


def _exercise_review_options(item: Mapping[str, Any]) -> Any:
    hints = item.get("builderHints") if isinstance(item.get("builderHints"), Mapping) else {}
    if isinstance(hints, Mapping) and hints.get("_explicit_options") not in (None, "", [], {}):
        return copy.deepcopy(hints.get("_explicit_options"))
    return copy.deepcopy(item.get("options") or item.get("sourceOptions"))


def _authored_letter_prompts(slide: Mapping[str, Any]) -> dict[str, str]:
    """Extract authored A--E prompts without rewriting their requirements.

    Published extraction frequently stores the final D/E activities as either
    separate visible text values or one title containing both labels.  Review
    manifests intentionally use a short placeholder for those open activities,
    so the published prompt must remain the source of truth here.
    """

    parts: dict[str, list[str]] = {}
    for value in _meaningful_texts(slide):
        for match in re.finditer(r"(?<![A-Za-z0-9])([A-E])\.\s+", value):
            label = match.group(1).upper()
            next_match = re.search(r"(?<![A-Za-z0-9])[A-E]\.\s+", value[match.end() :])
            end = match.end() + next_match.start() if next_match else len(value)
            prompt = _normalise(value[match.start() : end]).strip()
            if len(prompt) > 4:
                parts.setdefault(label, []).append(prompt)
    return {
        label: _unique_texts(values)[0]
        for label, values in parts.items()
        if _unique_texts(values)
    }


def _source_open_parts(slide: Mapping[str, Any]) -> list[tuple[str, str]]:
    """Return source-authored final speaking/writing prompts as separate parts.

    Most decks label the final oral/writing pair D/E, while Unit 3 labels the
    pair C/D. Classify the authored wording instead of assuming the letter so
    that a C conversation never inherits the following D writing prompt.
    """

    prompts = _authored_letter_prompts(slide)
    result: list[tuple[str, str]] = []
    # Lettered examples can occur in ordinary authored material. Require the
    # final-activity heading when only one of D/E is present so those examples
    # cannot silently become learner controls. A slide with both explicit D/E
    # parts remains unambiguous even when the deck omits the heading.
    # Use raw published values for the section-heading check; ``Let's Talk``
    # and ``Let's Write`` are intentionally excluded from learner prose.
    slide_values = _slide_texts(slide)
    final_headings = {
        "let's talk",
        "let’s talk",
        "let' talk",
        "let's write",
        "let’s write",
        "let' write",
    }
    has_final_heading = any(
        _normalise(value).casefold().strip() in final_headings
        for value in slide_values
    )
    has_talk_heading = any(
        _normalise(value).casefold().strip() in {"let's talk", "let’s talk", "let' talk"}
        for value in slide_values
    )
    has_write_heading = any(
        _normalise(value).casefold().strip() in {"let's write", "let’s write", "let' write"}
        for value in slide_values
    )
    has_open_signal = bool(
        any(
            prompt
            and (
                _is_speaking_prompt(prompt)
                or _is_essay_prompt(prompt)
            )
            for prompt in prompts.values()
        )
    )
    if not has_final_heading and len(prompts) < 2 and not has_open_signal:
        return []

    def is_oral(prompt: str) -> bool:
        # ``present``/``tell`` are common oral directions even when they do
        # not contain the narrower recording verbs used by the detector.
        return _is_speaking_prompt(prompt) or bool(
            re.search(
                r"\b(?:present|tell\s+(?:your|the)\s+teacher|talk\s+about|introduce\s+yourself|answer\s+your\s+teacher)\b",
                prompt.casefold(),
            )
        )

    for label in ("C", "D", "E"):
        prompt = prompts.get(label)
        if not prompt or len(prompt) <= 20:
            continue
        oral = is_oral(prompt)
        written = _is_essay_prompt(prompt) or _word_limits(prompt) != (None, None)
        # C is a final oral activity only when the slide's own heading says
        # that it is the conversation section. This prevents ordinary
        # lettered reading instructions from becoming recordings.
        if label == "C":
            if not has_talk_heading:
                continue
            oral = True
            written = False
        # In the common D/E layout the headings identify D as the oral part
        # even when the prompt is phrased as an open question rather than an
        # explicit “act out” instruction. Unit 3's C/D layout uses the write
        # heading to keep D as the writing control.
        elif label == "D" and has_talk_heading and not prompts.get("C"):
            oral = True
            written = False
        elif label == "D" and has_write_heading and prompts.get("C"):
            oral = False
            written = True
        if oral and not written:
            result.append(("recording", prompt))
        elif written and not oral:
            result.append(("essay", prompt))
        elif oral and written:
            # A combined “present ... and write ...” instruction keeps its
            # oral control here; a separate E writing prompt remains distinct.
            result.append(("recording", prompt))
    return result


def _review_item_uses_source_open_parts(item: Mapping[str, Any], slide: Mapping[str, Any]) -> bool:
    """Allow a reviewed placeholder to inherit exact published D/E text."""

    if not _source_open_parts(slide):
        return False
    kind = _text(item.get("kind")).casefold()
    prompt = _text(item.get("prompt")).casefold()
    return any(token in kind for token in ("roleplay", "role-play", "conversation", "writing")) or (
        "complete the final activity" in prompt
    )


def _exercise_review_open_parts(
    item: Mapping[str, Any],
    slide: Mapping[str, Any] | None = None,
) -> list[tuple[str, str]]:
    if slide is not None:
        source_parts = _source_open_parts(slide)
        kind = _text(item.get("kind")).casefold()
        # The reviewed final-activity item may be a compact placeholder, or a
        # reading/classification review may share the final D/E slide. The
        # published D/E prompts still need their own learner controls.
        if source_parts and (
            any(token in kind for token in ("roleplay", "role-play", "conversation", "writing"))
            or "complete the final activity" in _text(item.get("prompt")).casefold()
            or "listen" in kind
        ):
            return source_parts
    prompt = _text(item.get("prompt"))
    if not prompt:
        return []
    kind = _text(item.get("kind")).casefold()
    speaking = (
        any(token in kind for token in ("roleplay", "role-play", "conversation"))
        or _is_speaking_prompt(prompt)
        or "record" in _text(item.get("responseMode")).casefold()
    )
    writing_match = re.search(r"\b(?:and\s+)?write\b", prompt, re.IGNORECASE)
    if speaking and writing_match and writing_match.start() > 0:
        before = prompt[: writing_match.start()].strip(" ;,.")
        after = prompt[writing_match.start() :].strip()
        if before and after:
            return [("recording", before), ("essay", after)]
    if speaking:
        return [("recording", prompt)]
    return [("essay", prompt)]


def _exercise_review_ambiguous_open_response(
    item: Mapping[str, Any],
    source_prompt: str,
) -> tuple[str, str, str]:
    """Read a reviewed ambiguous item as formative open response metadata."""

    config = item.get("openResponse") if isinstance(item.get("openResponse"), Mapping) else {}
    learner_prompt = _text(config.get("prompt")) or "Prop\u00f3n una correcci\u00f3n clara."
    original_prompt = _text(config.get("sourcePrompt")) or source_prompt or _text(item.get("prompt"))
    feedback_context = _text(
        config.get("feedbackContext")
        or config.get("aiGradingContext")
        or item.get("sourceContext")
    )
    return learner_prompt, original_prompt, feedback_context


def _exercise_review_teacher_notes(item: Mapping[str, Any]) -> tuple[str, dict[str, Any]] | None:
    """Read an explicit reviewed teacher-led instruction as teacher notes.

    A teacher-listening item stays blocked unless the source auditor supplies
    this reviewed marker. The marker carries the authored instruction only; it
    never turns an unavailable clip into playable audio.
    """

    raw_notes = item.get("teacherNotes")
    if raw_notes is None:
        raw_notes = item.get("teacher_notes")
    config = raw_notes if isinstance(raw_notes, Mapping) else {}
    item_status = _text(item.get("reviewStatus")).casefold().replace("_", "-")
    note_status = _text(config.get("reviewStatus") or config.get("status")).casefold().replace("_", "-")
    reviewed = (
        item.get("teacherNotesReviewed") is True
        or config.get("reviewed") is True
        or item_status in {"reviewed-teacher-notes", "teacher-notes-preserved"}
        or note_status in {"reviewed", "reviewed-teacher-notes", "teacher-notes-preserved"}
    )
    if not reviewed:
        return None
    content = _text(
        config.get("sourceInstruction")
        or config.get("content")
        or config.get("prompt")
        or item.get("sourceInstruction")
    )
    if not content:
        return None
    return content, copy.deepcopy(dict(config))


def _exercise_review_conversation_metadata(item: Mapping[str, Any]) -> dict[str, Any]:
    """Preserve a reviewed role-play as a reusable conversation scenario."""

    prompt = _text(item.get("prompt"))
    raw_turns = item.get("turns") or item.get("questions")
    turns: list[dict[str, str]] = []
    for index, raw_turn in enumerate(_as_list(raw_turns), start=1):
        if not isinstance(raw_turn, Mapping):
            continue
        question = _text(raw_turn.get("question") or raw_turn.get("prompt"))
        if not question:
            continue
        turns.append(
            {
                "id": _text(raw_turn.get("id")) or f"turn-{index}",
                "question": question,
                "answerPrompt": _text(raw_turn.get("answerPrompt")) or "Responde a la situación.",
            }
        )
    if not turns and prompt:
        turns = [{"id": "scenario", "question": prompt, "answerPrompt": "Responde a la situación."}]
    return {
        "guidedRole": "conversation",
        "turns": turns,
        "originalPromptAIContext": prompt,
    }


def _exercise_review_specs(
    slide: Mapping[str, Any],
    review_items: Sequence[Mapping[str, Any]],
    blockers: list[dict[str, Any]],
    audio_item: Mapping[str, Any] | None = None,
    source: Mapping[str, Any] | None = None,
) -> tuple[list[tuple[str, dict[str, Any]]], bool]:
    """Map reviewed exercise items without collapsing distinct prompts or answers."""

    number = _slide_number(slide)
    short_items: list[dict[str, Any]] = []
    multiple_specs: list[tuple[str, dict[str, Any]]] = []
    open_specs: list[tuple[str, dict[str, Any]]] = []
    listening_blocked = False
    active_multiple_scope: tuple[Any, ...] | None = None
    active_multiple_items: list[dict[str, Any]] = []
    active_multiple_review_items: list[dict[str, Any]] = []

    def flush_multiple_group() -> None:
        """Emit one learner step for the current consecutive MC activity."""

        nonlocal active_multiple_scope, active_multiple_items, active_multiple_review_items
        if not active_multiple_items:
            active_multiple_scope = None
            active_multiple_review_items = []
            return
        scope_data: dict[str, Any] = {
            "sourceSlide": number,
            "responseScope": active_multiple_scope[1],
            "kind": active_multiple_scope[2],
        }
        if active_multiple_scope[3] and not active_multiple_scope[3].startswith("__missing-audio-scope__:"):
            scope_data["sourceAudioSha256"] = active_multiple_scope[3]
        if active_multiple_scope[4]:
            scope_data["activityId"] = active_multiple_scope[4]
        grouped_payload: dict[str, Any]
        if len(active_multiple_items) == 1:
            # Keep the existing single-question shape for isolated choices;
            # only a real consecutive group needs the guided multi-step form.
            single_item = active_multiple_items[0]
            grouped_payload = {
                "question": single_item["question"],
                "options": single_item["options"],
                "correctOptionId": single_item["correctOptionId"],
            }
        else:
            grouped_payload = {"items": copy.deepcopy(active_multiple_items)}
        grouped_payload["data"] = {
            "exerciseReviewItems": copy.deepcopy(active_multiple_review_items),
            "multipleChoiceScope": scope_data,
        }
        if len(active_multiple_review_items) == 1:
            grouped_payload["data"]["exerciseReview"] = copy.deepcopy(active_multiple_review_items[0])
        multiple_specs.append(("multiple_choice", grouped_payload))
        active_multiple_scope = None
        active_multiple_items = []
        active_multiple_review_items = []

    def multiple_scope(item: Mapping[str, Any], listening_item: bool) -> tuple[Any, ...]:
        source_audio = _text(
            item.get("sourceAudioSha256")
            or item.get("audioSha256")
            or item.get("sourceAudioDigest")
        )
        if listening_item and not source_audio:
            source_audio = _audio_digest(audio_item) if audio_item else ""
            if not source_audio:
                # Without a verified clip digest, do not merge two listening
                # choices merely because they share a slide number.
                source_audio = f"__missing-audio-scope__:{_text(item.get('id'))}"
        raw_slide = item.get("slideNumber") or item.get("sourceSlide") or number
        try:
            source_slide = int(raw_slide)
        except (TypeError, ValueError):
            source_slide = number
        activity_id = _text(
            item.get("activityId")
            or item.get("sourceActivityId")
            or item.get("groupId")
            or item.get("activityKey")
        )
        return (
            source_slide,
            "listening" if listening_item else "reading",
            _text(item.get("kind")).casefold(),
            source_audio,
            activity_id,
        )

    for item in review_items:
        status = _text(item.get("reviewStatus")).casefold()
        item_id = _text(item.get("id")) or f"slide-{number}-item"
        kind = _text(item.get("kind")).casefold()
        response_mode = _text(item.get("responseMode")).casefold()
        listening_item = "listen" in kind or "audio" in response_mode or response_mode == "teacher-listening"
        review_options = _exercise_review_options(item)
        # Consecutive reviewed choices are one learner activity. Any open,
        # blocked, malformed, or teacher-only item closes the group so that a
        # later choice cannot cross an authored activity boundary.
        if status != "reviewed" or not review_options:
            flush_multiple_group()
        has_transcript = bool(audio_item and _audio_transcript(audio_item))
        reflection_prompt = _reviewed_listening_reflection_prompt(item)
        is_open_listening_reflection = bool(reflection_prompt)
        source_open_parts = _source_open_parts(slide)
        reviewed_teacher_notes = _exercise_review_teacher_notes(item) if listening_item else None
        if reviewed_teacher_notes is not None:
            teacher_content, teacher_notes_metadata = reviewed_teacher_notes
            teacher_payload: dict[str, Any] = {
                "content": _readable_html([teacher_content]),
                "format": "html",
                "hiddenFromLearners": True,
                "sourceRole": "teacher-guided-listening",
                "sourcePrompt": _text(item.get("prompt")),
                "reviewStatus": status,
                "sourceReviewId": item_id,
                "doNotAutoGrade": True,
                "data": _exercise_review_metadata(item),
            }
            teacher_payload["data"]["responseMode"] = "teacher-notes-preserved"
            teacher_payload["data"]["teacherNotes"] = teacher_notes_metadata
            open_specs.append(("teacher_notes", teacher_payload))
            continue
        # A teacher-led D prompt can be paired with a published E writing
        # prompt on the same slide. The source has no playable clip or closed
        # answer key, but the learner's speaking and writing practice remain
        # valid self-study activities. Archive the teacher direction separately
        # and continue through the open-response path below.
        source_teacher_prompt = next(
            (prompt for native_type, prompt in source_open_parts if native_type == "recording"),
            "",
        )
        if (
            listening_item
            and source_teacher_prompt
            and status in {"blocked-awaiting-transcript", "blocked", "listening-blocked"}
        ):
            teacher_payload = {
                "content": _readable_html([source_teacher_prompt]),
                "format": "html",
                "hiddenFromLearners": True,
                "sourceRole": "teacher-guided-listening",
                "sourcePrompt": _text(item.get("prompt")) or source_teacher_prompt,
                "reviewStatus": status,
                "sourceReviewId": item_id,
                "doNotAutoGrade": True,
                "data": _exercise_review_metadata(item),
            }
            teacher_payload["data"]["responseMode"] = "teacher-notes-preserved"
            teacher_payload["data"]["sourceInstruction"] = source_teacher_prompt
            teacher_payload["data"]["adaptedForSelfStudy"] = True
            open_specs.append(("teacher_notes", teacher_payload))
            status = "open-response-preserved"
        if status in {"blocked-awaiting-transcript", "blocked", "listening-blocked"} and not (listening_item and has_transcript):
            if listening_item:
                if is_open_listening_reflection:
                    # The authored prompt is an open reflection, so it can be
                    # offered for self-study even while the closed listening
                    # answer review remains blocked. Audio evidence blockers
                    # still prevent publication when the clip is incomplete.
                    status = "open-response-preserved"
                else:
                    listening_blocked = True
                    code = "exercise-review-listening-blocked"
            else:
                code = "exercise-review-item-blocked"
            if status != "open-response-preserved":
                _add_blocker(blockers, _blocker(code, number, _text(item.get("blocker")) or f"Exercise review item {item_id!r} is blocked."))
                continue
        if status in {"blocked-awaiting-transcript", "blocked", "listening-blocked"} and listening_item and has_transcript:
            # A staged original transcript resolves the review gate for an
            # open listening reflection; it still does not invent a closed
            # answer key.
            status = "open-response-preserved"
        if status in {"source-ambiguous", "ambiguous"}:
            _add_blocker(blockers, _blocker("exercise-review-ambiguous", number, _text(item.get("blocker")) or f"Exercise review item {item_id!r} is ambiguous."))
            continue
        if status not in {"reviewed", "reviewed-with-open-completions", "reviewed-with-source-label-mismatch", "open-response-preserved"}:
            _add_blocker(blockers, _blocker("exercise-review-status-missing", number, f"Exercise review item {item_id!r} has unsupported status {status!r}."))
            continue
        if status == "reviewed-with-source-label-mismatch":
            _add_blocker(blockers, _blocker("exercise-review-source-label-mismatch", number, _text(item.get("blocker")) or f"Exercise review item {item_id!r} has a source label mismatch."))

        options = _exercise_review_options(item)
        answer_key = _exercise_review_answer_key(item)
        if options and status == "reviewed":
            choice_options, correct_option_id = _multiple_choice_options(options, answer_key, number)
            if not correct_option_id or correct_option_id not in {option["id"] for option in choice_options}:
                flush_multiple_group()
                _add_blocker(blockers, _blocker("exercise-review-answer-unmatched", number, f"Reviewed answer for item {item_id!r} does not match its source options."))
                # Do not silently downgrade a malformed reviewed choice into a
                # short-answer key; the source option/key relationship needs
                # human review first.
                continue
            else:
                scope = multiple_scope(item, listening_item)
                if active_multiple_scope != scope:
                    flush_multiple_group()
                    active_multiple_scope = scope
                choice: dict[str, Any] = {
                    "id": f"course-review-{number}-{item_id}-{len(active_multiple_items) + 1:03d}",
                    "question": _text(item.get("prompt")),
                    "options": choice_options,
                    "correctOptionId": correct_option_id,
                    "sourceReviewId": item_id,
                    "sourcePrompt": _text(item.get("prompt")),
                }
                evidence = item.get("evidence") or item.get("sourceEvidence")
                if evidence not in (None, "", [], {}):
                    choice["sourceEvidence"] = copy.deepcopy(evidence)
                source_audio = _text(
                    item.get("sourceAudioSha256")
                    or item.get("audioSha256")
                    or item.get("sourceAudioDigest")
                )
                if source_audio:
                    choice["sourceAudioSha256"] = source_audio
                active_multiple_items.append(choice)
                active_multiple_review_items.append(copy.deepcopy(dict(item)))
                continue

        answer_items = [value for value in _as_list(item.get("answerItems")) if isinstance(value, Mapping)]
        canonical_items: list[dict[str, Any]] = []
        ambiguous_answer = False
        ambiguous_source_prompt = ""
        for answer_index, answer_item in enumerate(answer_items, start=1):
            answer_status = _text(answer_item.get("status")).casefold()
            if answer_status == "blocked":
                _add_blocker(
                    blockers,
                    _blocker(
                        "exercise-review-answer-blocked",
                        number,
                        _text(answer_item.get("rationale")) or f"Reviewed answer for item {item_id!r} is blocked.",
                    ),
                )
                continue
            if answer_status in {"source-ambiguous", "ambiguous"}:
                ambiguous_answer = True
                ambiguous_source_prompt = ambiguous_source_prompt or _text(
                    answer_item.get("sourcePrompt") or answer_item.get("evidence")
                )
                if status not in {"reviewed-with-open-completions", "open-response-preserved"}:
                    _add_blocker(
                        blockers,
                        _blocker(
                            "exercise-review-answer-ambiguous" if answer_status != "blocked" else "exercise-review-answer-blocked",
                            number,
                            _text(answer_item.get("rationale")) or f"Reviewed answer for item {item_id!r} is not deterministic.",
                        ),
                    )
                continue
            canonical = _text(answer_item.get("canonical") or answer_item.get("correctAnswer"))
            if not canonical:
                continue
            accepted = _unique_texts(answer_item.get("accepted")) or [canonical]
            label = _text(answer_item.get("id"))
            question = _text(item.get("prompt"))
            if kind == "grammar-correction":
                question = _text(answer_item.get("evidence")) or question
            if kind == "grammar-transform" and label:
                prompt_item = dict(item)
                prompt_item["_answerLabel"] = label.replace("-", " ").replace("_", " ")
                question = _reviewed_grammar_prompt(prompt_item, question)
            canonical_items.append(
                {
                    "id": f"course-short-answer-{number}-{item_id}-{answer_index:03d}",
                    "question": question,
                    "correctAnswer": canonical,
                    "acceptedAnswers": accepted,
                    "sourceReviewId": item_id,
                    "sourcePrompt": _text(item.get("prompt")),
                }
            )
        short_items.extend(canonical_items)
        if ambiguous_answer and status in {"reviewed-with-open-completions", "open-response-preserved"}:
            config = item.get("openResponse")
            feedback_context = (
                _text(config.get("feedbackContext") or config.get("aiGradingContext"))
                if isinstance(config, Mapping)
                else ""
            )
            if (
                not isinstance(config, Mapping)
                or not _text(config.get("prompt"))
                or not _text(config.get("sourcePrompt"))
                or not feedback_context
            ):
                _add_blocker(
                    blockers,
                    _blocker(
                        "exercise-review-open-response-metadata-missing",
                        number,
                        f"Ambiguous reviewed item {item_id!r} needs an explicit openResponse prompt, source prompt, and formative feedback context.",
                    ),
                )
            else:
                learner_prompt, original_prompt, feedback_context = _exercise_review_ambiguous_open_response(
                    item,
                    ambiguous_source_prompt,
                )
                context_item = dict(item)
                context_item["prompt"] = original_prompt
                context_item["sourceContext"] = feedback_context
                ai_context = _exercise_review_ai_context(slide, context_item, learner_prompt, audio_item, source)
                payload: dict[str, Any] = {
                    "prompt": learner_prompt,
                    "sourcePrompt": original_prompt,
                    "aiGrading": True,
                    "data": _exercise_review_metadata(item),
                    "reviewStatus": status,
                    "sourceReviewId": item_id,
                }
                payload["data"]["aiGradingContext"] = ai_context
                payload["data"]["responseMode"] = "formative-open-response"
                payload["data"]["ambiguousSource"] = {
                    "sourcePrompt": original_prompt,
                    "feedbackContext": feedback_context,
                    "canonicalAnswer": None,
                }
                open_specs.append(("essay", payload))
        elif not canonical_items and not ambiguous_answer:
            for native_type, prompt in _exercise_review_open_parts(item, slide):
                learner_prompt = reflection_prompt or prompt
                min_words, max_words = _word_limits(prompt)
                teacher_only = response_mode in {"teacher", "teacher-only", "teacher-practice"}
                context_item = dict(item)
                if source_open_parts and prompt in {source_prompt for _, source_prompt in source_open_parts}:
                    context_item["prompt"] = prompt
                ai_context = _exercise_review_ai_context(slide, context_item, learner_prompt, audio_item, source)
                payload: dict[str, Any] = {
                    "data": _exercise_review_metadata(item),
                    "reviewStatus": status,
                    "sourceReviewId": item_id,
                    "sourcePrompt": prompt,
                }
                payload["data"]["aiGradingContext"] = ai_context
                if reflection_prompt:
                    payload["title"] = "Escucha y reflexiona."
                    payload["sourcePrompt"] = _text(item.get("prompt"))
                if native_type == "recording":
                    kind = _text(item.get("kind")).casefold()
                    if any(token in kind for token in ("roleplay", "role-play", "conversation")):
                        conversation_metadata = _exercise_review_conversation_metadata(item)
                        if source_open_parts and prompt in {source_prompt for _, source_prompt in source_open_parts}:
                            # A combined reviewed role-play may mention a
                            # later writing task. The recording scenario must
                            # expose only its authored oral D (or E) prompt;
                            # the full review item remains in exerciseReview.
                            conversation_metadata["turns"] = [
                                {
                                    "id": "scenario",
                                    "question": prompt,
                                    "answerPrompt": "Responde a la situación.",
                                }
                            ]
                            conversation_metadata["learnerPrompt"] = prompt
                        payload["data"].update(conversation_metadata)
                    payload.update(
                        {
                            "instruction": learner_prompt,
                            "mode": "teacher-and-self-study",
                            "aiGrading": not teacher_only,
                        }
                    )
                else:
                    payload.update({"prompt": learner_prompt, "aiGrading": not teacher_only})
                    if min_words is not None:
                        payload["minWords"] = min_words
                    if max_words is not None:
                        payload["maxWords"] = max_words
                if teacher_only:
                    payload["doNotAutoGrade"] = True
                open_specs.append((native_type, payload))
    flush_multiple_group()
    specs: list[tuple[str, dict[str, Any]]] = []
    if short_items:
        grammar_transform = any("grammar-transform" in _text(item.get("kind")).casefold() for item in review_items)
        short_payload: dict[str, Any] = {
            "question": short_items[0]["question"],
            "items": short_items,
            "context": _exercise_review_context(review_items),
            "data": {"exerciseReviewItems": copy.deepcopy([dict(item) for item in review_items])},
        }
        if grammar_transform:
            short_payload["title"] = "Transforma la frase."
        specs.append(
            (
                "short_answer",
                short_payload,
            )
        )
    specs.extend(multiple_specs)
    specs.extend(open_specs)
    return specs, listening_blocked


def _source_open_activity_specs(
    slide: Mapping[str, Any],
    source: Mapping[str, Any],
    audio_item: Mapping[str, Any] | None,
) -> list[tuple[str, dict[str, Any]]]:
    """Build missing D/E learner controls directly from published prompts."""

    specs: list[tuple[str, dict[str, Any]]] = []
    for native_type, prompt in _source_open_parts(slide):
        ai_context = _ai_grading_context(slide, prompt, audio_item, source)
        payload: dict[str, Any] = {
            "sourcePrompt": prompt,
            "reviewStatus": "source-published-open",
            "data": {
                "sourceOpenActivity": True,
                "originalPromptAIContext": prompt,
                "aiGradingContext": ai_context,
            },
        }
        if native_type == "recording":
            payload.update(
                {
                    "instruction": prompt,
                    "mode": "teacher-and-self-study",
                    "aiGrading": True,
                }
            )
        else:
            min_words, max_words = _word_limits(prompt)
            payload.update({"prompt": prompt, "aiGrading": True})
            if min_words is not None:
                payload["minWords"] = min_words
            if max_words is not None:
                payload["maxWords"] = max_words
        specs.append((native_type, payload))
    return specs


def _listening_review_specs(
    slide: Mapping[str, Any],
    review_entry: Mapping[str, Any],
    audio: Mapping[str, Any] | None,
    blockers: list[dict[str, Any]],
) -> tuple[list[tuple[str, dict[str, Any]]], bool]:
    """Build one multi-step choice block from reviewed listening questions."""

    number = _slide_number(slide)
    if audio is None:
        return [], True
    items = _as_list(review_entry.get("items"))
    choices: list[dict[str, Any]] = []
    blocked = False
    item_ids: set[str] = set()
    entry_status = _text(review_entry.get("reviewStatus") or review_entry.get("status")).casefold()
    if entry_status in {"blocked", "manual", "manual-review", "blocked-manual", "needs-manual-review", "blocked-awaiting-transcript", "awaiting-review"}:
        blocked = True
    elif entry_status and entry_status not in {"reviewed", "approved", "ready"}:
        blocked = True
    for index, raw_item in enumerate(items, start=1):
        if not isinstance(raw_item, Mapping):
            blocked = True
            continue
        status = _listening_review_item_status(raw_item) or entry_status
        if not status:
            blocked = True
            continue
        if status in {"blocked", "manual", "manual-review", "blocked-manual", "needs-manual-review", "blocked-awaiting-transcript", "awaiting-review"}:
            blocked = True
            continue
        if status and status not in {"reviewed", "approved", "ready"}:
            blocked = True
            continue
        options = raw_item.get("explicitOptions")
        answer_items = [value for value in _as_list(raw_item.get("answerItems")) if isinstance(value, Mapping)]
        answer_values = _listening_review_answer_values(answer_items)
        if not isinstance(options, list) or len(options) != 4 or len(answer_values) != 1:
            blocked = True
            continue
        choice_options, correct_option_id = _multiple_choice_options(options, answer_values[0], number)
        option_ids = {option["id"] for option in choice_options}
        option_texts = {option["text"] for option in choice_options}
        if len(choice_options) != 4 or len(option_ids) != 4 or len(option_texts) != 4 or not correct_option_id or correct_option_id not in option_ids:
            _add_blocker(blockers, _blocker("listening-review-answer-unmatched", number, "Reviewed listening answer does not match exactly one explicit option."))
            blocked = True
            continue
        item_id = _text(raw_item.get("id")) or f"slide-{number}-item-{index:03d}"
        if item_id in item_ids:
            blocked = True
            continue
        item_ids.add(item_id)
        choices.append(
            {
                "id": f"course-listening-{number}-{item_id}-{index:03d}",
                "question": _text(raw_item.get("prompt") or raw_item.get("question")),
                "options": choice_options,
                "correctOptionId": correct_option_id,
            }
        )
    if blocked or not choices:
        return [], True
    digest = _text(review_entry.get("sourceAudioSha256"))
    return [
        (
            "multiple_choice",
            {
                "items": choices,
                # The published deck's old true/false prompt remains in the
                # immutable source archive. Reviewed listening questions use a
                # short learner instruction so unsupported source wording is
                # not rendered a second time beside the new four-option block.
                "context": "Escucha y elige la respuesta.",
                "data": {
                    "listeningReview": {
                        "audioIndex": review_entry.get("audioIndex"),
                        "sourceAudioSha256": digest,
                        "playbackUrl": _audio_url(audio),
                        "transcript": _audio_transcript(audio),
                    },
                    "exerciseReviewItems": copy.deepcopy([dict(item) for item in items if isinstance(item, Mapping)]),
                },
            },
        )
    ], False


def _native_block_specs(
    source: Mapping[str, Any],
    slide: Mapping[str, Any],
    lesson_id: str,
    source_digest: str,
    audio_manifest: Any,
    exercise_items: Sequence[Mapping[str, Any]] | None,
    listening_review: Mapping[str, Any] | None,
    blockers: list[dict[str, Any]],
) -> list[tuple[str, dict[str, Any]]]:
    number = _slide_number(slide)
    texts = _meaningful_texts(slide)
    evidence_texts = _evidence_texts(slide)
    full_text = "\n".join(evidence_texts).strip()
    table_review = _reviewed_text_only_table(slide, lesson_id)
    # A reviewed text-only decision explicitly says that no authored matrix
    # was recovered. Keep any raw source data in originalSource, but never
    # allow a native supplement to invent a learner-facing table here.
    tables = [] if table_review is not None else _tables(slide)
    listening_review_supplied = listening_review is not None
    audio_required = _is_audio_required(slide) or bool(_native_audio_items(slide)) or listening_review_supplied
    audio_items = _audio_candidates(source, slide, lesson_id, audio_manifest) if audio_required else []
    # Prefer a complete staged/original record over an incomplete published
    # placeholder. A URL alone is not enough to make a listening block
    # playable: digest and transcript are immutable evidence requirements.
    audio_item = next(
        (
            item
            for item in audio_items
            if not _is_audio_placeholder(item)
            and _audio_url(item)
            and _audio_digest(item)
            and _audio_transcript(item)
        ),
        next(
            (
                item
                for item in audio_items
                if not _is_audio_placeholder(item)
                and (_audio_url(item) or _audio_digest(item) or _audio_transcript(item))
            ),
            audio_items[0] if audio_items else None,
        ),
    )
    listening_audio = None
    listening_review_blocked = False
    listening_specs: list[tuple[str, dict[str, Any]]] = []
    if listening_review_supplied:
        listening_audio = _listening_review_audio(
            source,
            slide,
            lesson_id,
            audio_manifest,
            listening_review,
            blockers,
        )
        if listening_audio is not None:
            audio_item = listening_audio
        listening_specs, listening_review_blocked = _listening_review_specs(
            slide,
            listening_review,
            listening_audio,
            blockers,
        )
    video_urls = _video_urls(slide)
    native_figures = _native_figures(slide)
    native_evidence = _native_audit_payload(slide)
    vector_projection = _native_vector_projection(slide)
    review_supplied = exercise_items is not None
    review_specs: list[tuple[str, dict[str, Any]]] = []
    review_listening_blocked = False
    if review_supplied:
        review_specs, review_listening_blocked = _exercise_review_specs(
            slide,
            exercise_items or [],
            blockers,
            audio_item,
            source,
        )
    source_open_specs = _source_open_activity_specs(slide, source, audio_item)
    if review_supplied and source_open_specs:
        # A review manifest can contain a compact placeholder or an older
        # inferred response type for the same published D/E prompt. The
        # source-authored control type is authoritative: discard a conflicting
        # review projection, and keep only one reviewed control per prompt.
        expected_open_types = {
            _normalise(payload.get("sourcePrompt")).casefold(): native_type
            for native_type, payload in source_open_specs
            if _normalise(payload.get("sourcePrompt"))
        }
        filtered_review_specs: list[tuple[str, dict[str, Any]]] = []
        seen_source_prompts: set[str] = set()
        for native_type, payload in review_specs:
            prompt_key = _normalise(
                payload.get("sourcePrompt")
                or payload.get("instruction")
                or payload.get("prompt")
            ).casefold()
            expected_type = expected_open_types.get(prompt_key)
            if expected_type is not None:
                if native_type != expected_type or prompt_key in seen_source_prompts:
                    continue
                seen_source_prompts.add(prompt_key)
            elif prompt_key and any(
                len(source_prompt_key) >= 40 and source_prompt_key in prompt_key
                for source_prompt_key in expected_open_types
            ):
                # Some review entries preserve a combined D/E placeholder
                # (including section labels). Once the exact published
                # controls are available, that combined projection would
                # duplicate both activities and is discarded.
                continue
            filtered_review_specs.append((native_type, payload))
        review_specs = filtered_review_specs
        # Keep one control per authored D/E prompt when another reviewed item
        # (for example a reading extraction) shares the same final slide.
        existing_open_prompts = {
            _normalise(payload.get("sourcePrompt") or payload.get("instruction") or payload.get("prompt")).casefold()
            for native_type, payload in review_specs
            if native_type in {"recording", "essay"}
        }
        for native_type, payload in source_open_specs:
            prompt_key = _normalise(payload.get("sourcePrompt")).casefold()
            if prompt_key and prompt_key not in existing_open_prompts:
                review_specs.append((native_type, payload))
                existing_open_prompts.add(prompt_key)
    if _is_picture_prompt_required(slide) and not native_figures and vector_projection is None:
        _add_blocker(
            blockers,
            _blocker(
                "native-figure-required",
                number,
                "The authored picture prompt requires confirmed instructional figure evidence.",
            ),
        )
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
    if not review_supplied and not listening_review_supplied:
        specs.extend(source_open_specs)
    prompt_text = _prompt_text(slide, texts)
    pairs = _extract_pairs(texts)
    covered_texts = [
        f"{pair['term']} - {pair['definition']}"
        for pair in pairs
        if pair.get("term") and pair.get("definition")
    ]
    if vector_projection is not None:
        vector_content = vector_projection.get("structuredContent")
        if isinstance(vector_content, Mapping):
            vector_rows = vector_content.get("content", {}).get("rows") if isinstance(vector_content.get("content"), Mapping) else []
            for row in _as_list(vector_rows):
                if isinstance(row, (list, tuple)):
                    covered_texts.extend(_text(value) for value in row if _text(value))
    activity_prompts = [
        _text(item.get("prompt"))
        for item in (exercise_items or [])
        if isinstance(item, Mapping) and _text(item.get("prompt"))
    ]
    # Source-open controls may be reconstructed from the published D/E (or
    # Unit 3 C/D) labels when the review item is only a compact placeholder.
    # Mark those exact prompts as structured activity text so the same prompt
    # is not emitted again as a learner paragraph.
    activity_prompts.extend(
        _text(payload.get("sourcePrompt"))
        for _native_type, payload in source_open_specs
        if _text(payload.get("sourcePrompt"))
    )
    if listening_review is not None:
        activity_prompts.extend(
            _text(item.get("prompt") or item.get("question"))
            for item in _as_list(listening_review.get("items"))
            if isinstance(item, Mapping) and _text(item.get("prompt") or item.get("question"))
        )
    context_texts = _learner_context_texts(
        slide,
        tables,
        prompt_text,
        covered_texts=covered_texts,
        activity_prompts=activity_prompts,
    )
    reading_passage_texts = _reading_passage_texts(slide, evidence_texts)
    reading_marker = re.search(
        r"\b(?:read(?:ing)?|passage|reading aloud|read aloud)\b",
        full_text.casefold(),
    )
    has_reading_passage = bool(
        _is_reading(full_text)
        and reading_marker
        and reading_passage_texts
        and any(len(value) >= 120 for value in reading_passage_texts)
    )
    common = {
        "sourceText": texts,
        "sourceTitle": _text(slide.get("title")),
    }
    if table_review is not None:
        common.update(
            {
                "tableReview": copy.deepcopy(table_review["tableReview"]),
                "tableSemantics": copy.deepcopy(table_review["tableSemantics"]),
            }
        )
    if _is_overhead_source_slide(slide):
        return [
            (
                "teacher_notes",
                {
                    **common,
                    "content": _readable_html(_slide_texts(slide)),
                    "format": "html",
                    "hiddenFromLearners": True,
                    "sourceRole": "noninstructional-overhead",
                },
            )
        ]
    teacher_listening_prompts = _teacher_led_listening_prompts(slide)
    # A reviewed teacher-note entry already preserves this authored
    # instruction. Do not prepend the generic detector's duplicate note.
    has_reviewed_teacher_note = any(native_type == "teacher_notes" for native_type, _ in review_specs)
    if teacher_listening_prompts and not audio_required and not has_reviewed_teacher_note:
        specs.append(
            (
                "teacher_notes",
                {
                    **common,
                    "content": _readable_html(teacher_listening_prompts),
                    "format": "html",
                    "hiddenFromLearners": True,
                    "sourceRole": "teacher-guided-listening",
                },
            )
        )
    native_paragraphs = _native_paragraphs(slide)
    if native_paragraphs:
        common["nativeParagraphs"] = copy.deepcopy(native_paragraphs)
    if re.search(r"\b(?:objective|competenc|communicative function|learning goal)\w*\b", full_text.casefold()):
        common["objectives"] = copy.deepcopy(texts)
    if _is_goal_slide(slide):
        goal_texts = _goal_visible_texts(slide, texts)
        goal_title = _goal_title(slide, texts)
        specs.append(
            (
                "text",
                {
                    **common,
                    "title": goal_title,
                    "content": _readable_html(goal_texts or texts),
                    "format": "html",
                    "sourceRole": "learning-goal",
                },
            )
        )
        # Goal slides state what the learner will achieve. They do not become
        # recording/essay activities merely because a goal sentence contains
        # words such as "conversation" or "write".
        return specs
    vector_structured_content = vector_projection.get("structuredContent") if isinstance(vector_projection, Mapping) else None
    if isinstance(vector_structured_content, Mapping):
        vector_content = vector_structured_content.get("content")
        vector_data = vector_structured_content.get("data")
        vector_proof = vector_structured_content.get("figureProof")
        if isinstance(vector_content, Mapping) and isinstance(vector_data, Mapping):
            vector_payload: dict[str, Any] = {
                **common,
                "title": _text(slide.get("title")) or "Week",
                "content": copy.deepcopy(dict(vector_content)),
                "tables": copy.deepcopy(_as_list(vector_structured_content.get("tables"))),
                "sourceRole": _text(vector_structured_content.get("sourceRole")) or "native-vector-calendar",
                "data": {
                    "tableGroups": copy.deepcopy(_as_list(vector_data.get("tableGroups"))),
                    "vectorFigureProof": copy.deepcopy(dict(vector_proof)) if isinstance(vector_proof, Mapping) else {},
                    "vectorSemanticProjection": copy.deepcopy(dict(vector_projection)),
                },
            }
            specs.append(("structured-content", vector_payload))
    if tables and vector_structured_content is None:
        combined_rows: list[list[str]] = []
        for table in tables:
            combined_rows.extend(copy.deepcopy(table))
        headers = combined_rows[0] if combined_rows else []
        rows = combined_rows[1:] if len(combined_rows) > 1 else []
        worksheet_projection = _grammar_worksheet_projection(tables, exercise_items)
        learner_headers = headers
        learner_rows = rows
        worksheet_metadata: dict[str, Any] | None = None
        if worksheet_projection is not None:
            learner_headers, learner_rows, worksheet_metadata = worksheet_projection
        table_groups = _table_groups(tables)
        specs.append(
            (
                "structured-content",
                {
                    **common,
                    "content": {"headers": learner_headers, "rows": learner_rows},
                    "tables": copy.deepcopy(tables),
                    **({"worksheetProjection": worksheet_metadata} if worksheet_metadata else {}),
                    **({"data": {"tableGroups": table_groups}} if table_groups else {}),
                },
            )
        )
    if not tables and table_review is None and _has_table_instruction(slide, full_text):
        _add_blocker(
            blockers,
            _blocker("table-semantics-missing", number, "The source mentions a table or chart without authored cell semantics."),
        )

    lower_title = _text(slide.get("title")).casefold()
    if (
        len(pairs) >= 2
        and not _looks_like_flattened_source_chart(_text(slide.get("title")))
        and ("vocab" in lower_title or "word" in lower_title or all(len(item["term"].split()) <= 3 for item in pairs))
    ):
        vocabulary_items = [
            {"id": f"course-vocabulary-{number}-{index:03d}", **pair}
            for index, pair in enumerate(pairs, start=1)
        ]
        specs.append(
            (
                "vocabulary",
                {
                    **common,
                    "title": _text(slide.get("title")) or "Vocabulary",
                    "items": vocabulary_items,
                },
            )
        )

    explicit_answer = None if review_supplied or listening_review_supplied else _explicit_answer_key(slide)
    explicit_options = None if review_supplied or listening_review_supplied else _explicit_options(slide)
    closed_answer_blocked = listening_review_blocked
    if explicit_answer is not None:
        if explicit_options:
            choice_options, correct_option_id = _multiple_choice_options(explicit_options, explicit_answer, number)
            if correct_option_id not in {option["id"] for option in choice_options}:
                _add_blocker(
                    blockers,
                    _blocker("answer-key-unmatched", number, "The authored answer key does not match any authored option."),
                )
            else:
                specs.append(
                    (
                        "multiple_choice",
                        {
                            **common,
                            "question": prompt_text,
                            "options": choice_options,
                            "correctOptionId": correct_option_id,
                        },
                    )
                )
        else:
            specs.append(
                (
                    "short_answer",
                    {
                        **common,
                        "items": [
                            {
                                "id": f"course-short-answer-{number}-001",
                                "question": prompt_text,
                                "correctAnswer": _text(explicit_answer),
                            }
                        ],
                    },
                )
            )

    listening_reflection = next(
        (
            _reviewed_listening_reflection_prompt(item)
            for item in (exercise_items or [])
            if isinstance(item, Mapping) and _reviewed_listening_reflection_prompt(item)
        ),
        "",
    )
    if not review_listening_blocked and not listening_review_blocked and audio_required and audio_item is not None and _audio_url(audio_item) and _audio_digest(audio_item) and _audio_transcript(audio_item):
        audio_provenance = _audio_provenance(audio_item)
        specs.append(
            (
                "audio",
                {
                    **common,
                    **({"title": "Escucha y reflexiona."} if listening_reflection else {}),
                    "instruction": (
                        "Escucha y elige la respuesta."
                        if listening_review_supplied and listening_specs
                        else "Escucha el audio y responde la reflexión."
                        if listening_reflection
                        else prompt_text
                    ),
                    "url": _audio_url(audio_item),
                    "transcript": _audio_transcript(audio_item),
                    "mediaDigest": _audio_digest(audio_item),
                    **({"data": {"audioProvenance": audio_provenance}} if audio_provenance else {}),
                },
            )
        )

    for video_url in video_urls:
        specs.append(
            (
                "video",
                {
                    **common,
                    "url": video_url,
                    "title": _text(slide.get("title")) or "Video",
                },
            )
        )

    for figure in native_figures:
        asset_path = _text(figure.get("assetPath"))
        browser_url = _text(figure.get("url") or figure.get("publicHref") or figure.get("publicUrl"))
        if not asset_path or not browser_url:
            continue
        specs.append(
            (
                "image",
                {
                    **common,
                    "url": browser_url,
                    "assetPath": asset_path,
                    "alt": _text(figure.get("alt")) or _text(slide.get("title")) or "Source figure",
                    **({"caption": _text(figure.get("caption"))} if _text(figure.get("caption")) else {}),
                    **({"sourcePurpose": _text(figure.get("sourcePurpose"))} if _text(figure.get("sourcePurpose")) else {}),
                },
            )
        )

    picture_prompts = _picture_prompt_texts(slide)
    if picture_prompts:
        specs.append(
            (
                "text",
                {
                    **common,
                    "content": _readable_html(picture_prompts),
                    "format": "html",
                    "sourceRole": "picture-instruction",
                },
            )
        )

    if not source_open_specs and not review_supplied and not listening_review_supplied and _is_speaking_prompt(prompt_text):
        recording_time_limit = _time_limit(prompt_text)
        specs.append(
            (
                "recording",
                {
                    **common,
                    "instruction": prompt_text,
                    **({"timeLimit": recording_time_limit} if recording_time_limit is not None else {}),
                    "mode": "teacher-and-self-study",
                    "aiGrading": True,
                    "data": {
                        "aiGradingContext": _ai_grading_context(slide, prompt_text, audio_item, source),
                    },
                },
            )
        )

    if not source_open_specs and not review_supplied and not listening_review_supplied and explicit_answer is None and _is_closed_answer_prompt(prompt_text):
        closed_answer_blocked = True
        _add_blocker(
            blockers,
            _blocker(
                "closed-answer-key-missing",
                number,
                "Closed-answer activity has no reviewed authored answer key; it remains a source instruction until reviewed.",
            ),
        )
    elif not source_open_specs and not review_supplied and not listening_review_supplied and _is_essay_prompt(prompt_text):
        min_words, max_words = _word_limits(prompt_text)
        specs.append(
            (
                "essay",
                {
                    **common,
                    "prompt": prompt_text,
                    "aiGrading": True,
                    **({"minWords": min_words} if min_words is not None else {}),
                    **({"maxWords": max_words} if max_words is not None else {}),
                    "data": {
                        "aiGradingContext": _ai_grading_context(slide, prompt_text, audio_item, source),
                    },
                },
            )
        )
    elif not source_open_specs and not review_supplied and not listening_review_supplied and explicit_answer is None and _is_short_answer_prompt(prompt_text):
        min_words, max_words = _word_limits(prompt_text)
        specs.append(
            (
                "essay",
                {
                    **common,
                    "prompt": prompt_text,
                    "aiGrading": True,
                    **({"minWords": min_words} if min_words is not None else {}),
                    **({"maxWords": max_words} if max_words is not None else {}),
                    "data": {
                        "aiGradingContext": _ai_grading_context(slide, prompt_text, audio_item, source),
                    },
                },
            )
        )

    if review_supplied:
        specs.extend(review_specs)
    if listening_review_supplied:
        specs.extend(listening_specs)

    # Reviewed listening replacement blocks intentionally hide the old source
    # question prose. Other reviewed activities still need their authored
    # passage, dialogue, examples, and rules visible before the control.
    render_context_texts = context_texts
    if listening_review_supplied:
        # Replace only the old listening directions/questions. Authored
        # examples and adjacent teaching prose (for example Unit 34's
        # “Back in the 90s” phone example) remain learner-visible.
        render_context_texts = [
            value
            for value in render_context_texts
            if not _is_replaced_listening_instruction(value)
            and _normalise(value).casefold() not in {"listening", "audio", "listen"}
        ]
    elif review_specs:
        review_prompt_keys = [
            _normalise(value).casefold()
            for value in activity_prompts
            if _normalise(value)
        ]
        render_context_texts = [
            value
            for value in render_context_texts
            if _normalise(value).casefold() not in {
                "let's talk",
                "let’s talk",
                "let' talk",
                "let's write",
                "let’s write",
                "let' write",
            }
            and not (
                len(value) < 120
                and any(
                    _normalise(value).casefold() in prompt_key
                    or prompt_key in _normalise(value).casefold()
                    for prompt_key in review_prompt_keys
                )
            )
        ]
    if render_context_texts and not closed_answer_blocked and (tables or not has_reading_passage):
        visible_context = list(render_context_texts)
        # When no structured block survived (for example an audio source whose
        # URL is missing), retain the authored instruction in the reviewable
        # fallback text instead of leaving only a heading visible.
        if (
            not specs
            and prompt_text
            and (
                len(_normalise(prompt_text)) < 120
                or _is_speaking_prompt(prompt_text)
                or _is_essay_prompt(prompt_text)
                or _is_short_answer_prompt(prompt_text)
            )
            and _normalise(prompt_text).casefold() not in {
            _normalise(value).casefold() for value in visible_context
            }
        ):
            visible_context.append(prompt_text)
        if visible_context:
            specs.append(
                (
                    "text",
                    {
                        **common,
                        "content": _readable_html(visible_context),
                        "format": "html",
                        "sourceRole": "teaching-context",
                    },
                )
            )

    # Preserve a long authored reading passage as readable HTML even when the
    # same slide also has questions or a read-aloud instruction.
    if has_reading_passage:
        specs.append(
            (
                "text",
                {
                    **common,
                    "content": _readable_html(reading_passage_texts),
                    "format": "html",
                },
            )
        )

    if closed_answer_blocked and not any(native_type == "text" for native_type, _ in specs):
        blocked_texts = [*context_texts]
        if prompt_text and _normalise(prompt_text).casefold() not in {
            _normalise(value).casefold() for value in blocked_texts
        }:
            blocked_texts.append(prompt_text)
        specs.append(
            (
                "text",
                {
                    **common,
                    "content": _readable_html(blocked_texts or evidence_texts),
                    "format": "html",
                    "reviewRequired": True,
                    "reviewReason": "closed-answer-key-missing",
                },
            )
        )

    if not specs and full_text:
        specs.append(("text", {**common, "content": _readable_html(context_texts or evidence_texts), "format": "html"}))
    if audio_required and not audio_item and not full_text:
        # The blocker is the evidence for an audio-only source slide; do not
        # fabricate a playable block or a transcript.
        return specs
    if audio_required and audio_item and not _audio_url(audio_item) and full_text and not specs:
        specs.append(("text", {**common, "content": _readable_html(context_texts or evidence_texts), "format": "html"}))
    def spec_priority(item: tuple[str, dict[str, Any]]) -> tuple[int, int]:
        native_type = item[0]
        if vector_structured_content is not None and native_type == "structured-content":
            return (0, 0)
        if tables and native_type == "structured-content":
            return (0, 0)
        if native_type == "text" and item[1].get("sourceRole") == "picture-instruction":
            return (1, 0)
        if native_type == "image":
            return (1, 1)
        if native_type == "audio":
            return (2, 0)
        if has_reading_passage and native_type == "text":
            return (3, 0)
        if native_type == "text" and item[1].get("sourceRole") == "teaching-context":
            return (3, 1)
        if native_type in {"recording", "essay", "multiple_choice", "short_answer"}:
            return (4, 0)
        if native_type in {"structured-content", "vocabulary"}:
            return (5, 0)
        if native_type == "video":
            return (6, 0)
        if native_type == "text":
            return (7, 0)
        return (8, 0)

    specs = _dedupe_picture_instruction_specs(specs, number)
    specs = _drop_contained_passage_specs(specs, number)
    return [item for _, item in sorted(enumerate(specs), key=lambda pair: (*spec_priority(pair[1]), pair[0]))]


def _row_data_metadata(
    source: Mapping[str, Any],
    source_digest: str,
    lesson_id: str,
    slide: Mapping[str, Any],
    native_type: str,
    audio: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    original_ids = [f"{lesson_id}:slide:{_slide_number(slide)}"]
    metadata = {
        "learningRevision": LEARNING_REVISION,
        "sourceSlides": [_slide_number(slide)],
        "originalIDs": original_ids,
        "originalSource": _original_source(source, lesson_id, source_digest, slide, audio),
    }
    for key in ("tableReview", "tableSemantics"):
        value = slide.get(key)
        if isinstance(value, Mapping):
            metadata[key] = copy.deepcopy(dict(value))
    return metadata


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
    """Archive old embeds as teacher-only notes without changing row identity."""

    result: list[dict[str, Any]] = []
    for row in rows:
        copied = copy.deepcopy(dict(row))
        original_data = copy.deepcopy(copied.get("data"))
        data = original_data if isinstance(original_data, Mapping) else {}
        is_embed = _text(copied.get("contentType")).casefold() == "embed" or _text(data.get("type")).casefold() == "embed"
        if is_embed:
            original_id = _text(copied.get("id"))
            copied["data"] = {
                "type": "teacher_notes",
                "title": _text(copied.get("title")) or "Archived source",
                "content": "Original source embed archived for teacher review.",
                "data": {
                    "learningRevision": LEARNING_REVISION,
                    "originalIDs": [original_id],
                    "originalSource": original_data,
                    "sourceUrl": _source_url(source),
                    "sourceDigest": source_digest,
                    "lessonId": lesson_id,
                },
            }
        result.append(copied)
    return result


_GUIDED_REVIEW_TITLES = {
    "transforma la frase.": "Transforma la frase.",
    "escucha y reflexiona.": "Escucha y reflexiona.",
}

_SOURCE_HEADING_INSTRUCTION_WORDS = re.compile(
    r"\b(?:act|answer|ask|choose|circle|complete|change|describe|discuss|fill|hear|identify|listen|look|match|observe|pick|point|read|repeat|respond|select|state|talk|tell|transform|underline|write|"
    r"actúa|cambia|completa|describe|discute|elige|escucha|escribe|identifica|lee|mira|observa|responde|selecciona|transforma)\b",
    re.IGNORECASE,
)


def _source_heading(value: Any) -> str:
    """Return a short named heading, excluding prompts and slide numbers."""

    candidate = _normalise(value)
    if not candidate:
        return ""
    words = re.findall(r"[\wÀ-ÿ]+(?:['’–-][\wÀ-ÿ]+)?", candidate, flags=re.UNICODE)
    if len(words) < 2 or len(words) > 8 or len(candidate) > 72:
        return ""
    if re.fullmatch(r"[\d\s./_-]+", candidate) or re.fullmatch(
        r"(?:unit|lesson|slide)\s*\d{1,3}", candidate, flags=re.IGNORECASE
    ):
        return ""
    if re.match(r"^(?:[A-Za-z]|\d{1,3})[.)]\s", candidate):
        return ""
    if (
        re.search(r"[!?]", candidate)
        or re.match(r"^(?:what|which|where|who|when|why|how|qué|cuál|dónde|quién|cuándo|por qué|cómo)\b", candidate, flags=re.IGNORECASE)
        or _SOURCE_HEADING_INSTRUCTION_WORDS.search(candidate)
    ):
        return ""
    if _is_technical_text(candidate):
        return ""
    return candidate


def _source_topic_heading(slide: Mapping[str, Any]) -> str:
    """Return a source-authored topic for a multi-figure vocabulary slide.

    A published slide can use one activity heading for several reviewed
    vocabulary figures. Reusing that heading makes every figure look like the
    same navigation step, while choosing the first visible word invents a
    misleading topic. The source decks commonly place the authored topic label
    after the item list (for example ``DAILY ROUTINES``), so use the last
    concise authored heading when there are multiple confirmed figures.
    """

    if len(_native_figures(slide)) < 2:
        return ""
    slide_title = _normalise(slide.get("title")).casefold()
    candidates = [
        heading
        for value in _meaningful_texts(slide)
        for heading in [_source_heading(value)]
        if (
            heading
            and heading.casefold() != slide_title
            and _normalise(value).upper() == _normalise(value)
            and any(character.isalpha() for character in _normalise(value))
        )
    ]
    return candidates[-1] if candidates else ""


def _reviewed_guided_title(payload: Mapping[str, Any]) -> str:
    candidate = _normalise(payload.get("title"))
    if not candidate:
        return ""
    return _GUIDED_REVIEW_TITLES.get(candidate.casefold(), "")


def _is_reading_content(slide: Mapping[str, Any]) -> bool:
    evidence = " ".join(_evidence_texts(slide))
    if not evidence:
        return False
    title_and_evidence = f"{_text(slide.get('title'))} {evidence}"
    return bool(
        re.search(r"\b(?:reading|passage|read\s+(?:the|a|an)?\s*text|read\s+the\s+following)\b", title_and_evidence, flags=re.IGNORECASE)
        and any(len(value) >= 120 for value in _reading_passage_texts(slide, _evidence_texts(slide)))
    )


def _video_has_pronunciation_hint(slide: Mapping[str, Any]) -> bool:
    evidence = " ".join([_text(slide.get("title")), *_evidence_texts(slide)])
    return bool(
        re.search(r"\b(?:pronunciation|pronounce|repeat|listen|hear)\b", evidence, flags=re.IGNORECASE)
    )


def _native_row_title(
    slide: Mapping[str, Any],
    native_type: str,
    payload: Mapping[str, Any],
) -> str:
    """Return the concise title stored on a mapped block for navigation."""

    reviewed_title = _reviewed_guided_title(payload)
    if reviewed_title:
        return reviewed_title

    source_role = _text(payload.get("sourceRole")).casefold()
    heading = _source_heading(_text(slide.get("title")))
    if native_type == "teacher_notes":
        return ""
    if source_role == "learning-goal":
        return _source_heading(payload.get("title")) or heading or "En esta unidad."
    if native_type == "image":
        if _is_picture_prompt_required(slide):
            return "Observa la imagen."
        topic_heading = _source_topic_heading(slide)
        if topic_heading:
            return topic_heading
        if len(_native_figures(slide)) >= 2:
            return "Imagen."
        return heading or "Imagen."
    if native_type == "video":
        if _video_has_pronunciation_hint(slide):
            return "Escucha la pronunciación."
        return heading or "Mira el video."
    if native_type == "text":
        if _is_reading_content(slide):
            return "Lee el texto."
        return heading or "Contenido."
    if native_type == "structured-content":
        if source_role == "native-vector-calendar":
            data = payload.get("data")
            table_groups = data.get("tableGroups") if isinstance(data, Mapping) else None
            if any(
                isinstance(group, Mapping) and _text(group.get("key")).casefold() == "week-overview"
                for group in _as_list(table_groups)
            ):
                return "Una semana de actividades."
        return heading or "Consulta las formas."
    if native_type == "vocabulary":
        return heading or "Vocabulario."
    if native_type == "audio":
        return heading or "Escucha."
    if native_type == "multiple_choice":
        return heading or "Elige la respuesta."
    if native_type == "short_answer":
        return heading or "Responde la actividad."
    if native_type == "essay":
        return heading or "Escribe tu respuesta."
    if native_type == "recording":
        return heading or "Habla."
    if native_type == "teacher_notes":
        return heading or "Notas del docente."
    return heading or native_type.replace("-", " ").title()


def _native_row_guided_title(
    slide: Mapping[str, Any],
    native_type: str,
    payload: Mapping[str, Any],
) -> str:
    """Return only reviewed or evidence-backed overrides for task headings."""

    reviewed_title = _reviewed_guided_title(payload)
    if reviewed_title:
        return reviewed_title

    source_role = _text(payload.get("sourceRole")).casefold()
    heading = _source_heading(_text(slide.get("title")))
    if native_type == "teacher_notes":
        return ""
    if source_role == "learning-goal":
        return _source_heading(payload.get("title")) or heading or "En esta unidad."
    if native_type == "image" and _is_picture_prompt_required(slide):
        return "Observa la imagen."
    if native_type == "video" and _video_has_pronunciation_hint(slide):
        return "Escucha la pronunciación."
    if native_type == "text" and _is_reading_content(slide):
        return "Lee el texto."
    return heading


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
        payload_metadata = payload.get("data") if isinstance(payload.get("data"), Mapping) else {}
        provenance = payload_metadata.get("audioProvenance") if isinstance(payload_metadata, Mapping) else {}
        audio_evidence = {
            "url": _text(payload.get("url")),
            "digest": _text(payload.get("mediaDigest")),
            "transcript": _text(payload.get("transcript")),
        }
        if isinstance(provenance, Mapping):
            audio_evidence.update(
                {key: _text(value) for key, value in provenance.items() if _text(value)}
            )
    metadata = _row_data_metadata(source, source_digest, lesson_id, slide, native_type, audio_evidence)
    data = copy.deepcopy(dict(payload))
    existing_metadata = data.pop("metadata", None)
    existing_nested = data.get("data")
    if isinstance(existing_nested, Mapping):
        metadata = {**copy.deepcopy(dict(existing_nested)), **metadata}
    if isinstance(existing_metadata, Mapping):
        metadata = {**copy.deepcopy(dict(existing_metadata)), **metadata}
    data["type"] = native_type
    # ``mapContentToBlock`` reads the nested data object and does not expose a
    # Prisma row's top-level title. Store a concise navigation label there so
    # the guided viewer never uses a full slide prompt as a step heading.
    navigation_title = _native_row_title(slide, native_type, payload)
    guided_title = _native_row_guided_title(slide, native_type, payload)
    metadata.pop("guidedTitle", None)
    if guided_title:
        metadata["guidedTitle"] = guided_title
    data["title"] = navigation_title
    data["data"] = metadata
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
    course = snapshot.get("course")
    course_modules = course.get("modules") if isinstance(course, Mapping) else None
    for module in _as_list(snapshot.get("modules")) + _as_list(snapshot.get("units")) + _as_list(course_modules):
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


def _validate_native_payload(data: Mapping[str, Any], row_id: str) -> None:
    native_type = _text(data.get("type"))
    if native_type in {"text", "teacher_notes"}:
        if not isinstance(data.get("content"), str):
            raise PlanError(f"{native_type} row has no string content: {row_id}")
    elif native_type == "video":
        if not isinstance(data.get("url"), str) or not data.get("url"):
            raise PlanError(f"video row has no source URL: {row_id}")
    elif native_type == "image":
        if not all(isinstance(data.get(key), str) and data.get(key) for key in ("url", "assetPath", "alt")):
            raise PlanError(f"image row has no traceable asset path and alt text: {row_id}")
        image_url = data["url"].casefold()
        if not (image_url.startswith("/") or image_url.startswith("http://") or image_url.startswith("https://")):
            raise PlanError(f"image row has no browser-safe URL: {row_id}")
        try:
            if not Path(data["assetPath"]).is_file():
                raise PlanError(f"image row asset path does not exist: {row_id}")
        except OSError as exc:
            raise PlanError(f"image row asset path is unreadable: {row_id}") from exc
    elif native_type == "audio":
        if not all(isinstance(data.get(key), str) and data.get(key) for key in ("url", "mediaDigest", "transcript")):
            raise PlanError(f"audio row is missing immutable media evidence: {row_id}")
    elif native_type == "vocabulary":
        if not isinstance(data.get("title"), str) or not isinstance(data.get("items"), list):
            raise PlanError(f"vocabulary row has an invalid shape: {row_id}")
        for item in data["items"]:
            if not isinstance(item, Mapping) or not all(isinstance(item.get(key), str) and item.get(key) for key in ("id", "term", "definition")):
                raise PlanError(f"vocabulary row has an invalid item: {row_id}")
    elif native_type == "structured-content":
        content = data.get("content")
        if not isinstance(content, Mapping) or not isinstance(content.get("headers"), list) or not isinstance(content.get("rows"), list):
            raise PlanError(f"structured-content row has an invalid table shape: {row_id}")
    elif native_type == "essay":
        if not isinstance(data.get("prompt"), str) or not data.get("prompt"):
            raise PlanError(f"essay row has no source prompt: {row_id}")
        for key in ("minWords", "maxWords"):
            if key in data and (not isinstance(data[key], int) or isinstance(data[key], bool)):
                raise PlanError(f"essay row has an invalid {key}: {row_id}")
    elif native_type == "recording":
        if not isinstance(data.get("instruction"), str) or not data.get("instruction"):
            raise PlanError(f"recording row has no source instruction: {row_id}")
        if "timeLimit" in data and (not isinstance(data["timeLimit"], int) or isinstance(data["timeLimit"], bool)):
            raise PlanError(f"recording row has an invalid timeLimit: {row_id}")
    elif native_type == "multiple_choice":
        raw_items = data.get("items")
        if isinstance(raw_items, list):
            if not raw_items:
                raise PlanError(f"multiple_choice row has no items: {row_id}")
            questions = raw_items
        else:
            questions = [data]
        for question in questions:
            if not isinstance(question, Mapping):
                raise PlanError(f"multiple_choice row has an invalid item: {row_id}")
            options = question.get("options")
            if not isinstance(question.get("question"), str) or not isinstance(options, list) or not isinstance(question.get("correctOptionId"), str):
                raise PlanError(f"multiple_choice row has an invalid shape: {row_id}")
            if isinstance(raw_items, list) and (not isinstance(question.get("id"), str) or not question.get("id")):
                raise PlanError(f"multiple_choice row has an invalid item id: {row_id}")
            option_ids: list[str] = []
            for option in options:
                if not isinstance(option, Mapping) or not isinstance(option.get("id"), str) or not isinstance(option.get("text"), str):
                    raise PlanError(f"multiple_choice row has an invalid option: {row_id}")
                option_ids.append(option["id"])
            if question["correctOptionId"] not in option_ids:
                raise PlanError(f"multiple_choice row has an unmatched answer: {row_id}")
    elif native_type == "short_answer":
        items = data.get("items")
        if not isinstance(items, list):
            raise PlanError(f"short_answer row has no items: {row_id}")
        for item in items:
            if not isinstance(item, Mapping) or not all(isinstance(item.get(key), str) and item.get(key) for key in ("id", "question", "correctAnswer")):
                raise PlanError(f"short_answer row has an invalid item: {row_id}")
    else:
        raise PlanError(f"generated row uses unsupported native type {native_type!r}: {row_id}")


def build_plan(
    lesson: Mapping[str, Any] | None,
    source: Mapping[str, Any],
    audio_manifest: Any = None,
    native_audit: Any = None,
    exercise_review: Any = None,
    listening_review: Any = None,
) -> dict[str, Any]:
    """Build one deterministic plan while preserving the existing row identities."""

    source_lesson_id = _source_lesson_id(source)
    lesson_id = _lesson_id(lesson) if lesson is not None else source_lesson_id
    if lesson is not None and lesson_id != source_lesson_id:
        raise PlanError(f"source lesson {source_lesson_id} does not match snapshot lesson {lesson_id}")
    _validate_course_id(source.get("courseId"))
    source_digest = _source_digest(source)
    blockers: list[dict[str, Any]] = []
    source_with_native = _prepare_native_audit(source, native_audit, blockers)
    exercise_review_index = _exercise_review_index(exercise_review, source_with_native, lesson_id, blockers)
    listening_review_index = _listening_review_index(
        listening_review,
        source_with_native,
        lesson_id,
        audio_manifest,
        blockers,
    )
    if lesson is None:
        _add_blocker(blockers, _blocker("lesson-missing-from-snapshot", detail=f"No snapshot lesson matched {source_lesson_id}."))
    if _text(source.get("status")) and _text(source.get("status")).casefold() not in {"ok", "published", "ready"}:
        _add_blocker(blockers, _blocker("source-not-ready", detail=f"Source status is {source.get('status')!r}."))
    if not _source_url(source):
        _add_blocker(blockers, _blocker("source-url-missing", detail="Published source URL is required for provenance."))
    deck = _deck(source_with_native)
    slides = _slides(source_with_native)
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
    for row in previous_rows:
        if not _text(row.get("lessonId")):
            row["lessonId"] = lesson_id
        elif _text(row.get("lessonId")) != lesson_id:
            raise PlanError(f"existing row {row.get('id')} belongs to another lesson")
    next_rows = _archive_existing_rows(previous_rows, source, source_digest, lesson_id)
    next_order = max([int(row.get("order", 0)) for row in previous_rows if str(row.get("order", "")).lstrip("-").isdigit()] or [0]) + 1
    generated_sequence = 1
    covered_slides: set[int] = set()
    unsupported_slides: list[dict[str, Any]] = []
    for slide in slides:
        number = _slide_number(slide)
        # Once a review manifest is supplied, every slide is considered reviewed
        # input, including an empty entry. This prevents the generic source
        # heuristics from inventing an answer or activity when the review is
        # incomplete; the index validator has already recorded the blocker.
        listening_entry = listening_review_index.get(number) if listening_review is not None else None
        review_items = exercise_review_index.get(number, []) if exercise_review is not None else None
        if listening_entry is not None and review_items is not None:
            # The dedicated listening review supersedes only the old listening
            # exercise records on this slide. Other reviewed open activities
            # remain available to the generic exercise mapper.
            review_items = [item for item in review_items if not _is_listening_review_item(item)]
        specs = _native_block_specs(
            source_with_native,
            slide,
            lesson_id,
            source_digest,
            audio_manifest,
            review_items,
            listening_entry,
            blockers,
        )
        source_has_content = bool(
            _evidence_texts(slide)
            or _tables(slide)
            or _native_figures(slide)
            or _is_audio_required(slide)
        )
        # A bare divider such as ``Introduction`` is archived as teacher notes
        # for provenance, but it is not authored learner material and should
        # not claim source coverage as a meaningful extracted slide.
        pure_divider_title = _normalise(slide.get("title")).casefold().replace("�", "'").replace("’", "'")
        if (
            _is_overhead_source_slide(slide)
            and pure_divider_title in _SOURCE_DIVIDER_TITLES
            and not _meaningful_texts(slide)
            and not _tables(slide)
            and not _native_figures(slide)
            and not _is_audio_required(slide)
        ):
            source_has_content = False
        pure_divider = (
            _is_overhead_source_slide(slide)
            and _normalise(slide.get("title")).casefold().replace("�", "'").replace("’", "'") in _SOURCE_DIVIDER_TITLES
            and not _meaningful_texts(slide)
            and not _tables(slide)
            and not _native_figures(slide)
            and not _is_audio_required(slide)
        )
        if (specs and not pure_divider) or source_has_content:
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
    for index, row in enumerate(next_rows):
        row["order"] = index
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
    native_audit: Any = None,
    exercise_review: Any = None,
    listening_review: Any = None,
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
        plans.append(build_plan(lesson, source, audio_manifest, native_audit, exercise_review, listening_review))
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
        before_data = before.get("data")
        before_data_map = before_data if isinstance(before_data, Mapping) else {}
        if _text(before.get("contentType")).casefold() == "embed" or _text(before_data_map.get("type")).casefold() == "embed":
            after_data = after.get("data")
            if not isinstance(after_data, Mapping) or after_data.get("type") != "teacher_notes":
                raise PlanError(f"existing embed must be archived as teacher_notes: {row_id}")
            nested = after_data.get("data")
            if not isinstance(nested, Mapping) or nested.get("originalSource") != before_data:
                raise PlanError(f"existing embed archive lost original source data: {row_id}")
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
        metadata = data.get("data")
        if not isinstance(metadata, Mapping) or metadata.get("learningRevision") != LEARNING_REVISION:
            raise PlanError(f"generated row has no learning revision metadata: {row_id}")
        if not _as_list(metadata.get("sourceSlides")):
            raise PlanError(f"generated row has no source slide metadata: {row_id}")
        original = metadata.get("originalSource")
        if not isinstance(original, Mapping) or not _text(original.get("sourceDigest")):
            raise PlanError(f"generated row has no archived source metadata: {row_id}")
        _validate_native_payload(data, row_id)


def build_manifest(
    snapshot: Mapping[str, Any],
    sources: Sequence[Mapping[str, Any]],
    audio_manifest: Any = None,
    expected_source_count: int | None = None,
    native_audit: Any = None,
    exercise_review: Any = None,
    listening_review: Any = None,
) -> dict[str, Any]:
    plans = build_plans(snapshot, sources, audio_manifest, native_audit, exercise_review, listening_review)
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
    parser.add_argument("--native-audit", type=Path, help="optional native PPTX audit/enrichment JSON")
    parser.add_argument("--exercise-review", type=Path, help="optional reviewed exercise semantics JSON")
    parser.add_argument(
        "--listening-review",
        type=Path,
        action="append",
        help="optional reviewed listening semantics JSON; may be supplied more than once",
    )
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
        exercise_review = load_json(args.exercise_review) if args.exercise_review else None
        listening_documents = [load_json(path) for path in (args.listening_review or [])]
        listening_review = _listening_review_documents(listening_documents)
        native_audit = None
        if args.native_audit:
            loaded_native_audit = load_json(args.native_audit)
            if isinstance(loaded_native_audit, Mapping):
                native_audit = copy.deepcopy(dict(loaded_native_audit))
                native_audit["_auditPath"] = str(args.native_audit)
            else:
                native_audit = loaded_native_audit
        manifest = build_manifest(
            snapshot,
            sources,
            audio_manifest,
            args.expected_source_count,
            native_audit,
            exercise_review,
            listening_review,
        )
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
