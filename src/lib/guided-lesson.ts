import { Block } from '@/types/course-builder'

export type GuidedLessonStepKind =
  | 'reading'
  | 'listening'
  | 'vocabulary'
  | 'grammar'
  | 'speaking'
  | 'writing'
  | 'practice'
  | 'content'

export interface GuidedLessonStep {
  id: string
  kind: GuidedLessonStepKind
  label: string
  blocks: Block[]
  /** Authored subject carried across compact vocabulary scenes. */
  sceneSubject?: string
  vocabularyPart?: { index: number; total: number }
}

const KIND_LABELS: Record<GuidedLessonStepKind, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  speaking: 'Habla',
  writing: 'Escritura',
  practice: 'Práctica',
  content: 'Contenido',
}

const STANDALONE_KINDS = new Set<GuidedLessonStepKind>([
  'reading',
  'grammar',
  'speaking',
  'writing',
])

const PRACTICE_TYPES = new Set<Block['type']>([
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

/**
 * Empty image placeholders and empty title blocks do not add content to the
 * student view. Everything else is retained so the viewer never silently
 * drops authored lesson material.
 */
export function isIgnorableGuidedBlock(block: Block): boolean {
  if (block.data?.archivedPilotSource === true) return true

  // Teacher notes are intentionally omitted from the student-facing pilot.
  if (block.type === 'teacher_notes') {
    return true
  }

  if (block.type === 'title') {
    return block.title.trim().length === 0
  }

  if (block.type !== 'image') {
    return false
  }

  return block.url.trim().length === 0 && !hasMeaningfulData(block.data)
}

function hasMeaningfulData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false

  return Object.values(data).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return value !== null && value !== undefined
  })
}

export function getGuidedLessonStepKind(block: Block): GuidedLessonStepKind {
  switch (block.type) {
    case 'text':
      return 'reading'
    case 'video':
    case 'audio':
      return 'listening'
    case 'vocabulary':
      return 'vocabulary'
    case 'grammar':
    case 'grammar-visualizer':
      return 'grammar'
    case 'recording':
      return 'speaking'
    case 'essay':
      return 'writing'
    default:
      return PRACTICE_TYPES.has(block.type) ? 'practice' : 'content'
  }
}

function getBlockTitle(block: Block): string | undefined {
  if ('title' in block && typeof block.title === 'string' && block.title.trim()) {
    return block.title.trim()
  }

  return undefined
}

function getStepLabel(kind: GuidedLessonStepKind, blocks: Block[]): string {
  const authoredTitle = blocks
    .map(getBlockTitle)
    .find((title): title is string => Boolean(title))

  return authoredTitle || KIND_LABELS[kind]
}

function createStep(index: number, blocks: Block[]): GuidedLessonStep {
  const kind = getStepKind(blocks)

  return {
    id: `guided-step-${index + 1}`,
    kind,
    label: getStepLabel(kind, blocks),
    blocks,
  }
}

function getStepKind(blocks: Block[]): GuidedLessonStepKind {
  const contentBlocks = blocks.filter((block) => block.type !== 'title')

  if (contentBlocks.some((block) => block.type === 'recording')) return 'speaking'
  if (contentBlocks.some((block) => block.type === 'essay')) return 'writing'
  if (contentBlocks.some((block) => block.type === 'text')) return 'reading'
  if (contentBlocks.some((block) => block.type === 'vocabulary')) return 'vocabulary'
  if (
    contentBlocks.some(
      (block) => block.type === 'grammar' || block.type === 'grammar-visualizer'
    )
  ) {
    return 'grammar'
  }
  if (contentBlocks.some((block) => PRACTICE_TYPES.has(block.type))) return 'practice'
  if (contentBlocks.some((block) => block.type === 'audio' || block.type === 'video')) {
    return 'listening'
  }

  return 'content'
}

function isVocabularyAudioBlock(block: Block): boolean {
  return block.type === 'vocabulary' || block.type === 'audio'
}

function hasOnlyVocabularyAudio(blocks: Block[]): boolean {
  return blocks.some(isVocabularyAudioBlock) &&
    blocks.every((block) => block.type === 'title' || isVocabularyAudioBlock(block))
}

function canAppendToVocabularyAudioStep(step: GuidedLessonStep | undefined, block: Block): boolean {
  if (!step || !isVocabularyAudioBlock(block)) return false
  return hasOnlyVocabularyAudio(step.blocks)
}

function canAppendGrammarPair(step: GuidedLessonStep | undefined, block: Block): boolean {
  if (!step) return false

  const contentBlocks = step.blocks.filter((item) => item.type !== 'title')
  if (contentBlocks.length !== 1 || block.type === 'title') return false

  const existingType = contentBlocks[0].type
  return (
    (existingType === 'structured-content' && block.type === 'grammar-visualizer') ||
    (existingType === 'grammar-visualizer' && block.type === 'structured-content')
  )
}

function canAppendSectionPractice(step: GuidedLessonStep | undefined, block: Block): boolean {
  if (!step || !PRACTICE_TYPES.has(block.type)) return false

  const contentBlocks = step.blocks.filter((item) => item.type !== 'title')
  return (
    step.blocks.some((item) => item.type === 'title') &&
    contentBlocks.some((item) => item.type === 'audio')
  )
}

/**
 * Build linear guided steps without flattening nested authored containers.
 * Adjacent vocabulary/audio blocks share one step so the language input and
 * its pronunciation stay together. Reading, grammar, recording, and essay
 * blocks always start their own step.
 */
export function buildGuidedLessonSteps(blocks: Block[]): GuidedLessonStep[] {
  const authoredBlocks = blocks.filter((block) => !isIgnorableGuidedBlock(block))
  const steps: GuidedLessonStep[] = []
  let pendingTitle: Block | undefined

  const appendStep = (stepBlocks: Block[]) => {
    steps.push(createStep(steps.length, stepBlocks))
  }

  for (const block of authoredBlocks) {
    if (block.type === 'title') {
      if (pendingTitle) appendStep([pendingTitle])
      pendingTitle = block
      continue
    }

    const blockKind = getGuidedLessonStepKind(block)
    const blocksForStep = pendingTitle ? [pendingTitle, block] : [block]
    pendingTitle = undefined

    const previousStep = steps[steps.length - 1]

    if (
      canAppendToVocabularyAudioStep(previousStep, block) ||
      canAppendGrammarPair(previousStep, block) ||
      canAppendSectionPractice(previousStep, block)
    ) {
      if (!previousStep) continue
      previousStep.blocks.push(...blocksForStep)
      previousStep.kind = getStepKind(previousStep.blocks)
      previousStep.label = getStepLabel(previousStep.kind, previousStep.blocks)
      continue
    }

    // These block kinds are deliberately never coalesced with their neighbors.
    // Their renderer owns meaningful response or reading state.
    if (STANDALONE_KINDS.has(blockKind)) {
      appendStep(blocksForStep)
      continue
    }

    appendStep(blocksForStep)
  }

  if (pendingTitle) appendStep([pendingTitle])

  return steps
}

// Keep the grouping helper discoverable for callers that prefer a shorter name.
export const groupLessonBlocks = buildGuidedLessonSteps

export function readGuidedLessonStepIndex(storageKey: string, stepCount: number): number {
  if (stepCount <= 0 || !storageKey || typeof window === 'undefined') return 0

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return 0

    const parsed = parseStoredStep(raw)
    if (parsed === null) return 0

    return Math.min(Math.max(parsed, 0), stepCount - 1)
  } catch {
    return 0
  }
}

export function writeGuidedLessonStepIndex(storageKey: string, stepIndex: number): void {
  if (!storageKey || typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(storageKey, String(Math.max(0, Math.floor(stepIndex))))
  } catch {
    // Session storage can be unavailable in privacy modes and embedded views.
  }
}

function parseStoredStep(raw: string): number | null {
  const numberValue = Number(raw)
  if (Number.isInteger(numberValue)) return numberValue

  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value === 'number' && Number.isInteger(value)) return value

    if (typeof value === 'object' && value !== null && 'activeStepIndex' in value) {
      const index = value.activeStepIndex
      return typeof index === 'number' && Number.isInteger(index) ? index : null
    }
  } catch {
    return null
  }

  return null
}
