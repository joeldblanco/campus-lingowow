"""Teaching revision pass for the A1 module 1 pilot.

The compiler owns the source normalisation and the verified audio integration.
This module is deliberately a small, dependency-free pass that runs after
those steps and before the primary course and manifest are projected.  It
keeps the original runtime blocks in place, then adds compact teaching aids
that make the next demand explicit for an autonomous adult learner:

``model -> meaning -> pronunciation -> functional grammar -> substitution ->
transfer``.

The mapping is stored on the affected scene and in ``full['sourceAudit']`` so
the generated sidecar documents which teaching item prepares which existing
demand.  No audio file is created here; ``unit_audio_specs`` is the hand-off
for the renderer/clip generator.
"""

from __future__ import annotations

from copy import deepcopy
from html import escape
from typing import Any, Iterable


TEACHING_REVISION = "a1-teaching-v2"
_LESSON_PREFIX = "a1-general-u"
_UNIT_NUMBERS = (1, 2, 3, 4)
_AUDIO_BASE = "/audio/a1-module1-pilot/"
_INTERACTIVE_TYPES = {
    "multiple_choice",
    "short_answer",
    "ordering",
    "match",
    "essay",
    "recording",
    "fill_blanks",
    "true_false",
    "multi_select",
    "drag_drop",
}


# Synthetic clips are intentionally short chunks that support the following
# demand.  The clip generator owned by the parent task uses the returned text
# and keeps the verified unit-model MP3s untouched.
_AUDIO_SPECS: dict[int, tuple[dict[str, str], ...]] = {
    1: (
        {
            "filename": "teach-u1-greeting-v2.mp3",
            "text": "Hi, I'm Ana.",
            "sourceRef": "module1.unit1.teaching.pronunciation.1",
        },
        {
            "filename": "teach-u1-name-question-v2.mp3",
            "text": "What's your name?",
            "sourceRef": "module1.unit1.teaching.pronunciation.2",
        },
        {
            "filename": "teach-u1-origin-v2.mp3",
            "text": "I'm from Peru.",
            "sourceRef": "module1.unit1.teaching.pronunciation.3",
        },
        {
            "filename": "teach-u1-city-v2.mp3",
            "text": "I live in Lima.",
            "sourceRef": "module1.unit1.teaching.pronunciation.4",
        },
    ),
    2: (
        {
            "filename": "teach-u2-introduce-colleague-v2.mp3",
            "text": "This is my colleague.",
            "sourceRef": "module1.unit2.teaching.pronunciation.1",
        },
        {
            "filename": "teach-u2-who-question-v2.mp3",
            "text": "Who is she?",
            "sourceRef": "module1.unit2.teaching.pronunciation.2",
        },
        {
            "filename": "teach-u2-hers-v2.mp3",
            "text": "The blue folder is hers.",
            "sourceRef": "module1.unit2.teaching.pronunciation.3",
        },
        {
            "filename": "teach-u2-badge-v2.mp3",
            "text": "Is this your badge?",
            "sourceRef": "module1.unit2.teaching.pronunciation.4",
        },
    ),
    3: (
        {
            "filename": "teach-u3-phone-v2.mp3",
            "text": "My phone number is five five five, zero one four two.",
            "sourceRef": "module1.unit3.teaching.pronunciation.1",
        },
        {
            "filename": "teach-u3-email-v2.mp3",
            "text": "My email is elena dot ramos at example dot org.",
            "sourceRef": "module1.unit3.teaching.pronunciation.2",
        },
        {
            "filename": "teach-u3-availability-v2.mp3",
            "text": "When are you free?",
            "sourceRef": "module1.unit3.teaching.pronunciation.3",
        },
        {
            "filename": "teach-u3-confirm-time-v2.mp3",
            "text": "I'm free on Tuesday at six. That works for me.",
            "sourceRef": "module1.unit3.teaching.pronunciation.4",
        },
    ),
    4: (
        {
            "filename": "teach-u4-repeat-v2.mp3",
            "text": "Could you repeat that, please?",
            "sourceRef": "module1.unit4.teaching.pronunciation.1",
        },
        {
            "filename": "teach-u4-understand-v2.mp3",
            "text": "I don't understand.",
            "sourceRef": "module1.unit4.teaching.pronunciation.2",
        },
        {
            "filename": "teach-u4-clarify-v2.mp3",
            "text": "Do you mean this Thursday?",
            "sourceRef": "module1.unit4.teaching.pronunciation.3",
        },
        {
            "filename": "teach-u4-room-v2.mp3",
            "text": "The room is two oh four.",
            "sourceRef": "module1.unit4.teaching.pronunciation.4",
        },
    ),
}


# The visible language support is intentionally short.  The full original
# model remains in the existing block's data for provenance, while this copy
# gives a learner a useful first move and a meaningful change to make.
_PLANS: dict[int, dict[str, Any]] = {
    1: {
        "sceneInstruction": "Mira un diálogo breve, escucha una frase y cambia un dato.",
        "model": (
            ("A", "Hi, I'm Ana. What's your name?"),
            ("B", "I'm Luis. Nice to meet you."),
            ("A", "I'm from Peru. I live in Lima."),
        ),
        "meaning": "Saluda, di tu nombre y añade origen o ciudad para presentarte.",
        "change": "Cambia solo el nombre, el país o la ciudad; conserva la estructura.",
        "languageRows": [
            ["Hi, I'm Ana.", "Hola, soy Ana."],
            ["What's your name?", "¿Cómo te llamas?"],
            ["Nice to meet you.", "Encantado/a de conocerte."],
            ["I'm from Peru.", "Soy de Perú."],
            ["I live in Lima.", "Vivo en Lima."],
            ["See you in class.", "Nos vemos en clase."],
        ],
        "grammarRows": [
            ["I'm + nombre", "Presenta tu nombre.", "I'm Ana."],
            ["I'm from + lugar", "Dice tu origen.", "I'm from Peru."],
            ["I live in + ciudad", "Dice dónde vives.", "I live in Lima."],
        ],
        "substitutionRows": [
            ["Base", "Cambia solo", "Di"],
            ["Ana / Peru / Lima", "tu nombre", "Hi, I'm Marta."],
            ["Ana / Peru / Lima", "tu país", "I'm from Ecuador."],
            ["Ana / Peru / Lima", "tu ciudad", "I live in Quito."],
        ],
        "transferRows": [
            ["Tarjeta A: Marta · Ecuador · Quito", "Hi, I'm Marta. I'm from Ecuador. I live in Quito.", "nombre · origen · ciudad"],
            ["Tarjeta B: Omar · Chile · Arica", "What's your name? I'm Omar. I'm from Chile.", "pregunta + respuesta"],
        ],
        "forms": ["I'm + nombre", "I'm from + lugar", "I live in + ciudad"],
    },
    2: {
        "sceneInstruction": "Mira quién o qué es, escucha una frase y cambia un referente.",
        "model": (
            ("A", "This is my colleague Diego."),
            ("B", "Who is she?"),
            ("A", "That is our manager. The blue folder is hers."),
            ("B", "Is this your badge?"),
        ),
        "meaning": "Señala personas u objetos y confirma de quién son.",
        "change": "Cambia la persona, el objeto o la relación; no cambies toda la frase.",
        "languageRows": [
            ["This is my colleague.", "Este es mi compañero."],
            ["Who is she?", "¿Quién es ella?"],
            ["That is our manager.", "Esa es nuestra encargada."],
            ["The blue folder is hers.", "La carpeta azul es suya."],
            ["The red folder is mine.", "La carpeta roja es mía."],
            ["Is this your badge?", "¿Esta es tu credencial?"],
            ["Yes, it is.", "Sí, lo es."],
        ],
        "grammarRows": [
            ["This is / That is + nombre", "Identifica persona u objeto.", "This is my colleague."],
            ["my / your + objeto", "Dice la relación.", "Is this your badge?"],
            ["hers / mine", "Sustituye el nombre del dueño.", "The folder is hers / mine."],
        ],
        "substitutionRows": [
            ["Base", "Cambia solo", "Di"],
            ["colleague Diego", "nombre", "This is my colleague Rosa."],
            ["blue folder / hers", "objeto", "The red folder is hers."],
            ["your badge", "respuesta", "Yes, it is. The badge is mine."],
        ],
        "transferRows": [
            ["Tarjeta A: Rosa · colleague · green folder hers", "This is my colleague Rosa. The green folder is hers.", "persona + pertenencia"],
            ["Tarjeta B: badge · mine", "Is this your badge? Yes, it is. The badge is mine.", "pregunta + respuesta"],
        ],
        "forms": ["This is / That is", "Who is...?", "my / your", "hers / mine", "Is this...?"],
    },
    3: {
        "sceneInstruction": "Lee un contacto breve, escucha los chunks y concreta un horario.",
        "model": (
            ("A", "My phone number is 555-0142."),
            ("B", "My email is elena dot ramos at example dot org."),
            ("A", "When are you free?"),
            ("B", "I'm free on Tuesday at six. That works for me."),
        ),
        "meaning": "Comparte un contacto, pregunta disponibilidad y acepta una hora.",
        "change": "Cambia el dato de contacto y después el día o la hora; usa on + día y at + hora.",
        "languageRows": [
            ["My phone number is...", "Mi teléfono es..."],
            ["My email is...", "Mi correo es..."],
            ["When are you free?", "¿Cuándo estás disponible?"],
            ["I'm free on Tuesday at six.", "Estoy disponible el martes a las seis."],
            ["That works for me.", "Me va bien."],
        ],
        "grammarRows": [
            ["My phone/email is + dato", "Comparte contacto.", "My phone number is 555-0142."],
            ["When are you free?", "Pregunta disponibilidad.", "When are you free?"],
            ["on + día / at + hora", "Fija la cita.", "on Tuesday at six"],
        ],
        "substitutionRows": [
            ["Base", "Cambia solo", "Di"],
            ["555-0142", "tus dígitos", "My phone number is 555-0188."],
            ["elena dot ramos...", "tu correo", "My email is marta dot cruz at example dot org."],
            ["Tuesday at six", "día y hora", "I'm free on Thursday at four."],
        ],
        "transferRows": [
            ["Tarjeta A: 555-0188 · marta.cruz@example.org", "My phone number is 555-0188. My email is marta dot cruz at example dot org.", "contacto"],
            ["Tarjeta B: Thursday at four", "I'm free on Thursday at four. That works for me.", "on + at + aceptación"],
        ],
        "forms": ["My phone number is...", "My email is...", "When are you free?", "on + día", "at + hora", "That works for me."],
    },
    4: {
        "sceneInstruction": "Escucha una reparación, aclara el dato y confirma la versión correcta.",
        "model": (
            ("A", "The appointment is on Thursday."),
            ("B", "I don't understand. Could you repeat that, please?"),
            ("A", "Do you mean this Thursday?"),
            ("B", "Yes, this Thursday. The room is two oh four."),
        ),
        "meaning": "Pide ayuda cuando falta un dato, aclara y confirma sin inventar.",
        "change": "Cambia solo el día o la sala; conserva la secuencia de reparación.",
        "languageRows": [
            ["I don't understand.", "No entiendo."],
            ["Could you repeat that, please?", "Perdón, ¿puedes repetirlo, por favor?"],
            ["Do you mean this Thursday?", "¿Te refieres a este jueves?"],
            ["Yes, this Thursday.", "Sí, este jueves."],
            ["The room is 204.", "La sala es la 204."],
        ],
        "grammarRows": [
            ["I don't understand.", "Declara la dificultad.", "I don't understand."],
            ["Could you + verbo...?", "Pide repetición con cortesía.", "Could you repeat that, please?"],
            ["Do you mean...? / Yes, ...", "Aclara y confirma.", "Do you mean this Thursday?"],
        ],
        "substitutionRows": [
            ["Base", "Cambia solo", "Di"],
            ["Thursday", "día", "Do you mean this Friday?"],
            ["repeat that", "acción", "Could you repeat that, please?"],
            ["room 204", "sala", "The room is two oh six."],
        ],
        "transferRows": [
            ["Tarjeta A: Friday · room 206", "Could you repeat that? Do you mean this Friday? The room is two oh six.", "reparación + sala"],
            ["Tarjeta B: Thursday · confirm", "Do you mean this Thursday? Yes, this Thursday.", "aclarar + confirmar"],
        ],
        "forms": ["I don't understand.", "Could you repeat...?", "Do you mean...?", "Yes, ...", "The room is..."],
    },
}


def unit_audio_specs() -> list[dict[str, str]]:
    """Return the synthetic pronunciation clip hand-off for U1–U4.

    The returned objects are copies so a renderer cannot mutate the module's
    source data.  There are four clips per unit, safely below the eight-clip
    limit, and every filename is namespaced as a teaching v2 asset.
    """

    return [deepcopy(spec) for unit in _UNIT_NUMBERS for spec in _AUDIO_SPECS[unit]]


def _unit_number(lesson: dict[str, Any]) -> int | None:
    lesson_id = str(lesson.get("id", ""))
    prefix = _LESSON_PREFIX
    if not lesson_id.startswith(prefix):
        return None
    suffix = lesson_id[len(prefix) :]
    return int(suffix) if suffix in {str(value) for value in _UNIT_NUMBERS} else None


def _as_text(value: Any) -> str:
    return value if isinstance(value, str) else str(value or "")


def _unique(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _html_text(value: str) -> str:
    return escape(value, quote=False)


def _scene_blocks(scene: dict[str, Any]) -> list[dict[str, Any]]:
    blocks = scene.get("runtimeBlocks")
    if not isinstance(blocks, list):
        blocks = []
        scene["runtimeBlocks"] = blocks
    return [block for block in blocks if isinstance(block, dict)]


def _find_scene(lesson: dict[str, Any], predicate: Any) -> dict[str, Any] | None:
    for scene in lesson.get("scenes", []):
        if isinstance(scene, dict) and predicate(scene):
            return scene
    return None


def _source_mapping(unit_number: int, lesson: dict[str, Any], forms: list[str]) -> list[dict[str, Any]]:
    demand_phases = {
        "comprehension",
        "practice",
        # The runtime compiler uses the longer phase names; the public pilot
        # fixtures and older callers use the shorter aliases.
        "transfer-speak",
        "transfer-review",
        "transfer-speaking",
        "transfer-writing",
    }
    demand_scenes = [
        scene
        for scene in lesson.get("scenes", [])
        if isinstance(scene, dict) and scene.get("phase") in demand_phases
    ]
    scene_ids = [_as_text(scene.get("id")) for scene in demand_scenes]
    block_ids = [
        _as_text(block.get("id"))
        for scene in demand_scenes
        for block in _scene_blocks(scene)
        if _as_text(block.get("id")) and not _as_text(block.get("id")).startswith(f"a1teach-u{unit_number}-")
    ]
    return [
        {
            "sourceRef": f"module1.unit{unit_number}.teaching.v2",
            "forms": list(forms),
            "demandSceneIds": scene_ids,
            "demandBlockIds": block_ids,
            "sequence": ["model", "meaning", "pronunciation", "functional-grammar", "guided-substitution", "transfer"],
        }
    ]


def _base_metadata(
    scene: dict[str, Any],
    title: str,
    content_role: str,
    source_refs: list[str],
    mapping: list[dict[str, Any]],
    presentation: str,
) -> dict[str, Any]:
    existing = next((block for block in _scene_blocks(scene) if isinstance(block.get("data"), dict)), {})
    existing_data = existing.get("data", {})
    metadata = {
        "learningRevision": existing_data.get("learningRevision", "course-guided-v1"),
        "pilotRevision": existing_data.get("pilotRevision", "a1-module1-pilot-v1"),
        "pilotSceneId": _as_text(scene.get("id")),
        "guidedTitle": title,
        "scene": _as_text(scene.get("background")),
        "sceneSide": _as_text(scene.get("sceneSide")) or "right",
        "contentRole": content_role,
        "sourceRefs": _unique([*_as_list(existing_data.get("sourceRefs")), *source_refs]),
        "instructionStyle": "compact-spanish",
        "contentMode": "meaningful-use-and-transfer",
        "teachingRevision": TEACHING_REVISION,
        "teachingPresentation": presentation,
        "sourceTeachingToDemand": deepcopy(mapping),
    }
    return metadata


def _as_list(value: Any) -> list[str]:
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def _compact_model_html(plan: dict[str, Any]) -> str:
    dialogue = "<br />".join(
        f"<strong>{_html_text(speaker)}:</strong> {_html_text(line)}" for speaker, line in plan["model"]
    )
    return (
        "<p><strong>Consigna:</strong> Lee, escucha y cambia un dato.</p>"
        f"<p><strong>Modelo:</strong> {dialogue}</p>"
        f"<p><strong>Sentido:</strong> {_html_text(plan['meaning'])}</p>"
        f"<p><strong>Cambia:</strong> {_html_text(plan['change'])}</p>"
    )


def _new_text_block(
    block_id: str,
    scene: dict[str, Any],
    title: str,
    content: str,
    mapping: list[dict[str, Any]],
    presentation: str,
    content_role: str = "teaching",
) -> dict[str, Any]:
    return {
        "id": block_id,
        "type": "text",
        "order": 0,
        "data": _base_metadata(scene, title, content_role, [mapping[0]["sourceRef"]], mapping, presentation),
        "content": content,
        "format": "html",
    }


def _new_table_block(
    block_id: str,
    scene: dict[str, Any],
    title: str,
    headers: list[str],
    rows: list[list[str]],
    mapping: list[dict[str, Any]],
    presentation: str,
    *,
    content_role: str = "teaching",
    collapsible: bool = False,
    support_label: str | None = None,
    purpose: str | None = None,
) -> dict[str, Any]:
    data = _base_metadata(scene, title, content_role, [mapping[0]["sourceRef"]], mapping, presentation)
    data["collapsible"] = collapsible
    if support_label:
        data["supportLabel"] = support_label
    if purpose:
        data["supportPurpose"] = purpose
    return {
        "id": block_id,
        "type": "structured-content",
        "order": 0,
        "data": data,
        "title": title,
        "config": {"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
        "content": {"headers": headers, "rows": deepcopy(rows)},
    }


def _new_pronunciation_block(
    unit_number: int,
    scene: dict[str, Any],
    mapping: list[dict[str, Any]],
) -> dict[str, Any]:
    specs = _AUDIO_SPECS[unit_number]
    title = "Escucha, segmenta y repite"
    items = [
        {
            "id": f"a1teach-u{unit_number}-pronunciation-v2-item-{index}",
            "term": spec["text"],
            "definition": f"{_pronunciation_meaning(unit_number, spec['text'])} Escucha el chunk y repítelo.",
            "audioUrl": f"{_AUDIO_BASE}{spec['filename']}",
        }
        for index, spec in enumerate(specs, start=1)
    ]
    data = _base_metadata(
        scene,
        title,
        "teaching",
        [spec["sourceRef"] for spec in specs],
        mapping,
        "pronunciation",
    )
    data.update(
        {
            "audioSource": "synthetic-teaching-v2",
            "pronunciationRoutine": ["escucha", "separa", "repite", "cambia un dato"],
            "visibleMeaning": "La voz acompaña la frase; la producción sigue siendo una tarea comunicativa.",
        }
    )
    return {
        "id": f"a1teach-u{unit_number}-pronunciation-v2",
        "type": "vocabulary",
        "order": 0,
        "data": data,
        "title": title,
        "items": items,
    }


def _pronunciation_meaning(unit_number: int, text: str) -> str:
    """Return the practical Spanish meaning for a spoken chunk."""

    lowered = text.lower().rstrip(".")
    if unit_number == 3 and "works for me" in lowered:
        return "Estoy disponible ese día y esa hora; me va bien."
    if unit_number == 4 and "two oh four" in lowered:
        return "La sala es la 204; los dígitos se dicen en voz alta."
    for english, spanish in _PLANS[unit_number]["languageRows"]:
        candidate = english.lower().rstrip(".")
        if lowered == candidate or lowered.startswith(candidate) or candidate.startswith(lowered):
            return spanish
    return "Usa esta frase para comunicar el dato de la situación."


def _append_block(scene: dict[str, Any], block: dict[str, Any]) -> None:
    blocks = _scene_blocks(scene)
    if any(existing.get("id") == block.get("id") for existing in blocks):
        return
    orders = [item.get("order") for item in blocks if isinstance(item.get("order"), int)]
    block["order"] = max(orders, default=-1) + 1
    blocks.append(block)
    scene["runtimeBlocks"] = blocks


def _merge_support_rows(block: dict[str, Any], rows: list[list[str]], mapping: list[dict[str, Any]]) -> None:
    content = block.setdefault("content", {})
    if not isinstance(content, dict):
        content = {"headers": ["English", "Español / uso"], "rows": []}
        block["content"] = content
    headers = content.get("headers")
    if not isinstance(headers, list) or not headers:
        content["headers"] = ["English", "Español / uso"]
    current = content.get("rows")
    if not isinstance(current, list):
        current = []
        content["rows"] = current
    def row_key(row: list[Any]) -> tuple[str, ...]:
        return tuple(
            " ".join(_as_text(cell).replace("’", "'").split()).casefold() for cell in row
        )

    seen = {row_key(row) for row in current if isinstance(row, list)}
    for row in rows:
        marker = row_key(row)
        if marker not in seen:
            current.append(list(row))
            seen.add(marker)
    data = block.setdefault("data", {})
    data.update(
        {
            "teachingRevision": TEACHING_REVISION,
            "teachingPresentation": "meaning-support",
            "sourceTeachingToDemand": deepcopy(mapping),
            "collapsible": True,
            "supportLabel": data.get("supportLabel") or "Abrir significados",
            "supportPurpose": "Consulta una frase, comprueba el sentido y vuelve a producirla con un dato nuevo.",
        }
    )


def _update_original_teaching_text(
    scene: dict[str, Any], plan: dict[str, Any], mapping: list[dict[str, Any]]
) -> None:
    block = next(
        (item for item in _scene_blocks(scene) if item.get("id") == f"{scene.get('id')}-text"),
        None,
    )
    if block is None:
        return
    # Preserve the original model in data.originalEnglishModel.  Only the
    # learner-facing copy is shortened and made actionable.
    block["content"] = _compact_model_html(plan)
    block["format"] = "html"
    data = block.setdefault("data", {})
    data.update(
        {
            "teachingRevision": TEACHING_REVISION,
            "teachingPresentation": "dialogue-model",
            "sourceTeachingToDemand": deepcopy(mapping),
            "modelMode": "brief dialogue with meaning and one controlled change",
            "learningModeGuidance": {
                "self": "Escucha un chunk, consulta el sentido y cambia un dato.",
                "teacher": "Modela una ronda, comprueba significado y cambia un dato.",
            },
        }
    )


def _transfer_scene(lesson: dict[str, Any]) -> dict[str, Any] | None:
    return _find_scene(
        lesson,
        lambda scene: scene.get("phase") in {"transfer-speak", "transfer-speaking"},
    )


def _revise_unit(lesson: dict[str, Any], unit_number: int) -> dict[str, Any]:
    plan = _PLANS[unit_number]
    teach_scene = _find_scene(lesson, lambda scene: scene.get("phase") == "unit-teach")
    if teach_scene is None:
        raise ValueError(f"Lesson {lesson.get('id')!r} has no unit-teach scene")
    mapping = _source_mapping(unit_number, lesson, plan["forms"])
    teach_scene["instruction"] = plan["sceneInstruction"]
    teach_scene["teachingRevision"] = TEACHING_REVISION
    teach_scene["teachingSequence"] = list(mapping[0]["sequence"])
    teach_scene["sourceTeachingToDemand"] = deepcopy(mapping)

    _update_original_teaching_text(teach_scene, plan, mapping)
    support = next(
        (
            block
            for block in _scene_blocks(teach_scene)
            if block.get("id") == f"{teach_scene.get('id')}-language-support"
        ),
        None,
    )
    if support is not None:
        _merge_support_rows(support, plan["languageRows"], mapping)

    _append_block(
        teach_scene,
        _new_pronunciation_block(unit_number, teach_scene, mapping),
    )
    _append_block(
        teach_scene,
        _new_table_block(
            f"a1teach-u{unit_number}-grammar-v2",
            teach_scene,
            "Gramática para actuar",
            ["Patrón", "Para qué sirve", "Ejemplo"],
            plan["grammarRows"],
            mapping,
            "functional-grammar",
            purpose="Consulta el patrón y úsalo para comunicar el dato de la tarjeta.",
        ),
    )
    _append_block(
        teach_scene,
        _new_table_block(
            f"a1teach-u{unit_number}-substitution-v2",
            teach_scene,
            "Sustitución guiada",
            ["Base", "Cambia solo", "Di"],
            plan["substitutionRows"][1:],
            mapping,
            "guided-substitution",
            purpose="Haz una modificación cada vez; después usa una tarjeta nueva.",
        ),
    )

    transfer_scene = _transfer_scene(lesson)
    if transfer_scene is not None:
        transfer_mapping = deepcopy(mapping)
        transfer_mapping[0]["sequence"] = ["guided-substitution", "transfer"]
        card = _new_table_block(
            f"a1teach-u{unit_number}-transfer-cards-v2",
            transfer_scene,
            "Tarjetas nuevas para producir",
            ["Tarjeta", "Frase que produces", "Comprueba"],
            plan["transferRows"],
            transfer_mapping,
            "transfer-cards",
            content_role="production-support",
            purpose="Usa una tarjeta nueva junto al micrófono; comunica el dato y comprueba su sentido.",
        )
        card["data"]["pairedProductionBlockId"] = next(
            (
                _as_text(block.get("id"))
                for block in _scene_blocks(transfer_scene)
                if block.get("type") == "recording"
            ),
            "",
        )
        _append_block(transfer_scene, card)

    # Keep scene metadata and the flattened view in lockstep.  New blocks are
    # presentation-only, so the original one-interactive-block contract stays
    # unchanged and the compiler's auto-check/auto-advance remains untouched.
    for scene in lesson.get("scenes", []):
        blocks = _scene_blocks(scene)
        scene["runtimeBlockIds"] = [_as_text(block.get("id")) for block in blocks]
        scene["interactiveCount"] = sum(block.get("type") in _INTERACTIVE_TYPES for block in blocks)
    lesson["sceneCount"] = len(lesson.get("scenes", []))
    lesson["blocks"] = [block for scene in lesson.get("scenes", []) for block in _scene_blocks(scene)]
    return mapping[0]


def _document_revision(full: dict[str, Any], mappings: dict[str, dict[str, Any]]) -> None:
    source_audit = full.setdefault("sourceAudit", {})
    source_audit["teachingRevision"] = TEACHING_REVISION
    source_audit["teachingSourceToDemand"] = deepcopy(mappings)
    guidance = full.setdefault("runtimeMappingGuidance", {})
    guidance["teachingRevision"] = TEACHING_REVISION
    guidance["teachingSequence"] = [
        "model",
        "meaning",
        "pronunciation",
        "functional-grammar",
        "guided-substitution",
        "transfer",
    ]
    guidance["teachingPresentation"] = {
        "pronunciation": "vocabulary items carry an audioUrl; the parent renderer owns playback",
        "support": "collapsed visible support keeps the autonomous route recoverable",
        "production": "new transfer cards sit beside the existing production control",
    }
    guidance["preservedRuntimeBehavior"] = "Keep existing auto-check and auto-advance; hints remain visible collapsed support."
    acceptance = full.setdefault("acceptance", {})
    acceptance["teachingRevision"] = TEACHING_REVISION
    acceptance["teachingUnits"] = [f"a1-general-u{unit}" for unit in _UNIT_NUMBERS]


def revise_units(full: dict[str, Any], compiler: Any | None = None) -> None:
    """Apply the U1–U4 teaching revision in place.

    ``compiler`` is accepted for integration convenience but intentionally not
    imported or used.  This keeps the pass safe to call from the compiler
    after verified audio integration without creating an import cycle.
    """

    del compiler
    lessons = full.get("lessons")
    if not isinstance(lessons, list):
        raise ValueError("full.lessons must be a list")
    mappings: dict[str, dict[str, Any]] = {}
    for lesson in lessons:
        if not isinstance(lesson, dict):
            continue
        unit_number = _unit_number(lesson)
        if unit_number is None:
            continue
        mappings[_as_text(lesson.get("id"))] = _revise_unit(lesson, unit_number)

    # Some callers retain a separate module.lessons list.  Keep it aligned
    # without assuming that the compiler's current aliasing is stable.
    module = full.get("module")
    module_lessons = module.get("lessons") if isinstance(module, dict) else None
    if isinstance(module_lessons, list):
        by_id = {_as_text(lesson.get("id")): lesson for lesson in lessons if isinstance(lesson, dict)}
        for index, module_lesson in enumerate(module_lessons):
            if not isinstance(module_lesson, dict):
                continue
            replacement = by_id.get(_as_text(module_lesson.get("id")))
            if replacement is None:
                continue
            if module_lesson is replacement:
                continue
            module_lessons[index] = replacement

    _document_revision(full, mappings)


__all__ = ["TEACHING_REVISION", "revise_units", "unit_audio_specs"]
