"""Align published listening prompts with reviewed course-audio transcripts.

This is an audit-only adapter. It reads the published exercise review and the
transcript aggregate, then writes a review index. It never edits the source
exercise archive or creates/replaces audio. Audio assignment is based on
published slide context: the opening listening is normally Audio 1 and a
later comprehension listening is normally Audio 2. Teacher-led vocabulary
and role-play prompts stay blocked when the published source has no matching
audio, and the Unit 3 generic file remains a review candidate rather than a
substitute for its missing explicit Audio 1.
"""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
DEFAULT_OUTPUT = Path("docs/audit/course-listening-review.json")
DEFAULT_REVIEWED_EXERCISES_OUTPUT = Path("docs/audit/reviewed-listening-exercises.json")
DEFAULT_AUTHORED_03_15_OUTPUT = Path("docs/audit/listening-authored-03-15.json")
DEFAULT_EXERCISE_REVIEW = Path("docs/audit/course-exercise-review.json")
DEFAULT_TRANSCRIPTS = Path("docs/audit/course-audio-transcripts/course-audio-transcripts.json")

EXPLICIT_INDEX_RE = re.compile(r"(?i)\baudio\s*(?:number|#)?\s*([123])\b")
TF_MARKER_RE = re.compile(r"(?i)\(\s*t\s*\).*?\(\s*f\s*\)|\btrue\s+or\s+false\b")
NUMBERED_CLAIM_RE = re.compile(r"(?:^|\s)(\d+)\.\s*(.+?)(?=\s+\d+\.\s*|$)")
WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "do",
    "does",
    "for",
    "he",
    "her",
    "him",
    "his",
    "i",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "she",
    "that",
    "the",
    "their",
    "them",
    "they",
    "this",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "who",
    "with",
    "you",
    "your",
}
NEGATION_WORDS = {
    "cannot",
    "can't",
    "didn't",
    "doesn't",
    "don't",
    "hardly",
    "never",
    "no",
    "not",
    "nothing",
    "won't",
}
TOKEN_ALIASES = {
    "am": "be",
    "are": "be",
    "called": "call",
    "comes": "come",
    "coming": "come",
    "dad": "father",
    "dads": "father",
    "did": "do",
    "does": "do",
    "doing": "do",
    "fathers": "father",
    "has": "have",
    "having": "have",
    "is": "be",
    "kids": "kid",
    "lives": "live",
    "mothers": "mother",
    "mom": "mother",
    "moms": "mother",
    "parents": "parent",
    "speaks": "speak",
    "talking": "talk",
    "wants": "want",
}
OPPOSITE_TERMS = {
    "visit": {"work"},
    "work": {"visit"},
}


# These questions are intentionally authored from clear Audio 2 facts instead
# of being generated from ASR sentence fragments.  The evidence is checked
# against the source transcript when the audit artifact is built.
MANUAL_AUTHORED_03_15: dict[int, list[dict[str, Any]]] = {
    3: [
        {
            "prompt": "What does the speaker do after breakfast?",
            "options": ["Take a shower", "Go to the gym", "Go to bed", "Start work"],
            "correct": "Take a shower",
            "evidence": "I wake up very early in the morning, have breakfast and I take a shower.",
        },
        {
            "prompt": "How does the speaker travel to work?",
            "options": ["By bus", "By train", "By bicycle", "By taxi"],
            "correct": "By bus",
            "evidence": "After that, I go out to take the bus and go to work.",
        },
        {
            "prompt": "What time does the speaker usually finish work?",
            "options": ["5 p.m.", "8 a.m.", "Noon", "8 p.m."],
            "correct": "5 p.m.",
            "evidence": "I arrive at 8 o'clock and I usually finish at 5 p.m.",
        },
        {
            "prompt": "What does the speaker do on Thursdays?",
            "options": ["Go to the gym", "Visit family", "Cook dinner", "Study at home"],
            "correct": "Go to the gym",
            "evidence": "On Thursdays, I always go to the gym.",
        },
    ],
    4: [
        {
            "prompt": "How old is the speaker?",
            "options": ["28 years old", "18 years old", "38 years old", "48 years old"],
            "correct": "28 years old",
            "evidence": "My name is Dylan and I'm 28 years old.",
        },
        {
            "prompt": "What does the speaker love doing?",
            "options": ["Cooking", "Dancing", "Running", "Painting"],
            "correct": "Cooking",
            "evidence": "That is why I love cooking",
        },
        {
            "prompt": "Which food is the speaker a big fan of?",
            "options": ["Pasta", "Rice", "Soup", "Salad"],
            "correct": "Pasta",
            "evidence": "I'm a big fan of pasta, but I'm not fond of rice",
        },
        {
            "prompt": "Which food is the speaker not fond of?",
            "options": ["Rice", "Pasta", "Desserts", "Bread"],
            "correct": "Rice",
            "evidence": "I'm a big fan of pasta, but I'm not fond of rice",
        },
    ],
    5: [
        {
            "prompt": "How many brothers does the speaker have?",
            "options": ["Three", "Two", "Four", "Five"],
            "correct": "Three",
            "evidence": "I have three brothers and two sisters.",
        },
        {
            "prompt": "Where do the speaker's parents work?",
            "options": ["At the family restaurant", "At a school", "At a hospital", "At a bank"],
            "correct": "At the family restaurant",
            "evidence": "They work in our family's restaurant.",
        },
        {
            "prompt": "Who lives with the speaker's family?",
            "options": ["Their grandfather", "Their uncle", "Their teacher", "Their neighbor"],
            "correct": "Their grandfather",
            "evidence": "Our grandfather lives with us.",
        },
        {
            "prompt": "How old is the speaker's grandfather?",
            "options": ["70 years old", "60 years old", "50 years old", "80 years old"],
            "correct": "70 years old",
            "evidence": "His name is Jared and he is 70 years old.",
        },
    ],
    6: [
        {
            "prompt": "How old is Julio?",
            "options": ["26 years old", "16 years old", "36 years old", "46 years old"],
            "correct": "26 years old",
            "evidence": "He is 26 years old, and he works for the fast-food restaurant chain.",
        },
        {
            "prompt": "What kind of business does Julio work for?",
            "options": ["A fast-food restaurant chain", "A travel agency", "A clothing store", "A school"],
            "correct": "A fast-food restaurant chain",
            "evidence": "He is 26 years old, and he works for the fast-food restaurant chain.",
        },
        {
            "prompt": "Which places does Julio administer?",
            "options": ["A hotel and a bar", "A school and a bank", "A shop and a theater", "A clinic and a library"],
            "correct": "A hotel and a bar",
            "evidence": "Also, he administrates the hotel and a bar.",
        },
        {
            "prompt": "Why is Julio described as organized?",
            "options": ["He manages more than one business", "He arrives early", "He studies every night", "He travels for work"],
            "correct": "He manages more than one business",
            "evidence": "He's a very organized person because he manages more than one business.",
        },
    ],
    7: [
        {
            "prompt": "What is no longer available at home?",
            "options": ["Milk", "Sugar", "Cheese", "Apples"],
            "correct": "Milk",
            "evidence": "Hey man, there's no milk left.",
        },
        {
            "prompt": "What do they have only a small amount of?",
            "options": ["Sugar", "Milk", "Cheese", "Oranges"],
            "correct": "Sugar",
            "evidence": "We don't have much sugar.",
        },
        {
            "prompt": "What food do they also need?",
            "options": ["Cheese", "Rice", "Bread", "Chicken"],
            "correct": "Cheese",
            "evidence": "And we need some cheese too.",
        },
        {
            "prompt": "What fruit do they need to buy?",
            "options": ["Oranges", "Apples", "Bananas", "Grapes"],
            "correct": "Oranges",
            "evidence": "But we need oranges.",
        },
    ],
    8: [
        {
            "prompt": "What does the speaker say about the father's car?",
            "options": ["It is his father's car", "It belongs to his brother", "It is at the shop", "It is a rental car"],
            "correct": "It is his father's car",
            "evidence": "That is his father's car.",
        },
        {
            "prompt": "How often does the speaker drive the mother's car?",
            "options": ["Sometimes", "Every day", "Only on Sundays", "Never"],
            "correct": "Sometimes",
            "evidence": "So I only drive it sometimes not always",
        },
        {
            "prompt": "When does the brother lend his car?",
            "options": ["On Fridays only", "Every morning", "On weekends", "Once a month"],
            "correct": "On Fridays only",
            "evidence": "But he lent it to me on Fridays only",
        },
        {
            "prompt": "Where do they plan to take the car?",
            "options": ["To a party", "To school", "To the supermarket", "To the beach"],
            "correct": "To a party",
            "evidence": "so can we take that car to Marsha's party on Friday?",
        },
    ],
    9: [
        {
            "prompt": "Where is the speaker when asking for directions?",
            "options": ["Downtown", "At the airport", "At home", "At the museum"],
            "correct": "Downtown",
            "evidence": "I'm downtown and I need to get to the Science Museum.",
        },
        {
            "prompt": "What landmark is across from the speaker?",
            "options": ["The public library", "The Science Museum", "Green Park", "The train station"],
            "correct": "The public library",
            "evidence": "I'm on the corner of the main avenue, just across the public library.",
        },
        {
            "prompt": "How many blocks should the traveler walk before turning left?",
            "options": ["Two blocks", "One block", "Three blocks", "Four blocks"],
            "correct": "Two blocks",
            "evidence": "Go to the library and walk two blocks to your right, and then turn left.",
        },
        {
            "prompt": "What will the traveler see before reaching the Science Museum?",
            "options": ["Green Park", "The public library", "A theater", "A train station"],
            "correct": "Green Park",
            "evidence": "You will see the great Green Park.",
        },
    ],
    10: [
        {
            "prompt": "Where is Andrew from?",
            "options": ["Galway, Ireland", "Dublin, Ireland", "London, England", "Paris, France"],
            "correct": "Galway, Ireland",
            "evidence": "I'm from Galway, Ireland.",
        },
        {
            "prompt": "How is Galway described?",
            "options": ["A beautiful city", "A noisy village", "A modern capital", "A small island"],
            "correct": "A beautiful city",
            "evidence": "Galway is a beautiful city.",
        },
        {
            "prompt": "What kind of square does Galway have?",
            "options": ["An ancient square", "A modern square", "A sports square", "A shopping square"],
            "correct": "An ancient square",
            "evidence": "It has an ancient square named Er",
        },
        {
            "prompt": "What forms part of Galway's history?",
            "options": ["Medieval walls", "A modern tower", "A large airport", "A shopping center"],
            "correct": "Medieval walls",
            "evidence": "there are some medieval walls as part of our history.",
        },
    ],
    11: [
        {
            "prompt": "How is Rome described?",
            "options": ["A beautiful city", "A quiet village", "A small island", "A modern suburb"],
            "correct": "A beautiful city",
            "evidence": "Rome is a beautiful city",
        },
        {
            "prompt": "Which city is bigger and has more places to visit?",
            "options": ["Rome", "Vienna", "Santorini", "None of them"],
            "correct": "Rome",
            "evidence": "Rome is bigger and it has more places to visit",
        },
        {
            "prompt": "Which city is more picturesque and colorful?",
            "options": ["Vienna", "Rome", "Santorini", "None of them"],
            "correct": "Vienna",
            "evidence": "Vienna is more picturesque and colorful",
        },
        {
            "prompt": "Which place is said to be more beautiful than Rome and Vienna?",
            "options": ["Santorini", "Vienna", "Rome", "The countryside"],
            "correct": "Santorini",
            "evidence": "Santorini is way more beautiful than these two cities",
        },
    ],
    12: [
        {
            "prompt": "How is Tokyo described in terms of size?",
            "options": ["One of the biggest cities in the world", "The smallest city in Japan", "A small village", "A new suburb"],
            "correct": "One of the biggest cities in the world",
            "evidence": "Tokyo is one of the biggest city in the world",
        },
        {
            "prompt": "How is Tokyo described in terms of cost?",
            "options": ["One of the most expensive", "The cheapest", "Free to visit", "Inexpensive for everyone"],
            "correct": "One of the most expensive",
            "evidence": "Indeed but one of the most expensive too.",
        },
        {
            "prompt": "What can visitors see from Tokyo Tower?",
            "options": ["The entire city", "Only the airport", "A single street", "The inside of a castle"],
            "correct": "The entire city",
            "evidence": "You can see the entire city from there.",
        },
        {
            "prompt": "What does the speaker say about the castle?",
            "options": ["It has a lot of history", "It has no history", "It is a restaurant", "It is outside Tokyo"],
            "correct": "It has a lot of history",
            "evidence": "No way how about the Shugun Castle? It is the most amazing place to go. It has a lot of history in it.",
        },
    ],
    13: [
        {
            "prompt": "Is it raining right now?",
            "options": ["No, it is not raining", "Yes, it is raining heavily", "Only at night", "The speakers do not know"],
            "correct": "No, it is not raining",
            "evidence": "No, it looks like, but it's not raining right now.",
        },
        {
            "prompt": "What is the weather like now?",
            "options": ["Cloudy", "Snowy", "Sunny", "Windy"],
            "correct": "Cloudy",
            "evidence": "Okay, so it's cloudy now.",
        },
        {
            "prompt": "What is the speaker correcting?",
            "options": ["Some exams", "A recipe", "A map", "A report"],
            "correct": "Some exams",
            "evidence": "Well, I'm correcting some exams.",
        },
        {
            "prompt": "What does the speaker like doing in the rain?",
            "options": ["Running", "Cooking", "Reading", "Driving"],
            "correct": "Running",
            "evidence": "Oh, I like running under the rain.",
        },
    ],
    14: [
        {
            "prompt": "When did the speakers go to Montreal?",
            "options": ["Last week", "Yesterday", "Last month", "Last year"],
            "correct": "Last week",
            "evidence": "Yes! We went to Montreal last week.",
        },
        {
            "prompt": "Where did they stay the night they arrived?",
            "options": ["At home", "At a restaurant", "At a hotel", "At a festival"],
            "correct": "At home",
            "evidence": "Well, we stayed all night at home the day we arrived.",
        },
        {
            "prompt": "What did they have during their visit?",
            "options": ["Delicious meals", "A long meeting", "A train ride", "A cooking class"],
            "correct": "Delicious meals",
            "evidence": "Anyhow, we had a great time and had delicious meals.",
        },
        {
            "prompt": "What do they plan to visit?",
            "options": ["The festival", "The restaurant", "The museum", "The hotel"],
            "correct": "The festival",
            "evidence": "Fantastic! When are we visiting it? The restaurant or the festival? The festival.",
        },
    ],
    15: [
        {
            "prompt": "What did they use to play in?",
            "options": ["A big tractor wheel", "A swimming pool", "A tree house", "A school yard"],
            "correct": "A big tractor wheel",
            "evidence": "we used to play in the big tractor wheel",
        },
        {
            "prompt": "What did they use to do before running away?",
            "options": ["Ring doorbells", "Hide in a store", "Ride bicycles", "Play music"],
            "correct": "Ring doorbells",
            "evidence": "we used to ring doorbells and run away.",
        },
        {
            "prompt": "How does the speaker describe those moments?",
            "options": ["Nice", "Difficult", "Boring", "Dangerous"],
            "correct": "Nice",
            "evidence": "Those were nice moments, weren't they?",
        },
        {
            "prompt": "What does the speaker wish?",
            "options": ["For those days to come back", "For a new car", "For more homework", "For a different job"],
            "correct": "For those days to come back",
            "evidence": "I wish those days to come back",
        },
    ],
}


class ListeningReviewError(ValueError):
    """Raised when an audit input does not satisfy the expected contract."""


def _read_json(path: Path, description: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ListeningReviewError(f"could not read {description} {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ListeningReviewError(f"{description} must be a JSON object")
    return payload


def _unit(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ListeningReviewError("lesson unit must be an integer")
    return value


def _slide_number(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ListeningReviewError(f"slide number is not an integer: {value!r}") from exc


def _text_blob(slide: Mapping[str, Any], item: Mapping[str, Any]) -> str:
    source = slide.get("source") if isinstance(slide.get("source"), Mapping) else {}
    visible = source.get("visibleTexts") if isinstance(source.get("visibleTexts"), list) else []
    parts = [str(source.get("title", "")), *[str(value) for value in visible], str(item.get("prompt", ""))]
    return " ".join(part for part in parts if part).strip()


def _source_audio_count(slide: Mapping[str, Any]) -> int:
    source = slide.get("source") if isinstance(slide.get("source"), Mapping) else {}
    media = source.get("mediaSummary") if isinstance(source.get("mediaSummary"), Mapping) else {}
    value = media.get("audioIconCount", 0)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0


def _normalise_prompt(value: str) -> str:
    # Emojis and source labels are presentation noise. Keeping words makes
    # duplicated parser records (for example Unit 4 slide 4/5) share audio.
    return " ".join(WORD_RE.findall(value.casefold()))


def _explicit_audio_index(text: str) -> int | None:
    match = EXPLICIT_INDEX_RE.search(text)
    return int(match.group(1)) if match else None


def _role(slide_number: int, text: str) -> str:
    lower = text.casefold()
    if "listen to your teacher" in lower and not any(
        token in lower for token in ("listen to the audio", "listen to an audio", "listen to the conversation")
    ):
        if any(token in lower for token in ("repeat", "vocabulary", "words", "phrases", "expressions")):
            return "vocabulary-repeat"
        return "teacher-roleplay"
    # The first listening in a lesson is the opening/topic activity even when
    # its question says "answer" or "tell your teacher" rather than naming
    # the topic explicitly.
    if slide_number <= 5:
        return "intro"
    if any(
        token in lower
        for token in ("answer", "complete", "extract", "identify", "classify", "report", "listen to ")
    ):
        return "comprehension"
    if slide_number <= 5:
        return "intro"
    return "other-audio"


def _extract_tf_claims(visible_texts: Sequence[Any]) -> list[str]:
    combined = " ".join(str(value) for value in visible_texts)
    marker = TF_MARKER_RE.search(combined)
    if not marker:
        return []
    # Parse numbered statements from the full slide text. Starting at the
    # first answer marker would discard statement 1 because its marker comes
    # after the statement text.
    tail = re.sub(r"(?i)\(\s*t\s*\)|\(\s*f\s*\)", "", combined)
    claims: list[tuple[int, str]] = []
    for match in NUMBERED_CLAIM_RE.finditer(tail):
        claim = " ".join(match.group(2).split()).strip(" .")
        if claim:
            claims.append((int(match.group(1)), claim))
    return [claim for _, claim in sorted(claims)]


def _tokens(value: str, *, keep_negation: bool = False) -> list[str]:
    result: list[str] = []
    for raw in WORD_RE.findall(value.casefold()):
        token = TOKEN_ALIASES.get(raw, raw)
        if token in NEGATION_WORDS:
            if keep_negation:
                result.append(token)
            continue
        if token in STOP_WORDS:
            continue
        result.append(token)
    return result


def _has_sequence(haystack: Sequence[str], needle: Sequence[str], *, gap: int = 2) -> bool:
    if not needle:
        return False
    if len(needle) == 1:
        return False
    for start, value in enumerate(haystack):
        if value != needle[0]:
            continue
        cursor = start
        matched = 1
        for target in needle[1:]:
            found = False
            for index in range(cursor + 1, min(len(haystack), cursor + gap + 2)):
                if haystack[index] == target:
                    cursor = index
                    matched += 1
                    found = True
                    break
            if not found:
                break
        if matched == len(needle):
            return True
    return False


def _evidence_segment(transcript: Mapping[str, Any], claim: str) -> str | None:
    claim_tokens = _tokens(claim)
    if len(claim_tokens) < 2:
        return None
    for segment in transcript.get("segments", []):
        if not isinstance(segment, Mapping):
            continue
        text = str(segment.get("text", ""))
        if _has_sequence(_tokens(text), claim_tokens) or _has_sequence(
            _tokens(text), [TOKEN_ALIASES.get(token, token) for token in claim_tokens]
        ):
            return text.strip() or None
    # A pronoun or tense variation may prevent a segment-local match. A
    # document-level phrase is still useful as review evidence.
    if _has_sequence(_tokens(str(transcript.get("text", ""))), claim_tokens):
        return str(transcript.get("text", "")).strip() or None
    return None


def _opposition_evidence(transcript: Mapping[str, Any], claim_tokens: Sequence[str]) -> str | None:
    """Find a narrow, shared-anchor contradiction such as USA/work vs USA/visit."""

    segments = [segment for segment in transcript.get("segments", []) if isinstance(segment, Mapping)]
    for segment in segments:
        if not isinstance(segment, Mapping):
            continue
        text = str(segment.get("text", ""))
        segment_tokens = _tokens(text)
        shared = set(claim_tokens) & set(segment_tokens)
        if not shared:
            continue
        for claim_token in claim_tokens:
            opposites = OPPOSITE_TERMS.get(claim_token, set())
            if opposites & set(segment_tokens):
                return text.strip() or None
    # Some short dialogues state the shared context and the opposing purpose
    # in adjacent segments (for example USA/work versus visit). Preserve the
    # conservative shared-anchor requirement at document level.
    all_tokens = _tokens(str(transcript.get("text", "")))
    if set(claim_tokens) & set(all_tokens):
        for claim_token in claim_tokens:
            opposites = OPPOSITE_TERMS.get(claim_token, set())
            if opposites & set(all_tokens):
                for segment in segments:
                    segment_tokens = _tokens(str(segment.get("text", "")))
                    if opposites & set(segment_tokens):
                        return str(segment.get("text", "")).strip() or None
    return None


def resolve_tf_claim(claim: str, transcript: Mapping[str, Any]) -> dict[str, Any]:
    """Resolve only direct transcript support/contradiction.

    A missing relation remains ``not-stated``. The resolver deliberately does
    not turn a missing detail into ``false``; a teacher or editor can review
    the source evidence later.
    """

    claim_tokens = _tokens(claim)
    transcript_text = str(transcript.get("text", ""))
    transcript_tokens = _tokens(transcript_text)
    transcript_tokens_with_negation = _tokens(transcript_text, keep_negation=True)
    claim_with_negation = _tokens(claim, keep_negation=True)
    claim_is_negative = any(token in NEGATION_WORDS for token in claim_with_negation)
    support = _has_sequence(transcript_tokens, claim_tokens)
    evidence = _evidence_segment(transcript, claim)

    if support:
        if claim_is_negative:
            return {
                "correct": "false",
                "resolution": "contradicted",
                "evidence": evidence,
                "evidenceType": "transcript-contradiction",
                "manualReview": False,
            }
        return {
            "correct": "true",
            "resolution": "supported",
            "evidence": evidence,
            "evidenceType": "transcript-support",
            "manualReview": False,
        }

    # A negative claim is false only when its positive wording appears in the
    # transcript; a positive claim is false only when an explicit negation is
    # attached to the same phrase.
    if claim_is_negative:
        positive_tokens = [token for token in claim_tokens if token not in NEGATION_WORDS]
        if _has_sequence(transcript_tokens, positive_tokens):
            return {
                "correct": "false",
                "resolution": "contradicted",
                "evidence": _evidence_segment(transcript, " ".join(positive_tokens)),
                "evidenceType": "transcript-contradiction",
                "manualReview": False,
            }
    else:
        if len(claim_tokens) >= 2:
            for start in range(len(transcript_tokens_with_negation)):
                if transcript_tokens_with_negation[start] not in (
                    "not",
                    "never",
                    "no",
                    "don't",
                    "doesn't",
                    "didn't",
                    "won't",
                ):
                    continue
                if _has_sequence(transcript_tokens_with_negation[start + 1 :], claim_tokens):
                    return {
                        "correct": "false",
                        "resolution": "contradicted",
                        "evidence": _evidence_segment(transcript, " ".join(claim_tokens)),
                        "evidenceType": "transcript-contradiction",
                        "manualReview": False,
                    }
            opposition_evidence = _opposition_evidence(transcript, claim_tokens)
            if opposition_evidence:
                return {
                    "correct": "false",
                    "resolution": "contradicted",
                    "evidence": opposition_evidence,
                    "evidenceType": "transcript-contradiction",
                    "manualReview": False,
                }

    return {
        "correct": "not-stated",
        "resolution": "unsupported-by-transcript",
        "evidence": None,
        "evidenceType": "unsupported",
        "manualReview": True,
    }


def _confidence_flags(transcript: Mapping[str, Any]) -> list[str]:
    flags: list[str] = []
    try:
        if float(transcript.get("languageProbability", 1.0)) < 0.9:
            flags.append("low-language-probability")
        if float(transcript.get("avgLogprob", 0.0)) < -0.3:
            flags.append("low-transcript-confidence")
    except (TypeError, ValueError):
        flags.append("missing-confidence-metadata")
    for segment in transcript.get("segments", []):
        try:
            if float(segment.get("avgLogprob", 0.0)) < -0.6:
                flags.append("low-confidence-clause")
                break
        except (AttributeError, TypeError, ValueError):
            flags.append("missing-segment-confidence")
            break
    return flags


def _iter_listening_items(exercise_review: Mapping[str, Any]) -> Iterable[dict[str, Any]]:
    lessons = exercise_review.get("lessons")
    if not isinstance(lessons, Mapping):
        raise ListeningReviewError("exercise review must contain a lessons object")
    for lesson_id, lesson in sorted(lessons.items(), key=lambda pair: (_unit(pair[1].get("unit")), str(pair[0]))):
        if not isinstance(lesson, Mapping):
            continue
        slides = lesson.get("slides")
        if not isinstance(slides, Mapping):
            continue
        for raw_slide, slide in sorted(slides.items(), key=lambda pair: _slide_number(pair[0])):
            if not isinstance(slide, Mapping):
                continue
            number = _slide_number(raw_slide)
            items = slide.get("items")
            if not isinstance(items, list):
                continue
            for item_position, item in enumerate(items):
                if not isinstance(item, Mapping) or item.get("kind") != "listening":
                    continue
                yield {
                    "lessonId": str(lesson_id),
                    "unit": _unit(lesson.get("unit")),
                    "lessonTitle": str(lesson.get("lessonTitle", "")),
                    "slideNumber": number,
                    "itemPosition": item_position,
                    "item": item,
                    "slide": slide,
                }


def _assign_audio_context(entries: list[dict[str, Any]]) -> None:
    """Assign roles/indexes in place, preserving source context and order."""

    by_unit: dict[int, list[dict[str, Any]]] = {}
    for entry in entries:
        by_unit.setdefault(entry["unit"], []).append(entry)

    for unit_entries in by_unit.values():
        unit_entries.sort(key=lambda entry: (entry["slideNumber"], entry["itemPosition"], entry["item"]["id"]))
        for entry in unit_entries:
            item = entry["item"]
            text = _text_blob(entry["slide"], item)
            entry["sourceText"] = text
            entry["sourceAudioIconCount"] = _source_audio_count(entry["slide"])
            entry["role"] = _role(entry["slideNumber"], text)
            entry["explicitAudioIndex"] = _explicit_audio_index(text)
            entry["promptSignature"] = _normalise_prompt(str(item.get("prompt", "")))
            item_id = str(item.get("id", ""))
            source_match = re.match(r"^(u\d+-s\d+)", item_id, flags=re.IGNORECASE)
            entry["sourceSlideSignature"] = source_match.group(1).casefold() if source_match else None

        # A deck extractor can emit the same listening prompt on adjacent
        # slides. Use the record with an audio icon as the source context and
        # map its duplicate to the same index.
        groups: dict[str, list[dict[str, Any]]] = {}
        for entry in unit_entries:
            if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
                continue
            group_key = entry["sourceSlideSignature"] or entry["promptSignature"]
            groups.setdefault(group_key, []).append(entry)
        duplicate_group: dict[int, list[dict[str, Any]]] = {}
        for group in groups.values():
            if len(group) > 1:
                for entry in group:
                    duplicate_group[id(entry)] = group

        next_index = 1
        used: set[int] = set()
        for entry in unit_entries:
            if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
                entry["audioIndex"] = None
                entry["mappingBasis"] = "teacher-led-source-context"
                continue
            explicit = entry["explicitAudioIndex"]
            if explicit is not None:
                assigned = explicit
                basis = "explicit-source-label"
            elif id(entry) in duplicate_group:
                source_group = duplicate_group[id(entry)]
                source_entry = next((candidate for candidate in source_group if candidate["sourceAudioIconCount"] > 0), source_group[0])
                previous = source_entry.get("audioIndex")
                if isinstance(previous, int):
                    assigned = previous
                    basis = "adjacent-duplicate-source-context"
                else:
                    assigned = 1 if source_entry["role"] == "intro" else max(2, next_index)
                    basis = "adjacent-duplicate-source-context"
            elif entry["role"] == "intro":
                assigned = 1
                basis = "opening-slide-context"
            elif entry["role"] == "comprehension":
                assigned = max(2, next_index)
                basis = "comprehension-slide-context"
            else:
                assigned = next_index
                basis = "ordered-source-context"
            entry["audioIndex"] = assigned
            entry["mappingBasis"] = basis
            used.add(assigned)
            next_index = max(next_index, assigned + 1)

        # Propagate a duplicate's resolved index after the first pass. This is
        # needed when the duplicate appears before the source-icon record.
        for group in duplicate_group.values():
            assigned = next((entry.get("audioIndex") for entry in group if isinstance(entry.get("audioIndex"), int)), None)
            if assigned is not None:
                for entry in group:
                    if entry["role"] not in {"vocabulary-repeat", "teacher-roleplay"}:
                        entry["audioIndex"] = assigned


def _transcript_ref(transcript: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "unit": transcript.get("unit"),
        "audioIndex": transcript.get("audioIndex"),
        "sourceFilename": transcript.get("sourceFilename"),
        "sourcePath": transcript.get("sourcePath"),
        "sourceSha256": transcript.get("sourceSha256"),
        "sourceBytes": transcript.get("sourceBytes"),
        "language": transcript.get("language"),
        "languageProbability": transcript.get("languageProbability"),
        "avgLogprob": transcript.get("avgLogprob"),
        "text": transcript.get("text", ""),
    }


def build_review(exercise_review: Mapping[str, Any], transcripts: Mapping[str, Any]) -> dict[str, Any]:
    """Build an immutable, source-linked listening review index."""

    transcript_rows = transcripts.get("transcripts")
    if not isinstance(transcript_rows, list):
        raise ListeningReviewError("transcript aggregate must contain a transcripts array")
    transcript_by_key: dict[tuple[int, int], Mapping[str, Any]] = {}
    for transcript in transcript_rows:
        if not isinstance(transcript, Mapping):
            continue
        unit = _unit(transcript.get("unit"))
        index = transcript.get("audioIndex")
        if not isinstance(index, int):
            continue
        transcript_by_key[(unit, index)] = transcript

    entries = list(_iter_listening_items(exercise_review))
    _assign_audio_context(entries)
    records: list[dict[str, Any]] = []

    for entry in entries:
        item = entry["item"]
        unit = entry["unit"]
        audio_index = entry["audioIndex"]
        transcript = transcript_by_key.get((unit, audio_index)) if isinstance(audio_index, int) else None
        confidence_flags = _confidence_flags(transcript) if transcript else []
        item_prompt = str(item.get("prompt", ""))
        tf_claims = (
            _extract_tf_claims(
                (entry["slide"].get("source") or {}).get("visibleTexts", [])
                if isinstance(entry["slide"].get("source"), Mapping)
                else []
            )
            if TF_MARKER_RE.search(item_prompt)
            else []
        )
        questions: list[dict[str, Any]] = []
        for claim in tf_claims:
            result = resolve_tf_claim(claim, transcript) if transcript else {
                "correct": None,
                "resolution": "blocked-awaiting-transcript",
                "evidence": None,
                "evidenceType": "no-transcript",
                "manualReview": True,
            }
            questions.append(
                {
                    "prompt": str(item.get("prompt", "")),
                    "question": claim,
                    **result,
                    "audioSha256": transcript.get("sourceSha256") if transcript else None,
                }
            )

        if entry["role"] in {"vocabulary-repeat", "teacher-roleplay"}:
            status = "blocked-teacher-led-no-source-audio"
            manual = True
        elif transcript is None:
            if unit == 3 and audio_index == 1:
                status = "blocked-candidate-only"
            elif unit >= 53:
                status = "blocked-unit-audio-unavailable"
            else:
                status = "blocked-missing-transcript"
            manual = True
        else:
            manual = bool(confidence_flags) or any(question.get("manualReview") for question in questions)
            status = "matched-awaiting-manual-review" if manual else "matched-review"

        records.append(
            {
                "key": {
                    "lessonId": entry["lessonId"],
                    "slideNumber": entry["slideNumber"],
                    "itemId": item.get("id"),
                    "unit": unit,
                    "audioIndex": audio_index,
                },
                "lessonId": entry["lessonId"],
                "unit": unit,
                "lessonTitle": entry["lessonTitle"],
                "slideNumber": entry["slideNumber"],
                "itemId": item.get("id"),
                "prompt": item.get("prompt", ""),
                "responseMode": item.get("responseMode"),
                "role": entry["role"],
                "audioIndex": audio_index,
                "mappingBasis": entry["mappingBasis"],
                "sourceAudioIconCount": entry["sourceAudioIconCount"],
                "sourceEvidence": item.get("sourceEvidence", []),
                "transcript": _transcript_ref(transcript) if transcript else None,
                "uncertaintyFlags": confidence_flags,
                "manualReviewRequired": manual,
                "reviewStatus": status,
                "questions": questions,
                "revision": None,
            }
        )

    counts: dict[str, int] = {
        "listeningItems": len(records),
        "matchedReview": sum(record["reviewStatus"] == "matched-review" for record in records),
        "matchedAwaitingManualReview": sum(record["reviewStatus"] == "matched-awaiting-manual-review" for record in records),
        "blockedMissingTranscript": sum(record["reviewStatus"] == "blocked-missing-transcript" for record in records),
        "blockedCandidateOnly": sum(record["reviewStatus"] == "blocked-candidate-only" for record in records),
        "blockedTeacherLedNoSourceAudio": sum(record["reviewStatus"] == "blocked-teacher-led-no-source-audio" for record in records),
        "blockedUnitAudioUnavailable": sum(record["reviewStatus"] == "blocked-unit-audio-unavailable" for record in records),
        "tfQuestions": sum(len(record["questions"]) for record in records),
        "tfSupported": sum(question["resolution"] == "supported" for record in records for question in record["questions"]),
        "tfContradicted": sum(question["resolution"] == "contradicted" for record in records for question in record["questions"]),
        "tfNotStated": sum(question["resolution"] == "unsupported-by-transcript" for record in records for question in record["questions"]),
    }
    return {
        "schemaVersion": 1,
        "courseId": str(exercise_review.get("courseId", COURSE_ID)),
        "sourcePolicy": {
            "exerciseReview": "read-only published course-exercise-review.json",
            "transcripts": "read-only course-audio-transcripts.json; source SHA is retained per match",
            "audioAssignment": "opening context Audio 1; later comprehension context Audio 2; explicit labels win",
            "unsupportedClaims": "not-stated and manual review; never auto-false",
            "sourceMutation": "none; no audio generation, replacement, or archive edits",
        },
        "counts": counts,
        "items": records,
    }


def _transcripts_by_key(transcripts: Mapping[str, Any]) -> dict[tuple[int, int], Mapping[str, Any]]:
    rows = transcripts.get("transcripts")
    if not isinstance(rows, list):
        raise ListeningReviewError("transcript aggregate must contain a transcripts array")
    result: dict[tuple[int, int], Mapping[str, Any]] = {}
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        unit = row.get("unit")
        index = row.get("audioIndex")
        if isinstance(unit, int) and isinstance(index, int):
            result[(unit, index)] = row
    return result


def _lesson_contexts(exercise_review: Mapping[str, Any]) -> list[tuple[str, Mapping[str, Any]]]:
    lessons = exercise_review.get("lessons")
    if not isinstance(lessons, Mapping):
        raise ListeningReviewError("exercise review must contain a lessons object")
    return sorted(
        ((str(lesson_id), lesson) for lesson_id, lesson in lessons.items() if isinstance(lesson, Mapping)),
        key=lambda pair: (_unit(pair[1].get("unit")), pair[0]),
    )


def _is_audio3_context(text: str) -> bool:
    lower = text.casefold()
    return bool(
        re.search(
            r"inflectional\s+ending|ending\s+(?:each|the)\s+word|word\s+list|\/(?:t|d|s|z|ə?d)\/|pronounc",
            lower,
        )
    )


def _source_comprehension_candidates(
    exercise_review: Mapping[str, Any], listening_review: Mapping[str, Any]
) -> dict[tuple[str, int], list[dict[str, Any]]]:
    """Index later listening source contexts, including parser-only prompts."""

    review_items = listening_review.get("items", [])
    review_by_key: dict[tuple[str, int, str], Mapping[str, Any]] = {}
    if isinstance(review_items, list):
        for item in review_items:
            if isinstance(item, Mapping):
                review_by_key[(str(item.get("lessonId")), int(item.get("slideNumber", -1)), str(item.get("itemId")))] = item

    candidates: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for lesson_id, lesson in _lesson_contexts(exercise_review):
        unit = _unit(lesson.get("unit"))
        if not 2 <= unit <= 52:
            continue
        slides = lesson.get("slides")
        if not isinstance(slides, Mapping):
            continue
        for raw_slide, slide in sorted(slides.items(), key=lambda pair: _slide_number(pair[0])):
            if not isinstance(slide, Mapping):
                continue
            slide_number = _slide_number(raw_slide)
            if slide_number <= 5:
                continue
            source = slide.get("source") if isinstance(slide.get("source"), Mapping) else {}
            visible = source.get("visibleTexts") if isinstance(source.get("visibleTexts"), list) else []
            source_text = " ".join(str(value) for value in visible)
            if not re.search(r"(?i)\blisten(?:\s+to)?\b|\baudio\b", source_text):
                continue
            role = _role(slide_number, source_text)
            if role in {"vocabulary-repeat", "teacher-roleplay"}:
                continue
            audio_index = 3 if _is_audio3_context(source_text) else 2
            source_item_ids: list[str] = []
            source_prompts: list[str] = []
            for item in slide.get("items", []) if isinstance(slide.get("items"), list) else []:
                if not isinstance(item, Mapping) or item.get("kind") != "listening":
                    continue
                item_id = str(item.get("id", ""))
                review_item = review_by_key.get((lesson_id, slide_number, item_id))
                if review_item is not None and review_item.get("role") not in {"comprehension", "other-audio"}:
                    continue
                source_item_ids.append(item_id)
                source_prompts.append(str(item.get("prompt", "")))
            candidates.setdefault((lesson_id, audio_index), []).append(
                {
                    "lessonId": lesson_id,
                    "unit": unit,
                    "lessonTitle": str(lesson.get("lessonTitle", "")),
                    "slideNumber": slide_number,
                    "sourceExactTexts": [str(value) for value in visible],
                    "sourceItemIds": source_item_ids,
                    "sourcePrompts": source_prompts,
                    "sourceAudioIconCount": _source_audio_count(slide),
                    "audioIndex": audio_index,
                }
            )

    # Keep one source context per lesson/audio index. Prefer a source with a
    # concrete listening item and then the earliest later slide.
    for key, rows in candidates.items():
        rows.sort(key=lambda row: (not bool(row["sourceItemIds"]), row["slideNumber"]))
        candidates[key] = rows
    return candidates


def _sentence_clauses(transcript: Mapping[str, Any]) -> list[str]:
    clauses: list[str] = []
    seen: set[str] = set()
    segments = transcript.get("segments", [])
    segment_texts = [str(segment.get("text", "")) for segment in segments if isinstance(segment, Mapping)]
    # Segment timing gives the strongest evidence boundary. Split long ASR
    # segments only at punctuation so authored prompts remain verbatim.
    for text in [*segment_texts, str(transcript.get("text", ""))]:
        for clause in re.split(r"(?<=[.!?])\s+", text):
            clean = " ".join(clause.split()).strip(" -")
            if len(clean.split()) < 4 or len(clean) > 220:
                continue
            signature = clean.casefold()
            if signature not in seen:
                seen.add(signature)
                clauses.append(clean)
    return clauses


def _answer_item(
    *,
    question_id: str,
    kind: str,
    prompt: str,
    correct: str | None,
    evidence: str | None,
    transcript: Mapping[str, Any],
    review_status: str,
    original_question: str | None,
    rationale: str,
) -> dict[str, Any]:
    digest = transcript.get("sourceSha256")
    answer_items: list[dict[str, Any]] = []
    if correct in {"true", "false"} and evidence and review_status == "reviewed":
        answer_items.append(
            {
                "id": correct,
                "canonical": correct,
                "accepted": [correct, correct[0]],
                "evidence": evidence,
                "sourceAudioSha256": digest,
            }
        )
    return {
        "id": question_id,
        "kind": kind,
        "prompt": prompt,
        "reviewStatus": review_status,
        "answerItems": answer_items,
        "explicitOptions": ["true", "false"],
        "correct": correct if review_status == "reviewed" else None,
        "evidence": evidence,
        "sourceAudioSha256": digest,
        "originalQuestion": original_question,
        "rationale": rationale,
    }


def _fallback_audio_items(
    transcript: Mapping[str, Any], *, start_index: int, confidence_flags: Sequence[str], reason: str
) -> list[dict[str, Any]]:
    clauses = _sentence_clauses(transcript)[:4]
    status = "blocked-manual-transcript-review" if confidence_flags else "reviewed"
    result: list[dict[str, Any]] = []
    for offset, clause in enumerate(clauses):
        prompt = f"According to the audio, is this statement true or false? {clause}"
        result.append(
            _answer_item(
                question_id=f"audio-tf-{start_index + offset}",
                kind="true-false",
                prompt=prompt,
                correct="true" if status == "reviewed" else None,
                evidence=clause,
                transcript=transcript,
                review_status=status,
                original_question=None,
                rationale=reason,
            )
        )
    return result


def _reject_unreviewed_pedagogy_fallbacks(exercises: list[dict[str, Any]]) -> None:
    """Keep raw ASR fallback questions out of the accepted review index.

    The generic fallback remains useful as an audit trail, but literal ASR
    fragments are not learner-facing comprehension questions. Units 3–15 are
    covered by the separate manual multiple-choice artifact below.
    """

    for exercise in exercises:
        unit = exercise.get("unit")
        if not isinstance(unit, int) or not 3 <= unit <= 15 or exercise.get("audioIndex") != 2:
            continue
        items = exercise.get("items")
        if not isinstance(items, list) or not any(item.get("originalQuestion") is None for item in items if isinstance(item, Mapping)):
            continue
        exercise["reviewStatus"] = "blocked-unreviewed-pedagogy"
        exercise["manualReviewRequired"] = True
        exercise["reviewRejection"] = (
            "Generated transcript-verbatim fallback questions were rejected: semantic authoring is required before publication."
        )
        for item in items:
            if not isinstance(item, dict):
                continue
            item["reviewStatus"] = "blocked-unreviewed-pedagogy"
            item["answerItems"] = []
            item["correct"] = None
            item["reviewRejection"] = "Raw ASR fragment fallback is retained for audit only and is never accepted as pedagogy."


def _audio1_preservation(listening_review: Mapping[str, Any]) -> list[dict[str, Any]]:
    preserved: list[dict[str, Any]] = []
    for item in listening_review.get("items", []) if isinstance(listening_review.get("items"), list) else []:
        if not isinstance(item, Mapping) or item.get("audioIndex") != 1 or item.get("role") != "intro":
            continue
        transcript = item.get("transcript") if isinstance(item.get("transcript"), Mapping) else {}
        preserved.append(
            {
                "lessonId": item.get("lessonId"),
                "unit": item.get("unit"),
                "slideNumber": item.get("slideNumber"),
                "itemId": item.get("itemId"),
                "prompt": item.get("prompt", ""),
                "audioIndex": 1,
                "sourceAudioSha256": transcript.get("sourceSha256"),
                "reviewStatus": "open-response-preserved",
                "answerItems": [],
                "rationale": "Original Audio 1 introduction/discussion remains teacher-led open response.",
            }
        )
    return preserved


def build_reviewed_exercises(
    exercise_review: Mapping[str, Any],
    transcripts: Mapping[str, Any],
    listening_review: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Create source-linked builder records for comprehension audio exercises."""

    listening_review = listening_review or build_review(exercise_review, transcripts)
    transcript_by_key = _transcripts_by_key(transcripts)
    source_candidates = _source_comprehension_candidates(exercise_review, listening_review)
    exercises: list[dict[str, Any]] = []

    for lesson_id, lesson in _lesson_contexts(exercise_review):
        unit = _unit(lesson.get("unit"))
        if not 2 <= unit <= 52:
            continue
        source_indices = sorted(index for (candidate_lesson_id, index) in source_candidates if candidate_lesson_id == lesson_id)
        available_indices = sorted(index for (candidate_unit, index) in transcript_by_key if candidate_unit == unit and index >= 2)
        # Audio 2 is the default comprehension clip for every unit. Keep it
        # in the audit even when an explicit Audio 3 pronunciation task also
        # exists, then append that Audio 3 task for its separate manual review.
        wanted_indices = [2] if 2 in available_indices else []
        if 3 in source_indices and 3 in available_indices:
            wanted_indices.append(3)

        for audio_index in wanted_indices:
            transcript = transcript_by_key.get((unit, audio_index))
            if transcript is None:
                continue
            candidate_rows = source_candidates.get((lesson_id, audio_index), [])
            candidate = candidate_rows[0] if candidate_rows else {
                "lessonId": lesson_id,
                "unit": unit,
                "lessonTitle": str(lesson.get("lessonTitle", "")),
                "slideNumber": None,
                "sourceExactTexts": [],
                "sourceItemIds": [],
                "sourcePrompts": [],
                "sourceAudioIconCount": 0,
                "audioIndex": audio_index,
            }
            confidence_flags = _confidence_flags(transcript)
            audio3_manual = audio_index == 3 and _is_audio3_context(" ".join(candidate["sourceExactTexts"]))
            source_claims: list[str] = []
            if candidate["sourcePrompts"]:
                for prompt in candidate["sourcePrompts"]:
                    if TF_MARKER_RE.search(prompt):
                        source_claims.extend(_extract_tf_claims(candidate["sourceExactTexts"]))
            source_claims = list(dict.fromkeys(source_claims))
            items: list[dict[str, Any]] = []
            omitted: list[dict[str, Any]] = []
            if source_claims and not audio3_manual:
                for claim_index, claim in enumerate(source_claims, start=1):
                    result = resolve_tf_claim(claim, transcript)
                    if result["resolution"] == "unsupported-by-transcript":
                        omitted.append(
                            {
                                "question": claim,
                                "sourceAudioSha256": transcript.get("sourceSha256"),
                                "reason": "The transcript does not directly support or contradict the source claim; omitted rather than auto-marked false.",
                            }
                        )
                        continue
                    item_status = "blocked-manual-transcript-review" if confidence_flags else "reviewed"
                    items.append(
                        _answer_item(
                            question_id=f"source-tf-{claim_index}",
                            kind="true-false",
                            prompt=claim,
                            correct=result["correct"] if not confidence_flags else None,
                            evidence=result.get("evidence"),
                            transcript=transcript,
                            review_status=item_status,
                            original_question=claim,
                            rationale="Source T/F claim retained because the transcript directly supports or contradicts it.",
                        )
                    )
            if audio3_manual:
                blocked_reason = "Published exercise asks for pronunciation-ending classification; the word-list transcript has no source-labeled ending key, so no answer is inferred."
                items = [
                    _answer_item(
                        question_id=f"audio3-manual-{index}",
                        kind="prompt",
                        prompt=str(prompt),
                        correct=None,
                        evidence=None,
                        transcript=transcript,
                        review_status="blocked-manual-source-key",
                        original_question=prompt,
                        rationale=blocked_reason,
                    )
                    for index, prompt in enumerate(candidate["sourcePrompts"] or ["Review the audio exercise manually."], start=1)
                ]
            elif len(items) < 4:
                items.extend(
                    _fallback_audio_items(
                        transcript,
                        start_index=len(items) + 1,
                        confidence_flags=confidence_flags,
                        reason=(
                            "Unsupported source questions were archived and replaced with transcript-verbatim facts."
                            if omitted
                            else "No answerable published listening questions were extracted; facts quote transcript clauses verbatim."
                        ),
                    )[: max(0, 4 - len(items))]
                )
            # A low-confidence source claim must never leave a reviewed key.
            if confidence_flags and not audio3_manual:
                for item in items:
                    if item["reviewStatus"] == "reviewed":
                        item["reviewStatus"] = "blocked-manual-transcript-review"
                        item["answerItems"] = []
                        item["correct"] = None
            set_status = "reviewed" if items and all(item["reviewStatus"] == "reviewed" for item in items) else "blocked-manual"
            if not items:
                set_status = "blocked-awaiting-manual-review"
            exercises.append(
                {
                    "key": {
                        "lessonId": lesson_id,
                        "slideNumber": candidate["slideNumber"],
                        "unit": unit,
                        "audioIndex": audio_index,
                    },
                    "lessonId": lesson_id,
                    "unit": unit,
                    "lessonTitle": candidate["lessonTitle"],
                    "slideNumber": candidate["slideNumber"],
                    "audioIndex": audio_index,
                    "sourceAudioSha256": transcript.get("sourceSha256"),
                    "sourceFilename": transcript.get("sourceFilename"),
                    "sourcePath": transcript.get("sourcePath"),
                    "sourceExactTexts": candidate["sourceExactTexts"],
                    "sourceItemIds": candidate["sourceItemIds"],
                    "sourcePrompts": candidate["sourcePrompts"],
                    "transcriptConfidence": {
                        "languageProbability": transcript.get("languageProbability"),
                        "avgLogprob": transcript.get("avgLogprob"),
                        "uncertaintyFlags": confidence_flags,
                    },
                    "reviewStatus": set_status,
                    "manualReviewRequired": bool(confidence_flags or audio3_manual or omitted),
                    "originalQuestionsOmitted": omitted,
                    "revisionRationale": (
                        "Original unsupported questions are archived above; replacement facts quote explicit transcript clauses while retaining the lesson topic."
                        if omitted
                        else "Published source prompt retained; answerable facts use transcript evidence only."
                    ),
                    "items": items,
                }
            )

    _reject_unreviewed_pedagogy_fallbacks(exercises)
    exercises.sort(key=lambda item: (item["unit"], item["audioIndex"], item["slideNumber"] or 0))
    counts = {
        "exerciseSets": len(exercises),
        "reviewedSets": sum(item["reviewStatus"] == "reviewed" for item in exercises),
        "blockedSets": sum(item["reviewStatus"] != "reviewed" for item in exercises),
        "reviewedItems": sum(answer["reviewStatus"] == "reviewed" for item in exercises for answer in item["items"]),
        "blockedItems": sum(answer["reviewStatus"] != "reviewed" for item in exercises for answer in item["items"]),
        "originalQuestionsOmitted": sum(len(item["originalQuestionsOmitted"]) for item in exercises),
        "audio3ManualSets": sum(item["audioIndex"] == 3 for item in exercises),
    }
    return {
        "schemaVersion": 1,
        "courseId": str(exercise_review.get("courseId", COURSE_ID)),
        "sourcePolicy": {
            "sourceArchive": "course-exercise-review.json is read-only; source prompts/text are copied exactly into audit metadata",
            "audioEvidence": "Every answerItem carries sourceAudioSha256 and verbatim transcript evidence",
            "unsupportedClaims": "Unsupported source claims are omitted/archived or replaced with transcript-verbatim facts; they are never auto-false",
            "uncertainTranscripts": "Low-confidence ASR and pronunciation word lists remain blocked for manual review",
            "audio1": "Audio 1 introduction/discussion prompts remain teacher-led open response",
        },
        "counts": counts,
        "preservedAudio1": _audio1_preservation(listening_review),
        "exercises": exercises,
    }


def build_authored_03_15(
    exercise_review: Mapping[str, Any],
    transcripts: Mapping[str, Any],
    reviewed_exercises: Mapping[str, Any],
) -> dict[str, Any]:
    """Build the manually authored Audio 2 MC review for Units 3–15.

    The old generic fallback is deliberately not reused. Each evidence string
    below is checked against the immutable transcript text and every item has
    four distinct options with one exact correct option.
    """

    transcript_by_key = _transcripts_by_key(transcripts)
    source_by_key: dict[tuple[int, int], Mapping[str, Any]] = {}
    source_rows = reviewed_exercises.get("exercises", [])
    if isinstance(source_rows, list):
        for row in source_rows:
            if not isinstance(row, Mapping):
                continue
            unit = row.get("unit")
            audio_index = row.get("audioIndex")
            if isinstance(unit, int) and isinstance(audio_index, int):
                source_by_key[(unit, audio_index)] = row

    lesson_by_unit: dict[int, tuple[str, Mapping[str, Any]]] = {}
    for lesson_id, lesson in _lesson_contexts(exercise_review):
        unit = _unit(lesson.get("unit"))
        lesson_by_unit.setdefault(unit, (lesson_id, lesson))

    exercises: list[dict[str, Any]] = []
    for unit in range(3, 16):
        transcript = transcript_by_key.get((unit, 2))
        if transcript is None:
            raise ListeningReviewError(f"missing Unit {unit} Audio 2 transcript for manual authoring")
        source = source_by_key.get((unit, 2), {})
        lesson_pair = lesson_by_unit.get(unit)
        if source:
            lesson_id = str(source.get("lessonId", ""))
            lesson_title = str(source.get("lessonTitle", ""))
        elif lesson_pair:
            lesson_id, lesson = lesson_pair
            lesson_title = str(lesson.get("lessonTitle", ""))
        else:
            raise ListeningReviewError(f"missing Unit {unit} lesson context for manual authoring")

        transcript_text = str(transcript.get("text", ""))
        source_sha = transcript.get("sourceSha256")
        if not isinstance(source_sha, str) or not source_sha:
            raise ListeningReviewError(f"Unit {unit} Audio 2 transcript has no source SHA")
        questions = MANUAL_AUTHORED_03_15[unit]
        items: list[dict[str, Any]] = []
        for index, question in enumerate(questions, start=1):
            options = [str(option) for option in question["options"]]
            correct = str(question["correct"])
            evidence = str(question["evidence"])
            if len(options) != 4 or len({option.casefold() for option in options}) != 4:
                raise ListeningReviewError(f"Unit {unit} manual question {index} must have four distinct options")
            if correct not in options:
                raise ListeningReviewError(f"Unit {unit} manual question {index} correct option is missing")
            if evidence not in transcript_text:
                raise ListeningReviewError(f"Unit {unit} manual question {index} evidence is not in transcript text")
            answer_item = {
                "id": "correct",
                "canonical": correct,
                "accepted": [correct],
                "evidence": evidence,
                "sourceAudioSha256": source_sha,
            }
            items.append(
                {
                    "id": f"manual-mc-{index}",
                    "kind": "prompt",
                    "format": "multiple-choice",
                    "prompt": str(question["prompt"]),
                    "reviewStatus": "reviewed",
                    "answerItems": [answer_item],
                    "explicitOptions": options,
                    "correct": correct,
                    "evidence": evidence,
                    "sourceAudioSha256": source_sha,
                    "originalQuestion": None,
                    "manualAuthoring": True,
                    "rationale": "Semantic multiple-choice question authored from a clear transcript fact; raw ASR fallback is not reused.",
                }
            )

        confidence_flags = _confidence_flags(transcript)
        exercises.append(
            {
                "key": {
                    "lessonId": lesson_id,
                    "slideNumber": source.get("slideNumber"),
                    "unit": unit,
                    "audioIndex": 2,
                },
                "lessonId": lesson_id,
                "unit": unit,
                "lessonTitle": lesson_title,
                "slideNumber": source.get("slideNumber"),
                "audioIndex": 2,
                "sourceAudioSha256": source_sha,
                "sourceFilename": transcript.get("sourceFilename"),
                "sourcePath": transcript.get("sourcePath"),
                "sourceExactTexts": list(source.get("sourceExactTexts", [])),
                "sourceItemIds": list(source.get("sourceItemIds", [])),
                "sourcePrompts": list(source.get("sourcePrompts", [])),
                "transcriptConfidence": {
                    "languageProbability": transcript.get("languageProbability"),
                    "avgLogprob": transcript.get("avgLogprob"),
                    "uncertaintyFlags": confidence_flags,
                },
                "reviewStatus": "reviewed",
                "manualReviewRequired": bool(confidence_flags),
                "manualReviewNote": (
                    "Selected evidence clauses were manually checked; aggregate transcript confidence flags remain visible."
                    if confidence_flags
                    else None
                ),
                "authoringStatus": "manual-semantic-multiple-choice",
                "items": items,
            }
        )

    counts = {
        "exerciseSets": len(exercises),
        "reviewedSets": sum(exercise["reviewStatus"] == "reviewed" for exercise in exercises),
        "blockedSets": sum(exercise["reviewStatus"] != "reviewed" for exercise in exercises),
        "reviewedItems": sum(item["reviewStatus"] == "reviewed" for exercise in exercises for item in exercise["items"]),
        "blockedItems": sum(item["reviewStatus"] != "reviewed" for exercise in exercises for item in exercise["items"]),
    }
    return {
        "schemaVersion": 1,
        "courseId": str(exercise_review.get("courseId", COURSE_ID)),
        "sourcePolicy": {
            "sourceArchive": "course-exercise-review.json remains read-only; published source metadata is copied into each set",
            "audioEvidence": "Every answer item carries the exact sourceAudioSha256 and a literal transcript evidence string",
            "authoring": "Units 3–15 Audio 2 use four manually authored semantic multiple-choice questions per clip",
            "fallbackPolicy": "Raw ASR-fragment fallback records remain blocked in reviewed-listening-exercises.json and are never accepted",
            "uncertainty": "Aggregate ASR flags remain visible; only clear clauses were selected as answer evidence",
            "audio3": "Audio 3 pronunciation remains outside this artifact and blocked pending source word-list review",
        },
        "counts": counts,
        "exercises": exercises,
    }


def write_json_atomic(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exercise-review", type=Path, default=DEFAULT_EXERCISE_REVIEW)
    parser.add_argument("--transcripts", type=Path, default=DEFAULT_TRANSCRIPTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--reviewed-exercises-output", type=Path, default=DEFAULT_REVIEWED_EXERCISES_OUTPUT)
    parser.add_argument("--authored-03-15-output", type=Path, default=DEFAULT_AUTHORED_03_15_OUTPUT)
    args = parser.parse_args(argv)
    exercise_review = _read_json(args.exercise_review, "exercise review")
    transcripts = _read_json(args.transcripts, "transcript aggregate")
    output = build_review(exercise_review, transcripts)
    reviewed_exercises = build_reviewed_exercises(exercise_review, transcripts, output)
    authored_03_15 = build_authored_03_15(exercise_review, transcripts, reviewed_exercises)
    write_json_atomic(args.output, output)
    write_json_atomic(args.reviewed_exercises_output, reviewed_exercises)
    write_json_atomic(args.authored_03_15_output, authored_03_15)
    print(
        json.dumps(
            {
                "output": args.output.as_posix(),
                "reviewedExercisesOutput": args.reviewed_exercises_output.as_posix(),
                "authored03To15Output": args.authored_03_15_output.as_posix(),
                **output["counts"],
                "reviewedExerciseCounts": reviewed_exercises["counts"],
                "authored03To15Counts": authored_03_15["counts"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
