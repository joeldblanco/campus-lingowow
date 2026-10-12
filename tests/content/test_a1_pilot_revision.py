"""Safety invariants for updating an existing pilot without deleting history."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parents[2]
spec = importlib.util.spec_from_file_location('a1_revision', ROOT / 'scripts/content/apply-a1-pilot-revision.py')
revision = importlib.util.module_from_spec(spec)
spec.loader.exec_module(revision)
seed_spec = importlib.util.spec_from_file_location('seed_tests', ROOT / 'tests/content/test_apply_a1_module1_pilot.py')
fixture = importlib.util.module_from_spec(seed_spec)
seed_spec.loader.exec_module(fixture)

class RevisionTests(unittest.TestCase):
    def setUp(self):
        self.old = fixture.make_plan()
        self.new = copy.deepcopy(self.old)
        self.new['lessons'][0]['blocks'][0]['content'] = 'Explicit teaching'
        added = copy.deepcopy(self.old['lessons'][0]['blocks'][0])
        added.update(id='a1teach-new', order=1)
        self.new['lessons'][0]['blocks'].append(added)
        self.audio = {'files': []}
        # SQL/CAS fixture has no media; asset hashing has its own integration
        # tests and must not be bypassed by the production updater.
        guard = patch.object(revision.seed, 'validate_audio_manifest', return_value={})
        guard.start()
        self.addCleanup(guard.stop)
        baseline = patch.object(revision, 'require_approved_baseline')
        baseline.start()
        self.addCleanup(baseline.stop)

    def test_rollback_default_cas_exact_inventory_and_history_fingerprints(self):
        sql = revision.build_sql(self.old, self.new, self.audio, self.audio)
        self.assertTrue(sql.rstrip().endswith('ROLLBACK;'))
        self.assertIn('FULL JOIN', sql)
        self.assertIn('c.data IS DISTINCT FROM o.data', sql)
        self.assertIn('FOR UPDATE', sql)
        for table in ('lesson_progress', 'user_contents', 'block_responses', 'user_activities', 'enrollments', '"User"'):
            self.assertIn('FROM ' + table, sql)
            self.assertNotIn('UPDATE ' + table, sql)
        self.assertNotIn('DELETE ', sql)
        self.assertTrue(revision.build_sql(self.old, self.new, self.audio, self.audio, apply=True).rstrip().endswith('COMMIT;'))

    def test_rejects_removed_identity_and_cross_lesson_move(self):
        removed = copy.deepcopy(self.new)
        removed['lessons'][0]['blocks'].pop(0)
        removed['lessons'][0]['blocks'][0]['order'] = 0
        with self.assertRaises(revision.PlanError): revision.validate_revision(self.old, removed, self.audio, self.audio)
        moved = copy.deepcopy(self.old)
        block = moved['lessons'][0]['blocks'].pop()
        replacement = copy.deepcopy(block)
        replacement['id'] = 'a1teach-replacement'
        moved['lessons'][0]['blocks'].append(replacement)
        block['order'] = 1
        moved['lessons'][1]['blocks'].append(block)
        with self.assertRaises(revision.PlanError): revision.validate_revision(self.old, moved, self.audio, self.audio)

    def test_rejects_changes_to_course_and_unreviewed_new_identity(self):
        for case in ('course', 'new'):
            changed = copy.deepcopy(self.new)
            if case == 'course': changed['course']['title'] += ' changed'
            else: changed['lessons'][0]['blocks'][-1]['id'] = 'unreviewed-new-id'
            with self.assertRaises(revision.PlanError): revision.validate_revision(self.old, changed, self.audio, self.audio)

    def test_original_audio_entries_cannot_be_replaced(self):
        before = {'files': [{'path': 'old.mp3', 'sha256': 'a', 'sourceEnglishTranscript': 'Original'}]}
        after = copy.deepcopy(before)
        after['files'][0]['sha256'] = 'b'
        with patch.object(revision.seed, 'validate_plan'):
            with self.assertRaises(revision.PlanError): revision.validate_revision(self.old, self.new, before, after)

    def test_original_audio_url_hash_and_transcript_are_bound_to_each_id(self):
        old = copy.deepcopy(self.old)
        old['lessons'][0]['blocks'][0].update(type='audio', url='/audio/a1-module1-pilot/original.mp3', transcript='Hello')
        old['lessons'][0]['blocks'][0]['data'].update(sha256='a'*64, spokenTranscript='Hello')
        for field in ('url', 'hash', 'transcript', 'type'):
            new = copy.deepcopy(old)
            block = new['lessons'][0]['blocks'][0]
            if field == 'url': block['url'] = '/audio/a1-module1-pilot/other-approved.mp3'
            elif field == 'hash': block['data']['sha256'] = '0'*64
            elif field == 'transcript': block['data']['spokenTranscript'] = 'Other recording'
            else: block['type'] = 'text'
            with patch.object(revision.seed, 'validate_plan'):
                with self.assertRaisesRegex(revision.PlanError, 'Original audio identity'):
                    revision.validate_revision(old, new, self.audio, self.audio)

    def test_production_baseline_guard_rejects_unreviewed_snapshot(self):
        with patch.object(revision, 'APPROVED_BASELINE_SHA256', 'reviewed'), patch.object(revision, 'APPROVED_AUDIO_SHA256', 'reviewed'):
            # Test the real function, independent of the SQL fixture mock.
            spec = importlib.util.spec_from_file_location('real_baseline_guard', ROOT / 'scripts/content/apply-a1-pilot-revision.py')
            actual = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(actual)
            with self.assertRaisesRegex(actual.PlanError, 'reviewed ed4dffb'):
                actual.require_approved_baseline(self.old, self.audio)

    def test_remote_boundary_remains_dev_only(self):
        script = revision.seed.build_remote_script(revision.build_sql(self.old, self.new, self.audio, self.audio))
        self.assertIn('DEV_DB_UUID" != "$PROD_DB_UUID', script)
        self.assertIn('u.pathname !== "/lingowow_dev"', script)
        self.assertNotIn('PROD_DB_PASSWORD', script)

if __name__ == '__main__': unittest.main()
