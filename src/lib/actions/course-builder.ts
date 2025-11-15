'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import type { Module as PrismaModule, Lesson as PrismaLesson } from '@prisma/client'
import { CourseBuilderData, Module, Lesson, Block } from '@/types/course-builder'

// Update course information
export async function updateCourseInfo(courseId: string, updates: Partial<CourseBuilderData>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    const updatedCourse = await db.course.update({
      where: { id: courseId },
      data: {
        title: updates.title,
        description: updates.description,
        language: updates.language,
        level: updates.level,
        classDuration: updates.classDuration,
        image: updates.image,
        isPublished: updates.isPublished,
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    })

    // Transform to CourseBuilderData format
    const courseBuilderData: CourseBuilderData = {
      id: updatedCourse.id,
      title: updatedCourse.title,
      description: updatedCourse.description || '',
      language: updatedCourse.language,
      level: updatedCourse.level,
      classDuration: updatedCourse.classDuration,
      image: updatedCourse.image || '',
      isPublished: updatedCourse.isPublished,
      createdById: updatedCourse.createdById,
      modules: updatedCourse.modules.map((module: PrismaModule & { lessons: PrismaLesson[] }) => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        level: module.level,
        order: module.order,
        objectives: module.objectives || '',
        isPublished: module.isPublished,
        lessons: module.lessons.map((lesson: PrismaLesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          order: lesson.order,
          duration: lesson.duration,
          blocks: lesson.content ? JSON.parse(lesson.content) : [],
          moduleId: lesson.moduleId,
          isPublished: lesson.isPublished,
        })),
        courseId: module.courseId,
      })),
    }

    return { success: true, course: courseBuilderData }
  } catch (error) {
    console.error('Error updating course:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create or update module
export async function upsertModule(courseId: string, moduleData: Partial<Module>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    let moduleRecord
    if (moduleData.id) {
      // Update existing module
      moduleRecord = await db.module.update({
        where: { id: moduleData.id },
        data: {
          title: moduleData.title,
          description: moduleData.description,
          level: moduleData.level,
          order: moduleData.order,
          objectives: moduleData.objectives,
          isPublished: moduleData.isPublished,
        },
      })
    } else {
      // Create new module
      moduleRecord = await db.module.create({
        data: {
          title: moduleData.title || '',
          description: moduleData.description || '',
          level: moduleData.level || 1,
          order: moduleData.order || 1,
          objectives: moduleData.objectives || '',
          isPublished: moduleData.isPublished || false,
          courseId,
        },
      })
    }

    return { success: true, module: moduleRecord }
  } catch (error) {
    console.error('Error upserting module:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete module
export async function deleteModule(moduleId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the module through the course
    const moduleRecord = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            createdById: true,
          },
        },
      },
    })

    if (!moduleRecord || moduleRecord.course.createdById !== userId) {
      throw new Error('Module not found or unauthorized')
    }

    await db.module.delete({
      where: { id: moduleId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting module:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Reorder modules
export async function reorderModules(courseId: string, moduleIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    // Update order for all modules
    const updatePromises = moduleIds.map((id, index) =>
      db.module.update({
        where: { id },
        data: { order: index + 1 },
      })
    )

    await Promise.all(updatePromises)

    return { success: true }
  } catch (error) {
    console.error('Error reordering modules:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create or update lesson
export async function upsertLesson(moduleId: string, lessonData: Partial<Lesson>) {
  try {
    let lesson
    if (lessonData.id) {
      // Update existing lesson
      lesson = await db.lesson.update({
        where: { id: lessonData.id },
        data: {
          title: lessonData.title,
          description: lessonData.description,
          order: lessonData.order,
          duration: lessonData.duration,
          content: lessonData.blocks ? JSON.stringify(lessonData.blocks) : undefined,
          isPublished: lessonData.isPublished,
        },
      })
    } else {
      // Create new lesson
      lesson = await db.lesson.create({
        data: {
          title: lessonData.title || '',
          description: lessonData.description || '',
          order: lessonData.order || 1,
          duration: lessonData.duration || 30,
          content: lessonData.blocks ? JSON.stringify(lessonData.blocks) : '[]',
          isPublished: lessonData.isPublished || false,
          moduleId,
        },
      })
    }

    return { success: true, lesson }
  } catch (error) {
    console.error('Error upserting lesson:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete lesson
export async function deleteLesson(lessonId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the lesson through the module
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: {
                createdById: true,
              },
            },
          },
        },
      },
    })

    if (!lesson || lesson.module.course.createdById !== userId) {
      throw new Error('Lesson not found or unauthorized')
    }

    await db.lesson.delete({
      where: { id: lessonId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Update lesson blocks
export async function updateLessonBlocks(lessonId: string, blocks: Block[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the lesson through the module
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: {
                createdById: true,
              },
            },
          },
        },
      },
    })

    if (!lesson || lesson.module.course.createdById !== userId) {
      throw new Error('Lesson not found or unauthorized')
    }

    const updatedLesson = await db.lesson.update({
      where: { id: lessonId },
      data: {
        content: JSON.stringify(blocks),
      },
    })

    return { success: true, lesson: updatedLesson }
  } catch (error) {
    console.error('Error updating lesson blocks:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get course with all data for builder
export async function getCourseForBuilder(courseId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    // Transform to CourseBuilderData format
    const courseBuilderData: CourseBuilderData = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      language: course.language,
      level: course.level,
      classDuration: course.classDuration,
      image: course.image || '',
      isPublished: course.isPublished,
      createdById: course.createdById,
      modules: course.modules.map((module: PrismaModule & { lessons: PrismaLesson[] }) => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        level: module.level,
        order: module.order,
        objectives: module.objectives || '',
        isPublished: module.isPublished,
        lessons: module.lessons.map((lesson: PrismaLesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          order: lesson.order,
          duration: lesson.duration,
          blocks: lesson.content ? JSON.parse(lesson.content) : [],
          moduleId: lesson.moduleId,
          isPublished: lesson.isPublished,
        })),
        courseId: module.courseId,
      })),
    }

    return { success: true, course: courseBuilderData }
  } catch (error) {
    console.error('Error getting course for builder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
