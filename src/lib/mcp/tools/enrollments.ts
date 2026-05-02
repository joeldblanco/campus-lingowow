import { z } from 'zod'
import { EnrollmentStatus } from '@prisma/client'
import {
  activatePendingEnrollments,
  completeExpiredEnrollments,
  createEnrollment,
  deleteEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  getEnrollmentStats,
  syncEnrollmentStatuses,
  updateEnrollment,
} from '@/lib/actions/enrollments'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const enrollmentStatusEnum = z.enum([
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.PENDING,
  EnrollmentStatus.COMPLETED,
  EnrollmentStatus.PAUSED,
  EnrollmentStatus.CANCELLED,
] as const)

export const enrollmentTools: AnyToolModule[] = [
  {
    name: 'lingowow_enrollments_list',
    description: 'Lista todas las inscripciones con detalles. Soporta paginación.',
    scopes: ['mcp:enrollments:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getAllEnrollments()
      return {
        total: all.length,
        limit,
        offset,
        enrollments: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_enrollments_get',
    description: 'Obtiene una inscripción por ID con todos sus detalles.',
    scopes: ['mcp:enrollments:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const enrollment = await getEnrollmentById(id)
      if (!enrollment) {
        throw new Error('Inscripción no encontrada')
      }
      return enrollment
    },
  },

  {
    name: 'lingowow_enrollments_stats',
    description: 'Devuelve estadísticas agregadas de inscripciones (totales por estado).',
    scopes: ['mcp:enrollments:read'],
    handler: async () => getEnrollmentStats(),
  },

  {
    name: 'lingowow_enrollments_create',
    description:
      'Crea una inscripción nueva. Requiere un paypalOrderId válido (la acción verifica la transacción contra PayPal y crea la factura asociada).',
    scopes: ['mcp:enrollments:write'],
    inputShape: {
      studentId: z.string().min(1),
      courseId: z.string().min(1),
      academicPeriodId: z.string().min(1),
      paypalOrderId: z.string().min(1),
    },
    handler: async (args) => {
      const result = await createEnrollment({
        studentId: args.studentId,
        courseId: args.courseId,
        academicPeriodId: args.academicPeriodId,
        paypalOrderId: args.paypalOrderId,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_enrollments_update',
    description: 'Actualiza el estado, progreso, curso o período de una inscripción existente.',
    scopes: ['mcp:enrollments:write'],
    inputShape: {
      id: z.string().min(1),
      status: enrollmentStatusEnum.optional(),
      progress: z.number().min(0).max(100).optional(),
      courseId: z.string().min(1).optional(),
      academicPeriodId: z.string().min(1).optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateEnrollment(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_enrollments_delete',
    description: 'Elimina una inscripción por ID. Operación destructiva.',
    scopes: ['mcp:enrollments:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteEnrollment(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_enrollments_activate_pending',
    description:
      'Activa todas las inscripciones PENDING cuya fecha de inicio del período ya llegó. Idempotente.',
    scopes: ['mcp:enrollments:write'],
    handler: async () => {
      const result = await activatePendingEnrollments()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_enrollments_complete_expired',
    description: 'Marca como COMPLETED las inscripciones cuyo período ya finalizó. Idempotente.',
    scopes: ['mcp:enrollments:write'],
    handler: async () => {
      const result = await completeExpiredEnrollments()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_enrollments_sync_statuses',
    description:
      'Recalcula y sincroniza los estados de todas las inscripciones según las fechas de sus períodos académicos. Idempotente.',
    scopes: ['mcp:enrollments:write'],
    handler: async () => {
      const result = await syncEnrollmentStatuses()
      return unwrapActionResult(result)
    },
  },
]
