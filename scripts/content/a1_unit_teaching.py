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
_APPROVED_BACKGROUND_POOL = (
    "/images/lessons/backgrounds/airport-lounge.webp",
    "/images/lessons/backgrounds/art-studio.webp",
    "/images/lessons/backgrounds/botanical-office.webp",
    "/images/lessons/backgrounds/campus.webp",
    "/images/lessons/backgrounds/city-directions.webp",
    "/images/lessons/backgrounds/community-bookshop.webp",
    "/images/lessons/backgrounds/daily-kitchen.webp",
    "/images/lessons/backgrounds/family-living-room.webp",
    "/images/lessons/backgrounds/flower-courtyard.webp",
    "/images/lessons/backgrounds/garden.webp",
    "/images/lessons/backgrounds/harbor-promenade.webp",
    "/images/lessons/backgrounds/lakeside-reading-terrace.webp",
    "/images/lessons/backgrounds/library.webp",
    "/images/lessons/backgrounds/listening-lounge.webp",
    "/images/lessons/backgrounds/market.webp",
    "/images/lessons/backgrounds/mountain-cabin.webp",
    "/images/lessons/backgrounds/museum-gallery.webp",
    "/images/lessons/backgrounds/music-room.webp",
    "/images/lessons/backgrounds/restaurant.webp",
    "/images/lessons/backgrounds/science-lab.webp",
    "/images/lessons/backgrounds/seaside.webp",
    "/images/lessons/backgrounds/town-park.webp",
    "/images/lessons/backgrounds/travel-station.webp",
    "/images/lessons/backgrounds/village-square.webp",
    "/images/lessons/backgrounds/workshop.webp",
)


# Synthetic clips are intentionally short phrases that support the following
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
        {"filename": "teach-u2-beside-v2.mp3", "text": "Elena is beside Diego.", "sourceRef": "module1.unit2.teaching.pronunciation.5"},
        {"filename": "teach-u2-owner-v2.mp3", "text": "Rosa's folder.", "sourceRef": "module1.unit2.teaching.pronunciation.6"},
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
            ["I'm = I am + nombre", "Presenta tu nombre; I'm es la forma corta.", "I'm Ana. / I am Ana."],
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
            ["Tarjeta A", "Marta · Ecuador · Quito", "Hi, I'm ___. I'm from ___. I live in ___."],
            ["Tarjeta B", "Omar · Chile · Arica", "What's your name? I'm ___. I'm from ___."],
        ],
        "forms": ["I'm + nombre", "I'm from + lugar", "I live in + ciudad"],
    },
    2: {
        "sceneInstruction": "Mira quién o qué es, escucha una frase y cambia un referente.",
        "model": (
            ("A", "This is my colleague Diego. Elena is beside him."),
            ("B", "Who is she?"),
            ("A", "That is our manager Elena. The blue folder is hers."),
            ("B", "Is this your badge?"),
            ("A", "Yes, it is. The red folder is mine."),
        ),
        "meaning": "Señala personas u objetos y confirma de quién son; Elena es la encargada.",
        "change": "Cambia la persona, el objeto o la relación; no cambies toda la frase.",
        "languageRows": [
            ["This is my colleague.", "Este es mi compañero."],
            ["Who is she?", "¿Quién es ella?"],
            ["Elena is beside Diego.", "Elena está al lado de Diego; beside significa al lado de."],
            ["Rosa's folder.", "La carpeta de Rosa; nombre + 's indica de quién es."],
            ["That is our manager.", "Esa es nuestra encargada."],
            ["The blue folder is hers.", "La carpeta azul es suya."],
            ["The red folder is mine.", "La carpeta roja es mía."],
            ["Is this your badge?", "¿Esta es tu credencial?"],
            ["Yes, it is.", "Sí, lo es."],
            ["These are my folders.", "Estas son mis carpetas (plural)."],
        ],
        "grammarRows": [
            ["This is / That is + uno", "Identifica una persona u objeto (singular).", "This is my colleague."],
            ["These are / Those are + dos o más", "Identifica personas u objetos (plural).", "These are my folders."],
            ["my / your + objeto", "mi / tu; señala a quien habla o escucha.", "my folder / your badge"],
            ["his / her + objeto", "de él / de ella.", "his folder / her folder"],
            ["our / their + objeto", "nuestro / de ellos.", "our manager / their folders"],
            ["hers / mine", "Sustituye el nombre del dueño.", "The folder is hers / mine."],
        ],
        "substitutionRows": [
            ["Base", "Cambia solo", "Di"],
            ["colleague Diego", "nombre", "This is my colleague Rosa."],
            ["blue folder / hers", "objeto", "The red folder is hers."],
            ["your badge", "respuesta", "Yes, it is. The badge is mine."],
        ],
        "transferRows": [
            ["Tarjeta A", "Rosa · colleague · green folder hers", "This is my colleague ___. The ___ folder is ___."],
            ["Tarjeta B", "badge · mine", "Is this your ___? Yes, it is. It is ___."],
        ],
        "forms": ["This is / That is", "Who is...?", "my / your", "hers / mine", "Is this...?"],
    },
    3: {
        "sceneInstruction": "Lee un contacto breve, escucha las frases y concreta un horario.",
        "model": (
            ("A", "My phone number is 555-0142."),
            ("B", "My email is elena dot ramos at example dot org."),
            ("A", "When are you free?"),
            ("B", "I'm free on Tuesday at six."),
            ("A", "That works for me."),
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
            ["Tarjeta A", "555-0188 · marta.cruz@example.org", "My phone number is ___. My email is ___."],
            ["Tarjeta B", "Thursday · four", "I'm free on ___ at ___. That works for me."],
        ],
        "forms": ["My phone number is...", "My email is...", "When are you free?", "on + día", "at + hora", "That works for me."],
    },
    4: {
        "sceneInstruction": "Escucha una reparación, aclara el dato y confirma la versión correcta.",
        "model": (
            ("A", "The appointment is on Thursday."),
            ("B", "I don't understand. Could you repeat that, please?"),
            ("A", "On Thursday."),
            ("B", "Do you mean this Thursday?"),
            ("A", "Yes, this Thursday. The room is two oh four."),
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
            ["Tarjeta A", "Friday · room 206", "I don't understand. Could you repeat that? Do you mean this ___? The room is ___."],
            ["Tarjeta B", "Thursday · confirm", "Do you mean this ___? Yes, this ___."],
        ],
        "forms": ["I don't understand.", "Could you repeat...?", "Do you mean...?", "Yes, ...", "The room is..."],
    },
}


# A demand gets a small, local recovery table in its own scene.  These rows
# cue the form and the communicative purpose without revealing the answer to
# the existing question.  They are collapsed visible support, so an
# autonomous learner can recover without navigating back to the teaching
# scene.
_LOCAL_SUPPORT: dict[int, dict[str, list[list[str]]]] = {
    1: {
        "listening-check": [["I'm from + lugar / I live in + ciudad", "Busca origen y ciudad en el audio."]],
        "comprehension": [["Where is...? / Where does...?", "Busca lugar de encuentro, origen o ciudad."]],
        "practice-1": [["Hi, I'm ___ / I am ___", "Saludo y nombre abren el encuentro."]],
        "practice-2": [["I'm from + lugar", "Completa el origen, no la ciudad."]],
        "practice-3": [["I'm from + lugar", "Busca la frase de origen en el modelo."]],
        "practice-4": [["What's your name? → I'm ___", "Responde con un nombre."]],
        "practice-5": [["Nice to meet you.", "Cierra el primer encuentro con esta frase."]],
        "transfer-speaking": [["Tarjeta nueva", "Usa el nombre y los datos de lugar que aparecen; completa los huecos si lo necesitas."]],
        "transfer-writing": [["I'm = I am", "Escribe 2–4 frases con los datos de la tarjeta, sin copiar Ana."]],
    },
    2: {
        "listening-check": [["This is / That is / These are", "Busca si se trata de uno o de varios."]],
        "comprehension": [["Who is she?", "Primero identifica el referente; luego busca su relación."]],
        "practice-1": [["This is my colleague ___.", "Nombra la persona y la relación."]],
        "practice-2": [["my / your", "Elige el posesivo que corresponde a quien habla."]],
        "practice-3": [["Who is she? → She is...", "Responde con persona o relación, no con un objeto."]],
        "practice-4": [["This is my colleague ___.", "Identifica a una persona con una frase completa."]],
        "practice-5": [["This is + uno", "Ordena sujeto, verbo y relación."]],
        "transfer-speaking": [["Tarjeta nueva", "Usa persona, objeto y dueño; elige hers, his o mine según el dato."]],
        "transfer-writing": [["Singular / plural + posesivo", "Escribe una frase con uno, otra con varios y una de pertenencia."]],
    },
    3: {
        "listening-check": [["My phone number is... / My email is...", "Busca dígitos, dot y at en el audio."]],
        "comprehension": [["My phone number is...", "Busca el contacto exacto antes de elegir."]],
        "practice-1": [["When are you free?", "Pregunta por disponibilidad antes de proponer la hora."]],
        "practice-2": [["My phone number is ___", "Usa is con un número singular."]],
        "practice-3": [["phone / email", "Separa los dos datos de contacto."]],
        "practice-4": [["on + día / at + hora", "Día lleva on; hora lleva at."]],
        "practice-5": [["That works for me.", "Acepta una propuesta que sí te sirve."]],
        "transfer-speaking": [["Tarjeta nueva", "Lee el contacto u horario que aparecen y concreta el dato de la tarjeta."]],
        "transfer-writing": [["on + día / at + hora", "Escribe contacto y una confirmación breve."]],
    },
    4: {
        "listening-check": [["on + día + at + hora", "Busca cuándo es la cita y qué sala se menciona."]],
        "comprehension": [["I don't understand.", "Busca qué dato no se entiende y qué se repite."]],
        "practice-1": [["Could you repeat that, please?", "Pide repetición con cortesía."]],
        "practice-2": [["I don't understand.", "Declara la dificultad antes de pedir ayuda."]],
        "practice-3": [["Do you mean this ___?", "Propón una interpretación concreta."]],
        "practice-4": [["The room is ___.", "Confirma el número de sala, no el horario."]],
        "practice-5": [["Yes, this ___.", "Confirma el día que acabas de aclarar."]],
        "transfer-speaking": [["Tarjeta nueva", "Pide repetición, aclara el día y comprueba la sala de la tarjeta."]],
        "transfer-writing": [["Do you mean...? / Yes, ...", "Escribe una reparación y una confirmación con los datos nuevos."]],
    },
}


_TRANSFER_CHECKLISTS: dict[int, list[str]] = {
    1: [
        "Incluye el nombre de la tarjeta elegida.",
        "Incluye los datos de lugar que aparecen en esa tarjeta.",
        "Usa I'm = I am para presentarte.",
        "Verifiqué que el mensaje coincide con la tarjeta.",
    ],
    2: [
        "Identifica la persona u objeto de la tarjeta.",
        "Distingue uno de varios cuando corresponda.",
        "Indica la relación o pertenencia con un posesivo.",
        "Verifiqué que el mensaje coincide con la tarjeta.",
    ],
    3: [
        "Incluye los datos de contacto u horario de la tarjeta elegida.",
        "Usa on para el día y at para la hora cuando aparecen.",
        "Confirma si la propuesta funciona.",
        "Verifiqué que el mensaje coincide con la tarjeta.",
    ],
    4: [
        "Pide repetición si falta un dato.",
        "Aclara el día que aparece en la tarjeta.",
        "Confirma la sala o el día sin inventar datos.",
        "Verifiqué que el mensaje coincide con la tarjeta.",
    ],
}


def unit_audio_specs() -> list[dict[str, str]]:
    """Return the synthetic pronunciation clip hand-off for U1–U4.

    The returned objects are copies so a renderer cannot mutate the module's
    source data.  There are four to six clips per unit, below the eight-clip
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
        "listening-check",
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
            "definition": f"{_pronunciation_meaning(unit_number, spec['text'])} Escucha la frase y repítela.",
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
            "pronunciationSource": "synthetic-teaching-v2",
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
    """Return the practical Spanish meaning for a spoken phrase."""

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


def _new_title_block(
    block_id: str,
    scene: dict[str, Any],
    title: str,
    mapping: list[dict[str, Any]],
    presentation: str,
) -> dict[str, Any]:
    return {
        "id": block_id,
        "type": "title",
        "order": 0,
        "data": _base_metadata(scene, title, "teaching", [mapping[0]["sourceRef"]], mapping, presentation),
        "title": title,
    }


def _new_micro_scene(
    lesson: dict[str, Any],
    source_scene: dict[str, Any],
    scene_id: str,
    phase: str,
    title: str,
    instruction: str,
    mapping: list[dict[str, Any]],
    source_refs: list[str],
    stage: str,
    blocks: list[dict[str, Any]],
    asset: str,
) -> dict[str, Any]:
    scene = {
        "id": scene_id,
        "lessonId": _as_text(lesson.get("id")),
        "order": 0,
        "phase": phase,
        "title": title,
        "instruction": instruction,
        "route": source_scene.get("route", "learner"),
        "sourceRefs": _unique([*source_refs, mapping[0]["sourceRef"]]),
        "interactiveCount": 0,
        "runtimeBlockIds": [],
        "runtimeBlocks": [],
        "background": asset,
        "backgroundSrc": asset,
        "sceneSide": source_scene.get("sceneSide", "right"),
        "routeModes": deepcopy(source_scene.get("routeModes", {})),
        "teachingRevision": TEACHING_REVISION,
        "teachingStage": stage,
        "sourceTeachingToDemand": deepcopy(mapping),
    }
    for block in blocks:
        _upsert_block(scene, block)
    return scene


def _remove_blocks_with_prefixes(lesson: dict[str, Any], prefixes: Iterable[str]) -> None:
    prefixes_tuple = tuple(prefixes)
    for scene in lesson.get("scenes", []):
        blocks = [
            block
            for block in _scene_blocks(scene)
            if not _as_text(block.get("id")).startswith(prefixes_tuple)
        ]
        scene["runtimeBlocks"] = blocks
        scene["runtimeBlockIds"] = [_as_text(block.get("id")) for block in blocks]


def _append_block(scene: dict[str, Any], block: dict[str, Any]) -> None:
    blocks = _scene_blocks(scene)
    if any(existing.get("id") == block.get("id") for existing in blocks):
        return
    orders = [item.get("order") for item in blocks if isinstance(item.get("order"), int)]
    block["order"] = max(orders, default=-1) + 1
    blocks.append(block)
    scene["runtimeBlocks"] = blocks


def _upsert_block(scene: dict[str, Any], block: dict[str, Any]) -> dict[str, Any]:
    """Insert a generated block once, refreshing only generated content."""

    blocks = _scene_blocks(scene)
    existing = next((item for item in blocks if item.get("id") == block.get("id")), None)
    if existing is not None:
        order = existing.get("order", block.get("order", 0))
        existing.clear()
        existing.update(deepcopy(block))
        existing["order"] = order
        return existing
    _append_block(scene, block)
    return block


def _move_block_before(scene: dict[str, Any], block_id: str, target_id: str) -> None:
    """Keep a local card immediately before the production control it supports."""

    blocks = _scene_blocks(scene)
    block_index = next((index for index, block in enumerate(blocks) if block.get("id") == block_id), None)
    target_index = next((index for index, block in enumerate(blocks) if block.get("id") == target_id), None)
    if block_index is None or target_index is None or block_index < target_index:
        return
    block = blocks.pop(block_index)
    blocks.insert(target_index, block)
    for order, item in enumerate(blocks):
        item["order"] = order
    scene["runtimeBlocks"] = blocks


def _new_local_support_block(
    unit_number: int,
    scene: dict[str, Any],
    rows: list[list[str]],
    mapping: list[dict[str, Any]],
) -> dict[str, Any]:
    suffix = _as_text(scene.get("id")).replace(f"a1m1-u{unit_number}-", "")
    title = "Apoyo para esta tarea"
    block = _new_table_block(
        f"a1teach-u{unit_number}-support-{suffix}-v2",
        scene,
        title,
        ["Patrón", "Recupéralo así"],
        rows,
        mapping,
        "local-demand-support",
        content_role="support",
        collapsible=True,
        support_label="Abrir apoyo para esta tarea",
        purpose="Consulta esta pista en la escena actual y vuelve a intentar la demanda.",
    )
    block["data"].update(
        {
            "localSupportForSceneId": scene.get("id"),
            "localSupportForPhase": scene.get("phase"),
            "answerRevealing": False,
        }
    )
    return block


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
                "self": "Escucha una frase, consulta el sentido y cambia un dato.",
                "teacher": "Modela una ronda, comprueba significado y cambia un dato.",
            },
        }
    )


def _transfer_scene(lesson: dict[str, Any]) -> dict[str, Any] | None:
    return _find_scene(
        lesson,
        lambda scene: scene.get("phase") in {"transfer-speak", "transfer-speaking"},
    )


def _micro_backgrounds(lesson: dict[str, Any], fallback: str) -> tuple[str, str]:
    """Choose two unused approved painted environments for the new stages."""

    used = {
        _as_text(scene.get("background"))
        for scene in lesson.get("scenes", [])
        if isinstance(scene, dict) and _as_text(scene.get("background"))
    }
    available = [asset for asset in _APPROVED_BACKGROUND_POOL if asset not in used]
    selected = (available + [fallback, fallback])[:2]
    return selected[0], selected[1]


def _transfer_card_data(plan: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"label": row[0], "data": row[1], "pattern": row[2]}
        for row in plan["transferRows"]
    ]


def _transfer_data_summary(card_data: list[dict[str, str]]) -> str:
    return " / ".join(f"{card['label']}: {card['data']}" for card in card_data)


def _transfer_learning_modes(card_data: list[dict[str, str]]) -> dict[str, str]:
    summary = _transfer_data_summary(card_data)
    return {
        "individual": (
            "Elige una tarjeta visible en esta escena y usa solo sus datos nuevos: "
            f"{summary}. Completa el patrón opcional si te ayuda."
        ),
        "teacher": (
            "La docente modela una ronda con la tarjeta elegida, comprueba significado y datos, "
            "y deja que la persona cambie un dato."
        ),
    }


def _transfer_answer_prompts(unit_number: int, card_data: list[dict[str, str]]) -> list[str]:
    summary = _transfer_data_summary(card_data)
    focus = {
        1: "preséntate con el nombre y los datos de lugar que aparecen",
        2: "identifica la persona u objeto y su relación o pertenencia",
        3: "comparte el contacto u horario que aparecen",
        4: "pide repetición, aclara el día y confirma la sala o el día",
    }[unit_number]
    return [
        f"Elige una tarjeta de esta escena ({summary}); {focus} con sus datos nuevos.",
        "Usa el patrón opcional de la tarjeta, pide repetición si falta un dato y confirma la información.",
    ]


def _current_transfer_card(
    card_data: list[dict[str, str]],
    paired_production_block_id: str,
) -> dict[str, Any]:
    return {
        "kind": "new-information",
        "cards": deepcopy(card_data),
        "patternOptional": True,
        "pairedProductionBlockId": paired_production_block_id,
    }


def _rewrite_transfer_prompt(
    lesson: dict[str, Any],
    unit_number: int,
    plan: dict[str, Any],
    transfer_scene: dict[str, Any],
    mapping: list[dict[str, Any]],
) -> None:
    """Point oral and written production at the new data cards.

    The original model/prompt stays in provenance fields.  Every learner-facing
    production field is refreshed from the same local card payload so a stale
    source example cannot sit beside the new task.
    """

    card_id = f"a1teach-u{unit_number}-transfer-cards-v2"
    writing_card_id = f"a1teach-u{unit_number}-transfer-writing-cards-v2"
    card_data = _transfer_card_data(plan)
    transfer_card = _current_transfer_card(
        card_data,
        f"a1m1-u{unit_number}-transfer-speak-recording",
    )
    learning_modes = _transfer_learning_modes(card_data)
    checklist = deepcopy(_TRANSFER_CHECKLISTS[unit_number])
    answer_prompts = _transfer_answer_prompts(unit_number, card_data)
    transfer_scene["instruction"] = "Elige una tarjeta nueva, comunica sus datos y comprueba el significado."
    transfer_scene["transferCard"] = deepcopy(transfer_card)
    transfer_scene["routeModes"] = deepcopy(learning_modes)
    transfer_scene["reviewChecklist"] = deepcopy(checklist)
    for block in _scene_blocks(transfer_scene):
        block_id = _as_text(block.get("id"))
        if block_id.endswith("-prompt") and block.get("type") == "text":
            block["content"] = (
                "<p><strong>Consigna:</strong> Elige una tarjeta nueva y comunica solo sus datos.</p>"
                "<p>Completa los huecos del patrón opcional; después comprueba que la otra persona entendió.</p>"
                "<details><summary>Ver ejemplo de estructura</summary>"
                "<p>Pregunta, dato nuevo, confirmación. Cambia los huecos con la tarjeta elegida.</p></details>"
                "<details><summary>Guía docente</summary>"
                "<p>Escucha significado, datos y una reparación útil; no exige copiar un diálogo.</p></details>"
            )
            data = block.setdefault("data", {})
            data.setdefault("sourceTransferModel", data.get("originalEnglishModel", ""))
            data["transferCard"] = deepcopy(transfer_card)
            data["transferCardsBlockId"] = card_id
            data["reviewChecklist"] = deepcopy(checklist)
            data["teachingRevision"] = TEACHING_REVISION
            data["localSupportForSceneId"] = transfer_scene.get("id")
        elif block_id.endswith("-recording") and block.get("type") == "recording":
            block["prompt"] = (
                "Elige una tarjeta nueva y comunica sus datos durante 45–60 segundos. "
                "Usa el patrón opcional, pide repetición si falta un dato y confirma la información."
            )
            block["instruction"] = "Habla con la tarjeta nueva; la revisión es humana."
            data = block.setdefault("data", {})
            data["transferCardsBlockId"] = card_id
            data["transferCard"] = deepcopy(transfer_card)
            data["reviewChecklist"] = deepcopy(checklist)
            turns = data.get("conversationTurns")
            if isinstance(turns, list):
                for index, turn in enumerate(turns):
                    if not isinstance(turn, dict):
                        continue
                    turn["answerPrompt"] = answer_prompts[min(index, len(answer_prompts) - 1)]

    review_scene = _find_scene(lesson, lambda scene: scene.get("phase") in {"transfer-review", "transfer-writing"})
    if review_scene is None:
        return
    essay_id = next(
        (_as_text(block.get("id")) for block in _scene_blocks(review_scene) if block.get("type") == "essay"),
        f"a1m1-u{unit_number}-transfer-review-essay",
    )
    writing_card = _new_table_block(
        writing_card_id,
        review_scene,
        "Tarjetas nuevas para escribir",
        ["Tarjeta", "Datos nuevos", "Patrón opcional"],
        plan["transferRows"],
        mapping,
        "transfer-cards",
        content_role="production-support",
        purpose="Consulta estas tarjetas en esta misma escena y escribe con sus datos; no necesitas volver a la transferencia oral.",
    )
    writing_card["data"].update(
        {
            "pairedProductionBlockId": essay_id,
            "localForSceneId": review_scene.get("id"),
            "transferCard": deepcopy(transfer_card),
        }
    )
    _upsert_block(review_scene, writing_card)
    _move_block_before(review_scene, writing_card_id, essay_id)
    review_scene["instruction"] = "Elige una tarjeta visible aquí y escribe 2–4 frases con sus datos; la revisión es humana."
    review_scene["transferCard"] = deepcopy(transfer_card)
    review_scene["routeModes"] = deepcopy(learning_modes)
    review_scene["reviewChecklist"] = deepcopy(checklist)
    for block in _scene_blocks(review_scene):
        block_id = _as_text(block.get("id"))
        if block_id.endswith("-prompt") and block.get("type") == "text":
            block["content"] = (
                "<p><strong>Consigna:</strong> Elige una tarjeta visible aquí y escribe 2–4 frases con sus datos.</p>"
                "<details><summary>Guía docente</summary>"
                "<p>Revisa significado, datos y una forma útil; no hay calificación automática.</p></details>"
            )
            data = block.setdefault("data", {})
            data.setdefault("sourceTransferModel", data.get("originalEnglishModel", ""))
            data["transferCard"] = deepcopy(transfer_card)
            data["transferCardsBlockId"] = writing_card_id
            data["reviewChecklist"] = deepcopy(checklist)
            data["teachingRevision"] = TEACHING_REVISION
            data["localSupportForSceneId"] = review_scene.get("id")
        elif block_id.endswith("-essay") and block.get("type") == "essay":
            data = block.setdefault("data", {})
            data.setdefault("sourcePromptOriginal", block.get("prompt", ""))
            data.setdefault("sourceTransferModel", data.get("originalEnglishModel", ""))
            block["prompt"] = (
                "Escribe 2–4 frases en inglés con los datos de una tarjeta visible en esta escena. "
                "Incluye una comprobación o reparación breve si la necesitas."
            )
            data["learningModes"] = {
                "individual": "Usa una tarjeta; escribe y después revisa tu mensaje.",
                "teacher": "Tu profesora cambia un dato de la tarjeta y revisa tu mensaje.",
            }
            data["promptPresentedSeparately"] = True
            data["reviewChecklist"] = deepcopy(checklist)
            data["transferCard"] = deepcopy(transfer_card)
            data["transferCardsBlockId"] = writing_card_id
            data["teachingRevision"] = TEACHING_REVISION


def _sync_scene_plans(full: dict[str, Any]) -> None:
    """Keep sidecar scene/background plans aligned with new micro-scenes."""

    lessons_by_id = {
        _as_text(lesson.get("id")): lesson
        for lesson in full.get("lessons", [])
        if isinstance(lesson, dict)
    }
    assignment = full.get("backgroundAssignment")
    assignment_by_id = {
        _as_text(item.get("lessonId")): item
        for item in assignment.get("lessons", [])
        if isinstance(item, dict)
    } if isinstance(assignment, dict) and isinstance(assignment.get("lessons"), list) else {}
    for lesson_id, lesson in lessons_by_id.items():
        if lesson_id not in assignment_by_id:
            continue
        item = assignment_by_id[lesson_id]
        assets = [
            {"sceneId": _as_text(scene.get("id")), "src": _as_text(scene.get("background"))}
            for scene in lesson.get("scenes", [])
            if isinstance(scene, dict)
        ]
        item["sceneCount"] = len(assets)
        item["uniqueBackgroundCount"] = len({asset["src"] for asset in assets})
        item["scenes"] = assets
        catalog_size = item.get("catalogSize")
        if isinstance(catalog_size, int) and len(assets) > catalog_size:
            item["reused"] = True
            item["reuseReason"] = "More scenes than approved background assets; reuse remains intentional."
        else:
            item["reused"] = False
            item["reuseReason"] = None

    visual = full.get("visualAcceptanceManifest")
    scene_mapping = visual.get("lessonSceneMapping") if isinstance(visual, dict) else None
    if not isinstance(scene_mapping, dict):
        return
    for lesson_id, lesson in lessons_by_id.items():
        mapping = scene_mapping.get(lesson_id)
        if not isinstance(mapping, dict):
            continue
        mapping["sceneCount"] = len(lesson.get("scenes", []))
        mapping["sceneAssets"] = [
            {"sceneId": _as_text(scene.get("id")), "src": _as_text(scene.get("background"))}
            for scene in lesson.get("scenes", [])
            if isinstance(scene, dict)
        ]


def _make_transcript_optional(full: dict[str, Any]) -> None:
    """Describe transcript details as optional practice support, without fake gating."""

    unit_lesson_ids = {f"a1-general-u{unit}" for unit in _UNIT_NUMBERS}
    audio_manifest = full.get("audioManifest")
    listening_plan = audio_manifest.get("listeningPlan") if isinstance(audio_manifest, dict) else None
    if isinstance(listening_plan, list):
        for item in listening_plan:
            if not isinstance(item, dict) or item.get("lessonId") not in unit_lesson_ids:
                continue
            if "detailsHiddenUntilCheck" in item:
                item["detailsHiddenUntilCheck"] = False
            item["transcriptDisclosure"] = "visible-reference"
            item["answerPolicy"] = (
                "Intenta responder las preguntas si quieres; consulta la transcripción cuando la necesites "
                "para revisar significado y pronunciación."
            )
            item["readingMode"] = (
                "La transcripción queda disponible como apoyo de práctica; las preguntas siguen invitando "
                "a escuchar primero, sin bloquear la consulta."
            )

    for lesson in full.get("lessons", []):
        if not isinstance(lesson, dict) or lesson.get("id") not in unit_lesson_ids:
            continue
        for scene in lesson.get("scenes", []):
            if not isinstance(scene, dict) or scene.get("phase") not in {"listening-audio", "listening-check"}:
                continue
            phase = scene.get("phase")
            scene["transcriptDisclosure"] = "visible-reference"
            scene["transcriptSupportLabel"] = "Ver transcripción"
            if phase == "listening-audio":
                scene["instruction"] = (
                    "Escucha el audio, comprueba seis datos nuevos y consulta la transcripción cuando la necesites."
                )
            else:
                scene["instruction"] = (
                    "Intenta responder las seis preguntas nuevas; consulta la transcripción cuando la necesites."
                )
            for block in _scene_blocks(scene):
                data = block.setdefault("data", {})
                if "detailsHiddenUntilCheck" in data:
                    data["detailsHiddenUntilCheck"] = False
                if "transcriptDisclosure" in data:
                    data["transcriptDisclosure"] = "visible-reference"
                for field in ("content", "instruction", "prompt"):
                    value = block.get(field)
                    if not isinstance(value, str):
                        continue
                    replacements = {
                        "Después de comprobar tus respuestas, abre la transcripción.":
                            "Consulta la transcripción cuando la necesites para practicar.",
                        "Responde seis preguntas nuevas sobre el audio antes de ver la transcripción.":
                            "Intenta responder seis preguntas nuevas sobre el audio; consulta la transcripción cuando la necesites.",
                        "Escucha el audio; comprueba seis datos nuevos y abre la transcripción después.":
                            "Escucha el audio, comprueba seis datos nuevos y consulta la transcripción cuando la necesites.",
                        "Responde las seis preguntas nuevas antes de abrir la transcripción.":
                            "Intenta responder las seis preguntas nuevas; consulta la transcripción cuando la necesites.",
                    }
                    for old, new in replacements.items():
                        value = value.replace(old, new)
                    block[field] = value


def _revise_unit(lesson: dict[str, Any], unit_number: int) -> dict[str, Any]:
    plan = _PLANS[unit_number]
    teach_scene = _find_scene(lesson, lambda scene: scene.get("phase") == "unit-teach")
    if teach_scene is None:
        raise ValueError(f"Lesson {lesson.get('id')!r} has no unit-teach scene")

    micro_scene_ids = {
        f"a1m1-u{unit_number}-teaching-sounds-v2",
        f"a1m1-u{unit_number}-teaching-patterns-v2",
    }
    lesson["scenes"] = [scene for scene in lesson.get("scenes", []) if scene.get("id") not in micro_scene_ids]
    # Choose the same unused approved environments on every invocation.  The
    # previous generated stages are removed first so idempotent re-runs do not
    # consume a different pair of backgrounds.
    sounds_asset, patterns_asset = _micro_backgrounds(lesson, _as_text(teach_scene.get("background")))
    _remove_blocks_with_prefixes(
        lesson,
        (
            f"a1teach-u{unit_number}-pronunciation-v2",
            f"a1teach-u{unit_number}-grammar-v2",
            f"a1teach-u{unit_number}-substitution-v2",
            f"a1teach-u{unit_number}-support-",
        ),
    )
    mapping = _source_mapping(unit_number, lesson, plan["forms"])
    teach_scene = _find_scene(lesson, lambda scene: scene.get("phase") == "unit-teach")
    assert teach_scene is not None
    teach_scene["instruction"] = plan["sceneInstruction"]
    teach_scene["teachingRevision"] = TEACHING_REVISION
    teach_scene["teachingStage"] = "model-meaning"
    teach_scene["teachingSequence"] = list(mapping[0]["sequence"])
    teach_scene["sourceTeachingToDemand"] = deepcopy(mapping)

    _update_original_teaching_text(teach_scene, plan, mapping)
    support = next(
        (block for block in _scene_blocks(teach_scene) if block.get("id") == f"{teach_scene.get('id')}-language-support"),
        None,
    )
    if support is not None:
        _merge_support_rows(support, plan["languageRows"], mapping)

    sound_scene_id = f"a1m1-u{unit_number}-teaching-sounds-v2"
    sound_mapping = deepcopy(mapping)
    sound_mapping[0]["sequence"] = ["model-meaning", "pronunciation"]
    sound_scene = _new_micro_scene(
        lesson,
        teach_scene,
        sound_scene_id,
        "unit-teach-pronunciation",
        "Sonidos útiles",
        "Escucha cada frase breve, separa la palabra clave y repítela con un dato nuevo.",
        sound_mapping,
        [f"module1.unit{unit_number}.teaching.pronunciation.v2"],
        "pronunciation",
        [],
        sounds_asset,
    )
    _upsert_block(
        sound_scene,
        _new_title_block(
            f"a1teach-u{unit_number}-sounds-title-v2",
            sound_scene,
            "Sonidos útiles",
            sound_mapping,
            "pronunciation-stage",
        ),
    )
    _upsert_block(
        sound_scene,
        _new_text_block(
            f"a1teach-u{unit_number}-sounds-instruction-v2",
            sound_scene,
            "Sonidos útiles",
            f"<p><strong>Rutina:</strong> Escucha, separa, repite y cambia un dato. "
            f"<strong>Sentido:</strong> {_html_text(plan['meaning'])}</p>",
            sound_mapping,
            "pronunciation-routine",
        ),
    )
    _upsert_block(sound_scene, _new_pronunciation_block(unit_number, sound_scene, sound_mapping))

    patterns_scene_id = f"a1m1-u{unit_number}-teaching-patterns-v2"
    pattern_mapping = deepcopy(mapping)
    pattern_mapping[0]["sequence"] = ["pronunciation", "functional-grammar", "guided-substitution"]
    patterns_scene = _new_micro_scene(
        lesson,
        teach_scene,
        patterns_scene_id,
        "unit-teach-patterns",
        "Patrones útiles",
        "Mira el patrón, sustituye un dato y prepara una tarjeta nueva.",
        pattern_mapping,
        [f"module1.unit{unit_number}.teaching.patterns.v2"],
        "patterns-substitution",
        [],
        patterns_asset,
    )
    _upsert_block(
        patterns_scene,
        _new_title_block(
            f"a1teach-u{unit_number}-patterns-title-v2",
            patterns_scene,
            "Patrones útiles",
            pattern_mapping,
            "patterns-stage",
        ),
    )
    _upsert_block(
        patterns_scene,
        _new_text_block(
            f"a1teach-u{unit_number}-patterns-instruction-v2",
            patterns_scene,
            "Patrones útiles",
            "<p><strong>Ruta:</strong> Elige un patrón, cambia un solo dato y comprueba el significado antes de producir.</p>",
            pattern_mapping,
            "patterns-routine",
        ),
    )
    _upsert_block(
        patterns_scene,
        _new_table_block(
            f"a1teach-u{unit_number}-grammar-v2",
            patterns_scene,
            "Patrones útiles",
            ["Patrón", "Para qué sirve", "Ejemplo"],
            plan["grammarRows"],
            pattern_mapping,
            "functional-grammar",
            purpose="Usa el patrón para comunicar el dato de la tarjeta.",
        ),
    )
    _upsert_block(
        patterns_scene,
        _new_table_block(
            f"a1teach-u{unit_number}-substitution-v2",
            patterns_scene,
            "Sustitución guiada",
            ["Base", "Cambia solo", "Di"],
            plan["substitutionRows"][1:],
            pattern_mapping,
            "guided-substitution",
            purpose="Haz una modificación cada vez; después usa una tarjeta nueva.",
        ),
    )

    teach_index = next(index for index, scene in enumerate(lesson["scenes"]) if scene.get("id") == teach_scene.get("id"))
    lesson["scenes"][teach_index + 1 : teach_index + 1] = [sound_scene, patterns_scene]

    transfer_scene = _transfer_scene(lesson)
    if transfer_scene is not None:
        transfer_mapping = deepcopy(mapping)
        transfer_mapping[0]["sequence"] = ["guided-substitution", "transfer"]
        card = _new_table_block(
            f"a1teach-u{unit_number}-transfer-cards-v2",
            transfer_scene,
            "Tarjetas nuevas para producir",
            ["Tarjeta", "Datos nuevos", "Patrón opcional"],
            plan["transferRows"],
            transfer_mapping,
            "transfer-cards",
            content_role="production-support",
            purpose="Usa una tarjeta nueva junto al micrófono; completa los huecos solo si los necesitas.",
        )
        card["data"]["pairedProductionBlockId"] = next(
            (_as_text(block.get("id")) for block in _scene_blocks(transfer_scene) if block.get("type") == "recording"),
            "",
        )
        _rewrite_transfer_prompt(lesson, unit_number, plan, transfer_scene, transfer_mapping)
        _upsert_block(transfer_scene, card)
        recording_id = card["data"].get("pairedProductionBlockId", "")
        _move_block_before(transfer_scene, card["id"], _as_text(recording_id))

    # Every existing demand gets its own recoverable cue.  It stays local to
    # the scene, so the learner does not need to navigate back to the teaching
    # screen and the original auto-check/auto-advance controls remain intact.
    demand_phases = {"listening-check", "comprehension", "practice", "transfer-speaking", "transfer-writing", "transfer-speak", "transfer-review"}
    for scene in lesson.get("scenes", []):
        phase = _as_text(scene.get("phase"))
        if phase not in demand_phases:
            continue
        suffix = _as_text(scene.get("id")).replace(f"a1m1-u{unit_number}-", "")
        rows = _LOCAL_SUPPORT[unit_number].get(suffix) or _LOCAL_SUPPORT[unit_number].get(phase)
        if not rows:
            continue
        local_mapping = deepcopy(mapping)
        local_mapping[0]["sequence"] = ["local-support", phase]
        _upsert_block(scene, _new_local_support_block(unit_number, scene, rows, local_mapping))

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
    guidance["microScenesPerUnit"] = ["unit-teach-pronunciation", "unit-teach-patterns"]
    guidance["localDemandSupport"] = "Each listening-check, comprehension, practice, and transfer scene carries its own collapsed support block."
    guidance["transcriptAccess"] = "Unit listening transcripts remain available as optional practice support; questions invite a first attempt without blocking consultation."
    guidance["teachingPresentation"] = {
        "pronunciation": "vocabulary items carry a verified pronunciation asset; the parent renderer owns playback",
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

    _make_transcript_optional(full)
    _sync_scene_plans(full)

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
