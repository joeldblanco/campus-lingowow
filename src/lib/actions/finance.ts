'use server'

import { auth } from '@/auth'
import {
  getProjectedTeacherCostSummary,
  getTeacherPaymentsReport,
} from '@/lib/actions/teacher-payments'
import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import {
  createFinancialMovementSchema,
  financeReportFilterSchema,
  type FinanceReportFilterInput,
} from '@/schemas/finance'
import {
  BookingStatus,
  FinancialMovementDirection,
  FinancialMovementSourceType,
  FinancialMovementStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client'
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { revalidatePath } from 'next/cache'

export interface FinancialReportFilters {
  basis?: 'cash' | 'accrual'
  periodId?: string
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
  sourceType: FinancialMovementSourceType | 'SCHEDULED_CLASS_REVENUE'
  sourceId: string | null
  academicPeriodId?: string | null
  academicPeriodName?: string | null
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

export interface FinancialProjection {
  monthStart: string
  monthEnd: string
  cutoffDate: string
  daysRemaining: number
  actualAccruedIncome: number
  actualAccruedExpenses: number
  actualAccruedNet: number
  projectedAdditionalIncome: number
  projectedAdditionalExpenses: number
  projectedClosingIncome: number
  projectedClosingExpenses: number
  projectedClosingNet: number
  projectedRecurringIncome: number
  projectedManualIncome: number
  projectedManualExpenses: number
  projectedScheduledTeacherExpenses: number
  remainingSubscriptionsDue: number
  remainingConfirmedClasses: number
  assumptions: string[]
}

export interface FinancialReportResult {
  rows: FinancialReportRow[]
  summary: FinancialReportSummary
  projection: FinancialProjection | null
  filters: {
    basis: 'cash' | 'accrual'
    periodId: string | null
    periodName: string | null
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

interface ResolvedAcademicPeriodFilter {
  id: string
  name: string
  startDate: Date
  endDate: Date
}

async function resolveAcademicPeriodFilter(periodId?: string) {
  if (!periodId) {
    return null
  }

  const period = await db.academicPeriod.findUnique({
    where: { id: periodId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  })

  if (!period) {
    throw new Error('El período académico seleccionado no existe')
  }

  return period satisfies ResolvedAcademicPeriodFilter
}

async function resolveDateRange(filters: FinanceReportFilterInput) {
  const period = await resolveAcademicPeriodFilter(filters.periodId)

  if (period) {
    return {
      start: startOfDay(period.startDate),
      end: endOfDay(period.endDate),
      period,
    }
  }

  const now = new Date()
  const start = filters.startDate ? startOfDay(filters.startDate) : startOfMonth(now)
  const end = filters.endDate ? endOfDay(filters.endDate) : endOfMonth(now)

  return { start, end, period: null }
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

function sortFinancialRows(rows: FinancialReportRow[]) {
  return rows.sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )
}

const revenueClassBookingArgs = Prisma.validator<Prisma.ClassBookingDefaultArgs>()({
  select: {
    id: true,
    day: true,
    timeSlot: true,
    status: true,
    enrollment: {
      select: {
        id: true,
        classesTotal: true,
        academicPeriodId: true,
        academicPeriod: {
          select: {
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            isSynchronous: true,
          },
        },
        student: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
        purchases: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            proratedPrice: true,
            proratedClasses: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                requiresScheduling: true,
                courseId: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                subtotal: true,
                discount: true,
                tax: true,
                total: true,
                currency: true,
                status: true,
                createdAt: true,
                paidAt: true,
                items: {
                  select: {
                    total: true,
                    price: true,
                    quantity: true,
                    productId: true,
                    product: {
                      select: {
                        id: true,
                        courseId: true,
                        requiresScheduling: true,
                        price: true,
                      },
                    },
                    plan: {
                      select: {
                        id: true,
                        price: true,
                        courseId: true,
                        includesClasses: true,
                        classesPerPeriod: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
})

type RevenueClassBooking = Prisma.ClassBookingGetPayload<typeof revenueClassBookingArgs>

function resolveRevenueInvoiceItem(purchase: RevenueClassBooking['enrollment']['purchases'][number], courseId: string) {
  return (
    purchase.invoice.items.find(
      (item) => item.productId === purchase.product.id || item.product?.id === purchase.product.id
    ) ||
    purchase.invoice.items.find(
      (item) => item.plan?.includesClasses && item.plan.courseId === courseId
    ) ||
    purchase.invoice.items.find((item) => item.product?.courseId === courseId) ||
    purchase.invoice.items[0] ||
    null
  )
}

function resolveScheduledClassRevenue(booking: RevenueClassBooking) {
  const purchase = booking.enrollment.purchases[0]

  if (!purchase) {
    return null
  }

  const synchronousProductPrice =
    (purchase.product.requiresScheduling || booking.enrollment.course.isSynchronous) &&
    purchase.product.price > 0
      ? roundCurrency(purchase.product.price)
      : null

  if (synchronousProductPrice !== null) {
    return {
      sourceId: purchase.product.id,
      grossAmount: synchronousProductPrice,
      discountAmount: 0,
      netAmount: synchronousProductPrice,
      currency: purchase.invoice.currency,
      referenceLabel: purchase.product.name,
    }
  }

  const matchedItem = resolveRevenueInvoiceItem(purchase, booking.enrollment.course.id)
  const totalClasses = Math.max(
    purchase.proratedClasses ||
      matchedItem?.plan?.classesPerPeriod ||
      booking.enrollment.classesTotal ||
      1,
    1
  )

  const subtotalBase = roundCurrency(
    purchase.proratedPrice ||
      matchedItem?.total ||
      (matchedItem ? matchedItem.price * matchedItem.quantity : 0) ||
      purchase.invoice.total
  )

  const subtotalDenominator = purchase.invoice.subtotal > 0 ? purchase.invoice.subtotal : subtotalBase
  const allocationFactor = subtotalDenominator > 0 ? subtotalBase / subtotalDenominator : 1
  const totalDiscountShare = roundCurrency(purchase.invoice.discount * allocationFactor)
  const totalTaxShare = roundCurrency(purchase.invoice.tax * allocationFactor)
  const totalGrossRevenue = roundCurrency(subtotalBase + totalTaxShare)
  const totalNetRevenue = roundCurrency(totalGrossRevenue - totalDiscountShare)

  return {
    sourceId: purchase.id,
    grossAmount: roundCurrency(totalGrossRevenue / totalClasses),
    discountAmount: roundCurrency(totalDiscountShare / totalClasses),
    netAmount: roundCurrency(totalNetRevenue / totalClasses),
    currency: purchase.invoice.currency,
    referenceLabel: purchase.invoice.invoiceNumber,
  }
}

async function getScheduledClassRevenueRows(
  start: Date,
  end: Date,
  period: ResolvedAcademicPeriodFilter | null
) {
  const bookings = await db.classBooking.findMany({
    where: {
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      },
      day: {
        gte: format(start, 'yyyy-MM-dd'),
        lte: format(end, 'yyyy-MM-dd'),
      },
      ...(period
        ? {
            enrollment: {
              academicPeriodId: period.id,
            },
          }
        : {}),
    },
    ...revenueClassBookingArgs,
    orderBy: {
      day: 'desc',
    },
  })

  return bookings.flatMap<FinancialReportRow>((booking) => {
    const revenue = resolveScheduledClassRevenue(booking)

    if (!revenue) {
      return []
    }

    const classDate = new Date(`${booking.day}T00:00:00.000Z`).toISOString()
    const studentName = getFullName(
      booking.enrollment.student.name,
      booking.enrollment.student.lastName,
      booking.enrollment.student.email
    )

    return [
      {
        id: `scheduled-class-revenue-${booking.id}`,
        sourceType: 'SCHEDULED_CLASS_REVENUE',
        sourceId: revenue.sourceId,
        academicPeriodId: booking.enrollment.academicPeriodId,
        academicPeriodName: booking.enrollment.academicPeriod?.name || period?.name || null,
        direction: FinancialMovementDirection.INCOME,
        status: booking.status,
        category: 'Ingresos por clases',
        subcategory: booking.enrollment.course.title,
        description: `Clase agendada ${booking.day} ${booking.timeSlot}`,
        counterparty: studentName,
        amount: revenue.grossAmount,
        discountAmount: revenue.discountAmount,
        netAmount: revenue.netAmount,
        currency: revenue.currency,
        baseAmount: revenue.netAmount,
        accrualDate: classDate,
        cashDate: classDate,
        effectiveDate: classDate,
        notes: `Referencia: ${revenue.referenceLabel}`,
        isManual: false,
      },
    ]
  })
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
    academicPeriodId: null,
    academicPeriodName: null,
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

async function getProjectedSubscriptionRevenue(start: Date, end: Date) {
  const subscriptions = await db.subscription.findMany({
    where: {
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      },
      nextPaymentDate: {
        gte: start,
        lte: end,
      },
      niubizCardToken: {
        not: null,
      },
    },
    select: {
      id: true,
      plan: {
        select: {
          price: true,
        },
      },
    },
  })

  return {
    count: subscriptions.length,
    totalRevenue: roundCurrency(
      subscriptions.reduce((sum, subscription) => sum + subscription.plan.price, 0)
    ),
  }
}

async function getTeacherPayableRows(
  start: Date,
  end: Date,
  period: ResolvedAcademicPeriodFilter | null
) {
  const report = await getTeacherPaymentsReport({
    startDate: period ? undefined : start,
    endDate: period ? undefined : end,
    periodId: period?.id,
    calculationMode: 'scheduled',
  })

  return report.teacherReports
    .filter((teacher) => teacher.totalPayment > 0)
    .map<FinancialReportRow>((teacher) => ({
      id: `teacher-payable-${teacher.teacherId}-${start.toISOString()}-${end.toISOString()}`,
      sourceType: FinancialMovementSourceType.TEACHER_PAYABLE,
      sourceId: teacher.teacherId,
      academicPeriodId: period?.id || null,
      academicPeriodName: period?.name || null,
      direction: FinancialMovementDirection.EXPENSE,
      status: teacher.paymentConfirmed ? 'CONFIRMED' : 'CALCULATED',
      category: 'Pagos a docentes',
      subcategory: period ? 'Clases agendadas' : 'Devengado',
      description: period
        ? `Pago estimado por clases agendadas de ${teacher.teacherName}`
        : `Pago devengado por clases de ${teacher.teacherName}`,
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

async function getTeacherIncentiveRows(
  start: Date,
  end: Date,
  basis: 'cash' | 'accrual',
  period: ResolvedAcademicPeriodFilter | null
) {
  const incentives = await db.teacherIncentive.findMany({
    where: period
      ? {
          periodId: period.id,
          ...(basis === 'cash' ? { paid: true } : {}),
        }
      : basis === 'cash'
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
      periodId: true,
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
    academicPeriodId: incentive.periodId,
    academicPeriodName: incentive.period.name,
    direction: FinancialMovementDirection.EXPENSE,
    status: incentive.paid ? 'PAID' : 'ACCRUED',
    category: 'Incentivos docentes',
    subcategory: incentive.period.name,
    description: `Incentivo ${incentive.type.toLowerCase()} para ${getFullName(incentive.teacher.name, incentive.teacher.lastName, incentive.teacher.email) || 'docente'}`,
    counterparty: getFullName(
      incentive.teacher.name,
      incentive.teacher.lastName,
      incentive.teacher.email
    ),
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

    if (
      filters.sourceType &&
      filters.sourceType !== 'ALL' &&
      row.sourceType !== filters.sourceType
    ) {
      return false
    }

    if (filters.category && row.category !== filters.category) {
      return false
    }

    if (filters.search) {
      const haystack =
        `${row.description} ${row.counterparty || ''} ${row.category} ${row.notes || ''} ${row.academicPeriodName || ''}`.toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) {
        return false
      }
    }

    return true
  })
}

function buildSummary(
  rows: FinancialReportRow[],
  basis: 'cash' | 'accrual'
): FinancialReportSummary {
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
        .filter(
          (row) =>
            row.sourceType === FinancialMovementSourceType.INVOICE ||
            row.sourceType === 'SCHEDULED_CLASS_REVENUE'
        )
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
      incomeRows.filter((row) => row.isManual).reduce((sum, row) => sum + row.netAmount, 0)
    ),
    manualExpenses: roundCurrency(
      expenseRows.filter((row) => row.isManual).reduce((sum, row) => sum + row.netAmount, 0)
    ),
    movementCount: rows.length,
  }
}

async function collectFinancialRows(
  start: Date,
  end: Date,
  basis: 'cash' | 'accrual',
  filters: FinanceReportFilterInput,
  period: ResolvedAcademicPeriodFilter | null
) {
  const [incomeRows, manualRows, teacherRows, incentiveRows] = await Promise.all([
    getScheduledClassRevenueRows(start, end, period),
    getManualMovementRows(start, end, basis, filters),
    getTeacherPayableRows(start, end, period),
    getTeacherIncentiveRows(start, end, basis, period),
  ])

  return applyClientFilters(
    sortFinancialRows([...incomeRows, ...manualRows, ...teacherRows, ...incentiveRows]),
    filters
  )
}

async function buildMonthProjection(cutoffDate: Date): Promise<FinancialProjection | null> {
  const now = new Date()

  if (!isSameMonth(cutoffDate, now) || !isSameYear(cutoffDate, now)) {
    return null
  }

  const monthStart = startOfMonth(cutoffDate)
  const monthEnd = endOfMonth(cutoffDate)
  const remainingStart = startOfDay(addDays(cutoffDate, 1))

  if (remainingStart > monthEnd) {
    return null
  }

  const baseFilters = financeReportFilterSchema.parse({
    basis: 'accrual',
    startDate: monthStart,
    endDate: cutoffDate,
    direction: 'ALL',
    sourceType: 'ALL',
    includeDrafts: false,
  })

  const monthToDateRows = await collectFinancialRows(
    monthStart,
    endOfDay(cutoffDate),
    'accrual',
    baseFilters,
    null
  )
  const monthToDateSummary = buildSummary(monthToDateRows, 'accrual')

  const futureFilters = financeReportFilterSchema.parse({
    basis: 'accrual',
    startDate: remainingStart,
    endDate: monthEnd,
    direction: 'ALL',
    sourceType: 'ALL',
    includeDrafts: false,
  })

  const futureManualRows = await getManualMovementRows(
    remainingStart,
    monthEnd,
    'accrual',
    futureFilters
  )
  const manualIncome = roundCurrency(
    futureManualRows
      .filter((row) => row.direction === FinancialMovementDirection.INCOME)
      .reduce((sum, row) => sum + row.netAmount, 0)
  )
  const manualExpenses = roundCurrency(
    futureManualRows
      .filter((row) => row.direction === FinancialMovementDirection.EXPENSE)
      .reduce((sum, row) => sum + row.netAmount, 0)
  )

  const [projectedSubscriptions, projectedTeacherCosts] = await Promise.all([
    getProjectedSubscriptionRevenue(remainingStart, monthEnd),
    getProjectedTeacherCostSummary(remainingStart, monthEnd),
  ])

  const projectedAdditionalIncome = roundCurrency(
    projectedSubscriptions.totalRevenue + manualIncome
  )
  const projectedAdditionalExpenses = roundCurrency(
    projectedTeacherCosts.totalPayment + manualExpenses
  )

  return {
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    cutoffDate: cutoffDate.toISOString(),
    daysRemaining: Math.max(differenceInCalendarDays(monthEnd, cutoffDate), 0),
    actualAccruedIncome: monthToDateSummary.totalIncome,
    actualAccruedExpenses: monthToDateSummary.totalExpenses,
    actualAccruedNet: monthToDateSummary.netIncome,
    projectedAdditionalIncome,
    projectedAdditionalExpenses,
    projectedClosingIncome: roundCurrency(
      monthToDateSummary.totalIncome + projectedAdditionalIncome
    ),
    projectedClosingExpenses: roundCurrency(
      monthToDateSummary.totalExpenses + projectedAdditionalExpenses
    ),
    projectedClosingNet: roundCurrency(
      monthToDateSummary.netIncome + projectedAdditionalIncome - projectedAdditionalExpenses
    ),
    projectedRecurringIncome: projectedSubscriptions.totalRevenue,
    projectedManualIncome: manualIncome,
    projectedManualExpenses: manualExpenses,
    projectedScheduledTeacherExpenses: projectedTeacherCosts.totalPayment,
    remainingSubscriptionsDue: projectedSubscriptions.count,
    remainingConfirmedClasses: projectedTeacherCosts.totalClasses,
    assumptions: [
      'Incluye cobros recurrentes con nextPaymentDate dentro del resto del mes.',
      'Incluye costo docente de clases confirmadas pendientes dentro del mes.',
      'Incluye movimientos manuales futuros ya registrados en el ledger.',
      'No incluye ventas nuevas no calendarizadas ni incentivos futuros no generados.',
    ],
  }
}

export async function getFinancialReport(
  rawFilters: FinancialReportFilters = {}
): Promise<FinancialReportResult> {
  await ensureAdminUser()

  const parsedFilters = financeReportFilterSchema.parse({
    basis: rawFilters.basis,
    periodId: rawFilters.periodId,
    startDate: rawFilters.startDate,
    endDate: rawFilters.endDate,
    direction: rawFilters.direction || 'ALL',
    sourceType: rawFilters.sourceType || 'ALL',
    category: rawFilters.category,
    search: rawFilters.search,
    includeDrafts: rawFilters.includeDrafts,
  })

  const { start, end, period } = await resolveDateRange(parsedFilters)
  const basis = parsedFilters.basis
  const [rows, projection] = await Promise.all([
    collectFinancialRows(start, end, basis, parsedFilters, period),
    buildMonthProjection(end),
  ])

  return {
    rows,
    summary: buildSummary(rows, basis),
    projection,
    filters: {
      basis,
      periodId: period?.id || parsedFilters.periodId || null,
      periodName: period?.name || null,
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
