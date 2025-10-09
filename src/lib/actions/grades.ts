'use server'

import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentDate } from '@/lib/utils/date'

export interface StudentGradeData {
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseTitle: string
  courseLanguage: string
  courseLevel: string
  enrollmentStatus: string
  enrollmentProgress: number
  enrollmentDate: Date
  activities: {
    activityId: string
    activityTitle: string
    activityType: string
    score: number | null
    status: string
    attempts: number
    completedAt: Date | null
    lastAttemptAt: Date | null
  }[]
  averageScore: number
  completedActivities: number
  totalActivities: number
}

export interface GradeFilters {
  courseId?: string
  studentId?: string
  language?: string
  level?: string
  status?: string
}

export async function getAllStudentGrades(filters?: GradeFilters): Promise<StudentGradeData[]> {
  try {
    const where: Record<string, unknown> = {}

    if (filters?.courseId) {
      where.courseId = filters.courseId
    }
    if (filters?.studentId) {
      where.studentId = filters.studentId
    }
    if (filters?.status) {
      where.status = filters.status
    }

    const courseWhere: Record<string, unknown> = {}
    if (filters?.language) {
      courseWhere.language = filters.language
    }
    if (filters?.level) {
      courseWhere.level = filters.level
    }

    const enrollments = await db.enrollment.findMany({
      where: {
        ...where,
        course: courseWhere,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
      orderBy: [{ course: { title: 'asc' } }, { student: { name: 'asc' } }],
    })

    const gradesData: StudentGradeData[] = []

    for (const enrollment of enrollments) {
      // Get all activities for this student in this course
      const activities = await db.userActivity.findMany({
        where: {
          userId: enrollment.studentId,
          activity: {
            OR: [
              {
                modules: {
                  some: {
                    module: {
                      courseId: enrollment.courseId,
                    },
                  },
                },
              },
              {
                lessons: {
                  some: {
                    lesson: {
                      module: {
                        courseId: enrollment.courseId,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
              activityType: true,
            },
          },
        },
        orderBy: {
          assignedAt: 'desc',
        },
      })

      const activityData = activities.map((ua) => ({
        activityId: ua.activityId,
        activityTitle: ua.activity.title,
        activityType: ua.activity.activityType,
        score: ua.score,
        status: ua.status,
        attempts: ua.attempts,
        completedAt: ua.completedAt,
        lastAttemptAt: ua.lastAttemptAt,
      }))

      // Calculate statistics
      const completedActivities = activities.filter((a) => a.status === 'COMPLETED').length
      const scoresArray = activities.filter((a) => a.score !== null).map((a) => a.score!)
      const averageScore =
        scoresArray.length > 0
          ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
          : 0

      gradesData.push({
        studentId: enrollment.studentId,
        studentName: `${enrollment.student.name} ${enrollment.student.lastName}`,
        studentEmail: enrollment.student.email,
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        courseLanguage: enrollment.course.language,
        courseLevel: enrollment.course.level,
        enrollmentStatus: enrollment.status,
        enrollmentProgress: enrollment.progress,
        enrollmentDate: enrollment.enrollmentDate,
        activities: activityData,
        averageScore: Math.round(averageScore * 100) / 100,
        completedActivities,
        totalActivities: activities.length,
      })
    }

    return gradesData
  } catch (error) {
    console.error('Error fetching student grades:', error)
    throw new Error('Failed to fetch student grades')
  }
}

export async function getStudentGradesByCourse(
  studentId: string,
  courseId: string,
  academicPeriodId?: string
): Promise<StudentGradeData | null> {
  try {
    // Si se proporciona academicPeriodId, buscar esa inscripción específica
    // Si no, buscar la inscripción más reciente
    const enrollment = academicPeriodId
      ? await db.enrollment.findUnique({
          where: {
            studentId_courseId_academicPeriodId: {
              studentId,
              courseId,
              academicPeriodId,
            },
          },
        })
      : await db.enrollment.findFirst({
          where: {
            studentId,
            courseId,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        })

    if (!enrollment) {
      return null
    }

    const enrollmentWithDetails = await db.enrollment.findUnique({
      where: { id: enrollment.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
    })

    if (!enrollmentWithDetails) {
      return null
    }

    // Get all activities for this student in this course
    const activities = await db.userActivity.findMany({
      where: {
        userId: studentId,
        activity: {
          OR: [
            {
              modules: {
                some: {
                  module: {
                    courseId,
                  },
                },
              },
            },
            {
              lessons: {
                some: {
                  lesson: {
                    module: {
                      courseId,
                    },
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            activityType: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    })

    const activityData = activities.map((ua) => ({
      activityId: ua.activityId,
      activityTitle: ua.activity.title,
      activityType: ua.activity.activityType,
      score: ua.score,
      status: ua.status,
      attempts: ua.attempts,
      completedAt: ua.completedAt,
      lastAttemptAt: ua.lastAttemptAt,
    }))

    // Calculate statistics
    const completedActivities = activities.filter((a) => a.status === 'COMPLETED').length
    const scoresArray = activities.filter((a) => a.score !== null).map((a) => a.score!)
    const averageScore =
      scoresArray.length > 0
        ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
        : 0

    return {
      studentId: enrollmentWithDetails.studentId,
      studentName: `${enrollmentWithDetails.student.name} ${enrollmentWithDetails.student.lastName}`,
      studentEmail: enrollmentWithDetails.student.email,
      courseId: enrollmentWithDetails.courseId,
      courseTitle: enrollmentWithDetails.course.title,
      courseLanguage: enrollmentWithDetails.course.language,
      courseLevel: enrollmentWithDetails.course.level,
      enrollmentStatus: enrollmentWithDetails.status,
      enrollmentProgress: enrollmentWithDetails.progress,
      enrollmentDate: enrollmentWithDetails.enrollmentDate,
      activities: activityData,
      averageScore: Math.round(averageScore * 100) / 100,
      completedActivities,
      totalActivities: activities.length,
    }
  } catch (error) {
    console.error('Error fetching student grades by course:', error)
    throw new Error('Failed to fetch student grades by course')
  }
}

export async function updateActivityGrade(userId: string, activityId: string, score: number) {
  try {
    const userActivity = await db.userActivity.update({
      where: {
        userId_activityId: {
          userId,
          activityId,
        },
      },
      data: {
        score,
        status: 'COMPLETED',
        completedAt: getCurrentDate(),
      },
    })

    revalidatePath('/admin/grades')
    return { success: true, userActivity }
  } catch (error) {
    console.error('Error updating activity grade:', error)
    return { success: false, error: 'Failed to update activity grade' }
  }
}

export async function getGradeStats() {
  try {
    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalActivities,
      completedActivities,
    ] = await Promise.all([
      db.enrollment.count(),
      db.enrollment.count({ where: { status: 'ACTIVE' } }),
      db.enrollment.count({ where: { status: 'COMPLETED' } }),
      db.userActivity.count(),
      db.userActivity.count({ where: { status: 'COMPLETED' } }),
    ])

    // Calculate average score across all completed activities
    const completedUserActivities = await db.userActivity.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null },
      },
      select: {
        score: true,
      },
    })

    const averageScore =
      completedUserActivities.length > 0
        ? completedUserActivities.reduce((sum, ua) => sum + (ua.score || 0), 0) /
          completedUserActivities.length
        : 0

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalActivities,
      completedActivities,
      averageScore: Math.round(averageScore * 100) / 100,
      completionRate:
        totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
    }
  } catch (error) {
    console.error('Error fetching grade stats:', error)
    throw new Error('Failed to fetch grade statistics')
  }
}

export async function getAllCoursesForGrades() {
  try {
    const courses = await db.course.findMany({
      select: {
        id: true,
        title: true,
        language: true,
        level: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses for grades:', error)
    throw new Error('Failed to fetch courses')
  }
}

export async function getAllStudentsForGrades() {
  try {
    const students = await db.user.findMany({
      where: {
        roles: {
          has: UserRole.STUDENT,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students for grades:', error)
    throw new Error('Failed to fetch students')
  }
}

export async function getStudentProgressReport(studentId: string) {
  try {
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
      },
    })

    if (!student) {
      throw new Error('Student not found')
    }

    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    const progressData = []

    for (const enrollment of enrollments) {
      const activities = await db.userActivity.findMany({
        where: {
          userId: studentId,
          activity: {
            OR: [
              {
                modules: {
                  some: {
                    module: {
                      courseId: enrollment.courseId,
                    },
                  },
                },
              },
              {
                lessons: {
                  some: {
                    lesson: {
                      module: {
                        courseId: enrollment.courseId,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        include: {
          activity: {
            select: {
              title: true,
              activityType: true,
            },
          },
        },
      })

      const completedActivities = activities.filter((a) => a.status === 'COMPLETED').length
      const scoresArray = activities.filter((a) => a.score !== null).map((a) => a.score!)
      const averageScore =
        scoresArray.length > 0
          ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
          : 0

      progressData.push({
        course: enrollment.course,
        enrollmentStatus: enrollment.status,
        enrollmentProgress: enrollment.progress,
        enrollmentDate: enrollment.enrollmentDate,
        totalActivities: activities.length,
        completedActivities,
        averageScore: Math.round(averageScore * 100) / 100,
        activities: activities.map((ua) => ({
          title: ua.activity.title,
          type: ua.activity.activityType,
          score: ua.score,
          status: ua.status,
          attempts: ua.attempts,
          completedAt: ua.completedAt,
        })),
      })
    }

    return {
      student,
      courses: progressData,
    }
  } catch (error) {
    console.error('Error fetching student progress report:', error)
    throw new Error('Failed to fetch student progress report')
  }
}
