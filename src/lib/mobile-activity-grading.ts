type JsonRecord = Record<string, unknown>

export interface ActivityGradingResult {
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
}

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalized(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/g, '')
}

export function getActivityQuestions(activity: {
  questions?: unknown
  activityData?: unknown
}): JsonRecord[] {
  const directQuestions = list(activity.questions)
  const questions = directQuestions.length > 0
    ? directQuestions
    : list(record(activity.activityData).questions)

  return questions.map(record).filter((question) => String(question.id ?? '') !== '')
}

function isQuestionCorrect(question: JsonRecord, answer: unknown): boolean {
  switch (String(question.type ?? '')) {
    case 'multiple_choice': {
      const correct = list(question.options)
        .map(record)
        .find((option) => option.isCorrect === true)
      return correct !== undefined && String(answer ?? '') === String(correct.id ?? '')
    }
    case 'true_false':
      return normalized(answer) === normalized(question.correctAnswer)
    case 'fill_blanks': {
      const submitted = record(answer)
      const blanks = list(question.blanks).map(record)
      return blanks.length > 0 && blanks.every((blank) =>
        normalized(submitted[String(blank.id ?? '')]) === normalized(blank.answer)
      )
    }
    case 'matching_pairs': {
      const submitted = record(answer)
      const pairs = list(question.pairs).map(record)
      return pairs.length > 0 && pairs.every((pair) =>
        normalized(submitted[String(pair.left ?? '')]) === normalized(pair.right)
      )
    }
    case 'sentence_unscramble': {
      const submitted = list(answer).map(normalized).filter(Boolean)
      const expectedWords = normalized(question.correctSentence).split(' ').filter(Boolean)
      return submitted.length === expectedWords.length &&
        submitted.every((word, index) => word === expectedWords[index])
    }
    default:
      return false
  }
}

export function gradeMobileActivity(
  activity: { questions?: unknown; activityData?: unknown },
  answers: unknown,
  passingScore = 70
): ActivityGradingResult {
  const questions = getActivityQuestions(activity)
  const submitted = record(answers)
  const correctAnswers = questions.reduce((total, question) => {
    const questionId = String(question.id)
    return total + (isQuestionCorrect(question, submitted[questionId]) ? 1 : 0)
  }, 0)
  const totalQuestions = questions.length
  const score = totalQuestions === 0
    ? 0
    : Math.round((correctAnswers / totalQuestions) * 100)

  return {
    score,
    correctAnswers,
    totalQuestions,
    passed: totalQuestions > 0 && score >= passingScore,
  }
}
