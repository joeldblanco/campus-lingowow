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

export interface TrueFalseAnswerDetail {
  itemQuestion: string
  userOptionLetter: string | null
  userOptionText: string | null
  correctOptionLetter: string
  correctOptionText: string
  isCorrect: boolean
}

export function formatTrueFalseLabel(value: boolean): string {
  return value ? 'Verdadero' : 'Falso'
}

/**
 * Normalizes a true/false value to a boolean, or `null` when it cannot be
 * interpreted (i.e. unanswered).
 *
 * Accepts every representation the codebase has produced over time:
 * - real booleans (`true` / `false`) — what the student UI sends,
 * - stringified booleans (`'true'` / `'false'`) — after a JSON round-trip,
 * - Spanish labels (`'Verdadero'` / `'Falso'`) — how `correctAnswer` is stored.
 */
export function normalizeTrueFalseAnswer(value: unknown): boolean | null {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === 'verdadero') return true
    if (v === 'false' || v === 'falso') return false
  }
  return null
}

export function buildTrueFalseAnswerDetails(
  userAnswers: Record<string, unknown> | null | undefined,
  items: TrueFalseItem[]
): TrueFalseAnswerDetail[] {
  const answers = userAnswers || {}

  return items.map((item) => {
    const userBool = normalizeTrueFalseAnswer(answers[item.id])

    return {
      itemQuestion: item.statement,
      userOptionLetter: userBool === null ? null : userBool ? 'V' : 'F',
      userOptionText: userBool === null ? null : formatTrueFalseLabel(userBool),
      correctOptionLetter: item.correctAnswer ? 'V' : 'F',
      correctOptionText: formatTrueFalseLabel(item.correctAnswer),
      isCorrect: userBool === item.correctAnswer,
    }
  })
}

/**
 * Grades a single-statement TRUE/FALSE question. The student answer and the
 * stored correct answer may each be in a different representation (boolean vs.
 * `'Verdadero'`/`'Falso'`), so both are normalized before comparison.
 */
export function gradeSingleTrueFalse(
  answer: unknown,
  correctAnswer: unknown,
  points: number
): { isCorrect: boolean; pointsEarned: number } {
  const userBool = normalizeTrueFalseAnswer(answer)
  const correctBool = normalizeTrueFalseAnswer(
    Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer
  )
  const isCorrect = userBool !== null && correctBool !== null && userBool === correctBool
  return { isCorrect, pointsEarned: isCorrect ? points : 0 }
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
