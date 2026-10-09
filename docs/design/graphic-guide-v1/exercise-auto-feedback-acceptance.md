# Guided exercise feedback acceptance

Approved references: user's 7 October screenshots (fill blanks step 6, grammar step 5, possessives step 8, listening step 11), graphic-guide-v1 and content-format-mockups/v3. Latest explicit instructions supersede manual checking for discrete choices.

Composition requirements: preserve complete illustrated environments covering the lesson canvas, character identity and scale, navy serif main heading, restrained supporting text, white rounded answer surfaces, blue primary action and opaque outlined Skip. Do not introduce new background panels or crop environments. Desktop and mobile must retain readable controls without overlap.

- Multiple choice and true/false: choosing immediately checks; feedback belongs to answer rows with a small accessible status. Automatically advance after a readable pause; no Check, Next question or previous-question buttons. Last feedback leads to a summary and the viewer's Continue action.
- Fill blanks: one local Check beside the sentence, also activated by Enter when all blanks are filled. Automatic question advancement after feedback, no competing question navigation. Underlined inputs with blue focus and no black rectangle.
- Grammar: arrowhead follows the curve's final tangent and points into the interrogative sentence.
- Existing exam and classroom behavior remains outside this practice flow.

## Visual acceptance — 7 October 2026

Compared the latest user references with actual rendered screens side by side in Chrome: [comparison](exercise-auto-feedback-comparison.html). Desktop captures use 1920×1080 (grammar 1920×1440); mobile captures use a 390×844 viewport. Full-page mobile grammar includes the controls below the illustration.

| Screen | Actual evidence | Requirement result |
| --- | --- | --- |
| Fill blanks | [Desktop](auto-fill-desktop-actual.jpg), [feedback](auto-fill-feedback-actual.jpg), [mobile](auto-fill-mobile-actual.jpg) | Pass: complete reading-room environment; white sentence surface; underline focus without rectangle; local Check/Enter; no previous/next-question buttons; opaque Skip. |
| Grammar | [Desktop](auto-grammar-desktop-actual.jpg), [mobile](auto-grammar-mobile-actual.jpg) | Pass: Lucas identity, scale, environment, table and typography preserved; arrowhead follows the final curve tangent. Mobile stacks content and character without control overlap. |
| Multiple choice | [Desktop](auto-choice-desktop-actual.jpg), [feedback](auto-choice-feedback-actual.jpg), [summary](auto-choice-summary-actual.jpg), [mobile](auto-choice-mobile-actual.jpg) | Pass: complete café environment, full-width rounded choices, immediate integrated correct/incorrect indicators, automatic advancement; only Continue after the summary. |
| Listening | [Desktop](auto-listening-desktop-actual.jpg), [feedback](auto-listening-feedback-actual.jpg), [mobile](auto-listening-mobile-actual.jpg) | Pass: complete listening-room environment and audio control retained; vertically stacked answers; discreet feedback replaces the large bordered Correcto panel; no Check/Next-question button. |

The local preview renders the real lesson components with authored unit content. Its empty top strip replaces the authenticated application header, and it does not write student progress. This comparison verifies the changed lesson canvas, not the authenticated shell. No material deviations remain in the changed canvas. Mobile places navigation in document flow below content to avoid overlap.

Behavioral verification: 158 unit-test files / 1,141 tests passed; the 36 focused tests passed again after final styling. Lint and TypeScript passed after removing the temporary preview and regenerating route types. Added coverage for automatic choice feedback and advancement, hidden-step timer pause/resume, duplicate submissions, fill Enter submission and mixed-blank validation, final summaries, legacy single-question blocks, unchanged exam behavior and exercise footer flow.
