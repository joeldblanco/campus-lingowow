#!/usr/bin/env python3
"""Compile the source A1 module 1 pilot into a standalone course artifact.

The compiler deliberately keeps the source language content in the generated
JSON while normalising source exercise shapes to the course-builder block
types.  It does not create audio, touch the database, or change application
schemas.  Source IDs are used only in provenance references; every runtime
block and scene receives a new pilot ID.
"""

from __future__ import annotations

import argparse
import html
import hashlib
import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable


COURSE_ID = "a1-general-module1-pilot"
MODULE_ID = "a1-general-module1"
LEARNING_REVISION = "course-guided-v1"
PILOT_REVISION = "a1-module1-pilot-v1"
SCHEMA_VERSION = "a1-module1-pilot-v1"

DEFAULT_BLUEPRINT = Path("blueprint.json")
DEFAULT_MAPPING = Path("academic-mapping.md")
DEFAULT_OUTPUT = Path("docs/curriculum/a1-module1-pilot.json")

BACKGROUND_BY_LESSON = {
    "a1-general-start": "/images/lessons/backgrounds/listening-lounge.webp",
    "a1-general-u1": "/images/lessons/backgrounds/campus.webp",
    "a1-general-u2": "/images/lessons/backgrounds/community-bookshop.webp",
    "a1-general-u3": "/images/lessons/backgrounds/town-park.webp",
    "a1-general-u4": "/images/lessons/backgrounds/travel-station.webp",
    "a1-general-mission": "/images/lessons/backgrounds/botanical-office.webp",
}

LISTENING_CHECKS: dict[int, list[dict[str, Any]]] = {
    1: [
        {"prompt": "Where does Ana meet Luis?", "answer": "At the door", "options": ["At the door", "At a market", "At a station"], "feedback": "Ana meets Luis at the door of the evening class."},
        {"prompt": "What kind of class is it?", "answer": "An evening class", "options": ["An evening class", "A morning class", "A phone class"], "feedback": "The model says evening class."},
        {"prompt": "Where does Ana live?", "answer": "Lima", "options": ["Lima", "Peru", "Chile"], "feedback": "Ana says she lives in Lima."},
        {"prompt": "Who is from Chile?", "answer": "Luis", "options": ["Luis", "Ana", "Diego"], "feedback": "Luis says he is from Chile."},
        {"prompt": "What does Ana say at the end?", "answer": "See you in class", "options": ["See you in class", "See you tomorrow", "See you at the door"], "feedback": "Ana closes with See you in class."},
        {"prompt": "What name does Luis give?", "answer": "Luis", "options": ["Luis", "Ana", "Rosa"], "feedback": "Luis answers I’m Luis."},
    ],
    2: [
        {"prompt": "Where does Rosa point?", "answer": "At a photo", "options": ["At a photo", "At a phone", "At a door"], "feedback": "Rosa points to a photo at the community desk."},
        {"prompt": "Who is Diego?", "answer": "Rosa’s colleague", "options": ["Rosa’s colleague", "The manager", "The visitor"], "feedback": "Rosa calls Diego her colleague."},
        {"prompt": "Which folder is hers?", "answer": "The blue folder", "options": ["The blue folder", "The red folder", "The green folder"], "feedback": "The blue folder is hers."},
        {"prompt": "Which folder is mine?", "answer": "The red folder", "options": ["The red folder", "The blue folder", "The yellow folder"], "feedback": "Rosa says the red folder is mine."},
        {"prompt": "Who is the woman beside Diego?", "answer": "Elena", "options": ["Elena", "Rosa", "Ana"], "feedback": "Rosa identifies Elena as the manager."},
        {"prompt": "What does Rosa say about the badge?", "answer": "Yes, it is", "options": ["Yes, it is", "No, it isn’t", "It is hers"], "feedback": "Rosa confirms the badge with Yes, it is."},
    ],
    3: [
        {"prompt": "When does the conversation happen?", "answer": "After class", "options": ["After class", "Before breakfast", "At the door"], "feedback": "The model begins After class."},
        {"prompt": "What is Elena’s phone number?", "answer": "555-0142", "options": ["555-0142", "555-0412", "555-1024"], "feedback": "Elena gives 555-0142."},
        {"prompt": "What is Elena’s email?", "answer": "elena.ramos@example.org", "options": ["elena.ramos@example.org", "maria.soto@example.org", "welcome@centro.example"], "feedback": "The model gives Elena’s email."},
        {"prompt": "When is Elena free?", "answer": "Tuesday at six or Saturday morning", "options": ["Tuesday at six or Saturday morning", "Thursday at three", "Monday at eight"], "feedback": "Elena offers Tuesday at six or Saturday morning."},
        {"prompt": "Who will send a message?", "answer": "Marco", "options": ["Marco", "Elena", "Paula"], "feedback": "Marco says I’ll send a message."},
        {"prompt": "Where do they write the details?", "answer": "On a small card", "options": ["On a small card", "On the door", "In a notebook"], "feedback": "They write the details on a small card."},
    ],
    4: [
        {"prompt": "Where are Paula and Tom?", "answer": "During an orientation", "options": ["During an orientation", "After class", "At the community desk"], "feedback": "The model says During an orientation."},
        {"prompt": "When is the appointment?", "answer": "Thursday at 3:30", "options": ["Thursday at 3:30", "Friday at 4:00", "Tuesday at six"], "feedback": "Paula gives Thursday at 3:30."},
        {"prompt": "Why does Tom ask for repetition?", "answer": "He does not understand", "options": ["He does not understand", "He is late", "He needs a phone"], "feedback": "Tom says he does not understand the date."},
        {"prompt": "What does Paula repeat?", "answer": "Thursday at 3:30", "options": ["Thursday at 3:30", "Tuesday at six", "Friday at 4:00"], "feedback": "Paula repeats the day and time."},
        {"prompt": "What is the room number?", "answer": "204", "options": ["204", "240", "105"], "feedback": "Paula says The room is 204."},
        {"prompt": "What does Tom repeat to check?", "answer": "The room number", "options": ["The room number", "The phone number", "The person’s name"], "feedback": "Tom repeats the room number to check it."},
    ],
}

INTERACTIVE_TYPES = {
    "multiple_choice",
    "short_answer",
    "ordering",
    "match",
    "essay",
    "recording",
}


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(value, ensure_ascii=False)


def _unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = _as_text(value)
        if text not in seen:
            result.append(text)
            seen.add(text)
    return result


def _safe_inline_html(value: str) -> str:
    escaped = html.escape(value, quote=False)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    return escaped.replace("**", "")


def _markdown_to_safe_html(content: str) -> str:
    """Convert the compiler's small Markdown subset into safe authored HTML."""

    chunks: list[str] = []
    paragraph: list[str] = []
    list_items: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            chunks.append(f"<p>{'<br />'.join(paragraph)}</p>")
            paragraph.clear()

    def flush_list() -> None:
        if list_items:
            chunks.append(f"<ul>{''.join(f'<li>{item}</li>' for item in list_items)}</ul>")
            list_items.clear()

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            flush_list()
        elif line.startswith("- "):
            flush_paragraph()
            list_items.append(_safe_inline_html(line[2:].strip()))
        else:
            flush_list()
            paragraph.append(_safe_inline_html(line))
    flush_paragraph()
    flush_list()
    return "".join(chunks)


def _norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().strip(".,!?;:"))


def _stable_order(values: list[str], seed: str) -> list[str]:
    """Deterministically rotate/reverse choices so keys are not source-order keys."""

    if len(values) < 2:
        return values[:]
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    offset = digest[0] % len(values)
    ordered = values[offset:] + values[:offset]
    if digest[1] % 2:
        ordered.reverse()
    return ordered


def _metadata(
    scene_id: str,
    guided_title: str,
    scene: str,
    *,
    scene_side: str = "right",
    content_role: str = "teaching",
    source_refs: list[str] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "learningRevision": LEARNING_REVISION,
        "pilotRevision": PILOT_REVISION,
        "pilotSceneId": scene_id,
        "guidedTitle": guided_title,
        "scene": scene,
        "sceneSide": scene_side,
        "contentRole": content_role,
        "sourceRefs": source_refs or [],
        "instructionStyle": "compact-spanish",
        "contentMode": "meaningful-use-and-transfer",
    }
    data.update(extra)
    return data


def _block(
    block_id: str,
    block_type: str,
    order: int,
    scene_id: str,
    guided_title: str,
    scene: str,
    *,
    content_role: str = "teaching",
    source_refs: list[str] | None = None,
    **fields: Any,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "id": block_id,
        "type": block_type,
        "order": order,
        "data": _metadata(
            scene_id,
            guided_title,
            scene,
            content_role=content_role,
            source_refs=source_refs,
        ),
    }
    block.update(fields)
    return block


def _title_block(
    block_id: str,
    scene_id: str,
    title: str,
    scene: str,
    order: int = 0,
    *,
    source_refs: list[str] | None = None,
    content_role: str = "teaching",
) -> dict[str, Any]:
    return _block(
        block_id,
        "title",
        order,
        scene_id,
        title,
        scene,
        source_refs=source_refs,
        content_role=content_role,
        title=title,
    )


def _text_block(
    block_id: str,
    scene_id: str,
    title: str,
    content: str,
    scene: str,
    order: int = 1,
    *,
    source_refs: list[str] | None = None,
    content_role: str = "teaching",
    **data: Any,
) -> dict[str, Any]:
    block = _block(
        block_id,
        "text",
        order,
        scene_id,
        title,
        scene,
        source_refs=source_refs,
        content_role=content_role,
        content=_markdown_to_safe_html(content),
        format="html",
    )
    block["data"].update(data)
    return block


def _html_text_block(
    block_id: str,
    scene_id: str,
    title: str,
    content: str,
    scene: str,
    order: int = 1,
    *,
    source_refs: list[str] | None = None,
    content_role: str = "teaching",
    **data: Any,
) -> dict[str, Any]:
    """Emit compiler-generated, already escaped HTML (for transcript details)."""

    block = _block(
        block_id,
        "text",
        order,
        scene_id,
        title,
        scene,
        source_refs=source_refs,
        content_role=content_role,
        content=content,
        format="html",
    )
    block["data"].update(data)
    return block


def _structured_block(
    block_id: str,
    scene_id: str,
    title: str,
    headers: list[str],
    rows: list[list[str]],
    scene: str,
    order: int = 2,
    *,
    source_refs: list[str] | None = None,
    content_role: str = "support",
    **data: Any,
) -> dict[str, Any]:
    collapsible = bool(data.pop("collapsible", True))
    support_label = _as_text(data.pop("supportLabel", "Tabla de apoyo (abrir si la necesitas)"))
    block = _block(
        block_id,
        "structured-content",
        order,
        scene_id,
        title,
        scene,
        source_refs=source_refs,
        content_role=content_role,
        title=title,
        config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
        content={"headers": headers, "rows": rows},
    )
    block["data"].update({"supportLabel": support_label, "collapsible": collapsible, **data})
    return block


def _source_meta(key: str, source_type: str, *, feedback: str = "", hint: str = "") -> dict[str, Any]:
    return {
        "sourceItems": [{"sourceKey": key, "sourceType": source_type}],
        "sourceFeedback": feedback,
        "sourceHint": hint,
    }


def _choice_block(
    block_id: str,
    scene_id: str,
    title: str,
    prompt: str,
    options: list[str],
    answer: str,
    feedback: str,
    hint: str,
    scene: str,
    source_key: str,
    *,
    content_role: str = "practice",
    source_type: str = "choice",
    order: int = 2,
    explanation_prefix: str = "",
) -> dict[str, Any]:
    clean_options = _unique(options)
    if answer not in clean_options:
        clean_options.insert(0, answer)
    clean_options = _stable_order(clean_options, source_key)
    option_objects = [
        {"id": f"{block_id}-option-{index + 1}", "text": option}
        for index, option in enumerate(clean_options)
    ]
    answer_id = next(option["id"] for option in option_objects if option["text"] == answer)
    explanation = f"{explanation_prefix}{feedback}" if explanation_prefix else feedback
    return _block(
        block_id,
        "multiple_choice",
        order,
        scene_id,
        title,
        scene,
        content_role=content_role,
        source_refs=[source_key],
        items=[
            {
                "id": f"{block_id}-item-1",
                "question": prompt,
                "options": option_objects,
                "correctOptionId": answer_id,
                "explanation": explanation,
                "sourceKey": source_key,
                "sourceType": source_type,
            }
        ],
        explanation=explanation,
        hint=hint,
        points=1,
        **_source_meta(source_key, source_type, feedback=feedback, hint=hint),
    )


def _comprehension_block(
    block_id: str,
    scene_id: str,
    title: str,
    questions: list[dict[str, Any]],
    scene: str,
    source_prefix: str,
    answer_pool: list[str],
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    source_items: list[dict[str, str]] = []
    for index, question in enumerate(questions, start=1):
        source_key = f"{source_prefix}.comprehension.{index}"
        answer = _as_text(question.get("answer"))
        alternatives = [answer] + [value for value in answer_pool if value != answer]
        options = _stable_order(_unique(alternatives)[:3], source_key)
        option_objects = [
            {"id": f"{block_id}-q{index}-option-{option_index + 1}", "text": option}
            for option_index, option in enumerate(options)
        ]
        correct_id = next(item["id"] for item in option_objects if item["text"] == answer)
        evidence = _as_text(question.get("evidence"))
        feedback = f"Comprueba el texto: “{evidence}”."
        items.append(
            {
                "id": f"{block_id}-q{index}",
                "question": _as_text(question.get("prompt")),
                "options": option_objects,
                "correctOptionId": correct_id,
                "explanation": feedback,
                "sourceKey": source_key,
                "sourceType": "comprehension",
            }
        )
        source_items.append({"sourceKey": source_key, "sourceType": "comprehension"})
    return _block(
        block_id,
        "multiple_choice",
        2,
        scene_id,
        title,
        scene,
        content_role="comprehension",
        source_refs=[item["sourceKey"] for item in source_items],
        items=items,
        explanation="Lee la evidencia antes de elegir.",
        points=len(items),
        sourceItems=source_items,
    )


def _listening_check_block(
    block_id: str,
    scene_id: str,
    title: str,
    unit_number: int,
    scene: str,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    source_items: list[dict[str, str]] = []
    feedback_by_key: dict[str, str] = {}
    for index, question in enumerate(LISTENING_CHECKS[unit_number], start=1):
        source_key = f"module1.unit{unit_number}.listening.{index}"
        options = _stable_order(_unique([_as_text(value) for value in question["options"]]), source_key)
        option_objects = [
            {"id": f"{block_id}-q{index}-option-{option_index + 1}", "text": option}
            for option_index, option in enumerate(options)
        ]
        correct_id = next(item["id"] for item in option_objects if item["text"] == question["answer"])
        feedback = _as_text(question["feedback"])
        items.append(
            {
                "id": f"{block_id}-q{index}",
                "question": _as_text(question["prompt"]),
                "options": option_objects,
                "correctOptionId": correct_id,
                "explanation": feedback,
                "sourceKey": source_key,
                "sourceType": "listening",
            }
        )
        source_items.append({"sourceKey": source_key, "sourceType": "listening"})
        feedback_by_key[source_key] = feedback
    return _block(
        block_id,
        "multiple_choice",
        2,
        scene_id,
        title,
        scene,
        content_role="listening-check",
        source_refs=[item["sourceKey"] for item in source_items],
        items=items,
        explanation="Escucha primero y responde las preguntas nuevas.",
        points=len(items),
        sourceItems=source_items,
        sourceFeedback=feedback_by_key,
    )


def _short_answer_block(
    block_id: str,
    scene_id: str,
    title: str,
    prompt: str,
    answer: str,
    alternatives: list[str],
    feedback: str,
    hint: str,
    scene: str,
    source_key: str,
    *,
    inline_blank: bool = False,
    content_role: str = "practice",
    source_type: str = "cloze",
    order: int = 2,
) -> dict[str, Any]:
    question = prompt
    if inline_blank and "___" not in question:
        question = f"{question} ___"
    accepted = _unique([answer, *alternatives])
    data = {
        **_metadata(
            scene_id,
            title,
            scene,
            content_role=content_role,
            source_refs=[source_key],
        ),
        **_source_meta(source_key, source_type, feedback=feedback, hint=hint),
    }
    data.update(
        {
            "answerLayout": "inlineBlank" if inline_blank else "freeText",
            "feedback": feedback,
            "hint": hint,
            "doNotUseAudio": True,
        }
    )
    if source_type == "rewrite":
        data.update({"teacherReviewOnly": True, "aiGrading": False})
    return _block(
        block_id,
        "short_answer",
        order,
        scene_id,
        title,
        scene,
        content_role=content_role,
        source_refs=[source_key],
        items=[
            {
                "id": f"{block_id}-item-1",
                "question": question,
                "correctAnswer": answer,
                "acceptedAnswers": accepted,
                "sourceKey": source_key,
                "sourceType": source_type,
            }
        ],
        caseSensitive=False,
        explanation=feedback,
        hint=hint,
        points=1,
        data=data,
    )


def _order_sequence(practice: dict[str, Any]) -> list[str]:
    answer_key = practice.get("answer_key")
    if isinstance(answer_key, list):
        return [_as_text(item) for item in answer_key]
    answer = _as_text(answer_key or practice.get("answer"))
    items = [_as_text(item) for item in practice.get("items", [])]
    remaining = items[:]
    sequence: list[str] = []
    # Source order exercises are short sentences. Match source tokens while
    # preserving punctuation from the item cards.
    for token in re.findall(r"\S+", answer):
        token_norm = _norm(token)
        match_index = next(
            (index for index, item in enumerate(remaining) if _norm(item) == token_norm),
            None,
        )
        if match_index is None:
            match_index = next(
                (index for index, item in enumerate(remaining) if _norm(item).strip("'\"") == token_norm),
                None,
            )
        if match_index is None:
            raise ValueError(f"Cannot map ordering answer token {token!r} to source items {items!r}")
        sequence.append(remaining.pop(match_index))
    if remaining:
        raise ValueError(f"Ordering source leaves unused items: {remaining!r}")
    return sequence


def _ordering_block(
    block_id: str,
    scene_id: str,
    title: str,
    practice: dict[str, Any],
    scene: str,
    source_key: str,
    *,
    order: int = 2,
) -> dict[str, Any]:
    sequence = _order_sequence(practice)
    source_items = [_as_text(item) for item in practice.get("items", [])]
    positions_by_item: dict[str, list[int]] = {}
    for position, value in enumerate(sequence, start=1):
        positions_by_item.setdefault(_norm(value), []).append(position)
    items = [
        {
            "id": f"{block_id}-item-{index + 1}",
            "text": source_item,
            "correctPosition": positions_by_item[_norm(source_item)].pop(0),
        }
        for index, source_item in enumerate(source_items)
    ]
    accepted_orders = practice.get("accepted_orders") or [sequence]
    accepted_orders = [[_as_text(item) for item in value] for value in accepted_orders]
    answer = _as_text(practice.get("answer") or " ".join(sequence))
    return _block(
        block_id,
        "ordering",
        order,
        scene_id,
        title,
        scene,
        content_role="practice",
        source_refs=[source_key],
        instruction=_as_text(practice.get("prompt")),
        items=items,
        points=1,
        explanation=_as_text(practice.get("feedback")),
        hint=_as_text(practice.get("pista")),
        **_source_meta(source_key, "order", feedback=_as_text(practice.get("feedback")), hint=_as_text(practice.get("pista"))),
        data={
            **_metadata(
                scene_id,
                title,
                scene,
                content_role="practice",
                source_refs=[source_key],
                sourceItems=[{"sourceKey": source_key, "sourceType": "order"}],
                acceptedSequences=accepted_orders,
                correctSentence=answer,
            )
        },
    )


def _match_block(
    block_id: str,
    scene_id: str,
    title: str,
    practice: dict[str, Any],
    scene: str,
    source_key: str,
    *,
    order: int = 2,
) -> dict[str, Any]:
    pairs: list[dict[str, str]] = []
    answer_key = practice.get("answer_key", [])
    for index, pair in enumerate(answer_key):
        if "→" not in _as_text(pair):
            raise ValueError(f"Match source key {source_key} has no arrow pair: {pair!r}")
        left, right = [part.strip() for part in _as_text(pair).split("→", 1)]
        pairs.append({"id": f"{block_id}-pair-{index + 1}", "left": left, "right": right})
    return _block(
        block_id,
        "match",
        order,
        scene_id,
        title,
        scene,
        content_role="practice",
        source_refs=[source_key],
        title=title,
        pairs=pairs,
        points=len(pairs),
        explanation=_as_text(practice.get("feedback")),
        hint=_as_text(practice.get("pista")),
        **_source_meta(source_key, "match", feedback=_as_text(practice.get("feedback")), hint=_as_text(practice.get("pista"))),
    )


def _practice_block(
    block_id: str,
    scene_id: str,
    title: str,
    practice: dict[str, Any],
    scene: str,
    source_key: str,
) -> dict[str, Any]:
    source_type = _as_text(practice.get("type"))
    common = {
        "title": title,
        "prompt": _as_text(practice.get("prompt")),
        "feedback": _as_text(practice.get("feedback")),
        "hint": _as_text(practice.get("pista")),
    }
    if source_type == "choice":
        return _choice_block(
            block_id,
            scene_id,
            title,
            common["prompt"],
            [_as_text(value) for value in practice.get("options", [])],
            _as_text(practice.get("answer")),
            common["feedback"],
            common["hint"],
            scene,
            source_key,
        )
    if source_type == "cloze":
        return _short_answer_block(
            block_id,
            scene_id,
            title,
            common["prompt"],
            _as_text(practice.get("answer")),
            [_as_text(value) for value in practice.get("alternatives", [])],
            common["feedback"],
            common["hint"],
            scene,
            source_key,
            inline_blank=True,
        )
    if source_type == "rewrite":
        return _short_answer_block(
            block_id,
            scene_id,
            title,
            common["prompt"],
            _as_text(practice.get("answer")),
            [_as_text(value) for value in practice.get("alternatives", [])],
            common["feedback"],
            common["hint"],
            scene,
            source_key,
            source_type="rewrite",
        )
    if source_type == "order":
        return _ordering_block(block_id, scene_id, title, practice, scene, source_key)
    if source_type == "match":
        return _match_block(block_id, scene_id, title, practice, scene, source_key)
    raise ValueError(f"Unsupported source practice type {source_type!r} for {source_key}")


def _scene(
    lesson_id: str,
    scene_id: str,
    order: int,
    phase: str,
    title: str,
    instruction: str,
    blocks: list[dict[str, Any]],
    source_refs: list[str],
    *,
    route: str = "learner",
    asset: str,
    route_modes: dict[str, Any] | None = None,
    **scene_data: Any,
) -> dict[str, Any]:
    interactive_count = sum(block.get("type") in INTERACTIVE_TYPES for block in blocks)
    if interactive_count > 1:
        raise ValueError(f"Scene {scene_id} contains {interactive_count} interactive blocks")
    return {
        "id": scene_id,
        "lessonId": lesson_id,
        "order": order,
        "phase": phase,
        "title": title,
        "instruction": instruction,
        "route": route,
        "sourceRefs": source_refs,
        "interactiveCount": interactive_count,
        "runtimeBlockIds": [block["id"] for block in blocks],
        "runtimeBlocks": blocks,
        "background": asset,
        "sceneSide": "right",
        "routeModes": route_modes
        or {
            "self": "Lee el modelo, usa la tabla solo cuando la necesites y repite la tarea con datos nuevos.",
            "teacher": "Modela una ronda, comprueba el significado y cambia un dato sin exigir memorización.",
        },
        **scene_data,
    }


def _lesson(
    lesson_id: str,
    module_id: str,
    order: int,
    title: str,
    description: str,
    scenes: list[dict[str, Any]],
    *,
    source_lesson: str,
    duration_minutes: int,
    prerequisites: list[str],
    learning_outcomes: list[str],
) -> dict[str, Any]:
    blocks = [block for scene in scenes for block in scene["runtimeBlocks"]]
    return {
        "id": lesson_id,
        "moduleId": module_id,
        "order": order,
        "title": title,
        "description": description,
        "durationMinutes": duration_minutes,
        "prerequisites": prerequisites,
        "learningOutcomes": learning_outcomes,
        "sourceRef": source_lesson,
        "background": BACKGROUND_BY_LESSON[lesson_id],
        "sceneCount": len(scenes),
        "scenes": scenes,
        "blocks": blocks,
        "routePolicy": {
            "self": "La ruta autónoma ofrece modelo escrito, apoyo colapsable y auto-comprobación; la voz queda para lectura propia o docente.",
            "teacher": "La ruta docente permite lectura en voz alta, intercambio de roles y revisión humana de producción.",
        },
    }


def _activity_support_rows(activity: dict[str, Any]) -> tuple[list[str], list[list[str]]]:
    input_data = activity.get("input", {})
    if activity["id"] == "S1":
        return ["English", "Español"], [[_as_text(input_data.get("english")), _as_text(input_data.get("spanish"))]]
    if activity["id"] == "S2":
        rows = [[_as_text(letter), _as_text(name)] for letter, name in input_data.get("alphabet", [])]
        return ["Letra", "Nombre en inglés"], rows
    if activity["id"] == "S3":
        rows = [[_as_text(number), _as_text(name)] for number, name in input_data.get("number_table", [])]
        rows.extend([[_as_text(number), _as_text(name)] for number, name in input_data.get("tens_for_time_and_price", [])])
        return ["Número", "Lectura"], rows
    if activity["id"] == "S4":
        return ["English", "Español"], [[_as_text(input_data.get("english")), _as_text(input_data.get("spanish"))]]
    return ["Dato", "Valor"], [
        ["Nombre", "Ana Torres"],
        ["Origen", "Peru"],
        ["Día", "Tuesday"],
        ["Hora", "6 p.m."],
        ["Aula", "Room 204"],
    ]


def _starter_scenes(starter: dict[str, Any], asset: str) -> list[dict[str, Any]]:
    scenes: list[dict[str, Any]] = []
    scene_order = 1
    for activity in starter["activities"]:
        activity_id = _as_text(activity["id"])
        activity_key = f"starter.{activity_id}"
        teach_scene_id = f"a1m1-start-{activity_id.lower()}-teach"
        input_data = activity.get("input", {})
        model = _as_text(activity.get("model_answer") or input_data.get("english"))
        teacher_read = _as_text(input_data.get("teacher_read_script"))
        teach_text = (
            f"**Instrucción:** {activity.get('objective', '')} Lee el modelo por significado; no memorices una lista.\n\n"
            f"**Modelo original en inglés:** {model}\n\n"
            f"**Apoyo docente:** {teacher_read}\n\n"
            f"**Ruta autónoma:** {activity.get('self_check', ['Lee y comprueba el sentido.'])[0]}\n"
            f"**Ruta docente:** {activity.get('teacher_reading', 'Lee el modelo y comprueba el significado.') }"
        )
        teaching_blocks = [
            _title_block(
                f"a1m1-start-{activity_id.lower()}-teach-title",
                teach_scene_id,
                _as_text(activity.get("title")),
                asset,
                source_refs=[activity_key],
            ),
            _text_block(
                f"a1m1-start-{activity_id.lower()}-teach-text",
                teach_scene_id,
                _as_text(activity.get("title")),
                teach_text,
                asset,
                source_refs=[activity_key],
                content_role="teaching",
                originalEnglishModel=model,
                teacherReadScript=teacher_read,
            ),
        ]
        headers, rows = _activity_support_rows(activity)
        teaching_blocks.append(
            _structured_block(
                f"a1m1-start-{activity_id.lower()}-support",
                teach_scene_id,
                "Tabla de apoyo",
                headers,
                rows,
                asset,
                source_refs=[activity_key],
                content_role="support",
                collapsible=True,
                supportPurpose="Consulta significativa durante la tarea; no es una lista para memorizar.",
            )
        )
        scenes.append(
            _scene(
                "a1-general-start",
                teach_scene_id,
                scene_order,
                "starter-teach",
                _as_text(activity.get("title")),
                "Lee el modelo y usa la tabla solo para resolver la tarea.",
                teaching_blocks,
                [activity_key],
                asset=asset,
                activityId=activity_id,
                sourceObjective=_as_text(activity.get("objective")),
                inputSpanish=_as_text(input_data.get("spanish")),
            )
        )
        scene_order += 1
        for practice_index, practice in enumerate(activity.get("practice", []), start=1):
            source_key = f"{activity_key}.practice.{practice_index}"
            scene_id = f"a1m1-start-{activity_id.lower()}-check-{practice_index}"
            title = f"{activity.get('title')} · comprobación {practice_index}"
            practice_block = _practice_block(
                f"a1m1-start-{activity_id.lower()}-practice-{practice_index}",
                scene_id,
                title,
                practice,
                asset,
                source_key,
            )
            blocks = [
                _title_block(
                    f"a1m1-start-{activity_id.lower()}-check-{practice_index}-title",
                    scene_id,
                    title,
                    asset,
                    source_refs=[source_key],
                    content_role="practice",
                ),
                _text_block(
                    f"a1m1-start-{activity_id.lower()}-check-{practice_index}-instruction",
                    scene_id,
                    title,
                    f"**Instrucción:** {_as_text(practice.get('prompt'))}\n\nUsa la pista solo después de intentar la tarea.",
                    asset,
                    source_refs=[source_key],
                    content_role="practice",
                    originalEnglishModel=model,
                ),
                practice_block,
            ]
            scenes.append(
                _scene(
                    "a1-general-start",
                    scene_id,
                    scene_order,
                    "starter-practice",
                    title,
                    _as_text(practice.get("prompt")),
                    blocks,
                    [source_key],
                    asset=asset,
                    activityId=activity_id,
                    practiceIndex=practice_index,
                )
            )
            scene_order += 1
    return scenes


def _unit_teaching_blocks(unit: dict[str, Any], scene_id: str, asset: str, unit_key: str) -> list[dict[str, Any]]:
    model = _as_text(unit.get("model", {}).get("text"))
    language_rows = [[_as_text(value), "Usa esta frase para el propósito del escenario."] for value in unit.get("language", [])]
    text = (
        f"**Instrucción:** {unit.get('objective', '')} Lee el modelo para entender quién, dónde y para qué; después usa una frase con información nueva.\n\n"
        f"**Escenario:** {unit.get('scenario', '')}\n\n"
        f"**Modelo original en inglés:** {model}\n\n"
        f"**Explicación breve:** {unit.get('explanation', '')}\n\n"
        "La tabla es apoyo durante la tarea. La producción se revisa por significado y claridad, no por memorización literal."
    )
    return [
        _title_block(
            f"{unit_key}-teach-title",
            scene_id,
            _as_text(unit.get("title")),
            asset,
            source_refs=[unit_key],
        ),
        _text_block(
            f"{unit_key}-teach-text",
            scene_id,
            _as_text(unit.get("title")),
            text,
            asset,
            source_refs=[unit_key],
            content_role="teaching",
            originalEnglishModel=model,
            modelMode=_as_text(unit.get("model", {}).get("mode")),
            sourceScenario=_as_text(unit.get("scenario")),
        ),
        _structured_block(
            f"{unit_key}-language-support",
            scene_id,
            "Frases de apoyo",
            ["English", "Uso"],
            language_rows,
            asset,
            source_refs=[unit_key],
            content_role="support",
            collapsible=True,
            supportPurpose="Recupera significado y elige una frase; no exige repetir el modelo palabra por palabra.",
        ),
    ]


def _production_modes(unit: dict[str, Any]) -> dict[str, Any]:
    return {
        "self": {
            "label": "Ruta autónoma",
            "instruction": _as_text(unit.get("independent", {}).get("procedure")),
            "time": _as_text(unit.get("independent", {}).get("oral_limit", "30–60 segundos")),
            "review": _as_text(unit.get("independent", {}).get("self_check", [])),
        },
        "teacher": {
            "label": "Ruta docente",
            "instruction": _as_text(unit.get("teacher", {}).get("procedure")),
            "roles": _as_text(unit.get("teacher", {}).get("interaction_roles")),
            "review": "La docente usa la lista de comprobación y da una corrección breve de significado o forma.",
        },
    }


def _recording_block(
    block_id: str,
    scene_id: str,
    title: str,
    prompt: str,
    model: str,
    criteria: list[str],
    scene: str,
    source_refs: list[str],
    modes: dict[str, Any],
    *,
    time_limit: int = 60,
    content_role: str = "production",
    conversation_turns: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    return _block(
        block_id,
        "recording",
        2,
        scene_id,
        title,
        scene,
        content_role=content_role,
        source_refs=source_refs,
        instruction="Graba o representa la respuesta siguiendo el propósito; la revisión es humana.",
        prompt=prompt,
        timeLimit=time_limit,
        aiGrading=False,
        points=0,
        data={
            **_metadata(
                scene_id,
                title,
                scene,
                content_role=content_role,
                source_refs=source_refs,
                aiGrading=False,
                doNotAutoGrade=True,
                teacherReviewOnly=True,
                originalEnglishModel=model,
                learningModes=modes,
                reviewChecklist=criteria,
                noAudioSourceAvailable=True,
                guidedRole="conversation",
                conversationTurns=conversation_turns or [
                    {
                        "id": f"{block_id}-turn-1",
                        "question": "What information does the task require?",
                        "answerPrompt": prompt,
                    }
                ],
            )
        },
    )


def _essay_block(
    block_id: str,
    scene_id: str,
    title: str,
    prompt: str,
    model: str,
    criteria: list[str],
    scene: str,
    source_refs: list[str],
    modes: dict[str, Any],
    *,
    content_role: str = "production",
    unit1_role: str | None = None,
) -> dict[str, Any]:
    metadata = _metadata(
        scene_id,
        title,
        scene,
        content_role=content_role,
        source_refs=source_refs,
        aiGrading=False,
        doNotAutoGrade=True,
        teacherReviewOnly=True,
        originalEnglishModel=model,
        learningModes=modes,
        reviewChecklist=criteria,
    )
    if unit1_role:
        metadata["unit1Role"] = unit1_role
    return _block(
        block_id,
        "essay",
        2,
        scene_id,
        title,
        scene,
        content_role=content_role,
        source_refs=source_refs,
        prompt=prompt,
        minWords=5,
        maxWords=80,
        aiGrading=False,
        points=0,
        data=metadata,
    )


def _unit_scenes(unit: dict[str, Any], unit_number: int, lesson_id: str, asset: str) -> list[dict[str, Any]]:
    unit_key = f"module1.unit{unit_number}"
    scenes: list[dict[str, Any]] = []
    scene_order = 1
    teach_id = f"a1m1-u{unit_number}-teach"
    scenes.append(
        _scene(
            lesson_id,
            teach_id,
            scene_order,
            "unit-teach",
            _as_text(unit.get("title")),
            "Lee el escenario y el modelo original; consulta la tabla cuando te ayude.",
            _unit_teaching_blocks(unit, teach_id, asset, unit_key),
            [unit_key],
            asset=asset,
            scenario=_as_text(unit.get("scenario")),
            originalEnglishModel=_as_text(unit.get("model", {}).get("text")),
        )
    )
    scene_order += 1
    comprehension_id = f"a1m1-u{unit_number}-comprehension"
    questions = unit.get("comprehension", [])
    answers = [_as_text(value.get("answer")) for value in questions]
    comp_title = f"{unit.get('title')} · comprueba el sentido"
    comp_blocks = [
        _title_block(
            f"{comprehension_id}-title",
            comprehension_id,
            comp_title,
            asset,
            source_refs=[f"{unit_key}.comprehension.{index + 1}" for index in range(len(questions))],
            content_role="comprehension",
        ),
        _text_block(
            f"{comprehension_id}-instruction",
            comprehension_id,
            comp_title,
            "**Instrucción:** Lee el modelo y elige la evidencia que responde cada pregunta.",
            asset,
            source_refs=[f"{unit_key}.comprehension.{index + 1}" for index in range(len(questions))],
            content_role="comprehension",
        ),
        _comprehension_block(
            f"{comprehension_id}-items",
            comprehension_id,
            comp_title,
            questions,
            asset,
            unit_key,
            answers,
        ),
    ]
    scenes.append(
        _scene(
            lesson_id,
            comprehension_id,
            scene_order,
            "comprehension",
            comp_title,
            "Lee el modelo y comprueba el sentido.",
            comp_blocks,
            [f"{unit_key}.comprehension.{index + 1}" for index in range(len(questions))],
            asset=asset,
        )
    )
    scene_order += 1
    for practice_index, practice in enumerate(unit.get("practice", []), start=1):
        source_key = f"{unit_key}.practice.{practice_index}"
        scene_id = f"a1m1-u{unit_number}-practice-{practice_index}"
        title = f"{unit.get('title')} · práctica {practice_index}"
        practice_block = _practice_block(
            f"a1m1-u{unit_number}-practice-block-{practice_index}",
            scene_id,
            title,
            practice,
            asset,
            source_key,
        )
        blocks = [
            _title_block(
                f"{scene_id}-title",
                scene_id,
                title,
                asset,
                source_refs=[source_key],
                content_role="practice",
            ),
            _text_block(
                f"{scene_id}-instruction",
                scene_id,
                title,
                f"**Instrucción:** {_as_text(practice.get('prompt'))}\n\nPrimero intenta comunicar el dato; usa la pista después.",
                asset,
                source_refs=[source_key],
                content_role="practice",
                originalEnglishModel=_as_text(unit.get("model", {}).get("text")),
            ),
            practice_block,
        ]
        scenes.append(
            _scene(
                lesson_id,
                scene_id,
                scene_order,
                "practice",
                title,
                _as_text(practice.get("prompt")),
                blocks,
                [source_key],
                asset=asset,
                practiceType=_as_text(practice.get("type")),
            )
        )
        scene_order += 1
    transfer = unit.get("transfer", {})
    modes = _production_modes(unit)
    transfer_key = f"{unit_key}.transfer"
    transfer_model = _as_text(transfer.get("model_answer"))
    transfer_criteria = [_as_text(value) for value in transfer.get("criteria", [])] + [
        "Incluye el dato nuevo sin inventar datos de la tarjeta.",
        "Pide apoyo o repetición si falta un dato.",
    ]
    conversation_turns = {
        1: [
            {"id": f"a1m1-u{unit_number}-turn-1", "question": "What is your name and where are you from?", "answerPrompt": "Introduce yourself and give the new city and class time."},
            {"id": f"a1m1-u{unit_number}-turn-2", "question": "When does the class start?", "answerPrompt": "Confirm the time from the transfer card."},
        ],
        2: [
            {"id": f"a1m1-u{unit_number}-turn-1", "question": "Who is the person and what is the object?", "answerPrompt": "Identify the colleague, manager, folder, and badge from the transfer card."},
            {"id": f"a1m1-u{unit_number}-turn-2", "question": "Whose badge is it?", "answerPrompt": "Check the badge number and ownership."},
        ],
        3: [
            {"id": f"a1m1-u{unit_number}-turn-1", "question": "What contact and time can you share?", "answerPrompt": "Give the new phone, email, and availability."},
            {"id": f"a1m1-u{unit_number}-turn-2", "question": "Does the proposed time work?", "answerPrompt": "Confirm or repair the appointment time."},
        ],
        4: [
            {"id": f"a1m1-u{unit_number}-turn-1", "question": "What information needs repeating?", "answerPrompt": "Ask for repetition and confirm the new day and time."},
            {"id": f"a1m1-u{unit_number}-turn-2", "question": "Which room should you check?", "answerPrompt": "Repeat the room number to verify it."},
        ],
    }[unit_number]
    transfer_scene_id = f"a1m1-u{unit_number}-transfer-speak"
    transfer_prompt = (
        f"{_as_text(transfer.get('prompt'))}\n\n"
        f"**Dato nuevo:** {_as_text(transfer.get('new_information'))}\n"
        "Usa el propósito del escenario y una expresión que puedas adaptar."
    )
    transfer_blocks = [
        _title_block(
            f"{transfer_scene_id}-title",
            transfer_scene_id,
            f"{unit.get('title')} · transferencia oral",
            asset,
            source_refs=[transfer_key],
            content_role="production",
        ),
        _text_block(
            f"{transfer_scene_id}-prompt",
            transfer_scene_id,
            f"{unit.get('title')} · transferencia oral",
            transfer_prompt,
            asset,
            source_refs=[transfer_key],
            content_role="production",
            originalEnglishModel=transfer_model,
            transferCard={
                "kind": "new-information",
                "source": _as_text(transfer.get("new_information")),
                "modelAnswer": transfer_model,
            },
        ),
        _recording_block(
            f"{transfer_scene_id}-recording",
            transfer_scene_id,
            f"{unit.get('title')} · transferencia oral",
            transfer_prompt,
            transfer_model,
            transfer_criteria,
            asset,
            [transfer_key],
            modes,
            time_limit=60,
            conversation_turns=conversation_turns,
        ),
    ]
    scenes.append(
        _scene(
            lesson_id,
            transfer_scene_id,
            scene_order,
            "transfer-speaking",
            f"{unit.get('title')} · transferencia oral",
            "Usa la tarjeta nueva y responde con tus palabras.",
            transfer_blocks,
            [transfer_key],
            asset=asset,
            route_modes=modes,
            transferCard=_as_text(transfer.get("new_information")),
        )
    )
    scene_order += 1
    review_scene_id = f"a1m1-u{unit_number}-transfer-review"
    review_prompt = (
        "Escribe 2–4 frases en inglés para resolver la tarjeta de transferencia. "
        "Incluye el dato nuevo y una comprobación o reparación breve."
    )
    review_blocks = [
        _title_block(
            f"{review_scene_id}-title",
            review_scene_id,
            f"{unit.get('title')} · revisión escrita",
            asset,
            source_refs=[transfer_key],
            content_role="production",
        ),
        _text_block(
            f"{review_scene_id}-prompt",
            review_scene_id,
            f"{unit.get('title')} · revisión escrita",
            f"**Instrucción:** {review_prompt}\n\n**Modelo original:** {transfer_model}\n\nLa docente revisa significado, datos y una forma útil; no hay calificación automática.",
            asset,
            source_refs=[transfer_key],
            content_role="production",
            originalEnglishModel=transfer_model,
        ),
        _essay_block(
            f"{review_scene_id}-essay",
            review_scene_id,
            f"{unit.get('title')} · revisión escrita",
            review_prompt,
            transfer_model,
            transfer_criteria,
            asset,
            [transfer_key],
            modes,
            unit1_role="profile" if unit_number == 1 else None,
        ),
    ]
    scenes.append(
        _scene(
            lesson_id,
            review_scene_id,
            scene_order,
            "transfer-writing",
            f"{unit.get('title')} · revisión escrita",
            "Escribe una respuesta breve; la revisión es humana.",
            review_blocks,
            [transfer_key],
            asset=asset,
            route_modes=modes,
            teacherReviewOnly=True,
        )
    )
    return scenes


def _mission_scenes(mission: dict[str, Any], blueprint_case: dict[str, Any], asset: str) -> list[dict[str, Any]]:
    source_key = "module1.mission"
    scenes: list[dict[str, Any]] = []
    common_rows = [
        ["Tarjeta", _as_text(mission.get("materials", [""])[0])],
        ["Etiquetas", _as_text(mission.get("materials", ["", ""])[1])],
        ["Agenda", _as_text(mission.get("materials", ["", "", ""])[2])],
    ]
    briefing_id = "a1m1-mission-briefing"
    briefing_blocks = [
        _title_block(
            f"{briefing_id}-title",
            briefing_id,
            "Misión: recepción de un centro de formación",
            asset,
            source_refs=[source_key],
        ),
        _text_block(
            f"{briefing_id}-instructions",
            briefing_id,
            "Misión: recepción de un centro de formación",
            f"**Escenario:** {mission.get('scenario', '')}\n\n**Instrucción:** {mission.get('instructions', '')}\n\n**Roles:** {mission.get('roles', '')}\n\n**Entrega:** {mission.get('deliverable', '')}\n\n**Reparación:** {mission.get('recovery', '')}\n\nLas tarjetas de rol se muestran solo al iniciar la misión cuando el runtime tenga visor de roles. En el runtime actual se deja visible la hoja común y se marca la información privada como apoyo docente; no se afirma un modo oculto que la aplicación todavía no soporta.",
            asset,
            source_refs=[source_key],
            originalEnglishModel="Welcome. I’m Ana. What’s your name?",
            roleCardRevealMode="role-card-only",
            roleCardRuntimeStatus="metadata-only-until-role-card-viewer-exists",
        ),
        _structured_block(
            f"{briefing_id}-common-sheet",
            briefing_id,
            "Hoja común de la misión",
            ["Material", "Dato"],
            common_rows,
            asset,
            source_refs=[source_key],
            content_role="support",
            collapsible=True,
            supportPurpose="Consulta los datos necesarios; no memorices la tarjeta.",
        ),
        _block(
            f"{briefing_id}-role-notes",
            "teacher_notes",
            3,
            briefing_id,
            "Tarjetas de rol para la docente",
            asset,
            content_role="teacher-support",
            source_refs=[source_key],
            title="Tarjetas de rol para la docente",
            content=(
                "**Modo previsto:** role-card-only / reveal-on-start.\n\n"
                "**Recepcionista:** recibe a Ana Torres; puede ver la etiqueta de recepción y la agenda.\n\n"
                "**Persona nueva:** necesita localizar la sala 204, confirmar 18:00 y pedir repetición si no oye.\n\n"
                "**Cambio de roles:** entrega las mismas tarjetas al cambiar. Mantén los datos comunes y revela solo la tarjeta del rol cuando el visor exista."
            ),
            highlightColor="blue",
            roleCardReveal={
                "mode": "role-card-only",
                "reveal": "mission-start",
                "runtimeSupport": "planned-no-runtime-claim",
                "default": "teacher-led role card; common sheet remains learner-visible",
            },
        ),
    ]
    scenes.append(
        _scene(
            "a1-general-mission",
            briefing_id,
            1,
            "mission-briefing",
            "Misión: recepción de un centro de formación",
            "Lee la hoja común y recibe tu tarjeta de rol.",
            briefing_blocks,
            [source_key],
            asset=asset,
            roleCardRevealMode="role-card-only",
            roleCardRuntimeStatus="metadata-only-until-role-card-viewer-exists",
        )
    )

    model_id = "a1m1-mission-model"
    model_text = "Welcome. I’m Ana. What’s your name? Nice to meet you. The class is on Tuesday at six in room 204."
    model_blocks = [
        _title_block(f"{model_id}-title", model_id, "Misión · modelo breve", asset, source_refs=[source_key]),
        _text_block(
            f"{model_id}-text",
            model_id,
            "Misión · modelo breve",
            f"**Modelo original en inglés:** {model_text}\n\n**Observa:** saludo, nombre, objeto, contacto y hora. Cambia los datos de la hoja; no repitas el diálogo como recitación.\n\n**Ruta docente:** lee una vez y cambia un dato. **Ruta autónoma:** tapa una frase y reconstruye el propósito con la hoja.",
            asset,
            source_refs=[source_key],
            originalEnglishModel=model_text,
        ),
        _structured_block(
            f"{model_id}-language",
            model_id,
            "Frases de misión",
            ["Propósito", "English model"],
            [
                ["Saludar", "Welcome. / Hi, I’m …"],
                ["Preguntar nombre", "What’s your name?"],
                ["Confirmar hora", "The class is on Tuesday at six."],
                ["Pedir repetición", "Sorry, could you repeat that, please?"],
            ],
            asset,
            source_refs=[source_key],
            content_role="support",
            collapsible=True,
        ),
    ]
    scenes.append(
        _scene(
            "a1-general-mission",
            model_id,
            2,
            "mission-model",
            "Misión · modelo breve",
            "Usa el modelo para entender el propósito y cambia los datos.",
            model_blocks,
            [source_key],
            asset=asset,
        )
    )

    criteria = [_as_text(value) for value in mission.get("criteria", [])] + [
        "Pide repetición o aclaración si falta un dato.",
        "Confirma día, hora y sala con los datos de la tarjeta.",
        "Completa la tarjeta sin inventar contacto u horario.",
    ]
    modes = {
        "self": {
            "label": "Ruta autónoma",
            "instruction": "Lee la hoja común, elige un rol y graba una ronda de 60–90 segundos; repite con el rol cambiado.",
            "review": "Marca cada criterio y anota un dato que debas comprobar.",
        },
        "teacher": {
            "label": "Ruta docente",
            "instruction": "Entrega una tarjeta de rol, observa la interacción y cambia los roles después de una ronda.",
            "review": "Usa la lista de comprobación y pide una reparación de significado.",
        },
    }
    speak_id = "a1m1-mission-speak"
    speak_prompt = f"{mission.get('instructions', '')} Representa el diálogo durante 60–90 segundos."
    speak_blocks = [
        _title_block(f"{speak_id}-title", speak_id, "Misión · diálogo", asset, source_refs=[source_key], content_role="production"),
        _text_block(
            f"{speak_id}-prompt",
            speak_id,
            "Misión · diálogo",
            f"**Instrucción:** {speak_prompt}\n\n**Modelo original:** {model_text}\n\nCambia nombre, contacto, día, hora u objeto con la hoja común. La revisión es humana; el runtime no debe enviar esta respuesta a una calificación automática.",
            asset,
            source_refs=[source_key],
            content_role="production",
            originalEnglishModel=model_text,
        ),
        _recording_block(
            f"{speak_id}-recording",
            speak_id,
            "Misión · diálogo",
            speak_prompt,
            model_text,
            criteria,
            asset,
            [source_key],
            modes,
            time_limit=90,
            conversation_turns=[
                {
                    "id": "a1m1-mission-turn-1",
                    "question": "What is your name and why are you here?",
                    "answerPrompt": "Greet the person and introduce yourself using the role card.",
                },
                {
                    "id": "a1m1-mission-turn-2",
                    "question": "What contact, day, time, and room should you confirm?",
                    "answerPrompt": "Exchange the card data and ask for repetition if a detail is missing.",
                },
            ],
        ),
    ]
    scenes.append(
        _scene(
            "a1-general-mission",
            speak_id,
            3,
            "mission-speaking",
            "Misión · diálogo",
            "Representa los dos roles y cambia los roles.",
            speak_blocks,
            [source_key],
            asset=asset,
            route_modes=modes,
            reviewChecklist=criteria,
        )
    )

    write_id = "a1m1-mission-card"
    write_prompt = "Completa una tarjeta en inglés con nombre, contacto, día, hora y sala; añade una frase para pedir repetición."
    write_blocks = [
        _title_block(f"{write_id}-title", write_id, "Misión · tarjeta", asset, source_refs=[source_key], content_role="production"),
        _text_block(
            f"{write_id}-prompt",
            write_id,
            "Misión · tarjeta",
            f"**Instrucción:** {write_prompt}\n\n**Modelo original:** Name: Ana Torres. Contact: 555-0142. Tuesday at six, room 204.\n\nComprueba que los datos coinciden con la hoja; no hay calificación automática.",
            asset,
            source_refs=[source_key],
            content_role="production",
            originalEnglishModel="Name: Ana Torres. Contact: 555-0142. Tuesday at six, room 204.",
        ),
        _essay_block(
            f"{write_id}-essay",
            write_id,
            "Misión · tarjeta",
            write_prompt,
            "Name: Ana Torres. Contact: 555-0142. Tuesday at six, room 204.",
            criteria,
            asset,
            [source_key],
            modes,
        ),
    ]
    scenes.append(
        _scene(
            "a1-general-mission",
            write_id,
            4,
            "mission-writing",
            "Misión · tarjeta",
            "Escribe los datos y revísalos con la lista.",
            write_blocks,
            [source_key],
            asset=asset,
            route_modes=modes,
            reviewChecklist=criteria,
        )
    )

    mediation = blueprint_case or {}
    mediation_id = "a1m1-mission-mediation"
    mediation_prompt = "Lee la ficha y redacta una respuesta breve en español para la persona nueva: día, hora, sala, qué llevar y a quién preguntar. Indica qué dato no aparece."
    mediation_model = "The class is on Tuesday at six in Room 4. Bring a notebook. If you need help, ask Marta at reception. The card does not mention parking."
    mediation_rows = [["Ficha original", "Evening English class: Tuesday at 18:00, Room 4. Bring a notebook. Ask Marta at reception if you need help."]]
    mediation_key = "blueprint.mediation.M01"
    mediation_blocks = [
        _title_block(f"{mediation_id}-title", mediation_id, "Misión · mediación", asset, source_refs=[mediation_key], content_role="mediation"),
        _text_block(
            f"{mediation_id}-prompt",
            mediation_id,
            "Misión · mediación",
            f"**Instrucción:** {mediation_prompt}\n\n**Modelo original de control:** {mediation_model}\n\nLa evidencia de mediación se revisa por transferencia de información; no se exige traducción palabra por palabra.",
            asset,
            source_refs=[mediation_key],
            content_role="mediation",
            originalEnglishModel=mediation_model,
            blueprintCase=deepcopy(mediation),
        ),
        _structured_block(
            f"{mediation_id}-source",
            mediation_id,
            "Ficha de control",
            ["Fuente", "Contenido"],
            mediation_rows,
            asset,
            source_refs=[mediation_key],
            content_role="support",
            collapsible=True,
        ),
        _essay_block(
            f"{mediation_id}-essay",
            mediation_id,
            "Misión · mediación",
            mediation_prompt,
            mediation_model,
            [
                "Incluye Tuesday, 18:00, Room 4 y notebook.",
                "Indica que se puede preguntar a Marta en recepción.",
                "Declara que parking no aparece en la ficha.",
            ],
            asset,
            [mediation_key],
            modes,
            content_role="mediation",
        ),
    ]
    scenes.append(
        _scene(
            "a1-general-mission",
            mediation_id,
            5,
            "mission-mediation",
            "Misión · mediación",
            "Transfiere los datos importantes y declara la ausencia de información.",
            mediation_blocks,
            [mediation_key],
            asset=asset,
            route_modes=modes,
            reviewChecklist=[
                "Tuesday, 18:00 y Room 4",
                "notebook y Marta en recepción",
                "parking no aparece",
            ],
        )
    )
    return scenes


def _find_blueprint_case(blueprint: dict[str, Any]) -> dict[str, Any]:
    mediation = blueprint.get("mediation_a1_a2", {})
    cases = mediation.get("cases", []) if isinstance(mediation, dict) else []
    if isinstance(cases, list):
        for case in cases:
            if isinstance(case, dict) and (case.get("id") == "M01" or case.get("module") == "M01"):
                return deepcopy(case)
    if isinstance(cases, dict):
        case = cases.get("M01")
        if isinstance(case, dict):
            return deepcopy(case)
    return {}


def _source_counts(starter: dict[str, Any], units: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "starterPractice": sum(len(activity.get("practice", [])) for activity in starter.get("activities", [])),
        "unitComprehension": sum(len(unit.get("comprehension", [])) for unit in units),
        "unitPractice": sum(len(unit.get("practice", [])) for unit in units),
    }


def _build_full_course(early_path: Path, blueprint_path: Path, mapping_path: Path) -> dict[str, Any]:
    early = _read_json(early_path)
    blueprint = _read_json(blueprint_path)
    module = next((item for item in early.get("modules", []) if str(item.get("id")) == "1"), None)
    if not isinstance(module, dict):
        raise ValueError("early.json does not contain numeric module 1")
    units = module.get("units", [])[:4]
    if len(units) != 4:
        raise ValueError("module 1 must contain four units")
    starter = early.get("starter")
    if not isinstance(starter, dict) or len(starter.get("activities", [])) != 5:
        raise ValueError("starter must contain S1–S5")
    for unit in units:
        if len(unit.get("comprehension", [])) != 3 or len(unit.get("practice", [])) != 5:
            raise ValueError(f"unit {unit.get('id')} does not have 3 comprehension and 5 practice items")

    start_scenes = _starter_scenes(starter, BACKGROUND_BY_LESSON["a1-general-start"])
    lessons: list[dict[str, Any]] = [
        _lesson(
            "a1-general-start",
            MODULE_ID,
            0,
            _as_text(starter.get("title")),
            _as_text(starter.get("purpose")),
            start_scenes,
            source_lesson="starter.S1–S5",
            duration_minutes=35,
            prerequisites=[_as_text(starter.get("assumption"))],
            learning_outcomes=[
                "Reconoce y usa saludos, nombre, letras y números con apoyo.",
                "Lee modelos breves y transfiere datos a una tarjeta.",
            ],
        )
    ]
    lesson_ids = ["a1-general-u1", "a1-general-u2", "a1-general-u3", "a1-general-u4"]
    for index, (unit, lesson_id) in enumerate(zip(units, lesson_ids), start=1):
        scenes = _unit_scenes(unit, index, lesson_id, BACKGROUND_BY_LESSON[lesson_id])
        lessons.append(
            _lesson(
                lesson_id,
                MODULE_ID,
                index,
                _as_text(unit.get("title")),
                _as_text(unit.get("objective")),
                scenes,
                source_lesson=f"module1.unit{index}",
                duration_minutes=45,
                prerequisites=[_as_text(item) for item in unit.get("prerequisites", [])],
                learning_outcomes=[_as_text(unit.get("objective")), "Transfiere información nueva en una tarea adulta."],
            )
        )
    mission = module.get("mission", {})
    mission_scenes = _mission_scenes(mission, _find_blueprint_case(blueprint), BACKGROUND_BY_LESSON["a1-general-mission"])
    lessons.append(
        _lesson(
            "a1-general-mission",
            MODULE_ID,
            5,
            "Misión: recepción de un centro de formación",
            _as_text(mission.get("scenario")),
            mission_scenes,
            source_lesson="module1.mission",
            duration_minutes=30,
            prerequisites=["Completa starter y U1–U4; consulta las tablas cuando falte un dato."],
            learning_outcomes=[
                "Saluda, presenta personas y objetos y confirma contacto y horario.",
                "Pide repetición y transfiere datos a una conversación y una tarjeta.",
            ],
        )
    )

    counts = _source_counts(starter, units)
    source_files = {
        "early": {"label": "programa-completo-c2/early.json", "sha256": _sha256(early_path)},
        "blueprint": {"label": "programa-completo-c2/blueprint.json", "sha256": _sha256(blueprint_path)},
        "academicMapping": {"label": "a1-module1-pilot/academic-mapping.md", "sha256": _sha256(mapping_path)},
    }
    planned_scripts = [
        {
            "lessonId": "a1-general-start",
            "scriptId": f"a1-general-start-{activity_id.lower()}-reference",
            "plannedPath": f"/audio/a1-module1-pilot/starter-{activity_id.lower()}-reference.mp3",
            "sourceRef": f"starter.{activity_id}.input.teacher_read_script",
            "status": "pending_authorization",
        }
        for activity_id in ["S1", "S2", "S3", "S4", "S5"]
    ] + [
        {
            "lessonId": f"a1-general-u{unit_number}",
            "scriptId": f"a1-general-u{unit_number}-model",
            "plannedPath": f"/audio/a1-module1-pilot/u{unit_number}-model.mp3",
            "sourceRef": f"module1.unit{unit_number}.model.text",
            "status": "pending_authorization",
        }
        for unit_number in range(1, 5)
    ]
    listening_plan = [
        {
            "lessonId": f"a1-general-u{unit_number}",
            "sceneId": f"a1m1-u{unit_number}-listening",
            "audioPath": f"/audio/a1-module1-pilot/u{unit_number}-model.mp3",
            "status": "planned_pending_file_verification",
            "visibleLabelWhenReady": "Audio de práctica con voz sintética",
            "transcriptSourceRef": f"module1.unit{unit_number}.model.text",
            "transcriptDisclosure": "after-listen-check",
            "transcriptSupportLabel": "Ver transcripción",
            "detailsHiddenUntilCheck": True,
            "followUpQuestionCount": 6,
            "answerPolicy": "Ask six new fact questions after the clip; do not reveal the model transcript before the listening check.",
            "readingMode": "Keep the reading model in a separate scene; listening must test new questions rather than repeat the comprehension answers.",
        }
        for unit_number in range(1, 5)
    ]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "standalone-pilot-course",
        "course": {
            "id": COURSE_ID,
            "title": "Inglés general A1 · Módulo 1 piloto",
            "description": "Curso piloto para adultos hispanohablantes desde cero: primer contacto, ayuda y transferencia a una recepción.",
            "language": "English",
            "supportLanguage": "Spanish",
            "level": "A1",
            "status": "pilot",
            "visibility": "public-original-content",
            "deploymentTarget": "DEV",
            "isPublished": False,
            "sourcePolicy": "Original teaching content; source models retained as reading scripts.",
        },
        "module": {
            "id": MODULE_ID,
            "courseId": COURSE_ID,
            "order": 1,
            "title": _as_text(module.get("title")),
            "level": _as_text(module.get("level")),
            "description": "Primer contacto y ayuda; ruta adulta desde cero con transferencia comunicativa.",
            "objectives": [
                "Reconocer y usar saludos, nombre, origen, objetos, contactos y horarios.",
                "Pedir repetición y confirmar información concreta.",
                "Transferir datos a una conversación y una tarjeta sin memorizar diálogos.",
            ],
            "lessons": lessons,
        },
        "lessons": lessons,
        "sourceAudit": {
            "sourceFiles": source_files,
            "selectedSourceModule": "numeric module 1",
            "selectedStarter": "starter.S1–S5",
            "counts": counts,
            "requiredUnitKeys": {
                "comprehension": 12,
                "practice": 20,
            },
            "normalizations": [
                "Source choice maps to multiple_choice with unique deterministic option keys.",
                "Source cloze maps to short_answer with answerLayout inlineBlank and question blank ___ preserved.",
                "Source order maps to ordering with 1-based positions and actual correctSentence.",
                "Source rewrite maps to short_answer with teacherReviewOnly and no automatic grading.",
                "Source match arrows map to structured pairs.",
                "Authored Markdown-like instructions are escaped and emitted as HTML paragraphs/strong/list markup.",
            ],
            "ambiguousSourceFieldsCorrected": [
                "answer and answer_key are normalised by source type.",
                "Source model text is preserved as original reading model; no generated listening is implied.",
                "Blueprint M01 mediation evidence is included as a separate human-reviewed mission scene.",
            ],
        },
        "audioManifest": {
            "status": "pending_authorization",
            "currentState": "scripts_written_no_listening_recorded",
            "preserveExistingAudio": True,
            "noAudioBlocksGenerated": True,
            "plannedScripts": planned_scripts,
            "listeningPlan": listening_plan,
            "syntheticAudioLabel": "Audio de práctica con voz sintética",
            "policy": "Do not create fake players or audio URLs; teacher may read original scripts until approved resources exist. Integrate a real audio block only after the planned file is verified.",
        },
        "runtimeMappingGuidance": {
            "learningRevision": LEARNING_REVISION,
            "pilotRevision": PILOT_REVISION,
            "oneInteractiveBlockPerScene": True,
            "interactiveTypes": sorted(INTERACTIVE_TYPES),
            "teacherNotesRoute": "teacher-only",
            "roleCardReveal": "Use role-card-only only when a real viewer can reveal one role; default is teacher-led common-sheet mode.",
            "productionReview": "Recording and essay blocks set aiGrading false and require human checklist review.",
        },
        "visualAcceptanceManifest": {
            "approvedReferences": [
                "docs/design/graphic-guide-v1/auto-choice-reference.png",
                "docs/design/graphic-guide-v1/auto-fill-reference.png",
                "docs/design/graphic-guide-v1/writing-instruction-reference.png",
                "docs/design/content-format-mockups/v3/",
            ],
            "compositionContract": {
                "environment": "Use the complete painted lesson environment; do not replace it with abstract cards or gradients.",
                "text": "Keep the readable text area opaque and roughly half the desktop frame; preserve legibility on mobile.",
                "characterAndScene": "Keep the illustrated environment visible with the detail side indicated by sceneSide.",
                "controls": "Use cobalt primary action, white outlined secondary actions, 44px minimum controls, and a truly round microphone control for recording.",
                "autoCheck": "Option and fill checks use the current compact Spanish auto-check treatment; source mockup labels do not override the pilot instruction.",
            },
            "lessonSceneMapping": {
                lesson["id"]: {
                    "background": lesson["background"],
                    "sceneSide": "right",
                    "learningRevision": LEARNING_REVISION,
                    "sceneCount": lesson["sceneCount"],
                }
                for lesson in lessons
            },
        },
        "acceptance": {
            "fixedIds": {
                "course": COURSE_ID,
                "module": MODULE_ID,
                "lessons": [lesson["id"] for lesson in lessons],
            },
            "unitComprehensionItems": 12,
            "unitPracticeItems": 20,
            "starterActivities": ["S1", "S2", "S3", "S4", "S5"],
            "allInteractiveScenesHaveOneBlock": True,
            "allProductionNoAiGrading": True,
            "audioPending": True,
        },
    }


def _primary_course(full: dict[str, Any]) -> dict[str, Any]:
    """Return the exact seed payload; provenance lives in the sidecar."""

    source_course = full["course"]
    source_module = full["module"]
    objectives = source_module.get("objectives", [])
    if isinstance(objectives, list):
        objectives = " ".join(_as_text(item) for item in objectives)
    primary_lessons = []
    for lesson in full["lessons"]:
        primary_lessons.append(
            {
                "id": lesson["id"],
                "title": lesson["title"],
                "description": lesson["description"],
                "order": lesson["order"],
                "blocks": lesson["blocks"],
            }
        )
    return {
        "course": {
            "id": source_course["id"],
            "title": source_course["title"],
            "description": source_course["description"],
            "language": source_course["language"],
            "level": source_course["level"],
        },
        "module": {
            "id": source_module["id"],
            "title": source_module["title"],
            "description": source_module["description"],
            "level": source_module["level"],
            "objectives": objectives,
        },
        "lessons": primary_lessons,
    }


def _scene_summaries(full: dict[str, Any]) -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    for lesson in full["lessons"]:
        for scene in lesson.get("scenes", []):
            summary: dict[str, Any] = {
                "id": scene["id"],
                "lessonId": lesson["id"],
                "order": scene["order"],
                "phase": scene["phase"],
                "title": scene["title"],
                "instruction": scene["instruction"],
                "route": scene["route"],
                "sourceRefs": scene["sourceRefs"],
                "interactiveCount": scene["interactiveCount"],
                "runtimeBlockIds": scene["runtimeBlockIds"],
                "background": scene["background"],
                "sceneSide": scene["sceneSide"],
            }
            # Keep scene-level planning fields while excluding full model/card
            # payloads that already live in the primary blocks.
            for key in (
                "activityId",
                "practiceIndex",
                "practiceType",
                "roleCardRevealMode",
                "roleCardRuntimeStatus",
                "reviewChecklist",
                "listeningCheckSceneId",
                "transcriptDisclosure",
                "transcriptSupportLabel",
            ):
                if key in scene:
                    summary[key] = deepcopy(scene[key])
            summaries.append(summary)
    return summaries


def _source_inventory(full: dict[str, Any]) -> list[dict[str, Any]]:
    inventory: dict[str, dict[str, Any]] = {}
    for lesson in full["lessons"]:
        for block in lesson["blocks"]:
            refs = list(block.get("sourceItems", [])) + list(block.get("data", {}).get("sourceItems", []))
            refs += [{"sourceKey": item.get("sourceKey"), "sourceType": item.get("sourceType")} for item in block.get("items", [])]
            refs += [{"sourceKey": value, "sourceType": "scene-reference"} for value in block.get("data", {}).get("sourceRefs", [])]
            for ref in refs:
                key = ref.get("sourceKey")
                if not key:
                    continue
                record = inventory.setdefault(
                    key,
                    {
                        "sourceKey": key,
                        "sourceTypes": [],
                        "blockTypes": [],
                        "feedbackAvailable": False,
                        "hintAvailable": False,
                    },
                )
                source_type = ref.get("sourceType")
                if source_type and source_type not in record["sourceTypes"]:
                    record["sourceTypes"].append(source_type)
                if block["type"] not in record["blockTypes"]:
                    record["blockTypes"].append(block["type"])
                record["feedbackAvailable"] = record["feedbackAvailable"] or bool(
                    block.get("sourceFeedback") or block.get("data", {}).get("sourceFeedback") or block.get("explanation")
                )
                record["hintAvailable"] = record["hintAvailable"] or bool(block.get("hint") or block.get("data", {}).get("sourceHint"))
    return [inventory[key] for key in sorted(inventory)]


def _manifest_from_full(full: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "standalone-pilot-course-manifest",
        "courseId": full["course"]["id"],
        "moduleId": full["module"]["id"],
        "lessonSummaries": [
            {
                "id": lesson["id"],
                "order": lesson["order"],
                "sourceRef": lesson["sourceRef"],
                "durationMinutes": lesson["durationMinutes"],
                "prerequisites": lesson["prerequisites"],
                "learningOutcomes": lesson["learningOutcomes"],
                "sceneCount": lesson["sceneCount"],
                "background": lesson["background"],
            }
            for lesson in full["lessons"]
        ],
        "sceneSummaries": _scene_summaries(full),
        "sourceAudit": full["sourceAudit"],
        "sourceInventory": _source_inventory(full),
        "audioManifest": full["audioManifest"],
        "runtimeMappingGuidance": full["runtimeMappingGuidance"],
        "visualAcceptanceManifest": full["visualAcceptanceManifest"],
        "acceptance": full["acceptance"],
    }


def _audio_entries(path: Path) -> list[dict[str, Any]]:
    payload = _read_json(path)
    if isinstance(payload, list):
        entries = payload
    elif isinstance(payload, dict):
        entries = payload.get("audio") or payload.get("entries") or payload.get("files")
    else:
        entries = None
    if not isinstance(entries, list) or not entries:
        raise ValueError("--audio-manifest must contain a non-empty audio/entries/files array")
    if not all(isinstance(entry, dict) for entry in entries):
        raise ValueError("--audio-manifest entries must be objects")
    return entries


def _verified_file_path(value: Any) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Verified audio requires a filePath/path")
    raw = Path(value)
    candidates = [raw, Path.cwd() / raw, Path(__file__).resolve().parents[2] / raw]
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise ValueError(f"Verified audio file does not exist: {value}")


def _audio_url(entry: dict[str, Any], file_path: Path) -> str:
    value = entry.get("url")
    if isinstance(value, str) and value.startswith("/audio/") and "pending" not in value.lower():
        return value
    public_root = (Path(__file__).resolve().parents[2] / "public").resolve()
    try:
        relative = file_path.relative_to(public_root)
    except ValueError as exc:
        raise ValueError("Verified audio outside public/ requires an explicit /audio/... url") from exc
    url = "/" + relative.as_posix()
    if not url.startswith("/audio/"):
        raise ValueError("Verified audio url must be under /audio/")
    return url


def _integrate_verified_audio(full: dict[str, Any], manifest_path: Path) -> None:
    entries = _audio_entries(manifest_path)
    lessons = {lesson["id"]: lesson for lesson in full["lessons"]}
    seen_ids = {
        block["id"]
        for lesson in full["lessons"]
        for block in lesson["blocks"]
    }
    verified_files: list[dict[str, Any]] = []
    for entry in entries:
        lesson_id = _as_text(entry.get("lessonId"))
        lesson = lessons.get(lesson_id)
        if lesson is None:
            raise ValueError(f"Audio manifest references unknown lesson {lesson_id!r}")
        unit_match = re.fullmatch(r"a1-general-u([1-4])", lesson_id)
        if unit_match is None:
            raise ValueError(
                "Verified listening audio must target one of the four unit lessons; "
                f"got {lesson_id!r}"
            )
        unit_number = int(unit_match.group(1))
        file_path = _verified_file_path(entry.get("filePath", entry.get("path")))
        url = _audio_url(entry, file_path)
        teach_scene = next((item for item in lesson["scenes"] if item["phase"] == "unit-teach"), None)
        if teach_scene is None:
            raise ValueError(f"Audio manifest has no target scene for {lesson_id!r}")
        listening_scene_id = _as_text(entry.get("sceneId")) or f"a1m1-u{unit_number}-listening"
        if any(scene["id"] == listening_scene_id for scene in lesson["scenes"]):
            raise ValueError(f"Duplicate verified listening scene id {listening_scene_id!r}")
        check_scene_id = f"{listening_scene_id}-check"
        if any(scene["id"] == check_scene_id for scene in lesson["scenes"]):
            raise ValueError(f"Duplicate verified listening check scene id {check_scene_id!r}")
        block_id = _as_text(entry.get("blockId")) or f"{lesson_id}-verified-audio"
        title_block_id = f"{listening_scene_id}-title"
        transcript_block_id = f"{listening_scene_id}-transcript"
        check_title_id = f"{check_scene_id}-title"
        check_instruction_id = f"{check_scene_id}-instruction"
        check_block_id = f"{check_scene_id}-items"
        generated_ids = [block_id, title_block_id, transcript_block_id, check_title_id, check_instruction_id, check_block_id]
        duplicates = [candidate for candidate in generated_ids if candidate in seen_ids]
        if len(set(generated_ids)) != len(generated_ids) or duplicates:
            raise ValueError(f"Duplicate verified listening block id(s): {duplicates or generated_ids!r}")
        seen_ids.update(generated_ids)
        title = _as_text(entry.get("label")) or "Audio de práctica con voz sintética"
        source_ref = _as_text(entry.get("sourceRef")) or f"{lesson.get('sourceRef')}.model.text"
        transcript = _as_text(teach_scene.get("originalEnglishModel"))
        if not transcript:
            transcript = next(
                (
                    _as_text(block.get("data", {}).get("originalEnglishModel"))
                    for block in teach_scene.get("runtimeBlocks", [])
                    if block.get("data", {}).get("originalEnglishModel")
                ),
            )
        if not transcript:
            raise ValueError(f"Verified listening audio has no source transcript for {lesson_id!r}")
        listening_title = f"{lesson['title']} · escucha"
        transcript_html = _markdown_to_safe_html(transcript)
        listening_content = (
            "<p><strong>Instrucción:</strong> Escucha una vez y responde las seis preguntas nuevas.</p>"
            "<p>Después de comprobar tus respuestas, abre la transcripción.</p>"
            '<details><summary>Ver transcripción</summary>'
            f"{transcript_html}"
            "</details>"
        )
        listening_text = _html_text_block(
            transcript_block_id,
            listening_scene_id,
            listening_title,
            listening_content,
            teach_scene["background"],
            order=1,
            source_refs=[source_ref],
            content_role="listening",
            transcriptDisclosure="after-listen-check",
            transcriptSupportLabel="Ver transcripción",
        )
        audio_block = _block(
            block_id,
            "audio",
            2,
            listening_scene_id,
            title,
            teach_scene["background"],
            content_role="listening",
            source_refs=[source_ref],
            url=url,
            title=title,
            data={
                **_metadata(
                    listening_scene_id,
                    title,
                    teach_scene["background"],
                    content_role="listening",
                    source_refs=[source_ref],
                    audioVerified=True,
                    audioLabel=title,
                    transcriptDisclosure="after-listen-check",
                    supportLabel="Ver transcripción",
                )
            },
        )
        listening_scene = _scene(
            lesson_id,
            listening_scene_id,
            teach_scene["order"] + 1,
            "listening-audio",
            listening_title,
            "Escucha el audio; comprueba seis datos nuevos y abre la transcripción después.",
            [
                _title_block(
                    title_block_id,
                    listening_scene_id,
                    listening_title,
                    teach_scene["background"],
                    source_refs=[source_ref],
                    content_role="listening",
                ),
                listening_text,
                audio_block,
            ],
            [source_ref],
            asset=teach_scene["background"],
            route_modes=deepcopy(teach_scene.get("routeModes")),
            transcriptDisclosure="after-listen-check",
            transcriptSupportLabel="Ver transcripción",
            listeningCheckSceneId=check_scene_id,
        )
        check_title = f"{lesson['title']} · comprueba lo que escuchaste"
        check_source_refs = [f"module1.unit{unit_number}.listening.{index}" for index in range(1, 7)]
        listening_check_scene = _scene(
            lesson_id,
            check_scene_id,
            teach_scene["order"] + 2,
            "listening-check",
            check_title,
            "Responde las seis preguntas nuevas antes de abrir la transcripción.",
            [
                _title_block(
                    check_title_id,
                    check_scene_id,
                    check_title,
                    teach_scene["background"],
                    source_refs=check_source_refs,
                    content_role="listening-check",
                ),
                _text_block(
                    check_instruction_id,
                    check_scene_id,
                    check_title,
                    "**Instrucción:** Responde seis preguntas nuevas sobre el audio antes de ver la transcripción.",
                    teach_scene["background"],
                    source_refs=check_source_refs,
                    content_role="listening-check",
                ),
                _listening_check_block(
                    check_block_id,
                    check_scene_id,
                    check_title,
                    unit_number,
                    teach_scene["background"],
                ),
            ],
            check_source_refs,
            asset=teach_scene["background"],
            route_modes=deepcopy(teach_scene.get("routeModes")),
            transcriptDisclosure="after-listen-check",
            transcriptSupportLabel="Ver transcripción",
        )
        insertion_index = next(
            (index + 1 for index, scene in enumerate(lesson["scenes"]) if scene["id"] == teach_scene["id"]),
            len(lesson["scenes"]),
        )
        lesson["scenes"][insertion_index:insertion_index] = [listening_scene, listening_check_scene]
        for index, scene in enumerate(lesson["scenes"], start=1):
            scene["order"] = index
        lesson["sceneCount"] = len(lesson["scenes"])
        lesson["blocks"] = [block for scene in lesson["scenes"] for block in scene["runtimeBlocks"]]
        verified_files.append(
            {
                "lessonId": lesson_id,
                "sceneId": listening_scene_id,
                "checkSceneId": check_scene_id,
                "url": url,
                "sourceRef": source_ref,
            }
        )
        for plan in full["audioManifest"].get("listeningPlan", []):
            if plan.get("lessonId") == lesson_id and plan.get("sceneId") == listening_scene_id:
                plan.update(
                    {
                        "status": "verified_audio_integrated",
                        "audioPath": url,
                        "checkSceneId": check_scene_id,
                    }
                )
    full["audioManifest"].update(
        {
            "status": "verified_audio_integrated",
            "currentState": "verified_audio_blocks_inserted",
            "noAudioBlocksGenerated": False,
            "verifiedManifest": manifest_path.as_posix(),
            "verifiedFiles": verified_files,
        }
    )


def build_artifacts(
    early_path: Path,
    blueprint_path: Path,
    mapping_path: Path,
    audio_manifest_path: Path | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    full = _build_full_course(early_path, blueprint_path, mapping_path)
    if audio_manifest_path is not None:
        _integrate_verified_audio(full, audio_manifest_path)
    return _primary_course(full), _manifest_from_full(full)


def build_course(
    early_path: Path,
    blueprint_path: Path,
    mapping_path: Path,
    audio_manifest_path: Path | None = None,
) -> dict[str, Any]:
    return build_artifacts(early_path, blueprint_path, mapping_path, audio_manifest_path)[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        "--early",
        dest="source",
        type=Path,
        required=True,
        help="Path to the private original early.json source.",
    )
    parser.add_argument("--blueprint", type=Path, default=DEFAULT_BLUEPRINT)
    parser.add_argument("--mapping", type=Path, default=DEFAULT_MAPPING)
    parser.add_argument("--out", "--output", dest="output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--manifest-out",
        type=Path,
        default=None,
        help="Sidecar manifest path; defaults beside --out with -manifest suffix.",
    )
    parser.add_argument(
        "--audio-manifest",
        type=Path,
        default=None,
        help="Optional verified audio manifest. Every file must exist before audio blocks are inserted.",
    )
    args = parser.parse_args()
    course, manifest = build_artifacts(args.source, args.blueprint, args.mapping, args.audio_manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = args.manifest_out or args.output.with_name(f"{args.output.stem}-manifest.json")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output} ({len(json.dumps(course, ensure_ascii=False))} chars)")
    print(f"wrote {manifest_path} ({len(json.dumps(manifest, ensure_ascii=False))} chars)")


if __name__ == "__main__":
    main()
