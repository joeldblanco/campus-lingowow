# Full-canvas illustrated unit — acceptance requirements

Latest approved references are the user screenshots dated 2026-10-06: practice 7e41274c, Peter b42a0312, and Lucas 0363a8f2. These instructions supersede v3 organic clipping and restricted backdrop dimensions.

- All 13 steps: use the entire lesson canvas outside the application header/sidebar. Keep authored content, sequence, controls, character identities and painterly style. Actual environments remain visible; white transitions protect live text and controls.
- Vocabulary 1–3: Peter classroom enlarged across the left/background, no shaped crop; readable audio and fact cards on the right. Preserve window, chalkboard, plants, desk and globe.
- Grammar 5: Lucas learning-room enlarged on the right/background, no shaped crop; table and all transformations on a clear white surface on the left.
- Practice 4, 6, 7, 8, 10, 11: complete study-room scenery fills the viewer, including outer margins; live exercise stays readable on the left.
- Reading 9: Carl office enlarged on the right; preserve Carl identity and complete authored reading on the left.
- Writing 12 / speaking 13: full painted desk environments with notebook / microphone and headphones. Keep existing fields, limits and actions.
- Mobile/tablet: content and controls remain reachable, no horizontal overflow; retain substantial uncropped scenery below content where overlay would obscure the person. Decoration never intercepts input.
- Footer: white transition behind controls; no hard illustration-shaped edge. Header/sidebar remain outside the canvas.

User authorized updating only conflicting crop/coverage test assertions. Technical and rendered visual verification pending; this document is not a completion claim.

## Rendered comparison and results

[Side-by-side reference comparison](scene-comparison-v4.html) contains the three annotated user references and actual Chrome captures. Reviewed at the same display scale; original references are 1920px and local desktop is approximately 1520px.

| Screens | Result | Actual evidence |
| --- | --- | --- |
| Vocabulary 1–3 / Peter | Enlarged full classroom without organic clipping, facts/audio readable on the right; fade toward white beside cards and footer. | [Peter](peter-canvas-v4-actual.jpg) |
| Practice 4, 6, 7, 8, 10, 11 | Background fills viewer edges and margins; live matching, fields, table, choices and audio remain clear. Progress uses a white surface. | [Practice](practice-canvas-v4-actual.jpg), [audio](audio-canvas-v4-actual.jpg) |
| Grammar 5 / Lucas | Enlarged full room, no shaped clip; table and all three transformations readable, including the lower content after scrolling. | [Lucas](lucas-canvas-v4-actual.jpg), [full content](lucas-canvas-v4-full.jpg) |
| Reading 9 / Carl | Enlarged office on the right; complete reading remains visible on the left. | [Carl](carl-canvas-v4-actual.jpg) |
| Writing 12 | Notebook/desk scene fills canvas; local white fade behind instruction/editor preserves contrast. | [Writing](writing-canvas-v4-actual.jpg) |
| Speaking 13 | Full microphone/headphone desk setting; live recording button and limit remain readable. | [Speaking](speaking-canvas-v4-actual.jpg) |
| Mobile / tablet | Content precedes scenery, no horizontal document overflow at 390/820 viewport widths (375/805 content widths with scrollbar). True/false options corrected to fit. | [Mobile](audio-canvas-v4-mobile.jpg), [tablet](lucas-canvas-v4-tablet.jpg) |

Desktop uses full-bleed cover scaling; decorative edges can extend beyond the viewport and long grammar content requires document scrolling. Mobile/tablet retain scenery below content to avoid covering people or activities. These are responsive treatments, not shaped image crops. Header/sidebar remain excluded.

The local fixture uses the actual saved authored pilot unit with a minimal header/sidebar shell, so authentication and public-shell behavior still require the post-deploy check. No grading, recording or completion was submitted. A local true/false selection was inspected without submission. Browser extension-injected hydration attributes remain an environment limitation.

## Technical checks

145 test files / 1059 tests passed. Lint and TypeScript passed. The scene tests replace only user-authorized organic-crop and restricted-coverage requirements; pointer-free decoration, source identity and real images remain asserted. White blending is also asserted. Remaining changes are non-behavioral styling; no authored-content or grading behavior changed. Final cleanup and CI validation follow before publication.
