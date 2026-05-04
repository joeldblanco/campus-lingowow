import { z } from 'zod'
import { getAvailableTeachers } from '@/lib/actions/teachers'
import {
  getActiveTeachers,
  getPaymentPeriodSummary,
  getProjectedTeacherCostSummary,
  getTeacherPaymentDetails,
  getTeacherPaymentsReport,
} from '@/lib/actions/teacher-payments'
import { toggleClassPayable } from '@/lib/actions/teacher-payments'
import type { AnyToolModule } from '@/lib/mcp/types'
import { unwrapActionResult } from '@/lib/mcp/errors'

const calculationModeEnum = z.enum(['completed-payable', 'scheduled'])

export const teacherTools: AnyToolModule[] = [
  {
    name: 'lingowow_teachers_list_active',
    description: 'Lista todos los profesores con rol TEACHER, su rango y datos de pago.',
    scopes: ['mcp:teachers:read'],
    handler: async () => getActiveTeachers(),
  },

  {
    name: 'lingowow_teachers_list_available',
    description:
      'Lista profesores disponibles con su disponibilidad agrupada por día. Filtros opcionales: courseId, languageId, rango de fechas.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      courseId: z.string().optional(),
      languageId: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    },
    handler: async (args) =>
      getAvailableTeachers({
        courseId: args.courseId,
        languageId: args.languageId,
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        endDate: args.endDate ? new Date(args.endDate) : undefined,
      }),
  },

  {
    name: 'lingowow_teachers_payment_report',
    description:
      'Reporte de pagos a profesores con filtros (rango de fechas, período académico, calculationMode). calculationMode=completed-payable cuenta solo clases completadas y marcadas como pagables; scheduled incluye programadas.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      periodId: z.string().optional(),
      teacherId: z.string().optional(),
      calculationMode: calculationModeEnum.optional().default('completed-payable'),
    },
    handler: async (args) =>
      getTeacherPaymentsReport({
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        endDate: args.endDate ? new Date(args.endDate) : undefined,
        periodId: args.periodId,
        teacherId: args.teacherId,
        calculationMode: args.calculationMode,
      }),
  },

  {
    name: 'lingowow_teachers_payment_period_summary',
    description: 'Devuelve solo el resumen agregado del reporte de pagos (totales, sin desglose por profesor).',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      periodId: z.string().optional(),
    },
    handler: async (args) =>
      getPaymentPeriodSummary(
        args.startDate ? new Date(args.startDate) : undefined,
        args.endDate ? new Date(args.endDate) : undefined,
        args.periodId
      ),
  },

  {
    name: 'lingowow_teachers_projected_cost',
    description:
      'Proyección de costo total a profesores en un rango: incluye pagables ya completados + clases programadas restantes. startDate y endDate son obligatorios.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      teacherId: z.string().optional(),
    },
    handler: async (args) =>
      getProjectedTeacherCostSummary(
        new Date(args.startDate),
        new Date(args.endDate),
        args.teacherId
      ),
  },

  {
    name: 'lingowow_teachers_payment_details',
    description: 'Detalles de pago para un profesor específico en un rango de fechas o período académico.',
    scopes: ['mcp:teachers:read'],
    inputShape: {
      teacherId: z.string().min(1),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      periodId: z.string().optional(),
    },
    handler: async (args) =>
      getTeacherPaymentDetails(
        args.startDate ? new Date(args.startDate) : undefined,
        args.endDate ? new Date(args.endDate) : undefined,
        args.teacherId,
        args.periodId
      ),
  },

  {
    name: 'lingowow_teachers_toggle_class_payable',
    description: 'Marca una clase específica como pagable o no pagable al profesor (afecta el reporte de pagos).',
    scopes: ['mcp:teachers:write'],
    inputShape: {
      classId: z.string().min(1),
      isPayable: z.boolean(),
    },
    handler: async ({ classId, isPayable }) => {
      const result = await toggleClassPayable(classId, isPayable)
      return unwrapActionResult(result)
    },
  },
]
