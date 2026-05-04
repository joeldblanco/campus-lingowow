import { z } from 'zod'
import {
  assignExamToStudents,
  createExam,
  deleteExam,
  finalizeExamReview,
  getAllExams,
  getAttemptsForGrading,
  getExamAttemptWithAnswers,
  getExamById,
  getExamStats,
  getNonAdminUsersForExamAssignment,
  getPlacementTests,
  gradeExamAnswer,
  updateExam,
} from '@/lib/actions/exams'
import { CreateExamSchema, EditExamSchema, AssignExamSchema } from '@/schemas/exams'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const examTypeEnum = z.enum(['COURSE_EXAM', 'PLACEMENT_TEST', 'DIAGNOSTIC', 'PRACTICE'])

export const examTools: AnyToolModule[] = [
  {
    name: 'lingowow_exams_list',
    description: 'Lista todos los exámenes con detalles (curso, módulo, preguntas, asignaciones).',
    scopes: ['mcp:exams:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getAllExams()
      return {
        total: all.length,
        limit,
        offset,
        exams: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_exams_get',
    description: 'Obtiene un examen por ID con todas sus preguntas y configuración.',
    scopes: ['mcp:exams:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const exam = await getExamById(id)
      if (!exam) throw new Error('Examen no encontrado')
      return exam
    },
  },

  {
    name: 'lingowow_exams_stats',
    description: 'Estadísticas agregadas de exámenes (totales por estado, por tipo, etc).',
    scopes: ['mcp:exams:read'],
    handler: async () => getExamStats(),
  },

  {
    name: 'lingowow_exams_list_placement_tests',
    description:
      'Lista los placement tests del campus. Si pasas userId, filtra por accesibles para ese usuario.',
    scopes: ['mcp:exams:read'],
    inputShape: { userId: z.string().optional() },
    handler: async ({ userId }) => getPlacementTests(userId),
  },

  {
    name: 'lingowow_exams_list_assignable_users',
    description:
      'Lista usuarios no-admin (estudiantes/profesores) candidatos para asignar un examen.',
    scopes: ['mcp:exams:read'],
    handler: async () => getNonAdminUsersForExamAssignment(),
  },

  {
    name: 'lingowow_exams_create',
    description:
      'Crea un examen. Acepta la estructura completa del CreateExamSchema, incluidas preguntas. createdById debe ser un usuario válido (admin o teacher). Para placement tests pasa examType=PLACEMENT_TEST.',
    scopes: ['mcp:exams:write'],
    inputShape: {
      title: z.string().min(1),
      description: z.string().min(1),
      instructions: z.string().optional(),
      timeLimit: z.number().int().min(1).optional(),
      passingScore: z.number().min(0).max(100).default(70),
      maxAttempts: z.number().int().min(1).default(3),
      isBlocking: z.boolean().default(false),
      isOptional: z.boolean().default(false),
      isPublished: z.boolean().default(false),
      shuffleQuestions: z.boolean().default(false),
      shuffleOptions: z.boolean().default(false),
      showResults: z.boolean().default(true),
      allowReview: z.boolean().default(true),
      proctoringEnabled: z.boolean().default(true),
      requireFullscreen: z.boolean().default(true),
      blockCopyPaste: z.boolean().default(true),
      blockRightClick: z.boolean().default(true),
      maxWarnings: z.number().int().min(1).max(20).default(5),
      level: z.string().default('B1'),
      examType: examTypeEnum.optional(),
      targetLanguage: z.string().nullable().optional(),
      slug: z.string().nullable().optional(),
      isPublicAccess: z.boolean().optional(),
      isGuestAccessible: z.boolean().optional(),
      courseId: z.string().optional(),
      moduleId: z.string().optional(),
      lessonId: z.string().optional(),
      createdById: z.string().min(1),
      questions: z
        .array(z.record(z.unknown()))
        .optional()
        .describe(
          'Array de preguntas (estructura ExamQuestionSchema). Cada pregunta requiere type, question, points y para la mayoría correctAnswer.'
        ),
    },
    handler: async (args) => {
      const data = CreateExamSchema.parse(args)
      const result = await createExam(data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_update',
    description:
      'Actualiza un examen existente. Pasa solo los campos a modificar. Si pasas questions, ten cuidado: reemplaza el set de preguntas (se valida si hay respuestas existentes).',
    scopes: ['mcp:exams:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      timeLimit: z.number().int().min(1).optional(),
      passingScore: z.number().min(0).max(100).optional(),
      maxAttempts: z.number().int().min(1).optional(),
      isBlocking: z.boolean().optional(),
      isOptional: z.boolean().optional(),
      isPublished: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
      shuffleOptions: z.boolean().optional(),
      showResults: z.boolean().optional(),
      allowReview: z.boolean().optional(),
      proctoringEnabled: z.boolean().optional(),
      requireFullscreen: z.boolean().optional(),
      blockCopyPaste: z.boolean().optional(),
      blockRightClick: z.boolean().optional(),
      maxWarnings: z.number().int().min(1).max(20).optional(),
      level: z.string().optional(),
      examType: examTypeEnum.optional(),
      targetLanguage: z.string().nullable().optional(),
      slug: z.string().nullable().optional(),
      isPublicAccess: z.boolean().optional(),
      isGuestAccessible: z.boolean().optional(),
      courseId: z.string().optional(),
      moduleId: z.string().optional(),
      lessonId: z.string().optional(),
      questions: z.array(z.record(z.unknown())).optional(),
    },
    handler: async ({ id, ...rest }) => {
      const data = EditExamSchema.parse(rest)
      const result = await updateExam(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_delete',
    description: 'Elimina un examen permanentemente con sus preguntas y asignaciones.',
    scopes: ['mcp:exams:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteExam(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_assign',
    description:
      'Asigna un examen a uno o varios estudiantes. Si ya existe la asignación, actualiza dueDate e instructions.',
    scopes: ['mcp:exams:write'],
    inputShape: {
      examId: z.string().min(1),
      studentIds: z.array(z.string().min(1)).min(1),
      dueDate: z.string().datetime().optional(),
      instructions: z.string().optional(),
    },
    handler: async (args) => {
      const data = AssignExamSchema.parse(args)
      const result = await assignExamToStudents(data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_attempts_for_grading',
    description:
      'Lista los intentos enviados/completados de un examen que tienen respuestas pendientes de revisión manual.',
    scopes: ['mcp:exams:read'],
    inputShape: { examId: z.string().min(1) },
    handler: async ({ examId }) => {
      const result = await getAttemptsForGrading(examId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_attempt_get',
    description:
      'Obtiene el intento de examen completo con todas sus respuestas (incluye preguntas y feedback).',
    scopes: ['mcp:exams:read'],
    inputShape: { attemptId: z.string().min(1) },
    handler: async ({ attemptId }) => getExamAttemptWithAnswers(attemptId),
  },

  {
    name: 'lingowow_exams_grade_answer',
    description:
      'Califica manualmente una respuesta de examen (típicamente ESSAY o RECORDING). pointsEarned no puede exceder el máximo de la pregunta. reviewerId es el admin/teacher que califica.',
    scopes: ['mcp:exams:write'],
    inputShape: {
      answerId: z.string().min(1),
      pointsEarned: z.number().min(0),
      feedback: z.string().default(''),
      reviewerId: z.string().min(1),
    },
    handler: async ({ answerId, pointsEarned, feedback, reviewerId }) => {
      const result = await gradeExamAnswer(answerId, pointsEarned, feedback, reviewerId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_exams_finalize_review',
    description:
      'Cierra la revisión de un intento de examen, calculando el score total. Idempotente: si ya está finalizado, no afecta.',
    scopes: ['mcp:exams:write'],
    inputShape: { attemptId: z.string().min(1) },
    handler: async ({ attemptId }) => {
      const result = await finalizeExamReview(attemptId)
      return unwrapActionResult(result)
    },
  },
]
