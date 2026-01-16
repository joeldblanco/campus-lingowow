import { Prisma } from '@prisma/client'
import { z } from 'zod'

// =============================================
// TIPOS GENERADOS POR PRISMA CON RELACIONES
// =============================================

// Tipo para examen con detalles completos
export type ExamWithDetails = Prisma.ExamGetPayload<{
  include: {
    creator: {
      select: {
        name: true
        lastName: true
        email: true
      }
    }
    course: {
      select: {
        id: true
        title: true
        language: true
        level: true
        isPersonalized: true
      }
    }
    module: {
      select: {
        id: true
        title: true
        level: true
      }
    }
    lesson: {
      select: {
        id: true
        title: true
      }
    }
    sections: {
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
      orderBy: {
        order: 'asc'
      }
    }
    attempts: {
      include: {
        user: {
          select: {
            id: true
            name: true
            lastName: true
            email: true
          }
        }
      }
    }
    _count: {
      select: {
        attempts: true
        assignments: true
      }
    }
  }
}>

// Tipo extendido con campos legacy para compatibilidad
export type ExamWithDetailsLegacy = ExamWithDetails & {
  userAttempts: ExamWithDetails['attempts']
  examData?: {
    sections?: ExamWithDetails['sections']
    timeLimit?: number
    passingScore?: number
    attempts?: number
    isBlocking?: boolean
    isOptional?: boolean
  }
  points?: number
  duration?: number
}

// Tipo para sección de examen con preguntas
export type ExamSectionWithQuestions = Prisma.ExamSectionGetPayload<{
  include: {
    questions: {
      orderBy: {
        order: 'asc'
      }
    }
  }
}>

// Tipo para pregunta de examen completa
export type ExamQuestionWithDetails = Prisma.ExamQuestionGetPayload<{
  select: {
    id: true
    type: true
    question: true
    options: true
    correctAnswer: true
    explanation: true
    points: true
    order: true
    difficulty: true
    tags: true
    caseSensitive: true
    partialCredit: true
    minLength: true
    maxLength: true
    createdAt: true
    updatedAt: true
  }
}>

// Tipo para intento de examen con detalles
export type ExamAttemptWithDetails = Prisma.ExamAttemptGetPayload<{
  include: {
    exam: {
      select: {
        id: true
        title: true
        passingScore: true
        maxAttempts: true
        showResults: true
        allowReview: true
      }
    }
    user: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
      }
    }
    answers: {
      include: {
        question: {
          select: {
            id: true
            type: true
            question: true
            options: true
            correctAnswer: true
            explanation: true
            points: true
          }
        }
      }
    }
  }
}>

// Tipo para respuesta de examen con detalles
export type ExamAnswerWithDetails = Prisma.ExamAnswerGetPayload<{
  include: {
    question: {
      select: {
        id: true
        type: true
        question: true
        options: true
        correctAnswer: true
        explanation: true
        points: true
      }
    }
    reviewer: {
      select: {
        name: true
        lastName: true
        email: true
      }
    }
  }
}>

// Tipo para asignación de examen con detalles
export type ExamAssignmentWithDetails = Prisma.ExamAssignmentGetPayload<{
  include: {
    exam: {
      select: {
        id: true
        title: true
        description: true
        timeLimit: true
        maxAttempts: true
      }
    }
    student: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
      }
    }
    assignedByUser: {
      select: {
        name: true
        lastName: true
        email: true
      }
    }
  }
}>

// =============================================
// TIPOS PARA ESTADÍSTICAS Y DATOS
// =============================================

export interface ExamStats {
  totalExams: number
  publishedExams: number
  unpublishedExams: number
  totalAttempts: number
  passedAttempts: number
  passRate: number
}

export interface ExamAttemptStats {
  totalAttempts: number
  completedAttempts: number
  averageScore: number
  passRate: number
  averageTimeSpent: number
}

// =============================================
// TIPOS PARA RESPUESTAS DE API
// =============================================

export interface ExamCreateResponse {
  success: boolean
  exam?: Prisma.ExamGetPayload<{
    select: {
      id: true
      title: true
      description: true
      createdAt: true
    }
  }>
  error?: string
  details?: z.ZodIssue[]
}

export interface ExamUpdateResponse {
  success: boolean
  exam?: Prisma.ExamGetPayload<{
    select: {
      id: true
      title: true
      description: true
      updatedAt: true
    }
  }>
  error?: string
  details?: z.ZodIssue[]
}

export interface ExamDeleteResponse {
  success: boolean
  error?: string
}

export interface ExamAssignResponse {
  success: boolean
  assignments?: Prisma.ExamAssignmentGetPayload<{
    select: {
      id: true
      examId: true
      userId: true
      status: true
      createdAt: true
    }
  }>[]
  error?: string
  details?: z.ZodIssue[]
}

// =============================================
// TIPOS PARA DATOS DE ENTRADA
// =============================================

export type ExamTypeValue = 'COURSE_EXAM' | 'PLACEMENT_TEST' | 'DIAGNOSTIC' | 'PRACTICE'

export interface CreateExamData {
  title: string
  description: string
  instructions?: string
  timeLimit?: number
  passingScore: number
  maxAttempts: number
  isBlocking: boolean
  isOptional: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResults: boolean
  allowReview: boolean
  examType?: ExamTypeValue
  isGuestAccessible?: boolean
  targetLanguage?: string
  courseId?: string
  moduleId?: string
  lessonId?: string
  sections: CreateExamSectionData[]
  createdById: string
}

export interface CreateExamSectionData {
  title: string
  description?: string
  instructions?: string
  timeLimit?: number
  order: number
  questions: CreateExamQuestionData[]
}

export interface CreateExamQuestionData {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP'
  question: string
  options?: string[]
  correctAnswer?: string | string[] | null
  explanation?: string
  points: number
  order: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  tags: string[]
  caseSensitive: boolean
  partialCredit: boolean
  minLength?: number
  maxLength?: number
  // Audio configuration for listening exercises
  audioUrl?: string
  audioPosition?: 'BEFORE_QUESTION' | 'AFTER_QUESTION' | 'BEFORE_OPTIONS' | 'SECTION_TOP'
  maxAudioPlays?: number
  audioAutoplay?: boolean
  audioPausable?: boolean
  // AI Grading configuration for essays
  aiGrading?: boolean
  aiGradingConfig?: {
    language: 'english' | 'spanish'
    targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  }
}

export interface UpdateExamData {
  title?: string
  description?: string
  instructions?: string
  timeLimit?: number
  passingScore?: number
  maxAttempts?: number
  isBlocking?: boolean
  isOptional?: boolean
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  showResults?: boolean
  allowReview?: boolean
  isPublished?: boolean
  examType?: ExamTypeValue
  isGuestAccessible?: boolean
  targetLanguage?: string
  courseId?: string
  moduleId?: string
  lessonId?: string
  sections?: CreateExamSectionData[]
}

export interface AssignExamData {
  examId: string
  studentIds: string[]
  dueDate?: string
  instructions?: string
  assignedBy: string
}

// =============================================
// TIPOS PARA INTENTOS Y RESPUESTAS
// =============================================

export interface StartExamAttemptData {
  examId: string
  userId: string
}

export interface SubmitAnswerData {
  attemptId: string
  questionId: string
  answer: string | string[] | number | boolean
  timeSpent?: number
}

export interface SubmitExamData {
  attemptId: string
}

export interface ReviewAnswerData {
  answerId: string
  pointsEarned: number
  feedback?: string
  reviewedBy: string
}

// =============================================
// TIPOS PARA RESULTADOS DE EXAMEN
// =============================================

export interface ExamResult {
  attemptId: string
  examId: string
  userId: string
  score: number
  totalPoints: number
  maxPoints: number
  passed: boolean
  timeSpent: number
  completedAt: Date
  answers: ExamAnswerResult[]
}

export interface ExamAnswerResult {
  questionId: string
  answer: string | string[] | number | boolean
  isCorrect: boolean
  pointsEarned: number
  maxPoints: number
  feedback?: string
}

// =============================================
// TIPOS PARA CONFIGURACIÓN DE EXAMEN
// =============================================

export interface ExamConfiguration {
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timeLimit?: number
  showResults: boolean
  allowReview: boolean
  maxAttempts: number
  passingScore: number
}

// =============================================
// TIPOS PARA PLACEMENT TESTS
// =============================================

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface PlacementTestResult {
  attemptId: string
  examId: string
  userId: string
  score: number
  recommendedLevel: LanguageLevel
  targetLanguage: string
  completedAt: Date
  timeSpent: number
}

export interface PlacementTestWithDetails {
  id: string
  title: string
  description: string
  targetLanguage: string
  timeLimit: number | null
  totalQuestions: number
  isPublished: boolean
  hasAttempted: boolean
  lastAttemptLevel?: LanguageLevel
}

export interface RecommendedCourse {
  id: string
  title: string
  description: string
  language: string
  level: string
  image: string | null
}

export const LEVEL_SCORE_RANGES: Record<LanguageLevel, { min: number; max: number }> = {
  A1: { min: 0, max: 20 },
  A2: { min: 21, max: 40 },
  B1: { min: 41, max: 60 },
  B2: { min: 61, max: 80 },
  C1: { min: 81, max: 90 },
  C2: { min: 91, max: 100 },
}

export const EXAM_TYPE_LABELS: Record<ExamTypeValue, string> = {
  COURSE_EXAM: 'Examen de Curso',
  PLACEMENT_TEST: 'Test de Clasificación',
  DIAGNOSTIC: 'Examen Diagnóstico',
  PRACTICE: 'Práctica Libre',
}
