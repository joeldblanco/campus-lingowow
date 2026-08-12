import { describe, expect, it } from 'vitest'
import { gradeMobileActivity } from './mobile-activity-grading'

describe('gradeMobileActivity', () => {
  const questions = [
    {
      id: 'choice',
      type: 'multiple_choice',
      options: [
        { id: 'a', text: 'No', isCorrect: false },
        { id: 'b', text: 'Yes', isCorrect: true },
      ],
    },
    {
      id: 'blank',
      type: 'fill_blanks',
      blanks: [{ id: 'name', answer: 'José' }],
    },
    {
      id: 'pairs',
      type: 'matching_pairs',
      pairs: [{ id: 'one', left: 'Hello', right: 'Hola' }],
    },
    {
      id: 'order',
      type: 'sentence_unscramble',
      correctSentence: 'I am learning',
    },
  ]

  it('grades all supported mobile question types on the server', () => {
    expect(gradeMobileActivity({ activityData: { questions } }, {
      choice: 'b',
      blank: { name: ' jose ' },
      pairs: { Hello: 'hola' },
      order: ['I', 'am', 'learning'],
    })).toEqual({
      score: 100,
      correctAnswers: 4,
      totalQuestions: 4,
      passed: true,
    })
  })

  it('prefers direct questions and does not trust a client score', () => {
    expect(gradeMobileActivity({
      questions: [questions[0]],
      activityData: { questions },
    }, { choice: 'a' })).toEqual({
      score: 0,
      correctAnswers: 0,
      totalQuestions: 1,
      passed: false,
    })
  })

  it('does not complete activities without gradable questions', () => {
    expect(gradeMobileActivity({}, {})).toEqual({
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      passed: false,
    })
  })
})
