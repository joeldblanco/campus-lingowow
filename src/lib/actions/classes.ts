'use server'

import { db } from '@/lib/db'
import { CreateClassSchema, EditClassSchema } from '@/schemas/classes'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

export interface ClassBookingWithDetails {
  id: string
  studentId: string
  teacherId: string
  day: string
  timeSlot: string
  status: string
  notes: string | null
  reminderSent: boolean
  cancelledAt: Date | null
  cancelledBy: string | null
  completedAt: Date | null
  studentPeriodId: string | null
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
  studentPeriod: {
    id: string
    packageType: string
    period: {
      name: string
      startDate: Date
      endDate: Date
    }
  } | null
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
      where.studentPeriod = {
        periodId: filters.periodId,
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
        studentPeriod: {
          select: {
            id: true,
            packageType: true,
            period: {
              select: {
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
        studentPeriod: {
          select: {
            id: true,
            packageType: true,
            period: {
              select: {
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
    
    // Check if the time slot is available for the teacher
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
        day: validatedData.day,
        timeSlot: validatedData.timeSlot,
        notes: validatedData.notes,
        studentPeriodId: validatedData.studentPeriodId,
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
  studentPeriodId?: string
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
    if (validatedData.studentPeriodId) updateData.studentPeriodId = validatedData.studentPeriodId
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

export async function getStudentPeriods(studentId: string) {
  try {
    const periods = await db.studentPeriod.findMany({
      where: { studentId },
      include: {
        period: {
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
        period: {
          startDate: 'desc',
        },
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching student periods:', error)
    throw new Error('Failed to fetch student periods')
  }
}

/**
 * Obtiene o busca el StudentPeriod para un estudiante y período académico específico
 */
export async function getStudentPeriodByAcademicPeriod(
  studentId: string,
  academicPeriodId: string
) {
  try {
    const studentPeriod = await db.studentPeriod.findFirst({
      where: {
        studentId,
        periodId: academicPeriodId,
      },
      include: {
        period: {
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

    if (!studentPeriod) {
      return {
        success: false,
        error: 'El estudiante no está inscrito en el período académico de esta fecha',
      }
    }

    return { success: true, studentPeriod }
  } catch (error) {
    console.error('Error fetching student period:', error)
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
 * Obtiene solo los estudiantes que están inscritos en al menos un período académico
 * Útil para programar clases, ya que solo estos estudiantes pueden tener clases
 */
export async function getStudentsWithPeriods() {
  try {
    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        status: 'ACTIVE',
        studentPeriods: {
          some: {}, // Debe tener al menos un período inscrito
        },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        studentPeriods: {
          select: {
            id: true,
            period: {
              select: {
                name: true,
                startDate: true,
                endDate: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            period: {
              startDate: 'desc',
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students with periods:', error)
    throw new Error('Failed to fetch students with periods')
  }
}

export async function getAllAcademicPeriods() {
  try {
    const periods = await db.academicPeriod.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching academic periods:', error)
    throw new Error('Failed to fetch academic periods')
  }
}
