import { describe, it, expect } from 'vitest'
import {
  convertBlocksToExamFormat,
  convertExamToBlocks,
  getBlockOptions,
} from '@/components/admin/exams/exam-builder-v2/block-conversion'
import type { Block, TrueFalseBlock } from '@/types/course-builder'
import type { ExamWithDetails } from '@/types/exam'

// Build a minimal exam-shaped object from the question payloads produced by
// convertBlocksToExamFormat, mimicking what is read back from the database.
function asExam(questions: ReturnType<typeof convertBlocksToExamFormat>): ExamWithDetails {
  return {
    questions: questions.map((q, i) => ({
      id: `q-${i}`,
      type: q.type,
      question: q.question,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      points: q.points,
      order: q.order,
    })),
  } as unknown as ExamWithDetails
}

describe('true/false block round-trip', () => {
  const twoStatementBlock: TrueFalseBlock = {
    id: 'block-1',
    type: 'true_false',
    order: 0,
    title: 'Verdadero o Falso',
    points: 2,
    items: [
      { id: 'item1', statement: 'El cielo es azul', correctAnswer: true },
      { id: 'item2', statement: 'El sol es amarillo', correctAnswer: true },
    ],
  }

  it('persists every statement so editing/reloading keeps them all (regression)', () => {
    const questions = convertBlocksToExamFormat([twoStatementBlock as Block])

    // The options payload must carry all statements, not just the first one.
    expect(questions).toHaveLength(1)
    const opts = questions[0].options as { trueFalseItems?: TrueFalseBlock['items'] }
    expect(opts.trueFalseItems).toHaveLength(2)
    expect(opts.trueFalseItems?.[1]?.statement).toBe('El sol es amarillo')

    // Reloading the exam (e.g. opening the editor again) must restore both statements.
    const restored = convertExamToBlocks(asExam(questions))
    expect(restored).toHaveLength(1)
    const restoredBlock = restored[0] as TrueFalseBlock
    expect(restoredBlock.type).toBe('true_false')
    expect(restoredBlock.items).toHaveLength(2)
    expect(restoredBlock.items?.map((i) => i.statement)).toEqual([
      'El cielo es azul',
      'El sol es amarillo',
    ])
    expect(restoredBlock.items?.map((i) => i.correctAnswer)).toEqual([true, true])
  })

  it('does not tag true_false options with originalBlockType (keeps native student rendering)', () => {
    const options = getBlockOptions(twoStatementBlock as Block) as Record<string, unknown>
    expect(options.trueFalseItems).toBeDefined()
    expect(options.originalBlockType).toBeUndefined()
  })

  it('falls back to the single legacy statement when trueFalseItems is absent', () => {
    // Legacy questions saved before the fix only have question + correctAnswer.
    const legacyExam = {
      questions: [
        {
          id: 'q-legacy',
          type: 'TRUE_FALSE',
          question: 'El cielo es azul',
          options: null,
          correctAnswer: 'Verdadero',
          points: 1,
          order: 0,
        },
      ],
    } as unknown as ExamWithDetails

    const restored = convertExamToBlocks(legacyExam)
    const restoredBlock = restored[0] as TrueFalseBlock
    expect(restoredBlock.items).toHaveLength(1)
    expect(restoredBlock.items?.[0]?.statement).toBe('El cielo es azul')
    expect(restoredBlock.items?.[0]?.correctAnswer).toBe(true)
  })
})
