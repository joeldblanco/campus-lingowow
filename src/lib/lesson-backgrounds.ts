import type { GuidedLessonStep } from './guided-lesson'
import type { Block } from '@/types/course-builder'
import {
  getIllustratedLessonScene,
  getIllustratedLessonTopic,
  isApprovedIllustratedSceneSource,
  type IllustratedLessonTopic,
} from './illustrated-lesson'

export const LESSON_BACKGROUNDS = [
  '/images/lessons/this-is-me/study-room-v3.webp',
  '/images/lessons/backgrounds/library.webp',
  '/images/lessons/backgrounds/bakery.webp',
  '/images/lessons/backgrounds/botanical-office.webp',
  '/images/lessons/backgrounds/listening-lounge.webp',
  '/images/lessons/backgrounds/campus.webp',
  '/images/lessons/this-is-me/speaking.webp',
  '/images/lessons/this-is-me/writing.webp',
  '/images/lessons/backgrounds/family-living-room.webp',
  '/images/lessons/backgrounds/daily-kitchen.webp',
  '/images/lessons/backgrounds/city-directions.webp',
  '/images/lessons/backgrounds/travel-station.webp',
  '/images/lessons/backgrounds/market.webp',
  '/images/lessons/backgrounds/seaside.webp',
  '/images/lessons/backgrounds/workshop.webp',
  '/images/lessons/backgrounds/restaurant.webp',
  '/images/lessons/backgrounds/garden.webp',
  '/images/lessons/backgrounds/town-park.webp',
  '/images/lessons/backgrounds/art-studio.webp',
  '/images/lessons/backgrounds/mountain-cabin.webp',
  '/images/lessons/backgrounds/flower-courtyard.webp',
  '/images/lessons/backgrounds/airport-lounge.webp',
  '/images/lessons/backgrounds/science-lab.webp',
  '/images/lessons/backgrounds/harbor-promenade.webp',
  '/images/lessons/backgrounds/community-bookshop.webp',
] as const

export interface LessonBackgroundOptions {
  /** Keep the original Unit 1 character environments when rendering that lesson. */
  unitOneAuthored?: boolean
}

const TOPIC_TO_BACKGROUND: Record<IllustratedLessonTopic, string> = {
  'study-room': LESSON_BACKGROUNDS[0],
  library: LESSON_BACKGROUNDS[1],
  bakery: LESSON_BACKGROUNDS[2],
  'botanical-office': LESSON_BACKGROUNDS[3],
  'listening-lounge': LESSON_BACKGROUNDS[4],
  campus: LESSON_BACKGROUNDS[5],
  speaking: LESSON_BACKGROUNDS[6],
  writing: LESSON_BACKGROUNDS[7],
  'family-living-room': LESSON_BACKGROUNDS[8],
  'daily-kitchen': LESSON_BACKGROUNDS[9],
  'city-directions': LESSON_BACKGROUNDS[10],
  'travel-station': LESSON_BACKGROUNDS[11],
  market: LESSON_BACKGROUNDS[12],
  seaside: LESSON_BACKGROUNDS[13],
  workshop: LESSON_BACKGROUNDS[14],
  restaurant: LESSON_BACKGROUNDS[15],
  garden: LESSON_BACKGROUNDS[16],
  'town-park': LESSON_BACKGROUNDS[17],
}

function preferredBackground(step: GuidedLessonStep, options: LessonBackgroundOptions): string | undefined {
  const authoredScene = getIllustratedLessonScene(step)
  if (authoredScene) return authoredScene.src

  if (options.unitOneAuthored !== false) {
    if (step.kind === 'vocabulary') return '/images/lessons/this-is-me/peter.webp'
    if (step.kind === 'reading') return '/images/lessons/this-is-me/carl.webp'
    if (step.kind === 'grammar') return '/images/lessons/this-is-me/lucas.webp'
    if (step.kind === 'speaking') return LESSON_BACKGROUNDS[6]
    if (step.kind === 'writing') return LESSON_BACKGROUNDS[7]
    if (step.blocks.some((block) => block.type === 'true_false' || block.type === 'audio')) return LESSON_BACKGROUNDS[4]
    // Unit 1's pre-authored reading exercise has a deliberately placed
    // botanical setting even though its kind is practice.
    if (step.blocks.some((block) => block.type === 'multiple_choice') && step.label.includes('Carl')) {
      return LESSON_BACKGROUNDS[3]
    }
    if (step.blocks.some((block) => block.type === 'structured-content')) return LESSON_BACKGROUNDS[5]
    if (step.blocks.some((block) => block.type === 'fill_blanks')) return LESSON_BACKGROUNDS[1]
    if (step.blocks.some((block) => block.type === 'multiple_choice')) return LESSON_BACKGROUNDS[2]
  }

  return TOPIC_TO_BACKGROUND[getIllustratedLessonTopic(step)]
}

function fallbackBackground(index: number): string {
  return LESSON_BACKGROUNDS[index % LESSON_BACKGROUNDS.length]
}

function sourceMetadata(block: Block, key: string): unknown {
  const direct = block.data || {}
  const nested = direct.data
  return direct[key] ?? (nested && typeof nested === 'object' ? (nested as Record<string, unknown>)[key] : undefined)
    ?? (block as unknown as Record<string, unknown>)[key]
}

function relatedVisualContinuityKey(step: GuidedLessonStep): string | undefined {
  if (step.vocabularyPart) return step.id.replace(/-vocabulary-\d+$/, '')
  const figures = step.blocks.filter((block) => block.type === 'image')
  if (!figures.length || step.blocks.some((block) => block.type !== 'image' && block.type !== 'title' &&
    !(block.type === 'text' && sourceMetadata(block, 'sourceRole') === 'picture-instruction'))) return undefined
  const slides = figures.map((block) => sourceMetadata(block, 'sourceSlides'))
  if (figures.some((block) => sourceMetadata(block, 'learningRevision') !== 'course-guided-v1') ||
    slides.some((value) => !Array.isArray(value) || value.length !== 1 || value[0] !== (slides[0] as unknown[])[0])) return undefined
  // These are references within the same authored visual activity,
  // like vocabulary parts, rather than unrelated tasks reusing a backdrop.
  return `source-figures:${(slides[0] as unknown[])[0]}`
}

export function assignLessonBackgrounds(
  steps: GuidedLessonStep[],
  options: LessonBackgroundOptions = {}
): Record<string, string> {
  const result: Record<string, string> = {}
  const reserved = new Set<string>()
  for (const step of steps) {
    const authoredScene = getIllustratedLessonScene(step)?.src
    if (authoredScene) { reserved.add(authoredScene); continue }
    if (options.unitOneAuthored !== false && (step.kind === 'vocabulary' || step.kind === 'grammar' || step.kind === 'reading')) continue
    const preferred = preferredBackground(step, options)
    if (preferred) reserved.add(preferred)
  }
  const available = LESSON_BACKGROUNDS.filter((src) => !reserved.has(src))
  const used = new Set<string>()
  const vocabularyScenes = new Map<string, string>()
  let fallbackIndex = 0
  for (const [stepIndex, step] of steps.entries()) {
    const continuityKey = relatedVisualContinuityKey(step)
    const continuousSource = continuityKey ? vocabularyScenes.get(continuityKey) : undefined
    if (continuousSource) {
      result[step.id] = continuousSource
      continue
    }
    const authoredScene = getIllustratedLessonScene(step)?.src
    if (authoredScene) {
      result[step.id] = authoredScene
      used.add(authoredScene)
      if (continuityKey) vocabularyScenes.set(continuityKey, authoredScene)
      continue
    }
    // These scenes carry a named character's authored context. Vocabulary
    // parts deliberately remain in the same room as a continuous introduction.
    const character = options.unitOneAuthored !== false
      ? step.kind === 'vocabulary' ? 'peter'
        : step.kind === 'reading' ? 'carl'
          : step.kind === 'grammar' ? 'lucas' : undefined
      : undefined
    if (character && isApprovedIllustratedSceneSource(`/images/lessons/this-is-me/${character}.webp`)) {
      result[step.id] = `/images/lessons/this-is-me/${character}.webp`
      if (continuityKey) vocabularyScenes.set(continuityKey, result[step.id])
      continue
    }
    const preferred = preferredBackground(step, options)
    const source = preferred && !used.has(preferred) ? preferred
      : available.find((src) => !used.has(src))
        ?? LESSON_BACKGROUNDS.find((src) => !used.has(src))
        // A course can contain more scenes than the currently generated
        // catalog. Reuse a known local environment deterministically until
        // the additional themed assets are available.
        ?? fallbackBackground(stepIndex + fallbackIndex++)
    used.add(source)
    result[step.id] = source
    if (continuityKey) vocabularyScenes.set(continuityKey, source)
  }
  return result
}
