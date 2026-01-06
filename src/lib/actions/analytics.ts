'use server'

import { db } from '@/lib/db'
import { BookingStatus, UserRole } from '@prisma/client'
import type {
  DashboardKPIs,
  KPIData,
  RevenueAnalytics,
  MonthlyRevenue,
  RevenueByProduct,
  RevenueByPlan,
  RevenueByLanguage,
  RevenueByPaymentMethod,
  CouponUsage,
  ExpenseAnalytics,
  MonthlyExpense,
  TeacherPayment,
  ProductAnalytics,
  ProductSales,
  PlanSales,
  CourseEnrollments,
  TeacherAnalytics,
  TeacherStats,
  StudentAnalytics,
  StudentGrowth,
  StudentActivity,
  ProjectionAnalytics,
  Projection,
  Seasonality,
  TrendAlert,
  HistoricalComparison,
  DateRange,
} from '@/types/analytics'
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// =============================================
// HELPERS
// =============================================

function calculateChange(current: number, previous: number): KPIData {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0
  return {
    value: current,
    previousValue: previous,
    change: Math.round(change * 10) / 10,
    changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  }
}

function getMonthName(date: Date): string {
  return format(date, 'MMM', { locale: es })
}

function getMonthNameFull(date: Date): string {
  return format(date, 'MMMM', { locale: es })
}

// =============================================
// DASHBOARD KPIs
// =============================================

export async function getDashboardKPIs(_dateRange?: DateRange): Promise<DashboardKPIs> {
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)
  const previousMonthStart = startOfMonth(subMonths(now, 1))
  const previousMonthEnd = endOfMonth(subMonths(now, 1))

  // Ingresos del mes actual
  const currentRevenue = await db.invoice.aggregate({
    where: {
      status: 'PAID',
      paidAt: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { total: true },
    _count: true,
  })

  // Ingresos del mes anterior
  const previousRevenue = await db.invoice.aggregate({
    where: {
      status: 'PAID',
      paidAt: { gte: previousMonthStart, lte: previousMonthEnd },
    },
    _sum: { total: true },
  })

  // Gastos (pagos a profesores) - basado en clases completadas
  const currentExpenses = await calculateMonthlyTeacherPayments(currentMonthStart, currentMonthEnd)
  const previousExpenses = await calculateMonthlyTeacherPayments(previousMonthStart, previousMonthEnd)

  // Nuevos estudiantes
  const currentNewStudents = await db.user.count({
    where: {
      roles: { has: UserRole.STUDENT },
      createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
    },
  })

  const previousNewStudents = await db.user.count({
    where: {
      roles: { has: UserRole.STUDENT },
      createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
    },
  })

  // Total estudiantes activos (con inscripción activa)
  const totalActiveStudents = await db.enrollment.groupBy({
    by: ['studentId'],
    where: { status: 'ACTIVE' },
  })

  // Clases del mes actual
  const currentClasses = await db.classBooking.groupBy({
    by: ['status'],
    where: {
      day: { gte: format(currentMonthStart, 'yyyy-MM-dd'), lte: format(currentMonthEnd, 'yyyy-MM-dd') },
    },
    _count: true,
  })

  const previousClasses = await db.classBooking.count({
    where: {
      day: { gte: format(previousMonthStart, 'yyyy-MM-dd'), lte: format(previousMonthEnd, 'yyyy-MM-dd') },
    },
  })

  const completedClasses = currentClasses.find(c => c.status === 'COMPLETED')?._count || 0
  const cancelledClasses = currentClasses.find(c => c.status === 'CANCELLED')?._count || 0
  const noShowClasses = currentClasses.find(c => c.status === 'NO_SHOW')?._count || 0
  const totalCurrentClasses = currentClasses.reduce((sum, c) => sum + c._count, 0)

  // Tasa de retención (estudiantes que tuvieron clases este mes y el anterior)
  const studentsLastMonth = await db.classBooking.groupBy({
    by: ['studentId'],
    where: {
      day: { gte: format(previousMonthStart, 'yyyy-MM-dd'), lte: format(previousMonthEnd, 'yyyy-MM-dd') },
      status: 'COMPLETED',
    },
  })

  const studentsThisMonth = await db.classBooking.groupBy({
    by: ['studentId'],
    where: {
      day: { gte: format(currentMonthStart, 'yyyy-MM-dd'), lte: format(currentMonthEnd, 'yyyy-MM-dd') },
      status: 'COMPLETED',
    },
  })

  const lastMonthIds = new Set(studentsLastMonth.map(s => s.studentId))
  const retained = studentsThisMonth.filter(s => lastMonthIds.has(s.studentId)).length
  const retentionRate = studentsLastMonth.length > 0 ? (retained / studentsLastMonth.length) * 100 : 100

  // Proyecciones basadas en tendencia
  const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1
  const daysPassed = differenceInDays(now, currentMonthStart) + 1
  const projectionMultiplier = daysInMonth / daysPassed

  const currentRevenueValue = currentRevenue._sum.total || 0
  const previousRevenueValue = previousRevenue._sum.total || 0

  return {
    monthlyRevenue: calculateChange(currentRevenueValue, previousRevenueValue),
    projectedRevenue: Math.round(currentRevenueValue * projectionMultiplier * 100) / 100,
    monthlyExpenses: calculateChange(currentExpenses, previousExpenses),
    projectedExpenses: Math.round(currentExpenses * projectionMultiplier * 100) / 100,
    netMargin: calculateChange(
      currentRevenueValue - currentExpenses,
      previousRevenueValue - previousExpenses
    ),
    newStudents: calculateChange(currentNewStudents, previousNewStudents),
    totalActiveStudents: totalActiveStudents.length,
    retentionRate: {
      value: Math.round(retentionRate * 10) / 10,
      previousValue: 0,
      change: 0,
      changeType: 'neutral',
    },
    churnRate: Math.round((100 - retentionRate) * 10) / 10,
    totalClasses: calculateChange(totalCurrentClasses, previousClasses),
    completedClasses,
    cancelledClasses,
    noShowClasses,
  }
}

// =============================================
// ANÁLISIS DE INGRESOS
// =============================================

export async function getRevenueAnalytics(months: number = 12): Promise<RevenueAnalytics> {
  const now = new Date()
  const startDate = startOfMonth(subMonths(now, months - 1))

  // Ingresos mensuales
  const invoices = await db.invoice.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: startDate },
    },
    include: {
      items: {
        include: {
          product: true,
          plan: {
            include: {
              product: true,
              pricing: true,
            },
          },
        },
      },
      coupon: true,
    },
  })

  // Agrupar por mes
  const monthlyMap = new Map<string, MonthlyRevenue>()
  for (let i = 0; i < months; i++) {
    const date = subMonths(now, months - 1 - i)
    const key = format(date, 'yyyy-MM')
    monthlyMap.set(key, {
      month: getMonthName(date),
      year: date.getFullYear(),
      revenue: 0,
      invoiceCount: 0,
    })
  }

  // Por producto
  const productMap = new Map<string, RevenueByProduct>()
  // Por plan
  const planMap = new Map<string, RevenueByPlan>()
  // Por idioma (basado en items del invoice)
  const languageMap = new Map<string, RevenueByLanguage>()
  // Por método de pago
  const paymentMethodMap = new Map<string, RevenueByPaymentMethod>()
  // Cupones
  const couponMap = new Map<string, CouponUsage>()

  let totalRevenue = 0
  let totalDiscounts = 0

  for (const invoice of invoices) {
    const monthKey = invoice.paidAt ? format(invoice.paidAt, 'yyyy-MM') : format(invoice.createdAt, 'yyyy-MM')
    
    // Actualizar mensual
    const monthData = monthlyMap.get(monthKey)
    if (monthData) {
      monthData.revenue += invoice.total
      monthData.invoiceCount += 1
    }

    totalRevenue += invoice.total
    totalDiscounts += invoice.discount

    // Por método de pago
    const method = invoice.paymentMethod || 'unknown'
    const methodLabel = getPaymentMethodLabel(method)
    if (!paymentMethodMap.has(method)) {
      paymentMethodMap.set(method, { method, methodLabel, revenue: 0, count: 0, percentage: 0 })
    }
    const pm = paymentMethodMap.get(method)!
    pm.revenue += invoice.total
    pm.count += 1

    // Cupones
    if (invoice.coupon) {
      if (!couponMap.has(invoice.coupon.id)) {
        couponMap.set(invoice.coupon.id, {
          couponId: invoice.coupon.id,
          couponCode: invoice.coupon.code,
          couponName: invoice.coupon.name,
          usageCount: 0,
          totalDiscount: 0,
        })
      }
      const couponData = couponMap.get(invoice.coupon.id)!
      couponData.usageCount += 1
      couponData.totalDiscount += invoice.discount
    }

    // Por items
    for (const item of invoice.items) {
      // Por producto
      if (item.product) {
        if (!productMap.has(item.product.id)) {
          productMap.set(item.product.id, {
            productId: item.product.id,
            productName: item.product.name,
            revenue: 0,
            salesCount: 0,
            percentage: 0,
          })
        }
        const prod = productMap.get(item.product.id)!
        prod.revenue += item.total
        prod.salesCount += item.quantity
      }

      // Por plan
      if (item.plan) {
        if (!planMap.has(item.plan.id)) {
          planMap.set(item.plan.id, {
            planId: item.plan.id,
            planName: item.plan.name,
            productName: item.plan.product?.name || 'Sin producto',
            revenue: 0,
            salesCount: 0,
            percentage: 0,
          })
        }
        const plan = planMap.get(item.plan.id)!
        plan.revenue += item.total
        plan.salesCount += item.quantity

        // Por idioma (basado en pricing del plan)
        if (item.plan.pricing && item.plan.pricing.length > 0) {
          for (const pricing of item.plan.pricing) {
            if (!languageMap.has(pricing.language)) {
              languageMap.set(pricing.language, {
                language: pricing.language,
                languageLabel: getLanguageLabel(pricing.language),
                revenue: 0,
                salesCount: 0,
                percentage: 0,
              })
            }
          }
        }
      }
    }
  }

  // Calcular porcentajes
  const byProduct = Array.from(productMap.values()).map(p => ({
    ...p,
    percentage: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  const byPlan = Array.from(planMap.values()).map(p => ({
    ...p,
    percentage: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  const byPaymentMethod = Array.from(paymentMethodMap.values()).map(p => ({
    ...p,
    percentage: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // Ingresos por idioma (basado en cursos de las inscripciones)
  const enrollmentsByLanguage = await db.enrollment.groupBy({
    by: ['courseId'],
    _count: true,
  })

  const courses = await db.course.findMany({
    where: { id: { in: enrollmentsByLanguage.map(e => e.courseId) } },
    select: { id: true, language: true },
  })

  const courseLanguageMap = new Map(courses.map(c => [c.id, c.language]))
  
  for (const enrollment of enrollmentsByLanguage) {
    const lang = courseLanguageMap.get(enrollment.courseId) || 'unknown'
    if (!languageMap.has(lang)) {
      languageMap.set(lang, {
        language: lang,
        languageLabel: getLanguageLabel(lang),
        revenue: 0,
        salesCount: 0,
        percentage: 0,
      })
    }
    languageMap.get(lang)!.salesCount += enrollment._count
  }

  const byLanguage = Array.from(languageMap.values()).sort((a, b) => b.salesCount - a.salesCount)

  const monthlyRevenue = Array.from(monthlyMap.values())
  const sortedByRevenue = [...monthlyRevenue].sort((a, b) => b.revenue - a.revenue)
  const nonZeroMonths = sortedByRevenue.filter(m => m.revenue > 0)

  return {
    monthlyRevenue,
    bestMonth: nonZeroMonths[0] || null,
    worstMonth: nonZeroMonths[nonZeroMonths.length - 1] || null,
    byProduct,
    byPlan,
    byLanguage,
    byPaymentMethod,
    averageTicket: invoices.length > 0 ? Math.round((totalRevenue / invoices.length) * 100) / 100 : 0,
    totalRevenue,
    couponUsage: Array.from(couponMap.values()).sort((a, b) => b.usageCount - a.usageCount),
    totalDiscounts,
  }
}

// =============================================
// ANÁLISIS DE GASTOS
// =============================================

async function calculateMonthlyTeacherPayments(startDate: Date, endDate: Date): Promise<number> {
  const BASE_RATE_PER_HOUR = 10

  const completedClasses = await db.classBooking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
      day: { gte: format(startDate, 'yyyy-MM-dd'), lte: format(endDate, 'yyyy-MM-dd') },
    },
    include: {
      teacher: {
        select: {
          teacherRank: { select: { rateMultiplier: true } },
        },
      },
      attendances: { select: { status: true } },
      teacherAttendances: { select: { status: true } },
      enrollment: {
        select: {
          course: { select: { classDuration: true, defaultPaymentPerClass: true } },
        },
      },
      videoCalls: { select: { duration: true } },
    },
  })

  let totalPayments = 0

  for (const classBooking of completedClasses) {
    // Solo clases pagables (ambos asistieron)
    const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
    const hasStudentAttendance = classBooking.attendances.length > 0
    
    if (hasTeacherAttendance && hasStudentAttendance) {
      const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      const rateMultiplier = classBooking.teacher.teacherRank?.rateMultiplier || 1.0
      
      // Usar pago por defecto del curso si existe, sino calcular por hora
      const paymentPerClass = classBooking.enrollment.course.defaultPaymentPerClass
      if (paymentPerClass) {
        totalPayments += paymentPerClass * rateMultiplier
      } else {
        const hours = duration / 60
        totalPayments += hours * BASE_RATE_PER_HOUR * rateMultiplier
      }
    }
  }

  return Math.round(totalPayments * 100) / 100
}

export async function getExpenseAnalytics(months: number = 12): Promise<ExpenseAnalytics> {
  const now = new Date()
  const BASE_RATE_PER_HOUR = 10

  // Gastos mensuales
  const monthlyExpenses: MonthlyExpense[] = []
  
  for (let i = 0; i < months; i++) {
    const date = subMonths(now, months - 1 - i)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    
    const payments = await calculateMonthlyTeacherPayments(monthStart, monthEnd)
    
    const classCount = await db.classBooking.count({
      where: {
        status: BookingStatus.COMPLETED,
        day: { gte: format(monthStart, 'yyyy-MM-dd'), lte: format(monthEnd, 'yyyy-MM-dd') },
      },
    })

    const teacherCount = await db.classBooking.groupBy({
      by: ['teacherId'],
      where: {
        status: BookingStatus.COMPLETED,
        day: { gte: format(monthStart, 'yyyy-MM-dd'), lte: format(monthEnd, 'yyyy-MM-dd') },
      },
    })

    monthlyExpenses.push({
      month: getMonthName(date),
      year: date.getFullYear(),
      totalPayments: payments,
      classCount,
      teacherCount: teacherCount.length,
    })
  }

  // Pagos por profesor (mes actual)
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)

  const teacherClasses = await db.classBooking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
      day: { gte: format(currentMonthStart, 'yyyy-MM-dd'), lte: format(currentMonthEnd, 'yyyy-MM-dd') },
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          lastName: true,
          image: true,
          teacherRank: { select: { name: true, rateMultiplier: true } },
        },
      },
      attendances: { select: { status: true } },
      teacherAttendances: { select: { status: true } },
      enrollment: {
        select: {
          course: { select: { classDuration: true, defaultPaymentPerClass: true } },
        },
      },
      videoCalls: { select: { duration: true } },
    },
  })

  const teacherPaymentMap = new Map<string, TeacherPayment>()

  for (const classBooking of teacherClasses) {
    const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
    const hasStudentAttendance = classBooking.attendances.length > 0
    
    if (!hasTeacherAttendance || !hasStudentAttendance) continue

    const teacher = classBooking.teacher
    if (!teacherPaymentMap.has(teacher.id)) {
      teacherPaymentMap.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: `${teacher.name} ${teacher.lastName || ''}`.trim(),
        teacherImage: teacher.image,
        totalClasses: 0,
        totalHours: 0,
        totalPayment: 0,
        averagePerClass: 0,
        rankName: teacher.teacherRank?.name || null,
        rateMultiplier: teacher.teacherRank?.rateMultiplier || 1.0,
      })
    }

    const tp = teacherPaymentMap.get(teacher.id)!
    const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
    const hours = duration / 60
    
    const paymentPerClass = classBooking.enrollment.course.defaultPaymentPerClass
    const payment = paymentPerClass 
      ? paymentPerClass * tp.rateMultiplier
      : hours * BASE_RATE_PER_HOUR * tp.rateMultiplier

    tp.totalClasses += 1
    tp.totalHours += hours
    tp.totalPayment += payment
  }

  const teacherPayments = Array.from(teacherPaymentMap.values())
    .map(tp => ({
      ...tp,
      totalHours: Math.round(tp.totalHours * 10) / 10,
      totalPayment: Math.round(tp.totalPayment * 100) / 100,
      averagePerClass: tp.totalClasses > 0 ? Math.round((tp.totalPayment / tp.totalClasses) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.totalPayment - a.totalPayment)

  const totalExpenses = teacherPayments.reduce((sum, tp) => sum + tp.totalPayment, 0)
  const totalClasses = teacherPayments.reduce((sum, tp) => sum + tp.totalClasses, 0)

  // Incentivos pagados
  const incentives = await db.teacherIncentive.aggregate({
    where: {
      paid: true,
      paidAt: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { bonusAmount: true },
  })

  // Proyección
  const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1
  const daysPassed = differenceInDays(now, currentMonthStart) + 1
  const projectionMultiplier = daysInMonth / daysPassed

  return {
    monthlyExpenses,
    teacherPayments,
    totalExpenses,
    projectedExpenses: Math.round(totalExpenses * projectionMultiplier * 100) / 100,
    averageCostPerClass: totalClasses > 0 ? Math.round((totalExpenses / totalClasses) * 100) / 100 : 0,
    totalIncentives: incentives._sum.bonusAmount || 0,
  }
}

// =============================================
// ANÁLISIS DE PRODUCTOS Y PLANES
// =============================================

export async function getProductAnalytics(): Promise<ProductAnalytics> {
  const now = new Date()
  const _currentMonthStart = startOfMonth(now)
  const previousMonthStart = startOfMonth(subMonths(now, 1))
  const previousMonthEnd = endOfMonth(subMonths(now, 1))

  // Ventas por producto
  const productSales = await db.invoiceItem.groupBy({
    by: ['productId'],
    where: {
      productId: { not: null },
      invoice: { status: 'PAID' },
    },
    _sum: { total: true },
    _count: true,
  })

  const products = await db.product.findMany({
    where: { id: { in: productSales.filter(p => p.productId).map(p => p.productId!) } },
    select: { id: true, name: true, image: true },
  })

  const productMap = new Map<string, typeof products[0]>(products.map(p => [p.id, p]))

  // Ventas del mes anterior para calcular tendencia
  const previousProductSales = await db.invoiceItem.groupBy({
    by: ['productId'],
    where: {
      productId: { not: null },
      invoice: { 
        status: 'PAID',
        paidAt: { gte: previousMonthStart, lte: previousMonthEnd },
      },
    },
    _sum: { total: true },
  })

  const previousSalesMap = new Map<string | null, number>(previousProductSales.map(p => [p.productId, p._sum.total || 0]))

  const topProducts: ProductSales[] = productSales
    .filter(p => p.productId)
    .map(p => {
      const product = productMap.get(p.productId!)
      const previousSales = previousSalesMap.get(p.productId!) || 0
      const currentSales = p._sum.total || 0
      const trend = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0

      return {
        productId: p.productId!,
        productName: product?.name || 'Producto desconocido',
        productImage: product?.image || null,
        totalSales: p._count,
        revenue: currentSales,
        trend: Math.round(trend * 10) / 10,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // Distribución por plan
  const planSales = await db.invoiceItem.groupBy({
    by: ['planId'],
    where: {
      planId: { not: null },
      invoice: { status: 'PAID' },
    },
    _sum: { total: true },
    _count: true,
  })

  const plans = await db.plan.findMany({
    where: { id: { in: planSales.filter(p => p.planId).map(p => p.planId!) } },
    include: { product: { select: { name: true } } },
  })

  const planMap = new Map<string, typeof plans[0]>(plans.map(p => [p.id, p]))
  const totalPlanSales = planSales.reduce((sum, p) => sum + p._count, 0)

  const planDistribution: PlanSales[] = planSales
    .filter(p => p.planId)
    .map(p => {
      const plan = planMap.get(p.planId!)
      return {
        planId: p.planId!,
        planName: plan?.name || 'Plan desconocido',
        productName: plan?.product?.name || 'Sin producto',
        totalSales: p._count,
        revenue: p._sum.total || 0,
        conversionRate: totalPlanSales > 0 ? Math.round((p._count / totalPlanSales) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.totalSales - a.totalSales)

  // Inscripciones por curso
  const enrollments = await db.enrollment.groupBy({
    by: ['courseId', 'status'],
    _count: true,
  })

  const courseIds = Array.from(new Set(enrollments.map(e => e.courseId)))
  const courses = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true, language: true },
  })

  const courseMap = new Map<string, typeof courses[0]>(courses.map(c => [c.id, c]))
  const courseEnrollmentMap = new Map<string, CourseEnrollments>()

  for (const e of enrollments) {
    if (!courseEnrollmentMap.has(e.courseId)) {
      const course = courseMap.get(e.courseId)
      courseEnrollmentMap.set(e.courseId, {
        courseId: e.courseId,
        courseTitle: course?.title || 'Curso desconocido',
        courseLanguage: course?.language || 'unknown',
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
      })
    }
    const ce = courseEnrollmentMap.get(e.courseId)!
    ce.totalEnrollments += e._count
    if (e.status === 'ACTIVE') ce.activeEnrollments += e._count
    if (e.status === 'COMPLETED') ce.completedEnrollments += e._count
  }

  const courseEnrollments = Array.from(courseEnrollmentMap.values())
    .sort((a, b) => b.totalEnrollments - a.totalEnrollments)

  // Tendencia de ventas (últimos 30 días)
  const thirtyDaysAgo = subMonths(now, 1)
  const dailySales = await db.invoice.groupBy({
    by: ['paidAt'],
    where: {
      status: 'PAID',
      paidAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  })

  const salesTrend = dailySales
    .filter(s => s.paidAt)
    .map(s => ({
      date: format(s.paidAt!, 'dd/MM'),
      sales: s._count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    topProducts,
    planDistribution,
    courseEnrollments,
    salesTrend,
  }
}

// =============================================
// ANÁLISIS DE PROFESORES
// =============================================

export async function getTeacherAnalytics(): Promise<TeacherAnalytics> {
  const now = new Date()
  const threeMonthsAgo = subMonths(now, 3)
  const BASE_RATE_PER_HOUR = 10

  // Obtener todos los profesores activos
  const teachers = await db.user.findMany({
    where: {
      roles: { has: UserRole.TEACHER },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      image: true,
      teacherRank: { select: { name: true, rateMultiplier: true } },
    },
  })

  // Obtener clases de los últimos 3 meses
  const classes = await db.classBooking.findMany({
    where: {
      teacherId: { in: teachers.map(t => t.id) },
      day: { gte: format(threeMonthsAgo, 'yyyy-MM-dd') },
    },
    include: {
      attendances: { select: { status: true } },
      teacherAttendances: { select: { status: true } },
      enrollment: {
        select: {
          course: { select: { classDuration: true, defaultPaymentPerClass: true } },
        },
      },
      videoCalls: { select: { duration: true } },
    },
  })

  // Estudiantes únicos por profesor
  const studentsByTeacher = await db.classBooking.groupBy({
    by: ['teacherId', 'studentId'],
    where: {
      teacherId: { in: teachers.map(t => t.id) },
      status: BookingStatus.COMPLETED,
    },
  })

  const uniqueStudentsMap = new Map<string, Set<string>>()
  for (const s of studentsByTeacher) {
    if (!uniqueStudentsMap.has(s.teacherId)) {
      uniqueStudentsMap.set(s.teacherId, new Set())
    }
    uniqueStudentsMap.get(s.teacherId)!.add(s.studentId)
  }

  // Calcular estadísticas por profesor
  const teacherStatsMap = new Map<string, TeacherStats>()

  for (const teacher of teachers) {
    teacherStatsMap.set(teacher.id, {
      teacherId: teacher.id,
      teacherName: `${teacher.name} ${teacher.lastName || ''}`.trim(),
      teacherImage: teacher.image,
      teacherRank: teacher.teacherRank?.name || null,
      totalClasses: 0,
      completedClasses: 0,
      cancelledClasses: 0,
      noShowClasses: 0,
      attendanceRate: 0,
      totalHours: 0,
      totalEarnings: 0,
      uniqueStudents: uniqueStudentsMap.get(teacher.id)?.size || 0,
      averageClassDuration: 0,
    })
  }

  for (const classBooking of classes) {
    const stats = teacherStatsMap.get(classBooking.teacherId)
    if (!stats) continue

    stats.totalClasses += 1

    if (classBooking.status === 'COMPLETED') {
      stats.completedClasses += 1
      
      const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
      const hasStudentAttendance = classBooking.attendances.length > 0
      
      if (hasTeacherAttendance && hasStudentAttendance) {
        const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
        stats.totalHours += duration / 60
        
        const teacher = teachers.find(t => t.id === classBooking.teacherId)
        const rateMultiplier = teacher?.teacherRank?.rateMultiplier || 1.0
        const paymentPerClass = classBooking.enrollment.course.defaultPaymentPerClass
        
        if (paymentPerClass) {
          stats.totalEarnings += paymentPerClass * rateMultiplier
        } else {
          stats.totalEarnings += (duration / 60) * BASE_RATE_PER_HOUR * rateMultiplier
        }
      }
    } else if (classBooking.status === 'CANCELLED') {
      stats.cancelledClasses += 1
    } else if (classBooking.status === 'NO_SHOW') {
      stats.noShowClasses += 1
    }
  }

  // Calcular promedios y tasas
  const allStats = Array.from(teacherStatsMap.values()).map(stats => ({
    ...stats,
    attendanceRate: stats.totalClasses > 0 
      ? Math.round((stats.completedClasses / stats.totalClasses) * 1000) / 10 
      : 0,
    totalHours: Math.round(stats.totalHours * 10) / 10,
    totalEarnings: Math.round(stats.totalEarnings * 100) / 100,
    averageClassDuration: stats.completedClasses > 0 
      ? Math.round((stats.totalHours * 60 / stats.completedClasses) * 10) / 10 
      : 0,
  }))

  // Rankings
  const byClasses = [...allStats].sort((a, b) => b.completedClasses - a.completedClasses)
  const byEarnings = [...allStats].sort((a, b) => b.totalEarnings - a.totalEarnings)
  const byStudents = [...allStats].sort((a, b) => b.uniqueStudents - a.uniqueStudents)
  const mostActive = byClasses.slice(0, 10)
  const leastActive = [...allStats]
    .filter(t => t.totalClasses > 0)
    .sort((a, b) => a.completedClasses - b.completedClasses)
    .slice(0, 10)

  const activeTeachers = allStats.filter(t => t.totalClasses > 0).length
  const totalClasses = allStats.reduce((sum, t) => sum + t.completedClasses, 0)
  const totalEarnings = allStats.reduce((sum, t) => sum + t.totalEarnings, 0)

  return {
    ranking: {
      byClasses,
      byEarnings,
      byStudents,
      mostActive,
      leastActive,
    },
    totalTeachers: teachers.length,
    activeTeachers,
    averageClassesPerTeacher: activeTeachers > 0 ? Math.round((totalClasses / activeTeachers) * 10) / 10 : 0,
    averageEarningsPerTeacher: activeTeachers > 0 ? Math.round((totalEarnings / activeTeachers) * 100) / 100 : 0,
  }
}

// =============================================
// ANÁLISIS DE ESTUDIANTES
// =============================================

export async function getStudentAnalytics(months: number = 12): Promise<StudentAnalytics> {
  const now = new Date()
  const _startDate = startOfMonth(subMonths(now, months - 1))

  // Crecimiento mensual
  const growth: StudentGrowth[] = []
  
  for (let i = 0; i < months; i++) {
    const date = subMonths(now, months - 1 - i)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const newStudents = await db.user.count({
      where: {
        roles: { has: UserRole.STUDENT },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    })

    const totalStudents = await db.user.count({
      where: {
        roles: { has: UserRole.STUDENT },
        createdAt: { lte: monthEnd },
      },
    })

    // Estudiantes que dejaron de tener clases (churn aproximado)
    const previousMonthEnd = endOfMonth(subMonths(date, 1))
    const activeLastMonth = await db.classBooking.groupBy({
      by: ['studentId'],
      where: {
        status: BookingStatus.COMPLETED,
        day: { 
          gte: format(startOfMonth(subMonths(date, 1)), 'yyyy-MM-dd'), 
          lte: format(previousMonthEnd, 'yyyy-MM-dd') 
        },
      },
    })

    const activeThisMonth = await db.classBooking.groupBy({
      by: ['studentId'],
      where: {
        status: BookingStatus.COMPLETED,
        day: { gte: format(monthStart, 'yyyy-MM-dd'), lte: format(monthEnd, 'yyyy-MM-dd') },
      },
    })

    const thisMonthIds = new Set(activeThisMonth.map(s => s.studentId))
    const churned = activeLastMonth.filter(s => !thisMonthIds.has(s.studentId)).length

    growth.push({
      month: getMonthName(date),
      year: date.getFullYear(),
      newStudents,
      totalStudents,
      churnedStudents: churned,
    })
  }

  // Tasa de retención y churn (último mes)
  const lastMonth = growth[growth.length - 1]
  const previousMonth = growth[growth.length - 2]
  
  const retentionRate = previousMonth && previousMonth.totalStudents > 0
    ? Math.round(((previousMonth.totalStudents - lastMonth.churnedStudents) / previousMonth.totalStudents) * 1000) / 10
    : 100

  const churnRate = 100 - retentionRate

  // Estudiantes más activos (últimos 30 días)
  const thirtyDaysAgo = subMonths(now, 1)
  
  const activeStudents = await db.classBooking.groupBy({
    by: ['studentId'],
    where: {
      status: BookingStatus.COMPLETED,
      day: { gte: format(thirtyDaysAgo, 'yyyy-MM-dd') },
    },
    _count: true,
    orderBy: { _count: { studentId: 'desc' } },
    take: 10,
  })

  const studentIds = activeStudents.map(s => s.studentId)
  const students = await db.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true, lastName: true, image: true, createdAt: true },
  })

  const enrollments = await db.enrollment.findMany({
    where: { studentId: { in: studentIds }, status: 'ACTIVE' },
    include: { course: { select: { title: true } } },
  })

  const lastClasses = await db.classBooking.findMany({
    where: { 
      studentId: { in: studentIds },
      status: BookingStatus.COMPLETED,
    },
    orderBy: { day: 'desc' },
    distinct: ['studentId'],
  })

  const studentMap = new Map<string, typeof students[0]>(students.map(s => [s.id, s]))
  const enrollmentMap = new Map<string, typeof enrollments[0]>(enrollments.map(e => [e.studentId, e]))
  const lastClassMap = new Map<string, typeof lastClasses[0]>(lastClasses.map(c => [c.studentId, c]))

  const mostActive: StudentActivity[] = activeStudents.map(s => {
    const student = studentMap.get(s.studentId)
    const enrollment = enrollmentMap.get(s.studentId)
    const lastClass = lastClassMap.get(s.studentId)

    return {
      studentId: s.studentId,
      studentName: student ? `${student.name} ${student.lastName || ''}`.trim() : 'Estudiante',
      studentImage: student?.image || null,
      totalClasses: s._count,
      completedClasses: s._count,
      lastClassDate: lastClass?.day || null,
      enrollmentDate: student?.createdAt ? format(student.createdAt, 'yyyy-MM-dd') : '',
      courseName: enrollment?.course.title || 'Sin curso activo',
      progress: enrollment?.progress || 0,
    }
  })

  // Estudiantes inactivos (sin clases en los últimos 30 días pero con inscripción activa)
  const allActiveEnrollments = await db.enrollment.findMany({
    where: { status: 'ACTIVE' },
    include: {
      student: { select: { id: true, name: true, lastName: true, image: true, createdAt: true } },
      course: { select: { title: true } },
    },
  })

  const recentActiveStudentIds = new Set(activeStudents.map(s => s.studentId))
  
  const inactiveEnrollments = allActiveEnrollments.filter(e => !recentActiveStudentIds.has(e.studentId))

  const inactiveStudentClasses = await db.classBooking.findMany({
    where: {
      studentId: { in: inactiveEnrollments.map(e => e.studentId) },
      status: BookingStatus.COMPLETED,
    },
    orderBy: { day: 'desc' },
    distinct: ['studentId'],
  })

  const inactiveLastClassMap = new Map<string, typeof inactiveStudentClasses[0]>(inactiveStudentClasses.map(c => [c.studentId, c]))

  const inactive: StudentActivity[] = inactiveEnrollments.slice(0, 10).map(e => ({
    studentId: e.studentId,
    studentName: `${e.student.name} ${e.student.lastName || ''}`.trim(),
    studentImage: e.student.image,
    totalClasses: 0,
    completedClasses: 0,
    lastClassDate: inactiveLastClassMap.get(e.studentId)?.day || null,
    enrollmentDate: format(e.student.createdAt, 'yyyy-MM-dd'),
    courseName: e.course.title,
    progress: e.progress,
  }))

  // Totales
  const totalStudents = await db.user.count({
    where: { roles: { has: UserRole.STUDENT } },
  })

  const totalActiveStudents = await db.enrollment.groupBy({
    by: ['studentId'],
    where: { status: 'ACTIVE' },
  })

  const newThisMonth = await db.user.count({
    where: {
      roles: { has: UserRole.STUDENT },
      createdAt: { gte: startOfMonth(now) },
    },
  })

  // Lifetime promedio (días desde primera inscripción hasta última clase)
  // Se puede calcular mejor con más datos históricos
  const _lifetimeData = await db.enrollment.aggregate({
    _avg: {
      progress: true,
    },
  })

  return {
    growth,
    retentionRate,
    churnRate,
    averageLifetime: 180, // Aproximado, se puede calcular mejor con más datos
    mostActive,
    inactive,
    totalStudents,
    activeStudents: totalActiveStudents.length,
    newThisMonth,
  }
}

// =============================================
// PROYECCIONES Y FORECASTING
// =============================================

export async function getProjectionAnalytics(): Promise<ProjectionAnalytics> {
  const now = new Date()
  
  // Obtener datos históricos de los últimos 12 meses
  const revenueAnalytics = await getRevenueAnalytics(12)
  const expenseAnalytics = await getExpenseAnalytics(12)
  const studentAnalytics = await getStudentAnalytics(12)

  // Calcular tendencia promedio
  const monthlyRevenues = revenueAnalytics.monthlyRevenue.map(m => m.revenue)
  const monthlyExpenses = expenseAnalytics.monthlyExpenses.map(m => m.totalPayments)
  const monthlyStudents = studentAnalytics.growth.map(g => g.newStudents)

  const avgRevenueGrowth = calculateAverageGrowth(monthlyRevenues)
  const avgExpenseGrowth = calculateAverageGrowth(monthlyExpenses)
  const avgStudentGrowth = calculateAverageGrowth(monthlyStudents)

  // Proyecciones para los próximos 3 meses
  const projections: Projection[] = []
  const lastRevenue = monthlyRevenues[monthlyRevenues.length - 1] || 0
  const lastExpense = monthlyExpenses[monthlyExpenses.length - 1] || 0
  const lastStudents = monthlyStudents[monthlyStudents.length - 1] || 0

  for (let i = 1; i <= 3; i++) {
    const date = new Date(now)
    date.setMonth(date.getMonth() + i)
    
    const projectedRevenue = lastRevenue * Math.pow(1 + avgRevenueGrowth / 100, i)
    const projectedExpenses = lastExpense * Math.pow(1 + avgExpenseGrowth / 100, i)
    const projectedStudents = Math.round(lastStudents * Math.pow(1 + avgStudentGrowth / 100, i))

    projections.push({
      month: getMonthName(date),
      year: date.getFullYear(),
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      projectedExpenses: Math.round(projectedExpenses * 100) / 100,
      projectedNetMargin: Math.round((projectedRevenue - projectedExpenses) * 100) / 100,
      projectedStudents,
      confidence: Math.max(50, 90 - (i * 10)), // Confianza decrece con el tiempo
    })
  }

  // Estacionalidad (promedio por mes del año)
  const seasonalityMap = new Map<number, { revenues: number[], students: number[] }>()
  
  for (let i = 0; i < 12; i++) {
    seasonalityMap.set(i, { revenues: [], students: [] })
  }

  revenueAnalytics.monthlyRevenue.forEach((m, idx) => {
    const monthIdx = (now.getMonth() - (11 - idx) + 12) % 12
    seasonalityMap.get(monthIdx)?.revenues.push(m.revenue)
  })

  studentAnalytics.growth.forEach((g, idx) => {
    const monthIdx = (now.getMonth() - (11 - idx) + 12) % 12
    seasonalityMap.get(monthIdx)?.students.push(g.newStudents)
  })

  const seasonality: Seasonality[] = []
  const allAvgRevenues: number[] = []

  for (let i = 0; i < 12; i++) {
    const data = seasonalityMap.get(i)!
    const avgRevenue = data.revenues.length > 0 
      ? data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length 
      : 0
    const avgStudents = data.students.length > 0 
      ? data.students.reduce((a, b) => a + b, 0) / data.students.length 
      : 0
    
    allAvgRevenues.push(avgRevenue)
    
    const monthDate = new Date(now.getFullYear(), i, 1)
    seasonality.push({
      month: getMonthNameFull(monthDate),
      averageRevenue: Math.round(avgRevenue * 100) / 100,
      averageStudents: Math.round(avgStudents * 10) / 10,
      isHighSeason: false, // Se calculará después
    })
  }

  // Marcar meses de alta temporada (por encima del promedio)
  const overallAvgRevenue = allAvgRevenues.reduce((a, b) => a + b, 0) / 12
  seasonality.forEach(s => {
    s.isHighSeason = s.averageRevenue > overallAvgRevenue * 1.1
  })

  // Alertas de tendencias
  const alerts: TrendAlert[] = []

  // Alerta de ingresos
  if (avgRevenueGrowth < -5) {
    alerts.push({
      type: 'danger',
      metric: 'Ingresos',
      message: 'Los ingresos están disminuyendo significativamente',
      change: avgRevenueGrowth,
      recommendation: 'Revisar estrategia de precios y promociones',
    })
  } else if (avgRevenueGrowth < 0) {
    alerts.push({
      type: 'warning',
      metric: 'Ingresos',
      message: 'Los ingresos muestran una tendencia a la baja',
      change: avgRevenueGrowth,
      recommendation: 'Considerar campañas de marketing',
    })
  }

  // Alerta de gastos
  if (avgExpenseGrowth > avgRevenueGrowth + 5) {
    alerts.push({
      type: 'warning',
      metric: 'Gastos',
      message: 'Los gastos crecen más rápido que los ingresos',
      change: avgExpenseGrowth,
      recommendation: 'Optimizar costos operativos',
    })
  }

  // Alerta de estudiantes
  if (avgStudentGrowth < 0) {
    alerts.push({
      type: 'warning',
      metric: 'Estudiantes',
      message: 'El número de nuevos estudiantes está disminuyendo',
      change: avgStudentGrowth,
      recommendation: 'Fortalecer estrategias de adquisición',
    })
  }

  // Alerta de retención
  if (studentAnalytics.churnRate > 20) {
    alerts.push({
      type: 'danger',
      metric: 'Retención',
      message: `Tasa de abandono alta: ${studentAnalytics.churnRate}%`,
      change: -studentAnalytics.churnRate,
      recommendation: 'Implementar programa de retención de estudiantes',
    })
  }

  // Crecimiento año vs año
  // Aproximación basada en tendencia promedio
  const yearOverYearGrowth = avgRevenueGrowth * 12

  return {
    projections,
    seasonality,
    alerts,
    yearOverYearGrowth: Math.round(yearOverYearGrowth * 10) / 10,
  }
}

// =============================================
// COMPARACIÓN HISTÓRICA
// =============================================

export async function getHistoricalComparison(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
): Promise<HistoricalComparison> {
  // Período actual
  const currentRevenue = await db.invoice.aggregate({
    where: {
      status: 'PAID',
      paidAt: { gte: currentStart, lte: currentEnd },
    },
    _sum: { total: true },
  })

  const currentExpenses = await calculateMonthlyTeacherPayments(currentStart, currentEnd)

  const currentStudents = await db.user.count({
    where: {
      roles: { has: UserRole.STUDENT },
      createdAt: { gte: currentStart, lte: currentEnd },
    },
  })

  const currentClasses = await db.classBooking.count({
    where: {
      status: BookingStatus.COMPLETED,
      day: { gte: format(currentStart, 'yyyy-MM-dd'), lte: format(currentEnd, 'yyyy-MM-dd') },
    },
  })

  // Período anterior
  const previousRevenue = await db.invoice.aggregate({
    where: {
      status: 'PAID',
      paidAt: { gte: previousStart, lte: previousEnd },
    },
    _sum: { total: true },
  })

  const previousExpenses = await calculateMonthlyTeacherPayments(previousStart, previousEnd)

  const previousStudents = await db.user.count({
    where: {
      roles: { has: UserRole.STUDENT },
      createdAt: { gte: previousStart, lte: previousEnd },
    },
  })

  const previousClasses = await db.classBooking.count({
    where: {
      status: BookingStatus.COMPLETED,
      day: { gte: format(previousStart, 'yyyy-MM-dd'), lte: format(previousEnd, 'yyyy-MM-dd') },
    },
  })

  const current = {
    revenue: currentRevenue._sum.total || 0,
    expenses: currentExpenses,
    students: currentStudents,
    classes: currentClasses,
  }

  const previous = {
    revenue: previousRevenue._sum.total || 0,
    expenses: previousExpenses,
    students: previousStudents,
    classes: previousClasses,
  }

  return {
    currentPeriod: current,
    previousPeriod: previous,
    changes: {
      revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      expenses: previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0,
      students: previous.students > 0 ? ((current.students - previous.students) / previous.students) * 100 : 0,
      classes: previous.classes > 0 ? ((current.classes - previous.classes) / previous.classes) * 100 : 0,
    },
  }
}

// =============================================
// HELPERS PRIVADOS
// =============================================

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    paypal: 'PayPal',
    creditCard: 'Tarjeta de Crédito',
    niubiz: 'Niubiz',
    bankTransfer: 'Transferencia Bancaria',
    unknown: 'Desconocido',
  }
  return labels[method] || method
}

function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    en: 'Inglés 🇺🇸',
    es: 'Español 🇪🇸',
    unknown: 'Desconocido',
  }
  return labels[language] || language
}

function calculateAverageGrowth(values: number[]): number {
  if (values.length < 2) return 0
  
  let totalGrowth = 0
  let count = 0
  
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      totalGrowth += ((values[i] - values[i - 1]) / values[i - 1]) * 100
      count++
    }
  }
  
  return count > 0 ? Math.round((totalGrowth / count) * 10) / 10 : 0
}
