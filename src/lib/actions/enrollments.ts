'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { EnrollmentStatus } from '@prisma/client'

export interface EnrollmentWithDetails {
  id: string
  studentId: string
  courseId: string
  academicPeriodId: string
  status: EnrollmentStatus
  progress: number
  enrollmentDate: Date
  lastAccessed: Date | null
  student: {
    id: string
    name: string
    lastName: string
    email: string
    image: string | null
  }
  course: {
    id: string
    title: string
    description: string
    level: string
    isPublished: boolean
    _count: {
      modules: number
    }
  }
  academicPeriod: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    isActive: boolean
  }
}

export interface EnrollmentStats {
  totalEnrollments: number
  pendingEnrollments: number
  activeEnrollments: number
  completedEnrollments: number
  pausedEnrollments: number
  averageProgress: number
}

// Get all enrollments with details
export async function getAllEnrollments(): Promise<EnrollmentWithDetails[]> {
  try {
    const enrollments = await db.enrollment.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            isPublished: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    return enrollments
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    throw new Error('Failed to fetch enrollments')
  }
}

// Get enrollment by ID
export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            isPublished: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
    })

    return enrollment
  } catch (error) {
    console.error('Error fetching enrollment:', error)
    throw new Error('Failed to fetch enrollment')
  }
}

// Get enrollment statistics
export async function getEnrollmentStats(): Promise<EnrollmentStats> {
  try {
    const [
      totalEnrollments,
      pendingEnrollments,
      activeEnrollments,
      completedEnrollments,
      pausedEnrollments,
      enrollmentsWithProgress,
    ] = await Promise.all([
      db.enrollment.count(),
      db.enrollment.count({ where: { status: EnrollmentStatus.PENDING } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.ACTIVE } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.PAUSED } }),
      db.enrollment.findMany({
        select: {
          progress: true,
        },
      }),
    ])

    const averageProgress =
      enrollmentsWithProgress.length > 0
        ? enrollmentsWithProgress.reduce((sum, e) => sum + e.progress, 0) /
          enrollmentsWithProgress.length
        : 0

    return {
      totalEnrollments,
      pendingEnrollments,
      activeEnrollments,
      completedEnrollments,
      pausedEnrollments,
      averageProgress: Math.round(averageProgress),
    }
  } catch (error) {
    console.error('Error fetching enrollment stats:', error)
    throw new Error('Failed to fetch enrollment stats')
  }
}

// Create new enrollment
export async function createEnrollment(data: {
  studentId: string
  courseId: string
  academicPeriodId: string
}) {
  try {
    // Check if enrollment already exists
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId_academicPeriodId: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
        },
      },
    })

    if (existingEnrollment) {
      return {
        success: false,
        error: 'El estudiante ya está inscrito en este curso para este período académico',
      }
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      return { success: false, error: 'Estudiante no encontrado' }
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: data.courseId },
    })

    if (!course) {
      return { success: false, error: 'Curso no encontrado' }
    }

    // Verify academic period exists
    const academicPeriod = await db.academicPeriod.findUnique({
      where: { id: data.academicPeriodId },
    })

    if (!academicPeriod) {
      return { success: false, error: 'Período académico no encontrado' }
    }

    // Determinar el estado según la fecha de inicio del período
    const today = new Date()
    const periodStartDate = new Date(academicPeriod.startDate)
    const status = periodStartDate > today ? EnrollmentStatus.PENDING : EnrollmentStatus.ACTIVE

    const enrollment = await db.enrollment.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        academicPeriodId: data.academicPeriodId,
        status: status,
        progress: 0,
      },
    })

    revalidatePath('/admin/enrollments')
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error creating enrollment:', error)
    return { success: false, error: 'Error al crear la inscripción' }
  }
}

// Update enrollment
export async function updateEnrollment(
  id: string,
  data: {
    status?: EnrollmentStatus
    progress?: number
  }
) {
  try {
    const enrollment = await db.enrollment.update({
      where: { id },
      data: {
        ...data,
        lastAccessed: new Date(),
      },
    })

    revalidatePath('/admin/enrollments')
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return { success: false, error: 'Error al actualizar la inscripción' }
  }
}

// Get active enrollments for a student
export async function getActiveEnrollmentsForStudent(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    return { success: true, data: enrollments }
  } catch (error) {
    console.error('Error fetching student enrollments:', error)
    return { success: false, error: 'Error al cargar inscripciones' }
  }
}

// Delete enrollment
export async function deleteEnrollment(id: string) {
  try {
    await db.enrollment.delete({
      where: { id },
    })

    revalidatePath('/admin/enrollments')
    return { success: true }
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return { success: false, error: 'Error al eliminar la inscripción' }
  }
}

// Get available students (not enrolled in a specific course)
export async function getAvailableStudents(courseId: string) {
  try {
    const enrolledStudents = await db.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    })

    const enrolledStudentIds = enrolledStudents.map((e) => e.studentId)

    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        id: {
          notIn: enrolledStudentIds,
        },
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching available students:', error)
    throw new Error('Failed to fetch available students')
  }
}

// Get available courses for a student
export async function getAvailableCoursesForStudent(studentId: string) {
  try {
    const enrolledCourses = await db.enrollment.findMany({
      where: { studentId },
      select: { courseId: true },
    })

    const enrolledCourseIds = enrolledCourses.map((e) => e.courseId)

    const courses = await db.course.findMany({
      where: {
        id: {
          notIn: enrolledCourseIds,
        },
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        _count: {
          select: {
            modules: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching available courses:', error)
    throw new Error('Failed to fetch available courses')
  }
}

// Get all students for enrollment
export async function getAllStudents() {
  try {
    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students:', error)
    throw new Error('Failed to fetch students')
  }
}

// Get all published courses
export async function getPublishedCourses() {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        _count: {
          select: {
            modules: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching published courses:', error)
    throw new Error('Failed to fetch published courses')
  }
}

// Get active academic periods
export async function getActiveAcademicPeriods() {
  try {
    const periods = await db.academicPeriod.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching active academic periods:', error)
    throw new Error('Failed to fetch active academic periods')
  }
}

// Get active and future academic periods (for pre-enrollments)
export async function getActiveAndFutureAcademicPeriods() {
  try {
    const today = new Date()
    const periods = await db.academicPeriod.findMany({
      where: {
        OR: [
          { isActive: true },
          {
            startDate: {
              gte: today,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching active and future academic periods:', error)
    throw new Error('Failed to fetch active and future academic periods')
  }
}

// Get all academic periods (for admin)
export async function getAllAcademicPeriods() {
  try {
    const periods = await db.academicPeriod.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching academic periods:', error)
    throw new Error('Failed to fetch academic periods')
  }
}

// Activate pending enrollments when their academic period starts
export async function activatePendingEnrollments() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Inicio del día

    const result = await db.enrollment.updateMany({
      where: {
        status: EnrollmentStatus.PENDING,
        academicPeriod: {
          startDate: {
            lte: today,
          },
        },
      },
      data: {
        status: EnrollmentStatus.ACTIVE,
      },
    })

    console.log(`Activated ${result.count} pending enrollments`)
    revalidatePath('/admin/enrollments')

    return {
      success: true,
      count: result.count,
      message: `Se activaron ${result.count} pre-inscripciones`,
    }
  } catch (error) {
    console.error('Error activating pending enrollments:', error)
    return {
      success: false,
      error: 'Error al activar pre-inscripciones',
      count: 0,
    }
  }
}
