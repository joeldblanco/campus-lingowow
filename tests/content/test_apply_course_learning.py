import copy
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[2] / 'scripts/content/apply-course-learning.py'
spec = importlib.util.spec_from_file_location('apply_course_learning', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def plan():
    original = {'type': 'embed', 'url': 'https://docs.google.com/presentation/d/e/exact-source/pub'}
    row = {'id': 'original', 'title': 'Unit 2', 'order': 0, 'lessonId': 'lesson2', 'contentType': 'RICH_TEXT', 'parentId': None, 'data': original}
    revised = copy.deepcopy(row)
    revised['data'] = {'type': 'text', 'content': 'Preserved learning content', 'data': {'originalSource': original}}
    addition = {**row, 'id': 'course-guided-lesson2-slide2', 'order': 1, 'data': {'type': 'text', 'content': 'Original second slide'}}
    return {'courseId': module.COURSE_ID, 'lessonId': 'lesson2', 'publishable': True, 'blockers': [], 'previousRows': [row], 'nextRows': [revised, addition]}


class CourseApplyTests(unittest.TestCase):
    def test_defaults_to_rollback_and_contains_exact_source_cas(self):
        sql = module.build_sql([plan()])
        self.assertTrue(sql.rstrip().endswith('ROLLBACK;'))
        self.assertIn("current_database()<>'lingowow_dev'", sql)
        self.assertIn('c.data IS NOT DISTINCT FROM', sql)
        self.assertIn('Source CAS rejected', sql)
        self.assertIn('oldrows.row', sql)
        self.assertIn('History or Unit1 changed', sql)

    def test_apply_is_explicit(self):
        self.assertTrue(module.build_sql([plan()], apply=True).rstrip().endswith('COMMIT;'))

    def test_draft_lessons_are_excluded_at_the_database_boundary(self):
        sql = module.build_sql([plan()])
        self.assertIn('l."isPublished"=true', sql)
        self.assertIn('Unexpected course/published lesson', sql)

    def test_rejects_unreviewed_media_and_other_courses(self):
        for field, value in [('publishable', False), ('blockers', ['Missing audio']), ('courseId', 'other')]:
            with self.subTest(field=field):
                candidate = plan()
                candidate[field] = value
                with self.assertRaises(ValueError):
                    module.validate_plans([candidate])

    def test_rejects_unit_one_and_duplicate_lessons(self):
        candidate = plan()
        candidate['lessonId'] = module.UNIT_ONE
        with self.assertRaises(ValueError):
            module.validate_plans([candidate])
        with self.assertRaises(ValueError):
            module.validate_plans([plan(), plan()])

    def test_original_presentation_is_archived_intact(self):
        candidate = plan()
        candidate['nextRows'][0]['data']['data']['originalSource'] = {'url': 'substitute'}
        with self.assertRaises(ValueError):
            module.validate_plans([candidate])

    def test_rejects_deleted_records_cross_lesson_and_changed_identity(self):
        for mutation in [lambda p: p['nextRows'].pop(0), lambda p: p['nextRows'][0].update(title='Renamed'), lambda p: p['nextRows'][1].update(lessonId='other')]:
            candidate = plan()
            mutation(candidate)
            with self.assertRaises(ValueError):
                module.validate_plans([candidate])

    def test_original_audio_url_cannot_change(self):
        candidate = plan()
        candidate['previousRows'][0]['data'] = {'type': 'audio', 'url': 'https://original/audio.wav'}
        candidate['nextRows'][0]['data'] = {'type': 'audio', 'url': 'https://replacement/audio.wav'}
        with self.assertRaises(ValueError):
            module.validate_plans([candidate])

    def test_only_scoped_new_content_ids_and_contiguous_order(self):
        for field, value in [('id', 'unrelated'), ('order', 5), ('parentId', 'another'), ('contentType', 'IMAGE')]:
            candidate = plan()
            candidate['nextRows'][1][field] = value
            with self.assertRaises(ValueError):
                module.validate_plans([candidate])


if __name__ == '__main__':
    unittest.main()
