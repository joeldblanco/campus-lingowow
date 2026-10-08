"""Content regressions: the authored course fails these before corrections."""
import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[2]
spec = importlib.util.spec_from_file_location('corrections', ROOT / 'scripts/content/build-pedagogical-corrections.py')
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))


class AuthoredPedagogyRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        baseline = read('docs/audit/course-builder-learning-draft.json')['plans'] + read('docs/audit/course53-56-learning-draft.json')['plans']
        cls.before = {row['id']: row for plan in baseline for row in plan['nextRows']}
        snapshot = {'database': 'lingowow_dev', 'courseId': engine.COURSE_ID,
                    'lessons': [{'id': plan['lessonId'], 'rows': plan['nextRows']} for plan in baseline]}
        cls.patches = []
        for suffix in ['02-18', '19-37', '38-56']:
            cls.patches.extend(read(f'docs/audit/pedagogy/patch-{suffix}.json')['patches'])
        cls.plans = engine.build_plans(snapshot, cls.patches)
        cls.after = {row['id']: row for plan in cls.plans for row in plan['nextRows']}

    def test_all_55_expanded_units_have_reviewed_corrections(self):
        self.assertEqual({patch['unit'] for patch in self.patches}, set(range(2, 57)))
        self.assertEqual(len(self.plans), 55)

    def test_nine_written_tasks_show_writing_controls_with_limits_when_authored(self):
        broken = [row for row in self.before.values() if row['data'].get('type') == 'recording'
                  and re.search(r'\bwrite\b', row['data'].get('instruction', ''), re.I)]
        self.assertEqual(len(broken), 9)
        for before in broken:
            with self.subTest(row=before['id']):
                data = self.after[before['id']]['data']
                self.assertEqual(data['type'], 'essay')
                self.assertTrue(data['prompt'])
                self.assertNotIn('guidedRole', data.get('data', {}))
                self.assertNotIn('turns', data.get('data', {}))
                if before['id'].find('cmk3z9vfj') < 0:  # U8 authors an unbounded written dialogue.
                    self.assertGreater(data.get('minWords', 0), 0)
                    self.assertGreaterEqual(data.get('maxWords', 0), data['minWords'])

    def test_actual_oral_conversations_have_several_distinct_supported_turns(self):
        oral = [row for row in self.after.values() if row['data'].get('type') == 'recording'
                and row['data'].get('data', {}).get('guidedRole') == 'conversation']
        # 54 genuine previously guided oral tasks + U4/U29 roleplays that
        # previously lacked the runtime guided-role marker.
        self.assertEqual(len(oral), 56)
        for row in oral:
            with self.subTest(row=row['id']):
                turns = row['data']['data']['turns']
                self.assertGreaterEqual(len(turns), 3)
                self.assertLessEqual(len(turns), 5)
                self.assertEqual(len({turn['id'] for turn in turns}), len(turns))
                self.assertTrue(all(turn.get('question') and turn.get('answerPrompt') for turn in turns))
                self.assertIn('ambos papeles', turns[0]['answerPrompt'].lower())

    def test_course_inventory_sources_and_original_media_are_unchanged(self):
        for plan in self.plans:
            self.assertEqual([row['id'] for row in plan['previousRows']], [row['id'] for row in plan['nextRows']])
            for before, after in zip(plan['previousRows'], plan['nextRows']):
                self.assertEqual(engine.protected_values(before['data']), engine.protected_values(after['data']))
                for field in ['id', 'title', 'order', 'contentType', 'parentId', 'lessonId']:
                    self.assertEqual(before.get(field), after.get(field))

    def test_reported_speech_questions_include_the_actual_statement(self):
        blocks = [row['data'] for row in self.after.values() if row['id'].startswith('course-guided-cmnmm9s1b')
                  and row['data'].get('type') == 'short_answer']
        self.assertTrue(blocks)
        items = [item for block in blocks for item in block['items']]
        self.assertTrue(all(item['question'] != 'Convert each direct statement/request into reported speech.' for item in items))
        self.assertGreater(len({item['question'] for item in items}), 1)

    def test_corrects_distinctions_without_rewriting_original_sources(self):
        used_to = next(row['data']['content'] for row in self.after.values()
                       if 'cmk3zs425' in row['id'] and 'text-8-talking-about' in row['id'])
        self.assertIn('be used to + noun or -ing', used_to)
        self.assertIn('usually + present simple', used_to)
        self.assertNotRegex(used_to, r'is used to read\b')
        relatives = next(row['data']['content'] for row in self.after.values()
                         if 'cmn7vc7pm' in row['id'] and 'text-8-we-use-relative' in row['id'])
        self.assertIn('no commas', relatives)
        self.assertIn('who or which, not that', relatives)
        self.assertIn('Jane, who lives here,', relatives)
        probability = next(row['data']['content'] for row in self.after.values()
                           if 'cmnmm9pns' in row['id'] and 'structured-content-10' in row['id'])
        text = json.dumps(probability)
        self.assertIn('context determines', text)
        self.assertNotIn('highly to happen', text)

    def test_removes_unrelated_external_resource_from_learner_text(self):
        row = next(row for row in self.after.values() if 'cmnmm9r0u' in row['id'] and 'text-8-phrasal' in row['id'])
        self.assertNotIn('animeonline', row['data']['content'])
        self.assertIn('animeonline', json.dumps(row['data']['data']['originalSource']))


if __name__ == '__main__':
    unittest.main()
