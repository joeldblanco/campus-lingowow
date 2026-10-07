# Unit 1 teaching canvas requirements

This component is the authored teaching layer for the Unit 1 dual mode. The
viewer owns the single task heading, progress, navigation, scenic background,
and live audio blocks. `Unit1Teaching` owns only the short instructional copy
and its expandable references.

## Approved references

The implementation follows these approved mockups at their 1536 px board size:

| Role | Reference | Essential composition |
| --- | --- | --- |
| `transform` | `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-dual-mode-mockups/02-transforma.png` | One task heading supplied by the viewer; three short Georgia examples (`I am Lucas.`, `Are you Lucas?`, `I am not Lucas.`), tangent arrows, one Spanish tip, a short `He is a teacher. → Is he a teacher?` example, and an expandable `Ver las formas` reference. |
| `possessives` | `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-dual-mode-mockups/03-posesivos.png` | Three short examples for Peter and Ana, teal possessive words, Spanish translations, Peter's clean-shaven rust-shirt avatar, Ana's striped-sweater avatar, a Peter-and-Ana pair avatar, and an expandable `Ver todos los posesivos` reference containing all eight rows, including the repeated `You`. |
| `introductions` | `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-dual-mode-mockups/07-presentarse.png` | A brief `Ejemplos para practicar` label followed by four short examples covering name, age, origin, and occupation, with the viewer's heading and environment remaining visible behind the content. |
| `contact` | `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-dual-mode-mockups/08-contacto.png` | Live/address, phone, and email examples with small line icons, a visible fictional-example marker, and the `live` teaching tip. |
| `questions` | `C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/unit1-dual-mode-mockups/09-preguntas.png` | Two three-line transformations: statement → question → negative for `He is a student.` and `They are 20 years old.`, with teal verbs and arrowheads tangent to each path endpoint. |

The sixth role, `intro-audio-notes`, is a supporting teaching note for the
existing audio. It has no new player and does not replace or modify any audio.

## Visual and content contract

- Use the guide tokens in `docs/design/graphic-guide-v1/tokens.json`: navy
  `#10245C`, slate `#506187`, teal/positive `#08775E`, and error/negation
  `#C13E50`. Examples use Georgia; explanatory copy uses the repository's
  Nunito/system sans stack. Body text stays at least 16 px with comfortable
  line height.
- The canvas remains transparent so the root viewer can supply the approved
  full environment. Do not add a gradient, blob, cream panel, encompassing
  card, or CSS replacement for the painted scene. Keep examples as open groups
  with generous spacing and a mobile source order that reads top to bottom.
- Do not render a task heading inside the component. The viewer renders exactly
  one heading for the active step.
- Keep the approved copy: `My name is Peter.`, `I am 20 years old.`, `I am
  from the US.`, `She is a teacher.`, the New York contact examples, the two
  question/negative chains, and the Lucas transformation. Remove slogans that
  belong to the illustration rather than the lesson.
- `possessives` uses `public/images/lessons/this-is-me/peter-cutout-v2.webp`
  (clean-shaven Peter in the rust overshirt), plus the approved Ana crop at
  `/images/lessons/this-is-me/dual-mode/possessives.webp`; it never uses the
  Lucas asset. The expandable reference preserves the eight original rows: I/My,
  You/Your, He/His, She/Her, It/Its, We/Our, You/Your, They/Their. Tables use
  the available viewport width and wrap on small screens.
- `transform` keeps the five original `to be` rows behind `Ver las formas`.
  `intro-audio-notes` is a collapsed `Lo que escuchas` disclosure with three
  concise facts: Jake and Pete are both 17; Jake is a new student and the
  audio mentions Jackson Ave and 6th; Pete is in the same class and the audio
  mentions 8th. No audio facts are inferred and no new audio is generated.

## Accessibility and interaction

The expandable references are native `details`/`summary` controls and keep
table semantics. The transformation arrows are decorative SVGs with an
explicit tangent marker and are accompanied by readable text, so grammar is
understandable without the drawing. All live media and step controls stay in
the parent viewer; this component intentionally renders no `<audio>` element.
