'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { CreateModuleSchema, EditModuleSchema } from '@/schemas/modules'
import * as z from 'zod'

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

export async function createModule(data: z.infer<typeof CreateModuleSchema>) {
  try {
    // Validate input data
    const validatedData = CreateModuleSchema.parse(data)

    const moduleItem = await prisma.module.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || '',
        level: validatedData.level,
        order: validatedData.order,
        courseId: validatedData.courseId,
        isPublished: validatedData.isPublished || false,
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

    revalidatePath('/admin/courses')
    return moduleItem
  } catch (error) {
    console.error('Error creating module:', error)

    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map((e) => e.message).join(', '))
    }

    throw new Error('Error al crear el módulo')
  }
}

export async function updateModule(id: string, data: z.infer<typeof EditModuleSchema>) {
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

    revalidatePath('/admin/courses')
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

    revalidatePath('/admin/courses')
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
