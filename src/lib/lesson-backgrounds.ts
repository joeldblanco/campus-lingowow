import type { GuidedLessonStep } from './guided-lesson'

export const LESSON_BACKGROUNDS = [
  '/images/lessons/this-is-me/study-room-v3.webp',
  '/images/lessons/backgrounds/library.webp',
  '/images/lessons/backgrounds/bakery.webp',
  '/images/lessons/backgrounds/botanical-office.webp',
  '/images/lessons/backgrounds/listening-lounge.webp',
  '/images/lessons/backgrounds/campus.webp',
  '/images/lessons/this-is-me/speaking.webp',
  '/images/lessons/this-is-me/writing.webp',
] as const

function preferredBackground(step: GuidedLessonStep): string | undefined {
  if (step.kind === 'speaking') return LESSON_BACKGROUNDS[6]
  if (step.kind === 'writing') return LESSON_BACKGROUNDS[7]
  if (step.blocks.some((block) => block.type === 'true_false' || block.type === 'audio')) return LESSON_BACKGROUNDS[4]
  if (step.blocks.some((block) => block.type === 'multiple_choice') && step.label.includes('Carl')) return LESSON_BACKGROUNDS[3]
  if (step.blocks.some((block) => block.type === 'structured-content')) return LESSON_BACKGROUNDS[5]
  if (step.blocks.some((block) => block.type === 'fill_blanks')) return LESSON_BACKGROUNDS[1]
  if (step.blocks.some((block) => block.type === 'multiple_choice')) return LESSON_BACKGROUNDS[2]
  return undefined
}

export function assignLessonBackgrounds(steps: GuidedLessonStep[]): Record<string, string> {
  const result: Record<string, string> = {}
  const reserved = new Set<string>()
  for (const step of steps) {
    const authoredScene = step.blocks.find(block => typeof block.data?.scene === 'string')?.data?.scene
    if (typeof authoredScene === 'string') { reserved.add(authoredScene); continue }
    if (step.kind === 'vocabulary' || step.kind === 'grammar' || step.kind === 'reading') continue
    const preferred = preferredBackground(step)
    if (preferred) reserved.add(preferred)
  }
  const available = LESSON_BACKGROUNDS.filter((src) => !reserved.has(src))
  const used = new Set<string>()
  for (const step of steps) {
    const authoredScene = step.blocks.find(block => typeof block.data?.scene === 'string')?.data?.scene
    if (typeof authoredScene === 'string') { result[step.id] = authoredScene; used.add(authoredScene); continue }
    // These scenes carry a named character's authored context. Vocabulary
    // parts deliberately remain in the same room as a continuous introduction.
    const character = step.kind === 'vocabulary' ? 'peter'
      : step.kind === 'reading' ? 'carl'
        : step.kind === 'grammar' ? 'lucas' : undefined
    if (character) {
      result[step.id] = `/images/lessons/this-is-me/${character}.webp`
      continue
    }
    const preferred = preferredBackground(step)
    const source = preferred && !used.has(preferred) ? preferred
      : available.find((src) => !used.has(src)) ?? LESSON_BACKGROUNDS.find((src) => !used.has(src))
    // Expand the catalogue before enabling units beyond its capacity.
    if (!source) throw new Error('The lesson needs additional unique illustrated backgrounds.')
    used.add(source)
    result[step.id] = source
  }
  return result
}
