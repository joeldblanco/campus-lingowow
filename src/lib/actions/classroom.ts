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

// Fetch content by ID and type - supports all shareable content types
export async function getContentById(contentId: string, contentType: 'lesson' | 'student_lesson' | 'library_resource') {
  try {
    if (contentType === 'lesson') {
      const lesson = await db.lesson.findUnique({
        where: { id: contentId },
        include: {
          contents: { orderBy: { order: 'asc' } },
        },
      })
      return lesson
    }

    if (contentType === 'student_lesson') {
      const studentLesson = await db.studentLesson.findUnique({
        where: { id: contentId },
        include: {
          contents: { orderBy: { order: 'asc' } },
        },
      })
      if (studentLesson) {
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
    }

    if (contentType === 'library_resource') {
      const resource = await db.libraryResource.findUnique({
        where: { id: contentId },
      })
      if (resource) {
        // Create a synthetic content block from the library resource
        const syntheticContent = {
          id: `content-${resource.id}`,
          type: 'text',
          order: 0,
          data: { html: resource.content || `<p>${resource.description || ''}</p>` },
          lessonId: resource.id,
          parentId: null,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
          children: [],
        }

        // Map LibraryResource to a lesson-like format for the viewer
        return {
          id: resource.id,
          title: resource.title,
          description: resource.description || '',
          order: 0,
          duration: resource.duration ? Math.floor(resource.duration / 60) : null,
          content: null,
          isPublished: true,
          videoUrl: resource.fileUrl,
          summary: resource.excerpt,
          transcription: null,
          contents: [syntheticContent],
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
          // Extra fields for library resources
          thumbnailUrl: resource.thumbnailUrl,
          resourceType: resource.type,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching content by ID:', error)
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

// Get shareable content for the teacher in classroom
// Optimized: minimal initial load, search triggers server query
export async function getShareableContent(
  searchQuery?: string,
  contentType?: 'all' | 'lesson' | 'student_lesson' | 'library_resource'
): Promise<ShareableContent[]> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return []
  }

  const limit = 6 // Fast initial load with few items

  const searchFilter = searchQuery ? {
    OR: [
      { title: { contains: searchQuery, mode: 'insensitive' as const } },
      { description: { contains: searchQuery, mode: 'insensitive' as const } },
    ]
  } : {}

  try {
    const results: ShareableContent[] = []

    // Only fetch requested types (or all if not specified)
    const fetchLibrary = !contentType || contentType === 'all' || contentType === 'library_resource'
    const fetchLessons = !contentType || contentType === 'all' || contentType === 'lesson'
    const fetchStudentLessons = !contentType || contentType === 'all' || contentType === 'student_lesson'

    // Run queries in parallel
    const promises: Promise<void>[] = []

    if (fetchLibrary) {
      promises.push(
        db.libraryResource.findMany({
          where: { status: 'PUBLISHED', ...searchFilter },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            level: true,
            category: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }).then(items => {
          results.push(...items.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            type: 'library_resource' as const,
            thumbnailUrl: r.thumbnailUrl,
            duration: r.duration,
            level: r.level,
            category: r.category?.name,
          })))
        })
      )
    }

    if (fetchLessons) {
      promises.push(
        db.lesson.findMany({
          where: { isPublished: true, ...searchFilter },
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
          orderBy: { createdAt: 'desc' },
          take: limit,
        }).then(items => {
          results.push(...items.map(l => ({
            id: l.id,
            title: l.title,
            description: l.description,
            type: 'lesson' as const,
            thumbnailUrl: l.videoUrl,
            duration: l.duration,
            level: l.module.course.level,
            category: `${l.module.course.title} - ${l.module.title}`,
          })))
        })
      )
    }

    if (fetchStudentLessons) {
      promises.push(
        db.studentLesson.findMany({
          where: { teacherId: session.user.id, isPublished: true, ...searchFilter },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            videoUrl: true,
            student: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }).then(items => {
          results.push(...items.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            type: 'student_lesson' as const,
            thumbnailUrl: s.videoUrl,
            duration: s.duration,
            category: `Creado para: ${s.student.name}`,
          })))
        })
      )
    }

    await Promise.all(promises)
    return results
  } catch (error) {
    console.error('Error fetching shareable content:', error)
    return []
  }
}
