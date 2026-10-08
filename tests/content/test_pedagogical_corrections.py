import copy
import importlib.util
import unittest
from pathlib import Path

PATH = Path(__file__).parents[2] / 'scripts/content/build-pedagogical-corrections.py'
spec = importlib.util.spec_from_file_location('pedagogical_corrections', PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReviewedCorrectionsTests(unittest.TestCase):
    def setUp(self):
        self.row = {'id': 'r1', 'lessonId': 'l1', 'data': {
            'type': 'recording', 'instruction': 'Write 30–50 words.',
            'data': {'originalSource': {'prompt': 'Write 30–50 words.'},
                     'scene': '/scene.webp', 'learningRevision': 'course-guided-v1'}}}

    def test_converts_written_task_without_changing_identity_or_source(self):
        original = copy.deepcopy(self.row)
        result = module.apply_changes(self.row, [
            {'path': ['type'], 'before': 'recording', 'after': 'essay'},
            {'path': ['prompt'], 'before': {'$missing': True}, 'after': 'Write 30–50 words.'},
        ])
        self.assertEqual(result['data']['type'], 'essay')
        self.assertEqual(result['id'], 'r1')
        self.assertEqual(result['data']['data'], original['data']['data'])
        self.assertEqual(self.row, original)

    def test_rejects_stale_review_instead_of_overwriting_new_content(self):
        with self.assertRaisesRegex(ValueError, 'before'):
            module.apply_changes(self.row, [{'path': ['instruction'], 'before': 'stale', 'after': 'new'}])

    def test_audio_and_provenance_cannot_be_changed(self):
        for path in [['url'], ['transcript'], ['data', 'originalSource', 'prompt'], ['data', 'scene']]:
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'protected'):
                module.apply_changes(self.row, [{'path': path, 'before': {'$missing': True}, 'after': 'new'}])

    def test_rejects_partial_failure_without_mutating_input(self):
        original = copy.deepcopy(self.row)
        with self.assertRaises(ValueError):
            module.apply_changes(self.row, [
                {'path': ['type'], 'before': 'recording', 'after': 'essay'},
                {'path': ['instruction'], 'before': 'stale', 'after': 'new'},
            ])
        self.assertEqual(self.row, original)

    def test_can_remove_incompatible_conversation_role_but_not_source(self):
        self.row['data']['data']['guidedRole'] = 'conversation'
        result = module.apply_changes(self.row, [
            {'path': ['data', 'guidedRole'], 'before': 'conversation', 'after': {'$delete': True}}])
        self.assertNotIn('guidedRole', result['data']['data'])
        self.assertIn('originalSource', result['data']['data'])

    def test_parent_object_cannot_bypass_source_protection(self):
        before = self.row['data']['data']
        with self.assertRaisesRegex(ValueError, 'protected'):
            module.apply_changes(self.row, [
                {'path': ['data'], 'before': before, 'after': {'learningRevision': 'course-guided-v1'}}])

    def test_plan_preserves_full_lesson_inventory_for_database_cas(self):
        row = copy.deepcopy(self.row)
        second = dict(copy.deepcopy(row), id='r2')
        snapshot = {'database': 'lingowow_dev', 'courseId': module.COURSE_ID,
                    'lessons': [{'id': 'l1', 'rows': [row, second]}]}
        patch = {'lessonId': 'l1', 'rowId': 'r1', 'reason': 'Written task',
                 'changes': [{'path': ['type'], 'before': 'recording', 'after': 'essay'}]}
        plan = module.build_plans(snapshot, [patch])[0]
        self.assertEqual(plan['previousRows'], [row, second])
        self.assertEqual(plan['nextRows'][1], second)
        self.assertEqual(snapshot['lessons'][0]['rows'], [row, second])

    def test_rejects_production_snapshot(self):
        with self.assertRaisesRegex(ValueError, 'dev'):
            module.build_plans({'database': 'lingowow_prod', 'courseId': module.COURSE_ID}, [])

    def test_unit1_cannot_enter_general_course_migration(self):
        snapshot = {'database': 'lingowow_dev', 'courseId': module.COURSE_ID,
                    'lessons': [{'id': module.UNIT_ONE, 'rows': []}]}
        with self.assertRaisesRegex(ValueError, 'Unit1'):
            module.build_plans(snapshot, [{'lessonId': module.UNIT_ONE, 'rowId': 'r1'}])


if __name__ == '__main__':
    unittest.main()
