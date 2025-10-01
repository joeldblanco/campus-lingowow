'use server'

import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import type { AdminDashboardData, TeacherDashboardData, StudentDashboardData } from '@/types/dashboard'

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
        date: enrollment.enrollmentDate.toLocaleDateString('es-ES'),
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
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    
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
          gte: new Date().toISOString().split('T')[0]
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
        }
      }
    })

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
      upcomingClasses: upcomingClasses.map(booking => ({
        studentName: `${booking.student.name} ${booking.student.lastName}`,
        course: 'Inglés', // TODO: Get from course relationship
        date: booking.day,
        time: booking.timeSlot
      })),
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
          gte: new Date().toISOString().split('T')[0]
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
        }
      }
    })

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
      upcomingClasses: upcomingClasses.map(booking => ({
        course: 'Programa Regular de Inglés', // TODO: Get from course relationship
        teacher: `${booking.teacher.name} ${booking.teacher.lastName}`,
        date: booking.day,
        time: booking.timeSlot,
        link: `/classroom?classId=${booking.id}`
      })),
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
          gte: new Date().toISOString().split('T')[0]
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
        }
      }
    })

    return classes.map(booking => ({
      id: booking.id,
      name: `Clase ${booking.day} - ${booking.timeSlot}`,
      course: 'Programa Regular de Inglés', // TODO: Get from course relationship
      date: booking.day,
      time: booking.timeSlot,
      isStudent: booking.studentId === userId
    }))
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
          select: { id: true, name: true, lastName: true }
        },
        teacher: {
          select: { id: true, name: true, lastName: true }
        }
      }
    })

    if (!classBooking) {
      throw new Error('Clase no encontrada o sin acceso')
    }

    return {
      studentId: classBooking.student.id,
      teacherId: classBooking.teacher.id,
      courseName: 'Programa Regular de Inglés', // TODO: Get from course relationship
      lessonName: `Clase del ${classBooking.day} - ${classBooking.timeSlot}`,
      bookingId: classBooking.id
    }
  } catch (error) {
    console.error('Error getting classroom data:', error)
    throw new Error('No se pudieron obtener los datos del aula')
  }
}
