import { z } from 'zod'
import { ActivityType } from '@prisma/client'
import {
  assignActivityToUser,
  createActivity,
  deleteActivity,
  getActivities,
  getActivitiesByLevel,
  getActivity,
  getStudentsForActivity,
  updateActivity,
} from '@/lib/actions/activity'
import type { AnyToolModule } from '@/lib/mcp/types'
import { unwrapActionResult } from '@/lib/mcp/errors'

const activityTypeEnum = z.nativeEnum(ActivityType)

const activityStepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('instruction'), content: z.string().min(1) }),
  z.object({
    type: z.literal('question'),
    content: z.string().min(1),
    options: z.array(z.string()).min(2),
    correctAnswer: z.number().int().min(0),
    hint: z.string().optional(),
  }),
  z.object({
    type: z.literal('audio'),
    content: z.string().min(1),
    audioUrl: z.string().optional(),
    transcript: z.string().optional(),
  }),
  z.object({
    type: z.literal('recording'),
    content: z.string().min(1),
    expectedTranscript: z.string().optional(),
  }),
  z.object({ type: z.literal('completion'), content: z.string().min(1) }),
])

const activityContentSchema = z.object({
  steps: z.array(activityStepSchema).min(1),
})

export const activityTools: AnyToolModule[] = [
  {
    name: 'lingowow_activities_list',
    description: 'Lista todas las actividades reutilizables del campus.',
    scopes: ['mcp:activities:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getActivities()
      return {
        total: all.length,
        limit,
        offset,
        activities: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_activities_get',
    description: 'Obtiene una actividad por ID con todo su contenido (steps, options).',
    scopes: ['mcp:activities:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => getActivity(id),
  },

  {
    name: 'lingowow_activities_by_level',
    description: 'Lista actividades de un nivel específico (1-10). userId opcional para incluir progreso del usuario.',
    scopes: ['mcp:activities:read'],
    inputShape: {
      level: z.number().int().min(1).max(10),
      userId: z.string().optional(),
    },
    handler: async ({ level, userId }) => getActivitiesByLevel(level, userId),
  },

  {
    name: 'lingowow_activities_students',
    description: 'Lista los estudiantes que tienen una actividad asignada.',
    scopes: ['mcp:activities:read'],
    inputShape: { activityId: z.string().min(1) },
    handler: async ({ activityId }) => getStudentsForActivity(activityId),
  },

  {
    name: 'lingowow_activities_create',
    description:
      'Crea una actividad reutilizable. content.steps soporta tipos: instruction, question (con options/correctAnswer), audio, recording, completion.',
    scopes: ['mcp:activities:write'],
    inputShape: {
      title: z.string().min(3).max(100),
      description: z.string().min(10).max(500),
      type: activityTypeEnum,
      level: z.number().int().min(1).max(10),
      points: z.number().int().min(1).max(100),
      duration: z.number().int().min(1).max(60),
      content: activityContentSchema,
      createdBy: z.string().min(1),
      isPublished: z.boolean().default(false),
    },
    handler: async (args) => {
      const created = await createActivity({
        title: args.title,
        description: args.description,
        type: args.type,
        level: args.level,
        points: args.points,
        duration: args.duration,
        content: args.content,
        createdBy: args.createdBy,
        isPublished: args.isPublished,
      })
      return created
    },
  },

  {
    name: 'lingowow_activities_update',
    description: 'Actualiza una actividad existente. Acepta los mismos campos que create.',
    scopes: ['mcp:activities:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(3).max(100),
      description: z.string().min(10).max(500),
      type: activityTypeEnum,
      level: z.number().int().min(1).max(10),
      points: z.number().int().min(1).max(100),
      duration: z.number().int().min(1).max(60),
      content: activityContentSchema,
      createdBy: z.string().min(1),
      isPublished: z.boolean().default(false),
    },
    handler: async ({ id, ...args }) => {
      const updated = await updateActivity(id, {
        title: args.title,
        description: args.description,
        type: args.type,
        level: args.level,
        points: args.points,
        duration: args.duration,
        content: args.content,
        createdBy: args.createdBy,
        isPublished: args.isPublished,
      })
      return updated
    },
  },

  {
    name: 'lingowow_activities_delete',
    description: 'Elimina una actividad permanentemente.',
    scopes: ['mcp:activities:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => deleteActivity(id),
  },

  {
    name: 'lingowow_activities_assign',
    description: 'Asigna una actividad a un estudiante. assignedBy debe ser el ID del admin/teacher que la asigna.',
    scopes: ['mcp:activities:write'],
    inputShape: {
      userId: z.string().min(1),
      activityId: z.string().min(1),
      assignedBy: z.string().min(1),
    },
    handler: async ({ userId, activityId, assignedBy }) => {
      const result = await assignActivityToUser(userId, activityId, assignedBy)
      return unwrapActionResult(result)
    },
  },
]
