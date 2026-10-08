import { describe, expect, it } from 'vitest'
import type { GuidedLessonStep } from './guided-lesson'
import type { Block } from '@/types/course-builder'
import { assignLessonBackgrounds, LESSON_BACKGROUNDS } from './lesson-backgrounds'

const step = (id: string, kind: GuidedLessonStep['kind'] = 'practice'): GuidedLessonStep =>
  ({ id, kind, label: id, blocks: [] })

describe('lesson background library', () => {
  it('covers a long course lesson with twenty-nine unrelated scenes without repetition', () => {
    const steps = Array.from({ length: 29 }, (_, index) => step(`long-course-${index}`, 'content'))
    const backgrounds = assignLessonBackgrounds(steps, { unitOneAuthored: false })
    expect(new Set(Object.values(backgrounds)).size).toBe(29)
  })
  it('keeps related source figures in one setting without sharing it with another slide', () => {
    const figure = (id: string, slide: number): GuidedLessonStep => ({
      ...step(id, 'content'),
      blocks: [{ id, type: 'image', order: 0, url: `/${id}.webp`, data: { learningRevision: 'course-guided-v1', sourceSlides: [slide] } } as Block],
    })
    const result = assignLessonBackgrounds([figure('first', 5), figure('second', 5), figure('next-topic', 6)], { unitOneAuthored: false })
    expect(result.second).toBe(result.first)
    expect(result['next-topic']).not.toBe(result.first)
  })
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

  it('assigns generic course scenes semantically without defaulting to Unit 1 characters', () => {
    const steps = [
      { ...step('bakery', 'content'), label: 'Food and cooking', blocks: [{ id: 'food', type: 'text', order: 0, content: 'Bread and coffee' } as Block] },
      { ...step('reading', 'reading'), label: 'Reading about a city', blocks: [{ id: 'read', type: 'text', order: 0, content: 'Read this text' } as Block] },
      { ...step('vocabulary', 'vocabulary'), label: 'Words', blocks: [{ id: 'words', type: 'vocabulary', order: 0, items: [{ id: 'one', term: 'Bread', definition: 'Pan' }] } as Block] },
    ]

    const result = assignLessonBackgrounds(steps, { unitOneAuthored: false })

    expect(result.bakery).toContain('/images/lessons/backgrounds/bakery.webp')
    expect(Object.values(result)).not.toContain('/images/lessons/this-is-me/peter.webp')
    expect(Object.values(result)).not.toContain('/images/lessons/this-is-me/carl.webp')
    expect(Object.values(result)).not.toContain('/images/lessons/this-is-me/lucas.webp')
  })

  it('supports the expanded thematic catalog through explicit semantic labels', () => {
    const steps = [{
      ...step('garden', 'content'),
      blocks: [{ id: 'topic', type: 'text', order: 0, content: 'A lesson', data: { illustratedTopic: 'garden' } } as Block],
    }]

    expect(assignLessonBackgrounds(steps, { unitOneAuthored: false }).garden)
      .toBe('/images/lessons/backgrounds/garden.webp')
  })

  it('reuses known local environments deterministically after the catalog is exhausted', () => {
    const steps = Array.from({ length: LESSON_BACKGROUNDS.length + 5 }, (_, index) =>
      step(`generic-${index}`, 'content')
    )

    const first = assignLessonBackgrounds(steps, { unitOneAuthored: false })
    const second = assignLessonBackgrounds(steps, { unitOneAuthored: false })

    expect(first).toEqual(second)
    expect(Object.values(first)).toHaveLength(steps.length)
    expect(Object.values(first).every((src) => LESSON_BACKGROUNDS.includes(src as never))).toBe(true)
  })

  it('keeps split generic vocabulary scenes in one environment', () => {
    const steps = [
      { ...step('words-vocabulary-1', 'vocabulary'), vocabularyPart: { index: 1, total: 2 } },
      { ...step('words-vocabulary-2', 'vocabulary'), vocabularyPart: { index: 2, total: 2 } },
      step('next', 'content'),
    ]

    const result = assignLessonBackgrounds(steps, { unitOneAuthored: false })

    expect(result['words-vocabulary-1']).toBe(result['words-vocabulary-2'])
    expect(result.next).not.toBe(result['words-vocabulary-1'])
  })
})
