# Units 53–56 visual acceptance report

**Status: representative visual gate passed; dev evidence only.** The checked compositions and interaction states meet the approved guide and mockup requirements. This report covers 17 representative screenshots from the 57-step final plan; it does not claim a manual visual review of every scene.

## Approved reference and evidence set

The approved references are:

- `docs/design/graphic-guide-v1/scene-acceptance-v5.md` and the guide's scene, activity, audio, grammar, and choice references.
- `docs/design/content-format-mockups/v3/01-basic-practice.webp` for discrete practice.
- `docs/design/content-format-mockups/v3/03-language.webp` for grammar and source tables.
- `docs/design/content-format-mockups/v3/04-multimedia.webp` for source figures, reading, and listening.
- The delivered Unit 1 dual-mode screens, as required by the course acceptance brief.

The actual captures are under:

`C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a\course-guided-expansion\final-units\`

The requested comparison sizes are 1536×864 desktop and 390×844 mobile. The recorded files preserve their actual pixels: final interaction captures are 1536×674, other desktop files are 1536×864 or 1536×730, mobile files are 375×811, and the recording capture is 390×843 as measured from the PNG. The 1536×674, 1536×730, and 375×811 files include the native capture window height; the report does not normalize or crop them.

Open the concrete side-by-side comparison at:

`C:\Users\ACER\.codex\visualizations\2026\10\03\01a102c6-28e9-7d12-ab7a-d8b58f36616a\course-guided-expansion\final-units\comparison.html`

## Representative screen results

| Capture | Actual pixels | Reference comparison | Result | Evidence and remaining work |
| --- | ---: | --- | --- | --- |
| Unit 53 source figure, desktop | 1536×864 | v3 Multimedia + scene guide | **Pass** | Full source photograph is visible and uncropped. The painted botanical office environment, white fade, heading, and bottom controls remain present. |
| Unit 53 listening, desktop | 1536×864 | guide listening reference + v3 Multimedia | **Reference only** | Original 56-second player and environment are visible, but this older `3/13` frame is excluded from final acceptance. Unit 55 Audio 2 and the completed Unit 53 summary supply the verified desktop listening evidence. |
| Unit 53 listening, mobile | 375×811 | guide listening reference + v3 Multimedia | **Pass for captured state** | Final 14-step counter is visible; player, four options, responsive environment, and readable controls fit the narrow viewport. The local dev issue badge remains in the capture. |
| Unit 53 choice feedback, desktop | 1536×674 | guide choice reference + v3 Basic Practice | **Pass** | Final capture shows the correct option with green check, `Correcta`, and `¡Correcto!`; DOM verification reports `guided-choice-correct` at 520ms, and the reduced-motion branch reports `animation: none`. |
| Unit 53 choice feedback, mobile reduced-motion layout | 375×811 | guide choice reference + v3 Basic Practice | **Pass for layout/state branch** | Responsive reduced-motion frame is captured without claiming a selected green state; the verified checked state is covered by the desktop capture and accessibility result. |
| Unit 53 expressions table, desktop | 1536×730 | v3 Language | **Reference only** | This older desktop capture retains the `Teacher prompt:` prefix and is excluded from final acceptance. Corrected mobile table behavior and the Unit 56 grammar pair are the final structured-table representatives. |
| Unit 53 expressions table, mobile | 375×811 | v3 Language | **Pass for corrected mobile state** | The corrected mobile capture keeps the source instruction and stationary scroll hint above the table; horizontal table overflow remains usable and the source columns are present. |
| Unit 53 table examples view, mobile | 375×811 | v3 Language | **Pass for corrected mobile state** | The updated example view keeps the instruction and scroll hint stationary while the table scrolls horizontally. |
| Unit 55 original audio, desktop | 1536×730 | guide listening reference + v3 Multimedia | **Pass for captured playback** | Dedicated capture verifies the corrected original Audio 2 playing through the 0:47 clip, with the listening UI and full environment present. The local dev issue badge remains in the capture. |
| Unit 53 completed listening, desktop | 1536×674 | guide listening reference + v3 Multimedia | **Pass** | Completed summary shows all four authored questions marked `Correcta` with one continuation action and the original environment. |
| Unit 53 recording, desktop | 1536×730 | v3 Production + recording guide | **Pass** | Circular `Grabar respuesta` control is visible with the original roleplay prompt and complete illustrated environment. |
| Unit 53 recording, mobile | 390×843 | v3 Production + recording guide | **Pass** | Circular recording control remains centered and readable with the roleplay prompt and responsive environment. |
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
| Discrete choice correction and success state | **Pass** | Final Unit 53 capture shows the checked correct option and feedback; DOM evidence reports the 520ms `guided-choice-correct` animation, reduced motion reports `animation: none`, and the correct checkbox is accessibility-checked. |
| One primary action plus readable skip action | **Pass where visible** | Listening and choice captures show the primary flow plus `Saltar ejercicio`; content captures show the primary `Continuar` action. |
| Circular recording control | **Pass in representatives** | Unit 53 desktop and mobile recording captures show the circular control, concise accessible label, roleplay prompt, and responsive placement. |
| Source tables retain authored structure | **Pass in representatives** | Corrected mobile captures pass the stationary instruction/hint and horizontal-scroll behavior; the Unit 56 grammar pair preserves source explanation and rows. All 12 reviewed table notes remain learner-visible. The older desktop table capture is excluded. |
| Mobile layout at requested viewport | **Pass in representatives** | Final recording mobile is 390px wide, corrected table and reduced-motion captures are responsive, and the selected mobile frames preserve the full environment and controls. |
| Reduced-motion success state | **Pass** | `motion-verification.json` records normal `guided-choice-correct` at 520ms and reduced-motion `animation: none`; the final reduced-motion mobile frame confirms responsive layout without claiming a transient selected state. |
| Original audio and provenance | **Pass** | The composer audit reports 8 ready/reviewed audios and 32 reviewed listening items. The Unit 55 Audio 2 desktop capture verifies the corrected 0:47 original clip; its Drive identity ends in `6h6fQh` and source bytes remain immutable. |

## Content and data readiness evidence

The supplied main-branch composer audit reports 4 published sources, 8 ready/reviewed audio records, 4 ready figures, 12 reviewed source tables with their notes learner-visible, 32 reviewed listening items, and zero rejected listening entries. The final scene audit reports 4 publishable plans with 14, 15, 14, and 14 steps for Units 53–56 respectively, using 29 available scenes with zero unrelated repeats or capacity shortfalls. Legacy completion state is preserved for all four lessons; the apply simulation passed rollback-history checks and left Unit 1 unchanged.

Those results establish source and plan readiness. They do not replace the visual checks above. The report remains dev-only; no production promotion was performed.

## Scope and operational notes

1. The old Unit 53 desktop listening and desktop table screenshots remain in the evidence directory for audit history but are excluded from final acceptance because newer verified representatives are available.
2. The final visual gate is representative: 17 captures cover the checked compositions, while the 57-step scene audit supplies data-level evidence for all four plans. It is not a manual screenshot review of every scene.
3. The `N` issue badge visible in some captures is a local Next development-tools overlay, not product UI; it is excluded from the design result and should be omitted from any public evidence export.
4. No production promotion was performed; publication and deployment checks remain operational gates separate from this local visual acceptance record.

Main supplied green verification for this dev snapshot: 1,229 unit tests, lint, TypeScript, and 178 focused Python checks. This documentation-only update did not rerun those checks.
