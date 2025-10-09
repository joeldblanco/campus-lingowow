'use server'

import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import type { AdminDashboardData, TeacherDashboardData, StudentDashboardData } from '@/types/dashboard'
import { formatDateNumeric, getCurrentDate, formatToISO, getStartOfMonth } from '@/lib/utils/date'

// Admin Dashboard Statistics
export async function getAdminDashboardStats(): Promise<AdminDashboardData> {
  try {
    // Get total students count
    const totalStudents = await db.user.count({
      where: { roles: { has: UserRole.STUDENT } }
    })

    // Get total classes (completed bookings)
    const totalClasses = await db.classBooking.count({
      where: { status: 'COMPLETED' }
    })

    // Get recent enrollments with student and course info
    const recentEnrollments = await db.enrollment.findMany({
      take: 5,
      orderBy: { enrollmentDate: 'desc' },
      include: {
        student: {
          select: { name: true, lastName: true }
        },
        course: {
          select: { title: true, language: true }
        }
      }
    })


    // Get classes by language (approximation based on course enrollments)
    const languageStats = await db.course.groupBy({
      by: ['language'],
      _count: {
        id: true
      }
    })

    return {
      totalStudents,
      totalClasses,
      totalRevenue: 0, // TODO: Implement payment system
      recentEnrollments: recentEnrollments.map(enrollment => ({
        studentName: `${enrollment.student.name} ${enrollment.student.lastName}`,
        courseName: enrollment.course.title,
        date: formatDateNumeric(enrollment.enrollmentDate),
        amount: '$300' // TODO: Get from payment records
      })),
      languageStats: languageStats.map(stat => ({
        name: stat.language,
        classes: stat._count?.id || 0
      }))
    }
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error)
    throw new Error('No se pudieron obtener las estadísticas del dashboard')
  }
}

// Teacher Dashboard Statistics  
export async function getTeacherDashboardStats(teacherId: string): Promise<TeacherDashboardData> {
  try {
    // Get teacher's students count
    const myStudents = await db.classBooking.groupBy({
      by: ['studentId'],
      where: {
        teacherId,
        status: 'COMPLETED'
      }
    })

    // Get classes taught this month
    const currentMonth = getStartOfMonth(getCurrentDate())
    
    const classesThisMonth = await db.classBooking.count({
      where: {
        teacherId,
        status: 'COMPLETED',
        completedAt: {
          gte: currentMonth
        }
      }
    })

    // Get upcoming classes
    const upcomingClasses = await db.classBooking.findMany({
      where: {
        teacherId,
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate())
        }
      },
      take: 5,
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' }
      ],
      include: {
        student: {
          select: { name: true, lastName: true }
        },
        enrollment: {
          select: {
            course: {
              select: { title: true }
            }
          }
        }
      }
    })

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    // Get monthly revenue data (placeholder)
    const revenueData = [
      { name: 'Enero', income: 2000 },
      { name: 'Febrero', income: 2200 },
      { name: 'Marzo', income: 2400 },
      { name: 'Abril', income: 2560 },
    ]

    return {
      totalStudents: myStudents.length,
      classesThisMonth,
      monthlyRevenue: 2560, // TODO: Calculate from actual payments
      upcomingClasses: upcomingClasses.map(booking => {
        const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
        return {
          id: booking.id,
          studentName: `${booking.student.name} ${booking.student.lastName}`,
          course: booking.enrollment.course.title,
          date: localData.day,
          time: localData.timeSlot
        }
      }),
      revenueData
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
        status: 'ACTIVE'
      },
      include: {
        course: {
          select: { title: true, language: true }
        }
      }
    })

    // Get attendance rate
    const totalBookings = await db.classBooking.count({
      where: { studentId }
    })

    const attendedBookings = await db.classBooking.count({
      where: { 
        studentId,
        status: 'COMPLETED'
      }
    })

    const attendanceRate = totalBookings > 0 ? Math.round((attendedBookings / totalBookings) * 100) : 0

    // Get upcoming classes
    const upcomingClasses = await db.classBooking.findMany({
      where: {
        studentId,
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate())
        }
      },
      take: 3,
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' }
      ],
      include: {
        teacher: {
          select: { name: true, lastName: true }
        },
        enrollment: {
          select: {
            course: {
              select: { title: true }
            }
          }
        }
      }
    })

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')

    // Get user progress from activities
    const userProgress = await db.userActivity.findMany({
      where: {
        userId: studentId,
        status: 'COMPLETED'
      },
      include: {
        activity: {
          select: { points: true }
        }
      }
    })

    const totalPoints = userProgress.reduce((sum, progress) => sum + (progress.activity.points || 0), 0)
    const currentLevel = Math.floor(totalPoints / 100) + 1

    // Get user streak
    const streak = await db.userStreak.findUnique({
      where: { userId: studentId }
    })

    return {
      activeCourses: enrollments.length,
      attendanceRate,
      currentLevel,
      totalPoints,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      upcomingClasses: upcomingClasses.map(booking => {
        const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
        return {
          course: booking.enrollment.course.title,
          teacher: `${booking.teacher.name} ${booking.teacher.lastName}`,
          date: localData.day,
          time: localData.timeSlot,
          link: `/classroom?classId=${booking.id}`
        }
      }),
      enrollments: enrollments.map(enrollment => ({
        title: enrollment.course.title,
        progress: enrollment.progress
      }))
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
        OR: [
          { studentId: userId },
          { teacherId: userId }
        ],
        status: 'CONFIRMED',
        day: {
          gte: formatToISO(getCurrentDate())
        }
      },
      take: 10,
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' }
      ],
      include: {
        student: {
          select: { name: true, lastName: true }
        },
        teacher: {
          select: { name: true, lastName: true }
        },
        enrollment: {
          select: {
            course: {
              select: { title: true }
            }
          }
        }
      }
    })

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    
    return classes.map(booking => {
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
      return {
        id: booking.id,
        name: `Clase ${localData.day} - ${localData.timeSlot}`,
        course: booking.enrollment.course.title,
        date: localData.day,
        time: localData.timeSlot,
        isStudent: booking.studentId === userId
      }
    })
  } catch (error) {
    console.error('Error getting user classes:', error)
    return []
  }
}

// Get classroom data for a specific class
export async function getClassroomData(classId: string, userId: string) {
  try {
    // Get class booking details
    const classBooking = await db.classBooking.findFirst({
      where: {
        id: classId,
        OR: [
          { studentId: userId },
          { teacherId: userId }
        ]
      },
      include: {
        student: {
          select: { id: true, name: true, lastName: true, image: true }
        },
        teacher: {
          select: { id: true, name: true, lastName: true, image: true }
        },
        enrollment: {
          select: {
            course: {
              select: { title: true }
            }
          }
        }
      }
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
      studentImage: classBooking.student.image || `https://api.dicebear.com/7.x/personas/svg?seed=${classBooking.student.id}`,
      teacherName: classBooking.teacher.name || 'Profesor',
      teacherImage: classBooking.teacher.image || `https://api.dicebear.com/7.x/personas/svg?seed=${classBooking.teacher.id}`,
      courseName: classBooking.enrollment.course.title,
      lessonName: `Clase del ${formattedDate} - ${localData.timeSlot}`,
      bookingId: classBooking.id,
      // Datos en UTC para validación
      dayUTC: classBooking.day,
      timeSlotUTC: classBooking.timeSlot,
      // Datos en local para mostrar
      day: localData.day,
      timeSlot: localData.timeSlot
    }
  } catch (error) {
    console.error('Error getting classroom data:', error)
    throw new Error('No se pudieron obtener los datos del aula')
  }
}
