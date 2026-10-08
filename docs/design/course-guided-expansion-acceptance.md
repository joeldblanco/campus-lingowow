# Lingowow Esencial — course expansion acceptance

Approved references: `graphic-guide-v1/README.md`,
`content-format-mockups/v3/README.md`, the deployed Unit 1 dual-mode compositions,
and the user's 2026-10-07 recording reference
`C:/Users/ACER/AppData/Local/Temp/codex-clipboard-0cf09da4-193e-4e26-8c76-23995ede84b2.png`.

## Required compositions before implementation

- Correct selected answer: retain the full-width answer surface and readable
  positive state; add a short emphasis animation and animated check. Do not
  animate unselected answers or change assessment/navigation semantics.
- Recording: preserve the speaking environment and task placement; use an
  exactly circular microphone control with the visible label fitted inside it.
  Recording, stopping and retry states remain accessible. No microphone access
  is needed for screenshot validation.
- Other course units: full illustrated environments occupy the lesson canvas,
  excluding header/sidebar; white fades protect the live content without a pasted
  rectangle. Keep one task heading, concise instruction, one primary action,
  secondary skip and explicit previous-step navigation.
- Preserve authored material and original audio URLs. Scene selection must not
  invent a character identity or use Unit 1's Peter/Carl for unrelated readings.
  Related vocabulary parts may retain their environment; unrelated scenes must
  use different environments within each lesson.
- Keep mobile content legible above the illustration. Preserve teacher/classroom
  operation, student progress and unfinished drafts; completed review starts at
  the beginning. Respect reduced motion.

## Delivery gate

Unit 1 controls were rendered at desktop 1920×1080 and mobile 390×844.
Actual screenshots are saved in
`C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/course-guided-expansion/`:

| Requirement | Evidence | Result |
| --- | --- | --- |
| Circular recording control, unchanged environment | record-circle-desktop.png; record-circle-mobile.png | 144×144 control; readable label; pass |
| Correct selected answer emphasis and check | correct-choice-desktop.png; correct-choice-mobile.png | Visible green halo and animated check; pass |
| Reduced-motion preference | Real Chrome emulated media; computed animation values | Choice surface/check animations disabled; pass |
| Recording permissions | No microphone control activated during visual inspection | No unexpected permission requested |

The temporary preview reproduces lesson content without the application shell;
public dev comparisons and a reference/actual comparison sheet remain pending.
Course expansion content inventory is captured in `docs/audit/`; native source
tables, figures and audio alignment are still being reviewed. Full technical
validation and all remaining course compositions are pending. This is a partial
acceptance record, not a claim that the course expansion is complete.

## Unit 2 actual review — 8 October, changes required

The composed Unit 2 plan was rendered in Chrome at desktop 1521×667 and mobile
390×844 against the approved content-format v3 requirements. The original flags
photograph and both original MP3s load. Listening presents four vertically stacked
choices and checks/advances automatically after selection; mobile text is readable.
Actual evidence in the directory above: `unit2-vocabulary-desktop-before.png`,
`unit2-table-desktop-before.png`, `unit2-short-answer-desktop-before.png`,
`unit2-listening-mobile.png`. The file `unit2-listening-correct-desktop.png` captures
the next question after the feedback timer, not the correct-answer animation.

Failed requirements: duplicate objective prose, generic/overlong titles, narrow
four-column teaching charts, a static blank worksheet before its interactive
equivalent, redundant exercise context, and the native black short-answer focus
outline. The short-answer primary action also needs the shared footer placement.
These discrepancies are being repaired; this plan is not visually accepted or
published. Teacher and final mobile/table comparisons remain pending.

## Follow-up actual checks — 8 October

The Unit 2 duplicate goals, four-column chart, duplicated blank worksheet,
exercise context card, black input outline and duplicated primary action have
been repaired. `unit2-grammar-desktop.png`, `unit2-grammar-mobile.png`,
`unit2-worked-example-desktop.png` and `unit2-short-answer-desktop.png` show the
actual implementation. These checks do not establish complete source coverage.

| Screen | Approved composition requirement | Actual evidence | Result |
| --- | --- | --- | --- |
| Unit 3 source calendar | Complete original seven-day content, readable mobile columns, full painted environment, one primary | unit3-calendar-desktop.png; unit3-calendar-mobile.png | Calendar and mobile words pass; heading correction pending refreshed capture |
| Unit 5 original instructional photograph | Preserve complete figure, no crop; environment fills canvas; controls remain reachable | unit5-original-family-desktop.png; unit5-original-family-mobile.png | Pass; photograph fits within 60vh, all four people retained |

The source composer now reports 51 eligible plans with no hard source/asset
blockers. A separate learner-visible audit found missing reading passages and
final writing/recording activities in some plans. Those omissions are release
blockers despite the technical preflight passing. Corrections, advanced visual
checks, teacher mode and the final reference comparison remain pending.

Units 53–56 remain outside this release plan: original downloadable audio bytes
have not been obtained. Unit 53's published player was observed playing; this is
an access/retrieval limitation, not evidence that its audio is absent.
