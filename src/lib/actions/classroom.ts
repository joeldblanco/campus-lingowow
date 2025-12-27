'use server'

import { db } from '@/lib/db'

// Fetch the full course structure (Modules > Lessons) for a given booking
// This allows the teacher to navigate and select lessons.
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
          },
        },
      },
    })

    if (!booking) throw new Error('Booking not found')

    return booking.enrollment.course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons,
    }))
  } catch (error) {
    console.error('Error fetching course structure:', error)
    return []
  }
}

// Fetch a specific lesson's full content for view
export async function getLessonContent(lessonId: string) {
  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          orderBy: { order: 'asc' },
        },
      },
    })

    // In the future this needs to be mapped to the recursive structure
    // But for now current ActiveLessonViewer expects a specific format.
    // We will verify the format ActiveLessonViewer expects.
    return lesson
  } catch (error) {
    console.error('Error fetching lesson content:', error)
    return null
  }
}
