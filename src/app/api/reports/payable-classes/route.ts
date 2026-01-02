import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { BookingStatus, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario sea admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    })

    if (!user || !user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get('teacherId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const periodId = searchParams.get('periodId')

    // Construir filtros
    const whereClause: Prisma.ClassBookingWhereInput = {
      status: BookingStatus.COMPLETED,
    }

    if (teacherId) {
      whereClause.teacherId = teacherId
    }

    // Filtrar por período académico si se proporciona
    if (periodId) {
      whereClause.enrollment = {
        academicPeriodId: periodId
      }
    }
    // Si no hay período, usar rango de fechas
    else if (startDate && endDate) {
      whereClause.day = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Obtener todas las clases completadas
    const completedClasses = await db.classBooking.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
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
            id: true,
            name: true,
            lastName: true,
            email: true,
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

    // Calcular estadísticas por profesor
    const BASE_RATE_PER_HOUR = 10
    
    const teacherStats = new Map<string, {
      teacherId: string
      teacherName: string
      teacherEmail: string
      rank: string | null
      rateMultiplier: number
      totalClasses: number
      totalDuration: number
      totalEarnings: number
      classes: {
        bookingId: string
        date: string
        timeSlot: string
        studentName: string
        courseName: string
        duration: number
        earnings: number
        teacherAttendanceTime: Date
        studentAttendanceTime: Date
        academicPeriod: string
      }[]
    }>()

    payableClasses.forEach((classBooking) => {
      const teacherId = classBooking.teacherId
      const teacherName = `${classBooking.teacher.name} ${classBooking.teacher.lastName || ''}`
      const rateMultiplier = classBooking.teacher.teacherRank?.rateMultiplier || 1.0
      
      if (!teacherStats.has(teacherId)) {
        teacherStats.set(teacherId, {
          teacherId,
          teacherName,
          teacherEmail: classBooking.teacher.email,
          rank: classBooking.teacher.teacherRank?.name || null,
          rateMultiplier,
          totalClasses: 0,
          totalDuration: 0,
          totalEarnings: 0,
          classes: [],
        })
      }

      const stats = teacherStats.get(teacherId)!
      stats.totalClasses++
      
      // Calcular duración de la clase
      const duration = classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      stats.totalDuration += duration

      // Calcular ganancias de esta clase
      const hours = duration / 60
      const classEarnings = hours * BASE_RATE_PER_HOUR * rateMultiplier
      stats.totalEarnings += classEarnings

      stats.classes.push({
        bookingId: classBooking.id,
        date: classBooking.day,
        timeSlot: classBooking.timeSlot,
        studentName: `${classBooking.student.name} ${classBooking.student.lastName || ''}`,
        courseName: classBooking.enrollment.course.title,
        duration,
        earnings: Math.round(classEarnings * 100) / 100,
        teacherAttendanceTime: classBooking.teacherAttendances[0]?.timestamp,
        studentAttendanceTime: classBooking.attendances[0]?.timestamp,
        academicPeriod: classBooking.enrollment.academicPeriod.name,
      })
    })

    // Convertir Map a array y redondear ganancias totales
    const teacherReports = Array.from(teacherStats.values()).map(teacher => ({
      ...teacher,
      totalEarnings: Math.round(teacher.totalEarnings * 100) / 100
    }))

    // Calcular totales generales
    const totalEarnings = teacherReports.reduce((sum, t) => sum + t.totalEarnings, 0)
    
    const summary = {
      totalPayableClasses: payableClasses.length,
      totalTeachers: teacherReports.length,
      totalDuration: teacherReports.reduce((sum, t) => sum + t.totalDuration, 0),
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCompletedClasses: completedClasses.length,
      totalNonPayableClasses: completedClasses.length - payableClasses.length,
    }

    return NextResponse.json({
      success: true,
      summary,
      teacherReports,
      filters: {
        teacherId,
        startDate,
        endDate,
        periodId,
      },
    })
  } catch (error) {
    console.error('Error generando reporte de clases pagables:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
