# Unit 1 polish — visual acceptance

Reference: approved graphic guide and dual-mode compositions, plus the user's
2026-10-07 corrections. Preserve complete illustrated environments, character
identity, spacious typography and the existing lesson controls.

## Comparable reference and actual renders

The actual screenshots use Chrome with the real GuidedLessonViewer and reviewed
Unit 1 content in a temporary local preview. The preview's small header replaces
the application frame; it does not represent a sidebar/header redesign. The
temporary preview route was removed before publication.

Evidence directory: `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-polish`.

| Composition | User reference | Actual Chrome render | Result |
| --- | --- | --- | --- |
| Possessive avatars | `C:/Users/ACER/AppData/Local/Temp/codex-clipboard-8a13c369-4e89-41bd-9d7a-bab3f46abf6c.png` | `avatars-detail.jpg`, `avatars-desktop.jpg`, `avatars-mobile.jpg` | Peter's full face is centered in each circular crop; Ana and the paired identities are preserved. Pale lavender fills the otherwise transparent circle. |
| Carl reading | `C:/Users/ACER/AppData/Local/Temp/codex-clipboard-b90bd16f-55f2-4086-9caa-c9850db4bb35.png` and approved `04-carl.png` | `carl-desktop.jpg` (1920×1080), `carl-desktop-1440.jpg` (1440×800), `carl-mobile.jpg` (390px) | Text stays within a clear left column, before the face. The original complete environment remains broad; its horizontal orientation is reversed to put Carl on the right. No rectangular reading background. The face is not cropped at the top. Mobile places the reading above the illustrated environment. |

## Acceptance requirements

- Illustration coverage and complete environment: PASS; unchanged source WebP,
  full canvas on desktop and a separate illustrated section on mobile.
- Character identity/style: PASS; existing Peter, Ana and Carl assets retained.
- Text hierarchy and readability: PASS at 1920, 1440 and 390px; Carl's text has
  a constrained column and its own white fade, without a pasted card.
- Controls, spacing and responsive layout: PASS; controls remain outside the
  reading and below the mobile illustration, with the existing lesson actions.
- Forward/backward step transitions: PASS in Chrome; content and scene enter
  with directional 8px movement, 250ms opacity/blur transition. Interactive
  blocks stay mounted, preserving drafts.
- Reduced motion: PASS; Chrome emulation of `prefers-reduced-motion: reduce`
  yields no animation. The override was reset after validation.
- Completed review starts at step 1: PASS in actual Chrome after reload despite
  a saved later step; in-progress resume is preserved by automated tests.

No unresolved material composition deviations. Public deployment health and
build timing must be reported separately from this local visual acceptance.
