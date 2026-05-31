import { z } from 'zod'
import { BookingStatus } from '@prisma/client'
import {
  bulkDeleteClasses,
  bulkRescheduleClasses,
  bulkUpdateClasses,
  createClass,
  deleteClass,
  getAllClasses,
  getClassById,
  getClassStats,
  rescheduleClass,
  toggleClassPayable,
  updateClass,
} from '@/lib/actions/classes'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const bookingStatusEnum = z.enum([
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
  BookingStatus.PENDING,
] as const)

export const classTools: AnyToolModule[] = [
  {
    name: 'lingowow_classes_list',
    description:
      'Lista clases con filtros opcionales (rango de fechas, profesor, estudiante, estado, curso, período). Las fechas se interpretan en el timezone indicado (default America/Lima).',
    scopes: ['mcp:classes:read'],
    inputShape: {
      startDate: z.string().optional().describe('YYYY-MM-DD'),
      endDate: z.string().optional().describe('YYYY-MM-DD'),
      teacherId: z.string().optional(),
      studentId: z.string().optional(),
      status: bookingStatusEnum.optional(),
      courseId: z.string().optional(),
      periodId: z.string().optional(),
      timezone: z.string().optional().default('America/Lima'),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset, ...filters }) => {
      const all = await getAllClasses(filters)
      return {
        total: all.length,
        limit,
        offset,
        classes: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_classes_get',
    description: 'Obtiene una clase por ID con todos sus detalles.',
    scopes: ['mcp:classes:read'],
    inputShape: {
      id: z.string().min(1),
      timezone: z.string().optional().default('America/Lima'),
    },
    handler: async ({ id, timezone }) => {
      const cls = await getClassById(id, timezone)
      if (!cls) throw new Error('Clase no encontrada')
      return cls
    },
  },

  {
    name: 'lingowow_classes_stats',
    description: 'Estadísticas agregadas de clases (totales por estado).',
    scopes: ['mcp:classes:read'],
    handler: async () => getClassStats(),
  },

  {
    name: 'lingowow_classes_create',
    description:
      'Crea una clase nueva. `datetime` debe ser ISO local (YYYY-MM-DDTHH:MM) en el timezone indicado. Verifica conflicto de horarios con el profesor.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      enrollmentId: z.string().min(1),
      teacherId: z.string().min(1),
      datetime: z.string().min(1).describe('YYYY-MM-DDTHH:MM en hora local'),
      notes: z.string().optional(),
      timezone: z.string().optional().default('America/Lima'),
    },
    handler: async (args) => {
      const result = await createClass({
        enrollmentId: args.enrollmentId,
        teacherId: args.teacherId,
        datetime: args.datetime,
        notes: args.notes,
        timezone: args.timezone,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_update',
    description:
      'Actualiza una clase. day y timeSlot deben ir juntos cuando se cambia el horario. Verifica conflictos con el profesor.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      id: z.string().min(1),
      studentId: z.string().min(1),
      enrollmentId: z.string().optional(),
      teacherId: z.string().min(1),
      day: z.string().min(1).describe('YYYY-MM-DD'),
      timeSlot: z.string().min(1).describe('HH:MM-HH:MM'),
      notes: z.string().optional(),
      status: bookingStatusEnum.optional(),
      isPayable: z.boolean().optional(),
      timezone: z.string().optional().default('America/Lima'),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateClass(id, {
        studentId: data.studentId,
        teacherId: data.teacherId,
        day: data.day,
        timeSlot: data.timeSlot,
        enrollmentId: data.enrollmentId,
        notes: data.notes,
        status: data.status,
        isPayable: data.isPayable,
        timezone: data.timezone,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_reschedule',
    description: 'Reprograma una clase a una nueva fecha y horario, validando disponibilidad del profesor.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      id: z.string().min(1),
      newDay: z.string().min(1).describe('YYYY-MM-DD'),
      newTimeSlot: z.string().min(1).describe('HH:MM-HH:MM'),
      timezone: z.string().optional().default('America/Lima'),
    },
    handler: async ({ id, newDay, newTimeSlot, timezone }) => {
      const result = await rescheduleClass(id, newDay, newTimeSlot, timezone)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_delete',
    description:
      'Elimina una clase y sus grabaciones asociadas. Operación destructiva e irreversible.',
    scopes: ['mcp:classes:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteClass(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_toggle_payable',
    description: 'Marca una clase como pagable o no pagable al profesor.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classId: z.string().min(1),
      isPayable: z.boolean(),
    },
    handler: async ({ classId, isPayable }) => {
      const result = await toggleClassPayable(classId, isPayable)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_bulk_update',
    description:
      'Actualiza múltiples clases en lote. Útil para marcar como completadas o canceladas en masa.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classIds: z.array(z.string().min(1)).min(1),
      status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
      isPayable: z.boolean().optional(),
      teacherId: z.string().optional(),
    },
    handler: async ({ classIds, ...updateData }) => {
      const result = await bulkUpdateClasses(classIds, updateData)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_bulk_delete',
    description: 'Elimina múltiples clases en lote. Operación destructiva.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classIds: z.array(z.string().min(1)).min(1),
    },
    handler: async ({ classIds }) => {
      const result = await bulkDeleteClasses(classIds)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classes_bulk_reschedule',
    description: 'Reprograma múltiples clases a la misma fecha y horario.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classIds: z.array(z.string().min(1)).min(1),
      newDay: z.string().min(1).describe('YYYY-MM-DD'),
      newTimeSlot: z.string().min(1).describe('HH:MM-HH:MM'),
      timezone: z.string().optional().default('America/Lima'),
    },
    handler: async ({ classIds, newDay, newTimeSlot, timezone }) => {
      const result = await bulkRescheduleClasses(classIds, newDay, newTimeSlot, timezone)
      return unwrapActionResult(result)
    },
  },
]
