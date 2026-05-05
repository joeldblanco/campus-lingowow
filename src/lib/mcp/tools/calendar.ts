import { z } from 'zod'
import {
  cancelBooking,
  getCalendarSettings,
  getStudentBookings,
  getTeacherAvailability,
  getTeacherBookings,
  getTeacherSchedules,
  updateCalendarSettings,
} from '@/lib/actions/calendar'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const calendarTools: AnyToolModule[] = [
  {
    name: 'lingowow_calendar_settings_get',
    description:
      'Devuelve la configuración global del calendario (slotDuration, startHour, endHour, maxBookingsPerStudent). La crea con defaults si no existe.',
    scopes: ['mcp:calendar:read'],
    handler: async () => {
      const result = await getCalendarSettings()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_calendar_settings_update',
    description:
      'Actualiza la configuración global del calendario. startHour y endHour en escala de 24h (puede ser decimal: 8 = 08:00, 16.5 = 16:30). endHour debe ser > startHour.',
    scopes: ['mcp:calendar:write'],
    inputShape: {
      startHour: z.number().min(0).max(24),
      endHour: z.number().min(0).max(24),
    },
    handler: async ({ startHour, endHour }) => {
      const result = await updateCalendarSettings({ startHour, endHour })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_calendar_teacher_availability',
    description: 'Devuelve la disponibilidad publicada de un profesor.',
    scopes: ['mcp:calendar:read'],
    inputShape: { teacherId: z.string().min(1) },
    handler: async ({ teacherId }) => {
      const result = await getTeacherAvailability(teacherId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_calendar_teacher_schedules',
    description:
      'Lista los horarios programados (ClassSchedule) de un profesor. Si se omite teacherId, usa el dueño de la API key.',
    scopes: ['mcp:calendar:read'],
    inputShape: {
      teacherId: z.string().optional(),
    },
    handler: async ({ teacherId }) => getTeacherSchedules(teacherId),
  },

  {
    name: 'lingowow_calendar_student_bookings',
    description: 'Lista las reservas de clases del estudiante autenticado (vía la API key).',
    scopes: ['mcp:calendar:read'],
    handler: async () => getStudentBookings(),
  },

  {
    name: 'lingowow_calendar_teacher_bookings',
    description: 'Lista las reservas de clases del profesor autenticado (vía la API key).',
    scopes: ['mcp:calendar:read'],
    handler: async () => getTeacherBookings(),
  },

  {
    name: 'lingowow_calendar_cancel_booking',
    description: 'Cancela una reserva de clase por ID.',
    scopes: ['mcp:calendar:write'],
    inputShape: { bookingId: z.string().min(1) },
    handler: async ({ bookingId }) => {
      const result = await cancelBooking(bookingId)
      return unwrapActionResult(result)
    },
  },
]
