import { describe, expect, it } from 'vitest'
import type { Block, VocabularyBlock } from '@/types/course-builder'
import { buildIllustratedLessonSteps, getIllustratedLessonTaskTitle } from './illustrated-lesson'

const vocabulary: VocabularyBlock = { id: 'vocabulary', type: 'vocabulary', order: 1, title: 'Vocabulario', items: Array.from({ length: 9 }, (_, index) => ({ id: `item-${index}`, term: index === 0 ? 'Name' : `Term ${index}`, definition: index === 0 ? 'Peter' : `Definition ${index}` })) }

describe('illustrated vocabulary sequence', () => {
  it('shows three facts per scene without losing or reordering authored items', () => {
    const audio: Block = { id: 'audio', type: 'audio', order: 0, url: '/presentation.wav', maxReplays: 2 }
    const steps = buildIllustratedLessonSteps([audio, vocabulary])
    expect(steps).toHaveLength(3)
    expect(steps.map(step => step.blocks.find(block => block.type === 'vocabulary')?.items.length)).toEqual([3, 3, 3])
    expect(steps.flatMap(step => step.blocks.flatMap(block => block.type === 'vocabulary' ? block.items : []))).toEqual(vocabulary.items)
    expect(steps.flatMap(step => step.blocks).filter(block => block.type === 'audio')).toEqual([audio])
    expect(steps.map(step => step.sceneSubject)).toEqual(['Peter', 'Peter', 'Peter'])
    expect(new Set(steps.flatMap(step => step.blocks.map(block => block.id))).size).toBe(4)
  })

  it('leaves short vocabulary and the existing exercise sequence intact', () => {
    const short = { ...vocabulary, items: vocabulary.items.slice(0, 2) }
    const exercise: Block = { id: 'practice', type: 'true_false', order: 2, items: [{ id: 'one', statement: 'A statement', correctAnswer: true }] }
    const steps = buildIllustratedLessonSteps([short, exercise])
    expect(steps).toHaveLength(2)
    expect(steps[0].blocks[0]).toBe(short)
    expect(steps[1].blocks[0]).toBe(exercise)
  })

  it('keeps a listening clip with its true/false activity, preserving the single media instance', () => {
    const audio: Block = { id: 'listening', type: 'audio', order: 0, url: '/original.wav', maxReplays: 2 }
    const exercise: Block = { id: 'decide', type: 'true_false', order: 1, items: [{ id: 'one', statement: 'A statement', correctAnswer: true }] }
    const steps = buildIllustratedLessonSteps([audio, exercise])
    expect(steps).toHaveLength(1)
    expect(steps[0].blocks).toEqual([audio, exercise])
    expect(steps[0].kind).toBe('practice')
    expect(getIllustratedLessonTaskTitle(steps[0])).toBe('Escucha y decide.')
  })

  it('uses the authored subject for a concise task heading across vocabulary scenes', () => {
    const steps = buildIllustratedLessonSteps([vocabulary])
    expect(steps.map(getIllustratedLessonTaskTitle)).toEqual(['Conoce a Peter.', 'Un poco más sobre Peter.', 'Sus datos personales.'])
    expect(getIllustratedLessonTaskTitle({ id: 'plain', kind: 'reading', label: 'Lectura', blocks: [] })).toBe('Lectura')
  })
})
