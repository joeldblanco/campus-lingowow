import { ActivityStatus, Prisma } from '@prisma/client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const activityWithContent = Prisma.validator<Prisma.ActivityDefaultArgs>()({
  include: {
    content: true,
  },
})

// Tipo para actividad
export type ActivityWithContent = Prisma.ActivityGetPayload<typeof activityWithContent>

// Tipo para el estado de progreso de una actividad
export type UserActivity = {
  userId: string
  activityId: string
  status: ActivityStatus
  score: number | null
  completedAt: Date | null
  lastAttemptAt: Date | null
  attempts: number
  assignedBy: string | null
  assignedAt: Date
}

export type UserActivityUpdateData = {
  status: ActivityStatus
  lastAttemptAt: Date
  attempts: {
    increment: number
  }
  completedAt?: Date
  score?: number
}

// Tipo para paso de instrucción
export type InstructionStep = {
  type: 'instruction'
  content: string
}

// Tipo para paso de pregunta
export type QuestionStep = {
  type: 'question'
  content: string
  options: string[]
  correctAnswer: number
  hint?: string
}

// Tipo para paso de audio
export type AudioStep = {
  type: 'audio'
  content: string
  audioUrl: string
  transcript?: string
}

// Tipo para paso de grabación
export type RecordingStep = {
  type: 'recording'
  content: string
  expectedTranscript?: string
}

// Tipo para paso de completado
export type CompletionStep = {
  type: 'completion'
  content: string
}

// Unión de todos los tipos de pasos
export type ActivityStep =
  | InstructionStep
  | QuestionStep
  | AudioStep
  | RecordingStep
  | CompletionStep

// Tipo para el contenido completo de una actividad
export type ActivityContent = {
  steps: ActivityStep[]
}
