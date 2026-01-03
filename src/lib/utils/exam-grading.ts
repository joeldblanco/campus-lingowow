import { CreateExamQuestionData } from '@/types/exam'

/**
 * Resultado de la corrección de una pregunta
 */
export interface QuestionGradingResult {
  questionKey: string
  isCorrect: boolean
  pointsEarned: number
  maxPoints: number
  userAnswer: string
  correctAnswer: string | string[]
  explanation?: string
}

/**
 * Resultado de la corrección completa del examen
 */
export interface ExamGradingResult {
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  totalPoints: number
  earnedPoints: number
  percentage: number
  passed: boolean
  questionResults: QuestionGradingResult[]
}

/**
 * Normaliza una respuesta de texto para comparación
 */
function normalizeAnswer(answer: string, caseSensitive: boolean = false): string {
  let normalized = answer.trim()
  if (!caseSensitive) {
    normalized = normalized.toLowerCase()
  }
  // Eliminar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ')
  return normalized
}

/**
 * Verifica si una respuesta es correcta según el tipo de pregunta
 */
export function gradeQuestion(
  question: CreateExamQuestionData,
  userAnswer: string,
  questionKey: string
): QuestionGradingResult {
  let isCorrect = false
  let pointsEarned = 0

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      // Comparación exacta para opciones múltiples y verdadero/falso
      isCorrect = userAnswer === question.correctAnswer
      pointsEarned = isCorrect ? question.points : 0
      break

    case 'SHORT_ANSWER':
    case 'FILL_BLANK':
      // Para respuestas cortas, permitir múltiples respuestas correctas
      const correctAnswers = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer]

      const normalizedUserAnswer = normalizeAnswer(userAnswer, question.caseSensitive)
      
      isCorrect = correctAnswers.some(correctAns => {
        const normalizedCorrect = normalizeAnswer(
          typeof correctAns === 'string' ? correctAns : String(correctAns),
          question.caseSensitive
        )
        return normalizedUserAnswer === normalizedCorrect
      })

      pointsEarned = isCorrect ? question.points : 0

      // Crédito parcial si está habilitado
      if (!isCorrect && question.partialCredit) {
        const similarity = calculateSimilarity(
          normalizedUserAnswer,
          normalizeAnswer(
            typeof question.correctAnswer === 'string' 
              ? question.correctAnswer 
              : String(correctAnswers[0]),
            question.caseSensitive
          )
        )
        if (similarity > 0.7) {
          pointsEarned = question.points * 0.5
        }
      }
      break

    case 'ESSAY':
      // Los ensayos requieren corrección con IA o manual
      // Marcar como pendiente de revisión (se corrige vía API /api/exams/grade-essay)
      isCorrect = false
      pointsEarned = 0
      break

    default:
      isCorrect = false
      pointsEarned = 0
  }

  return {
    questionKey,
    isCorrect,
    pointsEarned,
    maxPoints: question.points,
    userAnswer,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  }
}

/**
 * Calcula la similitud entre dos strings (0-1)
 * Usa distancia de Levenshtein simplificada
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Corrige un examen completo basado en las respuestas del usuario
 */
export function gradeExam(
  sections: Array<{
    questions: CreateExamQuestionData[]
  }>,
  answers: Record<string, string>,
  passingScore: number = 70
): ExamGradingResult {
  const questionResults: QuestionGradingResult[] = []
  let totalPoints = 0
  let earnedPoints = 0
  let correctAnswers = 0
  let incorrectAnswers = 0

  sections.forEach((section, sIndex) => {
    section.questions.forEach((question, qIndex) => {
      const questionKey = `${sIndex}-${qIndex}`
      const userAnswer = answers[questionKey] || ''

      totalPoints += question.points

      // Solo corregir preguntas autocorregibles
      if (question.type !== 'ESSAY') {
        const result = gradeQuestion(question, userAnswer, questionKey)
        questionResults.push(result)
        earnedPoints += result.pointsEarned

        if (result.isCorrect) {
          correctAnswers++
        } else {
          incorrectAnswers++
        }
      } else {
        // Para ensayos, agregar resultado sin corrección
        questionResults.push({
          questionKey,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: question.points,
          userAnswer,
          correctAnswer: '',
          explanation: 'Los ensayos requieren corrección con IA o manual. Usa /api/exams/grade-essay para calificar.',
        })
      }
    })
  })

  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
  const passed = percentage >= passingScore

  return {
    totalQuestions: questionResults.length,
    correctAnswers,
    incorrectAnswers,
    totalPoints,
    earnedPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    questionResults,
  }
}
