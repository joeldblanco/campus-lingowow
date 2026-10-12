"""Pedagogical post-processing for the A1 starter lesson.

The compiler intentionally keeps the starter source model small.  This module
adds the learner-visible teaching that must precede each of its checks after
the verified pilot audio has been integrated.  It mutates the compiler's
internal ``full`` artifact in place so the public projection can still be
created by the existing compiler.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


STARTER_LESSON_ID = "a1-general-start"
AUDIO_ROOT = "/audio/a1-module1-pilot/"
_PILOT_REVISION = "a1-module1-pilot-v1"
_LEARNING_REVISION = "course-guided-v1"
_INTERACTIVE_TYPES = {"multiple_choice", "short_answer", "ordering", "match", "recording", "essay"}

__all__ = ["revise_starter", "starter_audio_specs"]


def _audio_spec(filename: str, text: str, source_ref: str) -> dict[str, str]:
    return {"filename": filename, "text": text, "sourceRef": source_ref}


# These are short, useful pronunciation clips.  They are intentionally kept
# separate from the seven verified/reference clips already in the pilot.
_AUDIO_SPECS: tuple[dict[str, str], ...] = (
    _audio_spec("teach-start-s1-hello-v2.mp3", "Hello.", "starter.S1.teaching.hello"),
    _audio_spec("teach-start-s1-im-name-v2.mp3", "I'm Ana.", "starter.S1.teaching.im-name"),
    _audio_spec("teach-start-s1-my-name-v2.mp3", "My name is Ana.", "starter.S1.teaching.my-name"),
    _audio_spec("teach-start-s2-letter-a-v2.mp3", "The letter A.", "starter.S2.teaching.letters.A"),
    _audio_spec("teach-start-s2-letter-n-v2.mp3", "The letter N.", "starter.S2.teaching.letters.N"),
    _audio_spec("teach-start-s2-letter-t-v2.mp3", "The letter T.", "starter.S2.teaching.letters.T"),
    _audio_spec("teach-start-s2-letter-o-v2.mp3", "The letter O.", "starter.S2.teaching.letters.O"),
    _audio_spec("teach-start-s2-letter-r-v2.mp3", "The letter R.", "starter.S2.teaching.letters.R"),
    _audio_spec("teach-start-s2-letter-e-v2.mp3", "The letter E.", "starter.S2.teaching.letters.E"),
    _audio_spec("teach-start-s2-letter-s-v2.mp3", "The letter S.", "starter.S2.teaching.letters.S"),
    _audio_spec("teach-start-s2-letter-j-v2.mp3", "The letter J.", "starter.S2.teaching.letters.J"),
    _audio_spec("teach-start-s2-letter-x-v2.mp3", "The letter X.", "starter.S2.teaching.letters.X"),
    _audio_spec("teach-start-s2-letter-y-v2.mp3", "The letter Y.", "starter.S2.teaching.letters.Y"),
    _audio_spec("teach-start-s2-letter-z-v2.mp3", "The letter Z.", "starter.S2.teaching.letters.Z"),
    _audio_spec("teach-start-s3-number-0-v2.mp3", "Zero.", "starter.S3.teaching.digits.0"),
    _audio_spec("teach-start-s3-number-1-v2.mp3", "One.", "starter.S3.teaching.digits.1"),
    _audio_spec("teach-start-s3-number-2-v2.mp3", "Two.", "starter.S3.teaching.digits.2"),
    _audio_spec("teach-start-s3-number-3-v2.mp3", "Three.", "starter.S3.teaching.digits.3"),
    _audio_spec("teach-start-s3-number-4-v2.mp3", "Four.", "starter.S3.teaching.digits.4"),
    _audio_spec("teach-start-s3-number-5-v2.mp3", "Five.", "starter.S3.teaching.digits.5"),
    _audio_spec("teach-start-s3-number-6-v2.mp3", "Six.", "starter.S3.teaching.digits.6"),
    _audio_spec("teach-start-s3-number-7-v2.mp3", "Seven.", "starter.S3.teaching.digits.7"),
    _audio_spec("teach-start-s3-number-8-v2.mp3", "Eight.", "starter.S3.teaching.digits.8"),
    _audio_spec("teach-start-s3-number-9-v2.mp3", "Nine.", "starter.S3.teaching.digits.9"),
    _audio_spec("teach-start-s3-eighteen-v2.mp3", "Eighteen.", "starter.S3.teaching.time.eighteen"),
    _audio_spec("teach-start-s3-six-pm-v2.mp3", "Six p.m.", "starter.S3.teaching.time.six-pm"),
    _audio_spec("teach-start-s3-room-204-v2.mp3", "Room two oh four.", "starter.S3.teaching.room.204"),
    _audio_spec(
        "teach-start-s3-phone-555-0142-v2.mp3",
        "Five five five, zero one four two.",
        "starter.S3.teaching.phone.555-0142",
    ),
    _audio_spec("teach-start-s4-from-v2.mp3", "From.", "starter.S4.teaching.from"),
    _audio_spec("teach-start-s4-live-in-v2.mp3", "Live in.", "starter.S4.teaching.live-in"),
    _audio_spec("teach-start-s4-introduction-v2.mp3", "I'm from Peru. I live in Lima.", "starter.S4.teaching.model"),
    _audio_spec("teach-start-s5-im-name-v2.mp3", "I'm Ana.", "starter.S5.teaching.name"),
    _audio_spec("teach-start-s5-from-peru-v2.mp3", "I'm from Peru.", "starter.S5.teaching.origin"),
    _audio_spec("teach-start-s5-see-you-tuesday-v2.mp3", "See you on Tuesday.", "starter.S5.teaching.day"),
    _audio_spec("teach-start-s5-six-v2.mp3", "At six.", "starter.S5.teaching.time"),
    _audio_spec("teach-start-s5-room-204-v2.mp3", "In room two oh four.", "starter.S5.teaching.room"),
)


def starter_audio_specs() -> list[dict[str, str]]:
    """Return the planned short synthetic teaching clips for the starter.

    The returned list is a copy so the audio generation step can annotate it
    without changing the module's stable contract.
    """

    return deepcopy(list(_AUDIO_SPECS))


def _audio_url(filename: str) -> str:
    return f"{AUDIO_ROOT}{filename}"


def _spec_item(item_id: str, term: str, definition: str, filename: str) -> dict[str, str]:
    return {
        "id": item_id,
        "term": term,
        "definition": definition,
        "audioUrl": _audio_url(filename),
    }


def _base_data(
    scene: dict[str, Any],
    title: str,
    content_role: str,
    source_refs: list[str],
) -> dict[str, Any]:
    blocks = scene.get("runtimeBlocks") or scene.get("blocks") or []
    inherited = deepcopy(blocks[0].get("data", {})) if blocks and isinstance(blocks[0], dict) else {}
    data = inherited if isinstance(inherited, dict) else {}
    background = scene.get("background") or scene.get("backgroundSrc") or data.get("scene", "")
    data.update(
        {
            "learningRevision": data.get("learningRevision", _LEARNING_REVISION),
            "pilotRevision": data.get("pilotRevision", _PILOT_REVISION),
            "pilotSceneId": scene.get("id"),
            "guidedTitle": title,
            "scene": background,
            "sceneSide": scene.get("sceneSide", "right"),
            "contentRole": content_role,
            "sourceRefs": list(source_refs),
            "instructionStyle": data.get("instructionStyle", "compact-spanish"),
            "contentMode": data.get("contentMode", "meaningful-use-and-transfer"),
        }
    )
    return data


def _block(
    scene: dict[str, Any],
    block_id: str,
    block_type: str,
    guided_title: str,
    content_role: str,
    source_refs: list[str],
    **fields: Any,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "id": block_id,
        "type": block_type,
        "order": 0,
        "data": _base_data(scene, guided_title, content_role, source_refs),
    }
    block["data"]["contentRole"] = content_role
    block.update(fields)
    return block


_TEACHING_COPY: dict[str, str] = {
    "S1": (
        "<strong>Aprende antes de responder:</strong> Hello es un saludo. "
        "I’m + nombre significa “soy + nombre”; My name is + nombre significa “me llamo + nombre”. "
        "Escucha cada frase, señala el nombre y repítela."
    ),
    "S2": (
        "<strong>Aprende antes de responder:</strong> para deletrear, di el nombre de cada letra por separado "
        "y luego une las letras. Practica primero A-N-A y después T-O-R-R-E-S; el guion solo separa los sonidos."
    ),
    "S3": (
        "<strong>Aprende antes de responder:</strong> en un teléfono di cada dígito; en una hora, "
        "six p.m. indica la tarde; para el aula, Room 204 se lee two oh four. "
        "Escucha el grupo que necesitas y úsalo en la respuesta."
    ),
    "S4": (
        "<strong>Aprende antes de responder:</strong> I’m from + país expresa el origen; "
        "I live in + ciudad expresa dónde vives. from y live in tienen funciones distintas."
    ),
    "S5": (
        "<strong>Aprende antes de responder:</strong> combina los datos en este orden: nombre, origen, "
        "despedida, hora y aula. Usa I’m…, I’m from…, See you on…, at… y in room… para construir un mensaje útil."
    ),
}


_PRACTICE_COPY: dict[str, str] = {
    "S1": "Recuerda: Hello saluda; I’m + nombre y My name is + nombre presentan a la persona.",
    "S2": "Recuerda: di cada letra por separado y une las letras del nombre sin añadir sonidos.",
    "S3": "Recuerda: los teléfonos van dígito por dígito; las aulas usan two oh four; las horas usan six p.m.",
    "S4": "Recuerda: from introduce el origen y live in introduce la ciudad donde vives.",
    "S5": "Recuerda: selecciona el dato correcto y completa el mensaje con nombre, origen, día, hora y aula.",
}


_PRACTICE_HELP_ROWS: dict[str, list[list[list[str]]]] = {
    "S1": [
        [["Hello.", "Hola."], ["I’m Ana.", "Soy Ana."], ["My name is Ana.", "Me llamo Ana."]],
        [["I’m + nombre", "Soy + nombre"], ["Ana", "nombre del modelo"]],
        [["My name is…", "Me llamo…"], ["name", "nombre"]],
    ],
    "S2": [
        [["A", "nombre de la letra"], ["N", "nombre de la letra"], ["ANA", "A-N-A"]],
        [["ANA", "A-N-A"], ["T-O-R-R-E-S", "letras separadas"]],
        [["TORRES", "T-O-R-R-E-S"], ["R", "nombre de la letra R"]],
        [["A N A", "separa las letras"], ["TORRES", "apellido del modelo"]],
        [["J", "jay"], ["A", "ay"], ["N", "en"]],
        [["X", "ex"], ["Y", "why"], ["Z", "zee"]],
    ],
    "S3": [
        [["Room 204", "two oh four"], ["204", "aula"], ["20", "twenty"]],
        [["18:00", "six p.m."], ["6 p.m.", "six p.m."], ["18", "eighteen"]],
        [["555-0142", "five five five, zero one four two"], ["0", "zero"], ["1", "one"]],
        [["6 p.m.", "six p.m."], ["18:00", "six p.m."], ["a.m.", "mañana"]],
        [["Room 204", "two oh four"], ["204", "two oh four"], ["20", "twenty"]],
        [["a.m.", "mañana"], ["p.m.", "tarde/noche"], ["6 p.m.", "six p.m."]],
    ],
    "S4": [
        [["I’m from Peru.", "Soy de Peru."], ["from", "origen"], ["Peru", "país"]],
        [["I live in Lima.", "Vivo en Lima."], ["live in", "vivir en"], ["Lima", "ciudad"]],
        [["from", "origen"], ["live in", "ciudad"], ["Peru / Lima", "datos del modelo"]],
    ],
    "S5": [
        [["Name", "Ana Torres"], ["Origin", "Peru"], ["Day", "Tuesday"]],
        [["Room 204", "two oh four"], ["6 p.m.", "six p.m."], ["in room…", "en el aula…"]],
        [["I’m Ana Torres.", "nombre"], ["I’m from Peru.", "origen"], ["See you…", "despedida"]],
        [["Tuesday", "día"], ["six", "hora"], ["room 204", "aula"]],
    ],
}


_VOCABULARY_GROUPS: dict[str, list[dict[str, Any]]] = {
    "S1": [
        {
            "id": "a1teach-start-s1-pronunciation",
            "title": "Escucha frases para presentarte",
            "group": "saludo y nombre",
            "items": [
                _spec_item("a1teach-start-s1-hello", "Hello.", "saludo", "teach-start-s1-hello-v2.mp3"),
                _spec_item("a1teach-start-s1-im-name", "I’m Ana.", "soy Ana", "teach-start-s1-im-name-v2.mp3"),
                _spec_item("a1teach-start-s1-my-name", "My name is Ana.", "me llamo Ana", "teach-start-s1-my-name-v2.mp3"),
            ],
        }
    ],
    "S2": [
        {
            "id": "a1teach-start-s2-pronunciation-first-name",
            "title": "Letras del nombre ANA",
            "group": "deletrear el nombre",
            "items": [
                _spec_item("a1teach-start-s2-letter-a", "A", "letra para ANA", "teach-start-s2-letter-a-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-n", "N", "letra para ANA", "teach-start-s2-letter-n-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s2-pronunciation-last-name",
            "title": "Primer grupo de letras de TORRES",
            "group": "deletrear el apellido · T-O-R",
            "items": [
                _spec_item("a1teach-start-s2-letter-t", "T", "letra para TORRES", "teach-start-s2-letter-t-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-o", "O", "letra para TORRES", "teach-start-s2-letter-o-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-r", "R", "letra para TORRES", "teach-start-s2-letter-r-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s2-pronunciation-last-name-end",
            "title": "Último grupo de letras de TORRES",
            "group": "deletrear el apellido · E-S",
            "items": [
                _spec_item("a1teach-start-s2-letter-e", "E", "letra para TORRES", "teach-start-s2-letter-e-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-s", "S", "letra para TORRES", "teach-start-s2-letter-s-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s2-pronunciation-other-letters",
            "title": "Letras J, X y Y de las comprobaciones",
            "group": "letras J-X-Y",
            "items": [
                _spec_item("a1teach-start-s2-letter-j", "J", "letra para la práctica", "teach-start-s2-letter-j-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-x", "X", "letra para la práctica", "teach-start-s2-letter-x-v2.mp3"),
                _spec_item("a1teach-start-s2-letter-y", "Y", "letra para la práctica", "teach-start-s2-letter-y-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s2-pronunciation-z",
            "title": "Letra Z de la comprobación",
            "group": "letra Z",
            "items": [
                _spec_item("a1teach-start-s2-letter-z", "Z", "letra para la práctica", "teach-start-s2-letter-z-v2.mp3"),
            ],
        },
    ],
    "S3": [
        {
            "id": "a1teach-start-s3-pronunciation-digits-0-2",
            "title": "Dígitos 0, 1 y 2",
            "group": "dígitos para datos",
            "items": [
                _spec_item(f"a1teach-start-s3-number-{number}", str(number), "dígito", f"teach-start-s3-number-{number}-v2.mp3")
                for number in range(3)
            ],
        },
        {
            "id": "a1teach-start-s3-pronunciation-digits-3-5",
            "title": "Dígitos 3, 4 y 5",
            "group": "dígitos para datos",
            "items": [
                _spec_item(f"a1teach-start-s3-number-{number}", str(number), "dígito", f"teach-start-s3-number-{number}-v2.mp3")
                for number in range(3, 6)
            ],
        },
        {
            "id": "a1teach-start-s3-pronunciation-digits-6-8",
            "title": "Dígitos 6, 7 y 8",
            "group": "dígitos para datos",
            "items": [
                _spec_item(f"a1teach-start-s3-number-{number}", str(number), "dígito", f"teach-start-s3-number-{number}-v2.mp3")
                for number in range(6, 9)
            ],
        },
        {
            "id": "a1teach-start-s3-pronunciation-digit-9",
            "title": "Dígito 9",
            "group": "dígito para datos",
            "items": [
                _spec_item("a1teach-start-s3-number-9", "9", "dígito", "teach-start-s3-number-9-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s3-pronunciation-time",
            "title": "Hora de clase",
            "group": "18 y six p.m.",
            "items": [
                _spec_item("a1teach-start-s3-eighteen", "eighteen", "18", "teach-start-s3-eighteen-v2.mp3"),
                _spec_item("a1teach-start-s3-six-pm", "six p.m.", "18:00 / seis de la tarde", "teach-start-s3-six-pm-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s3-pronunciation-room-phone",
            "title": "Aula y teléfono",
            "group": "datos funcionales",
            "items": [
                _spec_item("a1teach-start-s3-room-204", "two oh four", "Room 204", "teach-start-s3-room-204-v2.mp3"),
                _spec_item("a1teach-start-s3-phone-555-0142", "five five five, zero one four two", "teléfono 555-0142", "teach-start-s3-phone-555-0142-v2.mp3"),
            ],
        },
    ],
    "S4": [
        {
            "id": "a1teach-start-s4-pronunciation",
            "title": "Origen y ciudad",
            "group": "from / live in",
            "items": [
                _spec_item("a1teach-start-s4-from", "from", "origen", "teach-start-s4-from-v2.mp3"),
                _spec_item("a1teach-start-s4-live-in", "live in", "ciudad donde vives", "teach-start-s4-live-in-v2.mp3"),
                _spec_item("a1teach-start-s4-model", "I’m from Peru. I live in Lima.", "modelo de presentación", "teach-start-s4-introduction-v2.mp3"),
            ],
        }
    ],
    "S5": [
        {
            "id": "a1teach-start-s5-pronunciation-opening",
            "title": "Nombre, origen y despedida",
            "group": "primer grupo del mensaje",
            "items": [
                _spec_item("a1teach-start-s5-name", "I’m Ana.", "nombre", "teach-start-s5-im-name-v2.mp3"),
                _spec_item("a1teach-start-s5-origin", "I’m from Peru.", "origen", "teach-start-s5-from-peru-v2.mp3"),
                _spec_item("a1teach-start-s5-day", "See you on Tuesday.", "despedida y día", "teach-start-s5-see-you-tuesday-v2.mp3"),
            ],
        },
        {
            "id": "a1teach-start-s5-pronunciation-closing",
            "title": "Hora y aula",
            "group": "segundo grupo del mensaje",
            "items": [
                _spec_item("a1teach-start-s5-time", "at six", "hora", "teach-start-s5-six-v2.mp3"),
                _spec_item("a1teach-start-s5-room", "in room two oh four", "aula", "teach-start-s5-room-204-v2.mp3"),
            ],
        }
    ],
}


def _activity_id(scene: dict[str, Any]) -> str | None:
    value = scene.get("activityId")
    if isinstance(value, str) and value:
        return value.upper()
    scene_id = str(scene.get("id", ""))
    match = next((candidate for candidate in ("S1", "S2", "S3", "S4", "S5") if f"-start-{candidate.lower()}-" in scene_id), None)
    return match


def _source_refs(scene: dict[str, Any], fallback: str) -> list[str]:
    refs = scene.get("sourceRefs")
    return [str(value) for value in refs] if isinstance(refs, list) and refs else [fallback]


def _runtime_blocks(scene: dict[str, Any]) -> list[dict[str, Any]]:
    blocks = scene.get("runtimeBlocks")
    if isinstance(blocks, list):
        return blocks
    blocks = scene.get("blocks")
    if isinstance(blocks, list):
        scene["runtimeBlocks"] = blocks
        return blocks
    scene["runtimeBlocks"] = []
    return scene["runtimeBlocks"]


def _insert_once(blocks: list[dict[str, Any]], block: dict[str, Any], index: int | None = None) -> None:
    block_id = block.get("id")
    if any(item.get("id") == block_id for item in blocks):
        return
    if index is None or index >= len(blocks):
        blocks.append(block)
    else:
        blocks.insert(max(0, index), block)


def _insert_before_interactive(blocks: list[dict[str, Any]], block: dict[str, Any]) -> None:
    index = next((i for i, item in enumerate(blocks) if item.get("type") in _INTERACTIVE_TYPES), None)
    _insert_once(blocks, block, index)


def _replace_material_terms(value: Any) -> Any:
    if isinstance(value, str):
        return (
            value.replace("TARJETAS", "FICHAS DIGITALES")
            .replace("Tarjetas", "Fichas digitales")
            .replace("tarjetas", "fichas digitales")
            .replace("TARJETA", "FICHA DIGITAL")
            .replace("Tarjeta", "Ficha digital")
            .replace("tarjeta", "ficha digital")
        )
    if isinstance(value, list):
        return [_replace_material_terms(item) for item in value]
    if isinstance(value, dict):
        return {key: _replace_material_terms(item) for key, item in value.items()}
    return value


def _add_teaching_scene_blocks(scene: dict[str, Any], activity_id: str) -> None:
    blocks = _runtime_blocks(scene)
    refs = _source_refs(scene, f"starter.{activity_id}.teaching")
    title = str(scene.get("title", f"S{activity_id}"))
    teaching_id = f"a1teach-start-{activity_id.lower()}-explicit"
    teaching_block = _block(
        scene,
        teaching_id,
        "text",
        title,
        "teaching",
        refs,
        format="html",
        content=f"<p>{_TEACHING_COPY[activity_id]}</p>",
    )
    teaching_block["data"].update(
        {
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "explicit-meaning-and-form",
        }
    )
    title_index = next((i for i, item in enumerate(blocks) if item.get("type") == "title"), -1)
    _insert_once(blocks, teaching_block, title_index + 1)

    vocabulary_index = next(
        (i for i, item in enumerate(blocks) if item.get("type") in {"structured-content", "audio"}),
        len(blocks),
    )
    for offset, group in enumerate(_VOCABULARY_GROUPS[activity_id]):
        group_id = str(group["id"])
        vocab = _block(
            scene,
            group_id,
            "vocabulary",
            str(group["title"]),
            "teaching",
            refs,
            title=str(group["title"]),
            items=deepcopy(group["items"]),
        )
        vocab["data"].update(
            {
                "teachingPresentation": "pronunciation",
                "pedagogicalFunction": "teach",
                "pronunciationGroup": group["group"],
                "learnerVisible": True,
                "audioKind": "planned-synthetic-teaching",
                "audioUrlPolicy": "generated-after-verified-original-audio",
            }
        )
        _insert_once(blocks, vocab, vocabulary_index + offset)
    scene["teachingBlockIds"] = [
        block["id"]
        for block in blocks
        if block.get("data", {}).get("pedagogicalFunction") == "teach"
    ]
    scene["pedagogicalStage"] = "teach"
    scene["learnerVisibleTeaching"] = True


def _update_s3_table(scene: dict[str, Any]) -> None:
    blocks = _runtime_blocks(scene)
    support = next((item for item in blocks if item.get("id") == "a1m1-start-s3-support"), None)
    if not isinstance(support, dict):
        return
    content = support.get("content")
    if not isinstance(content, dict):
        return
    existing = content.get("rows")
    rows: list[list[str]] = []
    seen: set[str] = set()
    if isinstance(existing, list):
        for row in existing:
            if not isinstance(row, list) or len(row) < 2:
                continue
            clean = [str(row[0]), str(row[1])]
            key = clean[0].strip().casefold()
            if key in seen:
                continue
            seen.add(key)
            rows.append(clean)
    for row in (
        ["100", "one hundred"],
        ["200", "two hundred"],
        ["Room 204", "two oh four"],
    ):
        if row[0].casefold() not in seen:
            rows.append(row)
            seen.add(row[0].casefold())
    content["headers"] = ["Número o dato", "Lectura útil"]
    content["rows"] = rows
    data = support.setdefault("data", {})
    data.update(
        {
            "supportLabel": "Abrir tabla de números, horas y aula",
            "supportPurpose": "Consulta el dato que necesitas; la tabla contiene ejemplos funcionales para la tarea.",
            "tablePurpose": "teléfono, hora y Room 204",
            "materialKind": "digital-reference-table",
            "materialAvailability": "learner-visible-runtime",
        }
    )


def _mark_s5_data_card(scene: dict[str, Any]) -> None:
    support = next(
        (block for block in _runtime_blocks(scene) if block.get("id") == "a1m1-start-s5-support"),
        None,
    )
    if not isinstance(support, dict):
        return
    data = support.setdefault("data", {})
    data.update(
        {
            "cardKind": "data-card",
            "materialKind": "digital-data-card",
            "materialAvailability": "learner-visible-runtime",
            "learnerVisible": True,
        }
    )
    if isinstance(support.get("content"), dict):
        support["content"]["headers"] = ["Dato", "Valor"]
    data["supportLabel"] = "Abrir ficha digital de ejemplo"


def _practice_rows(activity_id: str, practice_index: int) -> list[list[str]]:
    groups = _PRACTICE_HELP_ROWS.get(activity_id, [])
    if not groups:
        return []
    return deepcopy(groups[min(max(practice_index - 1, 0), len(groups) - 1)])


def _add_practice_teaching(scene: dict[str, Any], activity_id: str, practice_index: int) -> None:
    blocks = _runtime_blocks(scene)
    refs = _source_refs(scene, f"starter.{activity_id}.practice.{practice_index}")
    title = str(scene.get("title", f"{activity_id} · comprobación {practice_index}"))
    teaching_id = f"a1teach-start-{activity_id.lower()}-check-{practice_index}-teaching"
    teaching = _block(
        scene,
        teaching_id,
        "text",
        title,
        "teaching",
        refs,
        format="html",
        content=f"<p><strong>Aprende antes de responder:</strong> {_PRACTICE_COPY[activity_id]}</p>",
    )
    teaching["data"].update(
        {
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
        }
    )
    _insert_before_interactive(blocks, teaching)

    help_id = f"a1teach-start-{activity_id.lower()}-check-{practice_index}-help"
    help_block = _block(
        scene,
        help_id,
        "structured-content",
        "Ayuda local para esta tarea",
        "support",
        refs,
        title="Ayuda local para esta tarea",
        config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
        content={"headers": ["Expresión o dato", "Ayuda breve"], "rows": _practice_rows(activity_id, practice_index)},
    )
    help_block["data"].update(
        {
            "supportLabel": "Abrir ayuda local",
            "collapsible": True,
            "supportPurpose": "Apoyo accesible en esta demanda; intenta primero y ábrelo cuando lo necesites.",
            "localPracticeHelp": True,
            "availableBeforeDemand": True,
            "pedagogicalFunction": "practice-support",
            "materialKind": "digital-reference-table",
            "materialAvailability": "learner-visible-runtime",
        }
    )
    _insert_before_interactive(blocks, help_block)

    if activity_id == "S4":
        # The original listening clip lives in the teaching scene.  The clone
        # is inserted into each demand so a listening-related check has a
        # local, playable reference without replacing the verified block.
        audio_url = "/audio/a1-module1-pilot/starter-s4-listening.mp3"
        source_audio_id = "a1m1-start-s4-teach-starter-s4-listening-audio"
        if not any(item.get("id") == f"a1teach-start-s4-check-{practice_index}-reference-audio" for item in blocks):
            clone = None
            for candidate in scene.get("_starter_audio_candidates", []):
                if isinstance(candidate, dict) and candidate.get("url") == audio_url:
                    clone = deepcopy(candidate)
                    break
            if clone is not None:
                clone["id"] = f"a1teach-start-s4-check-{practice_index}-reference-audio"
                clone["order"] = 0
                clone["prompt"] = "Escucha la referencia original y vuelve a la tarea."
                clone["title"] = "Audio de referencia para esta tarea"
                clone_data = clone.setdefault("data", {})
                clone_data.update(
                    {
                        "pilotSceneId": scene.get("id"),
                        "guidedTitle": title,
                        "contentRole": "practice-audio",
                        "referenceOf": source_audio_id,
                        "localReference": True,
                        "gradedListening": False,
                    }
                )
                _insert_before_interactive(blocks, clone)
                help_block["data"]["referenceAudioBlockId"] = clone["id"]
                help_block["data"]["relatedAudioUrl"] = audio_url

    scene["teachingBlockIds"] = [teaching_id]
    scene["supportBlockIds"] = [help_id]
    scene["pedagogicalStage"] = "practice"
    scene["learnerVisibleTeaching"] = True

    for block in blocks:
        if block.get("type") not in _INTERACTIVE_TYPES:
            continue
        block_data = block.setdefault("data", {})
        function = "recognize" if block.get("type") in {"multiple_choice", "match"} else "produce"
        block_data.update(
            {
                "pedagogicalFunction": function,
                "autoCheck": True,
                "autoAdvance": True,
                "manualNext": False,
            }
        )


def _new_transfer_scene(lesson: dict[str, Any], source_scene: dict[str, Any]) -> dict[str, Any]:
    scene_id = "a1teach-start-s5-transfer"
    source_refs = ["starter.S5.transfer.revised"]
    title = "Transferencia · datos nuevos"
    background = source_scene.get("background") or source_scene.get("backgroundSrc") or ""
    scene_stub = {
        "id": scene_id,
        "lessonId": lesson.get("id", STARTER_LESSON_ID),
        "order": 0,
        "phase": "starter-transfer",
        "title": title,
        "instruction": "Usa la ficha digital y escribe un mensaje breve con datos nuevos.",
        "route": "learner",
        "sourceRefs": source_refs,
        "interactiveCount": 1,
        "runtimeBlockIds": [],
        "runtimeBlocks": [],
        "background": background,
        "backgroundSrc": source_scene.get("backgroundSrc", background),
        "sceneSide": source_scene.get("sceneSide", "right"),
        "routeModes": deepcopy(source_scene.get("routeModes", {})),
        "activityId": "S5",
        "pedagogicalStage": "transfer",
        "learnerVisibleTeaching": True,
        "transferData": {
            "Name": "Luis Vega",
            "Origin": "Chile",
            "Day": "Thursday",
            "Time": "7 p.m.",
            "Room": "Room 105",
        },
    }
    model = "Hi, I’m Luis. I’m from Chile. See you on Thursday at seven in room 105."
    blocks = _runtime_blocks(scene_stub)
    blocks.append(
        _block(
            scene_stub,
            "a1teach-start-s5-transfer-title",
            "title",
            title,
            "transfer",
            source_refs,
            title=title,
        )
    )
    prompt = (
        "<p><strong>Aprende y aplica:</strong> cambia todos los datos del mensaje por los de la ficha nueva.</p>"
        f"<p><strong>Modelo:</strong> {model}</p>"
        "<details><summary>Guía docente complementaria</summary><p>Modela una ronda, comprueba significado y "
        "permite consultar la ficha digital durante la producción.</p></details>"
    )
    teaching = _block(
        scene_stub,
        "a1teach-start-s5-transfer-teaching",
        "text",
        title,
        "teaching",
        source_refs,
        format="html",
        content=prompt,
    )
    teaching["data"].update(
        {
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "explicit-transfer-model",
            "modelText": model,
        }
    )
    blocks.append(teaching)
    card = _block(
        scene_stub,
        "a1teach-start-s5-transfer-card",
        "structured-content",
        "Ficha digital de Luis Vega",
        "transfer-material",
        source_refs,
        title="Ficha digital de Luis Vega",
        config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
        content={
            "headers": ["Dato", "Valor"],
            "rows": [
                ["Name", "Luis Vega"],
                ["Origin", "Chile"],
                ["Day", "Thursday"],
                ["Time", "7 p.m."],
                ["Room", "Room 105"],
            ],
        },
    )
    card["data"].update(
        {
            "cardKind": "data-card",
            "materialKind": "digital-data-card",
            "materialAvailability": "learner-visible-runtime",
            "learnerVisible": True,
            "transferFields": ["name", "origin", "day", "time", "room"],
        }
    )
    blocks.append(card)
    help_block = _block(
        scene_stub,
        "a1teach-start-s5-transfer-help",
        "structured-content",
        "Ayuda local para transferir",
        "support",
        source_refs,
        title="Ayuda local para transferir",
        config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
        content={
            "headers": ["Función", "Marco útil"],
            "rows": [
                ["nombre", "I’m + nombre."],
                ["origen", "I’m from + país."],
                ["despedida y día", "See you on + día."],
                ["hora", "at + hora."],
                ["aula", "in room + número."],
            ],
        },
    )
    help_block["data"].update(
        {
            "supportLabel": "Abrir ayuda local",
            "collapsible": True,
            "supportPurpose": "Consulta un marco breve después de intentar la respuesta.",
            "localPracticeHelp": True,
            "availableBeforeDemand": True,
            "pedagogicalFunction": "transfer-support",
            "materialKind": "digital-reference-table",
            "materialAvailability": "learner-visible-runtime",
        }
    )
    blocks.append(help_block)
    answer = "Hi, I'm Luis. I'm from Chile. See you on Thursday at seven in room 105."
    transfer = _block(
        scene_stub,
        "a1teach-start-s5-transfer-practice",
        "short_answer",
        title,
        "transfer-practice",
        source_refs,
        items=[
            {
                "id": "a1teach-start-s5-transfer-practice-item-1",
                "question": "Escribe el mensaje completo con la ficha nueva.",
                "correctAnswer": answer,
                "acceptedAnswers": [answer, model],
                "sourceKey": source_refs[0],
                "sourceType": "transfer",
            }
        ],
        caseSensitive=False,
        explanation="Comprueba nombre, origen, día, hora y aula de Luis.",
        hint="Usa I’m…, I’m from…, See you on…, at… e in room… en ese orden.",
        points=1,
    )
    transfer["data"].update(
        {
            "answerLayout": "freeText",
            "pedagogicalFunction": "transfer",
            "transferData": deepcopy(scene_stub["transferData"]),
            "autoCheck": True,
            "autoAdvance": True,
            "manualNext": False,
            "teacherReviewOnly": False,
            "aiGrading": False,
            "doNotAutoGrade": False,
            "modelAnswer": model,
        }
    )
    blocks.append(transfer)
    scene_stub["teachingBlockIds"] = [teaching["id"]]
    scene_stub["supportBlockIds"] = [card["id"], help_block["id"]]
    scene_stub["runtimeBlockIds"] = [block["id"] for block in blocks]
    return scene_stub


def _ensure_transfer_scene(lesson: dict[str, Any]) -> None:
    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        return
    if any(scene.get("id") == "a1teach-start-s5-transfer" for scene in scenes if isinstance(scene, dict)):
        return
    source = next((scene for scene in scenes if scene.get("id") == "a1m1-start-s5-teach"), None)
    if not isinstance(source, dict):
        source = next((scene for scene in scenes if _activity_id(scene) == "S5"), None)
    if not isinstance(source, dict):
        return
    scenes.append(_new_transfer_scene(lesson, source))


def _add_audio_candidates(lesson: dict[str, Any]) -> None:
    """Make original S4 reference audio discoverable to its local checks."""

    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        return
    teach = next((scene for scene in scenes if scene.get("id") == "a1m1-start-s4-teach"), None)
    if not isinstance(teach, dict):
        return
    original = [
        deepcopy(block)
        for block in _runtime_blocks(teach)
        if isinstance(block, dict)
        and block.get("type") == "audio"
        and block.get("url") == "/audio/a1-module1-pilot/starter-s4-listening.mp3"
    ]
    if not original:
        return
    for scene in scenes:
        if _activity_id(scene) != "S4" or scene.get("phase") != "starter-practice":
            continue
        scene["_starter_audio_candidates"] = original


def _annotate_materials(lesson: dict[str, Any]) -> None:
    for field in ("description", "learningOutcomes", "routePolicy"):
        if field in lesson:
            lesson[field] = _replace_material_terms(lesson[field])
    for scene in lesson.get("scenes", []):
        if not isinstance(scene, dict):
            continue
        if isinstance(scene.get("instruction"), str):
            scene["instruction"] = _replace_material_terms(scene["instruction"])
        for block in _runtime_blocks(scene):
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text" and isinstance(block.get("content"), str):
                for key in ("content", "teacherReadScript", "prompt", "transcript"):
                    if key in block:
                        block[key] = _replace_material_terms(block[key])
                data = block.get("data")
                if isinstance(data, dict):
                    block["data"] = _replace_material_terms(data)


def _sync_lesson(lesson: dict[str, Any]) -> None:
    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        return
    flattened: list[dict[str, Any]] = []
    for scene_order, scene in enumerate(scenes, start=1):
        if not isinstance(scene, dict):
            continue
        scene["order"] = scene_order
        blocks = _runtime_blocks(scene)
        scene["runtimeBlockIds"] = [block.get("id") for block in blocks if isinstance(block, dict)]
        scene["interactiveCount"] = sum(
            1 for block in blocks if isinstance(block, dict) and block.get("type") in _INTERACTIVE_TYPES
        )
        for block in blocks:
            if not isinstance(block, dict):
                continue
            block["order"] = len(flattened)
            flattened.append(block)
    lesson["blocks"] = flattened
    lesson["sceneCount"] = len(scenes)


def _sync_auxiliary_counts(full: dict[str, Any], lesson: dict[str, Any]) -> None:
    lesson_id = lesson.get("id")
    scenes = lesson.get("scenes", [])
    scene_count = len(scenes) if isinstance(scenes, list) else 0
    assignment = full.get("backgroundAssignment")
    if isinstance(assignment, dict):
        for item in assignment.get("lessons", []):
            if not isinstance(item, dict) or item.get("lessonId") != lesson_id:
                continue
            item["sceneCount"] = scene_count
            assigned = item.get("scenes")
            if isinstance(assigned, list):
                existing_ids = {entry.get("sceneId") for entry in assigned if isinstance(entry, dict)}
                for scene in scenes:
                    if scene.get("id") not in existing_ids:
                        assigned.append({"sceneId": scene.get("id"), "src": scene.get("background")})
    visual = full.get("visualAcceptanceManifest")
    mapping = visual.get("lessonSceneMapping") if isinstance(visual, dict) else None
    if isinstance(mapping, dict) and isinstance(mapping.get(lesson_id), dict):
        entry = mapping[lesson_id]
        entry["sceneCount"] = scene_count
        assets = entry.get("sceneAssets")
        if isinstance(assets, list):
            existing_ids = {item.get("sceneId") for item in assets if isinstance(item, dict)}
            for scene in scenes:
                if scene.get("id") not in existing_ids:
                    assets.append({"sceneId": scene.get("id"), "src": scene.get("background")})


def _register_audio_plan(full: dict[str, Any]) -> None:
    manifest = full.get("audioManifest")
    if not isinstance(manifest, dict):
        return
    manifest["starterTeachingPlan"] = [
        {
            "plannedPath": _audio_url(spec["filename"]),
            "sourceRef": spec["sourceRef"],
            "text": spec["text"],
            "status": "planned_synthetic_teaching_clip",
            "referenceOnly": False,
            "gradedListening": False,
        }
        for spec in _AUDIO_SPECS
    ]


def revise_starter(full: dict[str, Any]) -> None:
    """Revise the starter lesson in place after verified original audio.

    Existing scene, block, item and question IDs remain untouched.  New
    learner-facing blocks and the single closed transfer check use the
    ``a1teach-start-`` prefix so repeated application is idempotent.
    """

    if not isinstance(full, dict):
        raise TypeError("full must be a dict")
    lessons = full.get("lessons")
    if not isinstance(lessons, list):
        raise ValueError("full must contain internal lessons with scenes")
    lesson = next((item for item in lessons if isinstance(item, dict) and item.get("id") == STARTER_LESSON_ID), None)
    if not isinstance(lesson, dict):
        raise ValueError(f"starter lesson {STARTER_LESSON_ID!r} is missing")
    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        raise ValueError("starter lesson must contain internal scenes")

    _add_audio_candidates(lesson)
    for scene in scenes:
        if not isinstance(scene, dict):
            continue
        activity_id = _activity_id(scene)
        if activity_id not in _VOCABULARY_GROUPS:
            continue
        if scene.get("phase") == "starter-teach" or scene.get("id") == f"a1m1-start-{activity_id.lower()}-teach":
            _add_teaching_scene_blocks(scene, activity_id)
            if activity_id == "S3":
                _update_s3_table(scene)
            elif activity_id == "S5":
                _mark_s5_data_card(scene)
        elif scene.get("phase") == "starter-practice" or "-check-" in str(scene.get("id", "")):
            practice_index = scene.get("practiceIndex")
            if not isinstance(practice_index, int):
                try:
                    practice_index = int(str(scene.get("id", "")).rsplit("-", 1)[-1])
                except ValueError:
                    practice_index = 1
            _add_practice_teaching(scene, activity_id, practice_index)

    _ensure_transfer_scene(lesson)
    _annotate_materials(lesson)
    for scene in lesson.get("scenes", []):
        if isinstance(scene, dict):
            scene.pop("_starter_audio_candidates", None)
    _sync_lesson(lesson)
    _sync_auxiliary_counts(full, lesson)
    _register_audio_plan(full)
