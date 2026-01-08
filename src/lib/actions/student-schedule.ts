'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { 
  convertTimeSlotToUTC, 
  convertTimeSlotFromUTC,
  combineDateAndTimeUTC 
} from '@/lib/utils/date'
import { splitTimeSlot, timeToMinutes, AvailabilityRange } from '@/lib/utils/calendar'
import { notifyClassRescheduled } from '@/lib/actions/notifications'

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
    
    // Obtener timezone del estudiante desde la base de datos
    const studentData = await db.user.findUnique({
      where: { id: studentId },
      select: { timezone: true },
    })
    const studentTimezone = studentData?.timezone || 'America/Lima'
    
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
      // Convertir de UTC a hora local del estudiante
      const localData = convertTimeSlotFromUTC(booking.day, booking.timeSlot, studentTimezone)
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

// =============================================
// FUNCIÓN DE REAGENDAMIENTO DE CLASES
// =============================================

export interface RescheduleClassParams {
  bookingId: string
  newDay: string      // YYYY-MM-DD en hora local del estudiante
  newTimeSlot: string // HH:MM-HH:MM en hora local del estudiante
}

export interface RescheduleCheckResult {
  canReschedule: boolean
  reason?: string
  reschedulesUsed: number
  maxReschedules: number
  minutesUntilClass: number
  minMinutesRequired: number
}

/**
 * Verifica si una clase puede ser reagendada sin ejecutar el cambio
 */
export async function checkCanReschedule(bookingId: string): Promise<{
  success: boolean
  data?: RescheduleCheckResult
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const studentId = session.user.id

    // Obtener la reserva con enrollment
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        enrollment: true,
        teacher: {
          select: { id: true, name: true, lastName: true, timezone: true }
        }
      }
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    if (booking.studentId !== studentId) {
      return { success: false, error: 'No tienes permiso para reagendar esta clase' }
    }

    if (booking.status !== 'CONFIRMED') {
      return { success: false, error: 'Solo se pueden reagendar clases confirmadas' }
    }

    // Obtener configuración del calendario
    const settings = await db.calendarSettings.findFirst({
      where: { isGlobal: true }
    })
    const rescheduleMinutes = settings?.rescheduleMinutes ?? 60
    const maxReschedulesPerPeriod = settings?.maxReschedulesPerPeriod ?? 2

    // Calcular minutos hasta la clase (comparando en UTC)
    const [startTime] = booking.timeSlot.split('-')
    const classDateTimeUTC = combineDateAndTimeUTC(booking.day, startTime)
    const nowUTC = new Date()
    const minutesUntilClass = Math.floor((classDateTimeUTC.getTime() - nowUTC.getTime()) / (1000 * 60))

    // Verificar ventana de tiempo
    if (minutesUntilClass < rescheduleMinutes) {
      return {
        success: true,
        data: {
          canReschedule: false,
          reason: `Debes reagendar con al menos ${rescheduleMinutes} minutos de anticipación`,
          reschedulesUsed: booking.enrollment.reschedulesUsed,
          maxReschedules: maxReschedulesPerPeriod,
          minutesUntilClass,
          minMinutesRequired: rescheduleMinutes
        }
      }
    }

    // Verificar límite de reagendamientos
    if (booking.enrollment.reschedulesUsed >= maxReschedulesPerPeriod) {
      return {
        success: true,
        data: {
          canReschedule: false,
          reason: `Has alcanzado el límite de ${maxReschedulesPerPeriod} reagendamientos por período`,
          reschedulesUsed: booking.enrollment.reschedulesUsed,
          maxReschedules: maxReschedulesPerPeriod,
          minutesUntilClass,
          minMinutesRequired: rescheduleMinutes
        }
      }
    }

    return {
      success: true,
      data: {
        canReschedule: true,
        reschedulesUsed: booking.enrollment.reschedulesUsed,
        maxReschedules: maxReschedulesPerPeriod,
        minutesUntilClass,
        minMinutesRequired: rescheduleMinutes
      }
    }
  } catch (error) {
    console.error('Error checking reschedule eligibility:', error)
    return { success: false, error: 'Error al verificar elegibilidad para reagendar' }
  }
}

/**
 * Reagenda una clase a un nuevo horario
 * - Verifica autenticación y propiedad de la reserva
 * - Verifica ventana de tiempo (rescheduleMinutes)
 * - Verifica límite de reagendamientos (maxReschedulesPerPeriod)
 * - Valida disponibilidad del profesor en el nuevo horario
 * - Actualiza ClassBooking y suma +1 a Enrollment.reschedulesUsed
 * - Envía notificaciones
 */
export async function studentRescheduleClass(params: RescheduleClassParams): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const studentId = session.user.id
    const { bookingId, newDay, newTimeSlot } = params

    // Obtener timezone del estudiante
    const studentData = await db.user.findUnique({
      where: { id: studentId },
      select: { timezone: true, name: true, lastName: true }
    })
    const studentTimezone = studentData?.timezone || 'America/Lima'
    const studentName = `${studentData?.name || ''} ${studentData?.lastName || ''}`.trim()

    // Obtener la reserva con enrollment y profesor
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        enrollment: {
          include: {
            course: { select: { title: true } }
          }
        },
        teacher: {
          select: { id: true, name: true, lastName: true, timezone: true }
        }
      }
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    if (booking.studentId !== studentId) {
      return { success: false, error: 'No tienes permiso para reagendar esta clase' }
    }

    if (booking.status !== 'CONFIRMED') {
      return { success: false, error: 'Solo se pueden reagendar clases confirmadas' }
    }

    // Obtener configuración del calendario
    const settings = await db.calendarSettings.findFirst({
      where: { isGlobal: true }
    })
    const rescheduleMinutes = settings?.rescheduleMinutes ?? 60
    const maxReschedulesPerPeriod = settings?.maxReschedulesPerPeriod ?? 2

    // Calcular minutos hasta la clase (comparando en UTC)
    const [oldStartTime] = booking.timeSlot.split('-')
    const classDateTimeUTC = combineDateAndTimeUTC(booking.day, oldStartTime)
    const nowUTC = new Date()
    const minutesUntilClass = Math.floor((classDateTimeUTC.getTime() - nowUTC.getTime()) / (1000 * 60))

    // Verificar ventana de tiempo
    if (minutesUntilClass < rescheduleMinutes) {
      return { 
        success: false, 
        error: `Debes reagendar con al menos ${rescheduleMinutes} minutos de anticipación` 
      }
    }

    // Verificar límite de reagendamientos
    if (booking.enrollment.reschedulesUsed >= maxReschedulesPerPeriod) {
      return { 
        success: false, 
        error: `Has alcanzado el límite de ${maxReschedulesPerPeriod} reagendamientos por período` 
      }
    }

    // Convertir nuevo horario de hora local del estudiante a UTC para guardar en DB
    const utcData = convertTimeSlotToUTC(newDay, newTimeSlot, studentTimezone)
    const newDayUTC = utcData.day
    const newTimeSlotUTC = utcData.timeSlot

    // Verificar que el nuevo horario no sea en el pasado
    const [newStartTime] = newTimeSlotUTC.split('-')
    const newClassDateTimeUTC = combineDateAndTimeUTC(newDayUTC, newStartTime)
    if (newClassDateTimeUTC <= nowUTC) {
      return { success: false, error: 'No puedes reagendar a un horario en el pasado' }
    }

    // Obtener día de la semana para buscar disponibilidad del profesor
    const newDateObj = new Date(newDayUTC + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeekName = dayNames[newDateObj.getUTCDay()]

    // Verificar disponibilidad del profesor
    const teacherAvailability = await db.teacherAvailability.findMany({
      where: {
        userId: booking.teacherId,
        day: dayOfWeekName
      }
    })

    const availabilityRanges: AvailabilityRange[] = teacherAvailability.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))

    const [reqStartTime, reqEndTime] = splitTimeSlot(newTimeSlotUTC)

    // Verificar que el slot esté dentro de la disponibilidad del profesor
    const isFullyAvailable = availabilityRanges.some((range) => {
      return (
        timeToMinutes(range.startTime) <= timeToMinutes(reqStartTime) &&
        timeToMinutes(range.endTime) >= timeToMinutes(reqEndTime)
      )
    })

    if (!isFullyAvailable) {
      return { success: false, error: 'El profesor no está disponible en ese horario' }
    }

    // Verificar que no haya conflicto con otras reservas del profesor
    const existingBookings = await db.classBooking.findMany({
      where: {
        teacherId: booking.teacherId,
        day: newDayUTC,
        status: 'CONFIRMED',
        id: { not: bookingId } // Excluir la reserva actual
      }
    })

    const hasOverlap = existingBookings.some((existingBooking) => {
      const [bookingStart, bookingEnd] = splitTimeSlot(existingBooking.timeSlot)
      return (
        timeToMinutes(reqStartTime) < timeToMinutes(bookingEnd) &&
        timeToMinutes(reqEndTime) > timeToMinutes(bookingStart)
      )
    })

    if (hasOverlap) {
      return { success: false, error: 'El profesor ya tiene una clase en ese horario' }
    }

    // Guardar datos del horario anterior para la notificación
    const oldDayLocal = convertTimeSlotFromUTC(booking.day, booking.timeSlot, studentTimezone)

    // Ejecutar la actualización en una transacción
    await db.$transaction(async (tx) => {
      // Actualizar la reserva con el nuevo horario (en UTC)
      await tx.classBooking.update({
        where: { id: bookingId },
        data: {
          day: newDayUTC,
          timeSlot: newTimeSlotUTC
        }
      })

      // Incrementar contador de reagendamientos
      await tx.enrollment.update({
        where: { id: booking.enrollmentId },
        data: {
          reschedulesUsed: { increment: 1 }
        }
      })
    })

    // Enviar notificaciones
    await notifyClassRescheduled({
      studentId,
      studentName,
      teacherId: booking.teacherId,
      teacherName: `${booking.teacher.name || ''} ${booking.teacher.lastName || ''}`.trim(),
      courseName: booking.enrollment.course?.title || 'Clase',
      oldDay: oldDayLocal.day,
      oldTimeSlot: oldDayLocal.timeSlot,
      newDay,
      newTimeSlot,
      bookingId
    })

    revalidatePath('/dashboard/schedule')
    revalidatePath('/dashboard/classes')
    revalidatePath('/teacher/schedule')

    return { success: true }
  } catch (error) {
    console.error('Error rescheduling class:', error)
    return { success: false, error: 'Error al reagendar la clase' }
  }
}

/**
 * Obtiene los slots disponibles del profesor para reagendar
 */
export async function getAvailableSlotsForReschedule(bookingId: string, targetDay: string): Promise<{
  success: boolean
  data?: { timeSlot: string; available: boolean }[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    // Obtener timezone del estudiante
    const studentData = await db.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true }
    })
    const studentTimezone = studentData?.timezone || 'America/Lima'

    // Obtener la reserva
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: { teacherId: true, studentId: true, timeSlot: true }
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    if (booking.studentId !== session.user.id) {
      return { success: false, error: 'No tienes permiso para ver esta información' }
    }

    // Calcular duración de la clase original
    const [origStart, origEnd] = splitTimeSlot(booking.timeSlot)
    const classDuration = timeToMinutes(origEnd) - timeToMinutes(origStart)

    // Convertir el día objetivo a UTC para buscar
    const tempTimeSlot = '12:00-13:00' // Solo para obtener el día correcto
    const utcData = convertTimeSlotToUTC(targetDay, tempTimeSlot, studentTimezone)
    const targetDayUTC = utcData.day

    // Obtener día de la semana
    const targetDateObj = new Date(targetDayUTC + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeekName = dayNames[targetDateObj.getUTCDay()]

    // Obtener disponibilidad del profesor (en UTC)
    const teacherAvailability = await db.teacherAvailability.findMany({
      where: {
        userId: booking.teacherId,
        day: dayOfWeekName
      }
    })

    // Obtener reservas existentes del profesor para ese día (en UTC)
    const existingBookings = await db.classBooking.findMany({
      where: {
        teacherId: booking.teacherId,
        day: targetDayUTC,
        status: 'CONFIRMED',
        id: { not: bookingId }
      }
    })

    // Generar slots disponibles
    const slots: { timeSlot: string; available: boolean }[] = []

    for (const availability of teacherAvailability) {
      let currentMinutes = timeToMinutes(availability.startTime)
      const endMinutes = timeToMinutes(availability.endTime)

      while (currentMinutes + classDuration <= endMinutes) {
        const slotStartHour = Math.floor(currentMinutes / 60)
        const slotStartMin = currentMinutes % 60
        const slotEndMinutes = currentMinutes + classDuration
        const slotEndHour = Math.floor(slotEndMinutes / 60)
        const slotEndMin = slotEndMinutes % 60

        const timeSlotUTC = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}-${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`

        // Verificar si hay conflicto con reservas existentes
        const hasConflict = existingBookings.some((existingBooking) => {
          const [bookingStart, bookingEnd] = splitTimeSlot(existingBooking.timeSlot)
          return (
            currentMinutes < timeToMinutes(bookingEnd) &&
            slotEndMinutes > timeToMinutes(bookingStart)
          )
        })

        // Convertir a hora local del estudiante para mostrar
        const localData = convertTimeSlotFromUTC(targetDayUTC, timeSlotUTC, studentTimezone)

        slots.push({
          timeSlot: localData.timeSlot,
          available: !hasConflict
        })

        currentMinutes += 30 // Incrementar en intervalos de 30 minutos
      }
    }

    return { success: true, data: slots }
  } catch (error) {
    console.error('Error getting available slots:', error)
    return { success: false, error: 'Error al obtener horarios disponibles' }
  }
}
