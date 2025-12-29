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
  student: {
    id: string
    name: string
    lastName: string
    email: string
    image: string | null
  }
  teacher: {
    id: string
    name: string
    lastName: string
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
}

export async function getAllClasses(filters?: ClassFilters): Promise<ClassBookingWithDetails[]> {
  try {
    const where: Record<string, unknown> = {}

    // Nota: Los filtros de fecha vienen en hora local, necesitamos convertirlos a UTC
    if (filters?.startDate || filters?.endDate) {
      const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
      
      if (filters?.startDate) {
        const utcStart = convertTimeSlotToUTC(filters.startDate, '00:00-00:00')
        where.day = { gte: utcStart.day }
      }
      if (filters?.endDate) {
        const utcEnd = convertTimeSlotToUTC(filters.endDate, '23:59-23:59')
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
    const classesWithLocalTime = classes.map(classItem => {
      const localData = convertTimeSlotFromUTC(classItem.day, classItem.timeSlot)
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

export async function getClassById(id: string): Promise<ClassBookingWithDetails | null> {
  try {
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
    const localData = convertTimeSlotFromUTC(classBooking.day, classBooking.timeSlot)
    
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

export async function createClass(data: z.infer<typeof CreateClassSchema>) {
  try {
    // Validate input data
    const validatedData = CreateClassSchema.parse(data)

    // Convertir day y timeSlot de hora local a UTC antes de guardar
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
    const utcData = convertTimeSlotToUTC(validatedData.day, validatedData.timeSlot)

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
    const { getDayName } = await import('@/lib/utils/date')

    // Validar usando la fecha local original (la que el usuario seleccionó)
    const classDate = parseISO(validatedData.day)
    const periodStart = parseISO(enrollment.academicPeriod.startDate.toISOString().split('T')[0])
    const periodEnd = parseISO(enrollment.academicPeriod.endDate.toISOString().split('T')[0])

    // Validar que la fecha esté dentro del período académico
    if (!isWithinInterval(classDate, { start: periodStart, end: periodEnd })) {
      return {
        success: false,
        error: `La fecha debe estar dentro del período académico "${enrollment.academicPeriod.name}" (${formatDate(periodStart, 'dd/MM/yyyy')} - ${formatDate(periodEnd, 'dd/MM/yyyy')})`,
      }
    }

    // 2. Validar que el horario esté dentro de la disponibilidad del profesor
    const [startTime, endTime] = validatedData.timeSlot.split('-')
    const dayOfWeek = getDayName(validatedData.day)

    // Buscar disponibilidad del profesor para ese día de la semana
    const teacherAvailability = await db.teacherAvailability.findMany({
      where: {
        userId: validatedData.teacherId,
        day: dayOfWeek,
      },
    })

    if (teacherAvailability.length === 0) {
      return {
        success: false,
        error: `El profesor no tiene disponibilidad configurada para los ${dayOfWeek === 'monday' ? 'lunes' : dayOfWeek === 'tuesday' ? 'martes' : dayOfWeek === 'wednesday' ? 'miércoles' : dayOfWeek === 'thursday' ? 'jueves' : dayOfWeek === 'friday' ? 'viernes' : dayOfWeek === 'saturday' ? 'sábados' : 'domingos'}`,
      }
    }

    // Verificar que el horario de la clase esté dentro de algún rango de disponibilidad
    const isWithinAvailability = teacherAvailability.some((slot) => {
      return startTime >= slot.startTime && endTime <= slot.endTime
    })

    if (!isWithinAvailability) {
      return {
        success: false,
        error: `El horario ${validatedData.timeSlot} está fuera de la disponibilidad del profesor para este día`,
      }
    }

    // 3. Check if the time slot is available for the teacher (no conflicting bookings)
    const existingBooking = await db.classBooking.findUnique({
      where: {
        teacherId_day_timeSlot: {
          teacherId: validatedData.teacherId,
          day: validatedData.day,
          timeSlot: validatedData.timeSlot,
        },
      },
    })

    if (existingBooking) {
      return { success: false, error: 'El profesor ya tiene una clase programada en este horario' }
    }

    const classBooking = await db.classBooking.create({
      data: {
        studentId: validatedData.studentId,
        teacherId: validatedData.teacherId,
        enrollmentId: validatedData.enrollmentId,
        day: utcData.day, // Guardar en UTC
        timeSlot: utcData.timeSlot, // Guardar en UTC
        notes: validatedData.notes,
        ...(validatedData.creditId && { creditId: validatedData.creditId }),
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

export async function updateClass(id: string, data: z.infer<typeof EditClassSchema>) {
  try {
    // Validate input data
    const validatedData = EditClassSchema.parse(data)

    // Convertir day y timeSlot a UTC si se están actualizando
    let utcDay = validatedData.day
    let utcTimeSlot = validatedData.timeSlot
    
    if (validatedData.day && validatedData.timeSlot) {
      const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
      const utcData = convertTimeSlotToUTC(validatedData.day, validatedData.timeSlot)
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
        const existingBooking = await db.classBooking.findFirst({
          where: {
            teacherId: newTeacherId,
            day: newDay,
            timeSlot: newTimeSlot,
            id: { not: id }, // Exclude current class
          },
        })

        if (existingBooking) {
          return {
            success: false,
            error: 'El profesor ya tiene una clase programada en este horario',
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

    revalidatePath('/admin/classes')
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

export async function rescheduleClass(id: string, newDay: string, newTimeSlot: string) {
  try {
    // Convertir day y timeSlot a UTC
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
    const utcData = convertTimeSlotToUTC(newDay, newTimeSlot)

    const currentClass = await db.classBooking.findUnique({
      where: { id },
      select: { teacherId: true },
    })

    if (!currentClass) {
      return { success: false, error: 'Class not found' }
    }

    // Check if the new time slot is available (usando UTC)
    const existingBooking = await db.classBooking.findFirst({
      where: {
        teacherId: currentClass.teacherId,
        day: utcData.day,
        timeSlot: utcData.timeSlot,
        id: { not: id },
      },
    })

    if (existingBooking) {
      return { success: false, error: 'El profesor ya tiene una clase programada en este horario' }
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

export async function getAvailableTeachers(day: string, timeSlot: string) {
  try {
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
      },
    })

    // Get teachers who already have bookings at this time
    const busyTeachers = await db.classBooking.findMany({
      where: {
        day,
        timeSlot,
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
 * basándose en su disponibilidad configurada y la duración del curso
 */
export async function getTeacherAvailableTimeSlots(
  teacherId: string,
  date: string,
  courseId: string
) {
  try {
    const { getDayName } = await import('@/lib/utils/date')

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
          timeSlotsSet.add(timeSlot)
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
