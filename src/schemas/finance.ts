import * as z from 'zod'

export const financialReportBasisOptions = ['cash', 'accrual'] as const
export const financialMovementDirectionOptions = ['INCOME', 'EXPENSE'] as const
export const financialMovementStatusOptions = ['DRAFT', 'POSTED', 'VOID'] as const

export const financeManualCategories = [
  'Herramientas',
  'Marketing',
  'Servicios',
  'Nomina',
  'Impuestos',
  'Ajustes',
  'Reembolsos',
  'Otros',
] as const

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

const optionalDate = z
  .union([z.coerce.date(), z.null(), z.undefined()])
  .transform((value) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value : undefined))

export const createFinancialMovementSchema = z.object({
  direction: z.enum(financialMovementDirectionOptions),
  category: z.string().trim().min(1, 'La categoría es obligatoria'),
  subcategory: optionalString,
  description: z.string().trim().min(3, 'La descripción es obligatoria').max(255),
  providerName: optionalString,
  amount: z.coerce.number().positive('El monto debe ser mayor a cero'),
  currency: z.string().trim().min(3).max(8).default('USD'),
  baseCurrency: z.string().trim().min(3).max(8).default('USD'),
  baseAmount: z.coerce.number().positive().optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  accrualDate: z.coerce.date(),
  cashDate: optionalDate,
  notes: z.string().trim().max(2000).optional(),
  proofUrl: z
    .union([z.string().trim().url('El comprobante debe ser una URL válida'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: z.enum(financialMovementStatusOptions).default('POSTED'),
})

export const financeReportFilterSchema = z.object({
  basis: z.enum(financialReportBasisOptions).default('cash'),
  startDate: optionalDate,
  endDate: optionalDate,
  direction: z.enum([...financialMovementDirectionOptions, 'ALL'] as const).default('ALL'),
  sourceType: z.string().trim().optional(),
  category: optionalString,
  search: optionalString,
  includeDrafts: z.boolean().optional().default(false),
})

export type CreateFinancialMovementInput = z.infer<typeof createFinancialMovementSchema>
export type FinanceReportFilterInput = z.infer<typeof financeReportFilterSchema>