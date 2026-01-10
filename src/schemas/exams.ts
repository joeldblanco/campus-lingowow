import * as z from 'zod'

// Enums para validación
export const QuestionTypeEnum = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE', 
  'SHORT_ANSWER',
  'ESSAY',
  'FILL_BLANK',
  'MATCHING',
  'ORDERING',
  'DRAG_DROP'
])

export const QuestionDifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD'])

export const AudioPositionEnum = z.enum([
  'BEFORE_QUESTION',
  'AFTER_QUESTION',
  'BEFORE_OPTIONS',
  'SECTION_TOP'
])

// Types that don't require a correct answer (manually graded)
const TYPES_WITHOUT_CORRECT_ANSWER = ['ESSAY'] as const

// Schema para preguntas de examen
export const ExamQuestionSchema = z.object({
  id: z.string().optional(), // Para edición
  type: QuestionTypeEnum,
  question: z.string().min(1, 'La pregunta es requerida'),
  options: z.array(z.string()).optional(), // Para preguntas de opción múltiple
  correctAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.null()
  ]).optional(),
  explanation: z.string().optional(),
  points: z.number().min(0, 'Los puntos deben ser mayor o igual a 0').default(1),
  order: z.number().default(0),
  difficulty: QuestionDifficultyEnum.default('MEDIUM'),
  tags: z.array(z.string()).default([]),
  caseSensitive: z.boolean().default(false),
  partialCredit: z.boolean().default(false),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  // Audio configuration for listening exercises
  audioUrl: z.string().url('URL de audio inválida').optional().or(z.literal('')),
  audioPosition: AudioPositionEnum.optional(),
  maxAudioPlays: z.number().min(1, 'Mínimo 1 reproducción').optional(),
  audioAutoplay: z.boolean().optional(),
  audioPausable: z.boolean().optional(),
  // Image URL for image-based questions
  imageUrl: z.string().url('URL de imagen inválida').optional().or(z.literal(''))
}).superRefine((data, ctx) => {
  // Validate correctAnswer is required for types that need it
  const needsCorrectAnswer = !(TYPES_WITHOUT_CORRECT_ANSWER as readonly string[]).includes(data.type)
  
  if (needsCorrectAnswer) {
    const answer = data.correctAnswer
    const isEmpty = !answer || (Array.isArray(answer) ? answer.length === 0 : answer.length === 0)
    
    if (isEmpty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La respuesta correcta es requerida',
        path: ['correctAnswer']
      })
    }
  }
})

// Schema para secciones de examen
export const ExamSectionSchema = z.object({
  id: z.string().optional(), // Para edición
  title: z.string().min(1, 'El título de la sección es requerido'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  timeLimit: z.number().optional(), // En minutos
  order: z.number().default(0),
  questions: z.array(ExamQuestionSchema).min(1, 'Debe tener al menos una pregunta')
})

// Schema principal para crear examen
export const CreateExamSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  instructions: z.string().optional(),
  timeLimit: z.number().optional(), // Tiempo total en minutos
  passingScore: z.number().min(0, 'El puntaje debe ser mayor o igual a 0').max(100, 'El puntaje no puede ser mayor a 100').default(70),
  maxAttempts: z.number().min(1, 'Los intentos deben ser mayor a 0').default(3),
  isBlocking: z.boolean().default(false),
  isOptional: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  
  // Contexto (opcional)
  courseId: z.string().optional(),
  moduleId: z.string().optional(), 
  lessonId: z.string().optional(),
  
  // Secciones del examen
  sections: z.array(ExamSectionSchema).min(1, 'Debe tener al menos una sección'),
  
  // Usuario que crea
  createdById: z.string().min(1, 'El creador es requerido')
})

// Schema para editar examen
export const EditExamSchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  timeLimit: z.number().optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).optional(),
  isBlocking: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  allowReview: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  
  // Contexto
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  lessonId: z.string().optional(),
  
  // Secciones
  sections: z.array(ExamSectionSchema).optional()
})

// Schema para asignar examen
export const AssignExamSchema = z.object({
  examId: z.string().min(1, 'El examen es requerido'),
  studentIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un estudiante'),
  dueDate: z.string().optional(),
  instructions: z.string().optional()
})

// Schema para iniciar intento de examen
export const StartExamAttemptSchema = z.object({
  examId: z.string().min(1, 'El examen es requerido'),
  userId: z.string().min(1, 'El usuario es requerido')
})

// Schema para enviar respuesta
export const SubmitAnswerSchema = z.object({
  attemptId: z.string().min(1, 'El intento es requerido'),
  questionId: z.string().min(1, 'La pregunta es requerida'),
  answer: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.boolean()
  ]),
  timeSpent: z.number().optional() // En segundos
})

// Schema para finalizar examen
export const SubmitExamSchema = z.object({
  attemptId: z.string().min(1, 'El intento es requerido')
})

// Schema para revisar respuesta (profesores)
export const ReviewAnswerSchema = z.object({
  answerId: z.string().min(1, 'La respuesta es requerida'),
  pointsEarned: z.number().min(0, 'Los puntos deben ser mayor o igual a 0'),
  feedback: z.string().optional(),
  reviewedBy: z.string().min(1, 'El revisor es requerido')
})
