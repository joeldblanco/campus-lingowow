export type AnswerResultStatus = 'pending' | 'correct' | 'partial' | 'incorrect'

/**
 * Determines the display status of a graded answer.
 *
 * A multiple-choice (or any partial-credit) answer that earned some — but not
 * all — of its points is "partial" and must NOT be shown as a plain
 * pass/fail (Correcta/Incorrecta). See Trello card "Las respuestas multiple
 * choice que tienen crédito parcial no deberían decir aprobadas o desaprobadas".
 */
export function getAnswerResultStatus(params: {
  isPendingReview: boolean
  isCorrect: boolean
  pointsEarned: number
  maxPoints: number
}): AnswerResultStatus {
  const { isPendingReview, isCorrect, pointsEarned, maxPoints } = params
  if (isPendingReview) return 'pending'
  if (isCorrect) return 'correct'
  if (maxPoints > 0 && pointsEarned > 0 && pointsEarned < maxPoints) return 'partial'
  return 'incorrect'
}
