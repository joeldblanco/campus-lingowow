import { z } from 'zod'
import {
  bulkUpdateTeacherAvailability,
  getDaySchedule,
  getMonthSchedule,
  getTeacherScheduleData,
  getTeacherScheduleForAdmin,
  getWeekSchedule,
  toggleBlockTeacherDay,
  updateTeacherAvailabilitySlot,
} from '@/lib/actions/teacher-schedule'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const dayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

const slotShape = z.object({
  day: dayOfWeekEnum,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  available: z.boolean(),
})

export const teacherAvailabilityTools: AnyToolModule[] = [
  {
    name: 'lingowow_teacher_schedule_get',
    description:
      'Obtiene los datos de horario del profesor autenticado en un rango de fechas (disponibilidad + clases reservadas).',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    },
    handler: async ({ startDate, endDate }) =>
      getTeacherScheduleData(new Date(startDate), new Date(endDate)),
  },

  {
    name: 'lingowow_teacher_schedule_for_admin',
    description: 'Vista admin del horario de un profesor en un rango de fechas con todos los detalles de clases y bookings.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      teacherId: z.string().min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    },
    handler: async ({ teacherId, startDate, endDate }) =>
      getTeacherScheduleForAdmin(teacherId, new Date(startDate), new Date(endDate)),
  },

  {
    name: 'lingowow_teacher_schedule_week',
    description: 'Devuelve el horario de la semana que contiene la fecha indicada (formato ISO).',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      date: z.string().datetime(),
    },
    handler: async ({ date }) => getWeekSchedule(new Date(date)),
  },

  {
    name: 'lingowow_teacher_schedule_month',
    description: 'Devuelve el horario del mes que contiene la fecha indicada.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      date: z.string().datetime(),
    },
    handler: async ({ date }) => getMonthSchedule(new Date(date)),
  },

  {
    name: 'lingowow_teacher_schedule_day',
    description: 'Devuelve el horario del día indicado.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      date: z.string().datetime(),
    },
    handler: async ({ date }) => getDaySchedule(new Date(date)),
  },

  {
    name: 'lingowow_teacher_availability_update_slot',
    description:
      'Activa o desactiva un slot de disponibilidad de un profesor en un día y horario. Si pasas targetTeacherId distinto al dueño de la API key, requiere rol ADMIN.',
    scopes: ['mcp:teachers:write'],
    inputShape: {
      day: dayOfWeekEnum,
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      available: z.boolean(),
      targetTeacherId: z.string().optional(),
    },
    handler: async (args) => {
      const result = await updateTeacherAvailabilitySlot({
        day: args.day,
        startTime: args.startTime,
        endTime: args.endTime,
        available: args.available,
        targetTeacherId: args.targetTeacherId,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_teacher_availability_bulk_update',
    description:
      'Reemplaza la disponibilidad de un profesor para varios días en una sola llamada. Cada slot puede ser available=true (lo crea/mantiene) o false (lo elimina si existía).',
    scopes: ['mcp:teachers:write'],
    inputShape: {
      slots: z.array(slotShape).min(1),
      targetTeacherId: z.string().optional(),
    },
    handler: async ({ slots, targetTeacherId }) => {
      const result = await bulkUpdateTeacherAvailability(slots, { targetTeacherId })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_teacher_blocked_day_toggle',
    description:
      'Bloquea o desbloquea un día específico (YYYY-MM-DD) para un profesor. Útil para vacaciones, ausencias o licencias.',
    scopes: ['mcp:teachers:write'],
    inputShape: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
      blocked: z.boolean(),
      reason: z.string().optional(),
      targetTeacherId: z.string().optional(),
    },
    handler: async (args) => {
      const result = await toggleBlockTeacherDay({
        date: args.date,
        blocked: args.blocked,
        reason: args.reason,
        targetTeacherId: args.targetTeacherId,
      })
      return unwrapActionResult(result)
    },
  },
]
