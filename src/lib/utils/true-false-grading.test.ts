import { describe, it, expect } from 'vitest'
import {
  buildTrueFalseAnswerDetails,
  gradeTrueFalseItems,
  gradeSingleTrueFalse,
  normalizeTrueFalseAnswer,
  type TrueFalseItem,
} from '@/lib/utils/true-false-grading'

const items: TrueFalseItem[] = [
  { id: 'a', statement: 'El cielo es azul', correctAnswer: true },
  { id: 'b', statement: 'El sol es amarillo', correctAnswer: true },
  { id: 'c', statement: 'La nieve es negra', correctAnswer: false },
]

describe('normalizeTrueFalseAnswer', () => {
  it('accepts real booleans', () => {
    expect(normalizeTrueFalseAnswer(true)).toBe(true)
    expect(normalizeTrueFalseAnswer(false)).toBe(false)
  })

  it('accepts stringified booleans (post-JSON)', () => {
    expect(normalizeTrueFalseAnswer('true')).toBe(true)
    expect(normalizeTrueFalseAnswer('false')).toBe(false)
  })

  it('accepts the Spanish labels used for correctAnswer', () => {
    expect(normalizeTrueFalseAnswer('Verdadero')).toBe(true)
    expect(normalizeTrueFalseAnswer('falso')).toBe(false)
    expect(normalizeTrueFalseAnswer('  VERDADERO  ')).toBe(true)
  })

  it('treats anything else as unanswered', () => {
    expect(normalizeTrueFalseAnswer(undefined)).toBeNull()
    expect(normalizeTrueFalseAnswer(null)).toBeNull()
    expect(normalizeTrueFalseAnswer('')).toBeNull()
  })
})

describe('gradeSingleTrueFalse', () => {
  it('marks a boolean answer correct against a "Verdadero"/"Falso" correctAnswer', () => {
    // Regression: the student UI sends a boolean while correctAnswer is stored
    // as 'Verdadero'/'Falso'. String comparison ("true" vs "verdadero") used to
    // mark every single true/false answer wrong.
    expect(gradeSingleTrueFalse(true, 'Verdadero', 5)).toEqual({ isCorrect: true, pointsEarned: 5 })
    expect(gradeSingleTrueFalse(false, 'Falso', 5)).toEqual({ isCorrect: true, pointsEarned: 5 })
  })

  it('marks a mismatching answer incorrect', () => {
    expect(gradeSingleTrueFalse(true, 'Falso', 5)).toEqual({ isCorrect: false, pointsEarned: 0 })
    expect(gradeSingleTrueFalse(false, 'Verdadero', 5)).toEqual({ isCorrect: false, pointsEarned: 0 })
  })

  it('handles array-wrapped and stringified correct answers', () => {
    expect(gradeSingleTrueFalse(true, ['Verdadero'], 3).isCorrect).toBe(true)
    expect(gradeSingleTrueFalse('true', 'Verdadero', 3).isCorrect).toBe(true)
  })

  it('is incorrect when the answer is unintelligible', () => {
    expect(gradeSingleTrueFalse(null, 'Verdadero', 5)).toEqual({ isCorrect: false, pointsEarned: 0 })
  })
})

describe('gradeTrueFalseItems – partial credit', () => {
  it('awards proportional points for partially correct answers', () => {
    const r = gradeTrueFalseItems({ a: true, b: false, c: false }, items, 9, true)
    // a correct, b wrong, c correct -> 2/3 of 9 = 6
    expect(r.correctCount).toBe(2)
    expect(r.pointsEarned).toBe(6)
    expect(r.isCorrect).toBe(false)
  })

  it('awards full points when all correct', () => {
    const r = gradeTrueFalseItems({ a: true, b: true, c: false }, items, 9, true)
    expect(r.correctCount).toBe(3)
    expect(r.pointsEarned).toBe(9)
    expect(r.isCorrect).toBe(true)
  })

  it('counts unanswered statements as incorrect', () => {
    const r = gradeTrueFalseItems({ a: true }, items, 9, true)
    // only a answered & correct -> 1/3 of 9 = 3
    expect(r.correctCount).toBe(1)
    expect(r.answeredCount).toBe(1)
    expect(r.pointsEarned).toBe(3)
    expect(r.isCorrect).toBe(false)
  })
})

describe('gradeTrueFalseItems – all or nothing', () => {
  it('gives zero unless every statement is correct', () => {
    const r = gradeTrueFalseItems({ a: true, b: false, c: false }, items, 9, false)
    expect(r.correctCount).toBe(2)
    expect(r.pointsEarned).toBe(0)
    expect(r.isCorrect).toBe(false)
  })

  it('gives full points when every statement is correct', () => {
    const r = gradeTrueFalseItems({ a: true, b: true, c: false }, items, 9, false)
    expect(r.pointsEarned).toBe(9)
    expect(r.isCorrect).toBe(true)
  })
})

describe('gradeTrueFalseItems – edge cases', () => {
  it('earns nothing when no statement was answered', () => {
    const r = gradeTrueFalseItems({}, items, 9, true)
    expect(r.answeredCount).toBe(0)
    expect(r.pointsEarned).toBe(0)
    expect(r.isCorrect).toBe(false)
  })

  it('handles null answers map', () => {
    const r = gradeTrueFalseItems(null, items, 9, false)
    expect(r.pointsEarned).toBe(0)
    expect(r.isCorrect).toBe(false)
  })

  it('grades stringified boolean answers (post-JSON round-trip)', () => {
    const r = gradeTrueFalseItems({ a: 'true', b: 'true', c: 'false' }, items, 9, false)
    expect(r.isCorrect).toBe(true)
    expect(r.pointsEarned).toBe(9)
  })
})

describe('buildTrueFalseAnswerDetails', () => {
  it('formats item-id answer maps for review screens instead of exposing raw JSON', () => {
    expect(buildTrueFalseAnswerDetails({ a: true, b: false }, items)).toEqual([
      {
        itemQuestion: 'El cielo es azul',
        userOptionLetter: 'V',
        userOptionText: 'Verdadero',
        correctOptionLetter: 'V',
        correctOptionText: 'Verdadero',
        isCorrect: true,
      },
      {
        itemQuestion: 'El sol es amarillo',
        userOptionLetter: 'F',
        userOptionText: 'Falso',
        correctOptionLetter: 'V',
        correctOptionText: 'Verdadero',
        isCorrect: false,
      },
      {
        itemQuestion: 'La nieve es negra',
        userOptionLetter: null,
        userOptionText: null,
        correctOptionLetter: 'F',
        correctOptionText: 'Falso',
        isCorrect: false,
      },
    ])
  })
})
