// Types for the new Exam Builder

export interface ExamQuestion {
  id: string
  type: string
  order: number
  points: number
  required?: boolean
  // Common fields
  question?: string
  instruction?: string
  explanation?: string
  // Multiple choice
  options?: { id: string; text: string }[]
  correctOptionId?: string
  // Multi-step multiple choice
  multipleChoiceItems?: {
    id: string
    question: string
    options: { id: string; text: string }[]
    correctOptionId: string
  }[]
  // True/False
  correctAnswer?: boolean | string | string[]
  // Short answer
  correctAnswers?: string[]
  caseSensitive?: boolean
  // Essay
  minWords?: number
  maxWords?: number
  rubric?: string
  // Fill blanks
  content?: string
  // Matching
  pairs?: { id: string; left: string; right: string }[]
  // Ordering
  items?: { id: string; text: string; correctPosition: number }[]
  // Drag & Drop
  categories?: { id: string; name: string }[]
  dragItems?: { id: string; text: string; correctCategoryId: string }[]
  // Media
  audioUrl?: string
  imageUrl?: string
  maxPlays?: number
  questionType?: string
  // Hint/Feedback
  hint?: string
  feedback?: string
  partialCredit?: boolean
}

export interface ExamData {
  id?: string
  title: string
  description: string
  instructions?: string
  timeLimit: number // in minutes
  passingScore: number // percentage
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResults: boolean
  allowReview: boolean
  isPublished: boolean
  questions: ExamQuestion[]
  // Course assignment
  courseId?: string
  moduleId?: string
  lessonId?: string
}

export interface ExamSettings {
  timeLimit: number
  passingScore: number
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResults: boolean
  allowReview: boolean
  isBlocking: boolean
  isOptional: boolean
  // Proctoring
  proctoringEnabled: boolean
  requireFullscreen: boolean
  blockCopyPaste: boolean
  blockRightClick: boolean
  maxWarnings: number
}

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  timeLimit: 60,
  passingScore: 70,
  maxAttempts: 3,
  shuffleQuestions: false,
  shuffleOptions: false,
  showResults: true,
  allowReview: true,
  isBlocking: false,
  isOptional: false,
  // Proctoring - activado por defecto
  proctoringEnabled: true,
  requireFullscreen: true,
  blockCopyPaste: true,
  blockRightClick: true,
  maxWarnings: 5,
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Opción Múltiple',
  true_false: 'Verdadero / Falso',
  short_answer: 'Respuesta Corta',
  essay: 'Ensayo',
  fill_blanks: 'Rellenar Espacios',
  matching: 'Emparejar',
  ordering: 'Ordenar',
  drag_drop: 'Arrastrar y Soltar',
  audio_question: 'Audio',
  image_question: 'Imagen',
}

export const QUESTION_TYPE_ICONS: Record<string, string> = {
  multiple_choice: 'CircleDot',
  true_false: 'CheckCircle2',
  short_answer: 'MessageSquare',
  essay: 'FileSignature',
  fill_blanks: 'Edit3',
  matching: 'Shuffle',
  ordering: 'ArrowUpDown',
  drag_drop: 'GripHorizontal',
  audio_question: 'Mic',
  image_question: 'Image',
}

export interface QuestionValidationError {
  questionIndex: number
  field: string
  message: string
}
