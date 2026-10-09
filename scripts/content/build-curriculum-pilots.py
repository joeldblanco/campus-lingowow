"""Compile three reviewed authored pilots; never connects to a database.

Old content identities and payloads remain archived, original audio rows remain
live, and the existing dev-only CAS applicator validates the generated plan.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

REVISION = 'curriculum-pilot-v1'
UNITS = {2, 22, 46}
SCENE_POOLS = {
    22: ['campus', 'workshop', 'family-living-room', 'museum-gallery', 'community-bookshop', 'restaurant', 'daily-kitchen', 'library', 'garden'],
    46: ['workshop', 'botanical-office', 'science-lab', 'music-room', 'library', 'travel-station', 'listening-lounge', 'airport-lounge', 'community-bookshop', 'campus'],
}
INTERACTIVE = {'multiple_choice', 'short_answer', 'essay', 'recording', 'true_false', 'fill_blanks'}
BACKGROUNDS = ['travel-station', 'airport-lounge', 'campus', 'city-directions', 'community-bookshop', 'village-square', 'library', 'family-living-room', 'harbor-promenade', 'restaurant', 'lakeside-reading-terrace', 'botanical-office', 'workshop', 'museum-gallery', 'science-lab', 'garden', 'daily-kitchen', 'music-room', 'mountain-cabin', 'seaside', 'market', 'town-park', 'art-studio', 'flower-courtyard', 'listening-lounge', 'bakery']


def build(snapshot, specifications):
    if snapshot.get('database') != 'lingowow_dev':
        raise ValueError('A dev snapshot is required')
    if {spec['unit']['number'] for spec in specifications} != UNITS or len(specifications) != 3:
        raise ValueError('Exactly the three approved pilot units are required')
    plans = []
    for spec in sorted(specifications, key=lambda item: item['unit']['number']):
        number = spec['unit']['number']
        lesson = snapshot['lessons'][number - 1]
        lesson_id = spec['unit'].get('lessonId', spec['unit'].get('id'))
        if lesson['id'] != lesson_id:
            raise ValueError('Unit identity differs from reviewed source')
        previous = copy.deepcopy(lesson['rows'])
        before = {row['id']: row for row in previous}
        audios = {row['data']['url']: row for row in previous if row['data'].get('type') == 'audio'}
        next_rows, used_audio_ids, scene_count = [], set(), 0
        scenes = spec.get('sequence') if number != 22 else spec['scenes']
        for stage in scenes:
            runtime = copy.deepcopy(stage.get('runtimeBlocks', []))
            if not runtime:
                raise ValueError('Scene has no authored runtime content')
            source_refs = set(stage.get('sourceRowIds', stage.get('sourceIDs', [])))
            source_refs.update(block[field] for block in runtime for field in ['sourceId', 'sourceRowId'] if isinstance(block.get(field), str))
            if not source_refs <= before.keys():
                raise ValueError('An authored scene references another or missing source row')
            # Long reference tables and duplicate mode tables are optional support,
            # not additional required screens or answer-revealing panels.
            runtime = [block for block in runtime if block['type'] not in {'title', 'vocabulary', 'video'}
                       and 'learning-modes' not in block['id'] and 'evidence-table' not in block['id']]
            if number == 22:
                # The objective is interpreting norms, not guessing personality
                # from faces. The original photo assets remain in the archive.
                runtime = [block for block in runtime if block['type'] != 'image']
            if number == 2:
                runtime = [block for block in runtime if 'exploratory-note' not in block['id']]
            interactive_seen = False
            scene_id = f'pilot-{number}-{stage["id"]}'
            scene_count += 1
            background = SCENE_POOLS.get(number, BACKGROUNDS)[scene_count - 1]
            for block in runtime:
                if block['type'] in INTERACTIVE and interactive_seen:
                    scene_count += 1
                    scene_id = f'pilot-{number}-{stage["id"]}-{block["id"]}'
                    background = SCENE_POOLS.get(number, BACKGROUNDS)[scene_count - 1]
                    interactive_seen = False
                interactive_seen |= block['type'] in INTERACTIVE
                native_id = block.pop('id')
                if number == 2 and 'map-activation-teaching' in native_id:
                    block['content'] = '<p>Un <strong>país</strong> nombra un lugar; una <strong>nacionalidad</strong> describe a una persona.</p><p><strong>Japan → Japanese.</strong> Observa la diferencia y elige la pareja que funciona.</p>'
                if number == 22 and native_id == 'u22-s07-dialogue-html':
                    block['content'] = '<p>Visitas a un amigo. Practica este intercambio y cambia un detalle:</p><ol><li><strong>Visitante:</strong> Can I leave my bag here?</li><li><strong>Anfitrión:</strong> Yes, you can. You have to leave your shoes by the door.</li><li><strong>Visitante:</strong> Do I have to bring food?</li><li><strong>Anfitrión:</strong> No, you don’t have to. We have everything. You mustn’t touch the thermostat.</li><li><strong>Visitante:</strong> What should I do if I need anything?</li><li><strong>Anfitrión:</strong> You should ask me.</li></ol>'
                if number == 22 and native_id == 'u22-s08-final-task-html':
                    block['content'] = '<p>Crea las normas de un club de estudio: un consejo, una obligación, una prohibición, una acción opcional y una pregunta de permiso con su respuesta.</p><p>Después, un visitante intenta entrar en una zona reservada. Añade una prohibición y un consejo para esa situación.</p>'
                if number == 22 and block['type'] == 'essay':
                    block.update(prompt='Escribe en inglés seis frases para las normas del club: consejo (should), obligación (must o have to), prohibición (mustn’t), acción opcional (don’t have to), pregunta de permiso (Can ...?) y respuesta. Añade una prohibición y un consejo para el visitante que intenta entrar en la zona reservada.', minWords=40, maxWords=100)
                if number == 22 and native_id == 'u22-s07-recording':
                    block['instruction'] = 'Practica y graba el intercambio visible. Cambia un detalle y conserva la diferencia entre obligación, prohibición y acción opcional.'
                if number == 22 and native_id == 'u22-s08-recording':
                    block['instruction'] = 'Explica en inglés las normas del club. Responde al visitante que intenta entrar en la zona reservada con una prohibición y un consejo.'
                if number == 46 and native_id == 'u46-stage-6-result-table':
                    block['content']['rows'][1] = ['If he had asked for advice', 'his family would have supported his plan', 'imagined support under an unreal past condition']
                block.pop('order', None)
                metadata = block.get('data') if isinstance(block.get('data'), dict) else {}
                for field in ['learningModes', 'reviewChecklist']:
                    if field in block:
                        metadata[field] = block.pop(field)
                headings = {
                    22: ['Comprende las normas.', 'Decide según el contexto.', 'Escucha las normas de casa.', 'Distingue obligación y consejo.', 'Pregunta y responde.', 'Escucha los consejos.', 'Prepara la visita.', 'Explica tus normas.'],
                    46: ['Recupera la línea del tiempo.', 'Escucha la situación.', 'Mismo pasado, distintos significados.', 'Identifica la intención.', '¿Qué habría sido mejor?', 'Imagina otro resultado.', 'Deduce con pistas.', 'Explica tu decisión.'],
                }
                heading = stage.get('title') or block.get('title') or stage.get('id')
                if number in headings:
                    heading = headings[number][scenes.index(stage)]
                if number == 2 and stage['id'] == 'u02-scene-01-map-activation':
                    heading = 'País y nacionalidad.'
                metadata.update(learningRevision=REVISION, pilotSceneId=scene_id,
                    guidedTitle=heading,
                    scene=f'/images/lessons/backgrounds/{background}.webp', sceneSide='right',
                    pilotUnit=number, pilotSourceIds=stage.get('sourceRowIds', stage.get('sourceIDs', [])))
                block['data'] = metadata
                if block['type'] == 'structured-content':
                    metadata['supportLabel'] = 'Consultar los ejemplos'
                if block['type'] == 'image':
                    metadata['supportLabel'] = 'Ver el mapa'
                if block['type'] == 'multiple_choice':
                    metadata['feedbackMode'] = 'continue'
                    for item in block.get('items', []):
                        if number == 2 and item['question'] == 'She ___ from Japan.':
                            for option in item['options']:
                                if option['text'] == 'does come':
                                    option['text'] = 'do come'
                        if number == 22 and item['question'] == '___ I put my bag here?':
                            item['question'] = 'Can I put my bag here? What is the function of this question?'
                        if number == 22 and item['question'] == 'What should the visitor show to the family?':
                            item['question'] = 'What does his friend tell him to show to the family?'
                        if number == 22 and item['question'] == 'What should the visitor do if hungry?':
                            item['question'] = 'What does his friend suggest instead of asking for more food?'
                            for option in item['options']:
                                if option['id'] == 'wait':
                                    option['text'] = 'Wait for the family to tell him.'
                        if number == 46 and item['id'] == 'u46-would-2':
                            item['question'] = 'The family had planned to support him if he consulted them. If he had asked, they ___ his plan. Express the hypothetical result.'
                            for option in item['options']:
                                option['text'] = option['text'].replace('wanted', 'supported')
                            item['explanation'] = 'Would have supported expresa el apoyo imaginado bajo una condición pasada que no ocurrió.'
                        ids = [option['id'] for option in item['options']]
                        if len(set(ids)) != len(ids) or ids.count(item['correctOptionId']) != 1:
                            raise ValueError('Invalid authored choice key')
                        if not item.get('explanation'):
                            item['explanation'] = block.get('explanation', '')
                        if not item['explanation']:
                            raise ValueError('Each choice needs contextual feedback')
                if number == 46 and block['type'] == 'short_answer':
                    for item in block['items']:
                        item['question'] = 'Completa solo el hueco. ' + item['question']
                        if item['id'] == 'u46-infer-1':
                            item['question'] = 'Expresa la conclusión más firme de estas pistas. It is 10 p.m.; the lights are off, the door is locked, and the doorman saw them leave at 9. They ___ left.'
                            item.update(correctAnswer='must have', acceptedAnswers=['must have', "must’ve", "must've"])
                        elif item['id'] == 'u46-infer-2':
                            item.update(correctAnswer='might have', acceptedAnswers=['might have', 'may have', 'could have', "might've", "might’ve", "could've", "could’ve"])
                        else:
                            item['question'] = 'Expresa una deducción firme con must. The lights are off, their bags and coats are gone, and the receptionist saw them leave for home. They ___ gone home.'
                            item.update(correctAnswer='must have', acceptedAnswers=['must have', "must've", "must’ve"])
                if block['type'] in {'essay', 'recording'}:
                    block['aiGrading'] = False
                    modes = stage.get('modes', {})
                    native_modes = metadata.get('learningModes', {})
                    def instruction(value):
                        return value.get('instruction') if isinstance(value, dict) else value
                    individual = instruction(native_modes.get('individual')) or instruction(modes.get('individual')) or 'Realiza la tarea, revisa tu respuesta con los criterios y vuelve a intentarlo si hace falta.'
                    teacher = instruction(native_modes.get('teacher')) or instruction(modes.get('teacher')) or 'Intercambia las respuestas con tu profesora. Pídele una repregunta y feedback sobre el significado y la claridad.'
                    if number == 46:
                        individual = 'Inventa una decisión de proyecto y anota hechos y pistas. Prepara cinco frases, identifica su función y revisa si cada deducción expresa la certeza adecuada. Si grabas, escucha tu respuesta y corrígela antes de continuar.'
                        teacher = 'Explica la decisión a tu profesora. Ella te preguntará qué pistas justifican cada deducción y qué cambiaría en un pasado alternativo. Reformula las frases que no expresen tu intención.'
                    if number == 22:
                        individual = 'Redacta las normas y piensa qué significa cada modal. Relee tu texto con los criterios y corrige lo que no exprese tu intención.' if block['type'] == 'essay' else 'Interpreta las dos voces o explica las normas a un visitante imaginario. Escucha la respuesta y revisa qué significa cada modal.'
                        teacher = 'Redacta las normas con tu profesora y explica por qué cada acción es obligatoria, prohibida u opcional.' if block['type'] == 'essay' else 'Intercambia los papeles con tu profesora. Ella hará una repregunta y te pedirá distinguir una prohibición de una acción opcional.'
                    if not isinstance(individual, str) or not isinstance(teacher, str):
                        raise ValueError('Learning modes need learner-readable instructions')
                    metadata['learningModes'] = {'individual': individual, 'teacher': teacher}
                    checklists = {
                        2: ['Dije el país y la nacionalidad sin confundirlos.', 'Usé be from o come from con la forma adecuada.', 'Incluí una pregunta y una respuesta comprensibles.'],
                        22: ['Distinguí lo obligatorio, lo prohibido y lo opcional.', 'Expliqué una norma y un consejo según el contexto.', 'Usé el verbo base después del modal.'],
                        46: ['Incluí dos consejos retrospectivos y un resultado hipotético.', 'Añadí dos deducciones o posibilidades y las relacioné con las pistas.', 'Identifiqué la función de cada frase y usé modal + have + participio.'],
                    }
                    metadata['reviewChecklist'] = (['Escuché mi grabación.'] if block['type'] == 'recording' else ['Leí mi texto de nuevo.']) + checklists[number]
                    if number == 22 and 's08-' in native_id:
                        metadata['reviewChecklist'].append('Incluí la pregunta de permiso y respondí al caso de la zona reservada.')
                if block['type'] == 'audio':
                    source = audios.get(block['url'])
                    if source is None:
                        raise ValueError('An audio without an original binding is forbidden')
                    if source['id'] not in used_audio_ids:
                        row = copy.deepcopy(source)
                        original_data = copy.deepcopy(source['data'])
                        original_data['data'] = {**original_data.get('data', {}), **metadata}
                        original_data['instruction'] = block.get('instruction', 'Escucha el audio original.')
                        row['data'] = original_data
                        used_audio_ids.add(source['id'])
                    else:
                        metadata['originalAudioRowId'] = source['id']
                        row = {'id': f'course-guided-{lesson_id}-pilot-v1-{native_id}', 'title': block.get('title') or native_id, 'lessonId': lesson_id, 'parentId': None, 'contentType': 'RICH_TEXT', 'data': block}
                else:
                    row = {'id': f'course-guided-{lesson_id}-pilot-v1-{native_id}', 'title': block.get('title') or native_id, 'lessonId': lesson_id, 'parentId': None, 'contentType': 'RICH_TEXT', 'data': block}
                next_rows.append(row)
        if used_audio_ids != {row['id'] for row in audios.values()}:
            raise ValueError('Every original audio must remain live')
        teacher_guides = {
            2: '<p>Objetivo: comunicar el origen, no memorizar una lista de países. Pide al estudiante distinguir país y nacionalidad con ejemplos nuevos y comprobar be from frente a come from.</p><p>Usa las tarjetas de perfiles para un intercambio real: tú conservas una tarjeta y el estudiante otra. Haz una repregunta y pide una aclaración. Acepta contracciones y reformulaciones naturales.</p><p>Las preguntas auditivas se apoyan en frases claras de los originales. No atribuyas a un hablante datos de otro ni exijas detalles que no se oyen con claridad.</p><p>Observa si el estudiante comunica país y nacionalidad, formula una pregunta y entiende la respuesta. La autoevaluación individual prepara esa evidencia; no sustituye observar una conversación real.</p>',
            22: '<p>Objetivo: interpretar la fuerza de una norma o un consejo. Contrasta mustn’t (prohibido) con don’t have to (opcional). Must y have to pueden expresar obligación; no impongas una separación rígida entre motivos internos y externos.</p><p>En los audios, atribuye los consejos al personaje que los da. Las preferencias sobre una visita no son normas universales. Pide comparar con otro hogar o contexto.</p><p>Alterna visitante y anfitrión en el diálogo y cambia un detalle. Después, pregunta por qué una acción es obligatoria, prohibida u opcional. En el texto final, comprueba también la respuesta al visitante de la zona reservada.</p><p>Evalúa ajuste al contexto, forma del modal y claridad. Ofrece una reformulación y solicita otro intento. Las casillas de autoevaluación registran revisión, no una nota de dominio.</p>',
            46: '<p>Objetivo: distinguir consejo retrospectivo, resultado hipotético y deducción basada en pistas. Pregunta primero qué quiere expresar el hablante y después elige la forma.</p><p>En la primera escucha, trabaja la situación global y frases que se entiendan con seguridad. No conviertas pasajes dudosos en claves factuales ni en modelos. Para arrepentimiento, usa ejemplos nuevos y claros con should have o shouldn’t have.</p><p>Para las deducciones, pide justificar el grado de certeza. May, might y could have pueden expresar posibilidades válidas. Una condición puede entenderse por el contexto sin aparecer siempre en una cláusula if.</p><p>En la tarea final, observa dos recomendaciones retrospectivas, un resultado alternativo y dos deducciones o posibilidades. Acepta paráfrasis coherentes, pide una repregunta y solicita una reparación si el modal cambia la intención. La autoevaluación no certifica nivel.</p>',
        }
        next_rows.append({'id': f'course-guided-{lesson_id}-pilot-v1-teacher-guide', 'title': 'Guía pedagógica del piloto', 'lessonId': lesson_id, 'parentId': None, 'contentType': 'RICH_TEXT',
            'data': {'type': 'teacher_notes', 'title': 'Guía pedagógica', 'content': teacher_guides[number], 'data': {'learningRevision': REVISION, 'pilotUnit': number}}})
        for source in previous:
            if source['id'] in used_audio_ids:
                continue
            archived = copy.deepcopy(source)
            archived['data'].setdefault('data', {}).update({
                'learningRevision': REVISION, 'archivedPilotSource': True,
                'originalSource': copy.deepcopy(source['data']), 'originalOrder': source['order']})
            next_rows.append(archived)
        if len({row['id'] for row in next_rows}) != len(next_rows):
            raise ValueError('Duplicate runtime identity')
        for order, row in enumerate(next_rows):
            row['order'] = order
        plans.append({'courseId': snapshot['courseId'], 'lessonId': lesson_id, 'unit': number,
            'publishable': True, 'blockers': [], 'previousRows': previous, 'nextRows': next_rows,
            'review': {'revision': REVISION, 'scenes': scene_count, 'originalsArchivedIntact': True, 'audioIds': sorted(used_audio_ids), 'assessment': 'formative choices and self-review; proficiency requires teacher observation'}})
    path = Path(__file__).with_name('apply-course-learning.py')
    module_spec = importlib.util.spec_from_file_location('pilot_apply_guard', path)
    guard = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(guard)
    guard.validate_plans(plans)
    return {'schemaVersion': 1, 'plans': plans}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--spec', required=True, action='append', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = build(json.loads(args.snapshot.read_text(encoding='utf-8-sig')),
        [json.loads(path.read_text(encoding='utf-8-sig')) for path in args.spec])
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Three reviewed pilots compiled. No database writes.')


if __name__ == '__main__':
    main()
