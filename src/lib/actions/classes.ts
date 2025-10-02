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
  }
  teacher: {
    id: string
    name: string
    lastName: string
    email: string
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

    if (filters?.startDate) {
      where.day = { gte: filters.startDate }
    }
    if (filters?.endDate) {
      where.day = { ...(where.day as object), lte: filters.endDate }
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
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
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

    return classes
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
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
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

    return classBooking
  } catch (error) {
    console.error('Error fetching class:', error)
    throw new Error('Failed to fetch class')
  }
}

export async function createClass(data: z.infer<typeof CreateClassSchema>) {
  try {
    // Validate input data
    const validatedData = CreateClassSchema.parse(data)
    
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

    const classDate = new Date(validatedData.day)
    const periodStart = new Date(enrollment.academicPeriod.startDate)
    const periodEnd = new Date(enrollment.academicPeriod.endDate)

    // Normalizar las fechas a medianoche para comparación
    classDate.setHours(0, 0, 0, 0)
    periodStart.setHours(0, 0, 0, 0)
    periodEnd.setHours(0, 0, 0, 0)

    if (classDate < periodStart || classDate > periodEnd) {
      return {
        success: false,
        error: `La fecha debe estar dentro del período académico "${enrollment.academicPeriod.name}" (${periodStart.toLocaleDateString('es-ES')} - ${periodEnd.toLocaleDateString('es-ES')})`,
      }
    }

    // 2. Validar que el horario esté dentro de la disponibilidad del profesor
    const [startTime, endTime] = validatedData.timeSlot.split('-')
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][classDate.getDay()]

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
        day: validatedData.day,
        timeSlot: validatedData.timeSlot,
        notes: validatedData.notes,
        creditId: validatedData.creditId,
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
        error: error.errors.map(e => e.message).join(', ')
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
      const newDay = validatedData.day || currentClass.day
      const newTimeSlot = validatedData.timeSlot || currentClass.timeSlot

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
    if (validatedData.day) updateData.day = validatedData.day
    if (validatedData.timeSlot) updateData.timeSlot = validatedData.timeSlot
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.enrollmentId) updateData.enrollmentId = validatedData.enrollmentId
    if (validatedData.creditId) updateData.creditId = validatedData.creditId
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
        error: error.errors.map(e => e.message).join(', ')
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
    const currentClass = await db.classBooking.findUnique({
      where: { id },
      select: { teacherId: true },
    })

    if (!currentClass) {
      return { success: false, error: 'Class not found' }
    }

    // Check if the new time slot is available
    const existingBooking = await db.classBooking.findFirst({
      where: {
        teacherId: currentClass.teacherId,
        day: newDay,
        timeSlot: newTimeSlot,
        id: { not: id },
      },
    })

    if (existingBooking) {
      return { success: false, error: 'El profesor ya tiene una clase programada en este horario' }
    }

    const updatedClass = await db.classBooking.update({
      where: { id },
      data: {
        day: newDay,
        timeSlot: newTimeSlot,
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
 * basándose en su disponibilidad configurada
 */
export async function getTeacherAvailableTimeSlots(teacherId: string, date: string) {
  try {
    const classDate = new Date(date)
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][classDate.getDay()]

    // Obtener disponibilidad del profesor para ese día
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
        day: dayOfWeek,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    if (availability.length === 0) {
      return []
    }

    // Generar slots de 30 minutos dentro de los rangos de disponibilidad
    const timeSlots: string[] = []
    
    availability.forEach((slot) => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number)
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute
      
      // Generar slots de 30 minutos
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const slotStartHour = Math.floor(minutes / 60)
        const slotStartMinute = minutes % 60
        const slotEndMinutes = minutes + 30
        const slotEndHour = Math.floor(slotEndMinutes / 60)
        const slotEndMinute = slotEndMinutes % 60
        
        const timeSlot = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}-${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`
        timeSlots.push(timeSlot)
      }
    })

    return timeSlots
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

    console.log('Total estudiantes con inscripciones activas:', students.length)

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
    // Obtener toda la disponibilidad del profesor
    const availability = await db.teacherAvailability.findMany({
      where: {
        userId: teacherId,
      },
    })

    if (availability.length === 0) {
      return []
    }

    // Mapear días de disponibilidad
    const availableDaysOfWeek = new Set(availability.map((a) => a.day))

    // Convertir nombres de días a números (0 = domingo, 6 = sábado)
    const dayNameToNumber: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }

    const availableDayNumbers = Array.from(availableDaysOfWeek).map(
      (day) => dayNameToNumber[day]
    )

    // Generar todas las fechas en el rango que coincidan con los días disponibles
    const start = new Date(startDate)
    const end = new Date(endDate)
    const availableDates: string[] = []

    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (availableDayNumbers.includes(dayOfWeek)) {
        availableDates.push(current.toISOString().split('T')[0])
      }
      current.setDate(current.getDate() + 1)
    }

    return availableDates
  } catch (error) {
    console.error('Error fetching teacher available days:', error)
    return []
  }
}
