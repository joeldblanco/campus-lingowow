# Units 53–56 visual acceptance report

**Status: partial visual gate; dev evidence only.** This report records the available side-by-side evidence and keeps publication pending for the unresolved captures listed below. It covers 13 representative screenshots from the 57-step final plan; it does not claim a manual visual review of every scene.

## Approved reference and evidence set

The approved references are:

- `docs/design/graphic-guide-v1/scene-acceptance-v5.md` and the guide's scene, activity, audio, grammar, and choice references.
- `docs/design/content-format-mockups/v3/01-basic-practice.webp` for discrete practice.
- `docs/design/content-format-mockups/v3/03-language.webp` for grammar and source tables.
- `docs/design/content-format-mockups/v3/04-multimedia.webp` for source figures, reading, and listening.
- The delivered Unit 1 dual-mode screens, as required by the course acceptance brief.

The actual captures are under:

`C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a\course-guided-expansion\final-units\`

The requested comparison sizes are 1536×864 desktop and 390×844 mobile. The recorded files preserve their actual pixels: desktop files are 1536×864 or 1536×730, mobile files are 375×811 or 375×844, and the examples-only table capture is 390×843. The 1536×730 and 375×811 files include the native capture window height; the report does not normalize or crop them.

Open the concrete side-by-side comparison at:

`C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a\course-guided-expansion\final-units\comparison.html`

## Representative screen results

| Capture | Actual pixels | Reference comparison | Result | Evidence and remaining work |
| --- | ---: | --- | --- | --- |
| Unit 53 source figure, desktop | 1536×864 | v3 Multimedia + scene guide | **Pass** | Full source photograph is visible and uncropped. The painted botanical office environment, white fade, heading, and bottom controls remain present. |
| Unit 53 listening, desktop | 1536×864 | guide listening reference + v3 Multimedia | **Partial** | Original 56-second player, readable four-choice layout, environment, back, and skip controls are visible. The capture shows an intermediate `3/13` counter; final 14-step metadata needs a fresh capture. |
| Unit 53 listening, mobile | 375×811 | guide listening reference + v3 Multimedia | **Pass for captured state** | Final 14-step counter is visible; player, four options, responsive environment, and readable controls fit the narrow viewport. The local dev issue badge remains in the capture. |
| Unit 53 choice feedback, desktop | 1536×864 | guide choice reference + v3 Basic Practice | **Unverified for final approval** | The supplied image is an initial/raw capture. It shows a selected correct state, but the parent visual review marked this file non-final; use a dedicated recapture for animation and reduced-motion acceptance. |
| Unit 53 expressions table, desktop | 1536×730 | v3 Language | **Partial** | The original three-column table is structured and readable. This capture still includes the `Teacher prompt:` prefix slated for removal; recapture after that content update is required. |
| Unit 53 expressions table, mobile | 375×844 | v3 Language | **Partial** | Source columns remain available through horizontal scrolling and the table text is present. The viewport is 375px wide instead of the requested 390px, and the current capture includes the pending prompt prefix. |
| Unit 53 table examples view, mobile | 390×843 | v3 Language | **Partial** | This is the closest requested mobile size and demonstrates the examples column. It is a scroll-position sample rather than a complete initial mobile frame; use the updated capture for final approval. |
| Unit 55 original audio, desktop | 1536×730 | guide listening reference + v3 Multimedia | **Pass for captured playback** | Dedicated capture verifies the corrected original Audio 2 playing through the 0:47 clip, with the listening UI and full environment present. The local dev issue badge remains in the capture. |
| Unit 54 source figure, desktop | 1536×730 | v3 Multimedia + scene guide | **Pass for captured state** | Original figure remains complete, with the bakery environment, white fade, heading hierarchy, and navigation controls visible. Native capture height differs from the requested 864px. |
| Unit 55 source figure, desktop | 1536×730 | v3 Multimedia + scene guide | **Pass for captured state** | Original figure remains complete, with the botanical environment, white fade, heading hierarchy, and navigation controls visible. Native capture height differs from the requested 864px. |
| Unit 56 source figure, mobile | 375×811 | v3 Multimedia + scene guide | **Pass for captured state** | Original figure remains visible above the full bakery environment with responsive controls. Native capture width and height differ from the requested 390×844. |
| Unit 56 grammar table, desktop | 1536×730 | v3 Language + grammar guide | **Pass for captured state** | Source explanation and the structured two-column table remain readable over the complete botanical environment. Native capture height differs from the requested 864px. |
| Unit 56 grammar table, mobile | 375×811 | v3 Language + grammar guide | **Pass for captured state** | Source explanation and table rows remain readable in the mobile column layout. Native capture width and height differ from the requested 390×844. |

## Composition checks

| Requirement | Result | Evidence |
| --- | --- | --- |
| Complete painted environments at Unit 1 scale | **Pass in representatives** | Units 53–56 figure, listening, table, and grammar captures retain broad illustrated environments and the white fade. Scene audit reports 4 plans, 57 steps, 57 unique assignments, no unrelated repeats, and no capacity failures. |
| Original figures preserve identity and source wording | **Pass in representatives** | Unit 53, 54, 55, and 56 figure captures show the source photographs without crop or replacement. |
| Clear heading, concise instruction, readable controls | **Pass in representatives** | Figure, listening, choice, table, and grammar captures show the heading hierarchy and readable primary/back/skip controls. |
| Discrete choice correction and success state | **Unverified for final approval** | The initial Unit 53 choice capture shows a selected correct option, green check, and `¡Correcto!`, but it is not the final visual evidence. Animation timing and reduced-motion behavior require a dedicated interaction capture. |
| One primary action plus readable skip action | **Pass where visible** | Listening and choice captures show the primary flow plus `Saltar ejercicio`; content captures show the primary `Continuar` action. |
| Circular recording control | **Unverified** | No Unit 53–56 recording capture is present in the final-unit evidence directory. |
| Source tables retain authored structure | **Partial** | Unit 53 and Unit 56 structures are visible. The final data now removes the learner-visible teacher prompt prefix, but the supplied Unit 53 screenshots predate that correction and need recapture. All 12 reviewed table notes remain learner-visible. |
| Mobile layout at requested viewport | **Partial** | Responsive layout is visible, and the final dedicated viewport capture handles OS scaling. The supplied files retain their native 375px or 390px pixel dimensions, so the updated table frame should be recaptured for the requested viewport evidence. |
| Reduced-motion success state | **Unverified from screenshots** | Static captures cannot establish the media-query behavior. |
| Original audio and provenance | **Pass in data audit; visual playback still representative** | The composer audit reports 8 ready/reviewed audios and 32 reviewed listening items. Unit 55 Audio 2 retains the corrected Drive identity ending in `6h6fQh`; source bytes remain immutable. |

## Content and data readiness evidence

The supplied main-branch composer audit reports 4 published sources, 8 ready/reviewed audio records, 4 ready figures, 12 reviewed source tables with their notes learner-visible, 32 reviewed listening items, and zero rejected listening entries. The final scene audit reports 4 publishable plans with 14, 15, 14, and 14 steps for Units 53–56 respectively, using 29 available scenes with zero unrelated repeats or capacity shortfalls. Legacy completion state is preserved for all four lessons; the apply simulation passed rollback-history checks and left Unit 1 unchanged.

Those results establish source and plan readiness. They do not replace the visual checks above. The report remains dev-only; no production promotion was performed.

## Open items before visual publication approval

1. Recapture Unit 53 desktop listening after the final 14-step plan is reflected in the counter; the current desktop file is the intermediate 13-step capture. The mobile file is the final 14-step representative.
2. Recapture Unit 53 table desktop/mobile after the data correction that removed the `Teacher prompt:` learner-visible prefix and at the requested mobile viewport.
3. Provide a final Unit 53–56 recording screen capture to verify the circular recording control and its responsive placement.
4. Replace the initial Unit 53 choice screenshot with a dedicated final capture, then verify the correct-choice animation and reduced-motion state through an interaction capture or equivalent visual behavior check.
5. Remove the visible dev issue badges from final presentation captures; they are present in the supplied local captures and are not production UI evidence.

Main supplied green verification for this dev snapshot: 1,229 unit tests, lint, TypeScript, and 178 focused Python checks. This documentation-only update did not rerun those checks.
