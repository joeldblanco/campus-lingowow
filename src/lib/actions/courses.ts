'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { CourseWithDetails } from '@/types/course'

export async function getAllCourses(): Promise<CourseWithDetails[]> {
  try {
    const courses = await db.course.findMany({
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        modules: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            order: true,
            isPublished: true,
            _count: {
              select: {
                lessons: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        enrollments: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw new Error('Failed to fetch courses')
  }
}

export async function getCourseById(id: string): Promise<CourseWithDetails | null> {
  try {
    const course = await db.course.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        modules: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            order: true,
            isPublished: true,
            _count: {
              select: {
                lessons: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        enrollments: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    })

    return course
  } catch (error) {
    console.error('Error fetching course:', error)
    throw new Error('Failed to fetch course')
  }
}

export interface CreateCourseData {
  title: string
  description: string
  language: string
  level: string
  createdById: string
}

export async function createCourse(data: CreateCourseData) {
  try {
    const course = await db.course.create({
      data: {
        title: data.title,
        description: data.description,
        language: data.language,
        level: data.level,
        createdById: data.createdById,
        isPublished: false,
      },
    })

    revalidatePath('/admin/courses')
    return { success: true, course }
  } catch (error) {
    console.error('Error creating course:', error)
    return { success: false, error: 'Failed to create course' }
  }
}

export interface UpdateCourseData {
  title?: string
  description?: string
  language?: string
  level?: string
  isPublished?: boolean
}

export async function updateCourse(id: string, data: UpdateCourseData) {
  try {
    const course = await db.course.update({
      where: { id },
      data,
    })

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${id}`)
    return { success: true, course }
  } catch (error) {
    console.error('Error updating course:', error)
    return { success: false, error: 'Failed to update course' }
  }
}

export async function deleteCourse(id: string) {
  try {
    // Check if course has enrollments
    const enrollmentCount = await db.enrollment.count({
      where: { courseId: id },
    })

    if (enrollmentCount > 0) {
      return { success: false, error: 'Cannot delete course with active enrollments' }
    }

    await db.course.delete({
      where: { id },
    })

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error) {
    console.error('Error deleting course:', error)
    return { success: false, error: 'Failed to delete course' }
  }
}

export async function toggleCoursePublished(id: string) {
  try {
    const course = await db.course.findUnique({
      where: { id },
      select: { isPublished: true },
    })

    if (!course) {
      return { success: false, error: 'Course not found' }
    }

    const updatedCourse = await db.course.update({
      where: { id },
      data: {
        isPublished: !course.isPublished,
      },
    })

    revalidatePath('/admin/courses')
    return { success: true, course: updatedCourse }
  } catch (error) {
    console.error('Error toggling course published status:', error)
    return { success: false, error: 'Failed to update course status' }
  }
}

export async function getCourseStats() {
  try {
    const [totalCourses, publishedCourses, totalEnrollments, totalModules] = await Promise.all([
      db.course.count(),
      db.course.count({ where: { isPublished: true } }),
      db.enrollment.count(),
      db.module.count(),
    ])

    return {
      totalCourses,
      publishedCourses,
      unpublishedCourses: totalCourses - publishedCourses,
      totalEnrollments,
      totalModules,
    }
  } catch (error) {
    console.error('Error fetching course stats:', error)
    throw new Error('Failed to fetch course statistics')
  }
}

// Module management functions
export interface CreateModuleData {
  title: string
  description?: string
  level: number
  order: number
  courseId: string
}

export async function createModule(data: CreateModuleData) {
  try {
    const courseModule = await db.module.create({
      data: {
        title: data.title,
        description: data.description,
        level: data.level,
        order: data.order,
        courseId: data.courseId,
        isPublished: false,
      },
    })

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${data.courseId}`)
    return { success: true, module: courseModule }
  } catch (error) {
    console.error('Error creating module:', error)
    return { success: false, error: 'Failed to create module' }
  }
}

export async function updateModule(id: string, data: Partial<CreateModuleData> & { isPublished?: boolean }) {
  try {
    const courseModule = await db.module.update({
      where: { id },
      data,
    })

    revalidatePath('/admin/courses')
    return { success: true, module: courseModule }
  } catch (error) {
    console.error('Error updating module:', error)
    return { success: false, error: 'Failed to update module' }
  }
}

export async function deleteModule(id: string) {
  try {
    const courseModule = await db.module.findUnique({
      where: { id },
      select: { courseId: true },
    })

    if (!courseModule) {
      return { success: false, error: 'Module not found' }
    }

    await db.module.delete({
      where: { id },
    })

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${courseModule.courseId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting module:', error)
    return { success: false, error: 'Failed to delete module' }
  }
}

// Get courses for product selection
export async function getCoursesForProducts() {
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
        language: true,
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses for products:', error)
    throw new Error('Failed to fetch courses')
  }
}
