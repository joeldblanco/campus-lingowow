"""Reject accidental vocabulary pairs extracted from URLs and prose."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    'editorial_builder', Path(__file__).parents[2] / 'scripts/content/build-course-learning.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class EditorialPairExtractionTests(unittest.TestCase):
    def test_url_slug_is_not_a_vocabulary_definition(self):
        self.assertEqual(builder._extract_pairs([
            'https://example.com/english-resource-by-gerunds',
            'See https://example.com/rurouni-kenshin for reading.']), [])

    def test_hyphenated_prose_is_not_a_definition(self):
        self.assertEqual(builder._extract_pairs([
            'Read this well-known article about the nineteenth-century world.']), [])

    def test_complete_authored_pairs_keep_apostrophes(self):
        self.assertEqual(builder._extract_pairs([
            'Jake’s and Jill’s children - Two owners and two possessions']), [
                {'term': 'Jake’s and Jill’s children',
                 'definition': 'Two owners and two possessions'}])

    def test_explicit_pair_retains_source_order(self):
        self.assertEqual(builder._extract_pairs(['Name - Nombre', 'Age – Edad']), [
            {'term': 'Name', 'definition': 'Nombre'},
            {'term': 'Age', 'definition': 'Edad'}])
