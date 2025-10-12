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

    // Calcular ganancias
    const BASE_RATE_PER_HOUR = 10
    const rateMultiplier = user.teacherRank?.rateMultiplier || 1.0

    let totalEarnings = 0
    let totalDuration = 0

    const classDetails = payableClasses.map((classBooking) => {
      // Usar duración de videollamada si está disponible, sino usar duración del curso
      const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      totalDuration += duration

      const hours = duration / 60
      const classEarnings = hours * BASE_RATE_PER_HOUR * rateMultiplier
      totalEarnings += classEarnings

      return {
        bookingId: classBooking.id,
        date: classBooking.day,
        timeSlot: classBooking.timeSlot,
        studentName: `${classBooking.student.name} ${classBooking.student.lastName}`,
        courseName: classBooking.enrollment.course.title,
        duration,
        earnings: Math.round(classEarnings * 100) / 100,
        teacherAttendanceTime: classBooking.teacherAttendances[0]?.timestamp,
        studentAttendanceTime: classBooking.attendances[0]?.timestamp,
        academicPeriod: classBooking.enrollment.academicPeriod.name,
      }
    })

    const averagePerClass = payableClasses.length > 0 ? totalEarnings / payableClasses.length : 0

    return NextResponse.json({
      success: true,
      teacherId,
      teacherName: `${user.name} ${user.lastName}`,
      teacherEmail: user.email,
      rank: user.teacherRank?.name || null,
      rateMultiplier,
      totalClasses: payableClasses.length,
      totalDuration,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averagePerClass: Math.round(averagePerClass * 100) / 100,
      classes: classDetails,
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
