'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import {
  AvailabilityRange,
  mergeOverlappingRanges,
  splitTimeSlot,
  timeToMinutes,
} from '@/lib/utils/calendar'
import { BookingStatus, UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Tipos para acciones
interface AvailabilityParams {
  day: string
  timeSlot: string // Formato "HH:MM-HH:MM"
  available: boolean
}

interface BookingParams {
  teacherId: string
  enrollmentId: string
  day: string
  timeSlot: string
}

interface CalendarSettingsParams {
  slotDuration: number
  startHour: number
  endHour: number
  maxBookingsPerStudent: number
}

// Acción para obtener disponibilidad del profesor
export async function getTeacherAvailability(teacherId: string) {
  try {
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    // Organizar por día para facilitar su uso en el cliente
    const formattedAvailability: Record<string, AvailabilityRange[]> = {}

    // Agrupar rangos por día
    availability.forEach((slot) => {
      if (!formattedAvailability[slot.day]) {
        formattedAvailability[slot.day] = []
      }

      formattedAvailability[slot.day].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    })

    // Fusionar rangos superpuestos para cada día
    Object.keys(formattedAvailability).forEach((day) => {
      formattedAvailability[day] = mergeOverlappingRanges(formattedAvailability[day])
    })

    return { success: true, data: formattedAvailability }
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return { success: false, error: 'Error al cargar disponibilidad del profesor' }
  }
}

// Acción para cancelar una reserva
export async function cancelBooking(bookingId: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id

  try {
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    // Verificar que sea el estudiante que hizo la reserva o el profesor
    if (booking.studentId !== userId && booking.teacherId !== userId) {
      return { success: false, error: 'No tienes permiso para cancelar esta reserva' }
    }

    // Actualizar la reserva
    await db.classBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    })

    revalidatePath('/calendar')
    return { success: true }
  } catch (error) {
    console.error('Error al cancelar reserva:', error)
    return { success: false, error: 'Error al cancelar la reserva' }
  }
}

// Acción para obtener las reservas de un estudiante
export async function getStudentBookings() {
  const session = await auth()

  if (!session || !session.user) {
    redirect('/login')
  }

  const userId = session.user.id

  try {
    const bookings = await db.classBooking.findMany({
      where: {
        studentId: userId,
      },
      orderBy: {
        day: 'asc',
      },
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error('Error al obtener reservas:', error)
    return { success: false, error: 'Error al cargar reservas' }
  }
}

// Acción para obtener las reservas de un profesor
export async function getTeacherBookings() {
  const session = await auth()

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.roles.includes(UserRole.TEACHER)
  ) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id

  try {
    const bookings = await db.classBooking.findMany({
      where: {
        teacherId: userId,
      },
      include: {
        student: {
          select: {
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        day: 'asc',
      },
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error('Error al obtener reservas:', error)
    return { success: false, error: 'Error al cargar reservas' }
  }
}

// Acción para obtener/crear configuración del calendario
export async function getCalendarSettings() {
  const session = await auth()

  if (!session || !session.user || !session.user.id) {
    redirect('/login')
  }

  const userId = session.user.id

  try {
    let settings = await db.calendarSettings.findUnique({
      where: {
        userId,
      },
    })

    // Crear configuración por defecto si no existe
    if (!settings) {
      settings = await db.calendarSettings.create({
        data: {
          userId,
          slotDuration: 30,
          startHour: 8,
          endHour: 16.5,
          maxBookingsPerStudent: 3,
        },
      })
    }

    return { success: true, data: settings }
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return { success: false, error: 'Error al cargar configuración del calendario' }
  }
}

// Acción para actualizar configuración del calendario
export async function updateCalendarSettings(params: CalendarSettingsParams) {
  const session = await auth()

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.roles.includes(UserRole.TEACHER)
  ) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id
  const { slotDuration, startHour, endHour, maxBookingsPerStudent } = params

  try {
    // Validar parámetros
    if (endHour <= startHour) {
      return { success: false, error: 'La hora de fin debe ser posterior a la hora de inicio' }
    }

    if (slotDuration <= 0) {
      return { success: false, error: 'La duración del slot debe ser positiva' }
    }

    if (maxBookingsPerStudent <= 0) {
      return { success: false, error: 'El máximo de reservas debe ser positivo' }
    }

    // Actualizar o crear configuración
    await db.calendarSettings.upsert({
      where: {
        userId,
      },
      update: {
        slotDuration,
        startHour,
        endHour,
        maxBookingsPerStudent,
      },
      create: {
        userId,
        slotDuration,
        startHour,
        endHour,
        maxBookingsPerStudent,
      },
    })

    revalidatePath('/calendar')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return { success: false, error: 'Error al guardar configuración del calendario' }
  }
}

// Acción para actualizar disponibilidad del profesor
export async function updateTeacherAvailability(params: AvailabilityParams) {
  const session = await auth()

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.roles.includes(UserRole.TEACHER)
  ) {
    return { success: false, error: 'No autorizado' }
  }

  const { day, timeSlot, available } = params
  const userId = session.user.id
  const [startTime, endTime] = splitTimeSlot(timeSlot)

  try {
    if (available) {
      // Agregar nueva disponibilidad
      await db.teacherAvailability.create({
        data: {
          userId,
          day,
          startTime,
          endTime,
        },
      })
    } else {
      // Eliminar disponibilidad que coincida exactamente con el rango
      await db.teacherAvailability.deleteMany({
        where: {
          userId,
          day,
          startTime,
          endTime,
        },
      })
    }

    revalidatePath('/calendar')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error)
    return { success: false, error: 'Error al actualizar disponibilidad' }
  }
}

// Acción para reservar una clase
export async function bookClass(params: BookingParams) {
  const session = await auth()

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.roles.includes(UserRole.STUDENT)
  ) {
    return { success: false, error: 'No autorizado' }
  }

  const { teacherId, enrollmentId, day, timeSlot } = params
  const studentId = session.user.id

  try {
    // Obtener disponibilidad del profesor para este día
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
        day,
      },
    })

    // Convertir a formato de rangos
    const availabilityRanges: AvailabilityRange[] = availability.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))

    // Extraer inicio y fin del timeSlot solicitado
    const [startTime, endTime] = splitTimeSlot(timeSlot)

    // Verificar que el slot solicitado esté completamente dentro de la disponibilidad del profesor
    const isFullyAvailable = availabilityRanges.some((range) => {
      return (
        timeToMinutes(range.startTime) <= timeToMinutes(startTime) &&
        timeToMinutes(range.endTime) >= timeToMinutes(endTime)
      )
    })

    if (!isFullyAvailable) {
      return { success: false, error: 'Este horario no está disponible' }
    }

    // Verificar si el slot ya está reservado o se superpone con otras reservas
    const existingBookings = await db.classBooking.findMany({
      where: {
        teacherId,
        day,
        status: 'CONFIRMED',
      },
    })

    // Comprobar superposiciones con reservas existentes
    const hasOverlap = existingBookings.some((booking) => {
      const [bookingStart, bookingEnd] = splitTimeSlot(booking.timeSlot)

      // Hay superposición si:
      // El inicio del nuevo slot es < el fin de una reserva existente Y
      // El fin del nuevo slot es > el inicio de una reserva existente
      return (
        timeToMinutes(startTime) < timeToMinutes(bookingEnd) &&
        timeToMinutes(endTime) > timeToMinutes(bookingStart)
      )
    })

    if (hasOverlap) {
      return { success: false, error: 'Este horario se superpone con una reserva existente' }
    }

    // Verificar número máximo de reservas por estudiante
    const settings = (await db.calendarSettings.findFirst({
      where: {
        userId: teacherId,
      },
    })) || { maxBookingsPerStudent: 3 }

    const studentBookingsCount = await db.classBooking.count({
      where: {
        studentId,
        status: 'CONFIRMED',
      },
    })

    if (studentBookingsCount >= settings.maxBookingsPerStudent) {
      return {
        success: false,
        error: `Has alcanzado el límite de ${settings.maxBookingsPerStudent} reservas`,
      }
    }

    // Verificar que el enrollment existe y pertenece al estudiante
    const enrollment = await db.enrollment.findUnique({
      where: {
        id: enrollmentId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    if (enrollment.studentId !== studentId) {
      return { success: false, error: 'Esta inscripción no te pertenece' }
    }

    if (enrollment.status !== 'ACTIVE') {
      return { success: false, error: 'La inscripción no está activa' }
    }

    // Crear la reserva
    await db.classBooking.create({
      data: {
        studentId,
        teacherId,
        enrollmentId,
        day,
        timeSlot,
        status: BookingStatus.CONFIRMED,
      },
    })

    revalidatePath('/calendar')
    return { success: true }
  } catch (error) {
    console.error('Error al reservar clase:', error)
    return { success: false, error: 'Error al procesar la reserva' }
  }
}

// Acción para actualizar disponibilidad en bloque
export async function bulkUpdateAvailability(availabilityList: AvailabilityParams[]) {
  const session = await auth()

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.roles.includes(UserRole.TEACHER)
  ) {
    return { success: false, error: 'No autorizado' }
  }

  const userId = session.user.id

  try {
    // Agrupar disponibilidad por día
    const availabilityByDay: Record<string, AvailabilityRange[]> = {}

    // Obtener cambios para aplicar
    for (const { day, timeSlot, available } of availabilityList) {
      if (!availabilityByDay[day]) {
        availabilityByDay[day] = []
      }

      const [startTime, endTime] = splitTimeSlot(timeSlot)

      if (available) {
        availabilityByDay[day].push({ startTime, endTime })
      }
    }

    // Fusionar rangos por día
    Object.keys(availabilityByDay).forEach((day) => {
      availabilityByDay[day] = mergeOverlappingRanges(availabilityByDay[day])
    })

    await db.$transaction(async (tx) => {
      // Primero obtener todos los días que están en la lista de cambios
      const uniqueDays = Object.keys(availabilityByDay)

      // Eliminar toda la disponibilidad actual para esos días
      if (uniqueDays.length > 0) {
        await tx.teacherAvailability.deleteMany({
          where: {
            userId,
            day: {
              in: uniqueDays,
            },
          },
        })
      }

      // Crear nuevos registros de disponibilidad
      for (const day of uniqueDays) {
        for (const range of availabilityByDay[day]) {
          await tx.teacherAvailability.create({
            data: {
              userId,
              day,
              startTime: range.startTime,
              endTime: range.endTime,
            },
          })
        }
      }
    })

    revalidatePath('/calendar')
    return { success: true }
  } catch (error) {
    console.error('Error en actualización masiva:', error)
    return { success: false, error: 'Error al actualizar disponibilidad' }
  }
}
