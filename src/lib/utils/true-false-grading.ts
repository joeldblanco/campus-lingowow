/**
 * Grading helpers for multi-statement TRUE/FALSE exam questions.
 *
 * A TRUE/FALSE exam question can hold several statements (items). Each item has
 * its own correct answer, and the student answers each one independently. The
 * student's answer is stored as a map of `itemId -> boolean`.
 *
 * These helpers are intentionally pure (no DB, no React) so they can be reused
 * by the server-side grader (`saveExamAnswer`) and the results page, and unit
 * tested in isolation.
 */

export interface TrueFalseItem {
  id: string
  statement: string
  correctAnswer: boolean
}

/**
 * Normalizes a stored answer value (which may be a real boolean or a stringified
 * one once it has been through JSON) to a boolean, or `null` when unanswered.
 */
export function normalizeTrueFalseAnswer(value: unknown): boolean | null {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

export interface TrueFalseGradingResult {
  /** True only when every statement was answered correctly. */
  isCorrect: boolean
  pointsEarned: number
  correctCount: number
  total: number
  answeredCount: number
}

/**
 * Grades a multi-statement TRUE/FALSE question.
 *
 * - `partialCredit === true`  → points are proportional to the number of correct
 *   statements (`round(correct / total * points)`).
 * - `partialCredit === false` → all-or-nothing: full points only if every
 *   statement is correct, otherwise zero.
 *
 * Unanswered statements count as incorrect. If nothing was answered at all the
 * question earns zero points and is marked incorrect.
 */
export function gradeTrueFalseItems(
  userAnswers: Record<string, unknown> | null | undefined,
  items: TrueFalseItem[],
  points: number,
  partialCredit: boolean
): TrueFalseGradingResult {
  const total = items.length
  const answers = userAnswers || {}

  let correctCount = 0
  let answeredCount = 0

  for (const item of items) {
    const answer = normalizeTrueFalseAnswer(answers[item.id])
    if (answer !== null) answeredCount++
    if (answer === item.correctAnswer) correctCount++
  }

  const isCorrect = total > 0 && correctCount === total

  let pointsEarned = 0
  if (answeredCount > 0) {
    pointsEarned = partialCredit
      ? Math.round((correctCount / total) * points)
      : isCorrect
        ? points
        : 0
  }

  return { isCorrect, pointsEarned, correctCount, total, answeredCount }
}
