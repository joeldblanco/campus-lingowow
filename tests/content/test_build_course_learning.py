"""Focused contract tests for the deterministic course-learning plan builder."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "content" / "build-course-learning.py"
SPEC = importlib.util.spec_from_file_location("build_course_learning", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


COURSE_ID = builder.COURSE_ID
LESSON_ID = "lesson-guided-fixture"


def snapshot_fixture() -> dict:
    return {
        "courseId": COURSE_ID,
        "modules": [
            {
                "id": "module-1",
                "lessons": [
                    {
                        "id": LESSON_ID,
                        "title": "Where are you from?",
                        "rows": [
                            {
                                "id": "embed-original-1",
                                "title": "Original embed",
                                "order": 1,
                                "contentType": "EMBED",
                                "lessonId": LESSON_ID,
                                "parentId": "parent-1",
                                "data": {"url": "https://slides.example/fixture"},
                            }
                        ],
                    }
                ],
            }
        ],
    }


def source_fixture(*, complete_audio: bool = False) -> dict:
    audio_media = {
        "kind": "audio",
        "url": "https://cdn.example/lesson/audio-6.mp3",
        "audioIndex": 1,
        "audioNumber": 1,
    }

    if complete_audio:
        audio_media.update(
            {
                "digest": "audio-sha256-fixture",
                "transcript": "I come from Peru.",
            }
        )
    return {
        "courseId": COURSE_ID,
        "lesson": {"id": LESSON_ID, "title": "Where are you from?"},
        "contentId": "source-content-fixture",
        "sourceUrl": "https://slides.example/fixture",
        "status": "ok",
        "deck": {
            "deckTitle": "Where are you from?",
            "slideCount": 8,
            "slides": [
                {
                    "number": 1,
                    "title": "Objectives",
                    "visibleTexts": [
                        "Objectives",
                        "Ask and answer where people come from.",
                    ],
                },
                {
                    "number": 2,
                    "title": "Grammar chart",
                    "visibleTexts": ["Grammar chart"],
                    "tables": [
                        {
                            "rows": [
                                ["Subject", "Verb"],
                                ["I", "am"],
                                ["You", "are"],
                            ]
                        }
                    ],
                },
                {
                    "number": 3,
                    "title": "Vocabulary",
                    "visibleTexts": [
                        "Vocabulary",
                        "Peru - Peruvian",
                        "Brazil - Brazilian",
                    ],
                },
                {
                    "number": 4,
                    "title": "Reading",
                    "visibleTexts": [
                        "Read the text and answer the questions. "
                        "Maria is from Peru. She lives in Lima and studies English every day. "
                        "Her friend Joao is from Brazil. They practice together after class. "
                        "Answer the questions about their countries and cities."
                    ],
                },
                {
                    "number": 5,
                    "title": "Speaking",
                    "visibleTexts": [
                        "Act out the conversation with your teacher. Ask and answer where you come from."
                    ],
                },
                {
                    "number": 6,
                    "title": "Listening",
                    "visibleTexts": ["Listen to the audio and write the country."],
                    "media": [audio_media],
                },
                {
                    "number": 7,
                    "title": "Introduction",
                    "visibleTexts": ["Introduction"],
                },
                {
                    "number": 8,
                    "title": "Copyright",
                    "visibleTexts": ["© Lingowow. All rights reserved."],
                },
            ],
        },
    }


def unit2_slide8_native_fixture() -> tuple[dict, dict]:
    """The published/native shapes from Unit 2 slide 8, reduced to the table contract."""

    title = (
        "We normally use simple present tense to talk about countries and nationalities. "
        "Not only the verb to be can be useful to talk about this. Revise the following chart and check some examples."
    )
    published = {
        "courseId": COURSE_ID,
        "lesson": {"id": LESSON_ID, "order": 2, "title": "I come from"},
        "contentId": "unit-2-source-fixture",
        "sourceUrl": "https://slides.example/unit-2",
        "status": "ok",
        "deck": {
            "deckTitle": "Unit 2 - I come from.pptx",
            "slideCount": 1,
            "slides": [
                {
                    "number": 8,
                    "title": title,
                    "visibleTexts": [
                        title,
                        "Even when we talk about this topic, the grammar rules must be respected. To Be – works alone. Other verbs – Use auxiliaries.",
                        "MOST COMMON QUESTIONS - Where are you from? - Where do you come from?",
                        "To Be verb Other verbs – Auxiliary Introduction John is American Is he American? She comes from England. Does she come from England? They are from Mexico Where are they from? You speak Italian Do you speak Italian? The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    ],
                    "tables": [],
                }
            ],
        },
    }

    def cell(text: str, *paragraphs: str) -> dict:
        return {
            "text": text,
            "paragraphs": [{"text": paragraph, "runs": [paragraph]} for paragraph in paragraphs] if paragraphs else [],
        }

    native_table = {
        "rows": [
            {
                "height": 465675,
                "cells": [
                    cell("To Be verb", "To Be verb"),
                    cell(""),
                    cell("Other verbs – Auxiliary Introduction", "Other verbs – Auxiliary Introduction"),
                    cell(""),
                ],
            },
            {
                "height": 455900,
                "cells": [
                    cell("John is American", "John is American"),
                    cell("Is he American?", "Is he American?"),
                    cell("She comes from England.", "She comes from England."),
                    cell("Does she come from England?", "Does she come from England?"),
                ],
            },
            {
                "height": 455900,
                "cells": [
                    cell("They are from Mexico", "They are from Mexico"),
                    cell("Where are they from?", "Where are they from?"),
                    cell("You speak Italian", "You speak Italian"),
                    cell("Do you speak Italian?", "Do you speak Italian?"),
                ],
            },
            {
                "height": 1185325,
                "cells": [
                    cell(
                        "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                        "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                    ),
                    cell(""),
                    cell(
                        "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                        "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action.",
                        "Do - I/You/We/They",
                        "Does - He/She/ It (3rd person singular)",
                        "*Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    ),
                    cell(""),
                ],
            },
        ]
    }
    native_slide = {
        "number": 8,
        "texts": published["deck"]["slides"][0]["visibleTexts"],
        "shapes": [
            {
                "kind": "text",
                "paragraphs": [
                    {"text": "Even when we talk about this topic, the grammar rules must be respected."},
                    {"text": "To Be – works alone."},
                    {"text": "Other verbs – Use auxiliaries."},
                    {"text": "MOST COMMON QUESTIONS"},
                ],
            }
        ],
        "tables": [native_table],
    }
    native_audit = {
        "records": [
            {
                "unit": 2,
                "status": "ok",
                "candidate": {"id": "unit-2-native-fixture", "title": "Unit 2 - I come from.pptx"},
                "native": {"slides": [native_slide]},
            }
        ]
    }
    return published, native_audit


def unit3_slide4_vector_fixture() -> tuple[dict, dict, dict]:
    """Reviewed Unit 3 slide 4 editable week-calendar evidence."""

    lesson_id = "unit-3-vector-fixture"
    source_url = "https://docs.google.com/presentation/d/e/unit-3-vector/pub?slide=id.p4"
    visible_texts = [
        "Week",
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "DINNER AT MOM’S",
        "SCHOOL MEETING",
        "PROJECT PRESENTATION",
        "DAVID’S CONCERT",
        "CHESS TOURNAMENT",
        "BREAKFAST W/ CLIENTS",
        "FAMILY NIGHT",
        "A. Look at the picture. What does it talk about? What is the information on it?",
        "B. Listen to the audio and tell your teacher the activities the man makes.",
        "👨",
    ]
    activities = [
        ("SUNDAY", "DINNER AT MOM’S"),
        ("MONDAY", "PROJECT PRESENTATION"),
        ("TUESDAY", "SCHOOL MEETING"),
        ("WEDNESDAY", "DAVID’S CONCERT"),
        ("THURSDAY", "CHESS TOURNAMENT"),
        ("FRIDAY", "BREAKFAST W/ CLIENTS"),
        ("SATURDAY", "FAMILY NIGHT"),
    ]

    def bbox(index: int) -> dict[str, int]:
        return {"x": index * 100, "y": 500, "cx": 90, "cy": 1800, "right": index * 100 + 90, "bottom": 2300}

    title_shape = {"shapeId": "title-shape", "text": "Week", "bbox": bbox(0)}
    weekday_shapes = [
        {"label": day, "shapeId": f"weekday-{index}", "bbox": bbox(index + 1)}
        for index, (day, _activity) in enumerate(activities)
    ]
    activity_shapes = [
        {"day": day, "text": activity, "shapeId": f"activity-{index}", "bbox": bbox(index + 1)}
        for index, (day, activity) in enumerate(activities)
    ]
    rows = [[day, activity] for day, activity in activities]
    table_group = {
        "key": "week-overview",
        "sourceHeader": "Week",
        "headers": ["DAY", "ACTIVITIES"],
        "layout": "compact-two-column",
        "rows": rows,
        "rowShapeTrace": [
            {
                "day": day,
                "headerShapeId": weekday_shapes[index]["shapeId"],
                "activityShapeId": activity_shapes[index]["shapeId"],
            }
            for index, (day, _activity) in enumerate(activities)
        ],
    }
    published_text_sha = "1" * 64
    native_slide_sha = "2" * 64
    native_joined_sha = "3" * 64
    presentation_sha = "4" * 64
    review = {
        "schemaVersion": 1,
        "scope": {
            "unit": 3,
            "lessonId": lesson_id,
            "publishedSlide": 4,
            "nativeSlide": 4,
        },
        "source": {
            "publishedSourceUrl": source_url,
            "publishedDeckTitle": "Unit 3 - Every day I.pptx",
            "publishedSlideTextSha256": published_text_sha,
            "publishedVisibleTexts": visible_texts,
        },
        "native": {
            "presentationSha256": presentation_sha,
            "slideTextSha256": native_slide_sha,
            "joinedTextSha256": native_joined_sha,
            "joinedText": "\n".join(visible_texts),
        },
        "slide": {
            "publishedSlide": 4,
            "nativeSlide": 4,
            "titleShape": title_shape,
            "weekdayShapes": weekday_shapes,
            "activityShapes": activity_shapes,
            "promptShapes": [
                {"shapeId": "prompt-a", "text": visible_texts[-3], "bbox": bbox(9)},
                {"shapeId": "prompt-b", "text": visible_texts[-2], "bbox": bbox(10)},
                {"shapeId": "person", "text": "👨", "bbox": bbox(11)},
            ],
        },
        "structuredContent": {
            "nativeType": "structured-content",
            "sourceRole": "native-vector-calendar",
            "content": {"headers": ["DAY", "ACTIVITIES"], "rows": rows},
            "tables": [[["DAY", "ACTIVITIES"], *rows]],
            "data": {"tableGroups": [table_group]},
            "figureProof": {
                "kind": "native-vector",
                "visualRole": "week-calendar",
                "confirmedInstructional": True,
                "rasterRequired": False,
                "sourceSlideNumber": 4,
                "publishedSlideNumber": 4,
                "sourcePresentationSha256": presentation_sha,
                "publishedSlideTextSha256": published_text_sha,
                "nativeSlideTextSha256": native_slide_sha,
                "sourceShapeIds": [
                    title_shape["shapeId"],
                    *[item["shapeId"] for item in weekday_shapes],
                    *[item["shapeId"] for item in activity_shapes],
                ],
                "visualEvidence": "The authored week calendar is represented by editable text shapes.",
            },
        },
    }
    source = {
        "courseId": COURSE_ID,
        "lesson": {"id": lesson_id, "order": 3, "title": "Every Day I"},
        "contentId": "unit-3-vector-source",
        "sourceUrl": source_url,
        "status": "ok",
        "deck": {
            "deckTitle": "Unit 3 - Every day I.pptx",
            "slideCount": 1,
            "slides": [
                {
                    "number": 4,
                    "title": "Week",
                    "visibleTexts": visible_texts,
                    "media": [{"kind": "audio-icon", "url": "https://ssl.gstatic.com/docs/drawings/images/audio.png"}],
                    "tables": [],
                }
            ],
        },
    }
    audio_manifest = {
        "entries": [
            {
                "lessonId": lesson_id,
                "slideNumber": 4,
                "audioIndex": 1,
                "url": "https://cdn.example/unit3-week.mp3",
                "digest": "unit3-week-audio-sha",
                "transcript": "The man makes these activities.",
            }
        ]
    }
    return source, review, audio_manifest


class BuildCourseLearningTests(unittest.TestCase):
    def test_goal_slide_renders_one_concise_source_block(self) -> None:
        goal = "Describe oneself and others� origins by talking about countries and nationalities."
        competency = (
            "Use basic grammatical elements, vocabulary, and phrases related to countries and nationalities "
            "effectively in basic conversations and written texts."
        )
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "title": "I come from�"},
            "contentId": "goal-source-fixture",
            "sourceUrl": "https://slides.example/goal-fixture",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - I come from.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 2,
                        "title": "Communicative Function",
                        "visibleTexts": ["Communicative Function", goal, "Competencies", competency],
                        "_nativeAudit": {
                            "paragraphs": [
                                "Communicative Function",
                                goal,
                                "Competencies",
                                competency,
                                f"Communicative Function {goal} Competencies {competency}",
                            ]
                        },
                    }
                ],
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertTrue(plan["publishable"])
        rows = [
            row
            for row in plan["nextRows"]
            if row["id"].startswith("course-guided-")
            and row["data"]["data"]["sourceSlides"] == [2]
        ]
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["data"]["type"], "text")
        self.assertEqual(row["data"]["title"], "Communicative Function")
        self.assertEqual(row["title"], "Communicative Function")
        self.assertEqual(row["data"]["data"]["guidedTitle"], "Communicative Function")
        self.assertEqual(row["data"]["sourceRole"], "learning-goal")
        self.assertEqual(row["data"]["content"].count(goal), 1)
        self.assertEqual(row["data"]["content"].count(competency), 1)
        self.assertNotIn(f"Communicative Function {goal}", row["data"]["content"])
        self.assertEqual(
            row["data"]["data"]["originalSource"]["visibleTexts"],
            source["deck"]["slides"][0]["visibleTexts"],
        )

    def test_instructional_source_title_uses_a_concise_type_label(self) -> None:
        source = source_fixture(complete_audio=True)
        title = (
            "A. Change the following sentences into the interrogative and negative form. "
            "Follow the example. Pay attention to the verb used."
        )
        source["deck"]["slides"][1]["title"] = title
        source["deck"]["slides"][1]["visibleTexts"] = [title]

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        row = next(
            row
            for row in plan["nextRows"]
            if row["id"].startswith("course-guided-")
            and row["data"]["data"]["sourceSlides"] == [2]
            and row["data"]["type"] == "structured-content"
        )
        self.assertEqual(
            row["data"]["title"],
            "Consulta las formas.",
        )
        self.assertLess(len(row["data"]["title"]), len(title))
        self.assertEqual(row["title"], title)
        self.assertNotIn("guidedTitle", row["data"]["data"])

    def test_navigation_titles_drop_raw_prose_numeric_and_one_word_source_titles(self) -> None:
        source = source_fixture(complete_audio=True)
        source_digest = builder._source_digest(source)

        image = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 9,
                "title": "A. Look at the picture and discuss today's topic with your teacher.",
                "visibleTexts": ["A. Look at the picture and discuss today's topic with your teacher."],
            },
            "image",
            {"url": "/images/lessons/course/fixture.png"},
            1,
            0,
        )
        self.assertEqual(image["title"], "A. Look at the picture and discuss today's topic with your teacher.")
        self.assertEqual(image["data"]["title"], "Observa la imagen.")
        self.assertEqual(image["data"]["data"]["guidedTitle"], "Observa la imagen.")

        vocabulary_image = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 6,
                "title": "GO BACK HOME",
                "visibleTexts": [
                    "GO BACK HOME",
                    "READ A BOOK",
                    "WAKE UP",
                    "TAKE A SHOWER",
                    "GET DRESSED",
                    "HAVE/TAKE BREAKFAST",
                    "BRUSH MY TEETH",
                    "GO TO WORK",
                    "GO TO BED/FALL ASLEEP",
                    "DAILY ROUTINES",
                ],
                "_nativeAudit": {"figures": [{} for _ in range(9)]},
            },
            "image",
            {"url": "/images/lessons/course/routine-1.webp"},
            2,
            1,
        )
        self.assertEqual(vocabulary_image["data"]["title"], "DAILY ROUTINES")
        self.assertNotEqual(vocabulary_image["data"]["title"], "GO BACK HOME")

        generic_image_group = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 7,
                "title": "Compare people",
                "visibleTexts": [
                    "Compare people",
                    "Mrs. Lee is the best teacher in school.",
                    "Dana is the most interested in class.",
                    "PEOPLE",
                    "PLACES",
                    "THINGS",
                ],
                "_nativeAudit": {"figures": [{} for _ in range(4)]},
            },
            "image",
            {"url": "/images/lessons/course/figure-1.webp"},
            3,
            2,
        )
        self.assertEqual(generic_image_group["data"]["title"], "Imagen.")

        vector = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {"number": 4, "title": "Week", "visibleTexts": ["Week"]},
            "structured-content",
            {
                "sourceRole": "native-vector-calendar",
                "data": {"tableGroups": [{"key": "week-overview"}]},
                "content": {"headers": ["DAY", "ACTIVITIES"], "rows": []},
            },
            4,
            3,
        )
        self.assertEqual(vector["title"], "Week")
        self.assertEqual(vector["data"]["title"], "Una semana de actividades.")

        audio = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 13,
                "title": "13",
                "visibleTexts": ["Listen to the original recording."],
            },
            "audio",
            {
                "url": "https://cdn.example/audio.mp3",
                "mediaDigest": "audio-sha256-fixture",
                "transcript": "Original recording.",
            },
            5,
            4,
        )
        self.assertEqual(audio["title"], "13")
        self.assertEqual(audio["data"]["title"], "Escucha.")
        self.assertNotIn("guidedTitle", audio["data"]["data"])

        vocabulary = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {"number": 14, "title": "Olá!", "visibleTexts": ["Olá!"]},
            "vocabulary",
            {"items": [{"id": "hello", "term": "Olá", "definition": "Hello"}]},
            6,
            5,
        )
        self.assertEqual(vocabulary["title"], "Olá!")
        self.assertEqual(vocabulary["data"]["title"], "Vocabulario.")
        self.assertNotIn("guidedTitle", vocabulary["data"]["data"])

        structured = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {"number": 15, "title": "Grammar practice", "visibleTexts": ["Grammar practice"]},
            "structured-content",
            {"content": {"headers": ["Subject"], "rows": [["I"]]}},
            7,
            6,
        )
        self.assertEqual(structured["data"]["title"], "Grammar practice")
        self.assertEqual(structured["data"]["data"]["guidedTitle"], "Grammar practice")

        reading = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 16,
                "title": "Reading passage",
                "visibleTexts": [
                    "Reading passage",
                    "Maria is from Peru. She lives in Lima and studies English every day. "
                    "Her friend Joao is from Brazil. They practice together after class and share stories.",
                ],
            },
            "text",
            {"content": "<p>Maria is from Peru.</p>"},
            8,
            7,
        )
        self.assertEqual(reading["data"]["title"], "Lee el texto.")
        self.assertEqual(reading["data"]["data"]["guidedTitle"], "Lee el texto.")

        video = builder._native_row(
            LESSON_ID,
            source,
            source_digest,
            {
                "number": 17,
                "title": "17",
                "visibleTexts": ["Listen and repeat the pronunciation."],
                "videoUrl": "https://youtu.be/fixture",
            },
            "video",
            {"url": "https://youtu.be/fixture"},
            9,
            8,
        )
        self.assertEqual(video["data"]["title"], "Escucha la pronunciación.")
        self.assertEqual(video["data"]["data"]["guidedTitle"], "Escucha la pronunciación.")

    def test_plan_is_deterministic_and_preserves_existing_identity(self) -> None:
        source = source_fixture()
        first = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)
        second = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertEqual(first, second)
        self.assertFalse(first["publishable"])
        self.assertTrue(any(blocker["code"] == "audio-digest-missing" for blocker in first["blockers"]))
        self.assertTrue(any(blocker["code"] == "audio-transcript-missing" for blocker in first["blockers"]))

        original = first["previousRows"][0]
        copied = next(row for row in first["nextRows"] if row["id"] == original["id"])
        self.assertEqual(
            (original["title"], original["contentType"], original["lessonId"], original["parentId"]),
            (copied["title"], copied["contentType"], copied["lessonId"], copied["parentId"]),
        )
        self.assertEqual(copied["data"]["type"], "teacher_notes")
        self.assertEqual(copied["data"]["data"]["originalIDs"], ["embed-original-1"])
        self.assertEqual(copied["data"]["data"]["originalSource"], original["data"])
        generated = [row for row in first["nextRows"] if row["id"] != original["id"]]
        self.assertTrue(generated)
        self.assertEqual([row["order"] for row in first["nextRows"]], list(range(len(first["nextRows"]))))
        for row in generated:
            self.assertTrue(row["id"].startswith(f"course-guided-{LESSON_ID}-"))
            self.assertEqual(row["contentType"], "RICH_TEXT")
            self.assertEqual(row["data"]["data"]["learningRevision"], "course-guided-v1")
            self.assertTrue(row["data"]["data"]["sourceSlides"])
            self.assertEqual(row["data"]["data"]["originalSource"]["sourceUrl"], source["sourceUrl"])
            self.assertEqual(row["data"]["data"]["originalSource"]["sourceDigest"], first["sourceDigest"])

        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["headers"], ["Subject", "Verb"])
        self.assertEqual(structured["data"]["content"]["rows"], [["I", "am"], ["You", "are"]])

        vocabulary = next(row for row in generated if row["data"]["type"] == "vocabulary")
        self.assertEqual(vocabulary["data"]["items"][0]["term"], "Peru")
        self.assertEqual(vocabulary["data"]["items"][0]["definition"], "Peruvian")
        self.assertTrue(vocabulary["data"]["items"][0]["id"])

        reading = next(
            row
            for row in generated
            if row["data"]["type"] == "text" and row["data"]["data"]["sourceSlides"] == [4]
        )
        self.assertIn("<p>", reading["data"]["content"])
        self.assertIn("Maria is from Peru", reading["data"]["content"])
        reading_essay = next(row for row in generated if row["data"]["type"] == "essay" and row["data"]["data"]["sourceSlides"] == [4])
        self.assertIn("Authored passage/context", reading_essay["data"]["data"]["aiGradingContext"])
        self.assertIn("Maria is from Peru", reading_essay["data"]["data"]["aiGradingContext"])

        recording = next(row for row in generated if row["data"]["type"] == "recording")
        self.assertIn("Act out the conversation", recording["data"]["instruction"])
        self.assertTrue(recording["data"]["aiGrading"])

        self.assertNotIn(7, first["sourceSlideNumbers"])
        self.assertIn(8, first["sourceSlideNumbers"])
        copyright_note = next(
            row
            for row in generated
            if row["data"]["type"] == "teacher_notes" and row["data"]["data"]["sourceSlides"] == [8]
        )
        self.assertTrue(copyright_note["data"]["hiddenFromLearners"])

    def test_snapshot_rows_without_lesson_id_are_normalized_to_verified_parent(self) -> None:
        snapshot = snapshot_fixture()
        snapshot["modules"][0]["lessons"][0]["rows"][0].pop("lessonId")
        source = source_fixture(complete_audio=True)
        plan = builder.build_plan(snapshot["modules"][0]["lessons"][0], source)

        self.assertEqual(plan["previousRows"][0]["lessonId"], LESSON_ID)
        self.assertEqual(plan["nextRows"][0]["lessonId"], LESSON_ID)
        self.assertEqual([row["order"] for row in plan["nextRows"]], list(range(len(plan["nextRows"]))))

    def test_authored_video_link_becomes_a_native_video_block(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][0]["links"] = [{"url": "https://youtu.be/example", "kind": "video"}]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        video = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "video")
        self.assertEqual(video["data"]["url"], "https://youtu.be/example")
        self.assertEqual(video["contentType"], "RICH_TEXT")

    def test_audio_requires_immutable_media_evidence_and_preserves_transcript(self) -> None:
        source = source_fixture(complete_audio=True)
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["url"], "https://cdn.example/lesson/audio-6.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-fixture")
        self.assertEqual(audio["data"]["transcript"], "I come from Peru.")
        self.assertEqual(audio["data"]["data"]["originalSource"]["audio"]["digest"], "audio-sha256-fixture")

    def test_nested_audio_manifest_is_keyed_by_lesson_and_slide(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5].pop("media")
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        manifest = {
            "audio": {
                LESSON_ID: {
                    "6": {
                        "originalMediaUrl": "https://cdn.example/lesson/audio-6.mp3",
                        "sha256": "audio-sha256-nested",
                        "transcript": "I come from Peru.",
                    }
                }
            }
        }
        plan = builder.build_plan(lesson, source, manifest)

        self.assertTrue(plan["publishable"])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-nested")

    def test_staged_audio_uses_public_playback_and_retains_drive_provenance(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5]["media"] = [
            {
                "kind": "audio",
                "originalMediaUrl": "https://drive.google.com/file/d/drive-audio/view",
                "publicHref": "/audio/lessons/course/unit-01-audio-01.mp3",
                "sourceSha256": "audio-sha256-staged",
                "transcript": "I come from Peru.",
            }
        ]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertTrue(plan["publishable"])
        audio = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "audio")
        self.assertEqual(audio["data"]["url"], "/audio/lessons/course/unit-01-audio-01.mp3")
        self.assertNotIn("drive.google.com/file/d/", audio["data"]["url"])
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-staged")
        self.assertEqual(
            audio["data"]["data"]["originalSource"]["audio"]["originalMediaUrl"],
            "https://drive.google.com/file/d/drive-audio/view",
        )

    def test_answer_key_is_never_invented_for_an_exercise_prompt(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Practice",
                "visibleTexts": ["Complete the sentences with your own information."],
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "essay")
        self.assertTrue(exercise["data"]["aiGrading"])
        self.assertNotIn("correctAnswer", exercise["data"])
        self.assertNotIn("answer", exercise["data"])

    def test_closed_true_false_prompt_without_reviewed_key_is_blocked_not_essay(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Listening check",
                "visibleTexts": ["Listen to the audio and state if each sentence is true or false."],
                "media": [
                    {
                        "kind": "audio",
                        "url": "https://cdn.example/lesson/audio-check.mp3",
                        "digest": "audio-check-digest",
                        "transcript": "The authored listening passage.",
                    }
                ],
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "closed-answer-key-missing" and blocker["slide"] == 5 for blocker in plan["blockers"]))
        closed_rows = [row for row in plan["nextRows"] if row.get("data", {}).get("data", {}).get("sourceSlides") == [5]]
        self.assertFalse(any(row["data"].get("type") == "essay" for row in closed_rows))
        instruction = next(row for row in closed_rows if row["data"].get("type") == "text")
        self.assertTrue(instruction["data"]["reviewRequired"])
        self.assertEqual(instruction["data"]["reviewReason"], "closed-answer-key-missing")

    def test_open_audio_essay_context_includes_authored_transcript(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][5]["visibleTexts"] = ["Write a response based on what you hear."]
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        exercise = next(
            row
            for row in plan["nextRows"]
            if row.get("data", {}).get("type") == "essay" and row["data"]["data"]["sourceSlides"] == [6]
        )
        context = exercise["data"]["data"]["aiGradingContext"]
        self.assertIn("Authored audio transcript", context)
        self.assertIn("I come from Peru.", context)

    def test_incidental_listen_phrase_in_reading_does_not_require_audio(self) -> None:
        slide = {
            "number": 13,
            "title": "Memories",
            "visibleTexts": [
                "Memories! I remember my childhood. We used to play by the river and listen to good music.",
                "C. Read the following paragraph and state if the sentences are true or false.",
            ],
        }
        blockers: list[dict] = []
        specs = builder._native_block_specs(
            source_fixture(),
            slide,
            LESSON_ID,
            builder._source_digest(source_fixture()),
            None,
            None,
            None,
            blockers,
        )

        self.assertFalse(any(native_type == "audio" for native_type, _ in specs))
        self.assertFalse(any(blocker["code"].startswith("audio-") for blocker in blockers))

    def test_teacher_led_vocabulary_prompt_is_archived_without_fabricated_audio(self) -> None:
        slide = {
            "number": 6,
            "title": "Vocabulary",
            "visibleTexts": [
                "Listen and repeat after your teacher.",
                "FARMER",
                "FIREFIGHTER",
                "TEACHER",
            ],
        }
        blockers: list[dict] = []
        specs = builder._native_block_specs(
            source_fixture(),
            slide,
            LESSON_ID,
            builder._source_digest(source_fixture()),
            None,
            None,
            None,
            blockers,
        )

        teacher_note = next(payload for native_type, payload in specs if native_type == "teacher_notes")
        self.assertIn("Listen and repeat after your teacher.", teacher_note["content"])
        self.assertFalse(any(native_type == "audio" for native_type, _ in specs))
        self.assertFalse(any(blocker["code"].startswith("audio-") for blocker in blockers))

    def test_explicit_authored_answer_key_is_preserved_when_present(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].insert(
            5,
            {
                "number": 5,
                "title": "Choose the answer",
                "visibleTexts": ["Choose the correct country."],
                "options": ["Peru", "Brazil"],
                "correctAnswer": "Peru",
            },
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)
        exercise = next(row for row in plan["nextRows"] if row.get("data", {}).get("type") == "multiple_choice")
        self.assertEqual([option["text"] for option in exercise["data"]["options"]], ["Peru", "Brazil"])
        self.assertEqual(exercise["data"]["correctOptionId"], exercise["data"]["options"][0]["id"])

    def test_missing_snapshot_lesson_is_blocked_without_dropping_source_evidence(self) -> None:
        source = source_fixture(complete_audio=True)
        plan = builder.build_plan(None, source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "lesson-missing-from-snapshot" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        self.assertTrue(generated)
        self.assertEqual(generated[0]["data"]["data"]["originalSource"]["contentId"], source["contentId"])

    def test_audio_only_slide_is_reported_as_unsupported_with_source_coverage(self) -> None:
        source = source_fixture()
        source["deck"]["slideCount"] = 9
        source["deck"]["slides"].append(
            {
                "number": 9,
                "title": "Introduction",
                "mediaSummary": {"audioIconCount": 1},
            }
        )
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source)

        self.assertIn(9, plan["sourceSlideNumbers"])
        self.assertEqual(plan["unsupportedSlides"][0]["slide"], 9)
        self.assertTrue(any(blocker["code"] == "unsupported-slide" and blocker["slide"] == 9 for blocker in plan["blockers"]))

    def test_manifest_reports_source_inventory_and_cli_refuses_unready_output(self) -> None:
        snapshot = snapshot_fixture()
        source = source_fixture(complete_audio=True)
        manifest = builder.build_manifest(snapshot, [source], expected_source_count=55)
        self.assertEqual(manifest["sourceCount"], 1)
        self.assertEqual(manifest["publishableCount"], 1)
        self.assertEqual(manifest["inventoryBlockers"][0]["code"], "source-inventory-count")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            snapshot_path = root / "snapshot.json"
            source_dir = root / "sources"
            output_path = root / "plans.json"
            source_dir.mkdir()
            snapshot_path.write_text(json.dumps(snapshot), encoding="utf-8")
            (source_dir / "fixture.json").write_text(json.dumps(source), encoding="utf-8")
            status = builder.main(
                [
                    "--snapshot",
                    str(snapshot_path),
                    "--source-dir",
                    str(source_dir),
                    "--output",
                    str(output_path),
                    "--expected-source-count",
                    "55",
                    "--require-ready",
                ]
            )
            self.assertEqual(status, 2)
            self.assertTrue(output_path.exists())

    def test_native_audit_merges_aligned_table_paragraph_figure_and_audio_evidence(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "contentId": "source-native-fixture",
            "sourceUrl": "https://slides.example/native-fixture",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 4,
                "slides": [
                    {"number": 1, "title": "Grammar chart", "visibleTexts": ["Grammar chart"]},
                    {"number": 2, "title": "Reading", "visibleTexts": ["Reading"]},
                    {
                        "number": 3,
                        "title": "Listening",
                        "visibleTexts": ["Listening", "Listen to the audio and repeat."],
                        "media": [{"kind": "audio-icon"}],
                    },
                    {"number": 4, "title": "Picture", "visibleTexts": ["Picture"]},
                ],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "instructional-figure.png"
            asset.write_bytes(b"fixture image")
            native_audit = {
                "_auditPath": str(Path(directory) / "native-audit.json"),
                "records": [
                    {
                        "unit": 2,
                        "status": "ok",
                        "candidate": {"id": "native-fixture-2", "title": "Unit 2 - Where are you from?.pptx"},
                        "native": {
                            "slides": [
                                {
                                    "number": 1,
                                    "texts": ["Grammar chart"],
                                    "tables": {"rows": [["Subject", "Verb"], ["I", "am"]]},
                                },
                                {
                                    "number": 2,
                                    "texts": ["Reading"],
                                    "paragraphs": ["The native paragraph remains readable and traceable."],
                                },
                                {
                                    "number": 3,
                                    "texts": ["Listening", "Listen to the audio and repeat."],
                                    "audio": [
                                        {
                                            "originalMediaURL": "https://drive.example/audio-3.mp3",
                                            "sha256": "native-audio-digest",
                                            "transcript": "Repeat the original recording.",
                                        }
                                    ],
                                },
                                {
                                    "number": 4,
                                    "texts": ["Picture"],
                                    "figures": [
                                        {
                                            "localPath": str(asset),
                                            "publicUrl": "/images/lessons/course/native-fixture.png",
                                            "alt": "Original instructional figure",
                                        }
                                    ],
                                },
                            ]
                        },
                    }
                ],
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["rows"], [["I", "am"]])
        reading = next(row for row in generated if row["data"]["type"] == "text" and row["data"]["data"]["sourceSlides"] == [2])
        self.assertIn("native paragraph remains readable", reading["data"]["content"])
        self.assertEqual(reading["data"]["nativeParagraphs"], ["The native paragraph remains readable and traceable."])
        audio = next(row for row in generated if row["data"]["type"] == "audio")
        self.assertEqual(audio["data"]["url"], "https://drive.example/audio-3.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "native-audio-digest")
        self.assertEqual(audio["data"]["transcript"], "Repeat the original recording.")
        image = next(row for row in generated if row["data"]["type"] == "image")
        self.assertEqual(image["data"]["assetPath"], str(asset.resolve()))
        self.assertEqual(image["data"]["url"], "/images/lessons/course/native-fixture.png")
        self.assertNotIn("slides-images-rt", image["data"]["assetPath"])
        self.assertEqual(image["data"]["data"]["originalSource"]["nativeEvidence"]["figures"][0]["assetPath"], str(asset.resolve()))

    def test_unit3_vector_calendar_clears_picture_blocker_and_emits_day_groups(self) -> None:
        source, review, audio_manifest = unit3_slide4_vector_fixture()
        lesson = {"id": source["lesson"]["id"], "title": source["lesson"]["title"], "rows": []}

        plan = builder.build_plan(lesson, source, audio_manifest=audio_manifest, native_audit=review)

        self.assertTrue(plan["publishable"], plan["blockers"])
        self.assertFalse(any(blocker["code"] == "native-figure-required" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(
            structured["data"]["content"]["rows"],
            [
                ["SUNDAY", "DINNER AT MOM’S"],
                ["MONDAY", "PROJECT PRESENTATION"],
                ["TUESDAY", "SCHOOL MEETING"],
                ["WEDNESDAY", "DAVID’S CONCERT"],
                ["THURSDAY", "CHESS TOURNAMENT"],
                ["FRIDAY", "BREAKFAST W/ CLIENTS"],
                ["SATURDAY", "FAMILY NIGHT"],
            ],
        )
        self.assertEqual(len(structured["data"]["data"]["tableGroups"]), 1)
        self.assertEqual(structured["data"]["data"]["tableGroups"][0]["sourceHeader"], "Week")
        self.assertFalse(any(row["data"]["type"] == "image" for row in generated))
        self.assertEqual(
            structured["data"]["data"]["originalSource"]["nativeEvidence"]["vectorSemanticProjection"]["scope"]["publishedSlide"],
            4,
        )

    def test_unit3_vector_calendar_rejects_changed_day_projection(self) -> None:
        source, review, audio_manifest = unit3_slide4_vector_fixture()
        review = copy.deepcopy(review)
        review["structuredContent"]["content"]["rows"][2][1] = "INVENTED ACTIVITY"
        review["structuredContent"]["data"]["tableGroups"][0]["rows"][2][1] = "INVENTED ACTIVITY"
        lesson = {"id": source["lesson"]["id"], "title": source["lesson"]["title"], "rows": []}

        plan = builder.build_plan(lesson, source, audio_manifest=audio_manifest, native_audit=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-vector-calendar-invalid" for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "native-figure-required" for blocker in plan["blockers"]))
        self.assertFalse(
            any(
                row["data"]["type"] == "structured-content"
                and row["data"]["data"].get("vectorFigureProof")
                for row in plan["nextRows"]
                if row["id"].startswith("course-guided-")
            )
        )

    def test_unit2_slide8_native_table_preserves_matrix_and_teaching_prose(self) -> None:
        source, native_audit = unit2_slide8_native_fixture()
        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(structured["data"]["content"]["headers"], ["To Be verb", "", "Other verbs – Auxiliary Introduction", ""])
        self.assertEqual(
            structured["data"]["content"]["rows"],
            [
                ["John is American", "Is he American?", "She comes from England.", "Does she come from England?"],
                ["They are from Mexico", "Where are they from?", "You speak Italian", "Do you speak Italian?"],
                [
                    "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                    "",
                    "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    "",
                ],
            ],
        )
        serialized = json.dumps(structured["data"]["content"], ensure_ascii=False)
        self.assertNotIn("{'text'", serialized)
        self.assertNotIn('"paragraphs"', serialized)
        self.assertEqual(
            structured["data"]["data"]["tableGroups"],
            [
                {
                    "key": "to-be",
                    "sourceHeader": "To Be verb",
                    "headers": ["To Be verb", ""],
                    "rows": [
                        ["John is American", "Is he American?"],
                        ["They are from Mexico", "Where are they from?"],
                    ],
                    "notes": [
                        "The verb to be is an independent verb it can say a sentence, it can make a question or deny by itself. NO AUXILIARY NEEDED",
                    ],
                },
                {
                    "key": "other-verbs",
                    "sourceHeader": "Other verbs – Auxiliary Introduction",
                    "headers": ["Other verbs – Auxiliary Introduction", ""],
                    "rows": [
                        ["She comes from England.", "Does she come from England?"],
                        ["You speak Italian", "Do you speak Italian?"],
                    ],
                    "notes": [
                        "The rest of the verbs are dependent. They use auxiliaries to make questions and to deny an action. Do - I/You/We/They Does - He/She/ It (3rd person singular) *Pronunciation hint: https://youtu.be/EMWmCb1CIdc",
                    ],
                },
            ],
        )
        for group in structured["data"]["data"]["tableGroups"]:
            for note in group.get("notes", []):
                self.assertIn(note, json.dumps(structured["data"]["tables"], ensure_ascii=False))

        context = next(
            row
            for row in generated
            if row["data"]["type"] == "text"
            and row["data"].get("sourceRole") == "teaching-context"
            and row["data"]["data"]["sourceSlides"] == [8]
        )
        self.assertIn("Even when we talk about this topic", context["data"]["content"])
        self.assertIn("To Be", context["data"]["content"])
        self.assertIn("MOST COMMON QUESTIONS", context["data"]["content"])
        self.assertNotIn("To Be verb Other verbs", context["data"]["content"])

    def test_incidental_table_noun_does_not_create_missing_table_blocker(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 9,
                "title": "9",
                "visibleTexts": [
                    "To consider the possessive case.",
                    "The legs of the table / The tail of the cat.",
                ],
            }
        ]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertFalse(any(blocker["code"] == "table-semantics-missing" for blocker in plan["blockers"]))

    def test_reviewed_text_only_table_reference_resolves_without_inventing_matrix(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 9,
                "title": "Grammar chart",
                "visibleTexts": ["Grammar chart", "Check the chart below.", "Use the examples."],
                "tables": [],
                "tableSemantics": {
                    "mode": "text-only",
                    "tables": [],
                    "tableReferenceResolved": True,
                },
                "tableReview": {
                    "schemaVersion": 1,
                    "lessonId": LESSON_ID,
                    "sourceSlide": 9,
                    "reviewStatus": "reviewed-text-only",
                    "clearTableSemanticsBlocker": True,
                    "tableReferenceResolved": True,
                    "refHash": "a" * 64,
                    "sourceEvidence": {
                        "publishedVisibleTexts": [
                            "Grammar chart",
                            "Check the chart below.",
                            "Use the examples.",
                        ]
                    },
                    "projection": {
                        "approved": False,
                        "mode": "text-only",
                        "source": "published-visible-text",
                        "tables": [],
                    },
                },
            }
        ]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "table-semantics-missing" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        self.assertFalse(any(row["data"].get("type") == "structured-content" for row in generated))
        text_row = next(row for row in generated if row["data"].get("type") == "text")
        self.assertEqual(text_row["data"]["data"]["tableReview"]["sourceSlide"], 9)
        self.assertEqual(text_row["data"]["data"]["tableSemantics"]["tables"], [])
        self.assertIn("Check the chart below.", text_row["data"]["content"])
        self.assertEqual(
            text_row["data"]["data"]["originalSource"]["tableReview"]["reviewStatus"],
            "reviewed-text-only",
        )

    def test_unreviewed_chart_reference_still_blocks_table_projection(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 9,
                "title": "Grammar chart",
                "visibleTexts": ["Grammar chart", "Check the chart below."],
                "tables": [],
            }
        ]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(
            any(
                blocker["code"] == "table-semantics-missing" and blocker["slide"] == 9
                for blocker in plan["blockers"]
            )
        )

    def test_mismatched_text_only_table_review_does_not_resolve_blocker(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 9,
                "title": "Grammar chart",
                "visibleTexts": ["Grammar chart", "Check the chart below."],
                "tables": [],
                "tableSemantics": {
                    "mode": "text-only",
                    "tables": [],
                    "tableReferenceResolved": True,
                },
                "tableReview": {
                    "schemaVersion": 1,
                    "lessonId": LESSON_ID,
                    "sourceSlide": 8,
                    "reviewStatus": "reviewed-text-only",
                    "clearTableSemanticsBlocker": True,
                    "tableReferenceResolved": True,
                    "refHash": "a" * 64,
                    "sourceEvidence": {"publishedVisibleTexts": ["Grammar chart", "Check the chart below."]},
                    "projection": {"approved": False, "mode": "text-only", "tables": []},
                },
            }
        ]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "table-semantics-missing" for blocker in plan["blockers"]))

    def test_unit2_flow_keeps_reviewed_listening_compact_and_deduplicates_activity_prose(self) -> None:
        """Exercise flow mirrors the authored Unit 2 sequence without prompt dumps."""

        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        digest = "unit2-audio-2-digest"
        transcript = "Good morning. You are here to visit him. My dad is American. We speak very great English."
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "I come from…"},
            "contentId": "unit2-flow-fixture",
            "sourceUrl": "https://slides.example/unit-2-flow",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - I come from.pptx",
                "slideCount": 7,
                "slides": [
                    {
                        "number": 4,
                        "title": "Listen to the introduction",
                        "visibleTexts": ["Listen to the introduction", "Listen to the audio and discuss with your teacher."],
                        "media": [
                            {
                                "kind": "audio",
                                "url": "https://audio.example/unit2-1.mp3",
                                "audioIndex": 1,
                                "digest": "unit2-audio-1-digest",
                                "transcript": "This is the Unit 2 introduction.",
                            }
                        ],
                    },
                    {
                        "number": 6,
                        "title": "Olá!",
                        "visibleTexts": [
                            "Olá!",
                            "Hello!",
                            "Brazil - Brazilian",
                            "China - Chinese",
                            "We can group nationalities because of suffixes. Some can’t be grouped",
                        ],
                    },
                    {"number": 7, "title": "Grammar Analysis", "visibleTexts": ["Grammar Analysis", "Language bricks", "2"]},
                    {
                        "number": 8,
                        "title": "Grammar rules",
                        "visibleTexts": [
                            "Grammar rules",
                            "Even when we talk about this topic, the grammar rules must be respected.",
                            "To Be – works alone.",
                            "Other verbs – Use auxiliaries.",
                            "To Be verb Other verbs",
                        ],
                        "tables": [{"rows": [["To Be verb", "Other verbs"], ["John is American", "Does she come from England?"]]}],
                    },
                    {
                        "number": 13,
                        "title": "13",
                        "visibleTexts": [
                            "13",
                            "Listen to the audio and answer the questions.",
                            "The old true or false questions stay in the source archive.",
                        ],
                        "media": [
                            {
                                "kind": "audio",
                                "url": "/audio/lessons/course/unit-02-audio-02.mp3",
                                "publicHref": "/audio/lessons/course/unit-02-audio-02.mp3",
                                "audioIndex": 2,
                                "digest": digest,
                                "transcript": transcript,
                            }
                        ],
                    },
                    {
                        "number": 14,
                        "title": "A glimpse to Jenny’s life",
                        "visibleTexts": [
                            "A glimpse to Jenny’s life",
                            "Jenny is from USA. She speaks English and Spanish. Her parents are Mexican and she talks with her friend every afternoon about school, family, and the languages they use at home.",
                            "Read the paragraph and answer the questions below.",
                            "What is her name?",
                        ],
                    },
                    {
                        "number": 15,
                        "title": "Act out the situation",
                        "visibleTexts": ["Act out the situation", "Let’s Talk"],
                    },
                ],
            },
        }
        listening_review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 13,
                    "audioIndex": 2,
                    "sourceAudioSha256": digest,
                    "reviewStatus": "reviewed",
                    "items": [
                        {
                            "id": "unit2-q1",
                            "prompt": "Where is the man?",
                            "reviewStatus": "reviewed",
                            "explicitOptions": ["At home", "At work", "At the airport", "At school"],
                            "answerItems": [{"canonical": "At work", "evidence": "You are here to visit him."}],
                            "evidence": "You are here to visit him.",
                        }
                    ],
                }
            ]
        }

        plan = builder.build_plan(lesson, source, listening_review=listening_review)
        self.assertTrue(plan["publishable"])
        rows = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        generated_types = [row["data"]["type"] for row in rows]
        self.assertIn("teacher_notes", generated_types)
        divider = next(row for row in rows if row["data"]["data"]["sourceSlides"] == [7])
        self.assertEqual(divider["data"]["type"], "teacher_notes")

        vocabulary = next(row for row in rows if row["data"]["type"] == "vocabulary")
        vocab_text = next(row for row in rows if row["data"].get("type") == "text" and row["data"]["data"]["sourceSlides"] == [6])
        self.assertIn("suffixes", vocab_text["data"]["content"])
        self.assertNotIn("Brazil - Brazilian", vocab_text["data"]["content"])
        self.assertEqual(vocabulary["data"]["items"][0]["term"], "Brazil")

        listening_rows = [row for row in rows if row["data"]["data"]["sourceSlides"] == [13]]
        self.assertEqual([row["data"]["type"] for row in listening_rows], ["audio", "multiple_choice"])
        self.assertEqual(listening_rows[0]["data"]["instruction"], "Escucha y elige la respuesta.")
        self.assertEqual(listening_rows[1]["data"]["context"], "Escucha y elige la respuesta.")
        learner_payload = [
            {key: value for key, value in row["data"].items() if key not in {"sourceText", "sourceTitle", "nativeParagraphs", "data"}}
            for row in listening_rows
        ]
        self.assertNotIn("true or false", json.dumps(learner_payload, ensure_ascii=False).casefold())

        reading = [row for row in rows if row["data"]["data"]["sourceSlides"] == [14]]
        self.assertEqual(reading[0]["data"]["type"], "text")
        self.assertNotIn("answer the questions", reading[0]["data"]["content"].casefold())

        activity_blockers: list[dict] = []
        review_items = [
            {
                "id": "u02-roleplay",
                "kind": "roleplay",
                "prompt": "D. Act out the situation with your teacher.",
                "reviewStatus": "open-response-preserved",
                "sourceEvidence": ["Act out the situation"],
            }
        ]
        activity_specs = builder._native_block_specs(
            source,
            source["deck"]["slides"][-1],
            LESSON_ID,
            builder._source_digest(source),
            None,
            review_items,
            None,
            activity_blockers,
        )
        self.assertEqual([kind for kind, _ in activity_specs], ["recording"])
        self.assertFalse(activity_blockers)

        writing_blockers: list[dict] = []
        writing_specs = builder._native_block_specs(
            source,
            {
                "number": 16,
                "title": "E. Write a 30–50 word paragraph about your origins.",
                "visibleTexts": ["E. Write a 30–50 word paragraph about your origins.", "Let’s Write"],
            },
            LESSON_ID,
            builder._source_digest(source),
            None,
            [
                {
                    "id": "u02-writing",
                    "kind": "writing",
                    "prompt": "Write a 30–50 word paragraph about your origins.",
                    "reviewStatus": "open-response-preserved",
                    "sourceEvidence": ["E. Write a 30–50 word paragraph about your origins."],
                }
            ],
            None,
            writing_blockers,
        )
        self.assertEqual([kind for kind, _ in writing_specs], ["essay"])
        self.assertFalse(writing_blockers)

    def test_native_audit_rejects_slide_mismatch_and_untraceable_figure(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-rejection",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 2,
                "slides": [
                    {"number": 1, "title": "Picture", "visibleTexts": ["Picture"]},
                    {"number": 2, "title": "Listening", "visibleTexts": ["Listening", "Listen to the audio."]},
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-rejection-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {
                        "slides": [
                            {
                                "number": 1,
                                "texts": ["Picture"],
                                "figures": [{"url": "https://docs.google.com/slides-images-rt/rendered-slide.png"}],
                                "audio": [
                                    {
                                        "slideNumber": 99,
                                        "originalMediaURL": "https://audio.example/mismatch.mp3",
                                        "sha256": "mismatch-digest",
                                        "transcript": "Mismatched audio.",
                                    }
                                ],
                            },
                            {"number": 2, "texts": ["A different listening prompt"]},
                        ]
                    },
                }
            ]
        }
        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-untraceable" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertTrue(any(blocker["code"] == "audio-media-missing" and blocker["slide"] == 2 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch", "native-audio-mismatch"} for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "image" for row in plan["nextRows"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))
        published_listening = next(
            row
            for row in plan["nextRows"]
            if row["data"].get("type") == "text" and row["data"]["data"].get("sourceSlides") == [2]
        )
        self.assertIn("Listen to the audio.", published_listening["data"]["content"])

    def test_conflicting_native_reading_is_discarded_but_published_passage_remains(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-reading-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 33 - This is how we do it!.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 13,
                        "title": "Reading",
                        "visibleTexts": [
                            "Read the following passage about a student living in Scotland.",
                            "I was not prepared for the cold weather in Scotland.",
                        ],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 33,
                    "status": "ok",
                    "candidate": {"id": "native-reading-priority-33", "title": "Unit 33 - This is how we do it!.pptx"},
                    "native": {
                        "slides": [
                            {
                                "number": 13,
                                "texts": [
                                    "Cultural Shock",
                                    "I went to study in Taiwan and discovered a different culture.",
                                ],
                                "paragraphs": ["The Taiwan passage is supplemental evidence for a different source."],
                            }
                        ]
                    },
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch"} for blocker in plan["blockers"]))
        reading = next(row for row in plan["nextRows"] if row["data"].get("type") == "text")
        self.assertIn("Scotland", reading["data"]["content"])
        self.assertNotIn("Taiwan", reading["data"]["content"])
        self.assertNotIn("nativeParagraphs", reading["data"])

    def test_conflicting_native_slide_keeps_required_picture_evidence_blocker(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-picture-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 4,
                        "title": "Picture",
                        "visibleTexts": ["Look at the picture and answer the question."],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-picture-priority-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {"slides": [{"number": 4, "texts": ["A different grammar exercise."]}]},
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 4 for blocker in plan["blockers"]))
        published = next(
            row
            for row in plan["nextRows"]
            if row["data"].get("data", {}).get("sourceSlides") == [4]
        )
        self.assertIn("Look at the picture", str(published["data"]))

    def test_independently_verified_figure_survives_native_text_mismatch(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/independent-figure-proof",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 5 - About us and Relatives.pptx",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 4,
                        "title": "Picture",
                        "visibleTexts": ["Look at the picture and answer the question."],
                    }
                ],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "family-photo.jpg"
            asset.write_bytes(b"verified family photo payload")
            digest = hashlib.sha256(asset.read_bytes()).hexdigest()
            native_audit = {
                "_auditPath": str(Path(directory) / "native-audit.json"),
                "records": [
                    {
                        "unit": 5,
                        "status": "ok",
                        "candidate": {"id": "independent-figure-proof-5", "title": "Unit 5 - About us and Relatives.pptx"},
                        "native": {
                            "slides": [
                                {
                                    "number": 4,
                                    "texts": ["Unrelated native text that fails whole-slide alignment."],
                                    "figures": [
                                        {
                                            "unit": 5,
                                            "slideNumber": 4,
                                            "assetPath": str(asset),
                                            "publicUrl": "/images/lessons/course/family-photo.webp",
                                            "role": "instructional-figure",
                                            "confirmedInstructional": True,
                                            "sourceSha256": digest,
                                            "nativeEvidence": {
                                                "reviewed": True,
                                                "mapping": "reviewed-figures",
                                                "sourceSha256": digest,
                                                "verifiedSourceSha256": digest,
                                            },
                                        }
                                    ],
                                }
                            ]
                        },
                    }
                ],
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "native-figure-required" for blocker in plan["blockers"]))
        image = next(row for row in plan["nextRows"] if row["data"].get("type") == "image")
        self.assertEqual(image["data"]["url"], "/images/lessons/course/family-photo.webp")
        self.assertEqual(image["data"]["assetPath"], str(asset.resolve()))
        self.assertEqual(
            image["data"]["data"]["originalSource"]["nativeEvidence"]["figures"][0]["sourceSha256"],
            digest,
        )

    def test_independent_figure_proof_rejects_payload_sha_mismatch(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 4,
                "title": "Picture",
                "visibleTexts": ["Look at the picture and answer the question."],
            }
        ]
        source["deck"]["slideCount"] = 1
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "family-photo.jpg"
            asset.write_bytes(b"verified family photo payload")
            wrong_digest = "0" * 64
            native_audit = {
                "_auditPath": str(Path(directory) / "native-audit.json"),
                "records": [
                    {
                        "unit": 5,
                        "status": "ok",
                        "candidate": {"id": "independent-figure-sha-mismatch-5", "title": "Where are you from?"},
                        "native": {
                            "slides": [
                                {
                                    "number": 4,
                                    "texts": ["Unrelated native text."],
                                    "figures": [
                                        {
                                            "unit": 5,
                                            "slideNumber": 4,
                                            "assetPath": str(asset),
                                            "publicUrl": "/images/lessons/course/family-photo.webp",
                                            "role": "instructional-figure",
                                            "confirmedInstructional": True,
                                            "sourceSha256": wrong_digest,
                                            "nativeEvidence": {
                                                "reviewed": True,
                                                "mapping": "reviewed-figures",
                                                "sourceSha256": wrong_digest,
                                                "verifiedSourceSha256": wrong_digest,
                                            },
                                        }
                                    ],
                                }
                            ]
                        },
                    }
                ],
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 4 for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "image" for row in plan["nextRows"]))

    def test_conflicting_native_chart_keeps_required_table_blocker(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-chart-priority",
            "status": "ok",
            "deck": {
                "deckTitle": "Unit 2 - Where are you from?.pptx",
                "slideCount": 1,
                "slides": [{"number": 2, "title": "Grammar chart", "visibleTexts": ["Grammar chart", "Check the chart below."]}],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "native-chart-priority-2", "title": "Unit 2 - Where are you from?.pptx"},
                    "native": {"slides": [{"number": 2, "texts": ["A different reading passage."]}]},
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "table-semantics-missing" and blocker["slide"] == 2 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] in {"native-source-mismatch", "native-slide-mismatch"} for blocker in plan["blockers"]))

    def test_native_image_refs_require_confirmed_instructional_role(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/native-image-role",
            "status": "ok",
            "deck": {
                "deckTitle": "Where are you from?",
                "slideCount": 1,
                "slides": [{"number": 1, "title": "Art", "visibleTexts": ["Art"]}],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "instructional-figure.png"
            asset.write_bytes(b"fixture image")
            native_audit = {
                "records": [
                    {
                        "unit": 2,
                        "status": "ok",
                        "candidate": {"id": "native-image-role-2", "title": "Where are you from?"},
                        "native": {
                            "slides": [
                                {
                                    "number": 1,
                                    "texts": ["Art"],
                                    "imageRefs": [
                                        {"localPath": str(Path(directory) / "missing-logo.png"), "role": "logo"},
                                        {"localPath": str(Path(directory) / "missing-candidate.png"), "role": "instructional-candidate"},
                                    {
                                        "localPath": str(asset),
                                        "publicUrl": "/images/lessons/course/confirmed.png",
                                        "classification": "figure",
                                        "alt": "Confirmed figure",
                                    },
                                    ],
                                }
                            ]
                        },
                    }
                ]
            }

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertTrue(plan["publishable"])
        self.assertEqual(plan["blockers"], [])
        images = [row for row in plan["nextRows"] if row["data"].get("type") == "image"]
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]["data"]["assetPath"], str(asset.resolve()))
        self.assertEqual(images[0]["data"]["url"], "/images/lessons/course/confirmed.png")
        self.assertEqual(images[0]["data"]["alt"], "Confirmed figure")

    def test_required_picture_prompt_blocks_without_confirmed_figure_evidence(self) -> None:
        source = {
            "courseId": COURSE_ID,
            "lesson": {"id": LESSON_ID, "order": 2, "title": "Where are you from?"},
            "sourceUrl": "https://slides.example/required-picture",
            "status": "ok",
            "deck": {
                "deckTitle": "Where are you from?",
                "slideCount": 1,
                "slides": [
                    {
                        "number": 1,
                        "title": "Picture Practice",
                        "visibleTexts": ["Picture Practice", "Look at the picture and answer the question."],
                    }
                ],
            },
        }
        native_audit = {
            "records": [
                {
                    "unit": 2,
                    "status": "ok",
                    "candidate": {"id": "required-picture-2", "title": "Where are you from?"},
                    "native": {
                        "slides": [
                            {
                                "number": 1,
                                "texts": ["Picture Practice", "Look at the picture and answer the question."],
                                "imageRefs": [{"url": "https://assets.example/logo.png", "role": "logo"}],
                            }
                        ]
                    },
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, native_audit=native_audit)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "native-figure-required" and blocker["slide"] == 1 for blocker in plan["blockers"]))
        self.assertFalse(any(blocker["code"] == "native-figure-untraceable" for blocker in plan["blockers"]))

    def test_picture_words_in_writing_vocabulary_and_grammar_do_not_require_figure(self) -> None:
        cases = [
            (
                15,
                "Let's Write",
                [
                    "E. Write an 80 to 120 word text where you can describe your ideal partner; "
                    "the way he/she looks, how he/she is, what clothes you picture him/her wearing "
                    "and how you prefer his/her personality to be."
                ],
            ),
            (
                13,
                "Delexical verbs",
                [
                    "A. Look at the words on the list. Make sentences using the corresponding delexical verbs.",
                    "DINE – HUG – BATHE – PHOTOGRAPH – PROMISE – DECIDE – SWIM – COOK – LUNCH",
                ],
            ),
            (
                8,
                "Useful phrases",
                [
                    "PHRASES EXAMPLES What if… What if Jane came tonight to the party? "
                    "Just picture how awkward it would be.",
                ],
            ),
        ]

        for number, title, visible_texts in cases:
            source = source_fixture()
            source["deck"]["slides"] = [
                {"number": number, "title": title, "visibleTexts": visible_texts}
            ]
            source["deck"]["slideCount"] = 1

            plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

            self.assertTrue(plan["publishable"], msg=f"unexpected blocker for slide {number}: {plan['blockers']}")
            self.assertFalse(
                any(
                    blocker["code"] == "native-figure-required" and blocker["slide"] == number
                    for blocker in plan["blockers"]
                )
            )

    def test_exercise_review_maps_distinct_reading_questions_and_accepted_answers(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][3])]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "schemaVersion": 1,
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        str(source_slide["number"]): {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s04-q1",
                                    "kind": "reading-comprehension",
                                    "prompt": "What country is Maria from?",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "answer",
                                            "canonical": "Peru",
                                            "accepted": ["Peru", "the country of Peru"],
                                            "evidence": "Maria is from Peru.",
                                        }
                                    ],
                                    "sourceEvidence": ["Maria is from Peru."],
                                },
                                {
                                    "id": "u02-s04-q2",
                                    "kind": "reading-comprehension",
                                    "prompt": "Where does Joao come from?",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "answer",
                                            "canonical": "Brazil",
                                            "accepted": ["Brazil"],
                                            "evidence": "Joao is from Brazil.",
                                        }
                                    ],
                                    "sourceEvidence": ["Joao is from Brazil."],
                                },
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        short_answer = next(row for row in plan["nextRows"] if row["data"].get("type") == "short_answer")
        self.assertEqual([item["question"] for item in short_answer["data"]["items"]], ["What country is Maria from?", "Where does Joao come from?"])
        self.assertEqual(short_answer["data"]["items"][0]["correctAnswer"], "Peru")
        self.assertEqual(short_answer["data"]["items"][0]["acceptedAnswers"], ["Peru", "the country of Peru"])
        self.assertEqual(short_answer["data"]["data"]["exerciseReviewItems"][0]["id"], "u02-s04-q1")

    def test_exercise_review_maps_grammar_transform_to_labeled_items_and_preserves_options(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Grammar practice", "visibleTexts": ["Grammar practice", "Jared comes from Morocco."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-a1",
                                    "kind": "grammar-transform",
                                    "prompt": "Jared comes from Morocco.",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {"id": "interrogative", "canonical": "Does Jared come from Morocco?", "accepted": ["Does Jared come from Morocco?"], "evidence": "Jared comes from Morocco."},
                                        {"id": "negative", "canonical": "Jared does not come from Morocco.", "accepted": ["Jared does not come from Morocco.", "Jared doesn't come from Morocco."], "evidence": "Jared comes from Morocco."},
                                    ],
                                    "sourceEvidence": ["Jared comes from Morocco."],
                                },
                                {
                                    "id": "u02-s12-choice",
                                    "kind": "grammar-choice",
                                    "prompt": "Choose the correct subject.",
                                    "reviewStatus": "reviewed",
                                    "builderHints": {
                                        "_explicit_options": [
                                            {"id": "a", "text": "Jared"},
                                            {"id": "b", "text": "Morocco"},
                                            {"id": "c", "text": "comes"},
                                            {"id": "d", "text": "from"},
                                        ],
                                        "_explicit_answer_key": "a",
                                    },
                                    "answerItems": [{"id": "answer", "canonical": "Jared", "accepted": ["Jared"], "evidence": "Jared comes from Morocco."}],
                                    "sourceEvidence": ["Jared comes from Morocco."],
                                },
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        short_answer = next(row for row in plan["nextRows"] if row["data"].get("type") == "short_answer")
        self.assertEqual(
            [item["question"] for item in short_answer["data"]["items"]],
            [
                "Convierte en pregunta: Jared comes from Morocco.",
                "Convierte en negativa: Jared comes from Morocco.",
            ],
        )
        self.assertEqual(short_answer["data"]["title"], "Transforma la frase.")
        self.assertEqual(short_answer["title"], "Grammar practice")
        self.assertEqual(short_answer["data"]["data"]["guidedTitle"], "Transforma la frase.")
        self.assertEqual(short_answer["data"]["context"], "Convierte cada frase en pregunta y negativa.")
        self.assertEqual(
            [item["sourcePrompt"] for item in short_answer["data"]["items"]],
            ["Jared comes from Morocco.", "Jared comes from Morocco."],
        )
        multiple_choice = next(row for row in plan["nextRows"] if row["data"].get("type") == "multiple_choice")
        self.assertEqual([option["text"] for option in multiple_choice["data"]["options"]], ["Jared", "Morocco", "comes", "from"])
        self.assertEqual(multiple_choice["data"]["correctOptionId"], "a")

    def test_grammar_worksheet_projects_worked_example_and_archives_full_matrix(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 12,
                "title": "Grammar practice",
                "visibleTexts": [
                    "Grammar practice",
                    "Change the following sentences into the interrogative and negative form.",
                    "Jared comes from Morocco.",
                    "The Jenkins speak English.",
                    "We are Chinese.",
                    "I am Venezuelan.",
                    "Create four new sentences with questions and negative statements.",
                ],
                "_nativeAudit": {
                    "tables": [
                        {
                            "rows": [
                                ["", "Statements", "Questions", "Negative statements"],
                                ["0.", "Julia is from Italy.", "Is Julia from Italy?", "Julia is not from Italy."],
                                ["1.", "Jared comes from Morocco.", "", ""],
                                ["2.", "The Jenkins speak English.", "", ""],
                                ["3.", "We are Chinese.", "", ""],
                                ["4.", "I am Venezuelan.", "", ""],
                                ["5.", "", "", ""],
                                ["6.", "", "", ""],
                                ["7.", "", "", ""],
                                ["8.", "", "", ""],
                            ]
                        }
                    ]
                },
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        transform_items = []
        sentences = [
            "Jared comes from Morocco.",
            "The Jenkins speak English.",
            "We are Chinese.",
            "I am Venezuelan.",
        ]
        for index, sentence in enumerate(sentences, start=1):
            transform_items.append(
                {
                    "id": f"u02-s12-a{index}",
                    "kind": "grammar-transform",
                    "prompt": sentence,
                    "responseMode": "typed-short-answer",
                    "reviewStatus": "reviewed",
                    "answerItems": [
                        {
                            "id": "interrogative",
                            "canonical": f"Question {index}",
                            "accepted": [f"Question {index}"],
                            "evidence": sentence,
                        },
                        {
                            "id": "negative",
                            "canonical": f"Negative {index}",
                            "accepted": [f"Negative {index}"],
                            "evidence": sentence,
                        },
                    ],
                    "sourceEvidence": [sentence],
                }
            )
        transform_items.append(
            {
                "id": "u02-s12-open",
                "kind": "grammar-production",
                "prompt": "Create four new sentences with questions and negative statements.",
                "responseMode": "typed-essay",
                "reviewStatus": "open-response-preserved",
                "sourceEvidence": ["Create four new sentences"],
                "constraints": "Create four new sentences with questions and negative statements.",
            }
        )
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {"source": copy.deepcopy(slide), "items": transform_items}
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        structured = next(row for row in generated if row["data"]["type"] == "structured-content")
        self.assertEqual(
            structured["data"]["content"],
            {
                "headers": ["", "Statements", "Questions", "Negative statements"],
                "rows": [["0.", "Julia is from Italy.", "Is Julia from Italy?", "Julia is not from Italy."]],
            },
        )
        self.assertEqual(len(structured["data"]["tables"][0]), 10)
        self.assertEqual(structured["data"]["worksheetProjection"]["mode"], "worked-example-only")
        self.assertEqual(structured["data"]["worksheetProjection"]["sourceRowCount"], 9)
        short_answer = next(row for row in generated if row["data"]["type"] == "short_answer")
        self.assertEqual(len(short_answer["data"]["items"]), 8)
        self.assertEqual(short_answer["data"]["title"], "Transforma la frase.")
        essay = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertEqual(essay["data"]["prompt"], "Create four new sentences with questions and negative statements.")
        self.assertTrue(essay["data"]["aiGrading"])

    def test_teacher_listening_reflection_is_self_study_prompt_with_original_context(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 4,
                "title": "Listen to the introduction",
                "visibleTexts": [
                    "Listen to the introduction",
                    "B. Listen to the audio and discuss with your teacher: what is the topic? Are there phrases you know? Write them in the chat box.",
                ],
                "media": [
                    {
                        "kind": "audio",
                        "url": "https://audio.example/unit2-intro.mp3",
                        "digest": "unit2-intro-digest",
                        "transcript": "This is the original authored introduction.",
                    }
                ],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        original_prompt = slide["visibleTexts"][1]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "4": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s04-b",
                                    "kind": "listening",
                                    "prompt": original_prompt,
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "sourceEvidence": [original_prompt],
                                    "blocker": "Closed answers are not reviewed.",
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        audio = next(row for row in generated if row["data"]["type"] == "audio")
        self.assertEqual(audio["data"]["title"], "Escucha y reflexiona.")
        self.assertEqual(audio["data"]["instruction"], "Escucha el audio y responde la reflexión.")
        reflection = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertEqual(reflection["data"]["prompt"], "¿De qué trata el audio? Escribe las frases que reconoces.")
        self.assertEqual(reflection["data"]["title"], "Escucha y reflexiona.")
        self.assertTrue(reflection["data"]["aiGrading"])
        self.assertEqual(reflection["data"]["sourcePrompt"], original_prompt)
        self.assertEqual(
            reflection["data"]["data"]["exerciseReview"]["prompt"],
            original_prompt,
        )
        self.assertIn(original_prompt, reflection["data"]["data"]["aiGradingContext"])
        self.assertIn("This is the original authored introduction.", reflection["data"]["data"]["aiGradingContext"])

    def test_reviewed_teacher_vocabulary_instruction_becomes_teacher_notes_without_audio(self) -> None:
        source = source_fixture()
        original_prompt = "Look at the information, listen to your teacher and repeat the words. Discuss about them.\nTRAVEL\nHOTEL"
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Vocabulary",
                "visibleTexts": ["Vocabulary", original_prompt],
                "media": [],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "6": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u21-s06-review",
                                    "kind": "teacher-vocabulary",
                                    "prompt": original_prompt,
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "sourceEvidence": [original_prompt],
                                    "blocker": "No authored audio transcript is available.",
                                    "teacherNotes": {
                                        "reviewStatus": "reviewed",
                                        "reviewed": True,
                                        "sourceInstruction": original_prompt,
                                    },
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        teacher_note = next(
            row
            for row in generated
            if row["data"].get("type") == "teacher_notes"
            and row["data"].get("data", {}).get("exerciseReview", {}).get("id") == "u21-s06-review"
        )
        self.assertEqual(teacher_note["data"]["sourceRole"], "teacher-guided-listening")
        self.assertIn("listen to your teacher", teacher_note["data"]["content"])
        self.assertEqual(
            teacher_note["data"]["data"]["exerciseReview"]["id"],
            "u21-s06-review",
        )
        self.assertEqual(teacher_note["data"]["data"]["responseMode"], "teacher-notes-preserved")
        self.assertEqual(
            sum(row["data"].get("type") == "teacher_notes" for row in generated),
            1,
        )
        self.assertFalse(any(row["data"].get("type") == "audio" for row in generated))

        unreviewed = copy.deepcopy(review)
        del unreviewed["lessons"][LESSON_ID]["slides"]["6"]["items"][0]["teacherNotes"]
        blocked_plan = builder.build_plan(
            snapshot_fixture()["modules"][0]["lessons"][0],
            source,
            exercise_review=unreviewed,
        )
        self.assertFalse(blocked_plan["publishable"])
        self.assertTrue(
            any(
                blocker["code"] == "exercise-review-listening-blocked"
                for blocker in blocked_plan["blockers"]
            )
        )

    def test_exercise_review_keeps_ambiguous_answer_out_of_native_key(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Grammar practice", "visibleTexts": ["Grammar practice", "Correct the sentence."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-correction",
                                    "kind": "grammar-correction",
                                    "prompt": "Correct the sentence.",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [
                                        {
                                            "id": "item-1",
                                            "canonical": "Source wording is insufficient to determine a unique correction.",
                                            "accepted": [],
                                            "status": "source-ambiguous",
                                            "evidence": "Correct the sentence.",
                                        }
                                    ],
                                    "sourceEvidence": ["Correct the sentence."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-answer-ambiguous" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "short_answer" for row in plan["nextRows"]))

    def test_ambiguous_review_item_becomes_formative_open_response_beside_seven_keys(self) -> None:
        source = source_fixture()
        original_sentence = "I have chance my arm so long for this company."
        source["deck"]["slides"] = [
            {
                "number": 13,
                "title": "Correct the causative-verb sentences.",
                "visibleTexts": [
                    "Correct the causative-verb sentences.",
                    "0. Dexter had chime in Mary at the talk. / Dexter had Mary chime in at the talk. "
                    "1. Clayton got the copier fixed yesterday. 2. I will had John come for the dinner party. "
                    f"3. {original_sentence} 4. Danny always has Daniel help him with his homework. "
                    "5. Get the homework ready and you can go out. 6. I was having Jake cleaned the house and he fell over. "
                    "7. The company most of the staff fired for corruption. 8. I will have Jimmy buy our food tonight.",
                ],
            }
        ]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        answer_items = [
            {
                "id": f"item-{index}",
                "canonical": answer,
                "accepted": [answer],
                "evidence": evidence,
            }
            for index, (answer, evidence) in enumerate(
                [
                    ("Clayton got the copier fixed yesterday.", "Clayton got the copier fixed yesterday."),
                    ("I will have John come for the dinner party.", "I will had John come for the dinner party."),
                    ("Danny always has Daniel help him with his homework.", "Danny always has Daniel help him with his homework."),
                    ("Get the homework ready and you can go out.", "Get the homework ready and you can go out."),
                    ("I was having Jake clean the house and he fell over.", "I was having Jake cleaned the house and he fell over."),
                    ("The company had most of the staff fired for corruption.", "The company most of the staff fired for corruption."),
                    ("I will have Jimmy buy our food tonight.", "I will have Jimmy buy our food tonight."),
                ],
                start=1,
            )
        ]
        answer_items.insert(
            2,
            {
                "id": "item-3",
                "status": "source-ambiguous",
                "evidence": original_sentence,
                "rationale": "The published sentence admits multiple meanings and valid repairs.",
            },
        )
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "13": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u38-s13-a",
                                    "kind": "grammar-correction",
                                    "prompt": "Correct the causative-verb sentences where needed.",
                                    "responseMode": "typed-short-answer",
                                    "reviewStatus": "reviewed-with-open-completions",
                                    "answerItems": answer_items,
                                    "sourceEvidence": ["Correct the causative-verb sentences where needed."],
                                    "openResponse": {
                                        "prompt": "Prop\u00f3n una correcci\u00f3n clara.",
                                        "sourcePrompt": original_sentence,
                                        "feedbackContext": "La redacci\u00f3n publicada admite m\u00faltiples significados y reparaciones v\u00e1lidas; no hay una correcci\u00f3n can\u00f3nica \u00fanica.",
                                    },
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "exercise-review-answer-ambiguous" for blocker in plan["blockers"]))
        short_answer = next(row for row in plan["nextRows"] if row["data"].get("type") == "short_answer")
        self.assertEqual(len(short_answer["data"]["items"]), 7)
        self.assertEqual(
            [item["question"] for item in short_answer["data"]["items"]],
            [
                "Clayton got the copier fixed yesterday.",
                "I will had John come for the dinner party.",
                "Danny always has Daniel help him with his homework.",
                "Get the homework ready and you can go out.",
                "I was having Jake cleaned the house and he fell over.",
                "The company most of the staff fired for corruption.",
                "I will have Jimmy buy our food tonight.",
            ],
        )
        self.assertNotIn(original_sentence, [item["correctAnswer"] for item in short_answer["data"]["items"]])
        essay = next(row for row in plan["nextRows"] if row["data"].get("type") == "essay")
        self.assertEqual(essay["data"]["prompt"], "Prop\u00f3n una correcci\u00f3n clara.")
        self.assertEqual(essay["data"]["sourcePrompt"], original_sentence)
        self.assertTrue(essay["data"]["aiGrading"])
        self.assertNotIn("correctAnswer", essay["data"])
        self.assertNotIn("acceptedAnswers", essay["data"])
        self.assertIn(original_sentence, essay["data"]["data"]["aiGradingContext"])
        self.assertIn("m\u00faltiples significados", essay["data"]["data"]["aiGradingContext"])
        self.assertIsNone(essay["data"]["data"]["ambiguousSource"]["canonicalAnswer"])
        self.assertEqual(
            essay["data"]["data"]["exerciseReview"]["answerItems"][2]["evidence"],
            original_sentence,
        )
        review_without_open_response = copy.deepcopy(review)
        del review_without_open_response["lessons"][LESSON_ID]["slides"]["13"]["items"][0]["openResponse"]
        blocked_plan = builder.build_plan(
            snapshot_fixture()["modules"][0]["lessons"][0],
            source,
            exercise_review=review_without_open_response,
        )
        self.assertFalse(blocked_plan["publishable"])
        self.assertTrue(
            any(
                blocker["code"] == "exercise-review-open-response-metadata-missing"
                for blocker in blocked_plan["blockers"]
            )
        )

    def test_unit38_errata_patch_contract_has_no_fabricated_key(self) -> None:
        patch_path = Path(__file__).resolve().parents[2] / "docs" / "audit" / "course-exercise-review-unit38-s13-errata.json"
        patch = json.loads(patch_path.read_text(encoding="utf-8"))
        record = patch["patches"][0]

        self.assertEqual(record["lessonId"], "cmnmm9qog001kw1qkht1v6i81")
        self.assertEqual(record["slideNumber"], 13)
        self.assertEqual(record["sourcePrompt"], "I have chance my arm so long for this company.")
        self.assertEqual(record["openResponse"]["prompt"], "Prop\u00f3n una correcci\u00f3n clara.")
        self.assertEqual(len(record["deterministicItems"]), 7)
        self.assertIsNone(record["answerPolicy"]["canonicalAnswer"])
        self.assertEqual(record["answerPolicy"]["acceptedAnswers"], [])
        self.assertTrue(record["answerPolicy"]["preserveOriginalItem"])
        self.assertTrue(record["mergeContract"]["archiveOriginalPromptInMetadata"])

    def test_exercise_review_does_not_downgrade_unmatched_choice_key(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 12, "title": "Choice", "visibleTexts": ["Choice", "Choose the correct answer."]}]
        source["deck"]["slideCount"] = 1
        source_slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "12": {
                            "source": copy.deepcopy(source_slide),
                            "items": [
                                {
                                    "id": "u02-s12-choice",
                                    "kind": "multiple-choice",
                                    "prompt": "Choose the correct answer.",
                                    "reviewStatus": "reviewed",
                                    "builderHints": {
                                        "_explicit_options": [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}],
                                        "_explicit_answer_key": "missing-option",
                                    },
                                    "answerItems": [{"id": "answer", "canonical": "A", "accepted": ["A"], "evidence": "Choose the correct answer."}],
                                    "sourceEvidence": ["Choose the correct answer."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-answer-unmatched" for blocker in plan["blockers"]))
        choice_rows = [
            row
            for row in plan["nextRows"]
            if row["data"].get("type") in {"multiple_choice", "short_answer"}
            and row["data"].get("data", {}).get("sourceSlides") == [12]
        ]
        self.assertEqual(choice_rows, [])

    def test_exercise_review_rejects_source_url_text_and_digest_mismatch(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [{"number": 4, "title": "Reading", "visibleTexts": ["Reading", "Maria is from Peru."]}]
        source["deck"]["slideCount"] = 1
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": "https://slides.example/different-source",
                    "slides": {
                        "4": {
                            "source": {
                                "number": 4,
                                "title": "Changed title",
                                "visibleTexts": ["Changed title", "Different evidence"],
                                "slideTextDigest": "0" * 64,
                            },
                            "items": [],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        codes = {blocker["code"] for blocker in plan["blockers"]}
        self.assertIn("exercise-review-source-url-mismatch", codes)
        self.assertIn("exercise-review-slide-text-mismatch", codes)
        self.assertIn("exercise-review-slide-digest-mismatch", codes)

    def test_blocked_listening_review_never_emits_playable_audio(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and answer the question."],
                "media": [{"kind": "audio", "url": "https://audio.example/original.mp3"}],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "6": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s06-a",
                                    "kind": "listening",
                                    "prompt": "Listen to the audio and answer the question.",
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "answerItems": [],
                                    "sourceEvidence": ["Listen to the audio and answer the question."],
                                    "blocker": "Transcript is not available.",
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))

    def test_listening_review_merges_four_choice_items_with_staged_audio(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"][5]["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        options = [
            {"id": "a", "text": "Peru"},
            {"id": "b", "text": "Brazil"},
            {"id": "c", "text": "Chile"},
            {"id": "d", "text": "Mexico"},
        ]
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 1,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [
                        {
                            "id": f"listening-{index}",
                            "prompt": f"Which country is named in sentence {index}?",
                            "explicitOptions": copy.deepcopy(options),
                            "answerItems": [{"canonical": "Peru", "evidence": "I come from Peru."}],
                            "evidence": "I come from Peru.",
                            "reviewStatus": "reviewed",
                        }
                        for index in range(1, 5)
                    ],
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        self.assertTrue(plan["publishable"])
        generated = [row for row in plan["nextRows"] if row["id"].startswith("course-guided-")]
        audio = next(row for row in generated if row["data"].get("type") == "audio")
        multiple_choice = next(row for row in generated if row["data"].get("type") == "multiple_choice")
        self.assertEqual(audio["data"]["url"], "/audio/lessons/course/unit-02-audio-01.mp3")
        self.assertEqual(audio["data"]["mediaDigest"], "audio-sha256-fixture")
        self.assertEqual(multiple_choice["data"]["data"]["sourceSlides"], [6])
        self.assertEqual(audio["data"]["data"]["sourceSlides"], [6])
        self.assertEqual(len(multiple_choice["data"]["items"]), 4)
        self.assertTrue(all(len(item["options"]) == 4 for item in multiple_choice["data"]["items"]))
        self.assertTrue(all(item["correctOptionId"] == "a" for item in multiple_choice["data"]["items"]))
        self.assertFalse(any(row["data"].get("type") == "text" and row["data"]["data"].get("sourceSlides") == [6] for row in generated))

    def test_reviewed_reading_choices_bundle_into_one_step_with_provenance(self) -> None:
        source = source_fixture()
        slide = {"number": 8, "title": "Read and choose", "visibleTexts": ["Read the passage."]}
        items = [
            {
                "id": f"reading-q{index}",
                "kind": "reading-true-false",
                "prompt": f"Statement {index}",
                "reviewStatus": "reviewed",
                "options": ["T", "F"],
                "answerItems": [{"canonical": "T" if index % 2 else "F", "evidence": f"Evidence {index}"}],
                "evidence": f"Evidence {index}",
            }
            for index in range(1, 9)
        ]
        blockers: list[dict] = []
        specs, listening_blocked = builder._exercise_review_specs(
            slide,
            items,
            blockers,
            None,
            source,
        )

        self.assertFalse(listening_blocked)
        self.assertEqual([native_type for native_type, _payload in specs], ["multiple_choice"])
        payload = specs[0][1]
        self.assertEqual(len(payload["items"]), 8)
        self.assertEqual([item["sourceReviewId"] for item in payload["items"]], [f"reading-q{index}" for index in range(1, 9)])
        self.assertEqual([item["correctOptionId"] for item in payload["items"]], [
            "course-choice-8-001",
            "course-choice-8-002",
            "course-choice-8-001",
            "course-choice-8-002",
            "course-choice-8-001",
            "course-choice-8-002",
            "course-choice-8-001",
            "course-choice-8-002",
        ])
        self.assertEqual(
            [item["evidence"] for item in payload["data"]["exerciseReviewItems"]],
            [f"Evidence {index}" for index in range(1, 9)],
        )
        self.assertEqual(payload["data"]["multipleChoiceScope"]["responseScope"], "reading")

    def test_multiple_choice_bundle_does_not_cross_open_or_audio_scope(self) -> None:
        source = source_fixture(complete_audio=True)
        slide = {"number": 8, "title": "Mixed practice", "visibleTexts": ["Choose the answer."]}

        def choice(item_id: str, prompt: str, *, kind: str = "reading-comprehension", audio_sha: str = "") -> dict:
            item = {
                "id": item_id,
                "kind": kind,
                "prompt": prompt,
                "reviewStatus": "reviewed",
                "options": ["A", "B", "C", "D"],
                "answerItems": [{"canonical": "A", "evidence": f"Evidence {item_id}"}],
            }
            if audio_sha:
                item["sourceAudioSha256"] = audio_sha
                item["responseMode"] = "audio"
            return item

        items = [
            choice("reading-1", "Reading one"),
            {
                "id": "open-1",
                "kind": "open-writing",
                "prompt": "Write a response.",
                "reviewStatus": "open-response-preserved",
            },
            choice("listening-1", "Listening one", kind="listening", audio_sha="audio-one"),
            choice("listening-2", "Listening two", kind="listening", audio_sha="audio-one"),
            choice("listening-other", "Listening other clip", kind="listening", audio_sha="audio-two"),
        ]
        blockers: list[dict] = []
        specs, _listening_blocked = builder._exercise_review_specs(slide, items, blockers, None, source)
        multiple = [payload for native_type, payload in specs if native_type == "multiple_choice"]

        self.assertEqual(len(multiple), 3)
        self.assertEqual(multiple[0]["question"], "Reading one")
        self.assertEqual(len(multiple[1]["items"]), 2)
        self.assertEqual(multiple[2]["question"], "Listening other clip")
        self.assertEqual(multiple[0]["data"]["multipleChoiceScope"]["responseScope"], "reading")
        self.assertEqual(multiple[1]["data"]["multipleChoiceScope"]["sourceAudioSha256"], "audio-one")
        self.assertEqual(multiple[2]["data"]["multipleChoiceScope"]["sourceAudioSha256"], "audio-two")
        self.assertTrue(any(native_type == "essay" for native_type, _payload in specs))

    def test_listening_review_uses_one_based_audio_ordinal_and_prefers_complete_stage(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and write the country."],
                "media": [
                    {
                        "kind": "audio",
                        "audioIndex": 1,
                        "url": "https://audio.example/incomplete.mp3",
                    },
                    {
                        "kind": "audio-icon",
                        "iconOnly": True,
                        "url": "https://docs.google.com/slides-images-rt/rendered-slide.png",
                    },
                ],
            }
        ]
        source["deck"]["slideCount"] = 1
        stage = {
            "entries": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 2,
                    "audioNumber": 2,
                    "sourceSha256": "staged-audio-2",
                    "publicHref": "/audio/lessons/course/unit-02-audio-02.mp3",
                    "originalMediaUrl": "https://drive.google.com/file/d/staged/view",
                    "transcript": "I come from Peru.",
                }
            ]
        }
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 2,
                    "sourceAudioSha256": "staged-audio-2",
                    "items": [
                        {
                            "id": "listening-ordinal",
                            "prompt": "Which country is named?",
                            "explicitOptions": [
                                {"id": "a", "text": "Peru"},
                                {"id": "b", "text": "Brazil"},
                                {"id": "c", "text": "Chile"},
                                {"id": "d", "text": "Mexico"},
                            ],
                            "answerItems": [{"canonical": "Peru", "evidence": "I come from Peru."}],
                            "reviewStatus": "reviewed",
                        }
                    ],
                }
            ]
        }

        plan = builder.build_plan(
            snapshot_fixture()["modules"][0]["lessons"][0],
            source,
            audio_manifest=stage,
            listening_review=review,
        )

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "listening-review-audio-index-invalid" for blocker in plan["blockers"]))
        audio = next(row for row in plan["nextRows"] if row["data"].get("type") == "audio")
        self.assertEqual(audio["data"]["url"], "/audio/lessons/course/unit-02-audio-02.mp3")
        self.assertEqual(audio["data"]["data"]["originalSource"]["audio"]["digest"], "staged-audio-2")

    def test_listening_review_does_not_treat_candidate_position_as_audio_ordinal(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and write the country."],
                "media": [{"kind": "audio-icon", "iconOnly": True}],
            }
        ]
        source["deck"]["slideCount"] = 1
        stage = {
            "entries": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 2,
                    "sourceSha256": "staged-audio-2",
                    "publicHref": "/audio/lessons/course/unit-02-audio-02.mp3",
                    "transcript": "I come from Peru.",
                }
            ]
        }
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 1,
                    "sourceAudioSha256": "staged-audio-2",
                    "items": [],
                }
            ]
        }

        plan = builder.build_plan(
            snapshot_fixture()["modules"][0]["lessons"][0],
            source,
            audio_manifest=stage,
            listening_review=review,
        )

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "listening-review-audio-index-invalid" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))

    def test_listening_review_rejects_transcript_evidence_sha_and_manual_status(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        slide["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        review = {
            "exercises": [
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 1,
                    "sourceAudioSha256": "wrong-sha",
                    "items": [
                        {
                            "id": "blocked-listening",
                            "prompt": "Which country is named?",
                            "explicitOptions": [
                                {"id": "a", "text": "Peru"},
                                {"id": "b", "text": "Brazil"},
                                {"id": "c", "text": "Chile"},
                                {"id": "d", "text": "Mexico"},
                            ],
                            "answerItems": [{"canonical": "Peru"}],
                            "evidence": "This sentence is absent from the transcript.",
                            "reviewStatus": "manual",
                        }
                    ],
                }
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        codes = {blocker["code"] for blocker in plan["blockers"]}
        self.assertFalse(plan["publishable"])
        self.assertIn("listening-review-audio-sha-mismatch", codes)
        self.assertIn("listening-review-blocked", codes)
        self.assertFalse(any(row["data"].get("type") in {"audio", "multiple_choice"} and row["data"]["data"].get("sourceSlides") == [6] for row in plan["nextRows"]))

        review["exercises"][0]["sourceAudioSha256"] = "audio-sha256-fixture"
        review["exercises"][0]["items"][0]["reviewStatus"] = "reviewed"
        evidence_plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)
        evidence_codes = {blocker["code"] for blocker in evidence_plan["blockers"]}
        self.assertIn("listening-review-evidence-mismatch", evidence_codes)
        self.assertFalse(any(row["data"].get("type") in {"audio", "multiple_choice"} and row["data"]["data"].get("sourceSlides") == [6] for row in evidence_plan["nextRows"]))

    def test_listening_review_rejects_ambiguous_correct_option_and_wrong_scope(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [copy.deepcopy(source["deck"]["slides"][5])]
        source["deck"]["slideCount"] = 1
        source["deck"]["slides"][0]["media"][0].update(
            {
                "publicHref": "/audio/lessons/course/unit-02-audio-01.mp3",
                "sourceSha256": "audio-sha256-fixture",
            }
        )
        review = {
            "exercises": [
                {
                    "lessonId": "another-lesson",
                    "slideNumber": 6,
                    "audioIndex": 1,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [],
                },
                {
                    "lessonId": LESSON_ID,
                    "slideNumber": 6,
                    "audioIndex": 1,
                    "sourceAudioSha256": "audio-sha256-fixture",
                    "items": [
                        {
                            "id": "ambiguous",
                            "prompt": "Which country is named?",
                            "explicitOptions": [
                                {"id": "a", "text": "Peru"},
                                {"id": "b", "text": "Brazil"},
                                {"id": "c", "text": "Chile"},
                                {"id": "d", "text": "Mexico"},
                            ],
                            "answerItems": [{"canonical": "Peru"}, {"canonical": "Brazil"}],
                            "evidence": "I come from Peru.",
                            "reviewStatus": "reviewed",
                        }
                    ],
                },
            ]
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, listening_review=review)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "listening-review-answer-ambiguous" for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "multiple_choice" for row in plan["nextRows"]))

    def test_listening_review_cli_combines_repeatable_documents(self) -> None:
        combined = builder._listening_review_documents(
            [
                {"exercises": [{"lessonId": LESSON_ID, "slideNumber": 6}]},
                {"exercises": [{"lessonId": LESSON_ID, "slideNumber": 7}]},
            ]
        )

        self.assertEqual(
            [(item["lessonId"], item["slideNumber"]) for item in combined["exercises"]],
            [(LESSON_ID, 6), (LESSON_ID, 7)],
        )
        args = builder._parse_args(
            [
                "--snapshot", "snapshot.json",
                "--source-dir", "sources",
                "--output", "plans.json",
                "--listening-review", "review-a.json",
                "--listening-review", "review-b.json",
            ]
        )
        self.assertEqual([str(path) for path in args.listening_review], ["review-a.json", "review-b.json"])

    def test_exercise_review_keeps_roleplay_and_writing_as_separate_open_blocks(self) -> None:
        source = source_fixture()
        source["deck"]["slides"] = [
            {
                "number": 5,
                "title": "Practice",
                "visibleTexts": ["Practice", "Act out the situation with your teacher and write a 30-50 word paragraph."],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "5": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s05-roleplay-writing",
                                    "kind": "roleplay-and-writing",
                                    "prompt": "Act out the situation with your teacher and write a 30-50 word paragraph.",
                                    "responseMode": "open-response",
                                    "reviewStatus": "open-response-preserved",
                                    "answerItems": [],
                                    "sourceEvidence": ["Act out the situation with your teacher and write a 30-50 word paragraph."],
                                    "doNotAutoGrade": True,
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        generated_types = [row["data"].get("type") for row in plan["nextRows"]]
        self.assertIn("recording", generated_types)
        self.assertIn("essay", generated_types)
        recording = next(row for row in plan["nextRows"] if row["data"].get("type") == "recording")
        essay = next(row for row in plan["nextRows"] if row["data"].get("type") == "essay")
        self.assertIn("Act out the situation", recording["data"]["instruction"])
        self.assertTrue(recording["data"]["aiGrading"])
        self.assertNotIn("doNotAutoGrade", recording["data"])
        self.assertEqual(recording["data"]["data"]["guidedRole"], "conversation")
        self.assertEqual(recording["data"]["data"]["turns"][0]["question"], review["lessons"][LESSON_ID]["slides"]["5"]["items"][0]["prompt"])
        self.assertEqual(recording["data"]["data"]["turns"][0]["answerPrompt"], "Responde a la situación.")
        self.assertIn("30-50 word paragraph", essay["data"]["prompt"])
        self.assertTrue(essay["data"]["aiGrading"])
        self.assertIn("Authored source prompt", essay["data"]["data"]["aiGradingContext"])
        self.assertEqual(essay["data"]["minWords"], 30)
        self.assertEqual(essay["data"]["maxWords"], 50)

    def test_teacher_listening_with_staged_transcript_keeps_audio_and_open_reflection(self) -> None:
        source = source_fixture(complete_audio=True)
        source["deck"]["slides"] = [
            {
                "number": 6,
                "title": "Listening",
                "visibleTexts": ["Listening", "Listen to the audio and write two phrases you understood."],
                "media": [
                    {
                        "kind": "audio",
                        "url": "https://cdn.example/lesson/audio-6.mp3",
                        "digest": "audio-sha256-fixture",
                        "transcript": "I come from Peru.",
                    }
                ],
            }
        ]
        source["deck"]["slideCount"] = 1
        slide = source["deck"]["slides"][0]
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "6": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u02-s06-reflection",
                                    "kind": "listening",
                                    "prompt": "Listen to the audio and write two phrases you understood.",
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "answerItems": [],
                                    "sourceEvidence": ["Listen to the audio and write two phrases you understood."],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertTrue(plan["publishable"])
        self.assertFalse(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))
        audio = next(row for row in plan["nextRows"] if row["data"].get("type") == "audio")
        reflection = next(row for row in plan["nextRows"] if row["data"].get("type") == "essay")
        self.assertEqual(audio["data"]["transcript"], "I come from Peru.")
        self.assertTrue(reflection["data"]["aiGrading"])
        self.assertIn("I come from Peru.", reflection["data"]["data"]["aiGradingContext"])
        self.assertIn("write two phrases", reflection["data"]["prompt"])

    def test_published_final_d_and_e_prompts_stay_separate_around_review_placeholder(self) -> None:
        source = source_fixture()
        d_prompt = (
            "D. Based on the topic presented in the reading section, what other issues you think people should be aware of? "
            "Having answered that, what are the circumstances likely to happen depending on people’s response to them?"
        )
        e_prompt = (
            "E. Write a 170-200 word text about the impact socialism is having in the world and hot it may turn out in case it keeps spreading and gaining power. "
            "What if the world receives it? Support your ideas and remember to use the language studied."
        )
        slide = {
            "number": 15,
            "title": d_prompt,
            "visibleTexts": [d_prompt, e_prompt, "Let’s Talk", "Let’s Write"],
        }
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "15": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u49-s15-d",
                                    "kind": "roleplay-and-writing",
                                    "prompt": "Complete the role-play or writing activity shown on the published slide.",
                                    "responseMode": "open-response",
                                    "reviewStatus": "open-response-preserved",
                                    "sourceEvidence": ["D. Complete the final activity on the published slide."],
                                    "doNotAutoGrade": True,
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        self.assertFalse(any(blocker["code"] == "exercise-review-evidence-mismatch" for blocker in plan["blockers"]))
        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [15]]
        recording = next(row for row in generated if row["data"]["type"] == "recording")
        essay = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertEqual(recording["data"]["instruction"], d_prompt)
        self.assertEqual(essay["data"]["prompt"], e_prompt)
        self.assertEqual(recording["data"]["data"]["turns"][0]["question"], d_prompt)
        self.assertNotIn("word paragraph", recording["data"]["data"]["turns"][0]["question"])
        self.assertEqual((essay["data"]["minWords"], essay["data"]["maxWords"]), (170, 200))
        self.assertNotIn("Complete the final activity", recording["data"]["instruction"])
        self.assertNotIn("Complete the final activity", essay["data"]["prompt"])

    def test_teacher_led_final_activity_preserves_visible_self_study_practice_without_audio(self) -> None:
        source = source_fixture()
        d_prompt = (
            "D. Listen to your teacher narrating his preferences. After that, tell him about yours. "
            "Remember to include different phrases and also when and how you do your hobbies."
        )
        e_prompt = "E. Write a 30 - 50 word text talking about your best friend’s likes and preferences. Include all the likeness degrees."
        slide = {
            "number": 15,
            "title": d_prompt,
            "visibleTexts": [d_prompt, "Let’s Talk", e_prompt, "Let’s Write"],
        }
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "15": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u04-s15-d",
                                    "kind": "listening",
                                    "prompt": "D. Listen to your teacher narrating his preferences... E. Write a 30 - 50 word text...",
                                    "responseMode": "teacher-listening",
                                    "reviewStatus": "blocked-awaiting-transcript",
                                    "sourceEvidence": [d_prompt],
                                    "blocker": "No original clip is available.",
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [15]]
        teacher_note = next(row for row in generated if row["data"]["type"] == "teacher_notes")
        recording = next(row for row in generated if row["data"]["type"] == "recording")
        essay = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertTrue(teacher_note["data"]["hiddenFromLearners"])
        self.assertEqual(recording["data"]["instruction"], d_prompt)
        self.assertEqual(essay["data"]["prompt"], e_prompt)
        self.assertTrue(recording["data"]["aiGrading"])
        self.assertTrue(essay["data"]["aiGrading"])
        self.assertEqual((essay["data"]["minWords"], essay["data"]["maxWords"]), (30, 50))
        self.assertFalse(any(row["data"]["type"] == "audio" for row in generated))
        self.assertFalse(any(blocker["code"] == "exercise-review-listening-blocked" for blocker in plan["blockers"]))

    def test_reviewed_reading_context_is_visible_before_extraction_activity(self) -> None:
        source = source_fixture()
        passage = (
            "Survivors! 2 years ago, my family and I went to Thailand for spending our holidays. "
            "We were having a good time and the city was giving us all what we expected. "
            "When we arrived, we were having problems to find the hotel, but a woman helped us and we got safe. "
            "The days were passing by while we were having the greatest time of our lives; we had the chance to try traditional food when we were visiting local markets. "
            "On the fifth day, we were having a great time at the beach when suddenly an alarm sounded…it was announcing that a tsunami was approaching. "
            "Everybody was running while we were trying to stay together in the middle of the terrible moment."
        )
        instruction = "C. Read the following paragraph and extract the sentences to put them under the corresponding function."
        slide = {
            "number": 13,
            "title": "Survivors!",
            "visibleTexts": [
                passage,
                instruction,
                "Actions happening in the past. / Actions happening in the past interrupted by another one. Actions happening simultaneously in the past.",
            ],
        }
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        review = {
            "courseId": COURSE_ID,
            "lessons": {
                LESSON_ID: {
                    "sourceUrl": source["sourceUrl"],
                    "slides": {
                        "13": {
                            "source": copy.deepcopy(slide),
                            "items": [
                                {
                                    "id": "u16-s13-c",
                                    "kind": "reading-function-extraction",
                                    "prompt": "Extract the sentences under the three past-action functions.",
                                    "responseMode": "teacher-reviewed-extraction",
                                    "reviewStatus": "reviewed",
                                    "answerItems": [{"id": "past", "acceptedSourceQuotes": ["we were having a good time"]}],
                                    "sourceEvidence": ["we were having a good time"],
                                }
                            ],
                        }
                    },
                }
            },
        }

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source, exercise_review=review)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [13]]
        reading = next(row for row in generated if row["data"]["type"] == "text")
        activity = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertIn("Survivors! 2 years ago", reading["data"]["content"])
        self.assertIn("tsunami was approaching", reading["data"]["content"])
        self.assertLess(reading["order"], activity["order"])

    def test_flattened_published_charts_remain_visible_source_text_without_vocab_fragments(self) -> None:
        source = source_fixture()
        chart = (
            "Grammar Examples Observation 1 Preferences + Non-finite clause I need someone to build a life with. "
            "Any woman needs a good guy devoted to share his life with her. Being ethical and committed, Paul wishes to get the same from his employees. "
            "Non-finite clauses are built from: -Infinitive Clauses -Past participle Clauses -ing Clauses "
            "2 Preferences + Relative clause Josh would love a company that can value his talent. "
            "Mary fancies a car where she can fit all her friends. I’m desperate for a partner who can meet my professional standards. "
            "Relative clauses need to respect their principles even here."
        )
        slide = {
            "number": 8,
            "title": chart,
            "visibleTexts": [chart, "Preference can have an extended meaning if we use the more complex grammar points to regular ones."],
        }
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [8]]
        text = next(row for row in generated if row["data"]["type"] == "text")
        self.assertIn("Non-finite clauses are built from", text["data"]["content"])
        self.assertIn("-Infinitive Clauses", text["data"]["content"])
        self.assertIn("Relative clauses need to respect", text["data"]["content"])
        self.assertFalse(any(row["data"]["type"] == "vocabulary" for row in generated))
        self.assertFalse(any(row["data"]["type"] == "teacher_notes" and row["data"].get("hiddenFromLearners") for row in generated))

    def test_chart_example_word_does_not_hide_the_published_phrase_matrix(self) -> None:
        source = source_fixture()
        chart = (
            "PHRASES MEANING EXAMPLE ONCE IN A BLUE MOON Something that is rare. "
            "Events that are not as common as some others Once in a blue moon, Pete gets good grades. "
            "HUNKY DORY It may be understood as something out of this world or wicked The presentations was pretty hunky dory, congrats!"
        )
        slide = {"number": 6, "title": chart, "visibleTexts": [chart, "Look at the phrases and discuss them with your teacher. Did you know them?"]}
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [6]]
        visible = next(row for row in generated if row["data"]["type"] == "text" and not row["data"].get("hiddenFromLearners"))
        self.assertIn("ONCE IN A BLUE MOON", visible["data"]["content"])
        self.assertIn("HUNKY DORY", visible["data"]["content"])

    def test_standalone_conversation_d_and_e_prompts_keep_authored_recording_text(self) -> None:
        source = source_fixture()
        d_prompt = (
            "D. Read the following sentences and organize the conversation by numbering the interventions. "
            "After that, act out the conversation with your teacher."
        )
        e_prompt = (
            "E. Read the following directions in order to improvise a conversation with your teacher. "
            "Imagine you are applying for the administrative sales assistant position in a big company and you are already in the interview: "
            "Introduce yourself; answer your teacher questions; talk about your experience; say thanks when you get the job."
        )
        source["deck"]["slides"] = [
            {"number": 16, "title": "Interview dialogue", "visibleTexts": ["A: Welcome.", d_prompt]},
            {"number": 17, "title": e_prompt, "visibleTexts": [e_prompt, "Let’s Talk"]},
        ]
        source["deck"]["slideCount"] = 2

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") in ([16], [17])]
        recordings = {
            row["data"]["instruction"]
            for row in generated
            if row["data"]["type"] == "recording"
        }
        self.assertIn(d_prompt, recordings)
        self.assertIn(e_prompt, recordings)
        self.assertFalse(any("Organize the interview interventions" in instruction for instruction in recordings if instruction != d_prompt))

    def test_audio_manifest_with_wrong_lesson_or_slide_is_not_attached(self) -> None:
        source = source_fixture()
        source["deck"]["slides"][5].pop("media")
        manifest = {
            "entries": [
                {
                    "lessonId": "another-lesson",
                    "slideNumber": 6,
                    "originalMediaUrl": "https://audio.example/wrong.mp3",
                    "sha256": "wrong-digest",
                    "transcript": "Wrong lesson transcript.",
                }
            ]
        }
        lesson = snapshot_fixture()["modules"][0]["lessons"][0]
        plan = builder.build_plan(lesson, source, manifest)

        self.assertFalse(plan["publishable"])
        self.assertTrue(any(blocker["code"] == "audio-media-missing" and blocker["slide"] == 6 for blocker in plan["blockers"]))
        self.assertFalse(any(row["data"].get("type") == "audio" for row in plan["nextRows"]))

    def test_unit3_c_conversation_and_d_writing_keep_their_authored_labels(self) -> None:
        source = source_fixture()
        c_prompt = (
            "C. Improvise a conversation with your teacher. Ask and answer questions about daily routine. "
            "Do not forget to include all the aspects studied."
        )
        d_prompt = (
            "D. Write a 30 - 50 word paragraph stating the daily routine of someone you know. "
            "Include as many details as possible, do not forget to use the language studied in this lesson."
        )
        source["deck"]["slides"] = [
            {"number": 15, "title": c_prompt, "visibleTexts": [c_prompt, "Let’s Talk", d_prompt, "Let’s Write"]}
        ]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        generated = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [15]]
        recording = next(row for row in generated if row["data"]["type"] == "recording")
        essay = next(row for row in generated if row["data"]["type"] == "essay")
        self.assertEqual(recording["data"]["instruction"], c_prompt)
        self.assertEqual(essay["data"]["prompt"], d_prompt)
        self.assertFalse(
            any(
                row["data"]["type"] == "text" and d_prompt in row["data"].get("content", "")
                for row in generated
            )
        )

    def test_reviewed_context_keeps_unit3_sentences_unit6_dialogue_and_unit34_example_visible(self) -> None:
        cases = [
            (
                14,
                "Daily routine questions",
                [
                    "1. Alex and Jane normally stay at home on Friday nights because it relaxes them. 2. I never go to the stadiums during season by car because it is dangerous. 3. Nathan administrates a restaurant in the mornings because he studies at nights in the south of the city.",
                    "B. Check the following sentences and identify the possible interrogative words you can ask. After that, write the questions down.",
                ],
                "Identify possible interrogative words and write the questions.",
                "1. Alex and Jane normally stay at home",
            ),
            (
                16,
                "Interview dialogue",
                [
                    "__A: Excuse me, My name is Aida, I am here for the interview. __A: Yes! At 9 o'clock. __A: Wow, sir! Yes! I will be here on Monday. Thanks. ----------- Aida enters the office ---------------- __C: Have a sit, miss. I’m Mr. Jenkins, The CEO of the company. __A: Thanks, sir. My name is Aida and I am here for the post of administrative assistant. __B: Hello! Do you have an appointment with Mr. Jenkins? __C: I see. I will ask you some questions. What is your experience as assistant? __A: I work as an assistant now in a small gas company, but I want to change job to grow professionally. __B: Take a sit. Mr. Jenkins will see you in a minute. __C: Magnificent! The company here is bigger but I think you can manage the job. How about starting on Monday? __A: Well, I check mails and send them, I organize meetings and have materials and presentations ready for my boss and I represent the company in different events. __C: I understand. Tell me, Aida, as an assistant, What do you do?",
                    "D. Read the following sentences and organize the conversation by numbering the interventions. After that, act out the conversation with your teacher.",
                ],
                "D. Read the following sentences and organize the conversation by numbering the interventions. After that, act out the conversation with your teacher.",
                "__A: Excuse me, My name is Aida",
            ),
            (
                13,
                "Evolution",
                [
                    "A. Describe how 5 different objects, gadgets, events, movements etc. have evolved in time. Follow the example.",
                    "B. Listen to the audio and answer the questions your teacher makes. Take notes if necessary.",
                    "0. Back in the 90s, cell phones were a great gadget even when they were huge and heavy. Nowadays, we have small, light smart phones with internet, so one may wonder what cell phones will be like in 10 years.",
                ],
                "Describe five objects, gadgets or events across time.",
                "Back in the 90s, cell phones were a great gadget",
            ),
        ]

        for number, title, visible_texts, review_prompt, expected in cases:
            source = source_fixture()
            slide = {"number": number, "title": title, "visibleTexts": visible_texts}
            source["deck"]["slides"] = [slide]
            source["deck"]["slideCount"] = 1
            blockers: list[dict] = []
            specs = builder._native_block_specs(
                source,
                slide,
                LESSON_ID,
                builder._source_digest(source),
                None,
                [
                    {
                        "id": f"context-{number}",
                        "kind": "open-writing",
                        "prompt": review_prompt,
                        "reviewStatus": "open-response-preserved",
                        "sourceEvidence": [review_prompt],
                    }
                ],
                None,
                blockers,
            )
            rendered = "\n".join(payload.get("content", "") for native_type, payload in specs if native_type == "text")
            self.assertIn(expected, rendered, msg=f"source context missing on slide {number}")

    def test_reading_passage_keeps_after_that_prose_and_dialogue_opening(self) -> None:
        passage = (
            "What a place! Two years ago, we visited one of the most amazing places of the world. "
            "We went to Japan. After that, we traveled by train to Odaiba; the trip was marvelous and it was super fast. "
            "When we arrived there, we looked for a hotel and we decided to stay in a typical Japanese inn that we found downtown. "
            "We tried the traditional Ramen and the original sushi, IT WAS AMAZING! After 3 days, we flew back home."
        )
        dialogue = (
            "__A: Excuse me, My name is Aida, I am here for the interview. __C: Have a sit, miss. I’m Mr. Jenkins, "
            "The CEO of the company. __C: I see. I will ask you some questions. What is your experience as assistant? "
            "__A: I work as an assistant now in a small gas company, but I want to change job to grow professionally."
        )
        self.assertEqual(
            builder._reading_passage_texts(
                {"title": passage, "visibleTexts": [passage, "C. Read the following paragraph and state if the sentences are true."]},
                [passage, "C. Read the following paragraph and state if the sentences are true."],
            ),
            [passage],
        )
        self.assertEqual(
            builder._reading_passage_texts(
                {"title": dialogue, "visibleTexts": [dialogue, "D. Read the following sentences and act out the conversation."]},
                [dialogue, "D. Read the following sentences and act out the conversation."],
            ),
            [dialogue],
        )

    def test_native_fragments_do_not_duplicate_published_unit45_continuation(self) -> None:
        published = (
            "When the alarm was finally raised the crew acted very quickly but it was already too late to save the ship. "
            "Within twenty minutes of the collision the ship had flooded, so the passengers were told to use the lifeboats. "
            "Many people were still waiting for instructions when the last signal was heard."
        )
        slide = {
            "number": 15,
            "title": "15",
            "visibleTexts": [published],
            "_nativeAudit": {
                "paragraphs": [
                    "When the alarm was finally raised the crew acted very quickly but it was already too late to save the ship.",
                    "Within twenty minutes of the collision the ship had flooded, so the passengers were told to use the lifeboats.",
                    "Many people were still waiting for instructions when the last signal was heard.",
                ]
            },
        }
        context = builder._learner_context_texts(slide, [], published)
        self.assertEqual(context, [published])

        source = source_fixture()
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        blockers: list[dict] = []
        specs = builder._native_block_specs(
            source,
            slide,
            LESSON_ID,
            builder._source_digest(source),
            None,
            [],
            None,
            blockers,
        )
        text_specs = [payload for native_type, payload in specs if native_type == "text"]
        self.assertEqual(len(text_specs), 1)
        self.assertEqual(text_specs[0]["content"].count("When the alarm"), 1)

    def test_combined_review_placeholder_keeps_one_source_control_per_final_prompt(self) -> None:
        source = source_fixture()
        d_prompt = (
            "D. Based on the topic presented in the reading section, what other event in the world do you think "
            "would have been prevented if the right people had acted on time? Use the language studied."
        )
        e_prompt = (
            "E. Write an 160-200 word text about a bad choice you made and what would have happened if you had not done it. "
            "How would have your life turned out if you had chosen something differently?"
        )
        slide = {"number": 16, "title": d_prompt, "visibleTexts": [d_prompt, e_prompt, "Let’s Talk", "Let’s Write"]}
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        review_items = [
            {
                "id": "combined-final",
                "kind": "open-production",
                "prompt": f"{d_prompt}\n{e_prompt}\nLet’s Talk\nLet’s Write",
                "reviewStatus": "open-response-preserved",
                "sourceEvidence": [d_prompt, e_prompt],
            }
        ]
        blockers: list[dict] = []
        specs = builder._native_block_specs(
            source,
            slide,
            LESSON_ID,
            builder._source_digest(source),
            None,
            review_items,
            None,
            blockers,
        )
        self.assertEqual([native_type for native_type, _payload in specs], ["recording", "essay"])
        self.assertEqual(specs[0][1]["instruction"], d_prompt)
        self.assertEqual(specs[1][1]["prompt"], e_prompt)
        self.assertFalse(any(native_type == "text" for native_type, _payload in specs))

    def test_reviewed_listening_replacement_keeps_authored_example_without_old_prompt(self) -> None:
        source = source_fixture(complete_audio=True)
        slide = {
            "number": 13,
            "title": "A. Describe how objects have evolved.",
            "visibleTexts": [
                "A. Describe how objects have evolved.",
                "B. Listen to the audio and answer the questions your teacher makes. Take notes if necessary.",
                "1. The man is in a train station. (T) (F) 2. He is from Venezuela. (T) (F)",
                "0. Back in the 90s, cell phones were a great gadget even when they were huge and heavy. Nowadays, we have small, light smart phones with internet.",
            ],
            "media": [
                {
                    "kind": "audio",
                    "audioIndex": 1,
                    "url": "https://cdn.example/lesson/audio-6.mp3",
                    "publicHref": "/audio/lessons/course/unit-34-audio-01.mp3",
                    "digest": "audio-sha256-fixture",
                    "transcript": "Cell phones changed over time.",
                }
            ],
        }
        source["deck"]["slides"] = [slide]
        source["deck"]["slideCount"] = 1
        listening_review = {
            "audioIndex": 1,
            "sourceAudioSha256": "audio-sha256-fixture",
            "reviewStatus": "reviewed",
            "items": [
                {
                    "id": "q1",
                    "prompt": "What changed?",
                    "reviewStatus": "reviewed",
                    "explicitOptions": ["Size", "Color", "Name", "Place"],
                    "answerItems": [{"canonical": "Size", "evidence": "Cell phones changed over time."}],
                }
            ],
        }
        blockers: list[dict] = []
        specs = builder._native_block_specs(
            source,
            slide,
            LESSON_ID,
            builder._source_digest(source),
            None,
            None,
            listening_review,
            blockers,
        )
        text = "\n".join(payload.get("content", "") for native_type, payload in specs if native_type == "text")
        self.assertIn("Back in the 90s", text)
        self.assertNotIn("Listen to the audio and answer", text)
        self.assertNotIn("The man is in a train station", text)
        self.assertEqual([native_type for native_type, _payload in specs if native_type == "multiple_choice"], ["multiple_choice"])

    def test_flattened_unit37_chart_without_verified_table_stays_complete_source_text(self) -> None:
        source = source_fixture()
        chart = (
            "Grammar Examples Observation 1 Preferences + Non-finite clause I need someone to build a life with. "
            "Any woman needs a good guy devoted to share his life with her. Being ethical and committed, Paul wishes to get the same from his employees. "
            "Non-finite clauses are built from: -Infinitive Clauses -Past participle Clauses -ing Clauses "
            "2 Preferences + Relative clause Josh would love a company that can value his talent."
        )
        source["deck"]["slides"] = [{"number": 8, "title": chart, "visibleTexts": [chart]}]
        source["deck"]["slideCount"] = 1

        plan = builder.build_plan(snapshot_fixture()["modules"][0]["lessons"][0], source)

        rows = [row for row in plan["nextRows"] if row["data"].get("data", {}).get("sourceSlides") == [8]]
        text = next(row for row in rows if row["data"]["type"] == "text")
        self.assertIn("Non-finite clauses are built from", text["data"]["content"])
        self.assertIn("Relative clause", text["data"]["content"])
        self.assertFalse(any(row["data"]["type"] == "structured-content" for row in rows))


if __name__ == "__main__":
    unittest.main()
