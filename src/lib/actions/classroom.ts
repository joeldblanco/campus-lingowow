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
            // Include personalized lessons for this enrollment
            personalizedLessons: {
              where: { isPublished: true },
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
    const modules = booking.enrollment.course.modules.map((module: { id: string; title: string; lessons: Array<{ id: string; title: string; description: string; duration: number; videoUrl: string | null }> }) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons,
    }))

    // Add personalized lessons as a separate "module" if they exist
    const personalizedLessons = booking.enrollment.personalizedLessons
    if (personalizedLessons && personalizedLessons.length > 0) {
      modules.unshift({
        id: 'personalized',
        title: '📚 Programa Personalizado',
        lessons: personalizedLessons.map((lesson: { id: string; title: string; description: string; duration: number; videoUrl: string | null }) => ({
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
// Now unified: both regular and personalized lessons are in the same table
export async function getLessonContent(lessonId: string) {
  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    return lesson
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

    // student_lesson type now uses the same Lesson table (personalized lessons have studentId set)
    if (contentType === 'student_lesson') {
      const lesson = await db.lesson.findUnique({
        where: { id: contentId },
        include: {
          contents: {
            where: { parentId: null },
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
                include: {
                  children: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      })
      return lesson
    }

    if (contentType === 'library_resource') {
      const resource = await db.libraryResource.findUnique({
        where: { id: contentId },
      })
      if (resource) {
        // Process content - ensure it's valid HTML
        let processedContent = resource.content || `<p>${resource.description || ''}</p>`
        
        // If content looks like JSON stringified, try to parse it
        if (processedContent.startsWith('{') || processedContent.startsWith('[')) {
          try {
            const parsed = JSON.parse(processedContent)
            // If it's a blocks object from the resource builder, convert to HTML
            if (parsed.blocks && Array.isArray(parsed.blocks)) {
              processedContent = parsed.blocks.map((block: { type: string; content?: string }) => {
                if (block.type === 'text' && block.content) {
                  return block.content
                }
                return ''
              }).join('')
            } else if (parsed.html) {
              processedContent = parsed.html
            }
          } catch {
            // Not JSON, use as-is
          }
        }
        
        // Ensure we have valid HTML content
        if (!processedContent.trim()) {
          processedContent = `<p>${resource.description || 'Sin contenido disponible'}</p>`
        }

        // Create a synthetic content block from the library resource
        const syntheticContent = {
          id: `content-${resource.id}`,
          type: 'text',
          order: 0,
          data: { html: processedContent },
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

// Get all shareable content metadata for the teacher in classroom
// Loads all titles/categories upfront for instant client-side filtering
export async function getShareableContent(): Promise<ShareableContent[]> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return []
  }

  try {
    const results: ShareableContent[] = []

    // Fetch all types in parallel — lightweight metadata only
    const [libraryItems, lessonItems, studentLessonItems] = await Promise.all([
      db.libraryResource.findMany({
        where: { status: 'PUBLISHED' },
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
      }),
      db.lesson.findMany({
        where: { isPublished: true, moduleId: { not: null } },
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
      }),
      db.lesson.findMany({
        where: { teacherId: session.user.id, isPublished: true, studentId: { not: null } },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          videoUrl: true,
          student: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    results.push(...libraryItems.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: 'library_resource' as const,
      thumbnailUrl: r.thumbnailUrl,
      duration: r.duration,
      level: r.level,
      category: r.category?.name,
    })))

    results.push(...lessonItems.map((l: { id: string; title: string; description: string; duration: number; videoUrl: string | null; module: { title: string; course: { title: string; level: string } } | null }) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      type: 'lesson' as const,
      thumbnailUrl: l.videoUrl,
      duration: l.duration,
      level: l.module?.course.level,
      category: l.module ? `${l.module.course.title} - ${l.module.title}` : undefined,
    })))

    results.push(...studentLessonItems.map((s: { id: string; title: string; description: string; duration: number; videoUrl: string | null; student: { name: string } | null }) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      type: 'student_lesson' as const,
      thumbnailUrl: s.videoUrl,
      duration: s.duration,
      category: s.student ? `Creado para: ${s.student.name}` : undefined,
    })))

    return results
  } catch (error) {
    console.error('Error fetching shareable content:', error)
    return []
  }
}
