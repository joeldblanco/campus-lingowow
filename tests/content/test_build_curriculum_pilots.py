import copy
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[2] / 'scripts/content/build-curriculum-pilots.py'
spec = importlib.util.spec_from_file_location('curriculum_pilots', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture():
    lessons = [{'id': f'lesson{n}', 'rows': []} for n in range(1, 57)]
    specifications = []
    for n in [2, 22, 46]:
        lesson = lessons[n - 1]
        base = {'lessonId': lesson['id'], 'parentId': None, 'contentType': 'RICH_TEXT'}
        lesson['rows'] = [{**base, 'id': f'old{n}', 'title': 'Old source', 'order': 0, 'data': {'type': 'embed', 'url': 'https://docs.google.com/original'}},
            {**base, 'id': f'audio{n}', 'title': 'Original audio', 'order': 1, 'data': {'type': 'audio', 'url': f'/audio/{n}.mp3', 'data': {'digest': 'immutable'}}}]
        blocks = [{'id': 'teach', 'type': 'text', 'content': '<p>Read the situation.</p>'},
            {'id': 'listen', 'type': 'audio', 'url': f'/audio/{n}.mp3'},
            {'id': 'choose', 'type': 'multiple_choice', 'items': [{'id': 'item', 'question': 'Optional?', 'options': [{'id': 'yes', 'text': 'Optional'}, {'id': 'no', 'text': 'Required'}], 'correctOptionId': 'yes', 'explanation': 'It is not required.'}]},
            {'id': 'write', 'type': 'essay', 'prompt': 'Write a rule.', 'aiGrading': False}]
        stage = {'id': 'teach-practice', 'title': 'Aprende y practica.', 'runtimeBlocks': blocks}
        specifications.append({'unit': {'number': n, 'lessonId': lesson['id']}, 'scenes' if n == 22 else 'sequence': [stage]})
    return {'courseId': 'cmjnr0g5x0001jp04fsw2fejs', 'database': 'lingowow_dev', 'lessons': lessons}, specifications


class CurriculumPilotTests(unittest.TestCase):
    def test_unit46_keeps_the_task_once_and_the_example_optional_with_answer_variants(self):
        snapshot, specifications = fixture()
        runtime = specifications[2]['sequence'][0]['runtimeBlocks']
        runtime[0]['id'] = 'u46-stage-8-teaching'
        runtime.append({'id': 'deduction', 'type': 'short_answer', 'items': [
            {'id': 'u46-infer-2', 'question': 'The delivery record is incomplete. The package ___ arrived at reception.', 'correctAnswer': 'might have'}]})
        plan = module.build(snapshot, specifications)['plans'][2]
        live = [row['data'] for row in plan['nextRows'] if not row['data'].get('data', {}).get('archivedPilotSource')]
        task = next(block for block in live if block['type'] == 'text' and '<ul>' in block.get('content', ''))
        self.assertEqual(task['content'].count('<li>'), 3)
        self.assertIn('<details><summary', task['content'])
        self.assertIn('Ver un ejemplo</summary>', task['content'])
        self.assertNotIn(' open', task['content'])
        essay = next(block for block in live if block['type'] == 'essay')
        self.assertEqual(essay['prompt'], 'Tu respuesta')
        self.assertLess(len(essay['data']['learningModes']['individual'].split()), 20)
        self.assertEqual(len(essay['data']['reviewChecklist']), 3)
        short = next(block for block in live if block['type'] == 'short_answer')
        self.assertEqual(short['data']['answerLayout'], 'inlineBlank')
        self.assertTrue({'may have', 'might have', 'could have'} <= set(short['items'][0]['acceptedAnswers']))
        self.assertNotIn('Completa solo el hueco.', short['items'][0]['question'])

    def test_archives_originals_intact_and_reuses_audio_identity_without_mutating_input(self):
        snapshot, specifications = fixture()
        untouched = copy.deepcopy((snapshot, specifications))
        plans = module.build(snapshot, specifications)['plans']
        for plan in plans:
            before = {row['id']: row for row in plan['previousRows']}
            after = {row['id']: row for row in plan['nextRows']}
            self.assertTrue(before.keys() <= after.keys())
            for key, row in before.items():
                if row['data']['type'] == 'audio':
                    self.assertEqual(after[key]['data']['url'], row['data']['url'])
                    self.assertEqual(after[key]['data']['type'], 'audio')
                else:
                    self.assertEqual(after[key]['data']['data']['originalSource'], row['data'])
                    self.assertEqual(after[key]['data']['type'], row['data']['type'])
                    self.assertTrue(after[key]['data']['data']['archivedPilotSource'])
            self.assertEqual([row['order'] for row in plan['nextRows']], list(range(len(after))))
        self.assertEqual((snapshot, specifications), untouched)

    def test_one_exercise_per_scene_and_explicit_self_review_not_fake_ai_grading(self):
        snapshot, specifications = fixture()
        for plan in module.build(snapshot, specifications)['plans']:
            activities = [row['data'] for row in plan['nextRows'] if row['data']['type'] in module.INTERACTIVE]
            self.assertEqual(len({b['data']['pilotSceneId'] for b in activities}), len(activities))
            self.assertEqual(activities[0]['data']['feedbackMode'], 'continue')
            self.assertFalse(activities[1]['aiGrading'])
            self.assertTrue(activities[1]['data']['reviewChecklist'])
            self.assertEqual(set(activities[1]['data']['learningModes']), {'individual', 'teacher'})

    def test_rejects_production_or_wrong_pilot_set(self):
        snapshot, specifications = fixture()
        snapshot['database'] = 'lingowow'
        with self.assertRaisesRegex(ValueError, 'dev snapshot'):
            module.build(snapshot, specifications)
        snapshot['database'] = 'lingowow_dev'
        with self.assertRaisesRegex(ValueError, 'three approved'):
            module.build(snapshot, specifications[:2])

    def test_rejects_changed_audio_or_missing_original_audio(self):
        snapshot, specifications = fixture()
        specifications[0]['sequence'][0]['runtimeBlocks'][1]['url'] = '/new.mp3'
        with self.assertRaisesRegex(ValueError, 'original binding'):
            module.build(snapshot, specifications)
        specifications[0]['sequence'][0]['runtimeBlocks'].pop(1)
        with self.assertRaisesRegex(ValueError, 'Every original audio'):
            module.build(snapshot, specifications)

    def test_rejects_invalid_keys_and_duplicate_choice_ids(self):
        snapshot, specifications = fixture()
        item = specifications[0]['sequence'][0]['runtimeBlocks'][2]['items'][0]
        item['correctOptionId'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'choice key'):
            module.build(snapshot, specifications)
        item['correctOptionId'] = 'yes'
        item['options'][1]['id'] = 'yes'
        with self.assertRaisesRegex(ValueError, 'choice key'):
            module.build(snapshot, specifications)

    def test_rejects_lesson_identity_mismatch(self):
        snapshot, specifications = fixture()
        specifications[0]['unit']['lessonId'] = 'someone-else'
        with self.assertRaisesRegex(ValueError, 'identity'):
            module.build(snapshot, specifications)

    def test_rejects_cross_lesson_provenance(self):
        snapshot, specifications = fixture()
        specifications[0]['sequence'][0]['sourceIDs'] = ['audio22']
        with self.assertRaisesRegex(ValueError, 'another or missing source'):
            module.build(snapshot, specifications)


if __name__ == '__main__':
    unittest.main()
