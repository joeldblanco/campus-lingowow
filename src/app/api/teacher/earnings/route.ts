import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario sea profesor
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        roles: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
        teacherRank: {
          select: {
            name: true,
            rateMultiplier: true
          }
        }
      },
    })

    if (!user || !user.roles.includes('TEACHER')) {
      return NextResponse.json({ error: 'Sin permisos de profesor' }, { status: 403 })
    }

    const teacherId = session.user.id

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const periodId = searchParams.get('periodId')

    // Calcular fechas del mes actual si no hay filtros
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Construir filtros
    const whereClause: {
      teacherId: string
      status: BookingStatus
      day?: { gte?: string; lte?: string }
      enrollment?: { academicPeriodId?: string }
    } = {
      teacherId,
      status: BookingStatus.COMPLETED,
    }

    // Filtrar por período académico si se proporciona
    if (periodId) {
      whereClause.enrollment = {
        academicPeriodId: periodId
      }
    }
    // Si no hay período, usar rango de fechas
    else if (startDate || endDate) {
      whereClause.day = {}
      if (startDate) whereClause.day.gte = startDate
      if (endDate) whereClause.day.lte = endDate
    }

    // Obtener todas las clases completadas
    const completedClasses = await db.classBooking.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        enrollment: {
          select: {
            id: true,
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
        attendances: {
          select: {
            id: true,
            studentId: true,
            status: true,
            timestamp: true,
          },
        },
        teacherAttendances: {
          select: {
            id: true,
            teacherId: true,
            status: true,
            timestamp: true,
          },
        },
        videoCalls: {
          select: {
            id: true,
            duration: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        day: 'desc',
      },
    })

    // Filtrar solo las clases donde AMBOS asistieron
    const payableClasses = completedClasses.filter((classBooking) => {
      const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
      const hasStudentAttendance = classBooking.attendances.length > 0
      return hasTeacherAttendance && hasStudentAttendance
    })

    // Obtener los pagos personalizados por curso para este profesor
    const teacherCourses = await db.teacherCourse.findMany({
      where: { teacherId },
      select: {
        courseId: true,
        paymentPerClass: true,
      },
    })
    const teacherCoursePayments = new Map(
      teacherCourses.map((tc) => [tc.courseId, tc.paymentPerClass])
    )

    // Calcular ganancias
    // Prioridad: 1) Pago personalizado del profesor, 2) Pago por defecto del curso, 3) Cálculo por hora
    const BASE_RATE_PER_HOUR = 10
    const rateMultiplier = user.teacherRank?.rateMultiplier || 1.0

    let totalEarnings = 0
    let totalDuration = 0

    const classDetails = payableClasses.map((classBooking) => {
      // Usar duración de videollamada si está disponible, sino usar duración del curso
      const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      totalDuration += duration

      const courseId = classBooking.enrollment.course.id
      const teacherPayment = teacherCoursePayments.get(courseId)
      const defaultPayment = classBooking.enrollment.course.defaultPaymentPerClass

      let classEarnings: number
      if (teacherPayment !== null && teacherPayment !== undefined) {
        // Usar pago personalizado del profesor para este curso
        classEarnings = teacherPayment
      } else if (defaultPayment !== null && defaultPayment !== undefined) {
        // Usar pago por defecto del curso
        classEarnings = defaultPayment
      } else {
        // Fallback: calcular por hora con multiplicador de rango
        const hours = duration / 60
        classEarnings = hours * BASE_RATE_PER_HOUR * rateMultiplier
      }
      totalEarnings += classEarnings

      return {
        bookingId: classBooking.id,
        date: classBooking.day,
        timeSlot: classBooking.timeSlot,
        studentName: `${classBooking.student.name} ${classBooking.student.lastName || ''}`,
        studentImage: classBooking.student.image,
        courseName: classBooking.enrollment.course.title,
        duration,
        earnings: Math.round(classEarnings * 100) / 100,
        teacherAttendanceTime: classBooking.teacherAttendances[0]?.timestamp,
        studentAttendanceTime: classBooking.attendances[0]?.timestamp,
        academicPeriod: classBooking.enrollment.academicPeriod.name,
      }
    })

    const averagePerClass = payableClasses.length > 0 ? totalEarnings / payableClasses.length : 0

    // Obtener bonificaciones del profesor
    const incentives = await db.teacherIncentive.findMany({
      where: { teacherId },
      include: {
        period: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular bonificaciones totales
    const totalBonuses = incentives.reduce((sum, i) => sum + i.bonusAmount, 0)
    const paidBonuses = incentives.filter(i => i.paid).reduce((sum, i) => sum + i.bonusAmount, 0)
    const pendingBonuses = incentives.filter(i => !i.paid).reduce((sum, i) => sum + i.bonusAmount, 0)

    // Obtener clases del mes pasado para calcular tendencia
    const lastMonthClasses = await db.classBooking.findMany({
      where: {
        teacherId,
        status: BookingStatus.COMPLETED,
        day: {
          gte: lastMonthStart.toISOString().split('T')[0],
          lte: lastMonthEnd.toISOString().split('T')[0],
        },
      },
      include: {
        attendances: { select: { id: true } },
        teacherAttendances: { select: { id: true } },
        enrollment: {
          select: {
            course: { select: { classDuration: true } },
          },
        },
        videoCalls: { select: { duration: true } },
      },
    })

    const lastMonthPayableClasses = lastMonthClasses.filter(
      (c) => c.teacherAttendances.length > 0 && c.attendances.length > 0
    )

    let lastMonthEarnings = 0
    lastMonthPayableClasses.forEach((classBooking) => {
      const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      const hours = duration / 60
      lastMonthEarnings += hours * BASE_RATE_PER_HOUR * rateMultiplier
    })

    // Calcular tendencia (porcentaje de cambio)
    const earningsTrend = lastMonthEarnings > 0 
      ? Math.round(((totalEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : totalEarnings > 0 ? 100 : 0

    // Calcular ganancias por semana del mes actual
    const weeklyEarnings: { week: number; earnings: number; label: string }[] = []
    const currentMonthClassDetails = classDetails.filter(c => {
      const classDate = new Date(c.date)
      return classDate >= currentMonthStart && classDate <= currentMonthEnd
    })

    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(currentMonthStart)
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekClasses = currentMonthClassDetails.filter(c => {
        const classDate = new Date(c.date)
        return classDate >= weekStart && classDate <= weekEnd
      })

      const weekEarnings = weekClasses.reduce((sum, c) => sum + c.earnings, 0)
      weeklyEarnings.push({
        week,
        earnings: Math.round(weekEarnings * 100) / 100,
        label: `Semana ${week}`,
      })
    }

    // Historial de pagos recientes (últimos 3 meses de incentivos pagados)
    const recentPayouts = incentives
      .filter(i => i.paid && i.paidAt)
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        amount: i.bonusAmount,
        date: i.paidAt,
        periodName: i.period.name,
        type: i.type,
      }))

    // Calcular próximo pago estimado
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextPayoutAmount = totalEarnings + pendingBonuses

    return NextResponse.json({
      success: true,
      teacherId,
      teacherName: `${user.name} ${user.lastName || ''}`,
      teacherEmail: user.email,
      teacherImage: user.image,
      rank: user.teacherRank?.name || null,
      rateMultiplier,
      totalClasses: payableClasses.length,
      totalDuration,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averagePerClass: Math.round(averagePerClass * 100) / 100,
      classes: classDetails,
      // Nuevos campos para el diseño mejorado
      bonuses: {
        total: Math.round(totalBonuses * 100) / 100,
        paid: Math.round(paidBonuses * 100) / 100,
        pending: Math.round(pendingBonuses * 100) / 100,
      },
      trends: {
        earningsChange: earningsTrend,
        classIncomeChange: earningsTrend, // Mismo que earnings por ahora
        bonusChange: 0, // Se puede calcular comparando con mes anterior
      },
      weeklyEarnings,
      recentPayouts,
      nextPayout: {
        amount: Math.round(nextPayoutAmount * 100) / 100,
        estimatedDate: nextPayoutDate.toISOString(),
      },
      filters: {
        startDate,
        endDate,
        periodId,
      },
    })
  } catch (error) {
    console.error('Error generando reporte de ganancias del profesor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
