// /schemas/activity.ts
import * as z from 'zod'
import { ActivityType, ActivityStatus } from '@prisma/client'

// Esquema para los diferentes tipos de pasos
const instructionStepSchema = z.object({
  type: z.literal('instruction'),
  content: z.string().min(1, { message: 'El contenido no puede estar vacío' }),
})

const questionStepSchema = z.object({
  type: z.literal('question'),
  content: z.string().min(1, { message: 'La pregunta no puede estar vacía' }),
  options: z.array(z.string()).min(2, { message: 'Debe haber al menos 2 opciones' }),
  correctAnswer: z.number().min(0, { message: 'Debe seleccionar una respuesta correcta' }),
  hint: z.string().optional(),
})

const audioStepSchema = z.object({
  type: z.literal('audio'),
  content: z.string().min(1, { message: 'El contenido no puede estar vacío' }),
  audioUrl: z.string().optional(), // URL opcional para permitir guardar sin audio aún
  transcript: z.string().optional(),
})

const recordingStepSchema = z.object({
  type: z.literal('recording'),
  content: z.string().min(1, { message: 'El contenido no puede estar vacío' }),
  expectedTranscript: z.string().optional(),
})

const completionStepSchema = z.object({
  type: z.literal('completion'),
  content: z.string().min(1, { message: 'El contenido no puede estar vacío' }),
})

// Unión de esquemas de pasos
export const activityStepSchema = z.discriminatedUnion('type', [
  instructionStepSchema,
  questionStepSchema,
  audioStepSchema,
  recordingStepSchema,
  completionStepSchema,
])

// Esquema para el contenido de la actividad
export const activityContentSchema = z.object({
  steps: z.array(activityStepSchema).min(1, { message: 'Debes añadir al menos un paso' }),
})

// Esquema completo para la actividad
export const activityFormSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'El título debe tener al menos 3 caracteres' })
    .max(100, { message: 'El título no puede exceder los 100 caracteres' }),
  description: z
    .string()
    .min(10, { message: 'La descripción debe tener al menos 10 caracteres' })
    .max(500, { message: 'La descripción no puede exceder los 500 caracteres' }),
  type: z.nativeEnum(ActivityType, {
    required_error: 'Debes seleccionar un tipo de actividad',
  }),
  level: z
    .number()
    .min(1, { message: 'El nivel mínimo es 1' })
    .max(10, { message: 'El nivel máximo es 10' }),
  points: z
    .number()
    .min(1, { message: 'La actividad debe otorgar al menos 1 punto' })
    .max(100, { message: 'La actividad no puede otorgar más de 100 puntos' }),
  duration: z
    .number()
    .min(1, { message: 'La duración mínima es 1 minuto' })
    .max(60, { message: 'La duración máxima es 60 minutos' }),
  content: activityContentSchema,
  createdBy: z.string(),
  isPublished: z.boolean().default(false),
})

// Esquema para el progreso del usuario
export const userActivitySchema = z.object({
  userId: z.string(),
  activityId: z.string(),
  status: z.nativeEnum(ActivityStatus),
  score: z.number().nullable(),
  completedAt: z.date().nullable(),
  lastAttemptAt: z.date().nullable(),
  attempts: z.number().min(0),
  assignedBy: z.string().nullable(),
  assignedAt: z.date(),
})

export type ActivityFormValues = z.infer<typeof activityFormSchema>
export type UserActivityInput = z.infer<typeof userActivitySchema>
