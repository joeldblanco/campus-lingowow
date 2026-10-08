import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "content" / "compose-course-builder-inputs.py"
SPEC = importlib.util.spec_from_file_location("compose_course_builder_inputs", SCRIPT)
assert SPEC and SPEC.loader
composer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(composer)


class ComposeCourseBuilderInputsTests(unittest.TestCase):
    def _table_review_fixture(self, root: Path, *, source_kind: str = "published-visible-text", approved: bool = True) -> tuple[dict, dict, dict, dict]:
        source_path = root / "published.json"
        native_path = root / "native.json"
        source_document = {
            "courseId": composer.COURSE_ID,
            "lesson": {"id": "lesson-44"},
            "sourceUrl": "https://example.test/unit-44",
            "deck": {
                "deckTitle": "Unit 44 - Source.pptx",
                "slides": [
                    {
                        "number": 11,
                        "title": "Check the chart.",
                        "visibleTexts": ["Check the chart.", "HEAD VALUE"],
                        "tables": [],
                    }
                ],
            },
        }
        source_path.write_text(json.dumps(source_document), encoding="utf-8")
        native_path.write_text("native audit bytes", encoding="utf-8")
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        projection = {
            "approved": approved,
            "source": source_kind,
            "nativeIdentityConfirmed": source_kind == "native-a:tbl",
            "mode": "structured" if approved else "text-only",
            "tables": [{"shapeId": "shape-1", "bbox": {"x": 1}, "columnWidths": [2], "rows": [["HEAD", "VALUE"]]}] if approved else [],
            "notes": "Reviewed source projection.",
        }
        review = {
            "tableReview": {
                "reviewPolicy": {
                    "publishedSlidesAuthoritativeOnMismatch": True,
                    "sourceQuotesRequired": True,
                    "nativeShapeProvenanceRequired": True,
                    "noInventedCellsOrExamples": True,
                    "publishedSourceProjectionAllowedWhenNativeDiffers": True,
                    "publishedSourceProjectionRequiresLiteralCellQuotes": True,
                },
                "entries": [
                    {
                        "unit": 44,
                        "lessonId": "lesson-44",
                        "sourceSlide": 11,
                        "status": "reviewed-published-source",
                        "clearTableSemanticsBlocker": True,
                        "sourceEvidence": {"publishedTitle": "Check the chart.", "publishedVisibleTexts": ["Check the chart.", "HEAD VALUE"], "differences": ["native differs"]},
                        "approvedProjection": projection,
                        "sourceRefs": [
                            {"kind": "published", "path": source_path.name, "sha256": digest(source_path)},
                            {"kind": "native", "path": native_path.name, "sha256": digest(native_path)},
                        ],
                    }
                ],
            }
        }
        sources = [source_document]
        return review, source_document, {44: source_document}, {"lesson-44": source_document}

    def test_table_review_published_projection_is_attached_and_native_substitution_is_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            review, source, by_unit, by_lesson = self._table_review_fixture(root)
            # The fixture references filenames relative to its root.
            blockers: list[dict] = []
            summary, decisions = composer._apply_table_review(
                review,
                [source],
                by_unit,
                by_lesson,
                [root],
                blockers,
            )

            self.assertEqual(summary["applied"], 1)
            self.assertEqual(summary["publishedProjections"], 1)
            self.assertEqual(blockers, [])
            slide = source["deck"]["slides"][0]
            self.assertEqual(slide["tables"][0]["rows"], [["HEAD", "VALUE"]])
            self.assertEqual(slide["data"]["tableReview"]["projection"]["source"], "published-visible-text")
            self.assertTrue(decisions[(44, 11)]["excludeNativeTables"])

    def test_table_review_text_only_preserves_source_without_inventing_matrix(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            review, source, by_unit, by_lesson = self._table_review_fixture(root, approved=False)
            entry = review["tableReview"]["entries"][0]
            entry["approvedProjection"]["mode"] = "text-only"
            entry["approvedProjection"]["source"] = "published-visible-text"
            entry["approvedProjection"]["nativeIdentityConfirmed"] = False
            entry["sourceEvidence"]["differences"] = []
            blockers: list[dict] = []
            summary, decisions = composer._apply_table_review(review, [source], by_unit, by_lesson, [root], blockers)

            self.assertEqual(summary["textOnly"], 1)
            self.assertEqual(blockers, [])
            slide = source["deck"]["slides"][0]
            self.assertEqual(slide["tables"], [])
            self.assertTrue(slide["tableSemantics"]["tableReferenceResolved"])
            self.assertFalse(decisions[(44, 11)]["excludeNativeTables"])

    def test_table_review_rejects_published_projection_claimed_as_native_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            review, source, by_unit, by_lesson = self._table_review_fixture(root, source_kind="published-visible-text")
            review["tableReview"]["entries"][0]["approvedProjection"]["nativeIdentityConfirmed"] = True
            blockers: list[dict] = []
            summary, _ = composer._apply_table_review(review, [source], by_unit, by_lesson, [root], blockers)

            self.assertEqual(summary["applied"], 0)
            self.assertIn("table-review-published-projection-native-identity-conflict", [item["code"] for item in blockers])
            self.assertEqual(source["deck"]["slides"][0]["tables"], [])

    def test_table_review_excludes_native_matrix_when_published_correction_is_recorded(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            review, source, by_unit, by_lesson = self._table_review_fixture(root, source_kind="native-a:tbl")
            entry = review["tableReview"]["entries"][0]
            entry["sourceEvidence"]["differences"] = [{"kind": "published-cell-correction"}]
            blockers: list[dict] = []
            summary, decisions = composer._apply_table_review(review, [source], by_unit, by_lesson, [root], blockers)

            self.assertEqual(summary["applied"], 1)
            self.assertEqual(summary["excludedNativeTables"], 1)
            self.assertTrue(decisions[(44, 11)]["excludeNativeTables"])
            self.assertEqual(blockers, [])

    def test_unit3_missing_slide_reuses_only_the_verified_audio2_slide(self) -> None:
        source = {
            "lesson": {"id": "lesson-3"},
            "deck": {
                "slides": [
                    {
                        "number": 4,
                        "visibleTexts": ["Look at the picture.", "Listen to the audio."],
                        "mediaSummary": {"audioIconCount": 1},
                    }
                ]
            },
        }
        blockers = []
        result = composer._normalize_listening(
            [
                {
                    "exercises": [
                        {
                            "lessonId": "lesson-3",
                            "unit": 3,
                            "slideNumber": None,
                            "audioIndex": 2,
                            "items": [],
                        }
                    ]
                }
            ],
            {"lesson-3": source},
            [
                {
                    "lessonId": "lesson-3",
                    "unit": 3,
                    "audioNumber": 2,
                    "slideNumber": 4,
                }
            ],
            blockers,
        )

        self.assertEqual(result["exercises"][0]["slideNumber"], 4)
        self.assertIn("original Audio 2", result["exercises"][0]["mappingRationale"])
        self.assertEqual(blockers, [])

    def test_correspondence_is_the_only_source_for_units33_to36(self) -> None:
        blockers = []
        figures, counts = composer._figure_candidates(
            {
                "units": {
                    "33": {
                        "unit": 33,
                        "slides": {
                            "4": {
                                "confirmedInstructionalAssets": [
                                    {
                                        "confirmedInstructional": True,
                                        "sha256": "a" * 64,
                                        "localPath": "figure-a.jpg",
                                    }
                                ]
                            }
                        },
                    }
                }
            },
            {
                "units": [
                    {
                        "unit": 33,
                        "slideFindings": [{"sourceSlide": 4, "status": "confirmed", "purpose": "picture"}],
                        "correspondences": [
                            {
                                "sourceSlide": 4,
                                "publishedSlide": 4,
                                "sha256": "b" * 64,
                                "localPath": "figure-b.jpg",
                            }
                        ],
                    }
                ]
            },
            {"b" * 64: {"status": "ready", "publicUrl": "/figure-b.webp", "sourceSha256": "b" * 64}},
            {},
            {33: {"lesson": {"id": "lesson-33"}}},
            [Path.cwd()],
            blockers,
        )

        self.assertEqual(counts["candidateReferences"], 1)
        self.assertEqual([item["sourceSha256"] for item in figures], [])
        self.assertIn("figure-source-file-missing", [item["code"] for item in blockers])
        self.assertNotIn("a" * 64, {item["sourceSha256"] for item in figures})

    def test_visual_proof_accepts_observed_slide_and_byte_exact_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "figure.jpg"
            source.write_bytes(b"verified published/native figure")
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            proof = {
                "units": [
                    {
                        "unit": 33,
                        "requiredSlides": [
                            {
                                "publishedSlide": 4,
                                "observedSlideUrlSuffix": "slide=id.observed-4",
                                "candidates": [
                                    {
                                        "publishedSlide": 4,
                                        "publishedMediaOrdinal": 1,
                                        "nativePath": source.name,
                                        "nativeSha256": digest,
                                        "publishedReferenceSha256": digest,
                                        "publishedReferencePath": "published/u33-s4.jpg",
                                        "publishedReferenceBytes": source.stat().st_size,
                                        "visualStatus": "confirmed",
                                        "byteExactMatch": True,
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
            blockers = []
            figures, counts = composer._figure_candidates(
                None,
                {
                    "units": [
                        {
                            "unit": 33,
                            "slideFindings": [{"sourceSlide": 4, "status": "confirmed"}],
                            "correspondences": [{"sourceSlide": 4, "publishedSlide": 4, "sha256": "f" * 64, "localPath": "old.jpg"}],
                        }
                    ]
                },
                {digest: {"status": "ready", "sourceSha256": digest, "publicUrl": "/figure.webp"}},
                {},
                {33: {"lesson": {"id": "lesson-33"}}},
                [root],
                blockers,
                proof,
                "docs/audit/figure-proof/units-33-36-visual-proof.json",
            )

            self.assertEqual(counts["candidateReferences"], 1)
            self.assertEqual(len(figures), 1)
            self.assertEqual(figures[0]["nativeEvidence"]["mapping"], "units-33-36-visual-proof")
            self.assertEqual(figures[0]["sourceProofRef"]["manifest"], "docs/audit/figure-proof/units-33-36-visual-proof.json")
            self.assertEqual(figures[0]["nativeEvidence"]["sourceProofRef"]["observedSlideUrlSuffix"], "slide=id.observed-4")
            self.assertEqual(blockers, [])

    def test_visual_proof_rejects_false_candidate_even_with_old_correspondence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "figure.jpg"
            source.write_bytes(b"native bytes")
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            proof = {
                "units": [
                    {
                        "unit": 33,
                        "requiredSlides": [
                            {
                                "publishedSlide": 4,
                                "observedSlideUrlSuffix": "slide=id.observed-4",
                                "candidates": [
                                    {
                                        "publishedSlide": 4,
                                        "nativePath": source.name,
                                        "nativeSha256": digest,
                                        "publishedReferenceSha256": "0" * 64,
                                        "visualStatus": "confirmed",
                                        "byteExactMatch": False,
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
            blockers = []
            figures, _ = composer._figure_candidates(
                None,
                {
                    "units": [
                        {
                            "unit": 33,
                            "slideFindings": [{"sourceSlide": 4, "status": "confirmed"}],
                            "correspondences": [{"sourceSlide": 4, "publishedSlide": 4, "sha256": digest, "localPath": source.name}],
                        }
                    ]
                },
                {digest: {"status": "ready", "sourceSha256": digest, "publicUrl": "/figure.webp"}},
                {},
                {33: {"lesson": {"id": "lesson-33"}}},
                [root],
                blockers,
                proof,
                "proof.json",
            )

            self.assertEqual(figures, [])
            self.assertIn("figure-proof-not-exact", [item["code"] for item in blockers])
            self.assertNotIn("figure-correspondence-not-exact", [item["code"] for item in blockers])

    def test_figure_uses_verified_absolute_staged_source_when_review_path_is_elsewhere(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source-original.jpg"
            source.write_bytes(b"source-import original bytes")
            destination = root / "public-optimized.webp"
            destination.write_bytes(b"optimized browser bytes")
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            destination_digest = hashlib.sha256(destination.read_bytes()).hexdigest()
            blockers: list[dict] = []
            figures, _ = composer._figure_candidates(
                {
                    "units": {
                        "2": {
                            "slides": {
                                "4": {
                                    "confirmedInstructionalAssets": [
                                        {
                                            "confirmedInstructional": True,
                                            "sha256": digest,
                                            "localPath": "missing-from-application-worktree.jpg",
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                None,
                {
                    digest: {
                        "status": "already-staged",
                        "sourceSha256": digest,
                        "sourcePath": str(source),
                        "destinationPath": str(destination),
                        "outputSha256": destination_digest,
                        "publicUrl": "/images/public-optimized.webp",
                    }
                },
                {},
                {2: {"lesson": {"id": "lesson-2"}}},
                [root],
                blockers,
            )

            self.assertEqual(len(figures), 1)
            self.assertEqual(figures[0]["assetPath"], str(source.resolve()))
            self.assertEqual(figures[0]["nativeEvidence"]["sourcePath"], str(source.resolve()))
            self.assertEqual(
                figures[0]["nativeEvidence"]["stagedDestinationPath"],
                str(destination.resolve()),
            )
            self.assertNotIn("figure-source-file-missing", [item["code"] for item in blockers])
            self.assertNotIn("figure-source-sha-mismatch", [item["code"] for item in blockers])
            self.assertNotIn("figure-destination-sha-mismatch", [item["code"] for item in blockers])

    def test_figure_rejects_existing_source_with_wrong_digest(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            wrong_source = root / "wrong.jpg"
            wrong_source.write_bytes(b"wrong bytes")
            expected_digest = "a" * 64
            blockers: list[dict] = []
            figures, _ = composer._figure_candidates(
                {
                    "units": {
                        "2": {
                            "slides": {
                                "4": {
                                    "confirmedInstructionalAssets": [
                                        {
                                            "confirmedInstructional": True,
                                            "sha256": expected_digest,
                                            "localPath": str(wrong_source),
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                None,
                {
                    expected_digest: {
                        "status": "ready",
                        "sourceSha256": expected_digest,
                        "publicUrl": "/figure.webp",
                    }
                },
                {},
                {2: {"lesson": {"id": "lesson-2"}}},
                [root],
                blockers,
            )

            self.assertEqual(figures, [])
            self.assertIn("figure-source-sha-mismatch", [item["code"] for item in blockers])

    def test_explicit_semantic_patch_validates_sha_evidence_and_rekeys_item(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            provenance_file = root / "published-source.json"
            provenance_file.write_text("source bytes", encoding="utf-8")
            provenance_sha = hashlib.sha256(provenance_file.read_bytes()).hexdigest()
            source = {
                "sourceUrl": "https://example.test/unit-33",
                "deck": {
                    "deckTitle": "Unit 33 - Source.pptx",
                    "slides": [{"number": 4, "visibleTexts": ["Published prompt"]}],
                },
            }
            review = {
                "schemaVersion": 1,
                "lessons": {
                    "lesson-33": {
                        "slides": {
                            "4": {
                                "items": [
                                    {
                                        "id": "u33-s04-a",
                                        "prompt": "Original prompt",
                                        "reviewStatus": "source-ambiguous",
                                        "answerItems": [],
                                    }
                                ]
                            }
                        }
                    }
                },
            }
            patch = {
                "sourcePolicy": {
                    "publishedSlidesAuthoritative": True,
                    "sourceFilesReadOnly": True,
                    "preserveOriginalPromptsAndProvenance": True,
                    "noInventedAudioOrIdentities": True,
                    "ambiguousClaimsMustBeRewordedOrRemainBlocked": True,
                    "openResponseNeverGetsSyntheticAnswerKey": True,
                    "reviewedOpenResponseHasNoSyntheticAnswerKey": True,
                },
                "resolved": [
                    {
                        "lessonId": "lesson-33",
                        "unit": 33,
                        "itemId": "u33-s04-a",
                        "publishedSourceSlide": 4,
                        "originalPrompt": "Original prompt",
                        "revisedPrompt": "Published prompt",
                        "reviewStatus": "reviewed-manual-source-alignment",
                        "sourceEvidence": ["Published prompt"],
                        "answerItems": [{"id": "answer", "canonical": "yes", "accepted": ["yes"]}],
                        "provenance": {
                            "file": provenance_file.name,
                            "sha256": provenance_sha,
                            "sourceUrl": "https://example.test/unit-33",
                            "publishedSlide": 4,
                        },
                    }
                ],
                "reviewedOpenResponse": [],
                "remainingHardBlocks": [],
            }
            blockers = []
            merged, summary = composer._apply_exercise_semantic_patch(
                review,
                patch,
                {"lesson-33": source},
                [root],
                blockers,
                "semantic-patch.json",
            )

            item = merged["lessons"]["lesson-33"]["slides"]["4"]["items"][0]
            self.assertEqual(summary["applied"], 1)
            self.assertEqual(item["id"], "u33-s04-a")
            self.assertEqual(item["reviewStatus"], "reviewed")
            self.assertEqual(item["semanticPatch"]["patchReviewStatus"], "reviewed-manual-source-alignment")
            self.assertEqual(item["answerItems"][0]["canonical"], "yes")
            self.assertEqual(blockers, [])

    def test_teacher_notes_sidecar_preserves_prompt_without_audio_or_answer_key(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_path = root / "published.json"
            source = {
                "lesson": {"id": "lesson-21"},
                "sourceUrl": "https://example.test/unit-21",
                "deck": {
                    "slides": [
                        {
                            "number": 6,
                            "title": "Vocabulary",
                            "visibleTexts": ["Look at the information, listen to your teacher and repeat the words."],
                        }
                    ]
                },
            }
            source_path.write_text(json.dumps(source), encoding="utf-8")
            base_path = root / "exercise-review.json"
            base_path.write_text("base review", encoding="utf-8")
            review = {
                "courseId": composer.COURSE_ID,
                "lessons": {
                    "lesson-21": {
                        "slides": {
                            "6": {
                                "items": [
                                    {
                                        "id": "u21-s06-review",
                                        "kind": "listening",
                                        "prompt": "Look at the vocabulary.",
                                        "responseMode": "teacher-listening",
                                        "reviewStatus": "blocked-awaiting-transcript",
                                        "answerItems": [],
                                    }
                                ]
                            }
                        }
                    }
                },
            }
            digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
            sidecar = {
                "courseId": composer.COURSE_ID,
                "expectedEntryCount": 1,
                "baseReview": {"path": base_path.name, "sha256": digest(base_path)},
                "sourcePolicy": {
                    "publishedSlidesAuthoritative": True,
                    "sourceFilesReadOnly": True,
                    "preserveOriginalPromptsAndProvenance": True,
                    "noAudioSubstitution": True,
                    "noSyntheticAnswerKey": True,
                    "teacherNotesOnly": True,
                },
                "entries": [
                    {
                        "lessonId": "lesson-21",
                        "itemId": "u21-s06-review",
                        "publishedSlide": 6,
                        "originalPrompt": "Look at the vocabulary.",
                        "sourcePrompt": "Look at the information, listen to your teacher and repeat the words.",
                        "publishedSource": {
                            "path": source_path.name,
                            "sha256": digest(source_path),
                            "sourceUrl": source["sourceUrl"],
                            "slideNumber": 6,
                        },
                        "mergeContract": {
                            "preserveOriginalPrompt": True,
                            "preserveOriginalProvenance": True,
                            "noAudioSubstitution": True,
                            "noSyntheticAnswerKey": True,
                            "teacherNotesOnly": True,
                        },
                    }
                ],
            }
            blockers: list[dict] = []
            merged, summary = composer._apply_exercise_teacher_notes_review(
                review,
                sidecar,
                {"lesson-21": source},
                [root],
                blockers,
                "teacher-notes.json",
            )

            item = merged["lessons"]["lesson-21"]["slides"]["6"]["items"][0]
            self.assertEqual(summary["applied"], 1)
            self.assertEqual(item["reviewStatus"], "reviewed-teacher-notes")
            self.assertEqual(item["originalPrompt"], "Look at the vocabulary.")
            self.assertEqual(item["teacherNotes"]["sourcePrompt"], sidecar["entries"][0]["sourcePrompt"])
            self.assertEqual(item["answerItems"], [])
            self.assertNotIn("sourceAudioSha256", item)
            self.assertEqual(blockers, [])

    def test_unit38_errata_clears_stale_ambiguous_status_and_keeps_formative_response(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_path = root / "published.json"
            source = {
                "lesson": {"id": "lesson-38"},
                "sourceUrl": "https://example.test/unit-38",
                "deck": {"slides": [{"number": 13, "visibleTexts": ["I have chance my arm so long for this company."]}]},
            }
            source_path.write_text(json.dumps(source), encoding="utf-8")
            base_path = root / "exercise-review.json"
            base_path.write_text("base review", encoding="utf-8")
            review = {
                "courseId": composer.COURSE_ID,
                "lessons": {
                    "lesson-38": {
                        "slides": {
                            "13": {
                                "items": [
                                    {
                                        "id": "u38-s13-a",
                                        "prompt": "Correct the sentences.",
                                        "reviewStatus": "reviewed",
                                        "answerItems": [
                                            {"id": "item-1", "canonical": "A"},
                                            {"id": "item-2", "canonical": "B", "status": "source-ambiguous"},
                                        ],
                                    }
                                ]
                            }
                        }
                    }
                },
            }
            digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
            sidecar = {
                "courseId": composer.COURSE_ID,
                "baseReview": {"path": base_path.name, "sha256": digest(base_path)},
                "publishedSource": {
                    "path": source_path.name,
                    "sha256": digest(source_path),
                    "sourceUrl": source["sourceUrl"],
                },
                "patches": [
                    {
                        "lessonId": "lesson-38",
                        "slideNumber": 13,
                        "itemId": "u38-s13-a",
                        "sourcePrompt": "I have chance my arm so long for this company.",
                        "openResponse": {
                            "prompt": "Propón una corrección clara.",
                            "sourcePrompt": "I have chance my arm so long for this company.",
                            "feedbackContext": "Multiple source-grounded repairs are possible.",
                        },
                        "answerPolicy": {
                            "canonicalAnswer": None,
                            "acceptedAnswers": [],
                            "preserveOriginalItem": True,
                        },
                        "deterministicItems": ["item-1"],
                        "nestedAnswerItemId": "item-2",
                        "mergeContract": {
                            "replaceReviewStatus": True,
                            "setOpenResponse": True,
                            "setAmbiguousAnswerCanonicalToNull": True,
                            "setAmbiguousAnswerAcceptedToEmpty": True,
                            "nativeOpenType": "essay",
                            "aiGrading": True,
                            "responseMode": "formative-open-response",
                            "archiveOriginalPromptInMetadata": True,
                        },
                    }
                ],
            }
            blockers: list[dict] = []
            merged, summary = composer._apply_exercise_errata_review(
                review,
                sidecar,
                {"lesson-38": source},
                [root],
                blockers,
                "unit38-errata.json",
            )

            item = merged["lessons"]["lesson-38"]["slides"]["13"]["items"][0]
            self.assertEqual(summary["applied"], 1)
            self.assertEqual(item["reviewStatus"], "open-response-preserved")
            self.assertEqual(item["responseMode"], "formative-open-response")
            self.assertIsNone(item["answerItems"][1]["canonical"])
            self.assertEqual(item["answerItems"][1]["status"], "source-ambiguous")
            self.assertEqual(item["openResponse"]["sourcePrompt"], sidecar["patches"][0]["sourcePrompt"])
            self.assertEqual(blockers, [])

    def test_staged_audio_overrides_review_record_with_public_url(self) -> None:
        source = {"lesson": {"id": "lesson-2"}}
        blockers = []
        records, counts = composer._normalize_audio(
            {
                "audio": [
                    {
                        "sourceId": "audio-2",
                        "unit": 2,
                        "slideNumber": 4,
                        "sourceSha256": "c" * 64,
                        "publicUrl": "/audio-2.mp3",
                        "status": "planned",
                        "transcript": "A source transcript.",
                        "audioNumber": 2,
                        "sourcePath": str(SCRIPT),
                    }
                ]
            },
            {
                "audio": [
                    {
                        "id": "audio-2",
                        "unit": 2,
                        "lessonId": "lesson-2",
                        "sourceSlideNumber": 4,
                        "sourceSha256": "c" * 64,
                        "transcript": "A source transcript.",
                        "audioNumber": 2,
                    }
                ]
            },
            {2: source},
            [Path.cwd()],
            blockers,
        )

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["lessonId"], "lesson-2")
        self.assertEqual(records[0]["publicUrl"], "/audio-2.mp3")
        self.assertEqual(records[0]["mediaDigest"], "c" * 64)
        self.assertEqual(counts["normalizedRecords"], 1)
        self.assertNotIn("audio-public-url-missing", [item["code"] for item in blockers])

    def test_exercise_review_moves_explicit_item_to_its_published_slide(self) -> None:
        source = {
            "deck": {
                "deckTitle": "Unit 29 - Source.pptx",
                "slides": [
                    {"number": 13, "visibleTexts": ["Complete the paragraph."]},
                    {"number": 14, "visibleTexts": ["B. Listen to the audio and answer the questions your teacher makes."]},
                ],
            }
        }
        review = {
            "sourceUrl": "https://example.test/unit-29",
            "slides": {
                "13": {
                    "source": {"number": 13},
                    "items": [
                        {
                            "id": "u29-s13-a",
                            "sourceEvidence": ["Complete the paragraph."],
                        },
                        {
                            "id": "u29-s14-b",
                            "sourceEvidence": ["B. Listen to the audio and answer the questions your teacher makes."],
                        },
                        {
                            "id": "u29-s13-b",
                            "sourceEvidence": ["B. Listen to the audio and answer the questions your teacher makes."],
                        },
                    ],
                },
                "14": {"source": {"number": 14}, "items": []},
            },
        }
        normalized, fixes = composer._normalise_review_placements("lesson-29", review, source)

        self.assertEqual([item["id"] for item in normalized["slides"]["13"]["items"]], ["u29-s13-a"])
        self.assertEqual(
            [item["id"] for item in normalized["slides"]["14"]["items"]],
            ["u29-s14-b", "u29-s13-b"],
        )
        self.assertEqual([fix["itemId"] for fix in fixes], ["u29-s14-b", "u29-s13-b"])
        self.assertTrue(all(fix["evidenceMatchedPublishedSource"] for fix in fixes))

    def test_listening_review_rejects_slide_ordinal_digest_mismatch(self) -> None:
        blockers = []
        result = composer._normalize_listening(
            [
                {
                    "exercises": [
                        {
                            "lessonId": "lesson-7",
                            "unit": 7,
                            "slideNumber": 15,
                            "audioIndex": 2,
                            "sourceAudioSha256": "b" * 64,
                            "items": [],
                        }
                    ]
                }
            ],
            {"lesson-7": {"deck": {"deckTitle": "Unit 7 - Source.pptx", "slides": [{"number": 15}]}}},
            [
                {
                    "lessonId": "lesson-7",
                    "unit": 7,
                    "audioNumber": 1,
                    "slideNumber": 15,
                    "sourceSha256": "a" * 64,
                },
                {
                    "lessonId": "lesson-7",
                    "unit": 7,
                    "audioNumber": 2,
                    "slideNumber": 4,
                    "sourceSha256": "b" * 64,
                },
            ],
            blockers,
        )

        self.assertEqual(result["exercises"], [])
        self.assertEqual(result["rejectedEntries"][0]["compositionStatus"], "rejected-source-audio-mismatch")
        self.assertEqual([item["code"] for item in blockers], ["listening-source-audio-mismatch"])
        self.assertEqual(blockers[0]["observedAudio"][1]["slideNumber"], 4)


if __name__ == "__main__":
    unittest.main()
