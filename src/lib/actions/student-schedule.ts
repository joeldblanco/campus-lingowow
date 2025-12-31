'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'

// Type for booking with included relations
type BookingWithRelations = Prisma.ClassBookingGetPayload<{
  include: {
    teacher: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
        image: true
      }
    }
    enrollment: {
      include: {
        course: {
          select: {
            title: true
            level: true
          }
        }
      }
    }
  }
}>

// Type for upcoming booking with included relations
type UpcomingBookingWithRelations = Prisma.ClassBookingGetPayload<{
  include: {
    teacher: {
      select: {
        id: true
        name: true
        lastName: true
        image: true
      }
    }
    enrollment: {
      include: {
        course: {
          select: {
            title: true
          }
        }
      }
    }
  }
}>

export interface StudentScheduleLesson {
  id: string
  courseTitle: string
  courseLevel: string
  teacher: {
    id: string
    name: string
    lastName: string | null
    email: string
    image: string | null
  }
  startTime: string
  endTime: string
  date: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  topic: string | null
  duration: number
  color: string
}

export interface StudentTutor {
  id: string
  name: string
  lastName: string | null
  image: string | null
  language: string
  specialty: string | null
}

export interface WeeklyProgress {
  completed: number
  total: number
  percentage: number
}

// Helper to parse timeSlot string "HH:MM-HH:MM" into start and end times
function parseTimeSlot(timeSlot: string): { startTime: string; endTime: string } {
  const [start, end] = timeSlot.split('-')
  return { startTime: start || '00:00', endTime: end || '01:00' }
}

// Helper to calculate duration in minutes from timeSlot
function calculateDuration(timeSlot: string): number {
  const { startTime, endTime } = parseTimeSlot(timeSlot)
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  return (endH * 60 + endM) - (startH * 60 + startM)
}

export async function getStudentScheduleData(startDate: Date, endDate: Date) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const studentId = session.user.id
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Get class bookings for the student
    const bookings = await db.classBooking.findMany({
      where: {
        studentId,
        day: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        enrollment: {
          include: {
            course: {
              select: {
                title: true,
                level: true,
              },
            },
          },
        },
      },
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' },
      ],
    })

    // Transform bookings to lessons
    // Importar función para convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    
    const lessons: StudentScheduleLesson[] = bookings.map((booking: BookingWithRelations) => {
      // Convertir de UTC a hora local
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
      const { startTime, endTime } = parseTimeSlot(localData.timeSlot)
      const bookingDate = new Date(localData.day + 'T' + startTime + ':00')
      
      // Determine status based on current time and booking status
      const now = new Date()
      const [endH, endM] = endTime.split(':').map(Number)
      const bookingEndDate = new Date(booking.day + 'T00:00:00')
      bookingEndDate.setHours(endH, endM, 0, 0)
      
      let status: StudentScheduleLesson['status'] = 'scheduled'
      if (booking.status === 'CANCELLED') {
        status = 'cancelled'
      } else if (booking.status === 'COMPLETED' || booking.completedAt) {
        status = 'completed'
      } else if (now >= bookingDate && now <= bookingEndDate) {
        status = 'in_progress'
      } else if (now > bookingEndDate) {
        status = 'completed'
      }

      // Assign color based on course title
      const colors = ['blue', 'purple', 'orange', 'green', 'pink']
      const courseName = booking.enrollment?.course?.title || 'Clase'
      const colorIndex = courseName.charCodeAt(0) % colors.length

      return {
        id: booking.id,
        courseTitle: courseName,
        courseLevel: booking.enrollment?.course?.level || '',
        teacher: {
          id: booking.teacher.id,
          name: booking.teacher.name || 'Profesor',
          lastName: booking.teacher.lastName,
          email: booking.teacher.email || '',
          image: booking.teacher.image,
        },
        startTime,
        endTime,
        date: bookingDate,
        status,
        topic: booking.notes || null,
        duration: calculateDuration(booking.timeSlot),
        color: colors[colorIndex],
      }
    })

    // Get student's tutors (teachers they have had classes with)
    const tutorIds = [...new Set(bookings.map(b => b.teacherId))]
    const tutors = await db.user.findMany({
      where: {
        id: { in: tutorIds },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        image: true,
      },
    })

    const studentTutors: StudentTutor[] = tutors.map((tutor) => {
      // Get the most common course for this tutor
      const tutorBookings = bookings.filter((b) => b.teacherId === tutor.id)
      const courseName = tutorBookings[0]?.enrollment?.course?.title || 'Idiomas'
      
      return {
        id: tutor.id,
        name: tutor.name || 'Profesor',
        lastName: tutor.lastName,
        image: tutor.image,
        language: courseName.split(' ')[0] || 'Idiomas',
        specialty: null,
      }
    })

    // Calculate weekly progress
    const completedLessons = bookings.filter(b => 
      b.status === 'COMPLETED' || b.completedAt !== null
    ).length

    const weeklyProgress: WeeklyProgress = {
      completed: completedLessons,
      total: bookings.length,
      percentage: bookings.length > 0 
        ? Math.round((completedLessons / bookings.length) * 100) 
        : 0,
    }

    return {
      success: true,
      data: {
        lessons,
        tutors: studentTutors,
        weeklyProgress,
      },
    }
  } catch (error) {
    console.error('Error fetching student schedule:', error)
    return { success: false, error: 'Error al obtener el horario' }
  }
}

export async function getUpcomingLesson() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const currentTime = format(now, 'HH:mm')
    
    // Find next upcoming booking
    const upcomingBooking = await db.classBooking.findFirst({
      where: {
        studentId: session.user.id,
        status: { not: 'CANCELLED' },
        OR: [
          { day: { gt: todayStr } },
          {
            day: todayStr,
            timeSlot: { gte: currentTime },
          },
        ],
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        enrollment: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' },
      ],
    })

    if (!upcomingBooking) {
      return { success: true, data: null }
    }

    // Convertir de UTC a hora local
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    const localData = convertTimeSlotFromUTC(upcomingBooking.day, upcomingBooking.timeSlot)
    
    const { startTime, endTime } = parseTimeSlot(localData.timeSlot)
    const bookingDate = new Date(localData.day + 'T' + startTime + ':00')
    
    const diffMs = bookingDate.getTime() - now.getTime()
    const diffMinutes = Math.round(diffMs / (1000 * 60))

    let startsIn = ''
    if (diffMinutes < 0) {
      startsIn = 'Ahora'
    } else if (diffMinutes < 60) {
      startsIn = `${diffMinutes}m`
    } else if (diffMinutes < 1440) {
      startsIn = `${Math.round(diffMinutes / 60)}h`
    } else {
      startsIn = `${Math.round(diffMinutes / 1440)}d`
    }

    return {
      success: true,
      data: {
        id: upcomingBooking.id,
        courseTitle: (upcomingBooking as UpcomingBookingWithRelations).enrollment?.course?.title || 'Clase',
        topic: upcomingBooking.notes || 'Próxima clase',
        teacher: {
          id: (upcomingBooking as UpcomingBookingWithRelations).teacher.id,
          name: (upcomingBooking as UpcomingBookingWithRelations).teacher.name || 'Profesor',
          lastName: (upcomingBooking as UpcomingBookingWithRelations).teacher.lastName,
          image: (upcomingBooking as UpcomingBookingWithRelations).teacher.image,
        },
        startTime,
        endTime,
        startsIn,
        date: localData.day,
      },
    }
  } catch (error) {
    console.error('Error fetching upcoming lesson:', error)
    return { success: false, error: 'Error al obtener la próxima clase' }
  }
}
