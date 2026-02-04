'use server'

import { db } from '@/lib/db'
import { CreateClassSchema, EditClassSchema } from '@/schemas/classes'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

export interface ClassBookingWithDetails {
  id: string
  studentId: string
  teacherId: string
  enrollmentId: string
  day: string
  timeSlot: string
  status: string
  notes: string | null
  reminderSent: boolean
  cancelledAt: Date | null
  cancelledBy: string | null
  completedAt: Date | null
  creditId: string | null
  isPayable: boolean
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
    image: string | null
  }
  teacher: {
    id: string
    name: string
    lastName: string | null
    email: string
    image: string | null
  }
  enrollment: {
    id: string
    course: {
      id: string
      title: string
      language: string
      level: string
      classDuration?: number
    }
    academicPeriod: {
      id: string
      name: string
      startDate: Date
      endDate: Date
    }
    classesTotal: number
    classesAttended: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface ClassFilters {
  startDate?: string
  endDate?: string
  teacherId?: string
  studentId?: string
  status?: string
  courseId?: string
  periodId?: string
  timezone?: string // Timezone del usuario para conversión de horarios
}

export async function getAllClasses(filters?: ClassFilters): Promise<ClassBookingWithDetails[]> {
  try {
    const where: Record<string, unknown> = {}

    // Nota: Los filtros de fecha vienen en hora local, necesitamos convertirlos a UTC
    // Usar la timezone del usuario si se proporciona
    const userTimezone = filters?.timezone || 'America/Lima'
    
    if (filters?.startDate || filters?.endDate) {
      const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
      
      if (filters?.startDate) {
        const utcStart = convertTimeSlotToUTC(filters.startDate, '00:00-00:00', userTimezone)
        where.day = { gte: utcStart.day }
      }
      if (filters?.endDate) {
        const utcEnd = convertTimeSlotToUTC(filters.endDate, '23:59-23:59', userTimezone)
        where.day = { ...(where.day as object), lte: utcEnd.day }
      }
    }
    
    if (filters?.teacherId) {
      where.teacherId = filters.teacherId
    }
    if (filters?.studentId) {
      where.studentId = filters.studentId
    }
    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.periodId) {
      where.enrollment = {
        academicPeriodId: filters.periodId,
      }
    }

    const classes = await db.classBooking.findMany({
      where,
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
          select: {
            id: true,
            classesTotal: true,
            classesAttended: true,
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
            academicPeriod: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
      orderBy: [{ day: 'desc' }, { timeSlot: 'asc' }],
    })

    // Convertir day y timeSlot de UTC a hora local antes de devolver
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    // userTimezone ya está definido arriba
    const classesWithLocalTime = classes.map(classItem => {
      const localData = convertTimeSlotFromUTC(classItem.day, classItem.timeSlot, userTimezone)
      return {
        ...classItem,
        day: localData.day,
        timeSlot: localData.timeSlot,
      }
    })

    return classesWithLocalTime
  } catch (error) {
    console.error('Error fetching classes:', error)
    throw new Error('Failed to fetch classes')
  }
}

export async function getClassById(id: string, timezone?: string): Promise<ClassBookingWithDetails | null> {
  try {
    const userTimezone = timezone || 'America/Lima'
    const classBooking = await db.classBooking.findUnique({
      where: { id },
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
          select: {
            id: true,
            classesTotal: true,
            classesAttended: true,
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
            academicPeriod: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    })

    if (!classBooking) {
      return null
    }

    // Convertir day y timeSlot de UTC a hora local antes de devolver
    const { convertTimeSlotFromUTC } = await import('@/lib/utils/date')
    const localData = convertTimeSlotFromUTC(classBooking.day, classBooking.timeSlot, userTimezone)
    
    return {
      ...classBooking,
      day: localData.day,
      timeSlot: localData.timeSlot,
    }
  } catch (error) {
    console.error('Error fetching class:', error)
    throw new Error('Failed to fetch class')
  }
}

export async function createClass(data: z.infer<typeof CreateClassSchema> & { timezone?: string }) {
  try {
    // Validate input data
    const validatedData = CreateClassSchema.parse(data)
    const userTimezone = data.timezone || 'America/Lima'

    // Extraer day y timeSlot del datetime (formato: YYYY-MM-DDTHH:MM)
    // Parsear directamente el string sin usar Date constructor para evitar conversiones de timezone
    const [day, timePart] = validatedData.datetime.split('T') // YYYY-MM-DD y HH:MM
    const [rawHours, rawMinutes] = timePart.split(':') // Extraer horas y minutos tal como el usuario los ingresó
    const hours = rawHours.padStart(2, '0')
    const minutes = rawMinutes.padStart(2, '0')
    
    // Obtener la inscripción para saber la duración de la clase
    const enrollmentForDuration = await db.enrollment.findUnique({
      where: { id: validatedData.enrollmentId },
      include: {
        course: { select: { classDuration: true } },
      },
    })
    
    const classDuration = enrollmentForDuration?.course?.classDuration || 40
    const startHours = parseInt(hours, 10)
    const startMins = parseInt(minutes, 10)
    const endMinutes = startHours * 60 + startMins + classDuration
    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60
    const timeSlot = `${hours}:${minutes}-${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

    // Convertir day y timeSlot de hora local a UTC antes de guardar
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
    const utcData = convertTimeSlotToUTC(day, timeSlot, userTimezone)

    // 1. Validar que la fecha esté dentro del período académico de la inscripción
    const enrollment = await db.enrollment.findUnique({
      where: { id: validatedData.enrollmentId },
      include: {
        academicPeriod: {
          select: {
            startDate: true,
            endDate: true,
            name: true,
          },
        },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    // Usar date-fns para manejar fechas
    const { parseISO, isWithinInterval, format: formatDate } = await import('date-fns')

    // Validar usando la fecha local original (la que el usuario seleccionó)
    const classDate = parseISO(day)
    const periodStart = parseISO(enrollment.academicPeriod.startDate.toISOString().split('T')[0])
    const periodEnd = parseISO(enrollment.academicPeriod.endDate.toISOString().split('T')[0])

    // Validar que la fecha esté dentro del período académico
    if (!isWithinInterval(classDate, { start: periodStart, end: periodEnd })) {
      return {
        success: false,
        error: `La fecha debe estar dentro del período académico "${enrollment.academicPeriod.name}" (${formatDate(periodStart, 'dd/MM/yyyy')} - ${formatDate(periodEnd, 'dd/MM/yyyy')})`,
      }
    }

    // 2. Verificar que no haya superposición con otras clases del profesor
    // Obtener todas las clases del profesor para ese día (que no estén canceladas)
    const existingClasses = await db.classBooking.findMany({
      where: {
        teacherId: validatedData.teacherId,
        day: utcData.day,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        timeSlot: true,
      },
    })

    // Parsear el horario de la nueva clase
    const [newStartTime, newEndTime] = utcData.timeSlot.split('-')
    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number)
    const [newEndHour, newEndMin] = newEndTime.split(':').map(Number)
    const newStartMinutes = newStartHour * 60 + newStartMin
    let newEndMinutes = newEndHour * 60 + newEndMin
    // Ajustar para clases que cruzan medianoche UTC
    if (newEndMinutes <= newStartMinutes) {
      newEndMinutes += 24 * 60
    }

    // Verificar superposición con cada clase existente
    for (const existingClass of existingClasses) {
      const [existingStartTime, existingEndTime] = existingClass.timeSlot.split('-')
      const [existingStartHour, existingStartMin] = existingStartTime.split(':').map(Number)
      const [existingEndHour, existingEndMin] = existingEndTime.split(':').map(Number)
      const existingStartMinutes = existingStartHour * 60 + existingStartMin
      let existingEndMinutes = existingEndHour * 60 + existingEndMin
      // Ajustar para clases que cruzan medianoche UTC
      if (existingEndMinutes <= existingStartMinutes) {
        existingEndMinutes += 24 * 60
      }

      // Hay superposición si los rangos se intersectan
      const hasOverlap = newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes

      if (hasOverlap) {
        return {
          success: false,
          error: `El profesor ya tiene una clase programada de ${existingStartTime} a ${existingEndTime} que se superpone con este horario`,
        }
      }
    }

    const classBooking = await db.classBooking.create({
      data: {
        studentId: enrollment.studentId, // Obtener de la inscripción
        teacherId: validatedData.teacherId,
        enrollmentId: validatedData.enrollmentId,
        day: utcData.day, // Guardar en UTC
        timeSlot: utcData.timeSlot, // Guardar en UTC
        notes: validatedData.notes,
        status: 'CONFIRMED',
      },
    })

    revalidatePath('/admin/classes')
    return { success: true, class: classBooking }
  } catch (error) {
    console.error('Error creating class:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return { success: false, error: 'Error al crear la clase' }
  }
}

export interface UpdateClassData {
  teacherId?: string
  day?: string
  timeSlot?: string
  status?: string
  notes?: string
  enrollmentId?: string
  creditId?: string
  completedAt?: Date
}

export async function updateClass(id: string, data: z.infer<typeof EditClassSchema> & { timezone?: string }) {
  try {
    // Validate input data
    const validatedData = EditClassSchema.parse(data)
    const userTimezone = data.timezone || 'America/Lima'

    // Convertir day y timeSlot a UTC si se están actualizando
    let utcDay = validatedData.day
    let utcTimeSlot = validatedData.timeSlot
    
    if (validatedData.day && validatedData.timeSlot) {
      const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
      const utcData = convertTimeSlotToUTC(validatedData.day, validatedData.timeSlot, userTimezone)
      utcDay = utcData.day
      utcTimeSlot = utcData.timeSlot
    }

    // If updating teacher, day, or timeSlot, check availability
    if (validatedData.teacherId || validatedData.day || validatedData.timeSlot) {
      const currentClass = await db.classBooking.findUnique({
        where: { id },
        select: { teacherId: true, day: true, timeSlot: true },
      })

      if (!currentClass) {
        return { success: false, error: 'Class not found' }
      }

      const newTeacherId = validatedData.teacherId || currentClass.teacherId
      const newDay = utcDay || currentClass.day
      const newTimeSlot = utcTimeSlot || currentClass.timeSlot

      // Only check if we're actually changing the schedule
      if (
        newTeacherId !== currentClass.teacherId ||
        newDay !== currentClass.day ||
        newTimeSlot !== currentClass.timeSlot
      ) {
        // Obtener todas las clases del profesor para ese día (excluyendo la actual y canceladas)
        const existingClasses = await db.classBooking.findMany({
          where: {
            teacherId: newTeacherId,
            day: newDay,
            status: { not: 'CANCELLED' },
            id: { not: id },
          },
          select: {
            id: true,
            timeSlot: true,
          },
        })

        // Parsear el horario de la nueva clase
        const [newStartTime, newEndTime] = newTimeSlot.split('-')
        const [newStartHour, newStartMin] = newStartTime.split(':').map(Number)
        const [newEndHour, newEndMin] = newEndTime.split(':').map(Number)
        const newStartMinutes = newStartHour * 60 + newStartMin
        let newEndMinutes = newEndHour * 60 + newEndMin
        // Ajustar para clases que cruzan medianoche UTC
        if (newEndMinutes <= newStartMinutes) {
          newEndMinutes += 24 * 60
        }

        // Verificar superposición con cada clase existente
        for (const existingClass of existingClasses) {
          const [existingStartTime, existingEndTime] = existingClass.timeSlot.split('-')
          const [existingStartHour, existingStartMin] = existingStartTime.split(':').map(Number)
          const [existingEndHour, existingEndMin] = existingEndTime.split(':').map(Number)
          const existingStartMinutes = existingStartHour * 60 + existingStartMin
          let existingEndMinutes = existingEndHour * 60 + existingEndMin
          // Ajustar para clases que cruzan medianoche UTC
          if (existingEndMinutes <= existingStartMinutes) {
            existingEndMinutes += 24 * 60
          }

          const hasOverlap = newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes

          if (hasOverlap) {
            return {
              success: false,
              error: `El profesor ya tiene una clase programada de ${existingStartTime} a ${existingEndTime} que se superpone con este horario`,
            }
          }
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validatedData.teacherId) updateData.teacherId = validatedData.teacherId
    if (utcDay) updateData.day = utcDay // Usar versión UTC
    if (utcTimeSlot) updateData.timeSlot = utcTimeSlot // Usar versión UTC
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.enrollmentId) updateData.enrollmentId = validatedData.enrollmentId
    if (validatedData.creditId && validatedData.creditId !== '') updateData.creditId = validatedData.creditId
    if (validatedData.completedAt) updateData.completedAt = validatedData.completedAt

    const classBooking = await db.classBooking.update({
      where: { id },
      data: updateData,
    })

    // No revalidamos aquí porque usamos actualizaciones optimistas en el cliente
    // revalidatePath('/admin/classes')
    return { success: true, class: classBooking }
  } catch (error) {
    console.error('Error updating class:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return { success: false, error: 'Error al actualizar la clase' }
  }
}

export async function deleteClass(id: string) {
  try {
    // Eliminar grabaciones de R2 antes de eliminar la clase
    const { deleteRecordingFolder } = await import('@/lib/actions/recordings')
    const r2Result = await deleteRecordingFolder(id)
    
    if (!r2Result.success) {
      console.warn(`Warning: Could not delete R2 recordings for class ${id}:`, r2Result.error)
      // Continuamos con la eliminación de la clase aunque falle R2
    } else if (r2Result.deletedCount && r2Result.deletedCount > 0) {
      console.log(`Deleted ${r2Result.deletedCount} recording files from R2 for class ${id}`)
    }

    // Eliminar la clase de la base de datos
    // La grabación en ClassRecording se eliminará automáticamente por onDelete: Cascade
    await db.classBooking.delete({
      where: { id },
    })

    revalidatePath('/admin/classes')
    return { success: true }
  } catch (error) {
    console.error('Error deleting class:', error)
    return { success: false, error: 'Failed to delete class' }
  }
}

export async function rescheduleClass(id: string, newDay: string, newTimeSlot: string, timezone?: string) {
  try {
    // Convertir day y timeSlot a UTC
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
    const userTimezone = timezone || 'America/Lima'
    const utcData = convertTimeSlotToUTC(newDay, newTimeSlot, userTimezone)

    const currentClass = await db.classBooking.findUnique({
      where: { id },
      select: { teacherId: true },
    })

    if (!currentClass) {
      return { success: false, error: 'Class not found' }
    }

    // Verificar superposición con otras clases del profesor
    const existingClasses = await db.classBooking.findMany({
      where: {
        teacherId: currentClass.teacherId,
        day: utcData.day,
        status: { not: 'CANCELLED' },
        id: { not: id },
      },
      select: {
        id: true,
        timeSlot: true,
      },
    })

    // Parsear el horario de la nueva clase
    const [newStartTime, newEndTime] = utcData.timeSlot.split('-')
    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number)
    const [newEndHour, newEndMin] = newEndTime.split(':').map(Number)
    const newStartMinutes = newStartHour * 60 + newStartMin
    let newEndMinutes = newEndHour * 60 + newEndMin
    // Ajustar para clases que cruzan medianoche UTC
    if (newEndMinutes <= newStartMinutes) {
      newEndMinutes += 24 * 60
    }

    // Verificar superposición con cada clase existente
    for (const existingClass of existingClasses) {
      const [existingStartTime, existingEndTime] = existingClass.timeSlot.split('-')
      const [existingStartHour, existingStartMin] = existingStartTime.split(':').map(Number)
      const [existingEndHour, existingEndMin] = existingEndTime.split(':').map(Number)
      const existingStartMinutes = existingStartHour * 60 + existingStartMin
      let existingEndMinutes = existingEndHour * 60 + existingEndMin
      // Ajustar para clases que cruzan medianoche UTC
      if (existingEndMinutes <= existingStartMinutes) {
        existingEndMinutes += 24 * 60
      }

      const hasOverlap = newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes

      if (hasOverlap) {
        return {
          success: false,
          error: `El profesor ya tiene una clase programada de ${existingStartTime} a ${existingEndTime} que se superpone con este horario`,
        }
      }
    }

    const updatedClass = await db.classBooking.update({
      where: { id },
      data: {
        day: utcData.day, // Guardar en UTC
        timeSlot: utcData.timeSlot, // Guardar en UTC
        status: 'CONFIRMED',
      },
    })

    revalidatePath('/admin/classes')
    return { success: true, class: updatedClass }
  } catch (error) {
    console.error('Error rescheduling class:', error)
    return { success: false, error: 'Failed to reschedule class' }
  }
}

export async function getClassStats() {
  try {
    const [totalClasses, confirmedClasses, completedClasses, cancelledClasses] = await Promise.all([
      db.classBooking.count(),
      db.classBooking.count({ where: { status: 'CONFIRMED' } }),
      db.classBooking.count({ where: { status: 'COMPLETED' } }),
      db.classBooking.count({ where: { status: 'CANCELLED' } }),
    ])

    return {
      totalClasses,
      confirmedClasses,
      completedClasses,
      cancelledClasses,
      pendingClasses: totalClasses - completedClasses - cancelledClasses,
    }
  } catch (error) {
    console.error('Error fetching class stats:', error)
    throw new Error('Failed to fetch class statistics')
  }
}

export async function getAvailableTeachers(day: string, timeSlot: string, timezone?: string) {
  try {
    // Convertir día y horario de hora local a UTC para consultar la DB
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
    const userTimezone = timezone || 'America/Lima'
    const utcData = convertTimeSlotToUTC(day, timeSlot, userTimezone)
    
    // Get all teachers
    const allTeachers = await db.user.findMany({
      where: {
        roles: {
          has: 'TEACHER',
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
    })

    // Get teachers who already have bookings at this time (usando UTC)
    const busyTeachers = await db.classBooking.findMany({
      where: {
        day: utcData.day,
        timeSlot: utcData.timeSlot,
        status: { not: 'CANCELLED' },
      },
      select: {
        teacherId: true,
      },
    })

    const busyTeacherIds = new Set(busyTeachers.map((b) => b.teacherId))

    // Filter out busy teachers
    const availableTeachers = allTeachers.filter((teacher) => !busyTeacherIds.has(teacher.id))

    return availableTeachers
  } catch (error) {
    console.error('Error fetching available teachers:', error)
    throw new Error('Failed to fetch available teachers')
  }
}

/**
 * Obtiene los horarios disponibles de un profesor para una fecha específica
 * basándose en su disponibilidad configurada, la duración del curso y las clases ya agendadas
 */
export async function getTeacherAvailableTimeSlots(
  teacherId: string,
  date: string,
  courseId: string
) {
  try {
    const { getDayName, convertTimeSlotToUTC } = await import('@/lib/utils/date')

    // Obtener el nombre del día de la semana
    const dayOfWeek = getDayName(date)

    // Obtener la duración del curso
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { classDuration: true },
    })

    const classDuration = course?.classDuration || 40 // Default 40 minutos

    // Obtener disponibilidad del profesor para ese día
    // Buscar tanto por día de la semana como por fecha específica
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
        OR: [{ day: dayOfWeek }, { day: date }],
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    if (availability.length === 0) {
      return []
    }

    // Obtener clases ya agendadas para este profesor en esta fecha
    // Convertir la fecha a UTC para buscar en la DB
    const utcDateData = convertTimeSlotToUTC(date, '00:00-23:59', 'America/Lima')
    const bookedClasses = await db.classBooking.findMany({
      where: {
        teacherId,
        day: utcDateData.day,
        status: { not: 'CANCELLED' },
      },
      select: {
        timeSlot: true,
      },
    })

    // Crear un Set de slots ocupados para búsqueda rápida
    const bookedSlotsSet = new Set(bookedClasses.map(c => c.timeSlot))

    // Generar slots según la duración del curso
    // Usar Set para evitar duplicados
    const timeSlotsSet = new Set<string>()

    availability.forEach((slot) => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number)
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)

      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      // Generar slots según la duración configurada del curso
      for (let minutes = startMinutes; minutes < endMinutes; minutes += classDuration) {
        const slotStartHour = Math.floor(minutes / 60)
        const slotStartMinute = minutes % 60
        const slotEndMinutes = minutes + classDuration
        const slotEndHour = Math.floor(slotEndMinutes / 60)
        const slotEndMinute = slotEndMinutes % 60

        // Solo agregar si el slot completo cabe en el rango de disponibilidad
        if (slotEndMinutes <= endMinutes) {
          const timeSlot = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}-${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`
          
          // Solo agregar si el slot NO está ocupado
          if (!bookedSlotsSet.has(timeSlot)) {
            timeSlotsSet.add(timeSlot)
          }
        }
      }
    })

    // Convertir Set a array y ordenar
    return Array.from(timeSlotsSet).sort()
  } catch (error) {
    console.error('Error fetching teacher available time slots:', error)
    return []
  }
}

export async function getStudentEnrollments(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
    })

    return enrollments
  } catch (error) {
    console.error('Error fetching student enrollments:', error)
    throw new Error('Failed to fetch student enrollments')
  }
}

/**
 * Obtiene las inscripciones de un estudiante agrupadas por período
 * Reemplaza la funcionalidad de getStudentPeriods
 */
export async function getStudentEnrollmentsByPeriod(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        academicPeriod: {
          startDate: 'desc',
        },
      },
    })

    return enrollments
  } catch (error) {
    console.error('Error fetching student enrollments:', error)
    throw new Error('Failed to fetch student enrollments')
  }
}

/**
 * Obtiene las inscripciones activas de un estudiante para un curso y período académico
 */
export async function getStudentEnrollment(
  studentId: string,
  courseId: string,
  academicPeriodId: string
) {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId_academicPeriodId: {
          studentId,
          courseId,
          academicPeriodId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
    })

    if (!enrollment) {
      return {
        success: false,
        error: 'El estudiante no está inscrito en este curso para el período seleccionado',
      }
    }

    if (enrollment.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'La inscripción no está activa',
      }
    }

    return { success: true, enrollment }
  } catch (error) {
    console.error('Error fetching enrollment:', error)
    return { success: false, error: 'Error al buscar la inscripción del estudiante' }
  }
}

export async function getAllTeachers() {
  try {
    const teachers = await db.user.findMany({
      where: {
        roles: {
          has: 'TEACHER',
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return teachers
  } catch (error) {
    console.error('Error fetching teachers:', error)
    throw new Error('Failed to fetch teachers')
  }
}

export async function getAllStudents() {
  try {
    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students:', error)
    throw new Error('Failed to fetch students')
  }
}

/**
 * Obtiene solo los estudiantes que están inscritos en al menos un curso activo
 * Útil para programar clases, ya que solo estos estudiantes pueden tener clases
 */
export async function getStudentsWithEnrollments() {
  try {
    // Obtenemos estudiantes con inscripciones activas
    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        status: 'ACTIVE',
        enrollments: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        enrollments: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            courseId: true,
            academicPeriodId: true,
            classesTotal: true,
            classesAttended: true,
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
            academicPeriod: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students with enrollments:', error)
    throw new Error('Failed to fetch students with enrollments')
  }
}

/**
 * Obtiene los días disponibles de un profesor dentro de un rango de fechas
 * basándose en su disponibilidad configurada
 */
export async function getTeacherAvailableDays(
  teacherId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  try {
    const { getDateRange, filterByDayOfWeek, dayNameToNumber, formatToISO } = await import(
      '@/lib/utils/date'
    )

    // Obtener toda la disponibilidad del profesor
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
      },
    })

    if (availability.length === 0) {
      return []
    }

    // Convertir días de disponibilidad a números
    const availableDayNumbers = Array.from(
      new Set(availability.map((a) => dayNameToNumber(a.day)))
    ).filter((num) => num !== -1)

    if (availableDayNumbers.length === 0) {
      return []
    }

    // Generar todas las fechas en el rango y filtrar por días disponibles
    const allDates = getDateRange(startDate, endDate)
    const availableDates = filterByDayOfWeek(allDates, availableDayNumbers)

    return availableDates.map((date) => formatToISO(date))
  } catch (error) {
    console.error('Error fetching teacher available days:', error)
    return []
  }
}

/**
 * Obtiene todas las inscripciones activas con información del estudiante, curso y profesores disponibles
 * Útil para el formulario de creación de clases
 */
export async function getEnrollmentsWithTeachers() {
  try {
    // Obtener inscripciones activas con información completa
    const enrollments = await db.enrollment.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
            classDuration: true,
            teacherCourses: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { student: { name: 'asc' } },
        { enrollmentDate: 'desc' },
      ],
    })

    // Transformar los datos para incluir profesores directamente
    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      classesTotal: enrollment.classesTotal,
      classesAttended: enrollment.classesAttended,
      student: enrollment.student,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        language: enrollment.course.language,
        level: enrollment.course.level,
        classDuration: enrollment.course.classDuration,
      },
      academicPeriod: enrollment.academicPeriod,
      teachers: enrollment.course.teacherCourses.map((tc) => tc.teacher),
    }))
  } catch (error) {
    console.error('Error fetching enrollments with teachers:', error)
    throw new Error('Failed to fetch enrollments with teachers')
  }
}

/**
 * Bulk update classes - actualiza múltiples clases a la vez
 */
export async function bulkUpdateClasses(
  classIds: string[],
  updateData: {
    status?: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
    isPayable?: boolean
    teacherId?: string
    completedAt?: Date | null
    cancelledAt?: Date | null
  }
) {
  try {
    if (classIds.length === 0) {
      return { success: false, error: 'No se seleccionaron clases' }
    }

    const dataToUpdate: Record<string, unknown> = {}
    
    if (updateData.status) {
      dataToUpdate.status = updateData.status
      if (updateData.status === 'COMPLETED') {
        dataToUpdate.completedAt = new Date()
      } else if (updateData.status === 'CANCELLED') {
        dataToUpdate.cancelledAt = new Date()
      }
    }
    
    if (updateData.isPayable !== undefined) {
      dataToUpdate.isPayable = updateData.isPayable
    }
    
    if (updateData.teacherId) {
      dataToUpdate.teacherId = updateData.teacherId
    }

    const result = await db.classBooking.updateMany({
      where: { id: { in: classIds } },
      data: dataToUpdate,
    })

    return { 
      success: true, 
      updatedCount: result.count,
      message: `${result.count} clase(s) actualizada(s) exitosamente`
    }
  } catch (error) {
    console.error('Error in bulk update classes:', error)
    return { success: false, error: 'Error al actualizar las clases' }
  }
}

/**
 * Bulk delete classes - elimina múltiples clases a la vez
 */
export async function bulkDeleteClasses(classIds: string[]) {
  try {
    if (classIds.length === 0) {
      return { success: false, error: 'No se seleccionaron clases' }
    }

    // Eliminar grabaciones de R2 para cada clase
    const { deleteRecordingFolder } = await import('@/lib/actions/recordings')
    for (const classId of classIds) {
      await deleteRecordingFolder(classId).catch(err => 
        console.warn(`Warning: Could not delete R2 recordings for class ${classId}:`, err)
      )
    }

    const result = await db.classBooking.deleteMany({
      where: { id: { in: classIds } },
    })

    revalidatePath('/admin/classes')
    return { 
      success: true, 
      deletedCount: result.count,
      message: `${result.count} clase(s) eliminada(s) exitosamente`
    }
  } catch (error) {
    console.error('Error in bulk delete classes:', error)
    return { success: false, error: 'Error al eliminar las clases' }
  }
}

/**
 * Bulk reschedule classes - reprograma múltiples clases a la vez
 */
export async function bulkRescheduleClasses(
  classIds: string[],
  newDay: string,
  newTimeSlot: string,
  timezone?: string
) {
  try {
    if (classIds.length === 0) {
      return { success: false, error: 'No se seleccionaron clases' }
    }

    // Convertir a UTC si se proporciona timezone
    let utcDay = newDay
    let utcTimeSlot = newTimeSlot
    
    if (timezone) {
      const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
      const converted = convertTimeSlotToUTC(newDay, newTimeSlot, timezone)
      utcDay = converted.day
      utcTimeSlot = converted.timeSlot
    }

    const result = await db.classBooking.updateMany({
      where: { id: { in: classIds } },
      data: { 
        day: utcDay, 
        timeSlot: utcTimeSlot,
        status: 'CONFIRMED', // Reset status when rescheduling
      },
    })

    return { 
      success: true, 
      updatedCount: result.count,
      message: `${result.count} clase(s) reprogramada(s) exitosamente`
    }
  } catch (error) {
    console.error('Error in bulk reschedule classes:', error)
    return { success: false, error: 'Error al reprogramar las clases' }
  }
}

/**
 * Marca o desmarca una clase como válida para pago al profesor
 */
export async function toggleClassPayable(classId: string, isPayable: boolean) {
  try {
    await db.classBooking.update({
      where: { id: classId },
      data: { isPayable },
    })

    revalidatePath('/admin/classes')
    revalidatePath('/admin/reports')
    
    return { 
      success: true, 
      message: isPayable 
        ? 'Clase marcada como válida para pago' 
        : 'Clase desmarcada como válida para pago'
    }
  } catch (error) {
    console.error('Error toggling class payable status:', error)
    return { 
      success: false, 
      error: 'Error al actualizar el estado de pago de la clase' 
    }
  }
}
