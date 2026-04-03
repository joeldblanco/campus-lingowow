'use server'

import { db } from '@/lib/db'
import { BookingStatus, Prisma } from '@prisma/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export interface TeacherPaymentFilters {
  startDate?: Date
  endDate?: Date
  teacherId?: string
  periodId?: string
}

export interface TeacherPaymentDetail {
  teacherId: string
  teacherName: string
  teacherEmail: string
  teacherImage: string | null
  rankName: string | null
  rateMultiplier: number
  totalClasses: number
  totalHours: number
  totalPayment: number
  averagePerClass: number
  paymentMethod?: string
  paymentDetails?: string
  paymentConfirmed: boolean
  paymentConfirmedAt?: Date
  classes: PayableClass[]
}

export interface PayableClass {
  id: string
  day: string
  timeSlot: string
  studentName: string
  courseName: string
  duration: number
  payment: number
  isPayable: boolean
  completedAt: string | null
  academicPeriodId: string | null
  academicPeriodName: string | null
  teacherAttendanceTime: string | null
  studentAttendanceTime: string | null
}

export interface PaymentPeriodSummary {
  totalTeachers: number
  totalClasses: number
  totalHours: number
  totalPayment: number
  averagePaymentPerTeacher: number
  averagePaymentPerClass: number
  totalCompletedClasses: number
  totalPayableClasses: number
  totalNonPayableClasses: number
}

export interface TeacherPaymentsReport {
  summary: PaymentPeriodSummary
  teacherReports: TeacherPaymentDetail[]
  filters: {
    teacherId: string | null
    startDate: string | null
    endDate: string | null
    periodId: string | null
  }
}

const BASE_RATE_PER_HOUR = 10

const paymentClassBookingArgs = Prisma.validator<Prisma.ClassBookingDefaultArgs>()({
  include: {
    teacher: {
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
        paymentSettings: true,
        teacherRank: {
          select: {
            name: true,
            rateMultiplier: true,
          },
        },
      },
    },
    student: {
      select: {
        name: true,
        lastName: true,
      },
    },
    enrollment: {
      select: {
        course: {
          select: {
            id: true,
            title: true,
            classDuration: true,
            defaultPaymentPerClass: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    teacherAttendances: {
      select: {
        timestamp: true,
      },
    },
    attendances: {
      select: {
        timestamp: true,
      },
    },
    videoCalls: {
      select: {
        duration: true,
      },
    },
  },
})

type PaymentClassBooking = Prisma.ClassBookingGetPayload<typeof paymentClassBookingArgs>

async function resolvePaymentFilterContext(filters: TeacherPaymentFilters) {
  const whereClause: Prisma.ClassBookingWhereInput = {
    status: BookingStatus.COMPLETED,
  }

  let start: Date
  let end: Date

  if (filters.periodId) {
    whereClause.enrollment = { academicPeriodId: filters.periodId }

    const period = await db.academicPeriod.findUnique({
      where: { id: filters.periodId },
      select: { startDate: true, endDate: true },
    })

    start = period?.startDate || startOfMonth(new Date())
    end = period?.endDate || endOfMonth(new Date())
  } else {
    start = filters.startDate || startOfMonth(new Date())
    end = filters.endDate || endOfMonth(new Date())
    whereClause.day = {
      gte: format(start, 'yyyy-MM-dd'),
      lte: format(end, 'yyyy-MM-dd'),
    }
  }

  if (filters.teacherId) {
    whereClause.teacherId = filters.teacherId
  }

  return {
    whereClause,
    start,
    end,
  }
}

async function getTeacherCoursePaymentMap() {
  const teacherCourses = await db.teacherCourse.findMany({
    select: {
      teacherId: true,
      courseId: true,
      paymentPerClass: true,
    },
  })

  return new Map(teacherCourses.map((tc) => [`${tc.teacherId}-${tc.courseId}`, tc.paymentPerClass]))
}

function isPayableClass(classBooking: Pick<PaymentClassBooking, 'isPayable' | 'teacherAttendances'>) {
  return classBooking.isPayable || classBooking.teacherAttendances.length > 0
}

function getClassDuration(classBooking: Pick<PaymentClassBooking, 'videoCalls' | 'enrollment'>) {
  return classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
}

function calculateClassEarnings(
  classBooking: Pick<PaymentClassBooking, 'teacherId' | 'teacher' | 'enrollment' | 'videoCalls'>,
  teacherCoursePayments: Map<string, number | null>
) {
  const duration = getClassDuration(classBooking)
  const hours = duration / 60
  const courseId = classBooking.enrollment.course.id
  const teacherPayment = teacherCoursePayments.get(`${classBooking.teacherId}-${courseId}`)
  const defaultPayment = classBooking.enrollment.course.defaultPaymentPerClass

  if (teacherPayment !== null && teacherPayment !== undefined) {
    return teacherPayment
  }

  if (defaultPayment !== null && defaultPayment !== undefined) {
    return defaultPayment
  }

  const rankMultiplier = classBooking.teacher.teacherRank?.rateMultiplier || 1.0
  return hours * BASE_RATE_PER_HOUR * rankMultiplier
}

async function getPaymentConfirmationMap(teacherIds: string[], start: Date, end: Date) {
  if (teacherIds.length === 0) {
    return new Map<string, { confirmed: boolean; confirmedAt?: Date }>()
  }

  const confirmations = await db.teacherPaymentConfirmation.findMany({
    where: {
      teacherId: { in: teacherIds },
      periodStart: start,
      periodEnd: end,
    },
    select: {
      teacherId: true,
      confirmedAt: true,
    },
    orderBy: {
      confirmedAt: 'desc',
    },
  })

  return new Map(
    confirmations.map((confirmation) => [
      confirmation.teacherId,
      {
        confirmed: true,
        confirmedAt: confirmation.confirmedAt,
      },
    ])
  )
}

export async function getTeacherPaymentsReport(
  filters: TeacherPaymentFilters = {}
): Promise<TeacherPaymentsReport> {
  const { whereClause, start, end } = await resolvePaymentFilterContext(filters)

  const [completedClasses, teacherCoursePayments] = await Promise.all([
    db.classBooking.findMany({
      where: whereClause,
      ...paymentClassBookingArgs,
      orderBy: {
        day: 'desc',
      },
    }),
    getTeacherCoursePaymentMap(),
  ])

  const payableClasses = completedClasses.filter(isPayableClass)
  const confirmationMap = await getPaymentConfirmationMap(
    Array.from(new Set(payableClasses.map((classBooking) => classBooking.teacherId))),
    start,
    end
  )

  const teacherPaymentMap = new Map<string, TeacherPaymentDetail>()
  let totalHours = 0
  let totalPayment = 0

  for (const classBooking of payableClasses) {
    const teacher = classBooking.teacher

    if (!teacherPaymentMap.has(teacher.id)) {
      const paymentInfo = getPaymentMethodInfo(teacher.paymentSettings)
      const confirmationInfo = confirmationMap.get(teacher.id)

      teacherPaymentMap.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: `${teacher.name} ${teacher.lastName || ''}`.trim(),
        teacherEmail: teacher.email || '',
        teacherImage: teacher.image,
        rankName: teacher.teacherRank?.name || null,
        rateMultiplier: teacher.teacherRank?.rateMultiplier || 1.0,
        totalClasses: 0,
        totalHours: 0,
        totalPayment: 0,
        averagePerClass: 0,
        paymentMethod: paymentInfo.paymentMethod,
        paymentDetails: paymentInfo.paymentDetails,
        paymentConfirmed: confirmationInfo?.confirmed || false,
        paymentConfirmedAt: confirmationInfo?.confirmedAt,
        classes: [],
      })
    }

    const teacherPayment = teacherPaymentMap.get(teacher.id)

    if (!teacherPayment) {
      continue
    }

    const duration = getClassDuration(classBooking)
    const classEarnings = calculateClassEarnings(classBooking, teacherCoursePayments)
    const roundedClassEarnings = Math.round(classEarnings * 100) / 100
    const hours = duration / 60

    teacherPayment.totalClasses += 1
    teacherPayment.totalHours += hours
    teacherPayment.totalPayment += roundedClassEarnings
    teacherPayment.classes.push({
      id: classBooking.id,
      day: classBooking.day,
      timeSlot: classBooking.timeSlot,
      studentName: `${classBooking.student.name} ${classBooking.student.lastName || ''}`.trim(),
      courseName: classBooking.enrollment.course.title,
      duration,
      payment: roundedClassEarnings,
      isPayable: classBooking.isPayable,
      completedAt: classBooking.completedAt?.toISOString() || null,
      academicPeriodId: classBooking.enrollment.academicPeriod?.id || null,
      academicPeriodName: classBooking.enrollment.academicPeriod?.name || null,
      teacherAttendanceTime: classBooking.teacherAttendances[0]?.timestamp?.toISOString() || null,
      studentAttendanceTime: classBooking.attendances[0]?.timestamp?.toISOString() || null,
    })

    totalHours += hours
    totalPayment += roundedClassEarnings
  }

  const teacherReports = Array.from(teacherPaymentMap.values())
    .map((teacherPayment) => ({
      ...teacherPayment,
      totalHours: Math.round(teacherPayment.totalHours * 10) / 10,
      totalPayment: Math.round(teacherPayment.totalPayment * 100) / 100,
      averagePerClass:
        teacherPayment.totalClasses > 0
          ? Math.round((teacherPayment.totalPayment / teacherPayment.totalClasses) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalPayment - a.totalPayment)

  const summary: PaymentPeriodSummary = {
    totalTeachers: teacherReports.length,
    totalClasses: payableClasses.length,
    totalHours: Math.round(totalHours * 10) / 10,
    totalPayment: Math.round(totalPayment * 100) / 100,
    averagePaymentPerTeacher:
      teacherReports.length > 0 ? Math.round((totalPayment / teacherReports.length) * 100) / 100 : 0,
    averagePaymentPerClass:
      payableClasses.length > 0 ? Math.round((totalPayment / payableClasses.length) * 100) / 100 : 0,
    totalCompletedClasses: completedClasses.length,
    totalPayableClasses: payableClasses.length,
    totalNonPayableClasses: completedClasses.length - payableClasses.length,
  }

  return {
    summary,
    teacherReports,
    filters: {
      teacherId: filters.teacherId || null,
      startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
      endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
      periodId: filters.periodId || null,
    },
  }
}

/**
 * Obtiene el resumen de pagos para un período específico
 */
export async function getPaymentPeriodSummary(
  startDate?: Date,
  endDate?: Date,
  periodId?: string
): Promise<PaymentPeriodSummary> {
  const report = await getTeacherPaymentsReport({
    startDate,
    endDate,
    periodId,
  })

  return report.summary
}

/**
 * Procesa los settings de pago de un profesor para obtener método y detalles
 */
function getPaymentMethodInfo(paymentSettings: string | null) {
  if (!paymentSettings) {
    return { paymentMethod: 'No configurado', paymentDetails: null }
  }

  try {
    const settings = JSON.parse(paymentSettings)
    const methodMap = {
      bank_transfer: 'Transferencia Bancaria',
      binance: 'Binance',
      paypal: 'PayPal',
      pago_movil: 'Pago Móvil',
    }

    const paymentMethod =
      methodMap[settings.paymentMethod as keyof typeof methodMap] || settings.paymentMethod

    let paymentDetails = null
    switch (settings.paymentMethod) {
      case 'bank_transfer':
        const details = []
        if (settings.bankName) details.push(settings.bankName)
        if (settings.bankAccountHolder) details.push(`Titular: ${settings.bankAccountHolder}`)
        if (settings.bankAccountNumber) details.push(`Cta: ${settings.bankAccountNumber}`)
        if (settings.bankRoutingNumber) details.push(`CCI: ${settings.bankRoutingNumber}`)
        paymentDetails = details.join(' - ')
        break
      case 'paypal':
        paymentDetails = settings.paypalEmail
        break
      case 'binance':
        const binanceDetails = []
        if (settings.binanceEmail) binanceDetails.push(`Email: ${settings.binanceEmail}`)
        if (settings.binanceId) binanceDetails.push(`ID: ${settings.binanceId}`)
        paymentDetails = binanceDetails.join(' - ')
        break
      case 'pago_movil':
        const pmDetails = []
        if (settings.pmBankName) pmDetails.push(settings.pmBankName)
        if (settings.pmPhoneNumber) pmDetails.push(`Tel: ${settings.pmPhoneNumber}`)
        if (settings.pmIdNumber) pmDetails.push(`CI: ${settings.pmIdNumber}`)
        paymentDetails = pmDetails.join(' - ')
        break
    }

    return { paymentMethod, paymentDetails }
  } catch (error) {
    console.error('Error parsing payment settings:', error)
    return { paymentMethod: 'Error', paymentDetails: null }
  }
}

/**
 * Obtiene el detalle de pagos por profesor para un período específico
 */
export async function getTeacherPaymentDetails(
  startDate?: Date,
  endDate?: Date,
  teacherId?: string,
  periodId?: string
): Promise<TeacherPaymentDetail[]> {
  const report = await getTeacherPaymentsReport({
    startDate,
    endDate,
    teacherId,
    periodId,
  })

  return report.teacherReports
}

/**
 * Marca una clase como pagable o no pagable
 */
export async function toggleClassPayable(classId: string, isPayable: boolean) {
  try {
    await db.classBooking.update({
      where: { id: classId },
      data: { isPayable },
    })

    return { success: true }
  } catch (error) {
    console.error('Error toggling class payable status:', error)
    return { success: false, error: 'Error al actualizar el estado de pago' }
  }
}

/**
 * Obtiene la lista de profesores activos
 */
export async function getActiveTeachers() {
  const teachers = await db.user.findMany({
    where: {
      roles: {
        has: 'TEACHER',
      },
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      image: true,
      teacherRank: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return teachers.map((t) => ({
    id: t.id,
    name: `${t.name} ${t.lastName || ''}`.trim(),
    email: t.email || '',
    image: t.image,
    rankName: t.teacherRank?.name || null,
  }))
}
