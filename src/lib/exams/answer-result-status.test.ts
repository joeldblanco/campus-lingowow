import { describe, it, expect } from 'vitest'
import { getAnswerResultStatus } from './answer-result-status'

describe('getAnswerResultStatus', () => {
  it('returns "pending" when the answer awaits review', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: true, isCorrect: false, pointsEarned: 0, maxPoints: 2 })
    ).toBe('pending')
  })

  it('returns "correct" when fully correct', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: false, isCorrect: true, pointsEarned: 2, maxPoints: 2 })
    ).toBe('correct')
  })

  it('returns "partial" when some but not all points were earned', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: false, isCorrect: false, pointsEarned: 1, maxPoints: 2 })
    ).toBe('partial')
  })

  it('returns "incorrect" when no points were earned', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: false, isCorrect: false, pointsEarned: 0, maxPoints: 2 })
    ).toBe('incorrect')
  })

  it('does not treat full points without the correct flag as partial', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: false, isCorrect: false, pointsEarned: 2, maxPoints: 2 })
    ).toBe('incorrect')
  })

  it('returns "incorrect" when maxPoints is 0', () => {
    expect(
      getAnswerResultStatus({ isPendingReview: false, isCorrect: false, pointsEarned: 0, maxPoints: 0 })
    ).toBe('incorrect')
  })
})
