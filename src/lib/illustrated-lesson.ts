import type { Block } from '@/types/course-builder'
import { buildGuidedLessonSteps, type GuidedLessonStep } from './guided-lesson'

/** Preserve authored material while presenting related activities in focused scenes. */
export function buildIllustratedLessonSteps(blocks: Block[]): GuidedLessonStep[] {
  const relatedSteps: GuidedLessonStep[] = []
  for (const step of buildGuidedLessonSteps(blocks)) {
    const previous = relatedSteps[relatedSteps.length - 1]
    if (
      previous?.kind === 'listening' &&
      previous.blocks.every((block) => block.type === 'audio' || block.type === 'title') &&
      step.blocks.some((block) => block.type === 'true_false') &&
      step.blocks.every((block) => block.type === 'true_false' || block.type === 'title')
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
  const vocabulary = step.blocks.find((block) => block.type === 'vocabulary')
  const subject = step.sceneSubject || vocabulary?.items?.find((item) => item.term.trim().toLowerCase() === 'name')?.definition
  if (vocabulary && subject) {
    if (step.vocabularyPart?.index === 2) return `Un poco más sobre ${subject}.`
    if (step.vocabularyPart && step.vocabularyPart.index >= 3) return 'Sus datos personales.'
    return `Conoce a ${subject}.`
  }
  if (step.blocks.some((block) => block.type === 'grammar-visualizer' && block.sets?.length)) return 'Transforma la frase.'
  if (step.blocks.some((block) => block.type === 'structured-content' && block.content)) return step.label.toLowerCase().includes('posesivo') ? 'Consulta los posesivos.' : 'Consulta las formas.'
  if (step.blocks.some((block) => block.type === 'match')) return 'Une cada dato.'
  if (step.blocks.some((block) => block.type === 'fill_blanks')) return 'Completa la frase.'
  if (step.blocks.some((block) => block.type === 'multiple_choice')) return 'Elige la respuesta.'
  if (step.blocks.some((block) => block.type === 'true_false')) return 'Escucha y decide.'
  if (step.blocks.some((block) => block.type === 'text' && block.content?.includes('Carl Johnson'))) return 'Conoce a Carl.'
  if (step.blocks.some((block) => block.type === 'essay' && block.prompt)) return 'Escribe tu perfil.'
  if (step.blocks.some((block) => block.type === 'recording' && (block.instruction || block.prompt))) return 'Ahora, preséntate.'
  return step.label
}
