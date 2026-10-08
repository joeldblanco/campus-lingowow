# Unit53–56 semantic exercise-review patch

This patch resolves the four `exercise-review-evidence-mismatch` blockers for the published slide 12 grammar-production activities. The prior review item used the generic evidence `A. Complete the grammar exercise on the published slide.`; each revised entry now copies the exact published instruction and example from its matching `source-files/<lessonId>.json` slide 12.

Each activity remains an open response: the learner must write eight sentences, the original source wording and example are preserved, and `answerItems` stays empty with `doNotAutoGrade: true`. The patch keeps teacher/classroom review intent in metadata without inventing a canonical answer.

| Unit | Lesson | Item | Published instruction | Example | Result |
| ---: | --- | --- | --- | --- | --- |
| 53 | `cmnmm9vul002tw1qkq6vmdn9t` | `u53-s12-a` | “A. Using the grammar learned in the lesson, write 8 sentences expressing events or actions that are unreal in both the past and present. Follow the example.” | “0. If we had called before, they would be waiting.” | resolved open response |
| 54 | `cmnmm9w6q002ww1qkmhschbtj` | `u54-s12-a` | “A. Using the grammar learned in the lesson, write 8 sentences expressing events or actions that are hypothetical in the present with a past result. Follow the example.” | “0. If they called before, they would have gotten an answer.” | resolved open response |
| 55 | `cmnmm9wiv002zw1qkz23p6kdp` | `u55-s12-a` | “A. Using the grammar learned in the lesson, write 8 sentences expressing events or actions that express a hypothetical future with a past result. Follow the example.” | “0. If we weren’t going to call you for confirmation tonight, we would have not said that.” | resolved open response |
| 56 | `cmnmm9wv00032w1qkxr02azgp` | `u56-s12-a` | “A. Using the grammar learned in the lesson, write 8 sentences using right phrases to introduce simple and complex topics. Follow the example.” | “0. Developing sustainable energy will give this world a better chance.” | resolved open response |

The U53 Audio 2 source remains attached to published source slide 12 with SHA `e2dbfac9997ff26812ae77a103ccf0d36de922fa0ed61b5246e9723973fe7e37`; the exact listening prompt is on published slide 13. The patch records that cross-slide link by lesson, audio ordinal, and SHA so runtime can attach the verified audio to the slide 13 listening activity without moving or duplicating the source media metadata.

Validation evidence: every `sourceEvidence` string equals the published slide 12 `visibleTexts`, each entry's provenance SHA-256 was computed from the corresponding source JSON, and all four entries contain no answer key.
