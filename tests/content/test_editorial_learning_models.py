"""Regression examples grounded in the audited live curriculum."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[2]
spec = importlib.util.spec_from_file_location('learning_model_guard', ROOT / 'scripts/content/build-pedagogical-corrections.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class EditorialLearningModelsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.originals = json.loads(Path(__file__).with_name('editorial-model-fixture.json').read_text(encoding='utf-8'))
        cls.patches = {}
        for name in ('01-18', '19-37', '38-56'):
            document = json.loads((ROOT / f'docs/audit/editorial-patches-{name}.json').read_text(encoding='utf-8'))
            cls.patches.update({patch['rowId']: patch for patch in document['patches']})
        report = json.loads((ROOT / 'docs/audit/editorial-reviewed-findings.json').read_text(encoding='utf-8'))
        cls.findings = {item['id']: item for item in report['findings']}

    def corrected(self, finding):
        row_id = self.findings[finding]['rowId']
        original = next(row for row in self.originals if row['id'] == row_id)
        return guard.apply_changes(original, self.patches[row_id]['changes'])['data']

    def test_parent_origin_question_does_not_assume_birthplace(self):
        question = self.corrected('E001')['items'][6]
        self.assertIn('parents', question['question'])
        self.assertEqual(question['correctAnswer'].casefold(), 'japan')

    def test_dialogue_ipad_owner_key_is_false(self):
        self.assertEqual(self.corrected('E010')['items'][5]['correctOptionId'], 'false')

    def test_modal_chart_does_not_teach_a_fixed_probability_ranking(self):
        model = self.corrected('E062')
        self.assertIn('context', model['subtitle'].casefold())
        self.assertNotIn('high to low', model['subtitle'].casefold())
        self.assertEqual(model['content']['headers'], ['Structure', 'Example'])
        self.assertEqual([row[0].split()[0] for row in model['content']['rows']], ['Might', 'May', 'Could'])

    def test_shot_in_the_dark_model_expresses_an_unsupported_guess(self):
        row = self.corrected('E096')['content']['rows'][2]
        self.assertIn('without enough information', row[1])
        self.assertIn('guessed', row[2])

    def test_sources_remain_exact_in_every_model_fixture(self):
        for original in self.originals:
            with self.subTest(row=original['id']):
                corrected = guard.apply_changes(original, self.patches[original['id']]['changes'])
                self.assertEqual(guard.protected_values(original['data']), guard.protected_values(corrected['data']))
