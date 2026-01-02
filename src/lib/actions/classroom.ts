'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'

// Fetch the full course structure (Modules > Lessons) for a given booking
// This allows the teacher to navigate and select lessons.
// Includes both regular course lessons AND personalized student lessons
export async function getBookingCourseStructure(bookingId: string) {
  try {
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        enrollment: {
          include: {
            course: {
              include: {
                modules: {
                  orderBy: { order: 'asc' },
                  include: {
                    lessons: {
                      orderBy: { order: 'asc' },
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        duration: true,
                        videoUrl: true,
                      },
                    },
                  },
                },
              },
            },
            // Include personalized student lessons for this enrollment
            studentLessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                videoUrl: true,
                isPublished: true,
              },
            },
          },
        },
      },
    })

    if (!booking) throw new Error('Booking not found')

    // Build the structure with regular modules
    const modules = booking.enrollment.course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons,
    }))

    // Add personalized lessons as a separate "module" if they exist
    const studentLessons = booking.enrollment.studentLessons
    if (studentLessons && studentLessons.length > 0) {
      modules.unshift({
        id: 'personalized',
        title: '📚 Programa Personalizado',
        lessons: studentLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          videoUrl: lesson.videoUrl,
        })),
      })
    }

    return modules
  } catch (error) {
    console.error('Error fetching course structure:', error)
    return []
  }
}

// Fetch a specific lesson's full content for view
// Supports both regular Lesson and personalized StudentLesson
export async function getLessonContent(lessonId: string) {
  try {
    // First try to find a regular lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (lesson) {
      return lesson
    }

    // If not found, try to find a personalized student lesson
    const studentLesson = await db.studentLesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (studentLesson) {
      // Map StudentLesson to the same format as Lesson for compatibility
      return {
        id: studentLesson.id,
        title: studentLesson.title,
        description: studentLesson.description,
        order: studentLesson.order,
        duration: studentLesson.duration,
        content: studentLesson.content,
        isPublished: studentLesson.isPublished,
        videoUrl: studentLesson.videoUrl,
        summary: studentLesson.summary,
        transcription: studentLesson.transcription,
        contents: studentLesson.contents,
        createdAt: studentLesson.createdAt,
        updatedAt: studentLesson.updatedAt,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching lesson content:', error)
    return null
  }
}

// Types for content picker
export interface ShareableContent {
  id: string
  title: string
  description: string | null
  type: 'lesson' | 'student_lesson' | 'library_resource'
  thumbnailUrl?: string | null
  duration?: number | null
  level?: string | null
  category?: string | null
}

// Get all shareable content for the teacher in classroom
// Includes: library resources, admin-created lessons, and teacher's own student lessons
export async function getShareableContent(searchQuery?: string): Promise<ShareableContent[]> {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  try {
    const results: ShareableContent[] = []

    // 1. Get published library resources (articles, etc.)
    const libraryResources = await db.libraryResource.findMany({
      where: {
        status: 'PUBLISHED',
        ...(searchQuery ? {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        duration: true,
        level: true,
        category: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
      take: 50,
    })

    for (const resource of libraryResources) {
      results.push({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: 'library_resource',
        thumbnailUrl: resource.thumbnailUrl,
        duration: resource.duration,
        level: resource.level,
        category: resource.category?.name,
      })
    }

    // 2. Get published lessons from courses (admin-created)
    const lessons = await db.lesson.findMany({
      where: {
        isPublished: true,
        ...(searchQuery ? {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        videoUrl: true,
        module: {
          select: {
            title: true,
            course: { select: { title: true, level: true } }
          }
        }
      },
      orderBy: { title: 'asc' },
      take: 50,
    })

    for (const lesson of lessons) {
      results.push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: 'lesson',
        thumbnailUrl: lesson.videoUrl,
        duration: lesson.duration,
        level: lesson.module.course.level,
        category: `${lesson.module.course.title} - ${lesson.module.title}`,
      })
    }

    // 3. Get teacher's own student lessons (personalized content)
    const studentLessons = await db.studentLesson.findMany({
      where: {
        teacherId: session.user.id,
        isPublished: true,
        ...(searchQuery ? {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        videoUrl: true,
        student: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
      take: 50,
    })

    for (const lesson of studentLessons) {
      results.push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: 'student_lesson',
        thumbnailUrl: lesson.videoUrl,
        duration: lesson.duration,
        category: `Creado para: ${lesson.student.name}`,
      })
    }

    return results
  } catch (error) {
    console.error('Error fetching shareable content:', error)
    return []
  }
}
