'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getAllModules() {
  try {
    const modules = await prisma.module.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          select: {
            id: true,
          },
        },
        activities: true,
        _count: {
          select: {
            lessons: true,
            activities: true,
          },
        },
      },
      orderBy: [{ course: { title: 'asc' } }, { order: 'asc' }, { createdAt: 'desc' }],
    })

    return modules.map((moduleItem) => ({
      ...moduleItem,
      lessonsCount: moduleItem._count.lessons,
      activitiesCount: moduleItem._count.activities,
    }))
  } catch (error) {
    console.error('Error fetching modules:', error)
    throw new Error('Failed to fetch modules')
  }
}

export async function getModuleStats() {
  try {
    const [totalModules, publishedModules, totalLessons, totalActivities] = await Promise.all([
      prisma.module.count(),
      prisma.module.count({ where: { isPublished: true } }),
      prisma.lesson.count(),
      prisma.moduleActivity.count(),
    ])

    return {
      total: totalModules,
      published: publishedModules,
      draft: totalModules - publishedModules,
      totalLessons,
      totalActivities,
    }
  } catch (error) {
    console.error('Error fetching module stats:', error)
    throw new Error('Failed to fetch module stats')
  }
}

export async function createModule(data: {
  title: string
  description?: string
  level: number
  order: number
  courseId: string
  isPublished?: boolean
}) {
  try {
    const moduleItem = await prisma.module.create({
      data: {
        title: data.title,
        description: data.description || '',
        level: data.level,
        order: data.order,
        courseId: data.courseId,
        isPublished: data.isPublished || false,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    revalidatePath('/admin/units')
    return moduleItem
  } catch (error) {
    console.error('Error creating module:', error)
    throw new Error('Failed to create module')
  }
}

export async function updateModule(
  id: string,
  data: {
    title?: string
    description?: string
    level?: number
    order?: number
    courseId?: string
    isPublished?: boolean
  }
) {
  try {
    const moduleItem = await prisma.module.update({
      where: { id },
      data,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    revalidatePath('/admin/units')
    return moduleItem
  } catch (error) {
    console.error('Error updating module:', error)
    throw new Error('Failed to update module')
  }
}

export async function deleteModule(id: string) {
  try {
    await prisma.module.delete({
      where: { id },
    })

    revalidatePath('/admin/units')
    return { success: true }
  } catch (error) {
    console.error('Error deleting module:', error)
    throw new Error('Failed to delete module')
  }
}

export async function getModuleById(id: string) {
  try {
    const moduleItem = await prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          select: {
            id: true,
            title: true,
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

    return moduleItem
  } catch (error) {
    console.error('Error fetching module:', error)
    throw new Error('Failed to fetch module')
  }
}

export async function getAllCourses() {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
      },
      where: {
        isPublished: true,
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw new Error('Failed to fetch courses')
  }
}
