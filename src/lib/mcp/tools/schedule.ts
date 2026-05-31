import { z } from 'zod'
import {
  bookScheduleSlot,
  cancelScheduleSlot,
  createScheduleSlots,
  getAvailableSlots,
  getUserBookedSlots,
} from '@/lib/actions/schedule'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const scheduleTools: AnyToolModule[] = [
  {
    name: 'lingowow_schedule_slots_available',
    description:
      'Lista slots de horario disponibles (no reservados) para un producto, opcionalmente filtrados por rango de fechas.',
    scopes: ['mcp:products:read'],
    inputShape: {
      productId: z.string().min(1),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    },
    handler: async ({ productId, startDate, endDate }) =>
      getAvailableSlots(
        productId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      ),
  },

  {
    name: 'lingowow_schedule_user_booked_slots',
    description: 'Lista los slots de horario reservados por un usuario específico.',
    scopes: ['mcp:products:read'],
    inputShape: { userId: z.string().min(1) },
    handler: async ({ userId }) => getUserBookedSlots(userId),
  },

  {
    name: 'lingowow_schedule_slots_create',
    description:
      'Crea slots de horario en lote para un producto. dates es un array de timestamps ISO. Idempotente: skipDuplicates en la BD.',
    scopes: ['mcp:products:write'],
    inputShape: {
      productId: z.string().min(1),
      dates: z.array(z.string().datetime()).min(1),
    },
    handler: async ({ productId, dates }) => {
      const result = await createScheduleSlots(
        productId,
        (dates as string[]).map((d) => new Date(d))
      )
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_schedule_slot_book',
    description: 'Reserva un slot de horario para un usuario. Falla si el slot ya está reservado.',
    scopes: ['mcp:products:write'],
    inputShape: {
      slotId: z.string().min(1),
      userId: z.string().min(1),
    },
    handler: async ({ slotId, userId }) => {
      const result = await bookScheduleSlot(slotId, userId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_schedule_slot_cancel',
    description: 'Cancela la reserva de un slot. El userId debe coincidir con el dueño actual del slot.',
    scopes: ['mcp:products:write'],
    inputShape: {
      slotId: z.string().min(1),
      userId: z.string().min(1),
    },
    handler: async ({ slotId, userId }) => {
      const result = await cancelScheduleSlot(slotId, userId)
      return unwrapActionResult(result)
    },
  },
]
