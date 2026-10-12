"""Declarative teaching revision for the A1 Module 1 mission.

The compiler owns the source curriculum and verified audio insertion.  This
module runs after that integration and makes the mission usable by an A1
adult without claiming a role-card runtime that the current viewer does not
provide.  It mutates the supplied full-course object in place and deliberately
does not touch U1–U4 scenes.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Iterable


MISSION_LESSON_ID = "a1-general-mission"
MISSION_SCENE_IDS = (
    "a1m1-mission-briefing",
    "a1m1-mission-model",
    "a1m1-mission-speak",
    "a1m1-mission-card",
    "a1m1-mission-mediation",
)
NEW_BLOCK_PREFIX = "a1teach-mission-"

# These are intentionally reported here rather than hidden behind curriculum
# metadata.  The parent integration owns the runtime fixes.
RUNTIME_BLOCKERS = (
    {
        "id": "oral-ai-grading-guard",
        "owner": "src/components/lessons/unit1-production.tsx",
        "problem": "ConversationProduction mounts RecordingAIGrading even when aiGrading is false.",
        "required": "Honor block.aiGrading/data.aiGrading and show the human checklist instead.",
    },
    {
        "id": "guided-ordering-completion",
        "owner": "src/components/lessons/guided-lesson-viewer.tsx",
        "problem": "GUIDED_ACTIVITIES omits ordering, so U2–U4 practice-5 bypasses guided completion.",
        "required": "Add ordering to the guided completion path or use the already supported short_answer path.",
    },
)


def revise_mission(full: dict[str, Any]) -> None:
    """Revise the mission in a full generated course object in place.

    ``full`` is the internal compiler shape after verified audio integration:
    lessons contain scenes, scenes contain ``runtimeBlocks`` (and may also
    contain ``blocks``), and lessons contain a flattened ``blocks`` list.
    Existing block and scene IDs are never changed.  Any new block uses the
    ``a1teach-mission-`` prefix so callers can audit the change.
    """

    if not isinstance(full, dict):
        raise TypeError("full must be a dictionary")
    lessons = full.get("lessons")
    if not isinstance(lessons, list):
        raise ValueError("full.lessons must be a list")
    mission = next((lesson for lesson in lessons if lesson.get("id") == MISSION_LESSON_ID), None)
    if not isinstance(mission, dict):
        raise ValueError(f"Missing mission lesson {MISSION_LESSON_ID!r}")
    scenes = mission.get("scenes")
    if not isinstance(scenes, list):
        raise ValueError("The mission lesson must contain scenes")

    scene_map = {scene.get("id"): scene for scene in scenes if isinstance(scene, dict)}
    missing = [scene_id for scene_id in MISSION_SCENE_IDS if scene_id not in scene_map]
    if missing:
        raise ValueError(f"Missing mission scenes: {', '.join(missing)}")

    before_ids = _all_block_ids(full)
    _remove_private_role_claims(mission)
    _revise_route_copy(mission, scene_map)
    _revise_briefing(scene_map["a1m1-mission-briefing"])
    _revise_model(scene_map["a1m1-mission-model"])
    _revise_speaking(scene_map["a1m1-mission-speak"], scene_map["a1m1-mission-model"])
    _revise_card(scene_map["a1m1-mission-card"])
    _revise_mediation(scene_map["a1m1-mission-mediation"])
    _sync_mission_lesson(mission)

    after_ids = _all_block_ids(full)
    missing_ids = before_ids - after_ids
    if missing_ids:
        raise AssertionError(f"Mission revision deleted existing IDs: {sorted(missing_ids)}")
    added_ids = after_ids - before_ids
    invalid_added = sorted(block_id for block_id in added_ids if not block_id.startswith(NEW_BLOCK_PREFIX))
    if invalid_added:
        raise AssertionError(f"New mission IDs must use {NEW_BLOCK_PREFIX!r}: {invalid_added}")
    _assert_mission_invariants(mission)


def _iter_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from _iter_dicts(child)


def _all_block_ids(full: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for lesson in full.get("lessons", []):
        if not isinstance(lesson, dict):
            continue
        for block in lesson.get("blocks", []):
            if isinstance(block, dict) and isinstance(block.get("id"), str):
                ids.add(block["id"])
        for scene in lesson.get("scenes", []):
            if not isinstance(scene, dict):
                continue
            for block in _scene_blocks(scene):
                if isinstance(block, dict) and isinstance(block.get("id"), str):
                    ids.add(block["id"])
    return ids


def _scene_blocks(scene: dict[str, Any]) -> list[dict[str, Any]]:
    runtime = scene.get("runtimeBlocks")
    blocks = scene.get("blocks")
    if isinstance(runtime, list):
        return runtime
    if isinstance(blocks, list):
        scene["runtimeBlocks"] = blocks
        return blocks
    raise ValueError(f"Scene {scene.get('id')!r} has no runtimeBlocks/blocks")


def _find_block(scene: dict[str, Any], block_id: str) -> dict[str, Any]:
    for block in _scene_blocks(scene):
        if block.get("id") == block_id:
            return block
    raise ValueError(f"Missing block {block_id!r} in scene {scene.get('id')!r}")


def _data(block: dict[str, Any]) -> dict[str, Any]:
    value = block.setdefault("data", {})
    if not isinstance(value, dict):
        raise ValueError(f"Block {block.get('id')!r} has non-object data")
    return value


def _scene_background(scene: dict[str, Any], template: dict[str, Any]) -> Any:
    return scene.get("backgroundSrc") or scene.get("background") or _data(template).get("scene")


def _new_support_block(
    scene: dict[str, Any],
    template: dict[str, Any],
    block_id: str,
    title: str,
    rows: list[list[str]],
    *,
    source_refs: list[str] | None = None,
) -> dict[str, Any]:
    if not block_id.startswith(NEW_BLOCK_PREFIX):
        raise ValueError(f"New support ID must use {NEW_BLOCK_PREFIX!r}: {block_id!r}")
    block = deepcopy(template)
    block["id"] = block_id
    block["type"] = "structured-content"
    block["title"] = title
    block["config"] = deepcopy(template.get("config") or {
        "hasHeaderRow": True,
        "hasStripedRows": True,
        "hasBorders": True,
    })
    block["content"] = {
        "headers": ["Dato", "Apoyo visible"],
        "rows": rows,
    }
    data = _data(block)
    data.update(
        {
            "pilotSceneId": scene["id"],
            "guidedTitle": title,
            "scene": _scene_background(scene, template),
            "contentRole": "support",
            "collapsible": True,
            "supportLabel": "Hoja común (abrir si la necesitas)",
            "supportPurpose": "Consulta los datos mientras ensayas; no memorices una tarjeta privada.",
        }
    )
    if source_refs is not None:
        data["sourceRefs"] = source_refs
    return block


def _ensure_support(
    scene: dict[str, Any],
    template: dict[str, Any],
    block_id: str,
    title: str,
    rows: list[list[str]],
) -> dict[str, Any]:
    blocks = _scene_blocks(scene)
    existing = next((block for block in blocks if block.get("id") == block_id), None)
    if existing is None:
        existing = _new_support_block(scene, template, block_id, title, rows)
        insertion = next(
            (index for index, block in enumerate(blocks) if block.get("type") in {"recording", "essay"}),
            len(blocks),
        )
        blocks.insert(insertion, existing)
    else:
        existing["title"] = title
        existing["type"] = "structured-content"
        existing["content"] = {"headers": ["Dato", "Apoyo visible"], "rows": rows}
        data = _data(existing)
        data.update(
            {
                "pilotSceneId": scene["id"],
                "guidedTitle": title,
                "scene": _scene_background(scene, template),
                "contentRole": "support",
                "collapsible": True,
                "supportLabel": "Hoja común (abrir si la necesitas)",
                "supportPurpose": "Consulta los datos mientras ensayas; no memorices una tarjeta privada.",
            }
        )
    return existing


def _remove_private_role_claims(mission: dict[str, Any]) -> None:
    for item in list(_iter_dicts(mission)):
        for key in ("roleCardRevealMode", "roleCardRuntimeStatus", "roleCardReveal"):
            item.pop(key, None)


def _set_route(route: dict[str, Any], *, self_text: str, teacher_text: str) -> None:
    route["self"] = self_text
    route["teacher"] = teacher_text


def _revise_route_copy(mission: dict[str, Any], scene_map: dict[str, dict[str, Any]]) -> None:
    _set_route(
        mission.setdefault("routePolicy", {}),
        self_text="La modalidad autónoma es un ensayo con la hoja común visible: representa ambas voces y usa auto-comprobación.",
        teacher_text="La docente acompaña y observa una interacción real; su guía complementa la consigna y no es necesaria para avanzar.",
    )
    _set_route(
        scene_map["a1m1-mission-briefing"].setdefault("routeModes", {}),
        self_text="Consulta la hoja común y ensaya las dos voces; no memorices datos.",
        teacher_text="La docente presenta el escenario y comprueba el significado antes de la ronda.",
    )
    _set_route(
        scene_map["a1m1-mission-speak"].setdefault("routeModes", {}),
        self_text="Graba una ronda de ensayo con la hoja común visible, revisa los criterios y repite con el otro papel.",
        teacher_text="La docente puede conducir la ronda, cambiar un dato oralmente y revisar el significado.",
    )
    _set_route(
        scene_map["a1m1-mission-card"].setdefault("routeModes", {}),
        self_text="Escribe la tarjeta con la hoja común visible y confirma la auto-revisión antes de continuar.",
        teacher_text="La docente revisa la transferencia de datos y la frase de apoyo.",
    )
    _set_route(
        scene_map["a1m1-mission-mediation"].setdefault("routeModes", {}),
        self_text="Consulta la ficha, redacta la respuesta en español y comprueba cada dato.",
        teacher_text="La docente revisa la transferencia y la información que falta.",
    )


def _append_route_notice(content: Any, notice: str) -> str:
    text = content if isinstance(content, str) else ""
    if notice not in text:
        text = f"{text}{notice}"
    return text


def _revise_briefing(scene: dict[str, Any]) -> None:
    instructions = _find_block(scene, "a1m1-mission-briefing-instructions")
    instructions["content"] = _append_route_notice(
        instructions.get("content"),
        "<p><strong>Ruta autónoma:</strong> ensaya las dos voces con la hoja común visible; esta vista no entrega tarjetas privadas.</p>",
    )
    instructions["data"] = _data(instructions)
    instructions["data"].pop("roleCardRevealMode", None)
    instructions["data"].pop("roleCardRuntimeStatus", None)
    scene["instruction"] = "Lee la hoja común y ensaya los dos roles con los datos visibles."

    notes = _find_block(scene, "a1m1-mission-briefing-role-notes")
    notes["title"] = "Guía docente para la ronda"
    notes["content"] = (
        "**Guía docente:** presenta la hoja común y modela una ronda breve.\n\n"
        "La docente puede conducir las dos voces, pedir una repetición y cambiar un dato oralmente.\n\n"
        "La ruta autónoma es un ensayo con la hoja común visible; este plan no crea tarjetas privadas por participante."
    )


MISSION_SUPPORT_ROWS = [
    ["Nombre", "Ana Torres"],
    ["Objeto", "This is my blue folder."],
    ["Teléfono", "My phone number is 555-0142."],
    ["Correo", "My email is welcome@centro.example."],
    ["Horario", "I’m free on Tuesday at six."],
    ["Sala", "The room is 204."],
    ["Reparación", "Sorry, could you repeat that, please?"],
]


MISSION_MODEL = (
    "Hi, I’m Ana. What’s your name? Nice to meet you. "
    "This is my blue folder. My phone number is 555-0142. "
    "I’m free on Tuesday at six. The room is 204."
)


def _revise_model(scene: dict[str, Any]) -> None:
    model_text = _find_block(scene, "a1m1-mission-model-text")
    model_text["content"] = (
        f"<p><strong>Modelo:</strong> {MISSION_MODEL}</p>"
        "<p>Observa el propósito: saludo, nombre, objeto, contacto, horario y sala. "
        "Usa después la hoja común para cambiar un dato.</p>"
        "<details><summary>Guía para docente</summary><p>Lee una vez y comprueba el significado; "
        "no exige recitar el diálogo palabra por palabra.</p></details>"
    )
    _data(model_text)["originalEnglishModel"] = MISSION_MODEL

    language = _find_block(scene, "a1m1-mission-model-language")
    language["content"] = {
        "headers": ["Propósito", "English model"],
        "rows": [
            ["Saludar", "Hi, I’m … / Nice to meet you."],
            ["Preguntar nombre", "What’s your name?"],
            ["Identificar un objeto", "This is my …"],
            ["Compartir contacto", "My phone number is … / My email is …"],
            ["Dar disponibilidad", "I’m free on Tuesday at six."],
            ["Confirmar sala", "The room is 204."],
            ["Pedir repetición", "Sorry, could you repeat that, please?"],
        ],
    }
    language["title"] = "Frases de misión"


def _revise_speaking(scene: dict[str, Any], model_scene: dict[str, Any]) -> None:
    prompt = _find_block(scene, "a1m1-mission-speak-prompt")
    prompt["content"] = (
        "<p><strong>Consigna:</strong> Representa una ronda de 60–90 segundos con la hoja común visible. "
        "Saluda, di tu nombre, identifica un objeto, comparte un contacto y confirma horario y sala.</p>"
        f"<details><summary>Ver ejemplo</summary><p>{MISSION_MODEL}</p></details>"
        "<p>Si falta un dato, pide repetición. En autonomía, repite la ronda con el otro papel: es un ensayo, "
        "no una interacción espontánea con tarjeta privada.</p>"
    )
    _data(prompt)["originalEnglishModel"] = MISSION_MODEL

    template = _find_block(model_scene, "a1m1-mission-model-language")
    _ensure_support(
        scene,
        template,
        "a1teach-mission-speak-support",
        "Hoja común · apoyo para hablar",
        deepcopy(MISSION_SUPPORT_ROWS),
    )
    recording = _find_block(scene, "a1m1-mission-speak-recording")
    recording["instruction"] = "Representa la ronda con la hoja común visible; la revisión es humana."
    recording["prompt"] = (
        "Representa una ronda de 60–90 segundos. Saluda, di tu nombre, identifica un objeto, "
        "comparte un contacto, confirma martes a las seis y la sala 204, y pide repetición si falta un dato."
    )
    recording_data = _data(recording)
    recording_data.update(
        {
            "originalEnglishModel": MISSION_MODEL,
            "learningModeGuidance": {
                "self": "Ensaya ambas voces con la hoja común visible y confirma cada criterio al terminar.",
                "teacher": "La docente acompaña una ronda y revisa el significado; su guía complementa el ensayo.",
            },
            "reviewChecklist": [
                "Saluda, dice su nombre y pregunta el nombre.",
                "Identifica un objeto con This is my …",
                "Comparte teléfono o correo y disponibilidad.",
                "Confirma que la sala es 204.",
                "Pide repetición si falta un dato.",
                "Revisa la ronda con la hoja común y no inventa datos.",
            ],
            "autonomyMode": "rehearsal-common-sheet",
        }
    )
    recording_data.pop("learningModes", None)
    recording_data.pop("roleCardRevealMode", None)
    recording_data.pop("roleCardRuntimeStatus", None)
    recording_data["conversationTurns"] = [
        {
            "id": "a1m1-mission-turn-1",
            "question": "What’s your name?",
            "answerPrompt": "Say Hi, I’m Ana. Ask the name and say Nice to meet you.",
            "reviewChecklist": [
                "Saluda y dice su nombre.",
                "Pregunta el nombre y responde Nice to meet you.",
                "Usa una pregunta y una respuesta comprensibles.",
            ],
        },
        {
            "id": "a1m1-mission-turn-2",
            "question": "When are you free?",
            "answerPrompt": "Use the common sheet: give Tuesday at six, room 204 and one contact. Ask for repetition if needed.",
            "reviewChecklist": [
                "Comparte un contacto.",
                "Confirma martes a las seis.",
                "Confirma que la sala es 204.",
                "Pide repetición si falta un dato.",
            ],
        },
    ]


def _revise_card(scene: dict[str, Any]) -> None:
    prompt = _find_block(scene, "a1m1-mission-card-prompt")
    card_model = "Name: Ana Torres. Contact: 555-0142. Tuesday at six. Room: 204."
    prompt["content"] = (
        "<p><strong>Consigna:</strong> Completa una tarjeta en inglés con la hoja común visible: nombre, "
        "contacto, día, hora y sala. Añade una frase para pedir repetición.</p>"
        f"<details><summary>Ver ejemplo</summary><p>{card_model}</p></details>"
    )
    _data(prompt)["originalEnglishModel"] = card_model

    briefing_template = _find_block(scene, "a1m1-mission-card-prompt")
    _ensure_support(
        scene,
        briefing_template,
        "a1teach-mission-card-support",
        "Hoja común · apoyo para escribir",
        deepcopy(MISSION_SUPPORT_ROWS),
    )
    essay = _find_block(scene, "a1m1-mission-card-essay")
    essay["prompt"] = (
        "Completa una tarjeta en inglés con la hoja común visible: nombre, contacto, día, hora y sala; "
        "añade una frase para pedir repetición."
    )
    essay_data = _data(essay)
    essay_data["originalEnglishModel"] = card_model
    essay_data["learningModes"] = {
        "individual": "Escribe y revisa la tarjeta con la hoja común visible; confirma los cinco datos antes de continuar.",
        "teacher": "La docente revisa nombre, contacto, día, hora, sala y la frase de apoyo.",
    }
    essay_data["learningModeGuidance"] = {
        "self": "Escribe y revisa la tarjeta con la hoja común visible; confirma los cinco datos antes de continuar.",
        "teacher": "La docente revisa nombre, contacto, día, hora, sala y la frase de apoyo.",
    }
    essay_data["autonomyMode"] = "rehearsal-common-sheet"


SPANISH_MEDIATION_MODEL = (
    "La clase de inglés es el martes a las 18:00, en la sala 4. "
    "Lleva un cuaderno. Si necesitas ayuda, pregunta por Marta en recepción. "
    "La ficha no menciona el estacionamiento."
)


def _revise_mediation(scene: dict[str, Any]) -> None:
    prompt = _find_block(scene, "a1m1-mission-mediation-prompt")
    source_english = "Evening English class: Tuesday at 18:00, Room 4. Bring a notebook. Ask Marta at reception if you need help."
    prompt["content"] = (
        "<p><strong>Instrucción:</strong> Lee la ficha y redacta una respuesta breve en español para la persona nueva: "
        "día, hora, sala, qué llevar y a quién preguntar. Indica qué dato no aparece.</p>"
        f"<p><strong>Modelo en español:</strong> {SPANISH_MEDIATION_MODEL}</p>"
        "<p>La evidencia se revisa por transferencia de información; no se exige traducción palabra por palabra.</p>"
    )
    prompt_data = _data(prompt)
    prompt_data["originalEnglishModel"] = SPANISH_MEDIATION_MODEL
    prompt_data["sourceEnglishModel"] = source_english
    prompt_data["modelLanguage"] = "es"

    source = _find_block(scene, "a1m1-mission-mediation-source")
    source_content = source.setdefault("content", {})
    rows = source_content.setdefault("rows", [])
    rows[:] = [
        ["Ficha original", source_english],
        [
            "Apoyo léxico",
            "Tuesday = martes; Room = sala; notebook = cuaderno; reception = recepción; parking = estacionamiento.",
        ],
    ]

    essay = _find_block(scene, "a1m1-mission-mediation-essay")
    essay["prompt"] = (
        "Lee la ficha y redacta una respuesta breve en español para la persona nueva: día, hora, sala, "
        "qué llevar y a quién preguntar. Indica qué dato no aparece."
    )
    essay_data = _data(essay)
    essay_data["originalEnglishModel"] = SPANISH_MEDIATION_MODEL
    essay_data["sourceEnglishModel"] = source_english
    essay_data["modelLanguage"] = "es"
    essay_data["autonomyMode"] = "rehearsal-common-sheet"
    essay_data["learningModes"] = {
        "individual": "Lee la ficha, redacta la respuesta en español y comprueba cada dato.",
        "teacher": "La docente revisa la transferencia y la información que falta.",
    }
    essay_data["learningModeGuidance"] = {
        "self": "Lee la ficha, redacta la respuesta en español y comprueba cada dato.",
        "teacher": "La docente revisa la transferencia y la información que falta.",
    }
    checklist = [
        "Incluye martes, 18:00 y sala 4.",
        "Indica que debe llevar un cuaderno.",
        "Indica que puede preguntar a Marta en recepción.",
        "Declara que el estacionamiento no aparece en la ficha.",
    ]
    essay_data["reviewChecklist"] = checklist
    scene["reviewChecklist"] = checklist


def _sync_mission_lesson(mission: dict[str, Any]) -> None:
    flattened: list[dict[str, Any]] = []
    for scene in mission["scenes"]:
        blocks = _scene_blocks(scene)
        for order, block in enumerate(blocks):
            block["order"] = order
            flattened.append(block)
        scene["runtimeBlockIds"] = [block["id"] for block in blocks]
        scene["interactiveCount"] = sum(block.get("type") in {"match", "fill_blanks", "multiple_choice", "true_false", "short_answer", "essay", "recording", "ordering"} for block in blocks)
        scene["blocks"] = list(blocks)
    mission["sceneCount"] = len(mission["scenes"])
    mission["blocks"] = flattened


def _assert_mission_invariants(mission: dict[str, Any]) -> None:
    scene_map = {scene["id"]: scene for scene in mission["scenes"]}
    if tuple(scene_map) != MISSION_SCENE_IDS:
        raise AssertionError(f"Mission scene order changed: {tuple(scene_map)}")
    orders = [scene.get("order") for scene in mission["scenes"]]
    if orders != sorted(orders) or len(set(orders)) != len(orders):
        raise AssertionError("Mission scene orders must remain increasing and unique")
    for scene in mission["scenes"]:
        blocks = _scene_blocks(scene)
        if scene.get("runtimeBlockIds") != [block.get("id") for block in blocks]:
            raise AssertionError(f"runtimeBlockIds out of sync in {scene['id']}")
        if any(block.get("id", "").startswith("a1teach-mission-") and block.get("type") != "structured-content" for block in blocks):
            raise AssertionError(f"New mission support block has an invalid type in {scene['id']}")
        if any(block.get("aiGrading") is not False for block in blocks if block.get("type") in {"essay", "recording"}):
            raise AssertionError(f"Mission production must remain human-reviewed in {scene['id']}")
        for block in blocks:
            if block.get("type") not in {"essay", "recording"}:
                continue
            if block.get("type") == "recording" and "learningModes" in _data(block):
                raise AssertionError(f"Mission recording must use self/teacher learningModeGuidance only in {scene['id']}")
            guidance = _data(block).get("learningModeGuidance")
            if not isinstance(guidance, dict) or set(guidance) != {"self", "teacher"}:
                raise AssertionError(f"Mission production needs self/teacher learningModeGuidance in {scene['id']}")
            if any(not isinstance(value, str) or not value.strip() for value in guidance.values()):
                raise AssertionError(f"Mission production learningModeGuidance must contain text in {scene['id']}")
    route_self = mission.get("routePolicy", {}).get("self", "").lower()
    if "ensayo" not in route_self or "hoja común" not in route_self:
        raise AssertionError("Autonomous mission route must be declared as common-sheet rehearsal")
    mission_text = " ".join(str(item) for item in _iter_dicts(mission))
    if "role-card-only" in mission_text or "metadata-only-until-role-card-viewer-exists" in mission_text:
        raise AssertionError("Mission must not claim a private role-card runtime")

    model = _find_block(scene_map["a1m1-mission-model"], "a1m1-mission-model-text")
    model_text = str(model.get("content", ""))
    for expected in ("This is my blue folder", "My phone number", "I’m free on Tuesday at six", "The room is 204"):
        if expected not in model_text:
            raise AssertionError(f"Mission model is missing taught form: {expected}")
    if scene_map["a1m1-mission-model"].get("order", 0) >= scene_map["a1m1-mission-speak"].get("order", 0):
        raise AssertionError("Mission model must precede production")
    for scene_id, support_id in (
        ("a1m1-mission-speak", "a1teach-mission-speak-support"),
        ("a1m1-mission-card", "a1teach-mission-card-support"),
    ):
        blocks = _scene_blocks(scene_map[scene_id])
        support_index = next((index for index, block in enumerate(blocks) if block.get("id") == support_id), None)
        production_index = next((index for index, block in enumerate(blocks) if block.get("type") in {"recording", "essay"}), None)
        if support_index is None or production_index is None or support_index > production_index:
            raise AssertionError(f"Visible support must precede production in {scene_id}")

    mediation = scene_map["a1m1-mission-mediation"]
    mediation_text = " ".join(
        str(block.get("content", ""))
        for block in _scene_blocks(mediation)
        if block.get("id") in {"a1m1-mission-mediation-prompt", "a1m1-mission-mediation-essay"}
    )
    if "Modelo en español" not in mediation_text or "La clase de inglés" not in mediation_text:
        raise AssertionError("Mediation must expose a Spanish model")
    mediation_essay = _find_block(mediation, "a1m1-mission-mediation-essay")
    checklist_text = " ".join(_data(mediation_essay).get("reviewChecklist", []))
    for expected in ("martes", "cuaderno", "Marta", "estacionamiento"):
        if expected not in checklist_text:
            raise AssertionError(f"Spanish mediation checklist is missing {expected}")


__all__ = ["MISSION_SCENE_IDS", "RUNTIME_BLOCKERS", "revise_mission"]
