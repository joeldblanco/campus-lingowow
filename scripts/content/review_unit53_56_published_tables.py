"""Build the source-only published table review for Units 53-56.

The published decks are the authoritative source for these units.  The source
HTML reader keeps slide text but cannot recover editable table semantics, so
this file records manually reviewed matrices and visible-slide proof without
claiming native PPTX identity.  It intentionally does not copy rendered slide
images into learner content.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


COURSE_ID = "cmjnr0g5x0001jp04fsw2fejs"
SOURCE_ROOT = Path("docs/audit/source-files")
IDENTITY_PATH = Path("docs/audit/published-source-identity-53-56.json")
OUTPUT_PATH = Path("docs/audit/unit53-56-published-table-review.json")

UNIT_SOURCES = {
    53: "cmnmm9vul002tw1qkq6vmdn9t.json",
    54: "cmnmm9w6q002ww1qkmhschbtj.json",
    55: "cmnmm9wiv002zw1qkz23p6kdp.json",
    56: "cmnmm9wv00032w1qkxr02azgp.json",
}

# The object ids are stable across the four published decks.  They are kept
# here as observed UI evidence, never used to infer native PPTX identity.
PROOF = {
    (53, 6): ("gd6c0dc1310_0_17", 111940, "e89210dfa6f38fd7fa0554ccc656385f114834f0454ee6fc20f434f555469a03"),
    (53, 8): ("g72967b2bcc_0_86", 100858, "cdd88fed7ee5f00b6a6dcf05112d672932bd4c07cd2a71b8e6d14d6bed9bb038"),
    (53, 10): ("g729cfa641f_0_0", 69329, "2f739cdba5c678ce6ffe2ba6f4e5946bf60ee8180003c4871aa36a3dbb2bc8b7"),
    (54, 6): ("gd6c0dc1310_0_17", 122618, "f19fd45b1026ee81d8aa8462f2980923084c07da7ffde3ec0464228c5e829bd9"),
    (54, 8): ("g72967b2bcc_0_86", 105666, "1d56b55a0265f7b35dec270715c2a197720c195f4c523b785181634ea18ce544"),
    (54, 10): ("g729cfa641f_0_0", 71934, "d222e6b2f704bf59d0e3b24745b9be274127f32172cdb937946ce37397011fab"),
    (55, 6): ("gd6c0dc1310_0_17", 113940, "569da290e79d8d83181ada3508beb1b052064f855f029fc27ec2cfad16c8c643"),
    (55, 8): ("g72967b2bcc_0_86", 120065, "be1e54729492f17838ba04da6b10a2b55c438e880f4449aa76fb03df679fe781"),
    (55, 10): ("g729cfa641f_0_0", 73373, "d0c4cface57f6d88036ed2786ac1b5b54b9d4d3ea75af7bd6b01f74aa9948208"),
    (56, 6): ("gd6c0dc1310_0_17", 138678, "e8f4ccbe1793d9d0473fbbc4c25db9e7fa9b95b576468a850a968099c69be395"),
    (56, 8): ("g72967b2bcc_0_86", 110711, "4aa84e1337987277e20a0917540516b161e0c02958a07f3d6962a7319b575a1b"),
    (56, 10): ("g729cfa641f_0_0", 85357, "6ebdcaf921311422974a3a646fadb5073aba565d791fd6ca3af21169569e49f8"),
}


def _rows_and_notes() -> dict[tuple[int, int], dict[str, Any]]:
    # The published source uses U+2019 curly apostrophes; the audit keeps that
    # punctuation in every learner-facing cell.  This keeps strict source-cell validation
    # lossless; the visible-slide proof records the published punctuation.
    return {
        (53, 6): {
            "layout": "three-column PHRASES / MEANING / EXAMPLE table with eight phrase rows and a teacher discussion prompt above",
            "rows": [
                ["PHRASES", "MEANING", "EXAMPLE"],
                ["A MATTER OF LIFE AND DEATH", "If something is a matter of life and death, it's extremely important and it could involve someone's survival.", "I am not joking, this is a matter of life and death."],
                ["DEAD IN THE WATER", "If something is dead in the water, it has no chance of succeeding or of making any progress.", "That project is still on? I thought it was dead in the water."],
                ["KICK THE BUCKET", "If someone kicks the bucket, they die.", "Larry just kicked the bucket."],
                ["NEVER SAY DIE", "You can say \"Never say die!\" if you want to tell someone to keep trying while there's still a chance of success.", "Did you apply for the job?\nI did. Never say die."],
                ["ONE’S NUMBER IS UP", "Someone is appointed to die.", "I truly think Jake’s number is up."],
                ["GET SMOKED", "When someone or something gets killed.", "The petitions for were completed, the major’s project for the condos was smoked."],
                ["TO BE BROWN BREAD", "To be dead.", "I could not stay at the party, it was brown bread."],
                ["THE BUCKET LIST", "Things to do before dying.", "Gotta jump off a plane soon, It’s part of my bucket list."],
            ],
            "notes": [{"heading": "", "text": "Look at the phrases and discuss them with your teacher. Did you know them?"}],
        },
        (53, 8): {
            "layout": "two-column mixed-conditional chart with a full-width To Consider note block below",
            "rows": [
                ["A PAST CHANGE", "A RESULT IN THE PRESENT"],
                ["If I hadn't got the job in Tokyo,", "I would not be with my current girlfriend."],
                ["If we had not taken this road,", "We would probably be there now."],
                ["If I had won the match,", "I would be running for the finals."],
            ],
            "notes": [{"heading": "To Consider", "text": "1. The conditional that gets mixed here is the 3rd one. It uses past perfect. 2. The result in the present is used with the modal WOULD + SIMPLE FORM VERB. 3. These sentences do not necessarily start with the if clause first. E.G: We wouldn't be lost if we had looked at the map. 4. When if clauses start these sentences, you need to separate them by commas as we see in the examples. 5. We can also use questions here. E.G: Would you go now if he had asked you to?"}],
        },
        (53, 10): {
            "layout": "two-column Functions / Examples table with a separate To consider note block",
            "rows": [
                ["Functions", "Examples"],
                ["Talk about unreal situations in the past and the present.", "Joseph would have big kids now if he had married younger."],
            ],
            "notes": [{"heading": "To consider", "text": "This type of mixed conditional refers to an unreal past condition and its a probable result in the present. These sentences express a situation which is contrary to reality both in the past and in the present."}],
        },
        (54, 6): {
            "layout": "three-column PHRASES / MEANING / EXAMPLE table with eight phrase rows and a teacher discussion prompt above",
            "rows": [
                ["PHRASES", "MEANING", "EXAMPLE"],
                ["A BOOST OF CONFIDENCE", "Something/action that makes you feel confident.", "She did great, she just needed a boost of confidence"],
                ["A SHOT IN THE ARM", "Something that gives you confidence and strength; it makes you courageous.", "Just give her a shot in the arm and see what she is capable of."],
                ["AN ACT OF FAITH", "Something you do believing in someone else; giving someone ot something a chance.", "Staying with Dean was an act of faith."],
                ["WROTE SOMEONE OR SOMETHING OFF", "Not to have faith or confidence in someone or something. Expecting failure.", "I wrote Marcus off many years ago. He cannot be trusted."],
                ["TO PUSH ONE’S BUTTONS", "To cause a strong reaction or emotional response in someone; to provoke a negative response", "My brother knew exactly how to push my buttons and get me in trouble with our parents"],
                ["TO FEEL UPBEAT", "Upbeat means to feel full of hope, optimism, and joy. Mostly noticeable to others.", "Listening to her favorite song made her feel upbeat"],
                ["TO HAVE SENSE OF WORTH", "To have self-esteem, to know one’s worth and value", "She would not accept that if she had sense of worth."],
                ["TO BE AS BOLD AS BRASS", "To be extremely confident but with no respect nor politeness.", "He came in and acted as bold as brass like always."],
            ],
            "notes": [{"heading": "", "text": "Look at the phrases and discuss them with your teacher. Did you know them?"}],
        },
        (54, 8): {
            "layout": "two-column mixed-conditional chart with a full-width To Consider note block below",
            "rows": [
                ["A HYPOTHETICAL PRESENT", "A RESULT IN THE PAST"],
                ["If they came earlier,", "we wouldn’t have not been sleeping."],
                ["If John did not push my buttons,", "I would not have acted so feisty."],
                ["If she were as bold as brass,", "She would have gotten higher in the company."],
            ],
            "notes": [{"heading": "To Consider", "text": "1. The conditional that get mixed here is the 2nd one. It uses past simple. 2. The result in the past is used with the modal WOULD + HAVE + PAST PARTICIPLE VERB. 3. These sentences do not necessarily start with the if clause first. E.G: We wouldn't have done this if we had the money. 4. When if clauses start these sentences, you need to separate them by commas as we see in the examples. 5. We can also use questions here. E.G: Would you have gone there if they gave you chance?"}],
        },
        (54, 10): {
            "layout": "three-column index / Functions / Examples table with a separate To consider note block",
            "rows": [
                ["", "Functions", "Examples"],
                ["1", "hypothetical present situations with a result in the past", "If I wasn't afraid of spiders, I would have picked it up"],
            ],
            "notes": [{"heading": "To consider", "text": "These mixed conditional sentences refer to an unreal present situation and its probable (but unreal) past result. In these mixed conditional sentences, the time in the if clause is now or always and the time in the main clause is before now."}],
        },
        (55, 6): {
            "layout": "three-column PHRASES / MEANING / EXAMPLE table with eight phrase rows and a teacher discussion prompt above",
            "rows": [
                ["PHRASES", "MEANING", "EXAMPLE"],
                ["ANYONE’S CALL", "The expression anyone's call' is used when the result of a contest or election is difficult to predict.", "Who do you think will win?\nIt’s anyone’s call."],
                ["A FAT CHANCE", "The expression fat chance is used to indicate that something is not very likely to happen.", "The boss is thinking of me for the job? Fat chance!"],
                ["MURPHY’S LAW", "Referring to Murphy's law expresses a sentiment of bad luck and the idea that if anything can go wrong, it will.", "We've tried to prepare for every possible incident, but remember Murphy's law ...!"],
                ["FREE RIDE", "Someone who gets a free ride benefits from a collective activity without participating in it.", "Only those who share the work can share the benefits - nobody gets a free ride!"],
                ["FALL INTO ONE’S LAP", "If something good falls into your lap, it happens to you without any effort on your part.", "She's not making much effort to find work. Does she think a job is going to fall into her lap?"],
                ["ON THE OFF CHANCE", "If you do something on the off chance, you think there might be a slight possibility of success.", "I went into the supermarket on the off chance that I would find a map."],
                ["TAKE POT LUCK", "If you take pot luck, you accept whatever is available without knowing what it will be like.", "We were so hungry we decided to take pot luck and stopped at the first restaurant we saw."],
                ["PLAY A WAITING GAME", "If you play a waiting game, you deliberately delay taking action in order to be able to act more effectively later.", "The cat keeps its eye on the bird, carefully playing a waiting game."],
            ],
            "notes": [{"heading": "", "text": "Look at the phrases and discuss them with your teacher. Did you know them?"}],
        },
        (55, 8): {
            "layout": "two-column mixed-conditional chart with a full-width To Consider note block below",
            "rows": [
                ["A HYPOTHETICAL FUTURE", "A RESULT IN THE PAST"],
                ["If I weren’t having a party next Friday,", "I would have been there at the mall to go out with you."],
                ["If they weren’t going to school tomorrow,", "We would have probably sent them to your place."],
                ["If she were having her doctor appointment on Thursday,", "I wouldn’t have taken my piano lesson."],
            ],
            "notes": [{"heading": "To Consider", "text": "1. The conditional that get mixed here is the 2nd one. It uses past progressive. 2. The result in the past is used with the perfect modal WOULD + HAVE + PAST PARTICIPLE. 3. These sentences do not necessarily start with the if clause first. E.G: We wouldn't have missed the meeting if we were having the chance to attend that day.. 4. When if clauses start these sentences, you need to separate them by commas as we see in the examples. 5. We can also use questions here. E.G: Would you have gone with us If he were coming to the ceremony on Sunday? 6. The time expressions in the conditional clause play very important role."}],
        },
        (55, 10): {
            "layout": "three-column index / Functions / Examples table with a separate To consider note block",
            "rows": [
                ["", "Functions", "Examples"],
                ["1", "Talk about hypothetical future situation with a past result.", "If I wasn’t having dinner with Dana on Wednesday, I would have accepted your invitation."],
            ],
            "notes": [{"heading": "To consider", "text": "This type of mixed conditional refers to possible future that prevents the person from doing / going another activity that eventually will remain in the past. *Sometimes you can see the if clauses using WASN’T and not WEREN’T"}],
        },
        (56, 6): {
            "layout": "three-column PHRASES / MEANING / EXAMPLE table with eight phrase rows and a teacher discussion prompt above",
            "rows": [
                ["PHRASES", "MEANING", "EXAMPLE"],
                ["BLOOD, SWEAT AND TEARS", "If something needs blood, sweat, and tears then it is a hard thing to do and requires a lot of effort.", "We spent 15 years building this business, it took blood, sweat, and tears to make it what it is today."],
                ["BURNING A CANDLE AT BOTH ENDS", "To work too hard as well as trying to do other things.", "My boss had a nervous breakdown last month, it’s not surprising, he was burning the candle at both ends for many months."],
                ["GET CRACKING", "Get started on a project or task.", "Right, do we all know what we are supposed to be doing? Great, let’s get cracking."],
                ["MOVE MOUNTAINS", "Make every possible effort, doing the impossible if needed.", "Trust me, I will move mountains to make sure that you are satisfied with your new branding."],
                ["PULL ONE’S OWN WEIGHT", "To do your fair share of work that a group of people is doing together.", "We are all working hard to reach our deadline, so we need you to start pulling your own weight otherwise we will have to let you go."],
                ["RAISE THE BAR", "Raise the standards which need to be met in order to qualify for something.s.", "Apple has really raised the bar with their latest iPhone."],
                ["STAY AHEAD OF THE GAME", "To react quickly and gain/keep an advantage.", "We are changing our marketing strategy, advertising will now include TikTok. We must stay ahead of the game."],
                ["BEND OVER BACKWARDS", "To work extra hard to help someone or to make them happy.", "I don’t understand why he continues to bend over backwards for Julia, she doesn’t appreciate it."],
            ],
            "notes": [{"heading": "", "text": "Look at the phrases and discuss them with your teacher. Did you know them?"}],
        },
        (56, 8): {
            "layout": "two-column STRUCTURES / EXAMPLES table with a full-width To Consider note block below",
            "rows": [
                ["STRUCTURES", "EXAMPLES"],
                ["Gerunds as nouns + complements", "Learning quantum physics requires great discipline."],
                ["Infinitive clauses + complements", "To design this crafts will change the way we see space. ."],
                ["Relative pronouns", "What I don’t get is all those references."],
            ],
            "notes": [{"heading": "To Consider", "text": "1. Having gerunds, infinitive clauses and relative pronouns as subjects is what we called in English nominalization. 2. This nominalization process makes a structure work as the subject of a sentence. 3. Each of the nominalized clause, have specific complements that go before the verb of the sentences 4. Gerunds and Infinitive clauses normally have NOUNS as complements. 5. Relative pronouns work on their own to be the subject of the sentence. 6. This can be used at any tense."}],
        },
        (56, 10): {
            "layout": "two-column Functions / Examples table with a separate To consider note block",
            "rows": [
                ["Functions", "Examples"],
                ["Use right phrase to introduce simple or complex topics.", "Redirecting the energy would have been the right call; now, we have to start moving mountains.\nTo prove Jake innocent has been one of the greatest challenges I have ever faced; I needed to raise the bar as a lawyer.\nHow you talked to him was so disrespectful."],
            ],
            "notes": [{"heading": "To consider", "text": "We can have even more complex clauses. To prevent John from taking the house would be the real challenge. In this case, we added to the infinitive clause not only its own complement but an extra prepositional phrase."}],
        },
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _source_slide(source: dict[str, Any], slide_number: int) -> dict[str, Any]:
    for slide in source["deck"]["slides"]:
        if slide.get("number") == slide_number:
            return slide
    raise ValueError(f"missing source slide {slide_number}")


def _normalise_source_text(value: str) -> str:
    return " ".join(value.split()).casefold()


def _proof(unit: int, slide_number: int, source_url: str, visible_texts: list[str]) -> dict[str, Any]:
    object_id, screenshot_bytes, screenshot_sha = PROOF[(unit, slide_number)]
    slide_url = f"{source_url}&slide=id.{object_id}"
    return {
        "slideNumber": slide_number,
        "sourceUrl": source_url,
        "visibleTexts": visible_texts,
        "publishedSlideProof": {
            "unit": unit,
            "slideNumber": slide_number,
            "publishedSlideUrl": slide_url,
            "observedSlideObjectId": object_id,
            "observedSlideNumber": slide_number,
            "screenshotBytes": screenshot_bytes,
            "screenshotSha256": screenshot_sha,
            "proofType": "visible-published-slide-screenshot",
            "wholeSlideScreenshotEvidenceOnly": True,
            "method": "Chrome visible published deck UI; selected slide verified in AX state",
        },
    }


def _table_entry(unit: int, slide_number: int, source: dict[str, Any], source_path: str) -> dict[str, Any]:
    slide = _source_slide(source, slide_number)
    review = _rows_and_notes()[(unit, slide_number)]
    source_url = source["sourceUrl"]
    source_text = _normalise_source_text("\n".join(slide.get("visibleTexts", [])))
    for row in review["rows"]:
        for cell in row:
            if cell and _normalise_source_text(cell) not in source_text:
                raise ValueError(
                    f"published cell is not present in source slide {unit}/{slide_number}: {cell!r}"
                )
    source_ref = {
        "kind": "published",
        "path": source_path,
        "sha256": _sha256(Path(source_path)),
        "slideNumber": slide_number,
    }
    published_html_ref = {
        "kind": "published-html-fetch",
        "path": str(IDENTITY_PATH).replace("\\", "/"),
        "sha256": _sha256(IDENTITY_PATH),
    }
    projection = {
        "approved": True,
        "mode": "structured",
        "source": "published-visible-text",
        "nativeIdentityConfirmed": False,
        "publishedLayout": review["layout"],
        "tables": [
            {
                "shapeName": "published-visible-text-projection",
                "shapeId": None,
                "bbox": None,
                "columnWidths": None,
                "rows": review["rows"],
                "literalSourceQuote": "Every cell is copied from the visible published slide; line breaks are presentation-only separators.",
            }
        ],
        "notes": review["notes"],
        "nativeShapeProvenance": {
            "available": False,
            "nativeIdentityConfirmed": False,
            "reason": "No authoritative native PPTX bytes were available for Units 53-56; the visible published slide is authoritative.",
        },
    }
    evidence = {
        "publishedTitle": slide.get("title", ""),
        "publishedVisibleTexts": list(slide.get("visibleTexts", [])),
        "publishedSlideProof": _proof(unit, slide_number, source_url, list(slide.get("visibleTexts", [])))["publishedSlideProof"],
        "nativePresentationAvailable": False,
        "nativeIdentityConfirmed": False,
        "nativeSourceFinding": "No authoritative native presentation bytes were available; preserve nativeIdentityConfirmed=false.",
        "visibleStructuredContent": {
            "cellMatrix": review["rows"],
            "notes": review["notes"],
        },
    }
    return {
        "unit": unit,
        "lessonId": source["lesson"]["id"],
        "sourceSlide": slide_number,
        "publishedSourceFile": source_path,
        "status": "reviewed",
        "clearTableSemanticsBlocker": True,
        "review": "The visible published slide contains an instructional structured chart/table. Keep it as an editable learner-facing matrix with all source cells and notes; never flatten the matrix into one paragraph.",
        "sourceEvidence": evidence,
        "approvedProjection": projection,
        "sourceRefs": [source_ref, published_html_ref],
    }


def build_document(root: Path) -> dict[str, Any]:
    rows_and_notes = _rows_and_notes()
    if set(rows_and_notes) != {(unit, slide) for unit in UNIT_SOURCES for slide in (6, 8, 10)}:
        raise AssertionError("review matrix must cover exactly slides 6, 8 and 10 for Units 53-56")

    sources: dict[int, dict[str, Any]] = {}
    records: list[dict[str, Any]] = []
    table_entries: list[dict[str, Any]] = []
    for unit, filename in UNIT_SOURCES.items():
        source_path = str((root / SOURCE_ROOT / filename).resolve())
        source_rel = (SOURCE_ROOT / filename).as_posix()
        source = _load(Path(source_path))
        sources[unit] = source
        source_url = source["sourceUrl"]
        reviewed_tables = [_table_entry(unit, slide, source, source_rel) for slide in (6, 8, 10)]
        proof_slides = []
        for slide_number in (6, 8, 10):
            slide = _source_slide(source, slide_number)
            proof_slides.append(_proof(unit, slide_number, source_url, list(slide.get("visibleTexts", []))))
        source_ref = {
            "kind": "published-source-file",
            "path": source_rel,
            "sha256": _sha256(Path(source_path)),
        }
        identity_ref = {
            "kind": "published-source-identity",
            "path": IDENTITY_PATH.as_posix(),
            "sha256": _sha256(root / IDENTITY_PATH),
        }
        records.append(
            {
                "unit": unit,
                "lessonId": source["lesson"]["id"],
                "sourceUrl": source_url,
                "status": "reviewed",
                "nativeIdentityConfirmed": False,
                "nativeIdentityReason": "No authoritative native presentation bytes were available; table projections use verified published source text only.",
                "sourceProofSlides": proof_slides,
                "reviewedTables": reviewed_tables,
                "reviewedFigures": [],
                "sourceRefs": [source_ref, identity_ref],
            }
        )
        table_entries.extend(reviewed_tables)

    table_review = {
        "schemaVersion": 1,
        "purpose": "Manual source-grounded review of every instructional structured table/chart on published slides 6, 8 and 10 in Units 53-56.",
        "reviewPolicy": {
            "publishedSlidesAuthoritativeOnMismatch": True,
            "sourceQuotesRequired": True,
            "nativeShapeProvenanceRequired": True,
            "noInventedCellsOrExamples": True,
            "preserveExcludedNotesAsLearnerText": True,
            "blockedWhenNativePublishedIdentityIsUnresolved": False,
            "publishedSourceProjectionAllowedWhenNativeDiffers": True,
            "publishedSourceProjectionRequiresLiteralCellQuotes": True,
        },
        "entries": table_entries,
        "summary": {
            "auditedCount": len(table_entries),
            "approvedProjectionCount": len(table_entries),
            "clearTableSemanticsBlockerCount": len(table_entries),
            "blockedCount": 0,
            "units": sorted(UNIT_SOURCES),
            "sourceSlides": [6, 8, 10],
            "chartsBySlide": {str(slide): len(UNIT_SOURCES) for slide in (6, 8, 10)},
            "note": "Native identity remains unresolved for all four units; this review authorizes literal published projections while retaining that provenance limitation.",
        },
    }
    return {
        "schemaVersion": 1,
        "courseId": COURSE_ID,
        "scope": {"unitFirst": 53, "unitLast": 56, "units": sorted(UNIT_SOURCES), "slides": [6, 8, 10]},
        "reviewStatus": "reviewed",
        "reviewPolicy": {
            "publishedSourceRequired": True,
            "nativeIdentityConfirmed": False,
            "noNativeAbsenceBypass": True,
            "projectionSource": "published visible deck text with visible-slide proof; no rendered screenshot is used as learner content",
            "tablesRequireLiteralPublishedCells": True,
        },
        "records": records,
        "tableReview": table_review,
        "sourceRefs": [
            {"kind": "published-source-identity", "path": IDENTITY_PATH.as_posix(), "sha256": _sha256(root / IDENTITY_PATH)},
            {"kind": "visible-deck-proof", "method": "Chrome visible published deck UI plus AX-selected slide and screenshot hash"},
        ],
    }


def validate(document: dict[str, Any]) -> None:
    entries = document["tableReview"]["entries"]
    assert len(entries) == 12
    assert {entry["unit"] for entry in entries} == {53, 54, 55, 56}
    assert {(entry["unit"], entry["sourceSlide"]) for entry in entries} == {
        (unit, slide) for unit in UNIT_SOURCES for slide in (6, 8, 10)
    }
    for entry in entries:
        assert entry["clearTableSemanticsBlocker"] is True
        projection = entry["approvedProjection"]
        assert projection["approved"] is True
        assert projection["source"] == "published-visible-text"
        assert projection["nativeIdentityConfirmed"] is False
        assert projection["tables"][0]["rows"]
        proof = entry["sourceEvidence"]["publishedSlideProof"]
        assert len(proof["screenshotSha256"]) == 64
        assert proof["wholeSlideScreenshotEvidenceOnly"] is True
        source_text = _normalise_source_text(
            "\n".join(entry["sourceEvidence"]["publishedVisibleTexts"])
        )
        for row in projection["tables"][0]["rows"]:
            for cell in row:
                assert "\ufffd" not in cell
                assert _normalise_source_text(cell) in source_text
    assert document["tableReview"]["summary"]["auditedCount"] == 12


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    root = args.root.resolve()
    output = (args.output or (root / OUTPUT_PATH)).resolve()
    document = build_document(root)
    validate(document)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "entries": len(document["tableReview"]["entries"]), "units": sorted(UNIT_SOURCES), "slides": [6, 8, 10]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
