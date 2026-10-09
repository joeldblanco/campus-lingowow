"""Release gate: audited findings cannot be silently omitted or misattributed."""
import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('editorial_gate', Path(__file__).parents[2] / 'scripts/content/build-editorial-corrections.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class EditorialCorrectionGateTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = {'database': 'lingowow_dev', 'courseId': gate.guard.COURSE_ID,
                         'lessons': [{'id': 'l1', 'rows': [{'id': 'r1', 'lessonId': 'l1', 'data': {'type': 'text', 'content': 'bad'}}]}]}
        self.report = {'findings': [{'id': 'E1', 'classification': 'confirmed'}, {'id': 'P1', 'classification': 'preference'}]}
        self.document = {'schemaVersion': 1, 'patches': [{'lessonId': 'l1', 'rowId': 'r1', 'reason': 'Correct reviewed error',
                         'changes': [{'path': ['content'], 'before': 'bad', 'after': 'good'}]}],
                         'coverage': [{'findingId': 'E1', 'status': 'patched', 'rowIds': ['r1']}]}

    def test_complete_review_changes_only_expected_content(self):
        original = copy.deepcopy(self.snapshot)
        plan, expected = gate.build(self.snapshot, self.report, [self.document])
        self.assertEqual(expected['lessons'][0]['rows'][0]['data']['content'], 'good')
        self.assertEqual(plan['plans'][0]['previousRows'], original['lessons'][0]['rows'])
        self.assertEqual(self.snapshot, original)

    def test_missing_finding_blocks_release(self):
        self.document['coverage'] = []
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            gate.build(self.snapshot, self.report, [self.document])

    def test_unresolved_finding_blocks_release(self):
        self.document['coverage'][0]['status'] = 'unresolved'
        with self.assertRaisesRegex(ValueError, 'unresolved'):
            gate.build(self.snapshot, self.report, [self.document])

    def test_preference_is_not_authorized_as_confirmed_correction(self):
        self.document['coverage'][0]['findingId'] = 'P1'
        with self.assertRaisesRegex(ValueError, 'unreviewed'):
            gate.build(self.snapshot, self.report, [self.document])

    def test_claim_without_changed_row_is_rejected(self):
        self.document['coverage'][0]['rowIds'] = ['unpatched']
        with self.assertRaisesRegex(ValueError, 'implemented'):
            gate.build(self.snapshot, self.report, [self.document])

    def test_duplicate_coverage_is_rejected(self):
        self.document['coverage'].append(copy.deepcopy(self.document['coverage'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            gate.build(self.snapshot, self.report, [self.document])
