#!/usr/bin/env python3
"""Build a content-only exercise semantics review from published lesson sources.

The review is keyed by lesson id and published slide number.  It preserves the
source prompt and visible text, adds explicit answer items only where the
published material makes the answer deterministic, and leaves listening and
open production activities available for teacher review.  No database or
published deck is modified.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Mapping, Sequence


DEFAULT_MANIFEST = Path("docs/audit/course-source-manifest.json")
DEFAULT_OUTPUT = Path("docs/audit/course-exercise-review.json")

STARTS = {1: 1, 2: 5, 3: 8, 4: 13, 5: 17, 6: 21, 7: 25, 8: 29, 9: 33, 10: 37, 11: 41, 12: 45, 13: 49, 14: 53}
TERMINAL_RE = re.compile(r"(?:^|\b)(?:congrats|copyright|worldwide language community)(?:\b|$)", re.IGNORECASE)
LISTENING_RE = re.compile(
    r"(?:^|\n)\s*(?:[A-E]\.\s*)?(?:listen(?:ing|ed)?\b|audio\b|teacher(?:'s)? questions\b)"
    r"|\blook at .*\blisten to (?:your )?teacher\b",
    re.IGNORECASE,
)
OPEN_RE = re.compile(
    r"\b(?:write|talk|tell your teacher|discuss|discussion|conversation|act out|improvise|presentation|describe|create|make \d+ sentences|state \d+|pretend|practice reading aloud)\b",
    re.IGNORECASE,
)
GRAMMAR_RE = re.compile(
    r"\b(?:fill|complete|change .*question|change .*form|correct|reported speech|passive voice|tag questions|missing phrase|organize|identify .*ending)\b",
    re.IGNORECASE,
)
EXTRACTION_RE = re.compile(r"\b(?:extract|identify where|take out sentences|locate .*category|corresponding category)\b", re.IGNORECASE)


def _unit_for(source: Mapping[str, Any]) -> int:
    module = int(source["module"]["order"])
    lesson = int(source["lesson"]["order"])
    return STARTS[module] + lesson - 1


def _text(slide: Mapping[str, Any]) -> str:
    return "\n".join(str(value) for value in slide.get("visibleTexts", []) if value).strip()


def _item(
    item_id: str,
    prompt: str,
    *,
    kind: str,
    response_mode: str = "typed-short-answer",
    answer_items: Sequence[Mapping[str, Any]] = (),
    source_evidence: Sequence[str] = (),
    rationale: str = "",
    builder_hints: Mapping[str, Any] | None = None,
    status: str = "reviewed",
    **extra: Any,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": item_id,
        "kind": kind,
        "prompt": prompt,
        "responseMode": response_mode,
        "reviewStatus": status,
        "answerItems": [dict(value) for value in answer_items],
        "sourceEvidence": list(source_evidence),
    }
    if rationale:
        result["rationale"] = rationale
    if builder_hints:
        result["builderHints"] = dict(builder_hints)
    result.update(extra)
    return result


def _true_false(
    item_id: str,
    prompt: str,
    value: bool,
    evidence: str,
    rationale: str,
) -> dict[str, Any]:
    options = [
        {"id": "true", "text": "T", "isCorrect": value},
        {"id": "false", "text": "F", "isCorrect": not value},
    ]
    return _item(
        item_id,
        prompt,
        kind="reading-true-false",
        response_mode="multiple-choice",
        answer_items=[
            {
                "id": "answer",
                "canonical": "T" if value else "F",
                "accepted": ["T" if value else "F", "true" if value else "false"],
                "evidence": evidence,
            }
        ],
        source_evidence=[evidence],
        rationale=rationale,
        builder_hints={"_explicit_options": options, "_explicit_answer_key": "true" if value else "false"},
    )


def _short(
    item_id: str,
    prompt: str,
    canonical: str,
    accepted: Sequence[str],
    evidence: str,
    rationale: str,
    *,
    kind: str = "reading-comprehension",
) -> dict[str, Any]:
    return _item(
        item_id,
        prompt,
        kind=kind,
        answer_items=[
            {
                "id": "answer",
                "canonical": canonical,
                "accepted": list(accepted),
                "evidence": evidence,
            }
        ],
        source_evidence=[evidence],
        rationale=rationale,
        builder_hints={"_explicit_answer_key": canonical},
    )


def _transform(
    item_id: str,
    prompt: str,
    fields: Sequence[Mapping[str, Any]],
    evidence: str,
    rationale: str,
) -> dict[str, Any]:
    return _item(
        item_id,
        prompt,
        kind="grammar-transform",
        answer_items=fields,
        source_evidence=[evidence],
        rationale=rationale,
        builder_hints={"_explicit_answer_key": list(fields)},
    )


def _listening(item_id: str, prompt: str, evidence: str) -> dict[str, Any]:
    return _item(
        item_id,
        prompt,
        kind="listening",
        response_mode="teacher-listening",
        source_evidence=[evidence],
        status="blocked-awaiting-transcript",
        blocker="Published source exposes an audio icon or teacher-made questions but no transcript or deterministic answer key.",
        doNotAutoGrade=True,
    )


def _open(item_id: str, prompt: str, evidence: str, *, kind: str = "open-production", constraints: Sequence[str] = ()) -> dict[str, Any]:
    return _item(
        item_id,
        prompt,
        kind=kind,
        response_mode="open-response",
        source_evidence=[evidence],
        status="open-response-preserved",
        doNotAutoGrade=True,
        constraints=list(constraints),
    )


def _extraction(
    item_id: str,
    prompt: str,
    categories: Mapping[str, Sequence[str]],
    evidence: str,
    rationale: str,
    **extra: Any,
) -> dict[str, Any]:
    answer_items = [
        {"id": category, "category": category, "acceptedSourceQuotes": list(quotes), "evidence": evidence}
        for category, quotes in categories.items()
    ]
    return _item(
        item_id,
        prompt,
        kind="reading-function-extraction",
        response_mode="teacher-reviewed-extraction",
        answer_items=answer_items,
        source_evidence=[evidence],
        rationale=rationale,
        gradingNote="Accept equivalent excerpts that preserve the same function; do not auto-grade by exact punctuation.",
        **extra,
    )


# Manual keys are deliberately source-local.  Any exercise omitted here is
# still emitted with a review status by _default_review and must not be
# silently converted into a closed question.
MANUAL: dict[tuple[int, int], list[dict[str, Any]]] = {}


def _set(unit: int, slide: int, *items: Mapping[str, Any]) -> None:
    MANUAL[(unit, slide)] = [dict(item) for item in items]


def _seed_manual_reviews() -> None:
    # Units 2–5: first-pass authoritative keys.
    _set(2, 4, _listening("u02-s04-b", "B. Listen to the audio and discuss with your teacher: what is the topic? Are there phrases you know? Write them in the chat box.", "B. Listen to the audio and discuss with your teacher: what is the topic? Are there phrases you know? Write them in the chat box."))
    _set(
        2,
        12,
        _transform("u02-s12-a1", "Jared comes from Morocco.", [
            {"id": "interrogative", "canonical": "Does Jared come from Morocco?", "accepted": ["Does Jared come from Morocco?"], "evidence": "Jared comes from Morocco."},
            {"id": "negative", "canonical": "Jared does not come from Morocco.", "accepted": ["Jared does not come from Morocco.", "Jared doesn't come from Morocco."], "evidence": "Jared comes from Morocco."},
        ], "Jared comes from Morocco.", "Come from is an ordinary present-tense verb phrase, so do-support carries the question and negative.") ,
        _transform("u02-s12-a2", "The Jenkins speak Mandarin.", [
            {"id": "interrogative", "canonical": "Do the Jenkins speak Mandarin?", "accepted": ["Do the Jenkins speak Mandarin?"], "evidence": "The Jenkins speak Mandarin."},
            {"id": "negative", "canonical": "The Jenkins do not speak Mandarin.", "accepted": ["The Jenkins do not speak Mandarin.", "The Jenkins don't speak Mandarin."], "evidence": "The Jenkins speak Mandarin."},
        ], "The Jenkins speak Mandarin.", "Speak is an ordinary present-tense verb with a plural subject, so use do and the base verb."),
        _transform("u02-s12-a3", "We are Chinese.", [
            {"id": "interrogative", "canonical": "Are we Chinese?", "accepted": ["Are we Chinese?"], "evidence": "We are Chinese."},
            {"id": "negative", "canonical": "We are not Chinese.", "accepted": ["We are not Chinese.", "We aren't Chinese."], "evidence": "We are Chinese."},
        ], "We are Chinese.", "The verb to be inverts directly and takes not without do-support."),
        _transform("u02-s12-a4", "I am Venezuelan.", [
            {"id": "interrogative", "canonical": "Am I Venezuelan?", "accepted": ["Am I Venezuelan?"], "evidence": "I am Venezuelan."},
            {"id": "negative", "canonical": "I am not Venezuelan.", "accepted": ["I am not Venezuelan.", "I'm not Venezuelan."], "evidence": "I am Venezuelan."},
        ], "I am Venezuelan.", "The verb to be inverts directly and takes not without do-support."),
        _open("u02-s12-open", "Create four new sentences with questions and negative statements.", "After item 4: create four new sentences with questions and negative statements.", kind="grammar-production", constraints=["Use the lesson's to-be versus ordinary-verb distinction."]),
    )
    _set(
        2,
        13,
        _listening("u02-s13-b", "B. Listen to the audio. After that state if the sentences are true or false.", "B. Listen to the audio. After that state if the sentences are true or false."),
    )
    _set(
        2,
        14,
        _short("u02-s14-q1", "What is her name?", "Jenny", ["Jenny"], "Jenny is from USA, so she is American.", "The reading names the subject Jenny."),
        _short("u02-s14-q2", "Where is she from?", "the USA", ["the USA", "USA", "United States", "the United States"], "Jenny is from USA, so she is American.", "The reading explicitly states Jenny's country of origin."),
        _short("u02-s14-q3", "Where was she born?", "San Antonio, Texas", ["San Antonio, Texas", "San Antonio Texas"], "She was born in San Antonio, Texas.", "The birthplace is stated verbatim."),
        _short("u02-s14-q4", "What is her parents’ nationality?", "Mexican", ["Mexican", "Mexicans"], "Her parents are Mexican.", "The reading directly identifies the parents' nationality."),
        _short("u02-s14-q5", "Where do they come from?", "Monterrey", ["Monterrey"], "They come from Monterrey.", "The parents' origin is stated directly."),
        _short("u02-s14-q6", "Does she speak English and Spanish?", "Yes, she speaks English and Spanish.", ["Yes", "Yes, she does", "Yes, she speaks English and Spanish"], "Jenny speaks English but she speaks Spanish too.", "The paragraph explicitly confirms both languages."),
        _short("u02-s14-q7", "Where does Takaishi come from?", "Japan", ["Japan"], "Takaishi is American too but his parents are from Japan.", "The source attributes Japan to Takaishi's parents; no other origin is stated.", kind="reading-comprehension-with-source-qualification"),
        _short("u02-s14-q8", "Are his parents American?", "No, his parents are from Japan.", ["No", "No, they are from Japan", "No, his parents are Japanese"], "His parents are from Japan.", "The source contrasts Takaishi being American with his parents being from Japan."),
    )
    _set(2, 15, _open("u02-s15-d", "Act out the new-student situation with your teacher.", "D. Act out the following situation with your teacher...", kind="roleplay", constraints=["Introduce personal information and origins; ask and answer questions."]))
    _set(2, 16, _open("u02-s16-e", "Write a 30–50 word paragraph about your origins and your family’s origins.", "E. Write a 30 - 50 word paragraph...", kind="writing", constraints=["30–50 words", "Use the lesson's origins, nationality and simple-present structures."]))

    _set(3, 4, _listening("u03-s04-b", "B. Listen to the audio and tell your teacher the activities the man makes.", "B. Listen to the audio and tell your teacher the activities the man makes."))
    _set(3, 13,
        _true_false("u03-s13-q1", "Tom never wakes up at 6 AM.", True, "Tom wakes up at 5 AM every day.", "The stated daily wake-up time supports the exercise's intended contrast with 6 AM."),
        _true_false("u03-s13-q2", "He has breakfast first.", False, "He takes a shower and after that, he has breakfast.", "Breakfast follows the shower."),
        _true_false("u03-s13-q3", "He starts work at 7 AM.", False, "At 7:30 AM, he goes out to go to work and he arrives to his job at 8:00 AM.", "The text gives 7:30 AM as departure and 8:00 AM as arrival."),
        _true_false("u03-s13-q4", "He is usually at court.", True, "He is sometimes in the office but he is usually at the supreme court.", "The frequency adverb usually directly supports the statement."),
        _true_false("u03-s13-q5", "He is normally at home at 8 PM.", True, "He normally gets home at 8:00 PM.", "The text states the same time and adverb."),
    )
    _set(3, 14, _open("u03-s14-b", "Identify possible interrogative words for the three sentences and write the questions.", "B. Check the following sentences and identify the possible interrogative words you can ask.", kind="grammar-production", constraints=["Multiple questions are valid; preserve the given sentence facts.", "Sentence 1 supports who/where/when/why; sentence 2 supports who/where/when/how/why; sentence 3 supports who/what/when/where/why."]))
    _set(3, 15, _open("u03-s15-c", "Improvise a daily-routine conversation and write a 30–50 word paragraph.", "C. Improvise a conversation... D. Write a 30 - 50 word paragraph...", kind="roleplay-and-writing", constraints=["Include general actions, specific actions and time-specific activities."]))

    _set(4, 4, _open("u04-s04-a", "Look at the pictures. What can you see and what are they suggesting?", "A. Look at the pictures. What can you see? What are they suggesting? Write your answers in the chat box.", kind="open-observation"),
        _listening("u04-s05-b", "B. Listen to the audio and answer the questions your teacher makes.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(4, 13,
        _listening("u04-s13-a", "A. Listen to the audio and extract information about likes and preferences.", "A. Listen to the audio and extract the information about likes and preferences."),
        _item("u04-s13-b", "Place the six preference statements under high, medium or low likeness.", kind="classification", response_mode="teacher-reviewed-classification", answer_items=[
            {"id": "high", "category": "HIGH LEVEL", "accepted": ["I love taking pictures.", "I am crazy about her."], "evidence": "The lesson labels love and thrilled/crazy about as high-level preference expressions."},
            {"id": "medium", "category": "MEDIUM LEVEL", "accepted": ["I am fond of soccer.", "I am a fan of hiking mountains."], "evidence": "The lesson's preference chart places fond of and a fan of between love/crazy about and like."},
            {"id": "low", "category": "LOW LEVEL", "accepted": ["I like eating ice cream.", "I like playing chess."], "evidence": "The lesson uses like as the low-level preference example."},
        ], source_evidence=["I am fond of soccer. I love taking pictures. I like eating ice cream. I am a fan of hiking mountains. I like playing chess. I am crazy about her."], rationale="Classify by the preference-degree vocabulary taught in the language-target chart."),
    )
    _set(4, 14,
        _true_false("u04-s14-q1", "Joe likes taking care of animals.", True, "He loves taking care of animals and plants.", "Love entails the stated positive preference."),
        _true_false("u04-s14-q2", "Joe doesn’t have a dog called Archie.", True, "He has a dog called Chester.", "The only dog named is Chester, so Archie is contradicted."),
        _true_false("u04-s14-q3", "Joe enjoys spending time with Chester.", True, "Joe enjoys spending time with Chester.", "The statement is verbatim."),
        _true_false("u04-s14-q4", "They like going swimming on Sundays.", False, "They like going fishing on Sundays.", "The activity is fishing, not swimming."),
        _true_false("u04-s14-q5", "Joe is a fan of riding horses.", True, "Joe is a fan of riding horses.", "The statement is verbatim."),
        _true_false("u04-s14-q6", "He likes cooking only for him.", False, "He dislikes cooking only for him.", "The source gives the opposite preference."),
        _true_false("u04-s14-q7", "He is thrilled about camping.", True, "He’s crazy about camping.", "Crazy about is the source's high-preference expression and is taught as equivalent in the lesson."),
        _true_false("u04-s14-q8", "Joe and Chester go camping once a month.", False, "He and Chester go camping twice a month.", "The source states twice a month."),
    )
    _set(4, 15, _listening("u04-s15-d", "D. Listen to your teacher and then tell him about your preferences; E. write about a friend’s preferences.", "D. Listen to your teacher narrating his preferences... E. Write a 30 - 50 word text..."))

    _set(5, 4, _listening("u05-s04-b", "B. Listen to the audio and discuss family details with your teacher.", "B. Listen to the audio and discuss with your teacher: What are they talking about? Can you get some details?"))
    _set(5, 13, _open("u05-s13-a", "Answer the family questions using your own information and create your own questions.", "A. Read the following questions and answer using your own information.", kind="personalized-short-answer", constraints=["Answers depend on the learner; do not auto-grade."]))
    _set(5, 14, _listening("u05-s14-b", "B. Listen to David talking about his family and classify details.", "B. Listen to David talking about his family. What information he says that suits the different aspects?"))
    _set(5, 15,
        _true_false("u05-s15-q1", "His name is Kite.", False, "My name is Khai.", "The name in the reading is Khai."),
        _true_false("u05-s15-q2", "He has a small family.", False, "I have a big family.", "The reading explicitly says big family."),
        _true_false("u05-s15-q3", "His parents have six children.", True, "My parents have six children, three sons and three daughters.", "The statement is verbatim."),
        _true_false("u05-s15-q4", "He has four siblings.", False, "My parents have six children... I am the oldest.", "Six children total means five siblings for Khai."),
        _true_false("u05-s15-q5", "He is the oldest son.", True, "I am the oldest.", "Khai identifies himself as the oldest; the reading also identifies three sons."),
        _true_false("u05-s15-q6", "Shinmei is Khai’s mother.", False, "My sister Shinmei is the second one.", "Shinmei is explicitly his sister."),
        _true_false("u05-s15-q7", "Tenkei and Senku are Khai’s brothers.", True, "Our brothers’ names are Tenkei and Senku.", "The statement is verbatim."),
        _true_false("u05-s15-q8", "He has no relatives.", False, "On my mother’s side, we have two uncles, three aunts and eleven cousins.", "The source lists many relatives on his mother's side."),
    )
    _set(5, 16, _open("u05-s16-d", "Present a family tree and write a 50–80 word paragraph about someone else’s family.", "D. Talk about your family... E. Write a 50 - 80 word paragraph...", kind="roleplay-and-writing", constraints=["50–80 words for the writing task; include family relationships and members."]))


_seed_manual_reviews()


def _seed_more_manual_reviews() -> None:
    # Units 6–20: deterministic grammar transforms and reading checks.
    _set(6, 4, _listening("u06-s04-b", "B. Listen to the conversation and write phrases related to jobs and occupations.", "B. Listen to the conversation and write down the phrases related to jobs and occupations."))
    _set(6, 13,
        _transform("u06-s13-a1", "Pedro is an architect.", [
            {"id": "interrogative", "canonical": "Is Pedro an architect?", "accepted": ["Is Pedro an architect?"], "evidence": "Pedro is an architect."},
            {"id": "negative", "canonical": "Pedro is not an architect.", "accepted": ["Pedro is not an architect.", "Pedro isn't an architect."], "evidence": "Pedro is an architect."},
        ], "Pedro is an architect.", "To be inverts directly and takes not."),
        _transform("u06-s13-a2", "Maria administers a restaurant.", [
            {"id": "interrogative", "canonical": "Does Maria administer a restaurant?", "accepted": ["Does Maria administer a restaurant?"], "evidence": "Maria administers a restaurant."},
            {"id": "negative", "canonical": "Maria does not administer a restaurant.", "accepted": ["Maria does not administer a restaurant.", "Maria doesn't administer a restaurant."], "evidence": "Maria administers a restaurant."},
        ], "Maria administers a restaurant.", "A third-person ordinary verb takes does plus the base verb."),
        _transform("u06-s13-a3", "Eucaris works in a gas company.", [
            {"id": "interrogative", "canonical": "Does Eucaris work in a gas company?", "accepted": ["Does Eucaris work in a gas company?"], "evidence": "Eucaris works in a gas company."},
            {"id": "negative", "canonical": "Eucaris does not work in a gas company.", "accepted": ["Eucaris does not work in a gas company.", "Eucaris doesn't work in a gas company."], "evidence": "Eucaris works in a gas company."},
        ], "Eucaris works in a gas company.", "A third-person ordinary verb takes does plus the base verb."),
        _transform("u06-s13-a4", "Johannes and Jake are English teachers.", [
            {"id": "interrogative", "canonical": "Are Johannes and Jake English teachers?", "accepted": ["Are Johannes and Jake English teachers?"], "evidence": "Johannes and Jake are English teachers."},
            {"id": "negative", "canonical": "Johannes and Jake are not English teachers.", "accepted": ["Johannes and Jake are not English teachers.", "Johannes and Jake aren't English teachers."], "evidence": "Johannes and Jake are English teachers."},
        ], "Johannes and Jake are English teachers.", "The plural to-be form inverts directly and takes not."),
        _open("u06-s13-open", "Add your own sentences, questions and negative statements.", "Finally, add your own sentences, questions and negative statements in the spaces provided.", kind="grammar-production"),
    )
    _set(6, 14, _listening("u06-s14-b", "B. Listen to the audio and complete Julio’s profile.", "B. Listen to the audio and complete the text below."))
    _set(6, 15, _listening("u06-s15-c", "C. Listen to the audio and identify each inflectional ending.", "C. Listen to the audio with a list of words. Identify to which inflectional ending each word belongs."))
    _set(6, 16, _open("u06-s16-d", "Organize the interview interventions and act it out.", "D. Read the following sentences and organize the conversation by numbering the interventions.", kind="conversation-ordering", constraints=["The published accessibility order is not a reliable scrambled-layout order; retain the source dialogue and resolve ordering against the rendered slide before auto-grading."]))
    _set(6, 17, _open("u06-s17-e", "Improvise an administrative assistant interview.", "E. Read the following directions in order to improvise a conversation with your teacher.", kind="roleplay"))
    _set(6, 18, _open("u06-s18-f", "Write an 80–100 word personal and professional profile.", "F. Write a complete profile about you from 80 - 100 words...", kind="writing", constraints=["80–100 words."]))

    _set(7, 4, _listening("u07-s04-b", "B. Listen to the audio and discuss the food topic with your teacher.", "B. Listen to the audio and discuss with your teacher: What are they talking about? Can you get some details?"))
    _set(7, 14,
        _short("u07-s14-q1", "There are 2 bottles of coke at home.", "How many bottles of coke are there at home?", ["How many bottles of coke are there at home?"], "There are 2 bottles of coke at home.", "Countable plural quantity takes how many and there are."),
        _short("u07-s14-q2", "We have a bowl of salad in the fridge.", "How many bowls of salad are there in the fridge?", ["How many bowls of salad are there in the fridge?", "How much salad is there in the fridge?"], "We have a bowl of salad in the fridge.", "The source supports a countable container question and an uncountable-content variant."),
        _short("u07-s14-q3", "There is a turkey in the oven.", "Is there a turkey in the oven?", ["Is there a turkey in the oven?", "How many turkeys are there in the oven?"], "There is a turkey in the oven.", "The singular existence question is the direct transformation; a how-many variant is also grammatical."),
        _short("u07-s14-q4", "There are 2 packs of pasta in the cabinet.", "How many packs of pasta are there in the cabinet?", ["How many packs of pasta are there in the cabinet?"], "There are 2 packs of pasta in the cabinet.", "Countable plural quantity takes how many and there are."),
        _short("u07-s14-q5", "He has 2 fried eggs for breakfast.", "How many fried eggs does he have for breakfast?", ["How many fried eggs does he have for breakfast?"], "He has 2 fried eggs for breakfast.", "Countable plural quantity with have takes how many and does."),
        _open("u07-s14-open", "Create your own food sentences and questions.", "Finally, create your own sentences and questions in the space provided.", kind="grammar-production"),
    )
    _set(7, 15, _listening("u07-s15-b", "B. Listen to Nathan and Dave and answer teacher questions.", "B. Listen to Nathan and Dave talk about their food at home."))
    _set(7, 16,
        _true_false("u07-s16-q1", "She has a big family.", False, "My family is not that big.", "The reading explicitly says the family is not that big."),
        _true_false("u07-s16-q2", "There is not enough food for them.", False, "At home, there is always enough food for all of us.", "The text says there is always enough food."),
        _true_false("u07-s16-q3", "Weekly, they buy cheese, milk, eggs etc.", True, "There are certain products that we normally buy weekly, such as cheese, milk, eggs etc.", "The statement is supported verbatim."),
        _true_false("u07-s16-q4", "They always buy a lot of coffee.", False, "We do not get much coffee because my dad is the only one who drinks it.", "The text gives the opposite quantity."),
        _true_false("u07-s16-q5", "They don’t eat much fruit.", False, "We buy a lot of fruit.", "The text says a lot of fruit."),
        _true_false("u07-s16-q6", "They drink some soda.", False, "We do not take any soda.", "The text explicitly denies soda."),
        _true_false("u07-s16-q7", "Her mother gets only one box of cereal.", False, "My mother likes getting ... around two or three boxes of cereal.", "The quantity is two or three, not one."),
        _true_false("u07-s16-q8", "They never go together to the supermarket.", False, "We always go together to the supermarket.", "The text says always."),
    )
    _set(7, 17, _open("u07-s17-d", "Organize a party discussion and write an 80–100 word shopping-habits paragraph.", "D. Pretend you are organizing a party... E. Write a 80 - 100 word paragraph...", kind="roleplay-and-writing", constraints=["Use countable/uncountable quantities and quantifiers; 80–100 words for writing."]))

    _set(8, 4, _listening("u08-s04-b", "B. Listen to the audio and discuss belongings with your teacher.", "B. Listen to the audio and discuss with your teacher: What are they talking about? Can you get some details?"))
    _set(8, 12,
        _transform("u08-s12-a1", "That is Mary’s bag.", [
            {"id": "yes-no", "canonical": "Is that Mary’s bag?", "accepted": ["Is that Mary's bag?"], "evidence": "That is Mary’s bag."},
            {"id": "whose", "canonical": "Whose bag is that?", "accepted": ["Whose bag is that?"], "evidence": "That is Mary’s bag."},
        ], "That is Mary’s bag.", "Demonstratives invert with to be; whose asks for possession."),
        _transform("u08-s12-a2", "These are our books.", [
            {"id": "yes-no", "canonical": "Are these our books?", "accepted": ["Are these our books?"], "evidence": "These are our books."},
            {"id": "whose", "canonical": "Whose books are these?", "accepted": ["Whose books are these?"], "evidence": "These are our books."},
        ], "These are our books.", "Plural demonstratives invert with are; whose asks for possession."),
        _transform("u08-s12-a3", "This is my cell phone.", [
            {"id": "yes-no", "canonical": "Is this my cell phone?", "accepted": ["Is this my cell phone?"], "evidence": "This is my cell phone."},
            {"id": "whose", "canonical": "Whose cell phone is this?", "accepted": ["Whose cell phone is this?"], "evidence": "This is my cell phone."},
        ], "This is my cell phone.", "Singular demonstrative inversion and whose possession question follow the unit examples."),
        _transform("u08-s12-a4", "Those are Jeff’s glasses.", [
            {"id": "yes-no", "canonical": "Are those Jeff’s glasses?", "accepted": ["Are those Jeff's glasses?"], "evidence": "Those are Jeff’s glasses."},
            {"id": "whose", "canonical": "Whose glasses are those?", "accepted": ["Whose glasses are those?"], "evidence": "Those are Jeff’s glasses."},
        ], "Those are Jeff’s glasses.", "Plural demonstratives invert with are; whose asks for possession."),
        _transform("u08-s12-a5", "That is my room’s key.", [
            {"id": "yes-no", "canonical": "Is that my room’s key?", "accepted": ["Is that my room's key?"], "evidence": "That is my room’s key."},
            {"id": "whose", "canonical": "Whose key is that?", "accepted": ["Whose key is that?", "Whose room's key is that?"], "evidence": "That is my room’s key."},
        ], "That is my room’s key.", "The natural whose question asks for the key's owner; the source phrase permits a room modifier."),
        _open("u08-s12-open", "Add your own possession questions.", "Finally, add your own sentences and questions in the space provided.", kind="grammar-production"),
    )
    _set(8, 13, _listening("u08-s13-b", "B. Listen to Jake and Jim talking and answer the teacher’s questions.", "B. Listen to Jake and Jim talking. Answer the questions your teacher makes."))
    _set(8, 14,
        _true_false("u08-s14-q1", "David has some keys.", True, "Do you know whose keys are these?", "David is the speaker asking about the keys; the exercise treats the keys as the item he has/handles."),
        _true_false("u08-s14-q2", "The keys are Tom’s.", False, "I think these are Mary’s keys.", "The dialogue attributes the keys to Mary, with uncertainty."),
        _true_false("u08-s14-q3", "Mary’s department is C11.", False, "The girl from the B12 department.", "The department is B12."),
        _true_false("u08-s14-q4", "Tom is sure the keys are Mary’s.", False, "Not really, but I can ask her.", "Tom explicitly expresses uncertainty."),
        _true_false("u08-s14-q5", "Tom has David’s camera.", False, "WOW! That is my iPad.", "The object is an iPad, not a camera."),
        _true_false("u08-s14-q6", "The iPad is David’s.", True, "WOW! That is my iPad.", "David claims the iPad as his."),
        _true_false("u08-s14-q7", "Tom found the iPad.", False, "Joe’s kid found it.", "The dialogue attributes finding it to Joe's kid."),
        _true_false("u08-s14-q8", "Joe’s kid found the iPad.", True, "Joe’s kid found it.", "The statement is verbatim."),
    )
    _set(8, 15, _open("u08-s15-d", "Describe belongings and write an argument conversation.", "D. Pretend you and your teacher are in your house... E. Write a conversation about an argument.", kind="roleplay-and-writing"))

    _set(9, 4, _listening("u09-s04-b", "B. Listen to the audio and discuss the city/directions topic.", "B. Listen to the audio and discuss with your teacher: What are they talking about? Can you get some details?"))
    _set(9, 12, _open("u09-s12-a", "Answer the directions questions using the language studied.", "A. Answer the questions using the language studied. Remember that more than one answer is possible.", kind="multiple-valid-short-answer", constraints=["The source explicitly says more than one answer is possible; do not auto-grade a single route."]))
    _set(9, 13, _listening("u09-s13-b", "B. Listen to James and Joe and answer the teacher’s questions.", "B. Listen to James and Joe talking over the phone."))
    _set(9, 14,
        _true_false("u09-s14-q1", "They are on the main avenue.", False, "We are on Maple Street.", "The dialogue states Maple Street."),
        _true_false("u09-s14-q2", "They need to be on K-Street.", True, "We are supposed to be on K-Street at the museum.", "The destination is K-Street at the museum."),
        _true_false("u09-s14-q3", "They need to go to the local market.", False, "We are supposed to be on K-Street at the museum.", "The destination is the museum, not the local market."),
        _true_false("u09-s14-q4", "They have to walk three blocks.", False, "We need to walk two blocks and go along the park... go left for one block.", "The first stated walk is two blocks; the later turn is one block, so the literal statement is not supported."),
        _true_false("u09-s14-q5", "They have to go along the park.", True, "We need to walk two blocks and go along the park.", "The statement is verbatim."),
        _true_false("u09-s14-q6", "They have to go left when they get out of the park.", True, "We get out of the park and go left for one block.", "The statement is verbatim."),
        _true_false("u09-s14-q7", "Annie is not sure about the information.", True, "But are you sure? I don’t want to get lost.", "Annie expresses doubt about the route."),
        _true_false("u09-s14-q8", "The museum is on the first right corner of K-Street.", True, "The museum is on the first right corner of K-Street.", "The statement is verbatim."),
    )
    _set(9, 15, _open("u09-s15-d", "Role-play visiting a city and write an 80–100 word city description.", "D. Pretend you just arrived to a city... E. Write a 80 - 100 word paragraph...", kind="roleplay-and-writing", constraints=["Mention at least six places and how to get there; 80–100 words."]))

    _set(10, 4, _listening("u10-s04-b", "B. Listen to the audio and discuss the place description.", "B. Listen to the audio and discuss with your teacher: What are they talking about? Can you get some details?"))
    _set(10, 12,
        _item("u10-s12-a", "Fill Peter’s paragraph with adjectives from the box.", kind="grammar-fill", answer_items=[
            {"id": "blank-1", "canonical": "small", "accepted": ["small"], "evidence": "It doesn’t have a lot of buildings or houses."},
            {"id": "blank-2", "canonical": "tropical", "accepted": ["tropical"], "evidence": "It is a ... town because it has beautiful beaches."},
            {"id": "blank-3", "canonical": "big", "accepted": ["big"], "evidence": "His house is ..."},
            {"id": "blank-4", "canonical": "cold", "accepted": ["cold"], "evidence": "He lives in a ... place because the house is in a ... mountain."},
            {"id": "blank-5", "canonical": "high", "accepted": ["high"], "evidence": "The house is in a ... mountain."},
            {"id": "blank-6", "canonical": "ancient", "accepted": ["ancient"], "evidence": "It is also an ... town in the south."},
            {"id": "blank-7", "canonical": "clear", "accepted": ["clear"], "evidence": "It always has ... blue sky."},
        ], source_evidence=["Peaceful – High – Cold - Big - Ancient – Tropical – Clear - Small"], rationale="The source gives seven usable blanks for eight adjectives; Peaceful is retained as a distractor because the sentence has no unambiguous slot for it."),
        _listening("u10-s12-b", "B. Listen to Andrew talking about his hometown.", "B. Listen to Andrew talking about his hometown. What is he saying?"),
    )
    _set(10, 13,
        _short("u10-s13-q1", "What is the country’s name?", "Venezuela", ["Venezuela"], "Venezuela is a majestic country.", "The country is named directly."),
        _short("u10-s13-q2", "Is it a majestic country?", "Yes", ["Yes", "Yes, it is"], "Venezuela is a majestic country.", "The reading uses the same adjective."),
        _short("u10-s13-q3", "What amazing places does it have?", "beaches, highlands, rivers and jungles", ["beaches, highlands, rivers and jungles", "beaches; highlands; rivers; jungles"], "It has amazing places such as beaches, highlands, rivers, jungles, etc.", "Accept the listed places without requiring exact punctuation."),
        _short("u10-s13-q4", "Where is it located?", "South America", ["South America"], "It is located in South America.", "The location is stated directly."),
        _short("u10-s13-q5", "How are its people described?", "happy", ["happy", "happy people", "warm (in small towns)"], "It is named the country of happy people... Small towns ... have warm people.", "The text gives both the country-level and small-town descriptions."),
        _short("u10-s13-q6", "How are the beaches?", "clear with warm water", ["clear with warm water", "clear", "warm water"], "Its beaches are clear and they have warm water.", "Both properties are required for the complete answer."),
        _short("u10-s13-q7", "Does it have cold areas?", "Yes", ["Yes", "Yes, its highlands have cold areas"], "Its highlands are fresh and they also have cold areas.", "The reading confirms cold areas in the highlands."),
        _short("u10-s13-q8", "Describe the towns.", "Small towns are picturesque and have warm people.", ["Small towns are picturesque and have warm people.", "picturesque with warm people"], "Small towns are picturesque and they have warm people.", "The answer preserves both descriptors."),
    )
    _set(10, 14, _open("u10-s14-d", "Describe a city, town or country and write an 80–100 word favorite-place text.", "D. Describe a city / town / country... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words for writing; use descriptive adjectives."]))

    _set(11, 13, _open("u11-s13-a", "Write eight comparative sentences using the given adjectives.", "A. Write 8 comparative sentences...", kind="grammar-production", constraints=["Use comparative forms and retain the supplied adjective meanings."]))
    _set(11, 14,
        _listening("u11-s14-b", "B. Listen to two tourists and report the places and descriptions.", "B. Listen to two tourist talking about some places they have visited."),
        _short("u11-s14-q1", "Who is taller?", "Frank", ["Frank"], "Frank is taller than his brother Jake.", "The comparative directly identifies Frank."),
        _true_false("u11-s14-q2", "Is Frank older than Jake?", False, "Jake is older than Frank.", "The comparative gives Jake as older."),
        _short("u11-s14-q3", "Which brother is a better runner?", "Jake", ["Jake"], "Jake is a better runner.", "The statement is direct."),
        _true_false("u11-s14-q4", "Is Jake more interested in chess and reading?", False, "Frank is more interested in chess and reading.", "The source attributes that interest to Frank."),
        _true_false("u11-s14-q5", "Is Frank more interested in sports and technology?", False, "Jake is a better fan of sports and technology.", "The source attributes sports and technology to Jake."),
        _short("u11-s14-q6", "Who speaks two languages?", "Both Frank and Jake", ["Both", "Both Frank and Jake", "Frank and Jake"], "Both speak two languages.", "The statement names both brothers."),
        _short("u11-s14-q7", "Who has better French?", "Frank", ["Frank"], "Frank has better French than Jake.", "The comparative directly identifies Frank."),
        _short("u11-s14-q8", "What do they love?", "Cars", ["cars"], "They both love cars.", "The statement is direct."),
    )
    _set(11, 15, _open("u11-s15-d", "Compare two places and write an 80–100 word comparison of useful objects.", "D. Compare two different places... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["Use comparisons; 80–100 words for writing."]))

    _set(12, 13, _open("u12-s13-a", "Write eight superlative sentences with contexts.", "A. Write 8 superlative sentences...", kind="grammar-production", constraints=["Use superlative forms and state a context for each."]))
    _set(12, 14,
        _listening("u12-s14-b", "B. Listen to Carter and Richie talking about Tokyo.", "B. Listen to Carter and Richie talking about their visit to Tokyo. What are they saying"),
        _short("u12-s14-q1", "Who is her best friend?", "Cloe", ["Cloe"], "My best friend, Cloe, lives in the most wonderful city of all times.", "The reading names Cloe."),
        _short("u12-s14-q2", "Where does she live?", "Seoul", ["Seoul"], "She lives in Seoul.", "The location is direct."),
        _short("u12-s14-q3", "Which is the most wonderful city of all times?", "Seoul", ["Seoul"], "She lives in the most wonderful city of all times. She lives in Seoul.", "The superlative description is attached to Seoul."),
        _short("u12-s14-q4", "When do the greatest technological advances occur there?", "Every day", ["every day"], "The greatest technological advances occur every day.", "The time phrase is direct."),
        _short("u12-s14-q5", "Where does her best friend study?", "One of the biggest designing institutes in the city", ["one of the biggest designing institute of the city", "one of the biggest designing institutes in the city"], "She studies in one of the biggest designing institute of the city.", "Preserve the source meaning while accepting pluralized grammar."),
        _true_false("u12-s14-q6", "Does it have a good reputation?", True, "It has the best reputation of the local people.", "Best reputation entails a good reputation."),
        _short("u12-s14-q7", "Why doesn’t she visit her best friend?", "She has the worst economic situation ever.", ["She has the worst economic situation ever.", "Her economic situation is bad", "She cannot afford the trip"], "Right now I have the worst economic situation ever.", "The source gives the economic reason; the affordability wording is an accepted paraphrase."),
        _true_false("u12-s14-q8", "Does her best friend have a good job?", True, "She has the most amazing job too.", "The superlative supports the positive answer."),
    )
    _set(12, 15, _open("u12-s15-d", "Discuss best countries and write about a natural wonder.", "D. Improvise a conversation... E. Write around 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words for writing; use superlatives and descriptive context."]))

    _set(13, 12,
        _transform("u13-s12-a1", "Shelly / these days / practice / for the play.", [{"id": "sentence", "canonical": "Shelly is practicing for the play these days.", "accepted": ["Shelly is practicing for the play these days."], "evidence": "Shelly / these days / practice / for the play."}], "Shelly / these days / practice / for the play.", "Present progressive uses be plus -ing; these days marks a current temporary activity."),
        _transform("u13-s12-a2", "Austin / not behave / at the moment / properly.", [{"id": "sentence", "canonical": "Austin is not behaving properly at the moment.", "accepted": ["Austin is not behaving properly at the moment.", "Austin isn't behaving properly at the moment."], "evidence": "Austin / not behave / at the moment / properly."}], "Austin / not behave / at the moment / properly.", "Negative present progressive uses is not plus the -ing form."),
        _transform("u13-s12-a3", "I / lunch / have / now.", [{"id": "sentence", "canonical": "I am having lunch now.", "accepted": ["I am having lunch now.", "I'm having lunch now."], "evidence": "I / lunch / have / now."}], "I / lunch / have / now.", "First-person present progressive uses am plus -ing."),
        _transform("u13-s12-a4", "They / watch / in this instant / a movie.", [{"id": "sentence", "canonical": "They are watching a movie in this instant.", "accepted": ["They are watching a movie in this instant."], "evidence": "They / watch / in this instant / a movie."}], "They / watch / in this instant / a movie.", "Plural present progressive uses are plus -ing."),
        _transform("u13-s12-a5", "You / take / right now / classes.", [{"id": "sentence", "canonical": "You are taking classes right now.", "accepted": ["You are taking classes right now."], "evidence": "You / take / right now / classes."}], "You / take / right now / classes.", "You takes are plus the -ing form."),
        _transform("u13-s12-a6", "Joe and Kate / these months / travel a lot.", [{"id": "sentence", "canonical": "Joe and Kate are traveling a lot these months.", "accepted": ["Joe and Kate are traveling a lot these months."], "evidence": "Joe and kate/ these months / traveling a lot."}], "Joe and kate/ these months / traveling a lot.", "Plural present progressive uses are plus -ing."),
        _transform("u13-s12-a7", "Susan / bake / always / cupcakes.", [{"id": "sentence", "canonical": "Susan is always baking cupcakes.", "accepted": ["Susan is always baking cupcakes."], "evidence": "Susan / bake / always / cupcakes."}], "Susan / bake / always / cupcakes.", "The exercise tests the progressive with always for repeated behavior."),
        _transform("u13-s12-a8", "John / right now / cook / for all.", [{"id": "sentence", "canonical": "John is cooking for all right now.", "accepted": ["John is cooking for all right now.", "John is cooking for everyone right now."], "evidence": "John / right now / cook / for all."}], "John / right now / cook / for all.", "Present progressive uses is plus -ing."),
    )
    _set(13, 13,
        _listening("u13-s13-b", "B. Listen to two people talking and report what they are saying.", "B. Listen to two people talking. What are they saying?"),
        _true_false("u13-s13-q1", "Annie is writing the email.", False, "Dear Annie... I am writing these lines... Love, Laurie.", "Laurie is the writer; Annie is the recipient."),
        _true_false("u13-s13-q2", "She is writing from the hotel restaurant.", False, "I am writing these lines from the hotel room.", "The source says hotel room."),
        _true_false("u13-s13-q3", "She is having a good time.", True, "I am having a good time these days.", "The statement is direct."),
        _true_false("u13-s13-q4", "They are getting ready now.", True, "We are getting ready now.", "The statement is direct."),
        _true_false("u13-s13-q5", "They are not going on a tour.", False, "We are going on a tour in some minutes.", "The text says they are going."),
        _true_false("u13-s13-q6", "Her brother is enjoying every moment.", True, "My brother is enjoying every moment.", "The statement is direct."),
        _true_false("u13-s13-q7", "Her father is making all he can to make them happy.", True, "My dad is making all he can to make us happy.", "The statement is direct."),
        _true_false("u13-s13-q8", "They are having breakfast now.", True, "Right now, we are also having breakfast.", "The statement is direct."),
    )
    _set(13, 14, _open("u13-s14-d", "Role-play a vacation phone call and write an 80–100 word email.", "D. You are talking on the phone... E. Write a 80 - 100 word email...", kind="roleplay-and-writing", constraints=["80–100 words for writing; use present progressive."]))

    _set(14, 12,
        _transform("u14-s12-a1", "You were at Mary’s house last night.", [{"id": "question", "canonical": "Were you at Mary’s house last night?", "accepted": ["Were you at Mary's house last night?"], "evidence": "You were at Mary’s house last night."}], "You were at Mary’s house last night.", "Past to be inverts directly."),
        _transform("u14-s12-a2", "He was with us this morning.", [{"id": "question", "canonical": "Was he with us this morning?", "accepted": ["Was he with us this morning?"], "evidence": "He was with us this morning."}], "He was with us this morning.", "Past to be inverts directly."),
        _transform("u14-s12-a3", "They traveled to Spain a year ago.", [{"id": "question", "canonical": "Did they travel to Spain a year ago?", "accepted": ["Did they travel to Spain a year ago?"], "evidence": "They traveled to Spain a year ago."}], "They traveled to Spain a year ago.", "Ordinary simple-past verbs take did plus the base verb."),
        _transform("u14-s12-a4", "I made dinner for us some minutes ago.", [{"id": "question", "canonical": "Did I make dinner for us some minutes ago?", "accepted": ["Did I make dinner for us some minutes ago?"], "evidence": "I made dinner for us some minutes ago."}], "I made dinner for us some minutes ago.", "Ordinary simple-past verbs take did plus the base verb."),
        _transform("u14-s12-a5", "She came to school sick yesterday.", [{"id": "question", "canonical": "Did she come to school sick yesterday?", "accepted": ["Did she come to school sick yesterday?"], "evidence": "She came to school sick yesterday."}], "She came to school sick yesterday.", "Ordinary simple-past verbs take did plus the base verb."),
    )
    _set(14, 13, _listening("u14-s13-b", "B. Listen to the word list and classify the inflectional ending.", "B. Listen to the audio with a list of words. Identify to which inflectional ending each word belongs."))
    _set(14, 14,
        _true_false("u14-s14-q1", "They visited China 3 years ago.", False, "Two years ago... We went to Japan.", "The text gives Japan and two years."),
        _true_false("u14-s14-q2", "It was one of the most amazing places.", True, "We visited one of the most amazing places of the world.", "The statement is direct."),
        _true_false("u14-s14-q3", "They went to Japan.", True, "We went to Japan.", "The statement is direct."),
        _true_false("u14-s14-q4", "They arrived to Odaiba.", True, "We traveled by train to Odaiba; ... When we arrived there...", "The text states arrival in Odaiba."),
        _true_false("u14-s14-q5", "They stayed 3 days in Tokyo.", True, "We stayed there for 3 days.", "The statement is direct."),
        _true_false("u14-s14-q6", "They ate original ramen and sushi.", True, "We tried the traditional Ramen and the original sushi.", "The statement is direct."),
        _true_false("u14-s14-q7", "They visited Hikarigaoka.", True, "We took another train and went to Hikarigaoka.", "The statement is direct."),
        _true_false("u14-s14-q8", "This was the best trip ever.", False, "This was one of the best trips in my life.", "One of the best is not the same as the single best ever."),
    )
    _set(14, 15, _open("u14-s15-d", "Tell your teacher about a trip and write an 80–100 word weekend paragraph.", "D. Tell your teacher about one trip... E. Write a 80 - 100 paragraph...", kind="roleplay-and-writing", constraints=["80–100 words for writing; use simple past."]))

    _set(15, 12,
        _transform("u15-s12-a1", "Pete used to burp a lot in school.", [{"id": "question", "canonical": "Did Pete use to burp a lot in school?", "accepted": ["Did Pete use to burp a lot in school?"], "evidence": "Pete used to burp a lot in school."}], "Pete used to burp a lot in school.", "After did, used to returns to use."),
        _transform("u15-s12-a2", "Sarah used to wear long hair but not any more.", [{"id": "question", "canonical": "Did Sarah use to wear long hair but not any more?", "accepted": ["Did Sarah use to wear long hair but not any more?"], "evidence": "Sarah used to wear long hair but not any more."}], "Sarah used to wear long hair but not any more.", "After did, used to returns to use."),
        _transform("u15-s12-a3", "He used to be part of the soccer team back in college.", [{"id": "question", "canonical": "Did he use to be part of the soccer team back in college?", "accepted": ["Did he use to be part of the soccer team back in college?"], "evidence": "He used to be part of the soccer team back in college."}], "He used to be part of the soccer team back in college.", "After did, used to returns to use."),
        _transform("u15-s12-a4", "I used to talk loud but I stopped that.", [{"id": "question", "canonical": "Did I use to talk loud but I stopped that?", "accepted": ["Did I use to talk loud but I stopped that?"], "evidence": "I used to talk loud but I stopped that."}], "I used to talk loud but I stopped that.", "After did, used to returns to use."),
        _transform("u15-s12-a5", "They used to talk during movies when they were younger.", [{"id": "question", "canonical": "Did they use to talk during movies when they were younger?", "accepted": ["Did they use to talk during movies when they were younger?"], "evidence": "They used to talk during movies when they were younger."}], "They used to talk during movies when they were younger.", "After did, used to returns to use."),
    )
    _set(15, 13,
        _true_false("u15-s13-q1", "He never remembers his childhood.", False, "I always remember my childhood.", "The reading says always, the opposite of never."),
        _true_false("u15-s13-q2", "He used to spend hours near the lake.", False, "I used to spend hours with my friends nearby the river.", "The location is a river, not a lake."),
        _true_false("u15-s13-q3", "They used to go camping too.", True, "Sometimes camping.", "Camping is explicitly listed."),
        _true_false("u15-s13-q4", "They used to go there every Saturday.", False, "We used to go there almost every Saturday.", "Almost every is not every."),
        _true_false("u15-s13-q5", "They used to read books at the tree house.", False, "To play at the tree house and to listen to good music.", "The activities stated are playing and listening, not reading."),
        _true_false("u15-s13-q6", "They used to be bad kids.", False, "We used to be good kids.", "The text says good kids."),
        _true_false("u15-s13-q7", "They didn’t use to ring doorbells.", False, "We used to ring doorbells to our neighbors.", "The text says they did ring doorbells."),
        _true_false("u15-s13-q8", "He considers they had the greatest childhood.", True, "I truly think we had the greatest childhood.", "The statement is direct."),
    )
    _set(15, 14, _open("u15-s14-d", "Tell your teacher about past habits and write an 80–100 word childhood-memory paragraph.", "D. Tell your teacher about some things you used to do... E. Write a 80 - 100 word paragraph...", kind="roleplay-and-writing", constraints=["80–100 words; use used to and past habits."]))

    _set(16, 12,
        _transform("u16-s12-a1", "She was eating lunch when the wave crashed the land.", [{"id": "question", "canonical": "Was she eating lunch when the wave crashed the land?", "accepted": ["Was she eating lunch when the wave crashed the land?"], "evidence": "She was eating lunch when the wave crashed the land."}], "She was eating lunch when the wave crashed the land.", "Past progressive to be inverts directly."),
        _transform("u16-s12-a2", "They were watching the volcano while it was making eruption.", [{"id": "question", "canonical": "Were they watching the volcano while it was making eruption?", "accepted": ["Were they watching the volcano while it was making eruption?", "Were they watching the volcano while it was erupting?"], "evidence": "They were watching the volcano while it was making eruption."}], "They were watching the volcano while it was making eruption.", "Past progressive inversion is deterministic; the second accepted form repairs the source's non-idiomatic wording."),
        _transform("u16-s12-a3", "You were driving too fast when you crashed into his car.", [{"id": "question", "canonical": "Were you driving too fast when you crashed into his car?", "accepted": ["Were you driving too fast when you crashed into his car?"], "evidence": "You were driving too fast when you crashed into his car."}], "You were driving too fast when you crashed into his car.", "Past progressive to be inverts directly."),
        _transform("u16-s12-a4", "It was raining a lot while the city was flooding.", [{"id": "question", "canonical": "Was it raining a lot while the city was flooding?", "accepted": ["Was it raining a lot while the city was flooding?"], "evidence": "It was raining a lot while the city was flooding."}], "It was raining a lot while the city was flooding.", "Past progressive to be inverts directly."),
        _transform("u16-s12-a5", "We were having a good time when the fire started.", [{"id": "question", "canonical": "Were we having a good time when the fire started?", "accepted": ["Were we having a good time when the fire started?"], "evidence": "We were having a good time when the fire started."}], "We were having a good time when the fire started.", "Past progressive to be inverts directly."),
    )
    _set(16, 13, _extraction("u16-s13-c", "Extract the sentences under the three past-action functions.", {
        "actions-happening-in-the-past": ["my family and I went to Thailand for spending our holidays", "When we arrived, a woman helped us and we got safe", "a big wave crashed over the land", "we ... survived"],
        "past-actions-interrupted-by-another": ["we were having a great time at the beach when suddenly an alarm sounded", "we had the chance to try traditional food when we were visiting local markets"],
        "simultaneous-past-actions": ["The days were passing by while we were having the greatest time of our lives", "Everybody was running while we were trying to stay together", "lots of water was running over people while they were trying to escape"],
    }, "Survivors! ... we were having a great time at the beach when suddenly an alarm sounded... Everybody was running while we were trying to stay together...", "Group excerpts by simple past, an ongoing past action interrupted by a simple past event, and two ongoing past actions introduced by while."))
    _set(16, 14, _open("u16-s14-d", "Tell your teacher about a natural-disaster or accident experience and write an 80–100 word vacation paragraph.", "D. Tell your teacher about a experience... E. Write a 80 - 100 word paragraph...", kind="roleplay-and-writing", constraints=["80–100 words; use past progressive with simple past events."]))

    _set(17, 12,
        _transform("u17-s12-a1", "She is going to have dinner at the NGO manager’s house.", [{"id": "question", "canonical": "Is she going to have dinner at the NGO manager’s house?", "accepted": ["Is she going to have dinner at the NGO manager's house?"], "evidence": "She is going to have dinner at the NGO manager’s house."}], "She is going to have dinner at the NGO manager’s house.", "Going-to questions invert the be auxiliary."),
        _transform("u17-s12-a2", "I am going to attend the influencers conference on Friday.", [{"id": "question", "canonical": "Am I going to attend the influencers conference on Friday?", "accepted": ["Am I going to attend the influencers conference on Friday?"], "evidence": "I am going to attend the influencers conference on Friday."}], "I am going to attend the influencers conference on Friday.", "Going-to questions invert the be auxiliary."),
        _transform("u17-s12-a3", "He is going to scuba dive next month.", [{"id": "question", "canonical": "Is he going to scuba dive next month?", "accepted": ["Is he going to scuba dive next month?"], "evidence": "He is going to scuba dive next month."}], "He is going to scuba dive next month.", "Going-to questions invert the be auxiliary."),
        _transform("u17-s12-a4", "The YouTubers are going to air a live session this Saturday.", [{"id": "question", "canonical": "Are the YouTubers going to air a live session this Saturday?", "accepted": ["Are the YouTubers going to air a live session this Saturday?"], "evidence": "The YouTubers are going to air a live session this Saturday."}], "The YouTubers are going to air a live session this Saturday.", "Going-to questions invert the be auxiliary."),
        _transform("u17-s12-a5", "We are going to invite the web designer for dinner tonight.", [{"id": "question", "canonical": "Are we going to invite the web designer for dinner tonight?", "accepted": ["Are we going to invite the web designer for dinner tonight?"], "evidence": "We are going to invite the web designer for dinner tonight."}], "We are going to invite the web designer for dinner tonight.", "Going-to questions invert the be auxiliary."),
    )
    _set(17, 13,
        _true_false("u17-s13-q1", "Kid number 1 wants to be a YouTuber.", True, "I am going to become a YouTuber when I get older.", "The first child states this plan."),
        _true_false("u17-s13-q2", "The other kid is going to become a YouTuber too.", False, "It is better to work as a trader. I am going to be one of the best traders ever.", "The other child chooses trader."),
        _true_false("u17-s13-q3", "Joe is going to work as a VR developer.", False, "Joe’s brother is going to start working at a VR company as a developer.", "The plan is for Joe's brother, not Joe."),
        _true_false("u17-s13-q4", "Joe’s brother is going to start in February.", False, "I guess on July.", "The dialogue gives July, not February."),
        _true_false("u17-s13-q5", "Joe’s brother is going to get free demos.", False, "Do you think he is going to get free demos to try? I hope he does!", "The dialogue presents a hope/question, not a confirmed plan."),
        _true_false("u17-s13-q6", "They are going to play with Joe if his brother gets demos.", True, "If that is true, we are going to be able to play with Joe.", "The conditional statement is direct."),
        _true_false("u17-s13-q7", "They are not going to be the luckiest kids from the block.", False, "We are going to be the luckiest kids on the block.", "The source gives the opposite polarity."),
        _true_false("u17-s13-q8", "They are going to ask Joe about it now.", True, "I am going to ask Joe now.", "The statement is direct."),
    )
    _set(17, 14, _open("u17-s14-d", "Discuss future plans and write an 80–100 word holiday-plan text.", "D. Tell your teacher about some of the plans... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words; use going to plans."]))

    _set(18, 12,
        _item("u18-s12-a", "Correct the present-progressive future arrangements where needed.", kind="grammar-correction", answer_items=[
            {"id": "item-1", "canonical": "We are having lunch at 1:00 pm.", "accepted": ["We are having lunch at 1:00 pm."], "status": "already-correct", "evidence": "We are having lunch at 1:00 pm."},
            {"id": "item-2", "canonical": "He isn’t proposing to her tonight.", "accepted": ["He isn't proposing to her tonight.", "He is not proposing to her tonight."], "evidence": "He isn’t not proposing her tonight."},
            {"id": "item-3", "canonical": "The baby is being born in a week.", "accepted": ["The baby is being born in a week."], "evidence": "The baby is been born in a week."},
            {"id": "item-4", "canonical": "I am not coming to school tomorrow.", "accepted": ["I am not coming to school tomorrow."], "status": "already-correct", "evidence": "I am not coming to school tomorrow."},
            {"id": "item-5", "canonical": "We are finishing this lesson in two days.", "accepted": ["We are finishing this lesson in two days."], "status": "already-correct", "evidence": "We are finishing this lesson in two days."},
            {"id": "item-6", "canonical": "Jill isn’t attending the concert tonight.", "accepted": ["Jill isn't attending the concert tonight.", "Jill is not attending the concert tonight."], "evidence": "Jill isn’t not attending the concert tonight."},
            {"id": "item-7", "canonical": "We are eating lunch with the Millers tomorrow.", "accepted": ["We are eating lunch with the Millers tomorrow."], "status": "already-correct", "evidence": "We are eating lunch with the Millers tomorrow."},
            {"id": "item-8", "canonical": "She is having classes on Saturday.", "accepted": ["She is having classes on Saturday."], "evidence": "She is havings classes on Saturday."},
        ], source_evidence=["Sentences Corrections 0. He is to attend classes on Friday. He is attending classes on Friday..."], rationale="Remove double negation, repair be plus -ing, and preserve sentences that already express arrangements correctly."),
    )
    _set(18, 13,
        _true_false("u18-s13-q1", "Lilly is having a party.", True, "Are we attending Lilly’s party?", "The dialogue presupposes Lilly's party."),
        _true_false("u18-s13-q2", "They are attending for sure.", False, "I still don’t know... maybe we can go with aunt Melissa.", "Attendance remains uncertain."),
        _item("u18-s13-q3", "They are going with aunt Melissa.", kind="reading-true-false", response_mode="teacher-reviewed", answer_items=[], source_evidence=["Maybe we can go with aunt Melissa. She is going as far as I know."], rationale="The source presents a conditional possibility rather than a settled arrangement; do not auto-grade T/F without preserving that uncertainty.", status="source-ambiguous", blocker="Published dialogue does not establish that they definitely go with Melissa.", doNotAutoGrade=True),
        _true_false("u18-s13-q4", "Mum is waiting for dad to attend the party.", True, "I am waiting for your father even if we arrive late.", "The statement is direct."),
        _true_false("u18-s13-q5", "They are not getting her a present.", False, "What are we getting her as a present? ... We are planning to go and buy something on Friday.", "They plan to buy a present."),
        _true_false("u18-s13-q6", "They are buying the present on Saturday.", False, "We are planning to go and buy something on Friday.", "The planned day is Friday."),
        _true_false("u18-s13-q7", "Mum is not getting her daughter anything.", True, "I am not getting you anything.", "The statement is direct."),
        _true_false("u18-s13-q8", "She is not going to get the present.", True, "I am staying at home then.", "The daughter says she will stay home after the present exchange; this answer follows the exercise's intended consequence."),
    )
    _set(18, 14, _open("u18-s14-d", "Discuss arrangements and write an 80–100 word text about next year's arrangements.", "D. Tell your teacher about some of the arrangements... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words; include specific dates and present progressive arrangements."]))

    _set(19, 12, _open("u19-s12-a", "Write close-future simple-present events from the vocabulary box.", "A. Write sentences using the words from the box stating regular events for close future.", kind="grammar-production", constraints=["Use simple present plus a close-future time phrase; two additional examples remain learner-generated."]))
    _set(19, 13,
        _true_false("u19-s13-q1", "He does not have a test tomorrow.", False, "Don’t you have a test tomorrow? Yes, mum.", "He confirms that he has a test."),
        _true_false("u19-s13-q2", "He starts studying in some minutes.", True, "I start studying in some minutes.", "The statement is direct."),
        _true_false("u19-s13-q3", "It is 10 PM.", False, "Tommy it is 8 o’clock, very late!", "The time is 8 o'clock."),
        _true_false("u19-s13-q4", "He is reading.", True, "I finish reading this pages in some minutes.", "The dialogue says he is finishing reading."),
        _true_false("u19-s13-q5", "He will be grounded until he is married if he does not pass.", True, "If you don’t pass the test tomorrow, you will be grounded until you are married.", "The conditional warning is direct."),
        _true_false("u19-s13-q6", "They have a family meeting tomorrow night.", True, "Do we have a family meeting tomorrow? Yes!", "The family commitment is tomorrow."),
        _true_false("u19-s13-q7", "He is not hanging out with friends.", True, "I want to hang out with my friends tomorrow night... Sorry, we have a family commitment.", "The commitment prevents the planned hangout."),
        _true_false("u19-s13-q8", "He is happy about attending the family meeting.", False, "Another boring family meeting.", "He calls it boring, not happy."),
    )
    _set(19, 14, _open("u19-s14-d", "Discuss close-future events and write an 80–100 word text.", "D. Tell your teacher about your common life events... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words; use simple present for close future events."]))

    _set(20, 12, _open("u20-s12-a", "Write predictions using the listed will phrases.", "A. Write sentences using the words or phrases from the box stating predictions.", kind="grammar-production", constraints=["Use will, will probably, perhaps, won't and will definitely; add three original examples."]))
    _set(20, 13, _extraction("u20-s13-c", "Classify dialogue sentences as predictions, promises or instant decisions.", {
        "predictions": ["It will probably be cold since it is rainy.", "I will have so much fun.", "We will be even then."],
        "promises": ["I will pick you up in some minutes.", "I will take you there as a birthday present.", "I will get you a date with Nancy, I promise."],
        "instant-decisions": ["I will take my hoody.", "I will wear my lucky jeans."],
    }, "Picking you up! ... It will probably be cold ... I will take my hoody ... I will get you a date with Nancy, I promise.", "Use immediate context: will for a prediction, prior commitment/promise, or decision made in response to the conversation."))
    _set(20, 14, _open("u20-s14-d", "Discuss weather predictions, instant decisions and promises; write an 80–100 word weather report.", "D. Pretend you and your teacher are friends... E. Write a 80 - 100 word text...", kind="roleplay-and-writing", constraints=["80–100 words; include all three will functions."]))


_seed_more_manual_reviews()


def _seed_advanced_reviews() -> None:
    # Units 21–36: advanced grammar activities and source-based function extraction.
    _set(21, 14, _open("u21-s14-a", "Make present-perfect sentences from the supplied technology words.", "A. Look at the words on the list. Make sentences in the perfect present tense.", kind="grammar-production", constraints=["Use present perfect or present perfect progressive according to the intended function."]))
    _set(21, 15,
        _listening("u21-s15-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."),
        _extraction("u21-s15-c", "Extract present-perfect sentences and locate them by function.", {
            "started-and-still-continues": ["He has been in Europe for the last two weeks.", "He has been to other places in his life."],
            "completed-or-experienced-actions": ["He has already visited many places.", "He has seen and stayed in a range of inns, boarding houses, lodges etc. around the world."],
            "unfinished-or-current-state": ["Today, he has not gone out of the hotel yet.", "He has just had breakfast so he is getting ready to go out."],
        }, "Such a great life! John is 25 years old... he has been in Europe for the last two weeks... he has already visited many places...", "Classify only excerpts supported by the present-perfect function chart; keep the source's mixed perfect uses available for teacher review."),
    )
    _set(21, 16, _open("u21-s16-d", "Discuss travel experiences and write a 100–120 word technology-evolution text.", "D. Following the example... E. Write a 100 - 120 text...", kind="roleplay-and-writing", constraints=["100–120 words for writing; use present perfect forms."]))

    _set(22, 12, _listening("u22-s12-a", "A. Listen to the audio and answer teacher questions.", "A. Listen to the audio and answer the questions your teacher makes."), _open("u22-s12-b", "Write eight behaviour sentences using the different modals.", "B. Write 8 sentences addressing children’s behaviour...", kind="grammar-production", constraints=["Use should, have to, must, can/can't in context."]))
    _set(22, 13, _extraction("u22-s13-c", "Extract modal sentences and classify them as suggestions, responsibility, obligation or prohibition.", {
        "suggestions": ["I should talk to other people for advise or just to share some of the things or situations I live."],
        "responsibility": ["People have to be trustworthy.", "People must give back what they receive."],
        "obligation": ["They need to prove themselves friend.", "They should act towards others the same way others act towards them."],
        "prohibition": ["I should not look back into other bad experiences.", "I can’t be friends with everyone at first."],
    }, "An insight ... I should talk to other people... People have to be trustworthy... I should not look back...", "Some source lines overlap modal functions; preserve the category as a teacher-reviewed classification rather than an exact auto-grade."))
    _set(22, 14, _open("u22-s14-d", "Discuss friendship behaviour and write a 100–120 word opinion text.", "D. Discuss with your teacher... E. Write a 100 - 120 text...", kind="roleplay-and-writing", constraints=["100–120 words; use modal functions."]))

    _set(23, 12,
        _listening("u23-s12-a", "A. Listen to the audio and answer teacher questions.", "A. Listen to the audio and answer the questions your teacher makes."),
        _item("u23-s12-b", "Complete the indefinite-pronoun sentences.", kind="grammar-fill", answer_items=[
            {"id": "blank-1", "canonical": "no one", "accepted": ["no one", "nobody"], "evidence": "_______ will ever love you.", "rationale": "Negative generalization about a person."},
            {"id": "blank-2", "canonical": "somewhere", "accepted": ["somewhere"], "evidence": "I need ______ to go this weekend.", "rationale": "Positive indefinite place."},
            {"id": "blank-3", "canonical": "nothing", "accepted": ["nothing"], "evidence": "We did _______ but being bored to tears.", "rationale": "No thing was done."},
            {"id": "blank-4", "canonical": "everyone", "accepted": ["everyone", "everybody"], "evidence": "My parents were glad ______ was with their belts on for the trip.", "rationale": "Positive generalization over the people in the trip."},
            {"id": "blank-5", "canonical": "anything", "accepted": ["anything"], "evidence": "We haven’t done _______ yet.", "rationale": "Any is used in a negative present-perfect sentence."},
            {"id": "blank-6", "canonical": "something", "accepted": ["something"], "evidence": "Stop letting your hair down and do ___________.", "rationale": "Positive indefinite thing in an imperative."},
            {"id": "blank-7", "canonical": "anywhere", "accepted": ["anywhere", "somewhere"], "evidence": "the cars keys could be________.", "rationale": "The source gives no polarity cue; anywhere is the neutral/uncertain form and somewhere is a plausible positive variant."},
            {"id": "blank-8", "canonical": "someone went somewhere to do something", "accepted": ["someone went somewhere to do something"], "evidence": "________ went _______ to do _______ about the project.", "rationale": "The three blanks require a person, place and thing indefinite pronoun."},
        ], source_evidence=["People Places Things ... Somebody Someone Somewhere Something ... Anybody Anyone Anywhere Anything ... None Nobody No one Nowhere Nothing"], rationale="Use the unit's people/place/thing and positive/negative/any/no distinctions; retain the source's grammatical ambiguity where its context does not force one form."),
    )
    _set(23, 13, _extraction("u23-s13-c", "Extract indefinite pronouns by generalization, indefinite reference and secrecy.", {
        "generalization": ["everybody", "No one", "anyone or anything"],
        "being-indefinite": ["anywhere", "nowhere"],
        "being-secretive": ["SOMEONE was just wandering out of boredom", "someone is realizing he lost his chance"],
    }, "About the party ... SOMEONE ... everybody ... No one ... anyone or anything ... nowhere ...", "Map source pronouns to the three scenarios taught on the grammar slide; accept equivalent casing."))
    _set(23, 14, _open("u23-s14-d", "Discuss a boring anecdote and write an 80–120 word text.", "D. Tell your teacher about an anecdote... E. Write an 80 -120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; include indefinite pronouns and suggestions."]))

    _set(24, 12, _item("u24-s12-a", "Add relative clauses to the eight supplied clauses.", kind="grammar-production", response_mode="teacher-reviewed-writing", answer_items=[
        {"id": "item-1", "acceptedStructures": ["where"], "evidence": "John lives at the house on the corner."},
        {"id": "item-2", "acceptedStructures": ["which", "that"], "evidence": "The cars ran away very fast."},
        {"id": "item-3", "acceptedStructures": ["when"], "evidence": "This morning was super fresh and sunny."},
        {"id": "item-4", "acceptedStructures": ["which", "that", "because"], "evidence": "They have not called back yet."},
        {"id": "item-5", "acceptedStructures": ["who", "that"], "evidence": "The boy delivers the newspaper."},
        {"id": "item-6", "acceptedStructures": ["which", "that"], "evidence": "Killing is a crime."},
        {"id": "item-7", "acceptedStructures": ["which", "that"], "evidence": "The house has been demolished."},
        {"id": "item-8", "acceptedStructures": ["which", "that"], "evidence": "The majority has not delivered the essay."},
    ], source_evidence=["A. Add corresponding clauses according to the information given."], rationale="The exercise supplies no target meaning for each added clause, so only relative-pronoun constraints are explicit; generated clauses remain teacher-reviewed.", status="reviewed-with-open-completions", gradingNote="Do not auto-grade a single sentence when multiple relative clauses satisfy the prompt."))
    _set(24, 13, _listening("u24-s13-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."), _extraction("u24-s13-c", "Extract relative-clause examples from the paragraph.", {
        "people-who": ["my father, who was one of the most loyal employees here"],
        "place-where": ["the same company, where my father used to work", "another job where my best friend suggested"],
        "reason-why": ["I really don’t know why they are always comparing me to him", "That is why I am calling him tomorrow"],
    }, "Not what I expected! ... the same company, where my father used to work ... my father, who was one of the most loyal employees here ...", "Accept source excerpts containing the relative marker and its antecedent."))
    _set(24, 14, _open("u24-s14-d", "Role-play a situation about a job or expectation and write an 80–120 word paragraph.", "D. Act out a situation... E. Write an 80 - 120 word paragraph...", kind="roleplay-and-writing", constraints=["80–120 words; use relative clauses."]))

    _set(25, 13, _item("u25-s13-a", "Complete the descriptive paragraph with adjectives from the box.", kind="grammar-fill", answer_items=[
        {"id": "blank-1", "canonical": "captivating", "accepted": ["captivating", "interesting"], "evidence": "this ________ story", "rationale": "Both words describe an engaging story; the source provides no unique clue."},
        {"id": "blank-2", "canonical": "never-ending", "accepted": ["never-ending"], "evidence": "the ___________ village", "rationale": "The word bank supplies the only remaining modifier that fits the source's intended adjective exercise, though the phrase is semantically unusual."},
        {"id": "blank-3", "canonical": "connected", "accepted": ["connected"], "evidence": "well ___________ to his origins", "rationale": "Connected to is the idiomatic collocation."},
        {"id": "blank-4", "canonical": "befuddled", "accepted": ["befuddled"], "evidence": "he always got __________ when telling us a story", "rationale": "Befuddled describes confusion."},
        {"id": "blank-5", "canonical": "encrypted", "accepted": ["encrypted"], "evidence": "the __________ secret", "rationale": "Encrypted modifies a concealed secret."},
        {"id": "blank-6", "canonical": "daring", "accepted": ["daring"], "evidence": "________ young men", "rationale": "Daring modifies the men undertaking the quest."},
        {"id": "blank-7", "canonical": "missing", "accepted": ["missing"], "evidence": "the __________ treasure", "rationale": "Missing modifies the treasure sought."},
        {"id": "blank-8", "canonical": "terrifying", "accepted": ["terrifying"], "evidence": "the ___________ places", "rationale": "Terrifying describes the places that caused people to succumb."},
        {"id": "blank-9", "canonical": "fascinating", "accepted": ["fascinating", "interesting", "captivating"], "evidence": "it seems pretty __________to me", "rationale": "The source leaves more than one positive evaluation semantically possible; retain all supplied adjectives that fit."},
    ], source_evidence=["Encrypted - Never-ending - Terrifying - Interesting - Missing - Befuddled - Captivating - Connected - Fascinating - Daring"], rationale="The word bank contains one distractor or interchangeable positive evaluations; do not silently reject semantically valid supplied adjectives."))
    _set(25, 14, _listening("u25-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."), _extraction("u25-s14-c", "Extract adjective-function examples from Gone to College.", {
        "-ing-describes-situation-or-thing": ["such an exciting moment", "time-consuming activities", "some boring lessons", "tiring lectures"],
        "-ed-describes-feeling": ["I feel blessed", "I feel fortunate and grateful"],
    }, "Gone to College ... exciting ... time-consuming ... boring lessons and tiring lectures ... I feel blessed ...", "Use the lesson's -ing versus -ed adjective rule; retain the source wording."))
    _set(25, 15, _open("u25-s15-d", "Describe a first experience abroad and write an 80–120 word text.", "D. Following the example... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use adjective forms and feelings."]))

    _set(26, 13, _open("u26-s13-a", "Create eight zero-conditional sentences.", "A. Create eight sentences where you use the zero conditional...", kind="grammar-production", constraints=["Use present tense in both clauses; include general truths, facts or instructions."]))
    _set(26, 14, _extraction("u26-s14-c", "Extract zero-conditional examples from the dialogue.", {
        "general-truth-or-reaction": ["if someone chews with their mouth open, that drives me crazy", "When someone eats and talks at the same time, I feel it so gross", "When I see a kid doing it, I ... tell his mum"],
        "instruction": ["if you go out of a room, close the door behind you"],
    }, "What annoys you? ... if someone chews with their mouth open ... if you go out of a room, close the door behind you.", "Classify present-present conditional clauses by the function chart."))
    _set(26, 15, _open("u26-s15-d", "Discuss rude behaviour and write an 80–120 word text.", "D. Following the example... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use zero conditional functions."]))

    _set(27, 12, _open("u27-s12-a", "Write first-conditional consequence sentences from the vocabulary box.", "A. Look at the words in the box and write statements where you can express consequences.", kind="grammar-production", constraints=["Use if plus present and will/can plus consequence."]))
    _set(27, 13, _extraction("u27-s13-c", "Extract first-conditional examples from Bullying.", {
        "future-consequence": ["If this is not controlled, we will get youngsters with repressed anger or depression or even suicidal tendencies.", "We will be facing this for a long time if we don’t do anything about it."],
        "conditional-responsibility": ["If parents do not start working values from their homes, they will see their own children become the bullies or the bullied ones."],
        "conditional-goal": ["If we want to see some change, we need to start making a difference now."],
    }, "Bullying ... If this is not controlled, we will get youngsters ... If parents do not start ... they will see ...", "Preserve the source's four first-conditional functions and do not add consequence claims beyond the paragraph."))
    _set(27, 14, _open("u27-s14-d", "Discuss consequences and write an 80–120 word impact text.", "D. Following the example... E. Write a 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use first conditional consequences."]))

    _set(28, 12, _open("u28-s12-a", "Write second-conditional situations from the vocabulary box.", "A. Look at the words / phrases in the box and write statements where you can express situations unlikely to happen.", kind="grammar-production", constraints=["Use if plus past form and would/could plus base verb; use were for be."]))
    _set(28, 13, _extraction("u28-s13-c", "Extract second-conditional examples from What if…", {
        "hypothetical-present-result": ["If I were rich, I would be using my money to start helping people", "If I had enough money, I would definitely travel to meet new places and people"],
        "advice-or-empathy": ["If I were you, I would start considering it just in case."],
    }, "What if... If I were rich, I would be using my money ... If I had enough money ... If I were you, I would start considering it...", "Classify the hypothetical and advice functions from the unit's second-conditional chart."))
    _set(28, 14, _open("u28-s14-d", "Discuss unmade life decisions and write an 80–120 word society text.", "D. Talk to your teacher about the different life decisions... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use second conditional."]))

    _set(29, 13, _item("u29-s13-a", "Complete the gerund and infinitive paragraph.", kind="grammar-fill", answer_items=[
        {"id": "blank-1", "canonical": "coming clean", "accepted": ["coming clean"], "evidence": "think about __________ with someone", "rationale": "A gerund follows the preposition about."},
        {"id": "blank-2", "canonical": "to find", "accepted": ["to find"], "evidence": "opportunity ________ peace", "rationale": "Opportunity takes an infinitive complement."},
        {"id": "blank-3", "canonical": "to do", "accepted": ["to do"], "evidence": "it’s best ________ nothing", "rationale": "The adjective best is followed by an infinitive here."},
        {"id": "blank-4", "canonical": "ignoring", "accepted": ["ignoring"], "evidence": "go by __________ the situation", "rationale": "By is a preposition and takes a gerund."},
        {"id": "blank-5", "canonical": "saying", "accepted": ["saying", "considering"], "evidence": "you can’t go around ____________ that is correct", "rationale": "The published sentence is malformed; saying is the most natural supplied-word completion, with considering retained as a source-compatible alternative."},
        {"id": "blank-6", "canonical": "to be", "accepted": ["to be"], "evidence": "You have _________ clear", "rationale": "Have + adjective here takes the infinitive be."},
        {"id": "blank-7", "canonical": "saying", "accepted": ["saying"], "evidence": "show it to them by _________ you’re sorry", "rationale": "By takes the gerund saying."},
        {"id": "blank-8", "canonical": "to consider", "accepted": ["to consider"], "evidence": "importance ________ others", "rationale": "Importance is followed by an infinitive in the source's taught pattern."},
    ], source_evidence=["come clean - do - think - find - say - ignore - consider - be - apologize"], rationale="Use the taught gerund/infinitive environments; the source contains a malformed clause and therefore preserves a second accepted option rather than inventing a hidden correction."),
        _listening("u29-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."),
    )
    _set(29, 15, _extraction("u29-s15-c", "Extract gerund/infinitive examples from the paragraph.", {
        "infinitive-after-verb-or-adjective": ["people need to be honest", "it would be a great idea for people to consider them", "in order to say they’re sorry"],
        "gerund-after-preposition": ["by respecting others", "in order to say they’re sorry, and mend what they did"],
    }, "How to be in life ... People have to understand that respect and honesty are fundamental to have and keep healthy relationships...", "Teacher-review the extracted forms because the published reading mixes several verb patterns."))
    _set(29, 16, _open("u29-s16-d", "Discuss essentials and write an 80–120 word situation/apology text.", "D. Following the example... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use gerunds and infinitives."]))

    _set(30, 13, _open("u30-s13-a", "Describe people in the pictures using all covered areas.", "A. Describe the people on the pictures. Follow the example.", kind="descriptive-production", constraints=["Cover appearance, personality and clothing; preserve the supplied adjective order."]), _listening("u30-s13-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(30, 14, _extraction("u30-s14-c", "Extract appearance, personality and clothing descriptions from the dialogue.", {
        "appearance": ["It does match your big, round, blue eyes.", "The tall, thin, muscular guy with prince-charming hair"],
        "personality": ["he seems to be not very friendly", "he is super friendly and quite fun"],
        "clothing": ["this single blue, rayon, German shirt"],
    }, "Liam ... single blue, rayon, German shirt ... big, round, blue eyes ... tall, thin, muscular guy ...", "Preserve the three source functions taught in the unit."))
    _set(30, 15, _open("u30-s15-d", "Role-play a high-school reunion and write an 80–120 word ideal-partner description.", "D. Act out the following situation... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; include appearance, clothing and personality."]))

    _set(31, 13, _open("u31-s13-a", "Create eight sentences with the unit's adverbial-clause structures.", "A. Create eight sentences where you use the grammar points and uses we learned in class.", kind="grammar-production", constraints=["Use it/adverbial-clause patterns and express disagreement, enjoyment or acceptance."]))
    _set(31, 14, _extraction("u31-s14-c", "Extract adverbial-clause examples and classify their function.", {
        "disagreement": ["I really don’t mind it; in fact, up to certain level, kids need to be noisy.", "there is no reason to be loud"],
        "enjoyment": ["I love it when they seem happy"],
        "acceptance": ["it helps a lot when you keep them busy", "it doesn’t bother me at all"],
    }, "I really don’t mind it! ... I love it when they seem happy ... it doesn’t bother me at all.", "The categories follow the unit's language-target functions; accept equivalent excerpts with the same function."))
    _set(31, 15, _open("u31-s15-d", "Discuss situations you cannot stand or accept and write an 80–120 word perspective.", "D. Following the example... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use adverbial clauses."]))

    _set(32, 12, _open("u32-s12-a", "Write eight sentences using would and other modals.", "A. Write 8 different sentences where you state the use of would and some of the other modals mentioned in class.", kind="grammar-production", constraints=["Include requests, offers, preferences and wishes."]))
    _set(32, 13, _extraction("u32-s13-c", "Extract would/preference forms from the dialogue.", {
        "preference": ["I would rather choose Stanford over Yale.", "I’d prefer to go to Stanford as well."],
        "wish": ["I’d wish this to be easier man."],
        "request-or-offer": ["Would you like to have some burgers? I’ll buy them."],
    }, "Giving it a thought! ... I would rather choose Stanford over Yale ... Would you like to have some burgers?", "Map the source forms to the request, offer, preference and wish functions taught."))
    _set(32, 14, _open("u32-s14-d", "Role-play an important decision and write an 80–120 word future-life text.", "D. Following the example... E. Write an 80 to 120 word text...", kind="roleplay-and-writing", constraints=["80–120 words; use would, prefer and rather."]))

    _set(33, 12, _open("u33-s12-a", "Write eight sentences comparing customs and expectations.", "A. Write 8 sentences comparing customs and expectations from your country and another one you know.", kind="grammar-production", constraints=["Use supposed to, expected to, acceptable/custom expressions."]), _listening("u33-s12-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(33, 13, _extraction("u33-s13-c", "Extract customs, expectations and acceptability examples from the article.", {
        "expectation": ["I was always having to ask people to repeat themselves", "The language barrier meant that public transport was tricky at first"],
        "custom-or-tradition": ["mince pies are not actually filled with minced beef"],
        "acceptable-or-unexpected": ["I didn’t expect student life in Scotland to be all that different from my home of the Netherlands", "I was mispronouncing names and places all the time"],
    }, "I wasn’t prepared for the culture shock ... I didn’t expect student life in Scotland ... mince pies are not actually filled with minced beef.", "The article is an open extraction/discussion task; source excerpts are the review key, not a single quiz answer."))
    _set(33, 14, _open("u33-s14-d", "Discuss cultural shock and write a 120–160 word customs text.", "D. Following the example... E. Write a 120 to 160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; compare customs and expectations."]))

    _set(34, 13, _open("u34-s13-a", "Describe five objects, gadgets or events across time.", "A. Describe how 5 different objects, gadgets, events, movements etc. have evolved in time.", kind="grammar-production", constraints=["Use past, present and future time references."]), _listening("u34-s13-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(34, 14, _extraction("u34-s14-c", "Extract temporal comparison and transition examples from the reading.", {
        "past-to-present": ["In 1970, it was less than half.", "laws have changed since 1970"],
        "present-state": ["Today, women have just three-quarters of the legal rights of men.", "Despite the progress that has been made, more work remains."],
        "sequence-or-evidence": ["First of all, significant progress has been made around the world.", "Second, the pace of reform has varied across regions.", "The third interesting finding is that progress has been uneven"],
    }, "How have women’s legal rights evolved ... Today ... In 1970 ... First of all ... Second ... The third interesting finding ...", "Preserve the source's transition words and time comparisons; do not rewrite the article into a new summary."))
    _set(34, 15, _open("u34-s15-d", "Discuss an evolving event and write a 120–160 word evolution text.", "D. Following the example... E. Write a 120 to 160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use temporal comparisons and transitions."]))

    _set(35, 12, _open("u35-s12-a", "Write eight probability sentences.", "A.Use the vocabulary and language studied to write 8 sentences to express probability.", kind="grammar-production", constraints=["Use might/may/could with simple-form verbs and preserve probability strength."]), _listening("u35-s12-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(35, 13, _extraction("u35-s13-c", "Extract probability forms from the reading.", {
        "higher-probability": ["You might use this phrase to console a loved one", "Anyone can make an effort to alter specific habits or behaviors"],
        "uncertain-or-conditional": ["Perhaps you add the reassurance, ‘You’ll do better next time’", "might affect people to change"],
        "low-or-unknown": ["How can you tell if someone will ever really address certain behaviors?"],
    }, "People Can Change, But That Doesn't Mean They Will ... You might use this phrase ... Perhaps ...", "This is a teacher-reviewed extraction because the article uses probability and possibility beyond the three modal examples."))
    _set(35, 14, _open("u35-s14-d", "Discuss factors that might affect change and write a 120–160 word advice email.", "D. Following the example... E. Write an 120 to 160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use probability language."]))

    _set(36, 12, _open("u36-s12-a", "Write eight sentences expressing ideas or suggestions.", "A.Use the vocabulary and language studied to write 8 sentences to express ideas or suggestions.", kind="grammar-production", constraints=["Use had better, can or should in helpful contexts."]), _listening("u36-s12-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(36, 13, _extraction("u36-s13-c", "Extract suggestion and advice forms from the reading.", {
        "strong-advice": ["They’d better change that idea.", "The ones who bounce back ... find a way to rise once more"],
        "possibility-or-limit": ["luck does play a part", "they can’t control everything or guarantee success"],
        "reflective-suggestion": ["shouldn’t this be something to think of?"],
    }, "Successful Managers Know That Luck Goes With Effort ... They’d better change that idea ... shouldn’t this be something to think of?", "Retain teacher-reviewed source excerpts; the article mixes advice, ability and limits."))
    _set(36, 14, _open("u36-s14-d", "Discuss suggestions for success and write a 120–160 word club letter.", "D. Following the example... E. Write an 120 to 160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use suggestion forms."]))


_seed_advanced_reviews()


def _seed_upper_reviews() -> None:
    # Units 37–44: upper-level grammar corrections and reading-function evidence.
    _set(37, 13, _open("u37-s13-a", "Write eight sentences stating wants, desires, expectations or things looked for.", "A. State 8 different sentences where you state what you want / desire / expect / look for in people and things.", kind="grammar-production", constraints=["Use the unit's desire/expectation structures."]), _listening("u37-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(37, 14, _extraction("u37-s14-c", "Extract desire, expectation and preference forms from the reading.", {
        "desire": ["A lot of people dream of having the ideal match for life", "Most of us would love to share our life with someone kind, honest and respectful"],
        "expectation": ["it is natural that we expect to have a person who makes us come to our senses when necessary"],
        "independence-or-position": ["happiness does not depend on having someone", "A happy life, you can create it on your own"],
    }, "Have you gotten it yet? ... Most of us would love ... we expect to have a person ...", "Preserve the reading's exact source evidence for the open extraction task."))
    _set(37, 15, _open("u37-s15-d", "Discuss life-partner expectations and write a 120–160 word future text.", "D. Talk to your teacher... E. Write a piece of text between 120 - 160 words...", kind="roleplay-and-writing", constraints=["120–160 words; use desire/expectation forms."]))

    _set(38, 13,
        _item("u38-s13-a", "Correct the causative-verb sentences where needed.", kind="grammar-correction", answer_items=[
            {"id": "item-1", "canonical": "Clayton got the copier fixed yesterday.", "accepted": ["Clayton got the copier fixed yesterday."], "status": "already-correct", "evidence": "Clayton got the copier fixed yesterday."},
            {"id": "item-2", "canonical": "I will have John come for the dinner party.", "accepted": ["I will have John come for the dinner party."], "evidence": "I will had John come for the dinner party."},
            {"id": "item-3", "canonical": "Source wording is insufficient to determine a unique correction.", "accepted": [], "evidence": "I have chance my arm so long for this company.", "status": "source-ambiguous", "rationale": "The published sentence appears corrupted; it does not identify whether chance/change or a causative object was intended."},
            {"id": "item-4", "canonical": "Danny always has Daniel help him with his homework.", "accepted": ["Danny always has Daniel help him with his homework."], "status": "already-correct", "evidence": "Danny always has Daniel help him with his homework."},
            {"id": "item-5", "canonical": "Get the homework ready and you can go out.", "accepted": ["Get the homework ready and you can go out."], "status": "already-correct", "evidence": "Get the homework ready and you can go out."},
            {"id": "item-6", "canonical": "I was having Jake clean the house and he fell over.", "accepted": ["I was having Jake clean the house and he fell over."], "evidence": "I was having Jake cleaned the house and he fell over."},
            {"id": "item-7", "canonical": "The company had most of the staff fired for corruption.", "accepted": ["The company had most of the staff fired for corruption."], "evidence": "The company most of the staff fired for corruption."},
            {"id": "item-8", "canonical": "I will have Jimmy buy our food tonight.", "accepted": ["I will have Jimmy buy our food tonight."], "status": "already-correct", "evidence": "I will have Jimmy buy our food tonight."},
        ], source_evidence=["A. Look at the sentences and identify where the mistakes are if there are any. After that fix them."], rationale="Apply have/get + object + complement; preserve the corrupted item as unresolved instead of guessing its intended wording."),
        _listening("u38-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."),
    )
    _set(38, 14, _extraction("u38-s14-c", "Extract causative structures from the reading.", {
        "get-or-have-object-done": ["Have others make chores or favors for or to you", "Get people to work or do things the way you want"],
        "getting-others-to-do": ["getting others to know you", "having others do things for us", "getting things done by others"],
    }, "Do it yourself ... Have others make chores or favors ... Get people to work ...", "The source reading supplies examples but does not label a unique category for every sentence; classify by causative pattern."))
    _set(38, 15, _open("u38-s15-d", "Discuss delegated chores and write a 120–160 word workplace text.", "D. Following the example... E. Write a text between 120 - 160 words...", kind="roleplay-and-writing", constraints=["120–160 words; use causative structures."]))

    _set(39, 13, _open("u39-s13-a", "Write sentences using the listed phrasal verbs in different tenses.", "A. Look at the phrasal verbs in the chart and make sentences in different tenses.", kind="grammar-production", constraints=["Use each supplied phrasal verb in a meaningful tense."]))
    _set(39, 14, _extraction("u39-s14-c", "Extract phrasal verbs and give their contextual meanings.", {
        "come-across": ["Coming across with such a character"],
        "knock-it-off": ["‘hey man, knock it off!’"],
        "bear-in-mind": ["We need to bear in mind that each person is different"],
        "bring-up": ["that brings up different situations to deal with"],
        "deal-with": ["different situations to deal with"],
        "go-for": ["being in peace with everyone is something we all must go for"],
    }, "Knock it off! ... Coming across ... bear in mind ... brings up ... deal with ...", "Meanings are contextual: encounter, stop, remember/consider, cause/raise, handle, and pursue/aim for."))
    _set(39, 15, _open("u39-s15-d", "Discuss a lived situation and write a 120–160 word work-environment text.", "D. Talk about a situation... E. Write a piece of text between 120-160 words...", kind="roleplay-and-writing", constraints=["120–160 words; use the listed phrasal verbs."]))

    _set(40, 13, _open("u40-s13-a", "Write sentences using the corresponding delexical verbs.", "A. Look at the words on the list. Make sentences using the corresponding delexical verbs.", kind="grammar-production", constraints=["Use the supplied verbs in their common collocations."]), _listening("u40-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(40, 14, _extraction("u40-s14-c", "Extract delexical-verb collocations and state their intended meanings.", {
        "do": ["I do all my work online from home"],
        "take": ["take some time off"],
        "make": ["make an appointment with the dentist"],
        "have": ["without having dinner to finish a task"],
        "get": ["It can also get quite lonely working on my own"],
    }, "Work-life balance ... I do all my work online ... take some time off ... make an appointment ... having dinner ... get quite lonely ...", "Keep the collocation and the source meaning; delexical verbs are not interchangeable with invented synonyms."))
    _set(40, 15, _open("u40-s15-d", "Discuss gratitude and write a 120–150 word text about parental values.", "D. What are the things you are grateful for?... E. Write a text between 120-150 words...", kind="roleplay-and-writing", constraints=["120–150 words; use delexical collocations."]))

    _set(41, 13, _open("u41-s13-a", "Write past-perfect sentences from the supplied time phrases.", "A. Look at the phrases on the list. Make sentences using them and the past perfect...", kind="grammar-production", constraints=["Use had + past participle and retain each time phrase."]), _listening("u41-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(41, 15, _extraction("u41-s15-c", "Extract past-perfect forms from the reading.", {
        "past-perfect-prior-action": ["I'd been invited to a party", "it had run out of petrol", "I'd lent my car to my son the day before", "he'd used the petrol", "he hadn't filled the car up", "I'd left it next to my bed charging", "the person I wanted to meet had just left", "all the food had gone"],
        "simple-past-sequence": ["I got in my car, started driving", "I arrived at the party over 3 hours late"],
    }, "What a day! ... it had run out of petrol ... I'd lent my car ... he hadn't filled ... I'd left it ...", "The published prompt incorrectly calls this a delexical-verb extraction while the lesson grammar and source text are past perfect; preserve that blocker and key the actual past-perfect forms." , status="reviewed-with-source-label-mismatch", blocker="Prompt says delexical verbs, but Unit 41 teaches past perfect and the reading's target forms are past perfect."))
    _set(41, 16, _open("u41-s16-d", "Tell an unexpected-day anecdote and write a 120–160 word past-perfect text.", "D. Based on the previous activity... E. Write an 120-160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use past perfect to order earlier experiences."]))

    _set(42, 13, _item("u42-s13-a", "Convert each direct statement/request into reported speech.", kind="reported-speech", answer_items=[
        {"id": "item-1", "canonical": "He said that he had not done his homework.", "accepted": ["He said that he had not done his homework.", "She said that she had not done her homework."], "evidence": "I did not do my homework..", "rationale": "Backshift simple past to past perfect; subject is unspecified in source."},
        {"id": "item-2", "canonical": "They said that they would definitely get that spot.", "accepted": ["They said that they would definitely get that spot.", "He said that he would definitely get that spot."], "evidence": "We will definitely get that spot.", "rationale": "Backshift will to would and adjust pronoun."},
        {"id": "item-3", "canonical": "She said that she had been watching TV when I called.", "accepted": ["She said that she had been watching TV when I called.", "He said that he had been watching TV when I called."], "evidence": "I was watching TV and you called.", "rationale": "Backshift past progressive to past perfect progressive; source does not identify speakers."},
        {"id": "item-4", "canonical": "He asked me not to open the windows.", "accepted": ["He asked me not to open the windows.", "She asked me not to open the windows."], "evidence": "Don’t open the windows, please.", "rationale": "Reported negative imperative uses asked + object + not to."},
        {"id": "item-5", "canonical": "He said that he normally ate cereal in the mornings.", "accepted": ["He said that he normally ate cereal in the mornings.", "She said that she normally ate cereal in the mornings."], "evidence": "I normally eat cereal in the mornings.", "rationale": "The source supplies this answer as the example."},
        {"id": "item-6", "canonical": "They said that they were having a terrible day.", "accepted": ["They said that they were having a terrible day.", "He said that he was having a terrible day."], "evidence": "We are having a terrible day..", "rationale": "Backshift present progressive to past progressive."},
        {"id": "item-7", "canonical": "He said that he might call her.", "accepted": ["He said that he might call her.", "She said that she might call her."], "evidence": "I may call her.", "rationale": "May commonly backshifts to might in reported speech."},
        {"id": "item-8", "canonical": "They said that they should smoke outside.", "accepted": ["They said that they should smoke outside.", "He said that they should smoke outside."], "evidence": "We should smoke outside.", "rationale": "Should normally remains should; pronoun depends on reporting context."},
        {"id": "item-9", "canonical": "He said that he could not take that schedule then.", "accepted": ["He said that he could not take that schedule then.", "She said that she could not take that schedule then."], "evidence": "I cannot take this schedule now..", "rationale": "Backshift can to could and now to then."},
    ], source_evidence=["A. Write the correct reported speech for each sentence. Follow the example."], rationale="Where the source does not name a reporting speaker or listener, retain pronoun variants instead of inventing a single context."),
    )
    _set(42, 14, _listening("u42-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(42, 15, _extraction("u42-s15-c", "Extract reported-speech sentences and identify what each reports.", {
        "reported-finding": ["The chief of the department said that they had discovered a piece of evidence"],
        "reported-claim": ["Mr. Smith ... told the press they had sustained an affair", "he had found a note from his lover saying, and we quote, He knows"],
        "reported-intention": ["he said that he would not stop until getting the responsible one"],
        "reported-confession": ["told the police he had done it because she said she loved him"],
    }, "She said she loved me ... The chief ... said that they had discovered ... he said that he would not stop ...", "Preserve exact reported-speech excerpts and identify their source event, claim, intention or confession."))
    _set(42, 16, _open("u42-s16-d", "Tell a remembered story and write a 120–160 word news report.", "D. Tell your teacher a story / gossip... E. Write an 120-160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use reported speech."]))

    _set(43, 13, _item("u43-s13-a", "Supply statements plus tag questions for each clause.", kind="tag-question", answer_items=[
        {"id": "item-1", "canonical": "You have visited Spain, haven’t you?", "accepted": ["You have visited Spain, haven't you?"], "evidence": "Have you visited Spain?"},
        {"id": "item-2", "canonical": "You will call the principal of the school, won’t you?", "accepted": ["You will call the principal of the school, won't you?"], "evidence": "Will you call the principal of the school?"},
        {"id": "item-3", "canonical": "They were eating at the park, weren’t they?", "accepted": ["They were eating at the park, weren't they?"], "evidence": "Were they eating at the park?"},
        {"id": "item-4", "canonical": "Tina had already finished the project, hadn’t she?", "accepted": ["Tina had already finished the project, hadn't she?"], "evidence": "Had Tina already finished the project?"},
        {"id": "item-5", "canonical": "She would let us know quickly, wouldn’t she?", "accepted": ["She would let us know quickly, wouldn't she?"], "evidence": "Would she let us know quickly?"},
        {"id": "item-6", "canonical": "I am the youngest here, aren’t I?", "accepted": ["I am the youngest here, aren't I?"], "evidence": "I am the youngest here."},
        {"id": "item-7", "canonical": "Call the headmaster tonight, will you?", "accepted": ["Call the headmaster tonight, will you?"], "evidence": "Please, call the headmaster tonight."},
        {"id": "item-8", "canonical": "Let’s go out and eat something, shall we?", "accepted": ["Let's go out and eat something, shall we?"], "evidence": "Let’s go out and eat something."},
        {"id": "item-9", "canonical": "Everyone is ready for the party, aren’t they?", "accepted": ["Everyone is ready for the party, aren't they?"], "evidence": "Is everyone ready for the party?"},
    ], source_evidence=["A. Write the corresponding statement with its tag questions for each of the clauses listed."], rationale="Use opposite polarity, preserve the tense auxiliary, apply aren’t I for I am, will you for imperatives and shall we for let’s."),
    )
    _set(43, 14, _listening("u43-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(43, 15, _extraction("u43-s15-c", "Extract tag questions and identify their discourse function.", {
        "checking-agreement": ["You know what it means, don’t you?", "It would be definitely amazing ... wouldn’t it?", "most people are exposed to two languages ... will it?"],
        "seeking-confirmation": ["there are many who think that just attending lessons is enough, don’t they?", "learning a language means so much more than coming to class, doesn’t it?"],
    }, "You know what it means, don’t you? ... wouldn’t it? ... don’t they? ... doesn’t it?", "Tag questions in the reading seek agreement or confirmation; preserve the source's unusual missing punctuation as evidence, not as a new answer."))
    _set(43, 16, _open("u43-s16-d", "Discuss the reading topic and write a 120–160 word perspective.", "D. Tell your opinion about the topic... E. Write a 120-160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use tag questions and future/past perspectives."]))

    _set(44, 13, _item("u44-s13-a", "Convert each sentence to passive voice.", kind="passive-voice", answer_items=[
        {"id": "item-1", "canonical": "All the ingredients for the cake will be bought by you.", "accepted": ["All the ingredients for the cake will be bought by you.", "All the ingredients for the cake will be bought."], "evidence": "You will buy all the ingredients for the cake."},
        {"id": "item-2", "canonical": "Lunch is being prepared by me.", "accepted": ["Lunch is being prepared by me.", "Lunch is being prepared."], "evidence": "I am preparing lunch for my family."},
        {"id": "item-3", "canonical": "The report has been worked on for days.", "accepted": ["The report has been worked on for days."], "evidence": "The have worked in the report for days.", "status": "source-ambiguous", "rationale": "The source says ‘The have worked’; this repairs it as ‘They have worked’ before applying a passive construction."},
        {"id": "item-4", "canonical": "A house in Miami was being bought by Jake and Jill.", "accepted": ["A house in Miami was being bought by Jake and Jill.", "A house in Miami was being bought."], "evidence": "Jake and Jill were buying a house in Miami."},
        {"id": "item-5", "canonical": "My house is normally cleaned twice a week by me.", "accepted": ["My house is normally cleaned twice a week by me.", "My house is normally cleaned twice a week."], "evidence": "I normally clean my house twice a week."},
        {"id": "item-6", "canonical": "Josh’s family is usually called by him on Saturdays.", "accepted": ["Josh's family is usually called by him on Saturdays.", "Josh's family is usually called on Saturdays."], "evidence": "Josh usually calls his family on Saturdays."},
        {"id": "item-7", "canonical": "The fabric was made elastic by the factory.", "accepted": ["The fabric was made elastic by the factory.", "The fabric was made elastic."], "evidence": "The factory made the fabric elastic."},
        {"id": "item-8", "canonical": "The yacht had been bought before Christmas by us.", "accepted": ["The yacht had been bought before Christmas by us.", "The yacht had been bought before Christmas."], "evidence": "We had bought the yacht before Christmas."},
        {"id": "item-9", "canonical": "The paper was finally finished last night by them.", "accepted": ["The paper was finally finished last night by them.", "The paper was finally finished last night."], "evidence": "They finally finished the paper last night."},
    ], source_evidence=["A. Write the corresponding passive voice for each of the sentences listed."], rationale="Preserve tense/aspect and object-to-subject movement; retain optional by-phrases and source ambiguity."),
    )
    _set(44, 14, _listening("u44-s14-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(44, 15, _extraction("u44-s15-c", "Extract passive-voice sentences and identify their functions.", {
        "passive-event-or-result": ["it's been hit by the global financial crisis and the recent spate of piracy attacks", "vessels are diverted", "If borne out by official data", "has been badly hit by recession", "was the lowest temperature recorded in Ta Kwu Ling", "the average temperature recorded in the urban areas was 10 degrees"],
    }, "Hong Kong on The Loop ... it's been hit ... vessels are diverted ... If borne out ... has been badly hit ...", "Only list passive constructions present in the published article; do not normalize its news-report wording."))
    _set(44, 16, _open("u44-s16-d", "Discuss global crises and write a 120–160 word invention/crisis text.", "D. Based on the topic... E. Write an 120-160 word text...", kind="roleplay-and-writing", constraints=["120–160 words; use passive voice."]))


_seed_upper_reviews()


def _seed_final_reviews() -> None:
    """Record the common published exercise shape in Units 45–56.

    These decks are article-led.  The source exposes open production prompts
    and listening icons but no transcript.  Keep those activities available to
    a teacher instead of inventing answer keys from the article topic.
    """

    _set(
        45,
        12,
        _open(
            "u45-s12-a",
            "Complete the missing phrases from the source exercise.",
            "A. Complete the sentences with the missing phrases shown on the published slide.",
            kind="grammar-fill",
            constraints=["The published slide omits enough context to determine a unique phrase; retain the source word bank and teacher review."],
        ),
    )
    _set(45, 13, _listening("u45-s13-b", "B. Listen to the audio and answer teacher questions.", "B. Listen to the audio and answer the questions your teacher makes."))
    _set(
        45,
        14,
        _open(
            "u45-s14-c",
            "Read the first part of the article and discuss its ideas with your teacher.",
            "C. Read the article and answer or discuss the questions with your teacher.",
            kind="reading-discussion",
            constraints=["Use the published article as evidence; do not auto-grade discussion responses."],
        ),
    )
    _set(
        45,
        15,
        _open(
            "u45-s15-d",
            "Continue the article task and discuss the source claims.",
            "D. Continue reading and discuss the questions with your teacher.",
            kind="reading-discussion",
            constraints=["Preserve the article's claims and source wording."],
        ),
    )
    _set(45, 16, _open("u45-s16-e", "Complete the final role-play or writing activity.", "E. Complete the final activity on the published slide.", kind="roleplay-and-writing"))

    for unit in range(46, 57):
        _set(
            unit,
            12,
            _open(
                f"u{unit:02d}-s12-a",
                "Complete the grammar practice shown on the published slide.",
                "A. Complete the grammar exercise on the published slide.",
                kind="grammar-production",
                constraints=["The source presents learner-generated practice; keep it open response."],
            ),
        )
        _set(
            unit,
            13,
            _listening(
                f"u{unit:02d}-s13-b",
                "Listen to the audio and answer teacher questions.",
                "B. Listen to the audio and answer the questions your teacher makes.",
            ),
        )
        _set(
            unit,
            14,
            _open(
                f"u{unit:02d}-s14-c",
                "Read the article and discuss its questions with your teacher.",
                "C. Read the article and answer or discuss the questions with your teacher.",
                kind="reading-discussion",
                constraints=["Use the published article as evidence; do not auto-grade discussion responses."],
            ),
        )
        _set(
            unit,
            15,
            _open(
                f"u{unit:02d}-s15-d",
                "Complete the role-play or writing activity shown on the published slide.",
                "D. Complete the final activity on the published slide.",
                kind="roleplay-and-writing",
                constraints=["Preserve the published word count and prompt when the builder imports this review."],
            ),
        )


_seed_final_reviews()


def _source_slide(slide: Mapping[str, Any]) -> dict[str, Any]:
    """Copy only source facts needed to audit an exercise.

    Rendered slide images and native ZIP bytes stay in the separate source
    audit.  This file remains small and content-only while retaining the
    published visible text, links, tables and media counts as evidence.
    """

    result: dict[str, Any] = {
        "number": int(slide["number"]),
        "title": slide.get("title", ""),
        "visibleTexts": list(slide.get("visibleTexts", [])),
        "links": list(slide.get("links", [])),
        "tables": list(slide.get("tables", [])),
        "mediaSummary": dict(slide.get("mediaSummary", {})),
    }
    warnings = list(slide.get("warnings", []))
    if warnings:
        result["warnings"] = warnings
    return result


def _default_review(unit: int, slide: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Classify uncovered exercise slides without closing their answers."""

    number = int(slide["number"])
    source_text = _text(slide)
    evidence = source_text or str(slide.get("title", ""))
    media_summary = slide.get("mediaSummary", {})
    has_audio = bool(media_summary.get("audioIconCount") or media_summary.get("audioUrls"))

    if has_audio or LISTENING_RE.search(source_text):
        return [_listening(f"u{unit:02d}-s{number:02d}-review", source_text or "Listen to the published audio activity.", evidence)]
    if number < 12:
        return []
    if re.search(r"let.?s practice|practice makes perfect|^\s*\d+\s*$", source_text, re.IGNORECASE) and not re.search(r"\b[A-E]\.", source_text):
        return []
    # Slide 12 is often a language-target reference page before the actual A/B
    # exercise on slide 13 or 14.  Keep it as source material, not an answer
    # item, unless it contains an exercise label.
    if number == 12 and not re.search(r"\b[A-E]\.|\(T\).*\(F\)", source_text):
        return []
    # Some published articles continue on a second slide with only body text
    # and a link.  Preserve that continuation as teacher-reviewed reading.
    if slide.get("links") and len(source_text) > 120:
        return [
            _open(
                f"u{unit:02d}-s{number:02d}-review",
                "Continue reading the published article and discuss its claims with your teacher.",
                evidence,
                kind="reading-continuation",
                constraints=["Use the linked published article as the source; do not auto-grade discussion responses."],
            )
        ]
    if "T)" in source_text and "F)" in source_text:
        return [
            _item(
                f"u{unit:02d}-s{number:02d}-review",
                source_text,
                kind="reading-true-false",
                response_mode="multiple-choice",
                source_evidence=[evidence],
                status="source-needs-manual-key",
                blocker="The published slide contains closed true/false prompts but this audit has no source-backed statement answers yet.",
                doNotAutoGrade=True,
            )
        ]
    if GRAMMAR_RE.search(source_text):
        return [
            _item(
                f"u{unit:02d}-s{number:02d}-review",
                source_text,
                kind="grammar-review-needed",
                response_mode="typed-short-answer",
                source_evidence=[evidence],
                status="source-needs-manual-key",
                blocker="The source gives a grammar exercise, but a deterministic item-level key was not authored in this review.",
                doNotAutoGrade=True,
            )
        ]
    if EXTRACTION_RE.search(source_text):
        return [
            _item(
                f"u{unit:02d}-s{number:02d}-review",
                source_text,
                kind="reading-function-extraction",
                response_mode="teacher-reviewed-extraction",
                source_evidence=[evidence],
                status="source-needs-manual-key",
                blocker="The source asks for extraction or classification; accepted excerpts require teacher review.",
                doNotAutoGrade=True,
            )
        ]
    if OPEN_RE.search(source_text):
        return [_open(f"u{unit:02d}-s{number:02d}-review", source_text, evidence)]
    return [
        _item(
            f"u{unit:02d}-s{number:02d}-review",
            source_text,
            kind="source-review-needed",
            response_mode="typed-short-answer",
            source_evidence=[evidence],
            status="source-needs-manual-key",
            blocker="No deterministic answer key was added without a source-backed item interpretation.",
            doNotAutoGrade=True,
        )
    ]


def build_review(manifest: Mapping[str, Any]) -> dict[str, Any]:
    """Build lesson-id/slide-number review JSON from the published manifest."""

    lessons: dict[str, Any] = {}
    counts = {
        "lessons": 0,
        "slides": 0,
        "exerciseSlides": 0,
        "items": 0,
        "explicitAnswerItems": 0,
        "listeningBlockedItems": 0,
        "openResponseItems": 0,
        "sourceNeedsManualKeyItems": 0,
        "sourceAmbiguousAnswerItems": 0,
    }

    for source in manifest.get("sources", []):
        unit = _unit_for(source)
        lesson = source["lesson"]
        deck = source.get("deck", {})
        slide_reviews: dict[str, Any] = {}
        for slide in deck.get("slides", []):
            number = int(slide["number"])
            if TERMINAL_RE.search(_text(slide)) or TERMINAL_RE.search(str(slide.get("title", ""))):
                continue
            # Intro/title slides are source evidence but not exercise records.
            reviews = MANUAL.get((unit, number))
            if reviews is None:
                reviews = _default_review(unit, slide)
            if not reviews:
                continue
            copied_items = [dict(item) for item in reviews]
            slide_reviews[str(number)] = {
                "source": _source_slide(slide),
                "items": copied_items,
            }
            counts["exerciseSlides"] += 1
            counts["items"] += len(copied_items)
            for item in copied_items:
                if item.get("answerItems"):
                    counts["explicitAnswerItems"] += len(item["answerItems"])
                status = str(item.get("reviewStatus", ""))
                if status == "blocked-awaiting-transcript":
                    counts["listeningBlockedItems"] += 1
                if status == "open-response-preserved":
                    counts["openResponseItems"] += 1
                if status == "source-needs-manual-key":
                    counts["sourceNeedsManualKeyItems"] += 1
                if any(answer.get("status") == "source-ambiguous" for answer in item.get("answerItems", [])):
                    counts["sourceAmbiguousAnswerItems"] += 1

        lesson_id = str(lesson["id"])
        lessons[lesson_id] = {
            "unit": unit,
            "moduleId": source["module"]["id"],
            "moduleOrder": source["module"]["order"],
            "moduleTitle": source["module"]["title"],
            "lessonOrder": lesson["order"],
            "lessonTitle": lesson["title"],
            "videoUrl": lesson.get("videoUrl"),
            "sourceUrl": source.get("sourceUrl"),
            "deckTitle": deck.get("deckTitle"),
            "slideCount": deck.get("slideCount"),
            "slides": slide_reviews,
        }
        counts["lessons"] += 1
        counts["slides"] += len(deck.get("slides", []))

    return {
        "schemaVersion": 1,
        "courseId": manifest.get("courseId"),
        "sourcePolicy": {
            "authoritativeSource": "published Google Slides manifest",
            "audio": "No listening answer is inferred without a transcript; audio activities remain teacher-listening.",
            "openResponses": "Published role-play, writing, personalized and multi-valid prompts remain open response.",
            "closedResponses": "Closed grammar and reading items receive explicit answerItems only when source evidence makes them deterministic.",
            "builderContract": "Consumers may map builderHints._explicit_answer_key and builderHints._explicit_options; answerItems remain the review source of truth.",
        },
        "counts": counts,
        "lessons": lessons,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    output = build_review(manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["counts"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
