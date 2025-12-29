'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { CourseWithDetails } from '@/types/course'
import { CreateCourseSchema, EditCourseSchema } from '@/schemas/courses'
import * as z from 'zod'

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

export async function createCourse(data: z.infer<typeof CreateCourseSchema>) {
  try {
    // Validate input data
    const validatedData = CreateCourseSchema.parse(data)

    // Check if course title already exists
    const existingCourse = await db.course.findFirst({
      where: { title: validatedData.title },
    })

    if (existingCourse) {
      return { success: false, error: 'Ya existe un curso con este título' }
    }

    const course = await db.course.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        language: validatedData.language,
        level: validatedData.level,
        ...(validatedData.image && { image: validatedData.image }),
        createdById: validatedData.createdById,
        isPublished: false,
      },
    })

    revalidatePath('/admin/courses')
    return { success: true, course }
  } catch (error) {
    console.error('Error creating course:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return { success: false, error: 'Error al crear el curso' }
  }
}

export interface UpdateCourseData {
  title?: string
  description?: string
  language?: string
  level?: string
  isPublished?: boolean
}

export async function updateCourse(id: string, data: z.infer<typeof EditCourseSchema>) {
  try {
    // Validate input data
    const validatedData = EditCourseSchema.parse(data)

    const course = await db.course.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.image && { image: validatedData.image }),
      },
    })

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${id}`)
    return { success: true, course }
  } catch (error) {
    console.error('Error updating course:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return { success: false, error: 'Error al actualizar el curso' }
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

export async function updateModule(
  id: string,
  data: Partial<CreateModuleData> & { isPublished?: boolean }
) {
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
        classDuration: true,
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

// Get courses for public view with enrollment status
export async function getCoursesForPublicView(userId?: string) {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        modules: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            _count: {
              select: {
                lessons: true,
              },
            },
          },
          where: {
            isPublished: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        enrollments: userId
          ? {
              where: {
                studentId: userId,
              },
              select: {
                id: true,
                status: true,
                progress: true,
                enrollmentDate: true,
              },
            }
          : false,
        _count: {
          select: {
            modules: {
              where: {
                isPublished: true,
              },
            },
            enrollments: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return courses.map((course) => ({
      ...course,
      isEnrolled: userId ? course.enrollments.length > 0 : false,
      enrollment: userId && course.enrollments.length > 0 ? course.enrollments[0] : null,
    }))
  } catch (error) {
    console.error('Error fetching courses for public view:', error)
    throw new Error('Failed to fetch courses')
  }
}

// Get course details with enrollment status and content
export async function getCourseForPublicView(courseId: string, userId?: string) {
  try {
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            bio: true,
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
            lessons: {
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                contents: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    contentType: true,
                    order: true,
                  },
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              where: {
                isPublished: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            _count: {
              select: {
                lessons: true,
              },
            },
          },
          where: {
            isPublished: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        enrollments: userId
          ? {
              where: {
                studentId: userId,
              },
              select: {
                id: true,
                status: true,
                progress: true,
                enrollmentDate: true,
                lastAccessed: true,
              },
            }
          : false,
        _count: {
          select: {
            modules: {
              where: {
                isPublished: true,
              },
            },
            enrollments: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    })

    if (!course) {
      return null
    }

    return {
      ...course,
      isEnrolled: userId ? course.enrollments.length > 0 : false,
      enrollment: userId && course.enrollments.length > 0 ? course.enrollments[0] : null,
    }
  } catch (error) {
    console.error('Error fetching course for public view:', error)
    throw new Error('Failed to fetch course')
  }
}

// Get course progress for enrolled students
export async function getCourseProgress(
  courseId: string,
  userId: string,
  academicPeriodId?: string
) {
  try {
    // Si se proporciona academicPeriodId, buscar esa inscripción específica
    // Si no, buscar la inscripción más reciente
    const enrollment = academicPeriodId
      ? await db.enrollment.findUnique({
          where: {
            studentId_courseId_academicPeriodId: {
              studentId: userId,
              courseId: courseId,
              academicPeriodId: academicPeriodId,
            },
          },
        })
      : await db.enrollment.findFirst({
          where: {
            studentId: userId,
            courseId: courseId,
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
            completedContents: {
              select: {
                contentId: true,
                completed: true,
                percentage: true,
                lastAccessed: true,
              },
            },
            activities: {
              select: {
                activityId: true,
                status: true,
                score: true,
                completedAt: true,
              },
            },
          },
        },
        course: {
          select: {
            modules: {
              select: {
                id: true,
                lessons: {
                  select: {
                    id: true,
                    contents: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
              where: {
                isPublished: true,
              },
            },
          },
        },
      },
    })

    if (!enrollmentWithDetails) {
      return null
    }

    // Calculate total content items
    const totalContents = enrollmentWithDetails.course.modules.reduce((total, module) => {
      return (
        total +
        module.lessons.reduce((lessonTotal, lesson) => {
          return lessonTotal + lesson.contents.length
        }, 0)
      )
    }, 0)

    // Calculate completed content items
    const completedContents = enrollmentWithDetails.student.completedContents.filter(
      (content) => content.completed
    ).length

    // Calculate overall progress percentage
    const progressPercentage = totalContents > 0 ? (completedContents / totalContents) * 100 : 0

    return {
      enrollment: enrollmentWithDetails,
      totalContents,
      completedContents,
      progressPercentage: Math.round(progressPercentage),
      completedContentIds: enrollmentWithDetails.student.completedContents.map((c) => c.contentId),
      completedActivities: enrollmentWithDetails.student.activities.filter(
        (a) => a.status === 'COMPLETED'
      ),
    }
  } catch (error) {
    console.error('Error fetching course progress:', error)
    throw new Error('Failed to fetch course progress')
  }
}

export async function archiveCourse(id: string) {
  try {
    await db.course.update({
      where: { id },
      data: { isPublished: false },
    })
    revalidatePath(`/admin/courses/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error archiving course:', error)
    return { success: false, error: 'Failed to archive course' }
  }
}

export async function updateCourseImage(id: string, imageUrl: string) {
  try {
    await db.course.update({
      where: { id },
      data: { image: imageUrl },
    })
    revalidatePath(`/admin/courses/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating course image:', error)
    return { success: false, error: 'Failed to update course image' }
  }
}
