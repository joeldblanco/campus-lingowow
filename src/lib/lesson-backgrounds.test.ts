import { describe, expect, it } from 'vitest'
import type { GuidedLessonStep } from './guided-lesson'
import type { Block } from '@/types/course-builder'
import { assignLessonBackgrounds, LESSON_BACKGROUNDS } from './lesson-backgrounds'

const step = (id: string, kind: GuidedLessonStep['kind'] = 'practice'): GuidedLessonStep =>
  ({ id, kind, label: id, blocks: [] })

describe('lesson background library', () => {
  it('reserves listening and Carl environments even when earlier exercises need a background', () => {
    const listening = { ...step('listen'), blocks: [{ type: 'true_false' } as Block] }
    const readingPractice = { ...step('reading-practice'), label: 'Comprensión de lectura: Carl Johnson', blocks: [{ type: 'multiple_choice' } as Block] }
    const steps = [step('match'), step('extra'), readingPractice, listening, step('essay', 'writing'), step('speech', 'speaking')]
    const result = assignLessonBackgrounds(steps)
    expect(result.listen).toContain('listening-lounge.webp')
    expect(result['reading-practice']).toContain('botanical-office.webp')
    expect(new Set(Object.values(result)).size).toBe(steps.length)
  })
  it('assigns a different environment to every ordinary step within library capacity', () => {
    const steps = LESSON_BACKGROUNDS.map((_, i) => step(`exercise-${i}`))
    const result = assignLessonBackgrounds(steps)
    expect(new Set(Object.values(result)).size).toBe(steps.length)
    expect(Object.values(result).every((src) => src.endsWith('.webp'))).toBe(true)
  })

  it('keeps assignments deterministic and reserves speaking and writing settings', () => {
    const steps = [step('first'), step('speech', 'speaking'), step('second'), step('essay', 'writing')]
    expect(assignLessonBackgrounds(steps)).toEqual(assignLessonBackgrounds(steps))
    expect(assignLessonBackgrounds(steps).speech).toContain('/speaking.webp')
    expect(assignLessonBackgrounds(steps).essay).toContain('/writing.webp')
    expect(new Set(Object.values(assignLessonBackgrounds(steps))).size).toBe(4)
  })

  it('allows the same character setting only across related vocabulary parts', () => {
    const first = { ...step('peter-1', 'vocabulary'), vocabularyPart: { index: 1, total: 2 } }
    const second = { ...step('peter-2', 'vocabulary'), vocabularyPart: { index: 2, total: 2 } }
    const result = assignLessonBackgrounds([first, second, step('exercise')])
    expect(result['peter-1']).toBe('/images/lessons/this-is-me/peter.webp')
    expect(result['peter-2']).toBe(result['peter-1'])
    expect(result.exercise).not.toBe(result['peter-1'])
  })
})
