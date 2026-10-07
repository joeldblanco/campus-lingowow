# Header and footer refinement — approved requirements

Latest user reference: annotation on the public practice screenshot, 2026-10-06. Supersedes the prior header breadcrumb and rectangular footer wash.

- Guided view: remove course/module breadcrumb entirely. Keep the unit name, exit link and completion status. Classic headers keep their breadcrumb.
- Footer: no visible white rectangular corners or hard side edges. Use diffuse white blending localized around live buttons; the footer surface itself is transparent, without a rectangular painted layer. Keep live outlined/primary buttons and their targets.
- Preserve the large painted environments, white blending near content, original questions, audio, recording and navigation.
- Compare actual desktop practice (top and bottom), portrait/grammar and mobile layouts before merging. Technical and rendered checks pending.

## Actual comparison and acceptance

[Side-by-side comparison](scene-comparison-v5.html) uses the public screenshot supplied by the user as the baseline and actual Chrome local rendering at comparable width.

| Requirement | Result | Evidence |
| --- | --- | --- |
| Remove guided course/module breadcrumb | Pass: only the unit name and exit remain; completion status retained. | [Actual practice](footer-v5-actual.jpg) |
| Remove white rectangular footer corners | Pass: footer background is transparent; diffuse white shadows surround individual buttons. No painted bar or hard side edge remains. | [Practice](footer-v5-actual.jpg), [grammar](footer-v5-grammar.jpg) |
| Preserve large scenery and live controls | Pass: original environments remain, matching/reset/navigation stay visible and reachable. Grammar checked including lower transformations after scrolling. | Actual captures above |
| Mobile | Pass at390px override: document width equals scroll width375px; scene and all footer controls remain reachable. Override cleared. | [Mobile](footer-v5-mobile.jpg) |

The fixture uses actual saved authored unit data and the real header/viewer components with a minimal navigation shell. Public authenticated shell verification follows deployment. No answers, grades, recordings or completion were submitted.

Tests added: guided breadcrumb absence while keeping unit/exit; classic breadcrumb preservation. The guided absence test failed before implementation and passed afterward. Existing tests remain unchanged. Footer edits are non-behavioral styling, checked visually; action wiring is unchanged. React review found no new hooks, effects, data fetching or dependencies; existing accessible control names and focus outlines remain.
