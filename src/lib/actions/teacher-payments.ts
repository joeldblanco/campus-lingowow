'use server'

import { db } from '@/lib/db'
import { BookingStatus, Prisma } from '@prisma/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'

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
}

export interface PaymentPeriodSummary {
  totalTeachers: number
  totalClasses: number
  totalHours: number
  totalPayment: number
  averagePaymentPerTeacher: number
  averagePaymentPerClass: number
}

const BASE_RATE_PER_HOUR = 10

/**
 * Obtiene el resumen de pagos para un período específico
 */
export async function getPaymentPeriodSummary(
  startDate?: Date,
  endDate?: Date
): Promise<PaymentPeriodSummary> {
  const start = startDate || startOfMonth(new Date())
  const end = endDate || endOfMonth(new Date())

  const completedClasses = await db.classBooking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
      day: {
        gte: format(start, 'yyyy-MM-dd'),
        lte: format(end, 'yyyy-MM-dd'),
      },
    },
    include: {
      teacher: {
        select: {
          teacherRank: {
            select: {
              rateMultiplier: true,
            },
          },
        },
      },
      enrollment: {
        select: {
          course: {
            select: {
              id: true,
              classDuration: true,
              defaultPaymentPerClass: true,
            },
          },
        },
      },
      teacherAttendances: true,
      attendances: true,
      videoCalls: {
        select: {
          duration: true,
        },
      },
    },
  })

  const teacherCourses = await db.teacherCourse.findMany({
    select: {
      teacherId: true,
      courseId: true,
      paymentPerClass: true,
    },
  })

  const teacherCoursePayments = new Map(
    teacherCourses.map((tc) => [`${tc.teacherId}-${tc.courseId}`, tc.paymentPerClass])
  )

  let totalClasses = 0
  let totalHours = 0
  let totalPayment = 0
  const teacherSet = new Set<string>()

  for (const classBooking of completedClasses) {
    const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
    const hasStudentAttendance = classBooking.attendances.length > 0

    if (!hasTeacherAttendance || !hasStudentAttendance) continue

    teacherSet.add(classBooking.teacherId)
    totalClasses++

    const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
    const hours = duration / 60
    totalHours += hours

    const courseId = classBooking.enrollment.course.id
    const teacherPayment = teacherCoursePayments.get(`${classBooking.teacherId}-${courseId}`)
    const defaultPayment = classBooking.enrollment.course.defaultPaymentPerClass

    let classEarnings: number
    if (teacherPayment !== null && teacherPayment !== undefined) {
      classEarnings = teacherPayment
    } else if (defaultPayment !== null && defaultPayment !== undefined) {
      classEarnings = defaultPayment
    } else {
      const rankMultiplier = classBooking.teacher.teacherRank?.rateMultiplier || 1.0
      classEarnings = hours * BASE_RATE_PER_HOUR * rankMultiplier
    }

    totalPayment += classEarnings
  }

  return {
    totalTeachers: teacherSet.size,
    totalClasses,
    totalHours: Math.round(totalHours * 10) / 10,
    totalPayment: Math.round(totalPayment * 100) / 100,
    averagePaymentPerTeacher: teacherSet.size > 0 ? Math.round((totalPayment / teacherSet.size) * 100) / 100 : 0,
    averagePaymentPerClass: totalClasses > 0 ? Math.round((totalPayment / totalClasses) * 100) / 100 : 0,
  }
}

/**
 * Verifica si un profesor confirmó su pago para un período específico
 */
async function checkTeacherPaymentConfirmation(teacherId: string, startDate: Date, endDate: Date) {
  try {
    const confirmation = await db.teacherPaymentConfirmation.findFirst({
      where: {
        teacherId,
        periodStart: startDate,
        periodEnd: endDate,
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    })

    return {
      confirmed: !!confirmation,
      confirmedAt: confirmation?.confirmedAt || undefined,
      status: confirmation?.status
    }
  } catch (error) {
    console.error('Error checking payment confirmation:', error)
    return { confirmed: false, confirmedAt: undefined, status: undefined }
  }
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
      pago_movil: 'Pago Móvil'
    }

    const paymentMethod = methodMap[settings.paymentMethod as keyof typeof methodMap] || settings.paymentMethod
    
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
  teacherId?: string
): Promise<TeacherPaymentDetail[]> {
  const start = startDate || startOfMonth(new Date())
  const end = endDate || endOfMonth(new Date())

  const whereClause: Prisma.ClassBookingWhereInput = {
    status: BookingStatus.COMPLETED,
    day: {
      gte: format(start, 'yyyy-MM-dd'),
      lte: format(end, 'yyyy-MM-dd'),
    },
  }

  if (teacherId) {
    whereClause.teacherId = teacherId
  }

  const completedClasses = await db.classBooking.findMany({
    where: whereClause,
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
        },
      },
      teacherAttendances: true,
      attendances: true,
      videoCalls: {
        select: {
          duration: true,
        },
      },
    },
    orderBy: {
      day: 'desc',
    },
  })

  const teacherCourses = await db.teacherCourse.findMany({
    select: {
      teacherId: true,
      courseId: true,
      paymentPerClass: true,
    },
  })

  const teacherCoursePayments = new Map(
    teacherCourses.map((tc) => [`${tc.teacherId}-${tc.courseId}`, tc.paymentPerClass])
  )

  const teacherPaymentMap = new Map<string, TeacherPaymentDetail>()

  for (const classBooking of completedClasses) {
    const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
    const hasStudentAttendance = classBooking.attendances.length > 0

    if (!hasTeacherAttendance || !hasStudentAttendance) continue

    const teacher = classBooking.teacher
    if (!teacherPaymentMap.has(teacher.id)) {
      const paymentInfo = getPaymentMethodInfo(teacher.paymentSettings)
      const confirmationInfo = await checkTeacherPaymentConfirmation(teacher.id, start, end)
      
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
        paymentConfirmed: confirmationInfo.confirmed,
        paymentConfirmedAt: confirmationInfo.confirmedAt || undefined,
        classes: [],
      })
    }

    const tp = teacherPaymentMap.get(teacher.id)!
    const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
    const hours = duration / 60

    const courseId = classBooking.enrollment.course.id
    const teacherPayment = teacherCoursePayments.get(`${teacher.id}-${courseId}`)
    const defaultPayment = classBooking.enrollment.course.defaultPaymentPerClass

    let classEarnings: number
    if (teacherPayment !== null && teacherPayment !== undefined) {
      classEarnings = teacherPayment
    } else if (defaultPayment !== null && defaultPayment !== undefined) {
      classEarnings = defaultPayment
    } else {
      const rankMultiplier = teacher.teacherRank?.rateMultiplier || 1.0
      classEarnings = hours * BASE_RATE_PER_HOUR * rankMultiplier
    }

    tp.totalClasses++
    tp.totalHours += hours
    tp.totalPayment += classEarnings
    tp.classes.push({
      id: classBooking.id,
      day: classBooking.day,
      timeSlot: classBooking.timeSlot,
      studentName: `${classBooking.student.name} ${classBooking.student.lastName || ''}`.trim(),
      courseName: classBooking.enrollment.course.title,
      duration,
      payment: Math.round(classEarnings * 100) / 100,
      isPayable: classBooking.isPayable,
      completedAt: classBooking.completedAt?.toISOString() || null,
    })
  }

  return Array.from(teacherPaymentMap.values())
    .map((tp) => ({
      ...tp,
      totalHours: Math.round(tp.totalHours * 10) / 10,
      totalPayment: Math.round(tp.totalPayment * 100) / 100,
      averagePerClass: tp.totalClasses > 0 ? Math.round((tp.totalPayment / tp.totalClasses) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.totalPayment - a.totalPayment)
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
