# This is me! guided pilot

## Scope

Branch: `feat/lesson-guided-pilot`. Student course view only. Exact audited lesson
`cmk4otvgp0001w1p4ijdkv6i2` in course `cmjnr0g5x0001jp04fsw2fejs`.
Teacher, classroom, other lessons and existing completion checks keep their current renderer.
No database migration or content rewrite.

The mockups are a visual reference. Production vocabulary says Peter; grammar examples
say Lucas; the full reading says Carl Johnson. Preserve those actual texts, the two
audio URLs, all six questions, recording instructions and essay evaluation settings.
The production essay specifies a 30–50 word prompt but only has a 30-word minimum
configured. Do not invent a maximum enforcement rule.

## Illustration assets

Generated with the built-in image-generation tool; original raster assets, not screenshots
of the interface. Text and controls remain real DOM elements.

- `public/images/lessons/this-is-me/lucas.webp`
- `public/images/lessons/this-is-me/carl.webp`
- `public/images/lessons/this-is-me/speaking.webp`
- `public/images/lessons/this-is-me/writing.webp`

Runtime assets are WebP derivatives generated with Sharp at quality 82 and
effort 6, resized to a maximum width of 1200px without upscaling. The source
PNG files remain in the source worktree.

| Asset | Original PNG | Runtime WebP | Dimensions | Reduction |
| --- | ---: | ---: | ---: | ---: |
| `carl` | 2,397,102 B | 110,816 B | 1200 × 800 | 95.38% |
| `lucas` | 2,048,186 B | 71,714 B | 1200 × 800 | 96.50% |
| `speaking` | 2,105,406 B | 90,292 B | 1200 × 800 | 95.71% |
| `writing` | 2,192,319 B | 103,468 B | 1200 × 800 | 95.28% |
| **Total** | **8,743,013 B** | **376,290 B** | — | **95.70%** |

Prompts used:

1. Lucas: standalone adult educational editorial café portrait, friendly young adult
   with tan skin, curly dark brown hair, short beard, cobalt overshirt, waving;
   ivory/pale lilac organic background, plants and sage lamp, no UI/text/letters.
2. Carl: standalone café portrait of a distinct 32-year-old man with dark brown skin,
   close-cropped hair, round glasses, clean-shaven face, sage shirt; environmental
   engineering landscape plan, ivory/lilac background, no UI/text/letters.
3. Speaking: standalone microphone and navy headphones on café table, coffee and
   plants, sage lamp; painterly adult editorial style, ivory/lilac background,
   no people/UI/text.
4. Writing: standalone blank lined notebook, cobalt pen and sage coffee cup on café
   table; painterly adult editorial style, ivory/lilac backdrop, no people/UI/text.

## Review

Local server and visual browser verification remain disabled at the user's request.
The student reviews the rendered design. Resume storage is scoped by authenticated
student, course and lesson; existing server completion remains authoritative.
