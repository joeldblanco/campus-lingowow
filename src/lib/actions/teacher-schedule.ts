'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole, BookingStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export interface TeacherScheduleLesson {
  id: string
  courseTitle: string
  courseLevel: string
  student: {
    id: string
    name: string
    lastName?: string
    email: string
    image?: string | null
  }
  startTime: string
  endTime: string
  date: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  topic?: string
  duration: number
  roomUrl?: string
  color: 'blue' | 'purple' | 'orange' | 'green' | 'gray'
  enrollmentId: string
}

export interface TeacherAvailabilitySlot {
  id: string
  day: string
  startTime: string
  endTime: string
}

export interface TeacherScheduleData {
  lessons: TeacherScheduleLesson[]
  availability: TeacherAvailabilitySlot[]
  blockedDays: string[]
}

// Color mapping for courses
const COURSE_COLORS: Record<string, 'blue' | 'purple' | 'orange' | 'green'> = {
  español: 'blue',
  spanish: 'blue',
  francés: 'purple',
  french: 'purple',
  inglés: 'orange',
  english: 'orange',
  italiano: 'green',
  italian: 'green',
}

function getCourseColor(courseTitle: string): 'blue' | 'purple' | 'orange' | 'green' {
  const lowerTitle = courseTitle.toLowerCase()
  for (const [key, color] of Object.entries(COURSE_COLORS)) {
    if (lowerTitle.includes(key)) return color
  }
  return 'blue'
}

function getBookingStatus(booking: { status: BookingStatus; day: string; timeSlot: string }): TeacherScheduleLesson['status'] {
  if (booking.status === BookingStatus.CANCELLED) return 'cancelled'
  if (booking.status === BookingStatus.COMPLETED) return 'completed'
  
  // Check if class is currently in progress
  const now = new Date()
  const [startTime, endTime] = booking.timeSlot.split('-')
  const bookingDate = new Date(booking.day)
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const classStart = new Date(bookingDate)
  classStart.setHours(startHour, startMin, 0, 0)
  
  const classEnd = new Date(bookingDate)
  classEnd.setHours(endHour, endMin, 0, 0)
  
  if (now >= classStart && now <= classEnd) return 'in_progress'
  
  return 'scheduled'
}

// Get teacher schedule data for a date range
export async function getTeacherScheduleData(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; data?: TeacherScheduleData; error?: string }> {
  const session = await auth()

  if (!session?.user?.id || !session.user.roles.includes(UserRole.TEACHER)) {
    return { success: false, error: 'No autorizado' }
  }

  const teacherId = session.user.id

  try {
    // Format dates for query
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Get class bookings for the date range
    const bookings = await db.classBooking.findMany({
      where: {
        teacherId,
        day: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      include: {
        student: {
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
                classDuration: true,
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

    // Get teacher availability
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' },
      ],
    })

    // Transform bookings to lessons
    // Convertir de UTC a hora local del usuario
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    
    const lessons: TeacherScheduleLesson[] = bookings.map((booking) => {
      // Convertir de UTC a hora local
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot)
      const [startTime, endTime] = localData.timeSlot.split('-')
      
      // Parsear la fecha local
      const [year, month, day] = localData.day.split('-').map(Number)
      const lessonDate = new Date(year, month - 1, day, 12, 0, 0, 0)
      
      return {
        id: booking.id,
        courseTitle: booking.enrollment.course.title,
        courseLevel: booking.enrollment.course.level,
        student: {
          id: booking.student.id,
          name: booking.student.name,
          lastName: booking.student.lastName || undefined,
          email: booking.student.email,
          image: booking.student.image,
        },
        startTime,
        endTime,
        date: lessonDate,
        status: getBookingStatus(booking),
        topic: booking.notes || undefined,
        duration: booking.enrollment.course.classDuration,
        color: booking.status === BookingStatus.CANCELLED ? 'gray' : getCourseColor(booking.enrollment.course.title),
        enrollmentId: booking.enrollmentId,
      }
    })

    // NOTA: ClassSchedule representa horarios recurrentes/disponibilidad ocupada,
    // NO clases reales. Solo ClassBooking representa clases programadas.
    // Los ClassSchedule se usan para mostrar qué bloques están ocupados cuando
    // alguien quiere agendar una clase, pero no se muestran como clases en el calendario.

    // Sort lessons by date and time
    lessons.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime()
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })

    // Transform availability - convertir de UTC a hora local del usuario
    const { convertAvailabilityFromUTC } = await import('@/lib/utils/date')
    
    // Obtener timezone del usuario
    const user = await db.user.findUnique({
      where: { id: teacherId },
      select: { timezone: true },
    })
    const userTimezone = user?.timezone || 'America/Lima'
    
    const availabilitySlots: TeacherAvailabilitySlot[] = availability.map((slot) => {
      // Convertir de UTC a hora local
      const localData = convertAvailabilityFromUTC(slot.day, slot.startTime, slot.endTime, userTimezone)
      return {
        id: slot.id,
        day: localData.day,
        startTime: localData.startTime,
        endTime: localData.endTime,
      }
    })

    return {
      success: true,
      data: {
        lessons,
        availability: availabilitySlots,
        blockedDays: [], // TODO: Implement blocked days if needed
      },
    }
  } catch (error) {
    console.error('Error fetching teacher schedule:', error)
    return { success: false, error: 'Error al cargar el horario' }
  }
}

// Get schedule for week view
export async function getWeekSchedule(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  return getTeacherScheduleData(weekStart, weekEnd)
}

// Get schedule for month view
export async function getMonthSchedule(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  return getTeacherScheduleData(monthStart, monthEnd)
}

// Get schedule for day view
export async function getDaySchedule(date: Date) {
  return getTeacherScheduleData(date, date)
}

// Update teacher availability
export async function updateTeacherAvailabilitySlot(params: {
  day: string
  startTime: string
  endTime: string
  available: boolean
}) {
  const session = await auth()

  if (!session?.user?.id || !session.user.roles.includes(UserRole.TEACHER)) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id
  const { day, startTime, endTime, available } = params

  try {
    // Obtener timezone del usuario
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const userTimezone = user?.timezone || 'America/Lima'
    
    // Convertir a UTC
    const { convertAvailabilityToUTC } = await import('@/lib/utils/date')
    const utcData = convertAvailabilityToUTC(day, startTime, endTime, userTimezone)
    const utcDay = utcData.day.toLowerCase()
    
    if (available) {
      // Check if slot already exists
      const existing = await db.teacherAvailability.findFirst({
        where: {
          userId,
          day: utcDay,
          startTime: utcData.startTime,
          endTime: utcData.endTime,
        },
      })

      if (!existing) {
        await db.teacherAvailability.create({
          data: {
            userId,
            day: utcDay,
            startTime: utcData.startTime,
            endTime: utcData.endTime,
          },
        })
      }
    } else {
      await db.teacherAvailability.deleteMany({
        where: {
          userId,
          day: utcDay,
          startTime: utcData.startTime,
          endTime: utcData.endTime,
        },
      })
    }

    revalidatePath('/schedule')
    return { success: true }
  } catch (error) {
    console.error('Error updating availability:', error)
    return { success: false, error: 'Error al actualizar disponibilidad' }
  }
}

// Bulk update availability
export async function bulkUpdateTeacherAvailability(
  slots: Array<{ day: string; startTime: string; endTime: string; available: boolean }>
) {
  const session = await auth()

  if (!session?.user?.id || !session.user.roles.includes(UserRole.TEACHER)) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id

  try {
    // Obtener timezone del usuario
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const userTimezone = user?.timezone || 'America/Lima'
    
    // Importar función de conversión
    const { convertAvailabilityToUTC } = await import('@/lib/utils/date')
    
    // Convertir slots a UTC y agrupar por día UTC
    const slotsByDayUTC: Record<string, Array<{ startTime: string; endTime: string }>> = {}
    const allUtcDays = new Set<string>()
    
    for (const slot of slots) {
      const normalizedDay = slot.day.toLowerCase()
      
      if (slot.available) {
        // Convertir a UTC
        const utcData = convertAvailabilityToUTC(normalizedDay, slot.startTime, slot.endTime, userTimezone)
        const utcDay = utcData.day.toLowerCase()
        
        if (!slotsByDayUTC[utcDay]) {
          slotsByDayUTC[utcDay] = []
        }
        slotsByDayUTC[utcDay].push({
          startTime: utcData.startTime,
          endTime: utcData.endTime,
        })
        allUtcDays.add(utcDay)
      }
      
      // También necesitamos rastrear qué días UTC corresponden a los días locales
      // para poder eliminar correctamente
      const utcDataForDelete = convertAvailabilityToUTC(normalizedDay, '00:00', '23:59', userTimezone)
      allUtcDays.add(utcDataForDelete.day.toLowerCase())
    }

    await db.$transaction(async (tx) => {
      // Delete existing availability for those UTC days
      const uniqueUtcDays = [...allUtcDays]
      
      if (uniqueUtcDays.length > 0) {
        await tx.teacherAvailability.deleteMany({
          where: {
            userId,
            day: { in: uniqueUtcDays },
          },
        })
      }

      // Create new availability records in UTC
      for (const [day, daySlots] of Object.entries(slotsByDayUTC)) {
        for (const slot of daySlots) {
          await tx.teacherAvailability.create({
            data: {
              userId,
              day,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          })
        }
      }
    })

    revalidatePath('/schedule')
    return { success: true }
  } catch (error) {
    console.error('Error bulk updating availability:', error)
    return { success: false, error: 'Error al actualizar disponibilidad' }
  }
}

// Get lesson details
export async function getLessonDetails(lessonId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'No autorizado' }
  }

  try {
    const booking = await db.classBooking.findUnique({
      where: { id: lessonId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
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
                id: true,
                title: true,
                level: true,
                classDuration: true,
              },
            },
          },
        },
        attendances: true,
        videoCalls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!booking) {
      return { success: false, error: 'Clase no encontrada' }
    }

    return { success: true, data: booking }
  } catch (error) {
    console.error('Error fetching lesson details:', error)
    return { success: false, error: 'Error al cargar detalles de la clase' }
  }
}
