'use server'

import { auth } from '@/auth'
import { getTeacherPaymentsReport } from '@/lib/actions/teacher-payments'
import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import {
  createFinancialMovementSchema,
  financeReportFilterSchema,
  type FinanceReportFilterInput,
} from '@/schemas/finance'
import {
  ConfirmationStatus,
  FinancialMovementDirection,
  FinancialMovementSourceType,
  FinancialMovementStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client'
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export interface FinancialReportFilters {
  basis?: 'cash' | 'accrual'
  startDate?: Date
  endDate?: Date
  direction?: FinancialMovementDirection | 'ALL'
  sourceType?: FinancialMovementSourceType | 'ALL'
  category?: string
  search?: string
  includeDrafts?: boolean
}

export interface FinancialReportRow {
  id: string
  sourceType: FinancialMovementSourceType
  sourceId: string | null
  direction: FinancialMovementDirection
  status: string
  category: string
  subcategory: string | null
  description: string
  counterparty: string | null
  amount: number
  discountAmount: number
  netAmount: number
  currency: string
  baseAmount: number
  accrualDate: string
  cashDate: string | null
  effectiveDate: string
  notes: string | null
  isManual: boolean
}

export interface FinancialReportSummary {
  basis: 'cash' | 'accrual'
  totalIncome: number
  totalExpenses: number
  netIncome: number
  totalDiscounts: number
  totalRefunds: number
  invoiceIncome: number
  teacherExpenses: number
  incentiveExpenses: number
  manualIncome: number
  manualExpenses: number
  movementCount: number
}

export interface FinancialReportResult {
  rows: FinancialReportRow[]
  summary: FinancialReportSummary
  filters: {
    basis: 'cash' | 'accrual'
    startDate: string
    endDate: string
    direction: FinancialMovementDirection | 'ALL'
    sourceType: FinancialMovementSourceType | 'ALL'
    category: string | null
    search: string | null
    includeDrafts: boolean
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function getDateRange(filters: FinanceReportFilterInput) {
  const now = new Date()
  const start = filters.startDate ? startOfDay(filters.startDate) : startOfMonth(now)
  const end = filters.endDate ? endOfDay(filters.endDate) : endOfMonth(now)

  return { start, end }
}

async function ensureAdminUser() {
  const session = await auth()

  if (!session?.user?.id || !session.user.roles?.includes('ADMIN')) {
    throw new Error('Solo los administradores pueden gestionar finanzas')
  }

  return session.user
}

function getFullName(name?: string | null, lastName?: string | null, fallback?: string | null) {
  const fullName = `${name || ''} ${lastName || ''}`.trim()
  return fullName || fallback || null
}

async function getInvoiceRows(start: Date, end: Date, basis: 'cash' | 'accrual') {
  const where: Prisma.InvoiceWhereInput =
    basis === 'cash'
      ? {
          status: InvoiceStatus.PAID,
          paidAt: {
            gte: start,
            lte: end,
          },
        }
      : {
          status: {
            in: [InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.OVERDUE],
          },
          createdAt: {
            gte: start,
            lte: end,
          },
        }

  const invoices = await db.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      currency: true,
      status: true,
      createdAt: true,
      paidAt: true,
      user: {
        select: {
          name: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return invoices.map<FinancialReportRow>((invoice) => ({
    id: `invoice-${invoice.id}`,
    sourceType: FinancialMovementSourceType.INVOICE,
    sourceId: invoice.id,
    direction: FinancialMovementDirection.INCOME,
    status: invoice.status,
    category: 'Facturacion',
    subcategory: invoice.discount > 0 ? 'Con descuento' : null,
    description: `Factura ${invoice.invoiceNumber}`,
    counterparty: getFullName(invoice.user.name, invoice.user.lastName, invoice.user.email),
    amount: roundCurrency(invoice.subtotal + invoice.tax),
    discountAmount: roundCurrency(invoice.discount),
    netAmount: roundCurrency(invoice.total),
    currency: invoice.currency,
    baseAmount: roundCurrency(invoice.total),
    accrualDate: invoice.createdAt.toISOString(),
    cashDate: invoice.paidAt?.toISOString() || null,
    effectiveDate: (basis === 'cash' ? invoice.paidAt : invoice.createdAt)?.toISOString() || invoice.createdAt.toISOString(),
    notes: null,
    isManual: false,
  }))
}

async function getManualMovementRows(
  start: Date,
  end: Date,
  basis: 'cash' | 'accrual',
  filters: FinanceReportFilterInput
) {
  const where: Prisma.FinancialMovementWhereInput = {
    status: filters.includeDrafts
      ? {
          in: [FinancialMovementStatus.DRAFT, FinancialMovementStatus.POSTED],
        }
      : FinancialMovementStatus.POSTED,
    ...(filters.direction !== 'ALL' ? { direction: filters.direction } : {}),
  }

  if (basis === 'cash') {
    where.cashDate = {
      gte: start,
      lte: end,
    }
  } else {
    where.accrualDate = {
      gte: start,
      lte: end,
    }
  }

  const movements = await db.financialMovement.findMany({
    where,
    orderBy: {
      accrualDate: 'desc',
    },
  })

  return movements.map<FinancialReportRow>((movement) => ({
    id: movement.id,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId || null,
    direction: movement.direction,
    status: movement.status,
    category: movement.category,
    subcategory: movement.subcategory,
    description: movement.description,
    counterparty: movement.providerName || null,
    amount: roundCurrency(movement.amount),
    discountAmount: roundCurrency(movement.discountAmount),
    netAmount: roundCurrency(movement.netAmount),
    currency: movement.currency,
    baseAmount: roundCurrency(movement.baseAmount),
    accrualDate: movement.accrualDate.toISOString(),
    cashDate: movement.cashDate?.toISOString() || null,
    effectiveDate:
      basis === 'cash'
        ? movement.cashDate?.toISOString() || movement.accrualDate.toISOString()
        : movement.accrualDate.toISOString(),
    notes: movement.notes,
    isManual: movement.sourceType === FinancialMovementSourceType.MANUAL,
  }))
}

async function getTeacherPaymentConfirmationRows(start: Date, end: Date) {
  const confirmations = await db.teacherPaymentConfirmation.findMany({
    where: {
      status: {
        in: [ConfirmationStatus.PENDING, ConfirmationStatus.APPROVED],
      },
      confirmedAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      amount: true,
      confirmedAt: true,
      periodStart: true,
      periodEnd: true,
      notes: true,
      status: true,
      teacher: {
        select: {
          name: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      confirmedAt: 'desc',
    },
  })

  return confirmations.map<FinancialReportRow>((confirmation) => ({
    id: `teacher-payment-${confirmation.id}`,
    sourceType: FinancialMovementSourceType.TEACHER_PAYMENT_CONFIRMATION,
    sourceId: confirmation.id,
    direction: FinancialMovementDirection.EXPENSE,
    status: confirmation.status,
    category: 'Pagos a docentes',
    subcategory: 'Caja real',
    description: `Pago confirmado a ${getFullName(confirmation.teacher.name, confirmation.teacher.lastName, confirmation.teacher.email) || 'docente'}`,
    counterparty: getFullName(
      confirmation.teacher.name,
      confirmation.teacher.lastName,
      confirmation.teacher.email
    ),
    amount: roundCurrency(confirmation.amount),
    discountAmount: 0,
    netAmount: roundCurrency(confirmation.amount),
    currency: 'USD',
    baseAmount: roundCurrency(confirmation.amount),
    accrualDate: confirmation.periodEnd.toISOString(),
    cashDate: confirmation.confirmedAt.toISOString(),
    effectiveDate: confirmation.confirmedAt.toISOString(),
    notes: confirmation.notes,
    isManual: false,
  }))
}

async function getTeacherPayableRows(start: Date, end: Date) {
  const report = await getTeacherPaymentsReport({
    startDate: start,
    endDate: end,
  })

  return report.teacherReports
    .filter((teacher) => teacher.totalPayment > 0)
    .map<FinancialReportRow>((teacher) => ({
      id: `teacher-payable-${teacher.teacherId}-${start.toISOString()}-${end.toISOString()}`,
      sourceType: FinancialMovementSourceType.TEACHER_PAYABLE,
      sourceId: teacher.teacherId,
      direction: FinancialMovementDirection.EXPENSE,
      status: teacher.paymentConfirmed ? 'CONFIRMED' : 'CALCULATED',
      category: 'Pagos a docentes',
      subcategory: 'Devengado',
      description: `Pago devengado por clases de ${teacher.teacherName}`,
      counterparty: teacher.teacherName,
      amount: roundCurrency(teacher.totalPayment),
      discountAmount: 0,
      netAmount: roundCurrency(teacher.totalPayment),
      currency: 'USD',
      baseAmount: roundCurrency(teacher.totalPayment),
      accrualDate: end.toISOString(),
      cashDate: teacher.paymentConfirmedAt?.toISOString() || null,
      effectiveDate: end.toISOString(),
      notes: null,
      isManual: false,
    }))
}

async function getTeacherIncentiveRows(start: Date, end: Date, basis: 'cash' | 'accrual') {
  const incentives = await db.teacherIncentive.findMany({
    where:
      basis === 'cash'
        ? {
            paid: true,
            paidAt: {
              gte: start,
              lte: end,
            },
          }
        : {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
    select: {
      id: true,
      type: true,
      bonusAmount: true,
      paid: true,
      paidAt: true,
      createdAt: true,
      teacher: {
        select: {
          name: true,
          lastName: true,
          email: true,
        },
      },
      period: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return incentives.map<FinancialReportRow>((incentive) => ({
    id: `teacher-incentive-${incentive.id}`,
    sourceType: FinancialMovementSourceType.TEACHER_INCENTIVE,
    sourceId: incentive.id,
    direction: FinancialMovementDirection.EXPENSE,
    status: incentive.paid ? 'PAID' : 'ACCRUED',
    category: 'Incentivos docentes',
    subcategory: incentive.period.name,
    description: `Incentivo ${incentive.type.toLowerCase()} para ${getFullName(incentive.teacher.name, incentive.teacher.lastName, incentive.teacher.email) || 'docente'}`,
    counterparty: getFullName(incentive.teacher.name, incentive.teacher.lastName, incentive.teacher.email),
    amount: roundCurrency(incentive.bonusAmount),
    discountAmount: 0,
    netAmount: roundCurrency(incentive.bonusAmount),
    currency: 'USD',
    baseAmount: roundCurrency(incentive.bonusAmount),
    accrualDate: incentive.createdAt.toISOString(),
    cashDate: incentive.paidAt?.toISOString() || null,
    effectiveDate:
      basis === 'cash'
        ? incentive.paidAt?.toISOString() || incentive.createdAt.toISOString()
        : incentive.createdAt.toISOString(),
    notes: null,
    isManual: false,
  }))
}

function applyClientFilters(rows: FinancialReportRow[], filters: FinanceReportFilterInput) {
  return rows.filter((row) => {
    if (filters.direction !== 'ALL' && row.direction !== filters.direction) {
      return false
    }

    if (filters.sourceType && filters.sourceType !== 'ALL' && row.sourceType !== filters.sourceType) {
      return false
    }

    if (filters.category && row.category !== filters.category) {
      return false
    }

    if (filters.search) {
      const haystack = `${row.description} ${row.counterparty || ''} ${row.category} ${row.notes || ''}`.toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) {
        return false
      }
    }

    return true
  })
}

function buildSummary(rows: FinancialReportRow[], basis: 'cash' | 'accrual'): FinancialReportSummary {
  const incomeRows = rows.filter((row) => row.direction === FinancialMovementDirection.INCOME)
  const expenseRows = rows.filter((row) => row.direction === FinancialMovementDirection.EXPENSE)

  const totalIncome = roundCurrency(incomeRows.reduce((sum, row) => sum + row.netAmount, 0))
  const totalExpenses = roundCurrency(expenseRows.reduce((sum, row) => sum + row.netAmount, 0))

  return {
    basis,
    totalIncome,
    totalExpenses,
    netIncome: roundCurrency(totalIncome - totalExpenses),
    totalDiscounts: roundCurrency(rows.reduce((sum, row) => sum + row.discountAmount, 0)),
    totalRefunds: roundCurrency(
      rows
        .filter((row) => row.sourceType === FinancialMovementSourceType.REFUND)
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    invoiceIncome: roundCurrency(
      incomeRows
        .filter((row) => row.sourceType === FinancialMovementSourceType.INVOICE)
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    teacherExpenses: roundCurrency(
      expenseRows
        .filter(
          (row) =>
            row.sourceType === FinancialMovementSourceType.TEACHER_PAYABLE ||
            row.sourceType === FinancialMovementSourceType.TEACHER_PAYMENT_CONFIRMATION
        )
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    incentiveExpenses: roundCurrency(
      expenseRows
        .filter((row) => row.sourceType === FinancialMovementSourceType.TEACHER_INCENTIVE)
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    manualIncome: roundCurrency(
      incomeRows
        .filter((row) => row.isManual)
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    manualExpenses: roundCurrency(
      expenseRows
        .filter((row) => row.isManual)
        .reduce((sum, row) => sum + row.netAmount, 0)
    ),
    movementCount: rows.length,
  }
}

export async function getFinancialReport(
  rawFilters: FinancialReportFilters = {}
): Promise<FinancialReportResult> {
  await ensureAdminUser()

  const parsedFilters = financeReportFilterSchema.parse({
    basis: rawFilters.basis,
    startDate: rawFilters.startDate,
    endDate: rawFilters.endDate,
    direction: rawFilters.direction || 'ALL',
    sourceType: rawFilters.sourceType || 'ALL',
    category: rawFilters.category,
    search: rawFilters.search,
    includeDrafts: rawFilters.includeDrafts,
  })

  const { start, end } = getDateRange(parsedFilters)
  const basis = parsedFilters.basis

  const [invoiceRows, manualRows, teacherRows, incentiveRows] =
    basis === 'cash'
      ? await Promise.all([
          getInvoiceRows(start, end, basis),
          getManualMovementRows(start, end, basis, parsedFilters),
          getTeacherPaymentConfirmationRows(start, end),
          getTeacherIncentiveRows(start, end, basis),
        ])
      : await Promise.all([
          getInvoiceRows(start, end, basis),
          getManualMovementRows(start, end, basis, parsedFilters),
          getTeacherPayableRows(start, end),
          getTeacherIncentiveRows(start, end, basis),
        ])

  const rows = applyClientFilters(
    [...invoiceRows, ...manualRows, ...teacherRows, ...incentiveRows].sort(
      (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    ),
    parsedFilters
  )

  return {
    rows,
    summary: buildSummary(rows, basis),
    filters: {
      basis,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      direction: parsedFilters.direction,
      sourceType: (parsedFilters.sourceType as FinancialMovementSourceType | 'ALL') || 'ALL',
      category: parsedFilters.category || null,
      search: parsedFilters.search || null,
      includeDrafts: parsedFilters.includeDrafts,
    },
  }
}

export async function createFinancialMovement(rawInput: unknown) {
  try {
    const adminUser = await ensureAdminUser()
    const input = createFinancialMovementSchema.parse(rawInput)
    const netAmount = roundCurrency(input.amount - input.discountAmount)

    if (netAmount < 0) {
      throw new Error('El monto neto no puede ser negativo')
    }

    if (input.cashDate && input.cashDate < input.accrualDate) {
      throw new Error('La fecha de pago no puede ser anterior a la fecha devengada')
    }

    const movement = await db.financialMovement.create({
      data: {
        direction: input.direction,
        sourceType: FinancialMovementSourceType.MANUAL,
        status: input.status,
        category: input.category,
        subcategory: input.subcategory,
        description: input.description,
        providerName: input.providerName,
        amount: roundCurrency(input.amount),
        currency: input.currency.toUpperCase(),
        baseCurrency: input.baseCurrency.toUpperCase(),
        baseAmount: roundCurrency(input.baseAmount ?? input.amount),
        discountAmount: roundCurrency(input.discountAmount),
        netAmount,
        accrualDate: input.accrualDate,
        cashDate: input.cashDate,
        notes: input.notes,
        proofUrl: input.proofUrl,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    })

    revalidatePath('/admin/finance')

    return {
      success: true,
      data: {
        id: movement.id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: handleError(error) || 'Error al registrar el movimiento financiero',
    }
  }
}