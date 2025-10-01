import { Prisma } from '@prisma/client'

// =============================================
// TIPOS GENERADOS POR PRISMA
// =============================================

// Tipo para actividad con contenido relacionado
export type ActivityWithContent = Prisma.ActivityGetPayload<{
  include: {
    content: true
  }
}>

// Tipo para actividad con relaciones completas
export type ActivityWithRelations = Prisma.ActivityGetPayload<{
  include: {
    content: true
    modules: {
      include: {
        module: true
      }
    }
    lessons: {
      include: {
        lesson: true
      }
    }
  }
}>

// Tipo para UserActivity (progreso de usuario) - usar directamente desde Prisma
export type UserActivity = Prisma.UserActivityGetPayload<{
  select: {
    userId: true
    activityId: true
    status: true
    score: true
    answers: true
    attempts: true
    completedAt: true
    lastAttemptAt: true
    assignedBy: true
    assignedAt: true
  }
}>

// Tipo para UserActivity con relaciones
export type UserActivityWithDetails = Prisma.UserActivityGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
      }
    }
    activity: {
      select: {
        id: true
        title: true
        activityType: true
        level: true
        points: true
      }
    }
  }
}>

// Tipo para actualización de UserActivity
export type UserActivityUpdateData = Prisma.UserActivityUpdateInput

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
