"""Pedagogical post-processing for the A1 starter lesson.

The compiler intentionally keeps the starter source model small.  This module
adds the learner-visible teaching that must precede each of its checks after
the verified pilot audio has been integrated.  It mutates the compiler's
internal ``full`` artifact in place so the public projection can still be
created by the existing compiler.
"""

from __future__ import annotations

from copy import deepcopy
from html import escape
from typing import Any


STARTER_LESSON_ID = "a1-general-start"
AUDIO_ROOT = "/audio/a1-module1-pilot/"
_PILOT_REVISION = "a1-module1-pilot-v1"
_LEARNING_REVISION = "course-guided-v1"
_TEACHING_REVISION = "a1-teaching-v2"
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
    _audio_spec("teach-start-s5-transfer-letter-l-v2.mp3", "The letter L.", "starter.S5.transfer.teaching.letters.L"),
    _audio_spec("teach-start-s5-transfer-letter-u-v2.mp3", "The letter U.", "starter.S5.transfer.teaching.letters.U"),
    _audio_spec("teach-start-s5-transfer-letter-i-v2.mp3", "The letter I.", "starter.S5.transfer.teaching.letters.I"),
    _audio_spec("teach-start-s5-transfer-letter-v-v2.mp3", "The letter V.", "starter.S5.transfer.teaching.letters.V"),
    _audio_spec("teach-start-s5-transfer-letter-g-v2.mp3", "The letter G.", "starter.S5.transfer.teaching.letters.G"),
    _audio_spec("teach-start-s5-transfer-thursday-v2.mp3", "Thursday.", "starter.S5.transfer.teaching.day"),
    _audio_spec("teach-start-s5-transfer-seven-v2.mp3", "Seven.", "starter.S5.transfer.teaching.time"),
    _audio_spec("teach-start-s5-transfer-room-105-v2.mp3", "Room one oh five.", "starter.S5.transfer.teaching.room"),
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
            "teachingRevision": _TEACHING_REVISION,
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


_MASTER_MODELS: dict[str, str] = {
    "S1": "Hello. I’m Ana. My name is Ana.",
    "S2": "My name is Ana Torres. A-N-A T-O-R-R-E-S.",
    "S3": "My phone number is five five five, zero one four two. Room 204.",
    "S4": "I’m from Peru. I live in Lima.",
    "S5": "Hi, I’m Ana. I’m from Peru. See you on Tuesday at six in room 204.",
}


_GROUP_EXPLANATIONS: dict[str, str] = {
    "a1teach-start-s1-pronunciation": "Hello saluda. I’m + nombre y My name is + nombre presentan a una persona.",
    "a1teach-start-s2-pronunciation-first-name": "Escucha A y N por separado y júntalas para leer ANA.",
    "a1teach-start-s2-pronunciation-last-name": "Escucha T, O y R por separado. Mantén ese orden al empezar TORRES.",
    "a1teach-start-s2-pronunciation-last-name-end": "Escucha E y S para terminar TORRES; una letra ocupa cada paso.",
    "a1teach-start-s2-pronunciation-other-letters": "J, X y Y son nombres de letra para reconocer en las comprobaciones.",
    "a1teach-start-s2-pronunciation-z": "Z es el nombre de la última letra de esta secuencia.",
    "a1teach-start-s3-pronunciation-digits-0-2": "Un teléfono se dice dígito por dígito; escucha y repite cada número.",
    "a1teach-start-s3-pronunciation-digits-3-5": "Continúa el teléfono con un dígito cada vez y conserva el orden.",
    "a1teach-start-s3-pronunciation-digits-6-8": "Escucha estos dígitos y sepáralos cuando formen un dato.",
    "a1teach-start-s3-pronunciation-digit-9": "Nine nombra el dígito 9; úsalo cuando aparezca en un dato.",
    "a1teach-start-s3-pronunciation-time": "Eighteen es 18 y six p.m. expresa las seis de la tarde.",
    "a1teach-start-s3-pronunciation-room-phone": "Room 204 se lee two oh four; un teléfono se dice por dígitos.",
    "a1teach-start-s4-pronunciation": "I’m from + país expresa origen. I live in + ciudad expresa dónde vives.",
    "a1teach-start-s5-pronunciation-opening": "Empieza con el nombre, el origen y See you on + día.",
    "a1teach-start-s5-pronunciation-closing": "Termina con at + hora e in room + número para dar los datos de la cita.",
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
        [["Hello.", "saludo"], ["I’m + nombre", "presentación"], ["My name is + nombre", "presentación"]],
        [["I’m + nombre", "marco para el nombre"], ["Nombre", "un dato personal"]],
        [["My name is + nombre", "marco para el nombre"], ["name", "palabra clave"]],
    ],
    "S2": [
        [["Nombre", "separa una letra por casilla"], ["Escucha", "repite la letra"]],
        [["Apellido", "mantén el orden"], ["Letras", "una por una"]],
        [["Apellido", "comprueba el final"], ["Orden", "no cambies las posiciones"]],
        [["Deletrear", "di las letras por separado"], ["Espacios", "separa sin añadir letras"]],
        [["Letra desconocida", "escucha el ejemplo"], ["Alfabeto", "busca la letra"]],
        [["Letra desconocida", "escucha el ejemplo"], ["Alfabeto", "busca la letra"]],
    ],
    "S3": [
        [["Aula", "lee los dígitos en orden"], ["Número", "di cada parte"]],
        [["Hora", "usa número + a.m./p.m."], ["Reloj", "relaciona hora y momento"]],
        [["Teléfono", "di cada dígito"], ["Pausa", "separa los grupos"]],
        [["Hora", "distingue a.m. y p.m."], ["Momento", "mañana o tarde/noche"]],
        [["Aula", "lee el número por partes"], ["Room", "di primero la palabra"]],
        [["a.m. / p.m.", "indica el momento"], ["Hora", "usa un marco completo"]],
    ],
    "S4": [
        [["I’m from + país", "origen"], ["from", "palabra para el origen"]],
        [["I live in + ciudad", "residencia"], ["live in", "palabras para la ciudad"]],
        [["from / live in", "elige la función"], ["País / ciudad", "distingue el dato"]],
    ],
    "S5": [
        [["Name", "elige el nombre"], ["Origin", "elige el origen"], ["Day", "elige el día"]],
        [["Room", "usa in room + número"], ["Time", "usa at + hora"], ["Dato", "consulta la ficha"]],
        [["I’m + nombre", "nombre"], ["I’m from + país", "origen"], ["See you on + día", "despedida"]],
        [["Day", "día"], ["Time", "hora"], ["Room", "aula"]],
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


_TRANSFER_VOCABULARY_GROUPS: tuple[dict[str, Any], ...] = (
    {
        "id": "a1teach-start-s5-transfer-pronunciation-letters-1",
        "title": "Letras nuevas del nombre Luis",
        "group": "L-U-I",
        "explanation": "Escucha L, U e I por separado. S ya apareció en el apellido del modelo; ahora combina las letras de Luis.",
        "items": [
            _spec_item("a1teach-start-s5-transfer-letter-l", "L", "letra nueva para Luis", "teach-start-s5-transfer-letter-l-v2.mp3"),
            _spec_item("a1teach-start-s5-transfer-letter-u", "U", "letra nueva para Luis", "teach-start-s5-transfer-letter-u-v2.mp3"),
            _spec_item("a1teach-start-s5-transfer-letter-i", "I", "letra nueva para Luis", "teach-start-s5-transfer-letter-i-v2.mp3"),
        ],
    },
    {
        "id": "a1teach-start-s5-transfer-pronunciation-letters-2",
        "title": "Letras nuevas del apellido Vega",
        "group": "V-G",
        "explanation": "Escucha V y G por separado. Únelas con las letras ya conocidas para leer Vega.",
        "items": [
            _spec_item("a1teach-start-s5-transfer-letter-v", "V", "letra nueva para Vega", "teach-start-s5-transfer-letter-v-v2.mp3"),
            _spec_item("a1teach-start-s5-transfer-letter-g", "G", "letra nueva para Vega", "teach-start-s5-transfer-letter-g-v2.mp3"),
        ],
    },
    {
        "id": "a1teach-start-s5-transfer-pronunciation-data",
        "title": "Sonidos de los datos nuevos",
        "group": "día, hora y aula",
        "explanation": "Escucha los datos nuevos y usa los marcos conocidos: See you on + día, at + hora, in room + número.",
        "items": [
            _spec_item("a1teach-start-s5-transfer-thursday", "Thursday", "día nuevo", "teach-start-s5-transfer-thursday-v2.mp3"),
            _spec_item("a1teach-start-s5-transfer-seven", "seven", "hora nueva", "teach-start-s5-transfer-seven-v2.mp3"),
            _spec_item("a1teach-start-s5-transfer-room-105", "one oh five", "Room 105", "teach-start-s5-transfer-room-105-v2.mp3"),
        ],
    },
)


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


def _group_explanation(group: dict[str, Any]) -> str:
    return str(group.get("explanation") or _GROUP_EXPLANATIONS.get(str(group.get("id")), "Escucha el ejemplo y repite antes de responder."))


def _make_vocabulary_block(
    scene: dict[str, Any],
    group: dict[str, Any],
    refs: list[str],
) -> dict[str, Any]:
    vocab = _block(
        scene,
        str(group["id"]),
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
            "pronunciationSource": "starter_audio_specs",
            "learnerVisible": True,
            "audioKind": "planned-synthetic-teaching",
            "teachingStage": "before-demand",
        }
    )
    # A prior revision used this policy label.  It was a string metadata field,
    # rather than a source of truth for the clips, so remove it when reusing a
    # block from that revision.
    vocab["data"].pop("audioUrlPolicy", None)
    vocab["data"].pop("audioSource", None)
    return vocab


def _clean_master_text(scene: dict[str, Any], activity_id: str) -> None:
    """Keep the original model as a short learner-facing model only.

    The source compiler embeds a long teacher details panel in this block.  A
    self-directed learner needs the model, while the teacher guidance remains
    available through metadata and the teacher route.
    """

    block_id = f"a1m1-start-{activity_id.lower()}-teach-text"
    block = next((item for item in _runtime_blocks(scene) if item.get("id") == block_id), None)
    if not isinstance(block, dict):
        return
    data = block.setdefault("data", {})
    model = data.get("originalEnglishModel") or data.get("modelText") or _MASTER_MODELS[activity_id]
    model = str(model)
    data.update(
        {
            "originalEnglishModel": model,
            "contentRole": "model",
            "pedagogicalFunction": "model",
            "teacherGuideRole": "complement",
            "learnerVisible": True,
            "teachingStage": "model",
            "teachingRevision": _TEACHING_REVISION,
        }
    )
    block["content"] = f"<p><strong>Modelo:</strong> {escape(model, quote=False)}</p>"
    block.pop("teacherReadScript", None)
    block.pop("prompt", None)


def _make_micro_scene(
    lesson: dict[str, Any],
    source_scene: dict[str, Any],
    activity_id: str,
    group: dict[str, Any],
    ordinal: int,
) -> dict[str, Any]:
    scene_id = f"a1teach-start-{activity_id.lower()}-micro-{ordinal}"
    refs = _source_refs(source_scene, f"starter.{activity_id}.teaching")
    title = str(group["title"])
    background = source_scene.get("background") or source_scene.get("backgroundSrc") or ""
    scene: dict[str, Any] = {
        "id": scene_id,
        "lessonId": lesson.get("id", STARTER_LESSON_ID),
        "order": 0,
        "phase": "starter-teach-micro",
        "title": title,
        "instruction": "Escucha el grupo breve y repítelo antes de continuar.",
        "route": "learner",
        "sourceRefs": refs,
        "interactiveCount": 0,
        "runtimeBlockIds": [],
        "runtimeBlocks": [],
        "background": background,
        "backgroundSrc": source_scene.get("backgroundSrc", background),
        "sceneSide": source_scene.get("sceneSide", "right"),
        "routeModes": deepcopy(source_scene.get("routeModes", {})),
        "activityId": activity_id,
        "pedagogicalStage": "teach",
        "learnerVisibleTeaching": True,
        "teachingRevision": _TEACHING_REVISION,
        "microTeaching": True,
    }
    blocks = _runtime_blocks(scene)
    explanation_id = f"{scene_id}-explanation"
    explanation = _block(
        scene,
        explanation_id,
        "text",
        title,
        "teaching",
        refs,
        format="html",
        content=f"<p><strong>Aprende:</strong> {escape(_group_explanation(group), quote=False)}</p>",
    )
    explanation["data"].update(
        {
            "teachingStage": "micro-before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "brief-functional-explanation",
        }
    )
    blocks.append(explanation)
    scene_vocab = _make_vocabulary_block(scene, group, refs)
    blocks.append(scene_vocab)
    scene["teachingBlockIds"] = [explanation_id, scene_vocab["id"]]
    scene["runtimeBlockIds"] = [block["id"] for block in blocks]
    return scene


def _remove_block_id_from_all_scenes(lesson: dict[str, Any], block_id: str) -> dict[str, Any] | None:
    found: dict[str, Any] | None = None
    for candidate_scene in lesson.get("scenes", []):
        if not isinstance(candidate_scene, dict):
            continue
        blocks = _runtime_blocks(candidate_scene)
        kept: list[dict[str, Any]] = []
        for block in blocks:
            if isinstance(block, dict) and block.get("id") == block_id:
                found = block
            else:
                kept.append(block)
        candidate_scene["runtimeBlocks"] = kept
    return found


def _insert_micro_scene_after(lesson: dict[str, Any], source_scene: dict[str, Any], micro_scene: dict[str, Any]) -> None:
    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        return
    if any(isinstance(scene, dict) and scene.get("id") == micro_scene.get("id") for scene in scenes):
        return
    source_index = next((index for index, scene in enumerate(scenes) if scene is source_scene), None)
    if source_index is None:
        scenes.append(micro_scene)
    else:
        # Keep ordinal micro-scenes in teaching order when each is inserted
        # against the same original scene.
        insert_at = source_index + 1
        while insert_at < len(scenes):
            candidate = scenes[insert_at]
            if not isinstance(candidate, dict) or not str(candidate.get("id", "")).startswith(
                f"a1teach-start-{micro_scene.get('activityId', '').lower()}-micro-"
            ):
                break
            insert_at += 1
        scenes.insert(insert_at, micro_scene)


def _add_teaching_scene_blocks(lesson: dict[str, Any], scene: dict[str, Any], activity_id: str) -> None:
    """Build one small teaching unit per pronunciation group.

    The original teaching scene keeps one explanation and the first group.  A
    later group gets its own illustrated micro-scene, so the learner sees one
    short presentation before the related checks instead of a list of all
    letters or numbers at once.
    """

    blocks = _runtime_blocks(scene)
    refs = _source_refs(scene, f"starter.{activity_id}.teaching")
    title = str(scene.get("title", f"S{activity_id}"))
    _clean_master_text(scene, activity_id)

    teaching_id = f"a1teach-start-{activity_id.lower()}-explicit"
    teaching_block = next((item for item in blocks if item.get("id") == teaching_id), None)
    if not isinstance(teaching_block, dict):
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
        title_index = next((i for i, item in enumerate(blocks) if item.get("type") == "title"), -1)
        _insert_once(blocks, teaching_block, title_index + 1)
    teaching_block["data"].update(
        {
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "explicit-meaning-and-form",
            "teachingRevision": _TEACHING_REVISION,
        }
    )

    # Remove all prior generated vocabulary copies before distributing the
    # stable group blocks.  Their IDs are retained and moved to the appropriate
    # scene when possible.
    existing_groups: dict[str, dict[str, Any]] = {}
    for group in _VOCABULARY_GROUPS[activity_id]:
        group_id = str(group["id"])
        prior = _remove_block_id_from_all_scenes(lesson, group_id)
        if isinstance(prior, dict):
            existing_groups[group_id] = prior

    inserted_micro_ids: list[str] = []
    for index, group in enumerate(_VOCABULARY_GROUPS[activity_id]):
        destination = scene
        if index > 0:
            micro_id = f"a1teach-start-{activity_id.lower()}-micro-{index}"
            existing_micro = next(
                (
                    candidate
                    for candidate in lesson.get("scenes", [])
                    if isinstance(candidate, dict) and candidate.get("id") == micro_id
                ),
                None,
            )
            if isinstance(existing_micro, dict):
                destination = existing_micro
                destination["runtimeBlocks"] = [
                    block
                    for block in _runtime_blocks(destination)
                    if block.get("id") not in {str(group["id"]), f"{micro_id}-vocabulary"}
                ]
            else:
                destination = _make_micro_scene(lesson, scene, activity_id, group, index)
                _insert_micro_scene_after(lesson, scene, destination)
            inserted_micro_ids.append(micro_id)
        dest_blocks = _runtime_blocks(destination)
        vocab = existing_groups.get(str(group["id"])) or _make_vocabulary_block(destination, group, refs)
        vocab["data"].update(
            {
                "pilotSceneId": destination.get("id"),
                "guidedTitle": str(group["title"]),
                "scene": destination.get("background") or destination.get("backgroundSrc") or "",
                "sceneSide": destination.get("sceneSide", "right"),
                "contentRole": "teaching",
                "teachingPresentation": "pronunciation",
                "pronunciationSource": "starter_audio_specs",
                "teachingRevision": _TEACHING_REVISION,
                "learnerVisible": True,
                "pedagogicalFunction": "teach",
                "teachingStage": "before-demand",
            }
        )
        vocab["data"].pop("audioUrlPolicy", None)
        vocab["data"].pop("audioSource", None)
        if not any(block.get("id") == vocab.get("id") for block in dest_blocks):
            if destination is scene:
                content_index = next(
                    (i for i, block in enumerate(dest_blocks) if block.get("type") in {"structured-content", "audio"}),
                    len(dest_blocks),
                )
                dest_blocks.insert(content_index, vocab)
            else:
                dest_blocks.append(vocab)
        destination["teachingRevision"] = _TEACHING_REVISION
        destination["pedagogicalStage"] = "teach"
        destination["learnerVisibleTeaching"] = True
        destination["teachingBlockIds"] = [
            block["id"]
            for block in dest_blocks
            if block.get("data", {}).get("pedagogicalFunction") == "teach"
            and block.get("type") in {"text", "vocabulary"}
        ]
        destination["runtimeBlockIds"] = [block["id"] for block in dest_blocks]

    # The first group belongs to the original teaching scene.  Ensure the old
    # scene does not accidentally retain a copy from a prior revision.
    scene["teachingBlockIds"] = [
        block["id"]
        for block in _runtime_blocks(scene)
        if block.get("data", {}).get("pedagogicalFunction") == "teach"
        and block.get("type") in {"text", "vocabulary"}
    ]
    scene["pedagogicalStage"] = "teach"
    scene["learnerVisibleTeaching"] = True
    scene["teachingRevision"] = _TEACHING_REVISION


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
            "teachingRevision": _TEACHING_REVISION,
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
            "teachingRevision": _TEACHING_REVISION,
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
    # A prior revision added a teaching paragraph before every check.  Keep its
    # stable ID for migrations, but retire the repeated learner-visible copy:
    # the teaching micro-scenes above already do that job.  The local help
    # below is optional and points to a strategy, not to the answer.
    prior_teaching = next((block for block in blocks if block.get("id") == teaching_id), None)
    if isinstance(prior_teaching, dict):
        prior_teaching["content"] = ""
        prior_teaching.pop("teacherReadScript", None)
        prior_data = prior_teaching.setdefault("data", {})
        prior_data.update(
            {
                "contentRole": "teacher-support",
                "pedagogicalFunction": "practice-support",
                "teachingStage": "retired-duplicate",
                "learnerVisible": False,
                "archivedTeaching": True,
                "teacherGuideRole": "complement",
                "teachingRevision": _TEACHING_REVISION,
            }
        )

    help_id = f"a1teach-start-{activity_id.lower()}-check-{practice_index}-help"
    help_block = next((block for block in blocks if block.get("id") == help_id), None)
    if not isinstance(help_block, dict):
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
    elif isinstance(help_block.get("content"), dict):
        help_block["content"].update(
            {"headers": ["Expresión o dato", "Ayuda breve"], "rows": _practice_rows(activity_id, practice_index)}
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
            "teachingRevision": _TEACHING_REVISION,
        }
    )
    help_block["data"].pop("relatedAudioUrl", None)
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
                        "audioKind": "practice-reference",
                        "gradedListening": False,
                    }
                )
                _insert_before_interactive(blocks, clone)
                help_block["data"]["referenceAudioBlockId"] = clone["id"]

    scene["teachingBlockIds"] = []
    scene["supportBlockIds"] = [help_id]
    scene["pedagogicalStage"] = "practice"
    scene["learnerVisibleTeaching"] = False
    scene["teachingRevision"] = _TEACHING_REVISION

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


_TRANSFER_DATA = {
    "Name": "Luis Vega",
    "Origin": "Chile",
    "Day": "Thursday",
    "Time": "7 p.m.",
    "Room": "Room 105",
}
_TRANSFER_MODEL = "Hi, I’m Ana. I’m from Peru. See you on Tuesday at six in room 204."
_TRANSFER_ANSWER = "Hi, I'm Luis Vega. I'm from Chile. See you on Thursday at seven in room 105."
_TRANSFER_FRAME = "Completa con los datos de la ficha: Hi, I'm ___. I'm from ___. See you on ___ at ___ in room ___."


def _transfer_card_rows() -> list[list[str]]:
    return [[key, value] for key, value in _TRANSFER_DATA.items()]


def _transfer_help_rows() -> list[list[str]]:
    return [
        ["nombre", "I’m + nombre."],
        ["origen", "I’m from + país."],
        ["despedida y día", "See you on + día."],
        ["hora", "at + hora."],
        ["aula", "in room + número."],
    ]


def _new_transfer_scene(lesson: dict[str, Any], source_scene: dict[str, Any]) -> dict[str, Any]:
    background = source_scene.get("background") or source_scene.get("backgroundSrc") or ""
    scene: dict[str, Any] = {
        "id": "a1teach-start-s5-transfer",
        "lessonId": lesson.get("id", STARTER_LESSON_ID),
        "order": 0,
        "phase": "starter-transfer",
        "title": "Transferencia · datos nuevos",
        "instruction": "Usa la ficha digital y escribe un mensaje breve con datos nuevos.",
        "route": "learner",
        "sourceRefs": ["starter.S5.transfer.revised"],
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
        "transferData": deepcopy(_TRANSFER_DATA),
        "teachingRevision": _TEACHING_REVISION,
    }
    _revise_transfer_scene(scene)
    return scene


def _revise_transfer_scene(scene: dict[str, Any]) -> None:
    """Give the transfer scene a new data card and a known model.

    The known Ana example teaches the frame; the visible Luis card provides
    values that the learner must assemble.  The completed Luis sentence stays
    in the answer key only, so the task remains transfer rather than copying.
    """

    title = "Transferencia · datos nuevos"
    refs = _source_refs(scene, "starter.S5.transfer.revised")
    scene.update(
        {
            "phase": "starter-transfer",
            "title": title,
            "instruction": "Usa la ficha digital y escribe un mensaje breve con datos nuevos.",
            "activityId": "S5",
            "pedagogicalStage": "transfer",
            "learnerVisibleTeaching": True,
            "transferData": deepcopy(_TRANSFER_DATA),
            "teachingRevision": _TEACHING_REVISION,
        }
    )
    blocks = _runtime_blocks(scene)
    title_block = next((block for block in blocks if block.get("id") == "a1teach-start-s5-transfer-title"), None)
    if not isinstance(title_block, dict):
        title_block = _block(scene, "a1teach-start-s5-transfer-title", "title", title, "transfer", refs, title=title)
        blocks.append(title_block)

    teaching = next((block for block in blocks if block.get("id") == "a1teach-start-s5-transfer-teaching"), None)
    if not isinstance(teaching, dict):
        teaching = _block(
            scene,
            "a1teach-start-s5-transfer-teaching",
            "text",
            title,
            "teaching",
            refs,
            format="html",
            content="",
        )
        blocks.append(teaching)
    teaching["content"] = (
        f"<p><strong>Modelo conocido:</strong> {escape(_TRANSFER_MODEL, quote=False)}</p>"
        "<p><strong>Ahora:</strong> cambia cada dato con la ficha nueva y completa el marco.</p>"
    )
    teaching["data"].update(
        {
            "contentRole": "teaching",
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "known-model-before-transfer",
            "modelText": _TRANSFER_MODEL,
            "teachingRevision": _TEACHING_REVISION,
        }
    )
    teaching.pop("teacherReadScript", None)

    card = next((block for block in blocks if block.get("id") == "a1teach-start-s5-transfer-card"), None)
    if not isinstance(card, dict):
        card = _block(
            scene,
            "a1teach-start-s5-transfer-card",
            "structured-content",
            "Ficha digital de Luis Vega",
            "transfer-material",
            refs,
            title="Ficha digital de Luis Vega",
            config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
            content={"headers": ["Dato", "Valor"], "rows": _transfer_card_rows()},
        )
        blocks.append(card)
    card["title"] = "Ficha digital de Luis Vega"
    card["content"] = {"headers": ["Dato", "Valor"], "rows": _transfer_card_rows()}
    card["data"].update(
        {
            "cardKind": "data-card",
            "materialKind": "digital-data-card",
            "materialAvailability": "learner-visible-runtime",
            "learnerVisible": True,
            "transferFields": ["name", "origin", "day", "time", "room"],
            "teachingRevision": _TEACHING_REVISION,
        }
    )

    help_block = next((block for block in blocks if block.get("id") == "a1teach-start-s5-transfer-help"), None)
    if not isinstance(help_block, dict):
        help_block = _block(
            scene,
            "a1teach-start-s5-transfer-help",
            "structured-content",
            "Ayuda local para transferir",
            "support",
            refs,
            title="Ayuda local para transferir",
            config={"hasHeaderRow": True, "hasStripedRows": True, "hasBorders": True},
            content={"headers": ["Función", "Marco útil"], "rows": _transfer_help_rows()},
        )
        blocks.append(help_block)
    help_block["content"] = {"headers": ["Función", "Marco útil"], "rows": _transfer_help_rows()}
    help_block["data"].update(
        {
            "supportLabel": "Abrir ayuda local para transferir",
            "collapsible": True,
            "supportPurpose": "Consulta un marco breve después de intentar la respuesta.",
            "localPracticeHelp": True,
            "availableBeforeDemand": True,
            "pedagogicalFunction": "transfer-support",
            "materialKind": "digital-reference-table",
            "materialAvailability": "learner-visible-runtime",
            "teachingRevision": _TEACHING_REVISION,
        }
    )

    transfer = next((block for block in blocks if block.get("id") == "a1teach-start-s5-transfer-practice"), None)
    if not isinstance(transfer, dict):
        transfer = _block(
            scene,
            "a1teach-start-s5-transfer-practice",
            "short_answer",
            title,
            "transfer-practice",
            refs,
            items=[],
            caseSensitive=False,
            explanation="Comprueba que cada dato de la ficha aparece en el mensaje.",
            hint="Usa I’m…, I’m from…, See you on…, at… e in room… en ese orden.",
            points=1,
        )
        blocks.append(transfer)
    item = next((candidate for candidate in transfer.get("items", []) if isinstance(candidate, dict)), None)
    if not isinstance(item, dict):
        item = {"id": "a1teach-start-s5-transfer-practice-item-1"}
        transfer.setdefault("items", []).append(item)
    item.update(
        {
            "question": _TRANSFER_FRAME,
            "correctAnswer": _TRANSFER_ANSWER,
            "acceptedAnswers": [_TRANSFER_ANSWER, _TRANSFER_ANSWER.replace("I'm", "I’m")],
            "sourceKey": refs[0],
            "sourceType": "transfer",
        }
    )
    transfer.update(
        {
            "caseSensitive": False,
            "explanation": "Comprueba que cada dato de la ficha aparece en el mensaje.",
            "hint": "Usa I’m…, I’m from…, See you on…, at… e in room… en ese orden.",
            "points": 1,
        }
    )
    transfer["data"].update(
        {
            "answerLayout": "freeText",
            "pedagogicalFunction": "transfer",
            "transferData": deepcopy(_TRANSFER_DATA),
            "autoCheck": True,
            "autoAdvance": True,
            "manualNext": False,
            "teacherReviewOnly": False,
            "aiGrading": False,
            "doNotAutoGrade": False,
            "modelAnswer": _TRANSFER_ANSWER,
            "learnerVisibleModel": _TRANSFER_MODEL,
            "teachingRevision": _TEACHING_REVISION,
        }
    )
    scene["teachingBlockIds"] = [teaching["id"]]
    scene["supportBlockIds"] = [card["id"], help_block["id"]]
    scene["runtimeBlockIds"] = [block["id"] for block in blocks]


def _new_transfer_prep_scene(
    lesson: dict[str, Any], source_scene: dict[str, Any], group: dict[str, Any], ordinal: int
) -> dict[str, Any]:
    scene_id = f"a1teach-start-s5-transfer-prep-{ordinal}"
    refs = ["starter.S5.transfer.preparation"]
    background = source_scene.get("background") or source_scene.get("backgroundSrc") or ""
    scene: dict[str, Any] = {
        "id": scene_id,
        "lessonId": lesson.get("id", STARTER_LESSON_ID),
        "order": 0,
        "phase": "starter-transfer-teach",
        "title": str(group["title"]),
        "instruction": "Escucha estos datos nuevos y repítelos antes de escribir.",
        "route": "learner",
        "sourceRefs": refs,
        "interactiveCount": 0,
        "runtimeBlockIds": [],
        "runtimeBlocks": [],
        "background": background,
        "backgroundSrc": source_scene.get("backgroundSrc", background),
        "sceneSide": source_scene.get("sceneSide", "right"),
        "routeModes": deepcopy(source_scene.get("routeModes", {})),
        "activityId": "S5",
        "pedagogicalStage": "teach",
        "transferPreparation": True,
        "learnerVisibleTeaching": True,
        "teachingRevision": _TEACHING_REVISION,
    }
    blocks = _runtime_blocks(scene)
    explanation_id = f"{scene_id}-explanation"
    explanation = _block(
        scene,
        explanation_id,
        "text",
        str(group["title"]),
        "teaching",
        refs,
        format="html",
        content=f"<p><strong>Aprende:</strong> {escape(str(group.get('explanation', 'Escucha y repite.')), quote=False)}</p>",
    )
    explanation["data"].update(
        {
            "teachingStage": "before-demand",
            "pedagogicalFunction": "teach",
            "learnerVisible": True,
            "teacherGuideRole": "complement",
            "modelKind": "brief-transfer-preparation",
        }
    )
    blocks.append(explanation)
    vocab = _make_vocabulary_block(scene, group, refs)
    vocab["data"].update({"transferPreparation": True, "teachingStage": "before-demand"})
    blocks.append(vocab)
    scene["teachingBlockIds"] = [explanation_id, vocab["id"]]
    scene["runtimeBlockIds"] = [block["id"] for block in blocks]
    return scene


def _ensure_transfer_scene(lesson: dict[str, Any]) -> None:
    scenes = lesson.get("scenes")
    if not isinstance(scenes, list):
        return
    source = next((scene for scene in scenes if scene.get("id") == "a1m1-start-s5-teach"), None)
    if not isinstance(source, dict):
        source = next((scene for scene in scenes if _activity_id(scene) == "S5"), None)
    if not isinstance(source, dict):
        return
    transfer = next((scene for scene in scenes if scene.get("id") == "a1teach-start-s5-transfer"), None)
    if not isinstance(transfer, dict):
        transfer = _new_transfer_scene(lesson, source)
        scenes.append(transfer)
    else:
        _revise_transfer_scene(transfer)

    transfer_index = next((index for index, scene in enumerate(scenes) if scene is transfer), len(scenes))
    for ordinal, group in enumerate(_TRANSFER_VOCABULARY_GROUPS, start=1):
        scene_id = f"a1teach-start-s5-transfer-prep-{ordinal}"
        prep = next((scene for scene in scenes if scene.get("id") == scene_id), None)
        if not isinstance(prep, dict):
            prep = _new_transfer_prep_scene(lesson, source, group, ordinal)
            scenes.insert(transfer_index, prep)
            transfer_index += 1
        else:
            prep["teachingRevision"] = _TEACHING_REVISION
            prep["transferPreparation"] = True


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


def _mark_optional_alphabet_audio(lesson: dict[str, Any]) -> None:
    """Keep the original full alphabet as an optional lookup for new names."""

    for scene in lesson.get("scenes", []):
        if not isinstance(scene, dict) or scene.get("id") != "a1m1-start-s2-teach":
            continue
        support = next((block for block in _runtime_blocks(scene) if block.get("id") == "a1m1-start-s2-support"), None)
        if isinstance(support, dict):
            support_data = support.setdefault("data", {})
            support_data.update(
                {
                    "optionalAlphabetReference": True,
                    "supportLabel": "Ver todas las letras",
                    "supportPurpose": "Consulta una letra nueva solo cuando la necesites; practica primero el grupo breve.",
                    "teachingRevision": _TEACHING_REVISION,
                }
            )
        for block in _runtime_blocks(scene):
            if not isinstance(block, dict) or block.get("type") != "audio":
                continue
            url = str(block.get("url", ""))
            if "starter-s2-alphabet.mp3" not in url:
                continue
            data = block.setdefault("data", {})
            data.update(
                {
                    "optionalAlphabetReference": True,
                    "supportLabel": "Escuchar el alfabeto completo",
                    "supportPurpose": "Consulta opcional; primero trabaja las letras del grupo breve.",
                    "pronunciationSource": "original-audio",
                    "teachingRevision": _TEACHING_REVISION,
                }
            )
            block["prompt"] = "Voz sintética. Escucha el alfabeto completo si lo necesitas."
            block["title"] = "Consulta opcional del alfabeto completo"


def _annotate_materials(lesson: dict[str, Any]) -> None:
    for field in ("description", "learningOutcomes", "routePolicy"):
        if field in lesson:
            lesson[field] = _replace_material_terms(lesson[field])
    for scene in lesson.get("scenes", []):
        if not isinstance(scene, dict):
            continue
        for key, value in list(scene.items()):
            if key not in {"id", "lessonId", "order", "runtimeBlocks", "runtimeBlockIds"}:
                scene[key] = _replace_material_terms(value)
        for field in ("title", "instruction", "routeModes"):
            if field in scene:
                scene[field] = _replace_material_terms(scene[field])
        if isinstance(scene.get("instruction"), str):
            scene["instruction"] = _replace_material_terms(scene["instruction"])
        for block in _runtime_blocks(scene):
            if not isinstance(block, dict):
                continue
            for key, value in list(block.items()):
                if key not in {"id", "order", "data"}:
                    block[key] = _replace_material_terms(value)
            for key in ("title", "content", "teacherReadScript", "prompt", "transcript"):
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
    lesson["teachingRevision"] = _TEACHING_REVISION
    for scene_order, scene in enumerate(scenes, start=1):
        if not isinstance(scene, dict):
            continue
        scene["order"] = scene_order
        scene["teachingRevision"] = _TEACHING_REVISION
        blocks = _runtime_blocks(scene)
        scene["runtimeBlockIds"] = [block.get("id") for block in blocks if isinstance(block, dict)]
        scene["interactiveCount"] = sum(
            1 for block in blocks if isinstance(block, dict) and block.get("type") in _INTERACTIVE_TYPES
        )
        for block in blocks:
            if not isinstance(block, dict):
                continue
            data = block.setdefault("data", {})
            data["teachingRevision"] = _TEACHING_REVISION
            data["pilotSceneId"] = scene.get("id")
            data.pop("audioSource", None)
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
            _add_teaching_scene_blocks(lesson, scene, activity_id)
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
    _mark_optional_alphabet_audio(lesson)
    _annotate_materials(lesson)
    for scene in lesson.get('scenes', []):
        if not isinstance(scene, dict):
            continue
        scene['title'] = str(scene.get('title', '')).replace('Escucha inicial con lectura del docente', 'Escucha una presentación')
        for block in _runtime_blocks(scene):
            for key in ('title',):
                if isinstance(block.get(key), str):
                    block[key] = block[key].replace('Escucha inicial con lectura del docente', 'Escucha una presentación')
            data = block.setdefault('data', {})
            if isinstance(data.get('guidedTitle'), str):
                data['guidedTitle'] = data['guidedTitle'].replace('Escucha inicial con lectura del docente', 'Escucha una presentación')
            if block.get('type') == 'audio' and block['id'] != 'a1m1-start-s2-teach-starter-s2-alphabet-audio':
                block['prompt'] = 'Voz sintética. Escucha y repite cuando quieras.'
            reference_labels = {
                '/audio/a1-module1-pilot/starter-s3-numbers-0-20.mp3': 'Escuchar los números del 0 al 20',
                '/audio/a1-module1-pilot/starter-s3-contact-time.mp3': 'Escuchar teléfono, hora y aula',
                '/audio/a1-module1-pilot/starter-u4-help-phrases.mp3': 'Escuchar frases para pedir ayuda',
            }
            if block.get('type') == 'audio' and block.get('url') in reference_labels:
                data['supportLabel'] = reference_labels[block['url']]
    for scene in lesson.get("scenes", []):
        if isinstance(scene, dict):
            scene.pop("_starter_audio_candidates", None)
    _sync_lesson(lesson)
    _sync_auxiliary_counts(full, lesson)
    _register_audio_plan(full)
