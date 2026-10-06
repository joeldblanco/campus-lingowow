import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildGuidedLessonSteps,
  readGuidedLessonStepIndex,
  writeGuidedLessonStepIndex,
} from './guided-lesson'
import { Block } from '@/types/course-builder'

function block(type: Block['type'], id: string, extra: Record<string, unknown> = {}): Block {
  return { id, type, order: 0, ...extra } as Block
}

describe('buildGuidedLessonSteps', () => {
  it('builds the pilot sequence from authored blocks and keeps containers intact', () => {
    const roots = [
      block('audio', 'audio-intro'),
      block('vocabulary', 'vocabulary-intro', { title: 'Names' }),
      block('teacher_notes', 'teacher-only'),
      block('structured-content', 'to-be-table', { title: 'Conjugación de Verbos - To Be' }),
      block('grammar-visualizer', 'to-be-visualizer'),
      block('structured-content', 'possessives', { title: 'Adjetivos Posesivos' }),
      block('title', 'practice-title', { title: "Let's practice!" }),
      block('audio', 'practice-audio'),
      block('true_false', 'practice-true-false'),
      block('text', 'reading'),
      block('recording', 'speaking'),
      block('teacher_notes', 'teacher-only-2'),
      block('essay', 'writing'),
      block('image', 'empty-image', { url: '', alt: '' }),
    ]

    const steps = buildGuidedLessonSteps(roots)

    expect(steps).toHaveLength(7)
    expect(steps.map((step) => step.blocks.map((item) => item.id))).toEqual([
      ['audio-intro', 'vocabulary-intro'],
      ['to-be-table', 'to-be-visualizer'],
      ['possessives'],
      ['practice-title', 'practice-audio', 'practice-true-false'],
      ['reading'],
      ['speaking'],
      ['writing'],
    ])
    expect(steps.map((step) => step.label)).toEqual([
      'Names',
      'Conjugación de Verbos - To Be',
      'Adjetivos Posesivos',
      "Let's practice!",
      'Lectura',
      'Habla',
      'Escritura',
    ])
  })

  it('does not flatten nested containers or lose authored blocks', () => {
    const nested = block('block_group', 'nested-group', {
      children: [block('text', 'nested-reading')],
    })
    const authored = [nested, block('essay', 'essay-1')]

    const steps = buildGuidedLessonSteps(authored)

    expect(steps.flatMap((step) => step.blocks)).toEqual(authored)
    expect(steps[0].blocks[0]).toBe(nested)
    expect((steps[0].blocks[0] as Block & { children: Block[] }).children[0].id).toBe(
      'nested-reading'
    )
  })
})

describe('guided lesson step storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('resumes a valid index and clamps it to the available steps', () => {
    sessionStorage.setItem('lesson-a', '4')
    expect(readGuidedLessonStepIndex('lesson-a', 3)).toBe(2)

    writeGuidedLessonStepIndex('lesson-a', 1)
    expect(sessionStorage.getItem('lesson-a')).toBe('1')
  })

  it('falls back safely for corrupted values and unavailable storage', () => {
    sessionStorage.setItem('lesson-corrupt', '{not json')
    expect(readGuidedLessonStepIndex('lesson-corrupt', 4)).toBe(0)

    const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('storage unavailable')
      },
    })

    expect(readGuidedLessonStepIndex('lesson-unavailable', 4)).toBe(0)
    expect(() => writeGuidedLessonStepIndex('lesson-unavailable', 2)).not.toThrow()

    if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
  })
})
