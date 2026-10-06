import type { Block } from '@/types/course-builder'
import { buildGuidedLessonSteps, type GuidedLessonStep } from './guided-lesson'

/** Keep the existing grouping, while presenting long vocabulary in small sequential scenes. */
export function buildIllustratedLessonSteps(blocks: Block[]): GuidedLessonStep[] {
  return buildGuidedLessonSteps(blocks).flatMap((step) => {
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
