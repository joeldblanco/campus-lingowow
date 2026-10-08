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
