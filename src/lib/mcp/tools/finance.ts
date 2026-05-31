import { z } from 'zod'
import { ConfirmationStatus } from '@prisma/client'
import {
  createFinancialMovement,
  getFinancialRecurringRules,
  getFinancialReport,
  updateFinancialMovementAmount,
  upsertFinancialRecurringRule,
} from '@/lib/actions/finance'
import {
  getPaymentConfirmationById,
  getPaymentConfirmations,
  updatePaymentConfirmationStatus,
} from '@/lib/actions/payment-confirmations'
import {
  createFinancialMovementSchema,
  upsertFinancialRecurringRuleSchema,
  updateFinancialMovementAmountSchema,
} from '@/schemas/finance'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const confirmationStatusEnum = z.enum([
  ConfirmationStatus.PENDING,
  ConfirmationStatus.APPROVED,
  ConfirmationStatus.REJECTED,
] as const)

export const financeTools: AnyToolModule[] = [
  {
    name: 'lingowow_finance_report',
    description:
      'Genera el reporte financiero (cash o accrual) con filtros opcionales: período académico, rango de fechas, dirección, categoría, búsqueda. Limita el rango para evitar timeouts.',
    scopes: ['mcp:finance:read'],
    inputShape: {
      basis: z.enum(['cash', 'accrual']).default('cash'),
      periodId: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      direction: z.enum(['INCOME', 'EXPENSE', 'ALL']).default('ALL'),
      category: z.string().optional(),
      search: z.string().optional(),
      includeDrafts: z.boolean().default(false),
    },
    handler: async (args) => {
      const result = await getFinancialReport({
        basis: args.basis,
        periodId: args.periodId,
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        endDate: args.endDate ? new Date(args.endDate) : undefined,
        direction: args.direction,
        category: args.category,
        search: args.search,
        includeDrafts: args.includeDrafts,
      })
      return result
    },
  },

  {
    name: 'lingowow_finance_recurring_list',
    description: 'Lista todas las reglas financieras recurrentes con su monto del mes actual.',
    scopes: ['mcp:finance:read'],
    handler: async () => getFinancialRecurringRules(),
  },

  {
    name: 'lingowow_finance_movement_create',
    description:
      'Crea un movimiento financiero manual (ingreso o egreso). No idempotente: cada llamada genera un movimiento nuevo.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      direction: z.enum(['INCOME', 'EXPENSE']),
      category: z.string().min(1),
      subcategory: z.string().optional(),
      sourceId: z.string().optional(),
      description: z.string().min(3).max(255),
      providerName: z.string().optional(),
      amount: z.number().positive(),
      currency: z.string().min(3).max(8).default('USD'),
      baseCurrency: z.string().min(3).max(8).default('USD'),
      baseAmount: z.number().positive().optional(),
      discountAmount: z.number().min(0).default(0),
      accrualDate: z.string().datetime(),
      cashDate: z.string().datetime().optional(),
      notes: z.string().max(2000).optional(),
      proofUrl: z.string().url().optional(),
      recurrence: z.enum(['ONE_TIME', 'MONTHLY', 'ANNUAL']).default('ONE_TIME'),
      status: z.enum(['DRAFT', 'POSTED', 'VOID']).default('POSTED'),
    },
    handler: async (args) => {
      const parsed = createFinancialMovementSchema.parse({
        ...args,
        accrualDate: new Date(args.accrualDate),
        cashDate: args.cashDate ? new Date(args.cashDate) : undefined,
      })
      const result = await createFinancialMovement(parsed)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_finance_movement_update_amount',
    description: 'Actualiza el monto de un movimiento financiero existente y registra una nota opcional.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      movementId: z.string().min(1),
      amount: z.number().positive(),
      notes: z.string().max(2000).optional(),
    },
    handler: async (args) => {
      const parsed = updateFinancialMovementAmountSchema.parse(args)
      const result = await updateFinancialMovementAmount(parsed)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_finance_recurring_upsert',
    description:
      'Crea o actualiza una regla financiera recurrente (ingreso/egreso fijo o porcentual). Si pasas id, actualiza; si no, crea.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      id: z.string().optional(),
      name: z.string().min(3).max(120),
      direction: z.enum(['INCOME', 'EXPENSE']),
      category: z.string().min(1).max(120),
      subcategory: z.string().optional(),
      ruleType: z.enum(['FIXED_AMOUNT', 'INCOME_PERCENTAGE', 'PROFIT_PERCENTAGE']).default('FIXED_AMOUNT'),
      recurrence: z.enum(['MONTHLY', 'ANNUAL']),
      amount: z.number().positive(),
      currency: z.string().min(3).max(8).default('USD'),
      notes: z.string().max(2000).optional(),
      isActive: z.boolean().default(true),
    },
    handler: async (args) => {
      const parsed = upsertFinancialRecurringRuleSchema.parse(args)
      const result = await upsertFinancialRecurringRule(parsed)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_payments_list',
    description:
      'Lista confirmaciones de pago a profesores. Filtros opcionales por teacherId, status y rango de fechas.',
    scopes: ['mcp:finance:read'],
    inputShape: {
      teacherId: z.string().optional(),
      periodStart: z.string().datetime().optional(),
      periodEnd: z.string().datetime().optional(),
      status: confirmationStatusEnum.optional(),
    },
    handler: async (args) =>
      getPaymentConfirmations({
        teacherId: args.teacherId,
        periodStart: args.periodStart ? new Date(args.periodStart) : undefined,
        periodEnd: args.periodEnd ? new Date(args.periodEnd) : undefined,
        status: args.status,
      }),
  },

  {
    name: 'lingowow_payments_get',
    description: 'Obtiene una confirmación de pago a profesor por ID.',
    scopes: ['mcp:finance:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await getPaymentConfirmationById(id)
      if (!result) throw new Error('Confirmación de pago no encontrada')
      return result
    },
  },

  {
    name: 'lingowow_payments_update_status',
    description: 'Actualiza el estado (PENDING, APPROVED, REJECTED) de una confirmación de pago.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      id: z.string().min(1),
      status: confirmationStatusEnum,
      notes: z.string().max(2000).optional(),
    },
    handler: async ({ id, status, notes }) => {
      const result = await updatePaymentConfirmationStatus(id, status, notes)
      return unwrapActionResult(result)
    },
  },
]
