"""Verified pronunciation media must stay inside the pilot boundary."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('pilot_seed_media', Path(__file__).parents[2] / 'scripts/content/apply-a1-module1-pilot.py')
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)

class PronunciationMediaTests(unittest.TestCase):
    def setUp(self):
        self.block = {'id': 'a1teach-sounds', 'type': 'vocabulary', 'order': 0,
            'data': {'learningRevision': seed.REVISION, 'pilotSceneId': 'a1teach-sound-scene',
                'scene': '/images/lessons/backgrounds/campus.webp', 'teachingPresentation': 'pronunciation'},
            'items': [{'id': 'a', 'term': 'A', 'definition': 'Letra', 'audioUrl': '/audio/a1-module1-pilot/teach-a.mp3'},
                {'id': 'n', 'term': 'N', 'definition': 'Letra', 'audioUrl': '/audio/a1-module1-pilot/teach-n.mp3'}]}
        self.manifest = {f'public/audio/a1-module1-pilot/teach-{letter}.mp3': {} for letter in ('a', 'n')}

    def test_accepts_each_verified_local_sound(self):
        self.assertEqual(seed._validate_block(self.block, label='sounds', audio_manifest=self.manifest), self.block)

    def test_rejects_unverified_or_external_sound(self):
        for url in ('/audio/a1-module1-pilot/missing.mp3', 'https://example.org/a.mp3', 'data:audio/mp3;base64,AA'):
            block = copy.deepcopy(self.block)
            block['items'][0]['audioUrl'] = url
            with self.assertRaises(seed.PlanError): seed._validate_block(block, label='sounds', audio_manifest=self.manifest)

    def test_rejects_other_media_and_missing_sound(self):
        for change in ('ordinary', 'missing', 'nested'):
            block = copy.deepcopy(self.block)
            if change == 'ordinary': block['data'].pop('teachingPresentation')
            if change == 'missing': block['items'][0].pop('audioUrl')
            if change == 'nested': block['data']['unexpected'] = '/audio/a1-module1-pilot/missing.mp3'
            with self.assertRaises(seed.PlanError): seed._validate_block(block, label='sounds', audio_manifest=self.manifest)

if __name__ == '__main__': unittest.main()
