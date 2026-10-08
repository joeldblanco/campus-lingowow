import { describe, expect, it } from 'vitest'
import type { Block, VocabularyBlock } from '@/types/course-builder'
import {
  buildIllustratedLessonSteps,
  getIllustratedLessonArt,
  getIllustratedLessonScene,
  getIllustratedLessonTaskTitle,
} from './illustrated-lesson'

const vocabulary: VocabularyBlock = { id: 'vocabulary', type: 'vocabulary', order: 1, title: 'Vocabulario', items: Array.from({ length: 9 }, (_, index) => ({ id: `item-${index}`, term: index === 0 ? 'Name' : `Term ${index}`, definition: index === 0 ? 'Peter' : `Definition ${index}` })) }

describe('illustrated vocabulary sequence', () => {
  it('keeps a published picture question with its own figure instead of a separate step', () => {
    const prompt = {
      id: 'picture-prompt', type: 'text', order: 0, content: 'What is the picture suggesting?',
      sourceRole: 'picture-instruction',
      data: { learningRevision: 'course-guided-v1', sourceSlides: [4] },
    } as Block
    const figure: Block = {
      id: 'figure', type: 'image', order: 1, url: '/source-figure.webp',
      data: { learningRevision: 'course-guided-v1', sourceSlides: [4] },
    }
    const unrelated: Block = {
      id: 'next-figure', type: 'image', order: 2, url: '/next-figure.webp',
      data: { learningRevision: 'course-guided-v1', sourceSlides: [5] },
    }
    const steps = buildIllustratedLessonSteps([prompt, figure, unrelated])
    expect(steps).toHaveLength(2)
    expect(steps[0].blocks).toEqual([prompt, figure])
    expect(getIllustratedLessonTaskTitle(steps[0])).toBe('Observa la imagen.')
    expect(steps[1].blocks).toEqual([unrelated])
  })
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

  it('keeps audio adjacent to every authored practice type without replacing the source URL', () => {
    const audio: Block = { id: 'audio', type: 'audio', order: 0, url: '/source.mp3' }
    const exercise: Block = {
      id: 'choose',
      type: 'multiple_choice',
      order: 1,
      question: 'Which answer?',
      options: [{ id: 'a', text: 'A' }],
      correctOptionId: 'a',
    }

    const steps = buildIllustratedLessonSteps([audio, exercise])

    expect(steps).toHaveLength(1)
    expect(steps[0].blocks).toEqual([audio, exercise])
    expect(steps[0].blocks.find((block) => block.type === 'audio')).toMatchObject({ url: '/source.mp3' })
    expect(getIllustratedLessonTaskTitle(steps[0])).toBe('Escucha y elige.')
  })

  it('names the personal-data activity by its recognition objective', () => {
    const block: Block = { id: 'dev-unit1-interleaved-vocabulary', type: 'match', order: 0, pairs: [{ id: 'name', left: 'Name', right: 'Peter' }] }
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([block])[0])).toBe('Identifica el dato.')
  })

  it('uses the authored subject for a concise task heading across vocabulary scenes', () => {
    const steps = buildIllustratedLessonSteps([vocabulary])
    expect(steps.map(getIllustratedLessonTaskTitle)).toEqual(['Conoce a Peter.', 'Un poco más sobre Peter.', 'Sus datos personales.'])
    expect(getIllustratedLessonTaskTitle({ id: 'plain', kind: 'reading', label: 'Lectura', blocks: [] })).toBe('Lectura')
  })

  it('does not invent Unit 1 identities for generic vocabulary and writing tasks', () => {
    const genericVocabulary: Block = {
      id: 'generic-vocabulary',
      type: 'vocabulary',
      order: 0,
      title: 'Words',
      items: [{ id: 'one', term: 'Bread', definition: 'Pan' }],
    }
    const genericEssay: Block = {
      id: 'generic-writing',
      type: 'essay',
      order: 1,
      prompt: 'Write about your daily routine.',
    }
    const genericReading: Block = {
      id: 'generic-reading',
      type: 'text',
      order: 2,
      content: 'Carl Johnson is mentioned in this unrelated reading.',
    }

    const steps = buildIllustratedLessonSteps([genericVocabulary, genericEssay, genericReading])

    expect(getIllustratedLessonTaskTitle(steps[0])).toBe('Aprende estas palabras.')
    expect(getIllustratedLessonTaskTitle(steps[1])).toBe('Describe tu rutina.')
    expect(getIllustratedLessonTaskTitle(steps[2])).toBe('Lectura')
    expect(steps.map(getIllustratedLessonTaskTitle).join(' ')).not.toMatch(/Peter|Carl|Lucas/)
  })

  it('derives a grammar heading from the authored topic for generic lessons', () => {
    const grammar: Block = {
      id: 'generic-grammar',
      type: 'grammar-visualizer',
      order: 0,
      title: 'Past simple',
      sets: [{ id: 'set', title: 'Past simple', variants: [] }],
    }

    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([grammar])[0])).toBe('Consulta past simple.')
  })

  it('keeps a concise reference instruction without repeating its verb or punctuation', () => {
    const grammar: Block = {
      id: 'reference', type: 'grammar-visualizer', order: 0,
      title: 'Consulta las formas.', sets: [],
    }
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([grammar])[0])).toBe('Consulta las formas.')
  })

  it('does not turn every oral presentation into a self-introduction', () => {
    const family: Block = { id: 'family-talk', type: 'recording', order: 0, prompt: 'Present your family to the class.' }
    const topic: Block = { id: 'topic-talk', type: 'recording', order: 0, prompt: 'Present your opinion about the topic.' }
    const self: Block = { id: 'self-talk', type: 'recording', order: 0, prompt: 'Present yourself to a new classmate.' }
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([family])[0])).toBe('Presenta a tu familia.')
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([topic])[0])).toBe('Graba tu presentación.')
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([self])[0])).toBe('Preséntate.')
  })

  it('introduces published learning goals with a concise student-facing heading', () => {
    const goal = {
      id: 'goal', type: 'text', order: 0, title: 'Communicative Function',
      content: 'Talk about your family.', sourceRole: 'learning-goal',
      data: { learningRevision: 'course-guided-v1', guidedTitle: 'Communicative Function' },
    } as Block
    expect(getIllustratedLessonTaskTitle(buildIllustratedLessonSteps([goal])[0])).toBe('En esta unidad.')
  })

  it('accepts only known scene assets and keeps generic steps on the setting path', () => {
    const step = buildIllustratedLessonSteps([{
      id: 'scene',
      type: 'text',
      order: 0,
      content: 'A lesson',
      data: { scene: '/images/lessons/backgrounds/library.webp', sceneSide: 'left' },
    } as Block])[0]
    const unknown = buildIllustratedLessonSteps([{
      id: 'unknown',
      type: 'text',
      order: 0,
      content: 'A lesson',
      data: { scene: '/images/lessons/missing.webp' },
    } as Block])[0]

    expect(getIllustratedLessonScene(step)).toEqual({ src: '/images/lessons/backgrounds/library.webp', side: 'left' })
    expect(getIllustratedLessonScene(unknown)).toBeUndefined()
    expect(getIllustratedLessonArt(step, { unitOneAuthored: false })).toBeUndefined()
  })
})
