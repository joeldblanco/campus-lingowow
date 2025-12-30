'use server'

import { db } from '@/lib/db'
import { UserRole, BookingStatus } from '@prisma/client'
import type {
  AdminDashboardData,
  TeacherDashboardData,
  StudentDashboardData,
} from '@/types/dashboard'
import { formatDateNumeric, getCurrentDate, formatToISO, getStartOfMonth } from '@/lib/utils/date'

// Admin Dashboard Statistics
export async function getAdminDashboardStats(): Promise<AdminDashboardData> {
  try {
    // Get total students count
    const totalStudents = await db.user.count({
      where: { roles: { has: UserRole.STUDENT } },
    })

    // Get active teachers count
    const activeTeachers = await db.user.count({
      where: { roles: { has: UserRole.TEACHER }, status: 'ACTIVE' },
    })

    // Get active courses count
    const activeCourses = await db.course.count({
      where: { isPublished: true },
    })

    // Get total classes (completed bookings)
    const totalClasses = await db.classBooking.count({
      where: { status: 'COMPLETED' },
    })

    // Calculate total revenue from paid invoices
    const totalRevenueResult = await db.invoice.aggregate({
      where: {
        status: 'PAID',
      },
      _sum: {
        total: true,
      },
    })
    const totalRevenue = totalRevenueResult._sum.total || 0

    // Get recent enrollments with student and course info
    const recentEnrollments = await db.enrollment.findMany({
      take: 5,
      orderBy: { enrollmentDate: 'desc' },
      include: {
        student: {
          select: { name: true, lastName: true, image: true },
        },
        course: {
          select: { title: true, language: true },
        },
        purchases: {
          include: {
            invoice: {
              select: { total: true, status: true },
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    // Get upcoming confirmed classes globally
    const upcomingClasses = await db.classBooking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        day: {
          gte: formatToISO(getCurrentDate()),
        },
      },
      take: 3,
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      include: {
        student: {
          select: { name: true, lastName: true, image: true },
        },
        teacher: {
          select: { name: true, lastName: true, image: true },
        },
        enrollment: {
          select: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    })

    // Get enrollment stats (mocked aggregation for now using recent data, or simple count grouping)
    // For a real chart, we'd group by week/month. Let's do a simple grouping by created date of enrollments last 30 days.
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const enrollmentsLast30Days = await db.enrollment.groupBy({
      by: ['enrollmentDate'],
      where: {
        enrollmentDate: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    })

    // Normalize for chart (simple map, in real app needs date filling)
    const enrollmentStats = enrollmentsLast30Days
      .map((item) => ({
        name: formatDateNumeric(item.enrollmentDate.toISOString()),
        students: item._count.id,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

    // Get classes by language (approximation based on course enrollments)
    const languageStats = await db.course.groupBy({
      by: ['language'],
      _count: {
        id: true,
      },
    })

    return {
      totalStudents,
      totalClasses,
      totalRevenue,
      activeTeachers,
      activeCourses,
      recentEnrollments: recentEnrollments.map((enrollment) => {
        const invoiceTotal = enrollment.purchases[0]?.invoice?.total
        return {
          studentName: `${enrollment.student.name} ${enrollment.student.lastName}`,
          studentImage: enrollment.student.image,
          courseName: enrollment.course.title,
          date: formatDateNumeric(enrollment.enrollmentDate),
          amount: invoiceTotal ? `$${invoiceTotal.toFixed(2)}` : '-',
          status: 'Completado', // Asumimos completado si hay enrollment activo por ahora
        }
      }),
      enrollmentStats,
      upcomingClasses: upcomingClasses.map((booking) => {
        const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
        return {
          id: booking.id,
          title: booking.enrollment.course.title,
          teacherName: `${booking.teacher.name} ${booking.teacher.lastName}`,
          teacherImage: booking.teacher.image,
          startTime: `${formatDateNumeric(localData.day)} ${localData.timeSlot}`,
          platform: 'Zoom', // Placeholder or derived
        }
      }),
      languageStats: languageStats.map((stat) => ({
        name: stat.language,
        classes: stat._count?.id || 0,
      })),
    }
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error)
    throw new Error('No se pudieron obtener las estadísticas del dashboard')
  }
}

// Teacher Dashboard Statistics
export async function getTeacherDashboardStats(teacherId: string): Promise<TeacherDashboardData> {
  try {
    // ----------------------------
    // 1. Stats Calculation
    // ----------------------------

    // A. Weekly Attendance (Last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentBookings = await db.classBooking.findMany({
      where: {
        teacherId,
        day: { gte: formatToISO(sevenDaysAgo) },
        status: { in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED] },
      },
      include: { attendances: true },
    })

    let weeklyAttendanceRate = 0
    if (recentBookings.length > 0) {
      const completedClasses = recentBookings.filter((b) => b.status === 'COMPLETED').length
      weeklyAttendanceRate = Math.round((completedClasses / recentBookings.length) * 100)
    } else {
      weeklyAttendanceRate = 100 // Default to 100% if no recent classes (positive spin)
    }

    // A. Trend (Compare with previous week - simplified mock for now: +2.1%)
    const attendanceTrend = 2.1

    // B. Total Hours Taught
    const { totalDuration } = await calculateTeacherTotalRevenue(teacherId)
    const totalHours = Math.round(totalDuration / 60)
    // B. Trend (Compare with previous period - simplified mock: +5%)
    const hoursTrend = 5.0

    // C. Active Students (Unique students in ACTIVE enrollments for this teacher's courses, or just students taught)
    // Let's count students who have had a class with this teacher in the last 30 days or are enrolled in a course where this user is creator/teacher (if applicable).
    // For simplicity: Students taught in the last 60 days
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const distinctStudents = await db.classBooking.groupBy({
      by: ['studentId'],
      where: {
        teacherId,
        day: { gte: formatToISO(sixtyDaysAgo) },
      },
    })
    const activeStudentsCount = distinctStudents.length
    // C. Trend (Compare - simplified mock: +3)
    const studentsTrend = 3

    // D. Unread Messages (Mocked for now as we don't have message status readily available in simple queries without extra schema info)
    const unreadMessagesCount = 3

    // ----------------------------
    // 2. Main Content Data
    // ----------------------------

    // Upcoming Classes (Limit 5)
    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    const upcomingClassesRaw = await db.classBooking.findMany({
      where: {
        teacherId,
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate()),
        },
      },
      take: 5,
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      include: {
        student: {
          select: { name: true, lastName: true, image: true },
        },
        enrollment: {
          select: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    })

    const upcomingClasses = upcomingClassesRaw.map((booking) => {
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
      return {
        id: booking.id,
        studentName: `${booking.student.name} ${booking.student.lastName}`,
        studentImage: booking.student.image,
        course: booking.enrollment.course.title,
        date: formatDateNumeric(localData.day),
        time: localData.timeSlot,
        room: 'Sala 1', // Placeholder
      }
    })

    // Active Courses (Courses where this teacher has delivered classes or is assigned)
    // We'll fetch courses where the teacher has taught recently to determine "active" context
    // Or if there's a strict "Teacher-Course" relation, use that. Assuming generic pool for now + frequent classes.
    // Let's look for courses this teacher deals with.
    const activeCoursesRaw = await db.course.findMany({
      where: {
        enrollments: {
          some: {
            bookings: {
              some: {
                teacherId: teacherId,
              },
            },
          },
        },
      },
      take: 2,
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    })

    const activeCourses = activeCoursesRaw.map((course) => ({
      id: course.id,
      title: course.title,
      level: course.level || 'Intermedio', // Default if missing
      progress: 65, // Mocked progress avg
      studentCount: course._count.enrollments,
      image: course.image || '',
    }))

    // Needs Attention (Students with low attendance or recent missed classes)
    // Find recent missed classes
    const missedClasses = await db.classBooking.findMany({
      where: {
        teacherId,
        status: { in: [BookingStatus.NO_SHOW, BookingStatus.CANCELLED] },
        day: { gte: formatToISO(sevenDaysAgo) },
      },
      include: {
        student: { select: { id: true, name: true, lastName: true, image: true } },
        enrollment: { select: { course: { select: { title: true } } } },
      },
      take: 3,
    })

    const needsAttention = missedClasses.map((booking) => ({
      id: booking.id,
      studentName: `${booking.student.name} ${booking.student.lastName}`,
      studentImage: booking.student.image || '',
      issue: booking.status === BookingStatus.NO_SHOW ? 'Faltó a clase' : 'Clase cancelada',
      courseName: booking.enrollment.course.title,
    }))

    return {
      weeklyAttendance: {
        percentage: weeklyAttendanceRate,
        trend: attendanceTrend,
      },
      totalHoursTaught: {
        hours: totalHours,
        trend: hoursTrend,
      },
      activeStudents: {
        count: activeStudentsCount,
        trend: studentsTrend,
      },
      unreadMessages: {
        count: unreadMessagesCount,
      },
      upcomingClasses,
      activeCourses,
      needsAttention,
    }
  } catch (error) {
    console.error('Error getting teacher dashboard stats:', error)
    throw new Error('No se pudieron obtener las estadísticas del profesor')
  }
}

// Student Dashboard Statistics
export async function getStudentDashboardStats(studentId: string): Promise<StudentDashboardData> {
  try {
    // Get student's enrollments
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      include: {
        course: {
          select: { id: true, title: true, language: true, image: true },
        },
      },
    })

    // Get attendance rate
    const totalBookings = await db.classBooking.count({
      where: { studentId },
    })

    const attendedBookings = await db.classBooking.count({
      where: {
        studentId,
        status: 'COMPLETED',
      },
    })

    const attendanceRate =
      totalBookings > 0 ? Math.round((attendedBookings / totalBookings) * 100) : 0

    // Get upcoming classes
    const upcomingClasses = await db.classBooking.findMany({
      where: {
        studentId,
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate()),
        },
      },
      take: 3,
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      include: {
        teacher: {
          select: { name: true, lastName: true },
        },
        enrollment: {
          select: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    })

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    // Get user progress from activities
    const userProgress = await db.userActivity.findMany({
      where: {
        userId: studentId,
        status: 'COMPLETED',
      },
      include: {
        activity: {
          select: { points: true },
        },
      },
    })

    const totalPoints = userProgress.reduce(
      (sum, progress) => sum + (progress.activity.points || 0),
      0
    )
    const currentLevel = Math.floor(totalPoints / 100) + 1

    // Get user streak
    const streak = await db.userStreak.findUnique({
      where: { userId: studentId },
    })

    return {
      activeCourses: enrollments.length,
      attendanceRate,
      currentLevel,
      totalPoints,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      upcomingClasses: upcomingClasses.map((booking) => {
        const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
        return {
          course: booking.enrollment.course.title,
          teacher: `${booking.teacher.name} ${booking.teacher.lastName}`,
          date: localData.day,
          time: localData.timeSlot,
          link: `/classroom?classId=${booking.id}`,
        }
      }),
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        image: enrollment.course.image,
        progress: enrollment.progress,
      })),
    }
  } catch (error) {
    console.error('Error getting student dashboard stats:', error)
    throw new Error('No se pudieron obtener las estadísticas del estudiante')
  }
}

// Get user's available classes for sidebar
export async function getUserClasses(userId: string) {
  try {
    const classes = await db.classBooking.findMany({
      where: {
        OR: [{ studentId: userId }, { teacherId: userId }],
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate()),
        },
      },
      take: 10,
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      include: {
        student: {
          select: { name: true, lastName: true },
        },
        teacher: {
          select: { name: true, lastName: true },
        },
        enrollment: {
          select: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    })

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    return classes.map((booking) => {
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
      return {
        id: booking.id,
        name: `Clase ${localData.day} - ${localData.timeSlot}`,
        course: booking.enrollment.course.title,
        date: localData.day,
        time: localData.timeSlot,
        isStudent: booking.studentId === userId,
      }
    })
  } catch (error) {
    console.error('Error getting user classes:', error)
    return []
  }
}

// =============================================
// FUNCIONES DE CÁLCULO DE GANANCIAS
// =============================================

/**
 * Calcula las ganancias de un profesor basándose en clases pagables
 * (clases donde tanto el profesor como el estudiante asistieron)
 */
export async function calculateTeacherMonthlyRevenue(
  teacherId: string,
  startDate: Date
): Promise<number> {
  try {
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Obtener el rango del profesor
    const teacher = await db.user.findUnique({
      where: { id: teacherId },
      select: {
        teacherRank: {
          select: {
            rateMultiplier: true,
          },
        },
      },
    })

    const rateMultiplier = teacher?.teacherRank?.rateMultiplier || 1.0

    // Obtener clases completadas en el período
    const completedClasses = await db.classBooking.findMany({
      where: {
        teacherId,
        status: BookingStatus.COMPLETED,
        completedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        attendances: {
          select: { status: true },
        },
        teacherAttendances: {
          select: { status: true },
        },
        enrollment: {
          select: {
            course: {
              select: { classDuration: true },
            },
          },
        },
        videoCalls: {
          select: { duration: true },
        },
      },
    })

    // Filtrar solo clases pagables (donde ambos asistieron)
    const payableClasses = completedClasses.filter((classBooking) => {
      const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
      const hasStudentAttendance = classBooking.attendances.length > 0
      return hasTeacherAttendance && hasStudentAttendance
    })

    // Calcular ingresos basados en duración y multiplicador
    // Tarifa base: $10 por hora
    const BASE_RATE_PER_HOUR = 10

    let totalRevenue = 0
    for (const classBooking of payableClasses) {
      // Usar duración de videollamada si está disponible, sino usar duración del curso
      const duration =
        classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      const hours = duration / 60
      const classRevenue = hours * BASE_RATE_PER_HOUR * rateMultiplier
      totalRevenue += classRevenue
    }

    return Math.round(totalRevenue * 100) / 100 // Redondear a 2 decimales
  } catch (error) {
    console.error('Error calculating teacher monthly revenue:', error)
    return 0
  }
}

/**
 * Obtiene los ingresos de un profesor por mes para los últimos N meses
 */
export async function getTeacherRevenueByMonth(
  teacherId: string,
  monthsCount: number = 6
): Promise<{ name: string; income: number }[]> {
  try {
    const months = []
    const currentDate = getCurrentDate()

    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthDate = new Date(currentDate)
      monthDate.setMonth(monthDate.getMonth() - i)

      const startOfMonth = getStartOfMonth(monthDate.toISOString())
      const revenue = await calculateTeacherMonthlyRevenue(teacherId, startOfMonth)

      // Formatear nombre del mes
      const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short' })
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

      months.push({
        name: capitalizedMonth,
        income: revenue,
      })
    }

    return months
  } catch (error) {
    console.error('Error getting teacher revenue by month:', error)
    return []
  }
}

/**
 * Calcula el total de ganancias de un profesor en un rango de fechas
 */
export async function calculateTeacherTotalRevenue(
  teacherId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalRevenue: number
  totalClasses: number
  totalDuration: number
  averagePerClass: number
}> {
  try {
    // Obtener el rango del profesor
    const teacher = await db.user.findUnique({
      where: { id: teacherId },
      select: {
        teacherRank: {
          select: {
            rateMultiplier: true,
          },
        },
      },
    })

    const rateMultiplier = teacher?.teacherRank?.rateMultiplier || 1.0

    // Construir filtros
    const whereClause: {
      teacherId: string
      status: BookingStatus
      day?: { gte?: string; lte?: string }
    } = {
      teacherId,
      status: BookingStatus.COMPLETED,
    }

    if (startDate || endDate) {
      whereClause.day = {}
      if (startDate) whereClause.day.gte = startDate
      if (endDate) whereClause.day.lte = endDate
    }

    // Obtener clases completadas
    const completedClasses = await db.classBooking.findMany({
      where: whereClause,
      include: {
        attendances: {
          select: { status: true },
        },
        teacherAttendances: {
          select: { status: true },
        },
        enrollment: {
          select: {
            course: {
              select: { classDuration: true },
            },
          },
        },
        videoCalls: {
          select: { duration: true },
        },
      },
    })

    // Filtrar solo clases pagables
    const payableClasses = completedClasses.filter((classBooking) => {
      const hasTeacherAttendance = classBooking.teacherAttendances.length > 0
      const hasStudentAttendance = classBooking.attendances.length > 0
      return hasTeacherAttendance && hasStudentAttendance
    })

    // Calcular estadísticas
    const BASE_RATE_PER_HOUR = 10
    let totalRevenue = 0
    let totalDuration = 0

    for (const classBooking of payableClasses) {
      const duration =
        classBooking.videoCalls[0]?.duration || classBooking.enrollment.course.classDuration
      totalDuration += duration
      const hours = duration / 60
      const classRevenue = hours * BASE_RATE_PER_HOUR * rateMultiplier
      totalRevenue += classRevenue
    }

    const averagePerClass = payableClasses.length > 0 ? totalRevenue / payableClasses.length : 0

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClasses: payableClasses.length,
      totalDuration,
      averagePerClass: Math.round(averagePerClass * 100) / 100,
    }
  } catch (error) {
    console.error('Error calculating teacher total revenue:', error)
    return {
      totalRevenue: 0,
      totalClasses: 0,
      totalDuration: 0,
      averagePerClass: 0,
    }
  }
}

// Get classroom data for a specific class
export async function getClassroomData(classId: string, userId: string) {
  try {
    // Get class booking details
    const classBooking = await db.classBooking.findFirst({
      where: {
        id: classId,
        OR: [{ studentId: userId }, { teacherId: userId }],
      },
      include: {
        student: {
          select: { id: true, name: true, lastName: true, image: true },
        },
        teacher: {
          select: { id: true, name: true, lastName: true, image: true },
        },
        enrollment: {
          select: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    })

    if (!classBooking) {
      throw new Error('Clase no encontrada o sin acceso')
    }

    // Convertir de UTC a hora local para mostrar
    const { convertTimeSlotFromUTC, formatDateNumeric } = await import('@/lib/utils/date')
    const localData = convertTimeSlotFromUTC(classBooking.day, classBooking.timeSlot)

    // Formatear la fecha para mostrar (DD/MM/YYYY)
    const formattedDate = formatDateNumeric(localData.day)

    return {
      studentId: classBooking.student.id,
      teacherId: classBooking.teacher.id,
      studentName: classBooking.student.name || 'Estudiante',
      studentImage:
        classBooking.student.image ||
        `https://api.dicebear.com/7.x/personas/svg?seed=${classBooking.student.id}`,
      teacherName: classBooking.teacher.name || 'Profesor',
      teacherImage:
        classBooking.teacher.image ||
        `https://api.dicebear.com/7.x/personas/svg?seed=${classBooking.teacher.id}`,
      courseName: classBooking.enrollment.course.title,
      lessonName: `Clase del ${formattedDate} - ${localData.timeSlot}`,
      bookingId: classBooking.id,
      // Datos en UTC para validación
      dayUTC: classBooking.day,
      timeSlotUTC: classBooking.timeSlot,
      // Datos en local para mostrar
      day: localData.day,
      timeSlot: localData.timeSlot,
    }
  } catch (error) {
    console.error('Error getting classroom data:', error)
    throw new Error('No se pudieron obtener los datos del aula')
  }
}
