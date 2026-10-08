import { isPilotGuidedMatchProfile } from './guided-match-options'
import type { Block } from '@/types/course-builder'
import { buildGuidedLessonSteps, type GuidedLessonStep } from './guided-lesson'

export type IllustratedLessonArtVariant = 'portrait' | 'grammar'

export interface IllustratedLessonArt {
  src: string
  variant: IllustratedLessonArtVariant
}

export interface IllustratedLessonScene {
  src: string
  side: 'left' | 'right'
}

/**
 * These are the painted files that are present in the repository. Source
 * metadata may suggest a scene, but a render must never turn an unverified
 * path into a broken background.
 */
export const APPROVED_ILLUSTRATED_SCENES = [
  '/images/lessons/this-is-me/dual-mode/reading-practice.webp',
  '/images/lessons/this-is-me/dual-mode/questions.webp',
  '/images/lessons/this-is-me/dual-mode/profile.webp',
  '/images/lessons/this-is-me/dual-mode/presentation.webp',
  '/images/lessons/this-is-me/dual-mode/possessives.webp',
  '/images/lessons/this-is-me/dual-mode/introductions.webp',
  '/images/lessons/this-is-me/dual-mode/intro-dialogue.webp',
  '/images/lessons/this-is-me/dual-mode/conversation.webp',
  '/images/lessons/this-is-me/dual-mode/contact.webp',
  '/images/lessons/this-is-me/dual-mode/sentences.webp',
  '/images/lessons/this-is-me/dual-mode/transform.webp',
  '/images/lessons/this-is-me/study-room-v3.webp',
  '/images/lessons/this-is-me/peter.webp',
  '/images/lessons/this-is-me/peter-classroom-v3.webp',
  '/images/lessons/this-is-me/carl.webp',
  '/images/lessons/this-is-me/carl-scene.webp',
  '/images/lessons/this-is-me/lucas.webp',
  '/images/lessons/this-is-me/lucas-scene.webp',
  '/images/lessons/this-is-me/speaking.webp',
  '/images/lessons/this-is-me/writing.webp',
  '/images/lessons/backgrounds/library.webp',
  '/images/lessons/backgrounds/bakery.webp',
  '/images/lessons/backgrounds/botanical-office.webp',
  '/images/lessons/backgrounds/listening-lounge.webp',
  '/images/lessons/backgrounds/campus.webp',
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
] as const

const APPROVED_SCENE_SET = new Set<string>(APPROVED_ILLUSTRATED_SCENES)

const TECHNICAL_LABELS = new Set([
  'lectura',
  'escucha',
  'vocabulario',
  'gramática',
  'gramatica',
  'habla',
  'escritura',
  'práctica',
  'practica',
  'contenido',
  'tabla',
  'nueva tabla',
  'visualizador gramatical',
  'nuevo visualizador gramatical',
  'nuevo vocabulario',
  'nueva sección',
  'nueva seccion',
])

const PRACTICE_BLOCK_TYPES = new Set<Block['type']>([
  'quiz',
  'assignment',
  'fill_blanks',
  'match',
  'true_false',
  'short_answer',
  'multiple_choice',
  'ordering',
  'drag_drop',
  'multi_select',
])

const STEP_ART: Partial<Record<GuidedLessonStep['kind'], IllustratedLessonArt>> = {
  vocabulary: {
    src: '/images/lessons/this-is-me/peter.webp',
    variant: 'portrait',
  },
  reading: {
    src: '/images/lessons/this-is-me/carl.webp',
    variant: 'portrait',
  },
  grammar: {
    src: '/images/lessons/this-is-me/lucas.webp',
    variant: 'grammar',
  },
}

function getBlockMetadata(block: Block): Record<string, unknown> {
  const direct = block.data || {}
  const nested = direct.data
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? { ...(nested as Record<string, unknown>), ...direct }
    : direct
}

function getMetadataValue(block: Block, keys: string[]): unknown {
  const metadata = getBlockMetadata(block)
  return keys.map((key) => metadata[key]).find((value) => value !== undefined)
}

function getStepMetadata(step: GuidedLessonStep, keys: string[]): unknown {
  for (const block of step.blocks) {
    const value = getMetadataValue(block, keys)
    if (value !== undefined) return value
  }
  return undefined
}

export function isApprovedIllustratedSceneSource(value: string): boolean {
  return APPROVED_SCENE_SET.has(value)
}

/** Read a source-authored scene without trusting arbitrary external paths. */
export function getIllustratedLessonScene(step: GuidedLessonStep): IllustratedLessonScene | undefined {
  const value = getStepMetadata(step, ['scene', 'illustratedScene'])
  if (typeof value !== 'string' || !isApprovedIllustratedSceneSource(value)) return undefined

  const side = getStepMetadata(step, ['sceneSide', 'illustratedSceneSide'])
  return { src: value, side: side === 'left' ? 'left' : 'right' }
}

/** Unit 1 keeps its authored character art. Generic course lessons use scenes. */
export function getIllustratedLessonArt(
  step: GuidedLessonStep,
  options: { unitOneAuthored?: boolean } = {}
): IllustratedLessonArt | undefined {
  if (options.unitOneAuthored !== true) return undefined
  return STEP_ART[step.kind]
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectBlockSearchText(block: Block): string[] {
  const values: string[] = [block.type]
  const metadata = getBlockMetadata(block)
  for (const key of ['topic', 'semanticTopic', 'illustratedTopic', 'background', 'title', 'label', 'content', 'prompt', 'instruction', 'description']) {
    const value = metadata[key]
    if (typeof value === 'string') values.push(value)
  }

  if (block.type === 'title') values.push(block.title)
  if (block.type === 'text') values.push(block.content)
  if (block.type === 'video' || block.type === 'audio') values.push(block.title || '')
  if (block.type === 'essay') values.push(block.prompt || '')
  if (block.type === 'recording') values.push(block.instruction || '', block.prompt || '')
  if (block.type === 'grammar') values.push(block.title, block.description)

  if (block.type === 'vocabulary') {
    for (const item of block.items) values.push(item.term, item.definition, item.example || '')
  }
  if (block.type === 'structured-content' && block.content) {
    values.push(...block.content.headers, ...block.content.rows.flat())
  }
  if (block.type === 'match') {
    for (const pair of block.pairs || []) values.push(pair.left, pair.right)
  }
  if (block.type === 'multiple_choice') {
    values.push(block.question || '', ...(block.options || []).map((option) => option.text))
    for (const item of block.items || []) values.push(item.question, ...item.options.map((option) => option.text))
  }
  if (block.type === 'true_false') values.push(...(block.items || []).map((item) => item.statement))
  if (block.type === 'fill_blanks') values.push(...(block.items || []).map((item) => item.content))
  if (block.children) values.push(...block.children.flatMap(collectBlockSearchText))
  return values.filter(Boolean)
}

export type IllustratedLessonTopic =
  | 'study-room'
  | 'library'
  | 'bakery'
  | 'botanical-office'
  | 'listening-lounge'
  | 'campus'
  | 'speaking'
  | 'writing'
  | 'family-living-room'
  | 'daily-kitchen'
  | 'city-directions'
  | 'travel-station'
  | 'market'
  | 'seaside'
  | 'workshop'
  | 'restaurant'
  | 'garden'
  | 'town-park'

const TOPIC_ALIASES: Record<string, IllustratedLessonTopic> = {
  'study-room': 'study-room',
  study: 'study-room',
  lesson: 'study-room',
  learning: 'study-room',
  library: 'library',
  reading: 'library',
  book: 'library',
  books: 'library',
  bakery: 'bakery',
  food: 'bakery',
  cooking: 'bakery',
  restaurant: 'restaurant',
  'food-service': 'bakery',
  botanical: 'botanical-office',
  nature: 'botanical-office',
  plant: 'botanical-office',
  plants: 'botanical-office',
  environment: 'botanical-office',
  biology: 'botanical-office',
  listening: 'listening-lounge',
  audio: 'listening-lounge',
  pronunciation: 'listening-lounge',
  campus: 'campus',
  school: 'campus',
  classroom: 'campus',
  class: 'campus',
  university: 'campus',
  speaking: 'speaking',
  speakingpractice: 'speaking',
  writing: 'writing',
  essay: 'writing',
  family: 'family-living-room',
  'family-living-room': 'family-living-room',
  'living-room': 'family-living-room',
  kitchen: 'daily-kitchen',
  'daily-kitchen': 'daily-kitchen',
  directions: 'city-directions',
  'city-directions': 'city-directions',
  travel: 'travel-station',
  'travel-station': 'travel-station',
  market: 'market',
  seaside: 'seaside',
  beach: 'seaside',
  workshop: 'workshop',
  garden: 'garden',
  'town-park': 'town-park',
  park: 'town-park',
}

function topicFromValue(value: string): IllustratedLessonTopic | undefined {
  const normalized = normalizeSearchText(value)
  if (isApprovedIllustratedSceneSource(value)) {
    if (value.endsWith('/library.webp')) return 'library'
    if (value.endsWith('/bakery.webp')) return 'bakery'
    if (value.endsWith('/botanical-office.webp')) return 'botanical-office'
    if (value.endsWith('/listening-lounge.webp')) return 'listening-lounge'
    if (value.endsWith('/campus.webp')) return 'campus'
    if (value.endsWith('/speaking.webp')) return 'speaking'
    if (value.endsWith('/writing.webp')) return 'writing'
    if (value.endsWith('/family-living-room.webp')) return 'family-living-room'
    if (value.endsWith('/daily-kitchen.webp')) return 'daily-kitchen'
    if (value.endsWith('/city-directions.webp')) return 'city-directions'
    if (value.endsWith('/travel-station.webp')) return 'travel-station'
    if (value.endsWith('/market.webp')) return 'market'
    if (value.endsWith('/seaside.webp')) return 'seaside'
    if (value.endsWith('/workshop.webp')) return 'workshop'
    if (value.endsWith('/restaurant.webp')) return 'restaurant'
    if (value.endsWith('/garden.webp')) return 'garden'
    if (value.endsWith('/town-park.webp')) return 'town-park'
    return 'study-room'
  }
  if (TOPIC_ALIASES[normalized]) return TOPIC_ALIASES[normalized]
  return Object.entries(TOPIC_ALIASES).find(([alias]) => normalized.includes(alias))?.[1]
}

/** Resolve an explicit semantic label before falling back to authored content. */
export function getIllustratedLessonTopic(step: GuidedLessonStep): IllustratedLessonTopic {
  const explicit = getStepMetadata(step, ['illustratedTopic', 'semanticTopic', 'topic', 'background'])
  if (typeof explicit === 'string') {
    const topic = topicFromValue(explicit)
    if (topic) return topic
  }

  if (step.kind === 'writing') return 'writing'
  if (step.kind === 'speaking') return 'speaking'

  const text = normalizeSearchText(step.blocks.flatMap(collectBlockSearchText).join(' '))
  if (step.blocks.some((block) => block.type === 'audio' || block.type === 'video')) return 'listening-lounge'
  if (/\b(bakery|bread|cafe|coffee|restaurant|food|cook|cooking|pan|croissant)\b/.test(text)) return 'bakery'
  if (/\b(botanical|nature|plant|plants|environment|biology|garden|greenery|seedling)\b/.test(text)) return 'botanical-office'
  if (/\b(library|book|books|read|reading|novel|text)\b/.test(text)) return 'library'
  if (/\b(campus|school|classroom|class|university|student|students|course)\b/.test(text)) return 'campus'
  return 'study-room'
}

function plainText(value: string | undefined): string {
  return value ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

function getMeaningfulLabel(step: GuidedLessonStep): string | undefined {
  const label = plainText(step.label)
  return label && !TECHNICAL_LABELS.has(normalizeSearchText(label)) ? label : undefined
}

function referenceTaskTitle(label: string): string {
  const clean = label.replace(/[.!?]+$/, '').trim()
  if (/^consulta\b/i.test(clean)) return `${clean}.`
  return `Consulta ${normalizeSearchText(clean).replace(/^(el|la|los|las|the)\s+/, '')}.`
}

function getAuthoredGuidedTitle(step: GuidedLessonStep): string | undefined {
  const authoredTitles = getStepMetadata(step, ['guidedTitles'])
  if (Array.isArray(authoredTitles)) {
    const title = authoredTitles[(step.vocabularyPart?.index ?? 1) - 1]
    if (typeof title === 'string' && title.trim()) return title.trim()
  }
  const authoredTitle = getStepMetadata(step, ['guidedTitle'])
  return typeof authoredTitle === 'string' && authoredTitle.trim() ? authoredTitle.trim() : undefined
}

function getBlockPrompt(step: GuidedLessonStep, types: Block['type'][]): string {
  for (const block of step.blocks) {
    if (!types.includes(block.type)) continue
    if ('prompt' in block && typeof block.prompt === 'string') return plainText(block.prompt)
    if ('instruction' in block && typeof block.instruction === 'string') return plainText(block.instruction)
  }
  return ''
}

function getWritingTitle(step: GuidedLessonStep): string {
  const prompt = normalizeSearchText(getBlockPrompt(step, ['essay']))
  if (prompt.includes('perfil') || prompt.includes('profile')) return 'Escribe tu perfil.'
  if (prompt.includes('rutina') || prompt.includes('routine')) return 'Describe tu rutina.'
  if (prompt.includes('familia') || prompt.includes('family')) return 'Describe a tu familia.'
  if (prompt.includes('vacacion') || prompt.includes('vacation') || prompt.includes('holiday')) return 'Describe tus vacaciones.'
  if (prompt.includes('correo') || prompt.includes('email') || prompt.includes('e-mail')) return 'Escribe el correo.'
  if (prompt.includes('sobre ti') || prompt.includes('about yourself') || prompt.includes('about you')) return 'Escribe sobre ti.'
  return 'Escribe la respuesta.'
}

function getSpeakingTitle(step: GuidedLessonStep): string {
  const prompt = normalizeSearchText(getBlockPrompt(step, ['recording']))
  if (prompt.includes('conversation') || prompt.includes('conversa')) return 'Ahora, conversa.'
  if (prompt.includes('present') || prompt.includes('presen')) return 'Preséntate.'
  return 'Graba tu respuesta.'
}

/** Preserve authored material while presenting related activities in focused scenes. */
export function buildIllustratedLessonSteps(blocks: Block[]): GuidedLessonStep[] {
  const relatedSteps: GuidedLessonStep[] = []
  for (const step of buildGuidedLessonSteps(blocks)) {
    const previous = relatedSteps[relatedSteps.length - 1]
    if (
      previous?.kind === 'listening' &&
      previous.blocks.every((block) => block.type === 'audio' || block.type === 'video' || block.type === 'title') &&
      step.blocks.some((block) => PRACTICE_BLOCK_TYPES.has(block.type)) &&
      step.blocks.every((block) => PRACTICE_BLOCK_TYPES.has(block.type) || block.type === 'title')
    ) {
      previous.blocks = [...previous.blocks, ...step.blocks]
      previous.kind = 'practice'
      previous.label = step.label
    } else {
      relatedSteps.push(step)
    }
  }
  return relatedSteps.flatMap((step) => {
    const vocabulary = step.blocks.find((block) => block.type === 'vocabulary')
    if (!vocabulary || !vocabulary.items || vocabulary.items.length <= 3) return [step]
    const total = Math.ceil(vocabulary.items.length / 3)
    const sceneSubject = vocabulary.items.find((item) => item.term.trim().toLowerCase() === 'name')?.definition
    return Array.from({ length: total }, (_, index) => ({
      ...step,
      id: `${step.id}-vocabulary-${index + 1}`,
      sceneSubject,
      vocabularyPart: { index: index + 1, total },
      blocks: index === 0
        ? step.blocks.map((block) => block === vocabulary ? { ...vocabulary, items: vocabulary.items.slice(0, 3) } : block)
        : [{ ...vocabulary, id: `${vocabulary.id}-part-${index + 1}`, items: vocabulary.items.slice(index * 3, (index + 1) * 3) }],
    }))
  })
}

export function getIllustratedLessonTaskTitle(step: GuidedLessonStep): string {
  const authoredTitle = getAuthoredGuidedTitle(step)
  if (authoredTitle) return authoredTitle

  const vocabulary = step.blocks.find((block) => block.type === 'vocabulary')
  const subject = step.sceneSubject || vocabulary?.items?.find((item) => item.term.trim().toLowerCase() === 'name')?.definition
  if (vocabulary && subject) {
    if (step.vocabularyPart?.index === 2) return `Un poco más sobre ${subject}.`
    if (step.vocabularyPart && step.vocabularyPart.index >= 3) return 'Sus datos personales.'
    return `Conoce a ${subject}.`
  }
  if (vocabulary) return 'Aprende estas palabras.'
  if (step.blocks.some((block) => block.type === 'grammar-visualizer')) {
    const grammarBlock = step.blocks.find((block) => block.type === 'grammar-visualizer')
    const unitOneRole = grammarBlock && getMetadataValue(grammarBlock, ['unit1Role'])
    if (unitOneRole === 'transform') return 'Transforma la frase.'
    const label = getMeaningfulLabel(step)
    if (label) return referenceTaskTitle(label)
    return 'Observa la estructura.'
  }
  if (step.blocks.some((block) => block.type === 'structured-content' && block.content)) {
    const label = getMeaningfulLabel(step)
    if (label) {
      const normalized = normalizeSearchText(label)
      if (normalized.includes('posesiv')) return 'Consulta los posesivos.'
      return referenceTaskTitle(label)
    }
    return 'Consulta las formas.'
  }
  const matching = step.blocks.find(block => block.type === 'match')
  if (matching?.type === 'match') return isPilotGuidedMatchProfile(matching.pairs || [], matching.id) ? 'Identifica el dato.' : 'Une cada dato.'
  if (step.blocks.some((block) => block.type === 'fill_blanks')) return 'Completa la frase.'
  if (step.blocks.some((block) => block.type === 'multiple_choice')) {
    return step.blocks.some((block) => block.type === 'audio' || block.type === 'video')
      ? 'Escucha y elige.'
      : 'Elige la respuesta.'
  }
  if (step.blocks.some((block) => block.type === 'true_false')) {
    return step.blocks.some((block) => block.type === 'audio' || block.type === 'video')
      ? 'Escucha y decide.'
      : 'Decide si es correcto.'
  }
  const hasAuthoredCarlScene = getIllustratedLessonScene(step)?.src.includes('/carl')
  const isUnitOneReading = getStepMetadata(step, ['unit1Role']) === 'reading-practice'
  if ((hasAuthoredCarlScene || isUnitOneReading) && step.blocks.some((block) => block.type === 'text' && block.content?.includes('Carl Johnson'))) {
    return 'Conoce a Carl.'
  }
  if (step.blocks.some((block) => block.type === 'essay' && block.prompt)) return getWritingTitle(step)
  if (step.blocks.some((block) => block.type === 'recording' && (block.instruction || block.prompt))) return getSpeakingTitle(step)
  return step.label
}
