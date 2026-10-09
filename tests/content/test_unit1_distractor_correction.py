import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('unit1_distractor', Path(__file__).parents[2] / 'scripts/content/apply-unit1-distractor.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Unit1DistractorTests(unittest.TestCase):
    def setUp(self):
        self.data = {'type': 'multiple_choice', 'items': [{
            'id': 'carl-house', 'correctOptionId': 'saopaulo', 'options': [
                {'id': 'saopaulo', 'text': 'Sao Paulo'}, {'id': 'rio', 'text': 'Rio de Janeiro'},
                {'id': 'miami', 'text': 'Miami'}, {'id': 'carl-house-fourth', 'text': 'Rio de Janeiro'}]}],
            'data': {'scene': '/carl.webp'}}

    def test_unique_options_keep_correct_key_and_media(self):
        result = module.corrected_data(self.data)
        item = result['items'][0]
        self.assertEqual(len(set(option['text'] for option in item['options'])), 4)
        self.assertEqual(item['correctOptionId'], 'saopaulo')
        self.assertEqual(result['data'], self.data['data'])
        self.assertEqual(item['options'][3]['id'], 'carl-house-fourth')
        self.assertEqual(self.data['items'][0]['options'][3]['text'], 'Rio de Janeiro')

    def test_rejects_changed_question_instead_of_overwriting(self):
        self.data['items'][0]['options'][0]['text'] = 'Someone edited this'
        with self.assertRaises(ValueError):
            module.corrected_data(self.data)

    def test_defaults_to_rollback_and_guards_history_and_dev(self):
        sql = module.build_sql(self.data)
        self.assertTrue(sql.endswith('ROLLBACK;'))
        for guard in ['lingowow_dev', 'CAS rejected', 'lesson_progress', 'user_contents', 'block_responses']:
            self.assertIn(guard, sql)


if __name__ == '__main__':
    unittest.main()
