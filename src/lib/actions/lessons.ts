'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

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

export async function createLesson(data: {
  title: string
  description: string
  order: number
  moduleId: string
}) {
  try {
    const lesson = await prisma.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        order: data.order,
        moduleId: data.moduleId,
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

    revalidatePath('/admin/lessons')
    return lesson
  } catch (error) {
    console.error('Error creating lesson:', error)
    throw new Error('Failed to create lesson')
  }
}

export async function updateLesson(
  id: string,
  data: {
    title?: string
    description?: string
    order?: number
    moduleId?: string
  }
) {
  try {
    const lesson = await prisma.lesson.update({
      where: { id },
      data,
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

    revalidatePath('/admin/lessons')
    return lesson
  } catch (error) {
    console.error('Error updating lesson:', error)
    throw new Error('Failed to update lesson')
  }
}

export async function deleteLesson(id: string) {
  try {
    await prisma.lesson.delete({
      where: { id },
    })

    revalidatePath('/admin/lessons')
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
