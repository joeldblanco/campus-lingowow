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
  addMonths,
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

type DerivedFinancialSourceType = 'SCHEDULED_CLASS_REVENUE' | 'AUTO_GATEWAY_FEE' | 'AUTO_OFFERING'

export interface FinancialReportRow {
  id: string
  sourceType: FinancialMovementSourceType | DerivedFinancialSourceType
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
  unitCount: number | null
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

const GATEWAY_FEE_RATE = 0.06
const OFFERING_RATE = 0.1

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

function resolveCurrentMonthDateRange(referenceDate = new Date()) {
  return {
    start: startOfMonth(referenceDate),
    end: endOfMonth(referenceDate),
  }
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

function buildAutomaticExpenseRows(
  baseRows: FinancialReportRow[],
  period: ResolvedAcademicPeriodFilter | null
) {
  const incomeRows = baseRows.filter((row) => row.direction === FinancialMovementDirection.INCOME)
  const expenseRows = baseRows.filter((row) => row.direction === FinancialMovementDirection.EXPENSE)

  const totalIncome = roundCurrency(incomeRows.reduce((sum, row) => sum + row.netAmount, 0))

  if (totalIncome <= 0) {
    return [] satisfies FinancialReportRow[]
  }

  const gatewayFeeAmount = roundCurrency(totalIncome * GATEWAY_FEE_RATE)
  const profitBeforeOffering = roundCurrency(
    totalIncome - expenseRows.reduce((sum, row) => sum + row.netAmount, 0) - gatewayFeeAmount
  )
  const offeringAmount =
    profitBeforeOffering > 0 ? roundCurrency(profitBeforeOffering * OFFERING_RATE) : 0
  const { end: currentMonthEnd } = resolveCurrentMonthDateRange()
  const effectiveDate = currentMonthEnd.toISOString()

  const rows: FinancialReportRow[] = []

  if (gatewayFeeAmount > 0) {
    rows.push({
      id: `auto-gateway-fee-${period?.id || format(currentMonthEnd, 'yyyy-MM')}`,
      sourceType: 'AUTO_GATEWAY_FEE',
      sourceId: null,
      academicPeriodId: period?.id || null,
      academicPeriodName: period?.name || null,
      direction: FinancialMovementDirection.EXPENSE,
      status: 'CALCULATED',
      category: 'Comisión pasarela',
      subcategory: 'Automático',
      description: 'Descuento automático del 6% sobre todos los ingresos del resultado',
      counterparty: 'Pasarelas de pago',
      amount: gatewayFeeAmount,
      discountAmount: 0,
      netAmount: gatewayFeeAmount,
      currency: 'USD',
      baseAmount: gatewayFeeAmount,
      accrualDate: effectiveDate,
      cashDate: effectiveDate,
      effectiveDate,
      unitCount: null,
      notes: `6% de USD ${totalIncome.toFixed(2)} de ingresos acumulados`,
      isManual: false,
    })
  }

  if (offeringAmount > 0) {
    rows.push({
      id: `auto-offering-${period?.id || format(currentMonthEnd, 'yyyy-MM')}`,
      sourceType: 'AUTO_OFFERING',
      sourceId: null,
      academicPeriodId: period?.id || null,
      academicPeriodName: period?.name || null,
      direction: FinancialMovementDirection.EXPENSE,
      status: 'CALCULATED',
      category: 'Ofrenda',
      subcategory: 'Automático',
      description: 'Descuento automático del 10% sobre la ganancia restante',
      counterparty: 'Ofrenda',
      amount: offeringAmount,
      discountAmount: 0,
      netAmount: offeringAmount,
      currency: 'USD',
      baseAmount: offeringAmount,
      accrualDate: effectiveDate,
      cashDate: effectiveDate,
      effectiveDate,
      unitCount: null,
      notes: `10% de USD ${profitBeforeOffering.toFixed(2)} de ganancia antes de ofrenda`,
      isManual: false,
    })
  }

  return rows
}

function buildAnnualInstallmentAmounts(totalAmount: number) {
  const normalizedTotal = roundCurrency(totalAmount)
  const installmentAmount = Math.floor((normalizedTotal / 12) * 100) / 100
  const amounts = Array.from({ length: 12 }, () => installmentAmount)
  const assignedAmount = roundCurrency(installmentAmount * 11)

  amounts[11] = roundCurrency(normalizedTotal - assignedAmount)

  return amounts
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
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  },
})

type RevenueClassBooking = Prisma.ClassBookingGetPayload<typeof revenueClassBookingArgs>

interface CourseRevenueProduct {
  id: string
  courseId: string
  name: string
  price: number
  requiresScheduling: boolean
}

async function getCourseRevenueProductMap(courseIds: string[]) {
  if (courseIds.length === 0) {
    return new Map<string, CourseRevenueProduct>()
  }

  const products = await db.product.findMany({
    where: {
      courseId: {
        in: courseIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      courseId: true,
      name: true,
      price: true,
      requiresScheduling: true,
      sortOrder: true,
      createdAt: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  const productMap = new Map<string, CourseRevenueProduct>()

  for (const product of products) {
    if (!product.courseId) {
      continue
    }

    const normalizedProduct: CourseRevenueProduct = {
      id: product.id,
      courseId: product.courseId,
      name: product.name,
      price: product.price,
      requiresScheduling: product.requiresScheduling,
    }

    const current = productMap.get(product.courseId)

    if (!current) {
      productMap.set(product.courseId, normalizedProduct)
      continue
    }

    if (!current.requiresScheduling && product.requiresScheduling) {
      productMap.set(product.courseId, normalizedProduct)
    }
  }

  return productMap
}

function resolveScheduledClassRevenue(
  booking: RevenueClassBooking,
  courseRevenueProductMap: Map<string, CourseRevenueProduct>
) {
  const product = courseRevenueProductMap.get(booking.enrollment.course.id)

  if (!product || product.price <= 0) {
    return null
  }

  return {
    sourceId: product.id,
    grossAmount: roundCurrency(product.price),
    discountAmount: 0,
    netAmount: roundCurrency(product.price),
    currency: 'USD',
    referenceLabel: product.name,
    courseTitle: booking.enrollment.course.title,
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

  const courseRevenueProductMap = await getCourseRevenueProductMap(
    Array.from(new Set(bookings.map((booking) => booking.enrollment.course.id)))
  )

  const groupedRows = new Map<
    string,
    {
      studentId: string
      studentName: string
      academicPeriodId: string | null
      academicPeriodName: string | null
      grossAmount: number
      discountAmount: number
      netAmount: number
      currency: string
      classCount: number
      courseTitles: Set<string>
      productNotes: Set<string>
      firstDate: string
      lastDate: string
    }
  >()

  for (const booking of bookings) {
    const revenue = resolveScheduledClassRevenue(booking, courseRevenueProductMap)

    if (!revenue) {
      continue
    }

    const studentId = booking.enrollment.student.id
    const studentName =
      getFullName(
        booking.enrollment.student.name,
        booking.enrollment.student.lastName,
        booking.enrollment.student.email
      ) ||
      booking.enrollment.student.email ||
      'Estudiante'
    const classDate = new Date(`${booking.day}T00:00:00.000Z`).toISOString()
    const current = groupedRows.get(studentId)

    if (!current) {
      groupedRows.set(studentId, {
        studentId,
        studentName,
        academicPeriodId: booking.enrollment.academicPeriodId,
        academicPeriodName: booking.enrollment.academicPeriod?.name || period?.name || null,
        grossAmount: revenue.grossAmount,
        discountAmount: revenue.discountAmount,
        netAmount: revenue.netAmount,
        currency: revenue.currency,
        classCount: 1,
        courseTitles: new Set([revenue.courseTitle]),
        productNotes: new Set([
          `${revenue.courseTitle}: ${revenue.currency} ${revenue.netAmount.toFixed(2)} por clase`,
        ]),
        firstDate: classDate,
        lastDate: classDate,
      })
      continue
    }

    current.grossAmount = roundCurrency(current.grossAmount + revenue.grossAmount)
    current.discountAmount = roundCurrency(current.discountAmount + revenue.discountAmount)
    current.netAmount = roundCurrency(current.netAmount + revenue.netAmount)
    current.classCount += 1
    current.courseTitles.add(revenue.courseTitle)
    current.productNotes.add(
      `${revenue.courseTitle}: ${revenue.currency} ${revenue.netAmount.toFixed(2)} por clase`
    )
    current.firstDate = current.firstDate < classDate ? current.firstDate : classDate
    current.lastDate = current.lastDate > classDate ? current.lastDate : classDate
  }

  return Array.from(groupedRows.values()).map<FinancialReportRow>((group) => ({
    id: `scheduled-class-revenue-student-${group.studentId}`,
    sourceType: 'SCHEDULED_CLASS_REVENUE',
    sourceId: group.studentId,
    academicPeriodId: group.academicPeriodId,
    academicPeriodName: group.academicPeriodName,
    direction: FinancialMovementDirection.INCOME,
    status: 'SCHEDULED',
    category: 'Ingresos por clases',
    subcategory:
      group.courseTitles.size === 1
        ? Array.from(group.courseTitles)[0]
        : `${group.courseTitles.size} cursos`,
    description: `${group.classCount} clases agendadas del estudiante`,
    counterparty: group.studentName,
    amount: group.grossAmount,
    discountAmount: group.discountAmount,
    netAmount: group.netAmount,
    currency: group.currency,
    baseAmount: group.netAmount,
    accrualDate: group.firstDate,
    cashDate: group.lastDate,
    effectiveDate: group.lastDate,
    unitCount: group.classCount,
    notes: Array.from(group.productNotes).join(' | '),
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
    unitCount: null,
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
      unitCount: teacher.totalClasses,
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
    unitCount: null,
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
      expenseRows
        .filter(
          (row) =>
            row.isManual ||
            row.sourceType === 'AUTO_GATEWAY_FEE' ||
            row.sourceType === 'AUTO_OFFERING'
        )
        .reduce((sum, row) => sum + row.netAmount, 0)
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
  const { start: manualStart, end: manualEnd } = resolveCurrentMonthDateRange()

  const [incomeRows, manualRows, teacherRows, incentiveRows] = await Promise.all([
    getScheduledClassRevenueRows(start, end, period),
    getManualMovementRows(manualStart, manualEnd, basis, filters),
    getTeacherPayableRows(start, end, period),
    getTeacherIncentiveRows(start, end, basis, period),
  ])

  const baseRows = [...incomeRows, ...manualRows, ...teacherRows, ...incentiveRows]
  const automaticExpenseRows = buildAutomaticExpenseRows(baseRows, period)

  return applyClientFilters(sortFinancialRows([...baseRows, ...automaticExpenseRows]), filters)
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

    if (input.recurrence === 'ANNUAL') {
      const annualAmount = roundCurrency(input.amount)
      const installmentAmounts = buildAnnualInstallmentAmounts(annualAmount)
      const seriesId = crypto.randomUUID()

      const movements = await db.$transaction(
        installmentAmounts.map((installmentAmount, index) => {
          const occurrenceDate = addMonths(input.accrualDate, index)
          const notes = [
            input.notes,
            `Gasto anual prorrateado: cuota ${index + 1} de 12 por USD ${installmentAmount.toFixed(2)}.`,
          ]
            .filter(Boolean)
            .join(' | ')

          return db.financialMovement.create({
            data: {
              direction: input.direction,
              sourceType: FinancialMovementSourceType.MANUAL,
              sourceId: input.sourceId,
              status: input.status,
              category: input.category,
              subcategory: input.subcategory,
              description: input.description,
              providerName: input.providerName,
              amount: installmentAmount,
              currency: input.currency.toUpperCase(),
              baseCurrency: input.baseCurrency.toUpperCase(),
              baseAmount: installmentAmount,
              discountAmount: 0,
              netAmount: installmentAmount,
              accrualDate: occurrenceDate,
              cashDate: occurrenceDate,
              notes: notes || undefined,
              proofUrl: input.proofUrl,
              metadata: {
                recurrence: input.recurrence,
                annualAmount,
                installmentAmount,
                installmentIndex: index + 1,
                installmentCount: 12,
                seriesId,
              },
              createdById: adminUser.id,
              updatedById: adminUser.id,
            },
          })
        })
      )

      revalidatePath('/admin/finance')

      return {
        success: true,
        data: {
          id: movements[0]?.id,
          createdCount: movements.length,
        },
      }
    }

    const movement = await db.financialMovement.create({
      data: {
        direction: input.direction,
        sourceType: FinancialMovementSourceType.MANUAL,
        sourceId: input.sourceId,
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
        metadata: {
          recurrence: input.recurrence,
        },
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
