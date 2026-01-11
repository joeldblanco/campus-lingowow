'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { CreateLessonSchema, EditLessonSchema } from '@/schemas/lessons'
import * as z from 'zod'

export async function getAllLessons() {
  try {
    const lessons = await prisma.lesson.findMany({
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contents: {
          select: {
            id: true,
          },
        },
        activities: true,
        _count: {
          select: {
            contents: true,
            activities: true,
          },
        },
      },
      orderBy: [
        { module: { course: { title: 'asc' } } },
        { module: { title: 'asc' } },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return lessons.map((lesson) => ({
      ...lesson,
      contentsCount: lesson._count.contents,
      activitiesCount: lesson._count.activities,
    }))
  } catch (error) {
    console.error('Error fetching lessons:', error)
    throw new Error('Failed to fetch lessons')
  }
}

export async function getLessonStats() {
  try {
    const [totalLessons, totalContents, totalActivities] = await Promise.all([
      prisma.lesson.count(),
      prisma.content.count(),
      prisma.lessonActivity.count(),
    ])

    return {
      total: totalLessons,
      totalContents,
      totalActivities,
    }
  } catch (error) {
    console.error('Error fetching lesson stats:', error)
    throw new Error('Failed to fetch lesson stats')
  }
}

export async function createLesson(data: z.infer<typeof CreateLessonSchema>) {
  try {
    // Validate input data
    const validatedData = CreateLessonSchema.parse(data)

    // Calcular el orden automáticamente basándose en las lecciones existentes en el módulo
    const maxOrderLesson = await prisma.lesson.findFirst({
      where: { moduleId: validatedData.moduleId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const nextOrder = (maxOrderLesson?.order ?? 0) + 1

    const lesson = await prisma.lesson.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        order: nextOrder,
        moduleId: validatedData.moduleId,
        ...(validatedData.duration && { duration: validatedData.duration }),
        ...(validatedData.videoUrl && { videoUrl: validatedData.videoUrl }),
        ...(validatedData.resources && { resources: validatedData.resources }),
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    revalidatePath('/admin/courses')
    return lesson
  } catch (error) {
    console.error('Error creating lesson:', error)

    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map((e) => e.message).join(', '))
    }

    throw new Error('Error al crear la lección')
  }
}

export async function updateLesson(id: string, data: z.infer<typeof EditLessonSchema>) {
  try {
    // Validate input data
    const validatedData = EditLessonSchema.parse(data)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.duration && { duration: validatedData.duration }),
        ...(validatedData.videoUrl && { videoUrl: validatedData.videoUrl }),
        ...(validatedData.resources && { resources: validatedData.resources }),
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    revalidatePath('/admin/courses')
    return lesson
  } catch (error) {
    console.error('Error updating lesson:', error)

    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map((e) => e.message).join(', '))
    }

    throw new Error('Error al actualizar la lección')
  }
}

export async function deleteLesson(id: string) {
  try {
    await prisma.lesson.delete({
      where: { id },
    })

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error) {
    console.error('Error deleting lesson:', error)
    throw new Error('Failed to delete lesson')
  }
}

export async function getLessonById(id: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contents: {
          select: {
            id: true,
            title: true,
            contentType: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        activities: {
          include: {
            activity: {
              select: {
                id: true,
                title: true,
                activityType: true,
                points: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return lesson
  } catch (error) {
    console.error('Error fetching lesson:', error)
    throw new Error('Failed to fetch lesson')
  }
}

import type { LessonForView } from '@/types/lesson'

export async function getLessonForStudent(
  lessonId: string,
  userId: string
): Promise<LessonForView | null> {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contents: {
          where: { parentId: null }, // Only get top-level content (roots)
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  // 2 levels deep should be enough for Tabs > Item > Content
                  orderBy: { order: 'asc' },
                },
              },
            },
            // Include legacy relations for backward compatibility if needed,
            // though we prefer 'data'
            grammarCard: true,
            leveledText: true,
            thematicGlossary: true,
            downloadableResource: true,
            activity: true,
          },
        },
        activities: {
          include: {
            activity: {
              select: {
                id: true,
                title: true,
                activityType: true,
                points: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!lesson) return null

    // Fetch user progress for activities
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId,
        activityId: {
          in: lesson.activities.map((a) => a.activityId),
        },
      },
    })

    const completedActivityIds = new Set(
      userActivities.filter((ua) => ua.status === 'COMPLETED').map((ua) => ua.activityId)
    )

    const lessonForView = {
      ...lesson,
      activities: lesson.activities.map((activity) => ({
        ...activity,
        isCompleted: completedActivityIds.has(activity.activityId),
      })),
    }

    return lessonForView as unknown as LessonForView
  } catch (error) {
    console.error('Error fetching lesson for student:', error)
    throw new Error('Failed to fetch lesson for student')
  }
}

export async function getAllModulesForLessons() {
  try {
    const modules = await prisma.module.findMany({
      select: {
        id: true,
        title: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      where: {
        isPublished: true,
      },
      orderBy: [{ course: { title: 'asc' } }, { title: 'asc' }],
    })

    return modules
  } catch (error) {
    console.error('Error fetching modules:', error)
    throw new Error('Failed to fetch modules')
  }
}

export async function getCoursesForLessons() {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
      },
      where: {
        isPublished: true,
      },
      orderBy: { title: 'asc' },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw new Error('Failed to fetch courses')
  }
}

export async function getModulesByCourse(courseId: string, isPublished?: boolean) {
  try {
    const modules = await prisma.module.findMany({
      select: {
        id: true,
        title: true,
        order: true,
      },
      where: {
        courseId: courseId,
        ...(isPublished ? { isPublished } : {}),
      },
      orderBy: { order: 'asc' },
    })

    return modules
  } catch (error) {
    console.error('Error fetching modules by course:', error)
    throw new Error('Failed to fetch modules')
  }
}

export async function getCourseIdByModule(moduleId: string) {
  try {
    const moduleData = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        courseId: true,
      },
    })

    return moduleData?.courseId || null
  } catch (error) {
    console.error('Error fetching course by module:', error)
    throw new Error('Failed to fetch course')
  }
}
