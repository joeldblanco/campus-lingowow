'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Since there's no exam model in the schema, I'll create a comprehensive exam system
// using the Activity model with specific exam configurations

export interface ExamQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank'
  question: string
  options?: string[]
  correctAnswer: string | string[]
  points: number
  explanation?: string
}

export interface ExamSection {
  id: string
  title: string
  description?: string
  timeLimit?: number // in minutes
  questions: ExamQuestion[]
  order: number
}

export interface ExamData {
  title: string
  description: string
  sections: ExamSection[]
  totalPoints: number
  timeLimit?: number // total exam time in minutes
  passingScore: number
  isBlocking: boolean // if true, blocks course progression until passed
  isOptional: boolean
  attempts: number // maximum attempts allowed
}

export interface ExamWithDetails {
  id: string
  title: string
  description: string
  activityType: string
  level: number
  points: number
  duration: number
  timeLimit: number | null
  isPublished: boolean
  examData: ExamData
  courseId?: string
  moduleId?: string
  lessonId?: string
  course?: {
    id: string
    title: string
    language: string
    level: string
  } | null
  module?: {
    id: string
    title: string
    level: number
  } | null
  lesson?: {
    id: string
    title: string
  } | null
  userAttempts: {
    userId: string
    score: number | null
    status: string
    attempts: number
    completedAt: Date | null
    user: {
      name: string
      lastName: string
      email: string
    }
  }[]
  createdAt: Date
  updatedAt: Date
}

export async function getAllExams(): Promise<ExamWithDetails[]> {
  try {
    // Get all activities that are configured as exams
    const examActivities = await db.activity.findMany({
      where: {
        activityType: {
          in: ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'OTHER']
        },
        // Filter for exam-like activities based on structure
        activityData: {
          path: ['isExam'],
          equals: true
        }
      },
      include: {
        modules: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    language: true,
                    level: true,
                  }
                }
              }
            }
          }
        },
        lessons: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                        language: true,
                        level: true,
                      }
                    }
                  }
                }
              }
            }
          }
        },
        userProgress: {
          include: {
            user: {
              select: {
                name: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const exams: ExamWithDetails[] = examActivities.map(activity => {
      // Determine course/module/lesson context
      let courseInfo = null
      let moduleInfo = null
      let lessonInfo = null

      if (activity.modules.length > 0) {
        const moduleRelation = activity.modules[0]
        courseInfo = moduleRelation.module.course
        moduleInfo = {
          id: moduleRelation.module.id,
          title: moduleRelation.module.title,
          level: moduleRelation.module.level,
        }
      } else if (activity.lessons.length > 0) {
        const lessonRelation = activity.lessons[0]
        courseInfo = lessonRelation.lesson.module.course
        moduleInfo = {
          id: lessonRelation.lesson.module.id,
          title: lessonRelation.lesson.module.title,
          level: lessonRelation.lesson.module.level,
        }
        lessonInfo = {
          id: lessonRelation.lesson.id,
          title: lessonRelation.lesson.title,
        }
      }

      return {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        activityType: activity.activityType,
        level: activity.level,
        points: activity.points,
        duration: activity.duration,
        timeLimit: activity.timeLimit,
        isPublished: activity.isPublished,
        examData: (activity.activityData as unknown) as ExamData || {} as ExamData,
        courseId: courseInfo?.id,
        moduleId: moduleInfo?.id,
        lessonId: lessonInfo?.id,
        course: courseInfo,
        module: moduleInfo,
        lesson: lessonInfo,
        userAttempts: activity.userProgress.map(up => ({
          userId: up.userId,
          score: up.score,
          status: up.status,
          attempts: up.attempts,
          completedAt: up.completedAt,
          user: up.user,
        })),
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
      }
    })

    return exams
  } catch (error) {
    console.error('Error fetching exams:', error)
    throw new Error('Failed to fetch exams')
  }
}

export async function getExamById(id: string): Promise<ExamWithDetails | null> {
  try {
    const activity = await db.activity.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    language: true,
                    level: true,
                  }
                }
              }
            }
          }
        },
        lessons: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                        language: true,
                        level: true,
                      }
                    }
                  }
                }
              }
            }
          }
        },
        userProgress: {
          include: {
            user: {
              select: {
                name: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      }
    })

    if (!activity) return null

    // Determine course/module/lesson context
    let courseInfo = null
    let moduleInfo = null
    let lessonInfo = null

    if (activity.modules.length > 0) {
      const moduleRelation = activity.modules[0]
      courseInfo = moduleRelation.module.course
      moduleInfo = {
        id: moduleRelation.module.id,
        title: moduleRelation.module.title,
        level: moduleRelation.module.level,
      }
    } else if (activity.lessons.length > 0) {
      const lessonRelation = activity.lessons[0]
      courseInfo = lessonRelation.lesson.module.course
      moduleInfo = {
        id: lessonRelation.lesson.module.id,
        title: lessonRelation.lesson.module.title,
        level: lessonRelation.lesson.module.level,
      }
      lessonInfo = {
        id: lessonRelation.lesson.id,
        title: lessonRelation.lesson.title,
      }
    }

    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activityType: activity.activityType,
      level: activity.level,
      points: activity.points,
      duration: activity.duration,
      timeLimit: activity.timeLimit,
      isPublished: activity.isPublished,
      examData: (activity.activityData as unknown) as ExamData || {} as ExamData,
      courseId: courseInfo?.id,
      moduleId: moduleInfo?.id,
      lessonId: lessonInfo?.id,
      course: courseInfo,
      module: moduleInfo,
      lesson: lessonInfo,
      userAttempts: activity.userProgress.map(up => ({
        userId: up.userId,
        score: up.score,
        status: up.status,
        attempts: up.attempts,
        completedAt: up.completedAt,
        user: up.user,
      })),
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    }
  } catch (error) {
    console.error('Error fetching exam:', error)
    throw new Error('Failed to fetch exam')
  }
}

export interface CreateExamData {
  title: string
  description: string
  courseId?: string
  moduleId?: string
  lessonId?: string
  examData: ExamData
  createdById: string
}

export async function createExam(data: CreateExamData) {
  try {
    // Calculate total points and duration from exam data
    const totalPoints = data.examData.sections.reduce((sum, section) => 
      sum + section.questions.reduce((sectionSum, q) => sectionSum + q.points, 0), 0
    )
    
    const estimatedDuration = data.examData.timeLimit || 
      data.examData.sections.reduce((sum, section) => sum + (section.timeLimit || 30), 0)

    // Create the exam as an activity
    const exam = await db.activity.create({
      data: {
        title: data.title,
        description: data.description,
        activityType: 'OTHER', // We'll use OTHER type for exams
        level: 1,
        points: totalPoints,
        duration: estimatedDuration,
        timeLimit: data.examData.timeLimit,
        activityData: JSON.parse(JSON.stringify({
          ...data.examData,
          isExam: true, // Mark this as an exam
        })),
        steps: JSON.parse(JSON.stringify({
          examSections: data.examData.sections,
        })),
        questions: JSON.parse(JSON.stringify({
          sections: data.examData.sections,
          totalPoints,
          passingScore: data.examData.passingScore,
        })),
        createdById: data.createdById,
        isPublished: false,
      },
    })

    // Associate with course structure
    if (data.moduleId) {
      await db.moduleActivity.create({
        data: {
          moduleId: data.moduleId,
          activityId: exam.id,
          order: 0,
        },
      })
    } else if (data.lessonId) {
      await db.lessonActivity.create({
        data: {
          lessonId: data.lessonId,
          activityId: exam.id,
          order: 0,
        },
      })
    }

    revalidatePath('/admin/exams')
    return { success: true, exam }
  } catch (error) {
    console.error('Error creating exam:', error)
    return { success: false, error: 'Failed to create exam' }
  }
}

export interface UpdateExamData {
  title?: string
  description?: string
  examData?: ExamData
  isPublished?: boolean
}

export async function updateExam(id: string, data: UpdateExamData) {
  try {
    const updateData: Record<string, unknown> = {}
    
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished
    
    if (data.examData) {
      const totalPoints = data.examData.sections.reduce((sum, section) => 
        sum + section.questions.reduce((sectionSum, q) => sectionSum + q.points, 0), 0
      )
      
      updateData.activityData = {
        ...data.examData,
        isExam: true,
      }
      updateData.points = totalPoints
      updateData.timeLimit = data.examData.timeLimit
      updateData.steps = {
        examSections: data.examData.sections,
      }
      updateData.questions = {
        sections: data.examData.sections,
        totalPoints,
        passingScore: data.examData.passingScore,
      }
    }

    const exam = await db.activity.update({
      where: { id },
      data: updateData,
    })

    revalidatePath('/admin/exams')
    return { success: true, exam }
  } catch (error) {
    console.error('Error updating exam:', error)
    return { success: false, error: 'Failed to update exam' }
  }
}

export async function deleteExam(id: string) {
  try {
    // Check if exam has student attempts
    const attemptCount = await db.userActivity.count({
      where: { activityId: id },
    })

    if (attemptCount > 0) {
      return { success: false, error: 'Cannot delete exam with student attempts' }
    }

    await db.activity.delete({
      where: { id },
    })

    revalidatePath('/admin/exams')
    return { success: true }
  } catch (error) {
    console.error('Error deleting exam:', error)
    return { success: false, error: 'Failed to delete exam' }
  }
}

export async function getExamStats() {
  try {
    const [totalExams, publishedExams, totalAttempts, passedAttempts] = await Promise.all([
      db.activity.count({
        where: {
          activityData: {
            path: ['isExam'],
            equals: true
          }
        }
      }),
      db.activity.count({
        where: {
          activityData: {
            path: ['isExam'],
            equals: true
          },
          isPublished: true
        }
      }),
      db.userActivity.count({
        where: {
          activity: {
            activityData: {
              path: ['isExam'],
              equals: true
            }
          }
        }
      }),
      db.userActivity.count({
        where: {
          activity: {
            activityData: {
              path: ['isExam'],
              equals: true
            }
          },
          status: 'COMPLETED',
          score: { gte: 70 } // Assuming 70% is passing
        }
      })
    ])

    return {
      totalExams,
      publishedExams,
      unpublishedExams: totalExams - publishedExams,
      totalAttempts,
      passedAttempts,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
    }
  } catch (error) {
    console.error('Error fetching exam stats:', error)
    throw new Error('Failed to fetch exam statistics')
  }
}

export async function getCoursesForExams() {
  try {
    const courses = await db.course.findMany({
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            level: true,
            order: true,
            lessons: {
              select: {
                id: true,
                title: true,
                order: true,
              }
            }
          }
        }
      },
      orderBy: { title: 'asc' }
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses for exams:', error)
    throw new Error('Failed to fetch courses')
  }
}

export async function assignExamToStudents(examId: string, studentIds: string[]) {
  try {
    const assignments = await Promise.all(
      studentIds.map(studentId =>
        db.userActivity.upsert({
          where: {
            userId_activityId: {
              userId: studentId,
              activityId: examId,
            }
          },
          update: {
            status: 'ASSIGNED',
            assignedAt: new Date(),
          },
          create: {
            userId: studentId,
            activityId: examId,
            status: 'ASSIGNED',
            assignedAt: new Date(),
          }
        })
      )
    )

    revalidatePath('/admin/exams')
    return { success: true, assignments }
  } catch (error) {
    console.error('Error assigning exam to students:', error)
    return { success: false, error: 'Failed to assign exam to students' }
  }
}
