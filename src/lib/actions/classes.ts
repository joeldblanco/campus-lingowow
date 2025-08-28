'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

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
        periodId: filters.periodId
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
      orderBy: [
        { day: 'desc' },
        { timeSlot: 'asc' },
      ],
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

export interface CreateClassData {
  studentId: string
  teacherId: string
  day: string
  timeSlot: string
  notes?: string
  studentPeriodId?: string
  creditId?: string
}

export async function createClass(data: CreateClassData) {
  try {
    // Check if the time slot is available for the teacher
    const existingBooking = await db.classBooking.findUnique({
      where: {
        teacherId_day_timeSlot: {
          teacherId: data.teacherId,
          day: data.day,
          timeSlot: data.timeSlot,
        },
      },
    })

    if (existingBooking) {
      return { success: false, error: 'El profesor ya tiene una clase programada en este horario' }
    }

    const classBooking = await db.classBooking.create({
      data: {
        studentId: data.studentId,
        teacherId: data.teacherId,
        day: data.day,
        timeSlot: data.timeSlot,
        notes: data.notes,
        studentPeriodId: data.studentPeriodId,
        creditId: data.creditId,
        status: 'CONFIRMED',
      },
    })

    revalidatePath('/admin/classes')
    return { success: true, class: classBooking }
  } catch (error) {
    console.error('Error creating class:', error)
    return { success: false, error: 'Failed to create class' }
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

export async function updateClass(id: string, data: UpdateClassData) {
  try {
    // If updating teacher, day, or timeSlot, check availability
    if (data.teacherId || data.day || data.timeSlot) {
      const currentClass = await db.classBooking.findUnique({
        where: { id },
        select: { teacherId: true, day: true, timeSlot: true },
      })

      if (!currentClass) {
        return { success: false, error: 'Class not found' }
      }

      const newTeacherId = data.teacherId || currentClass.teacherId
      const newDay = data.day || currentClass.day
      const newTimeSlot = data.timeSlot || currentClass.timeSlot

      // Only check if we're actually changing the schedule
      if (newTeacherId !== currentClass.teacherId || 
          newDay !== currentClass.day || 
          newTimeSlot !== currentClass.timeSlot) {
        
        const existingBooking = await db.classBooking.findFirst({
          where: {
            teacherId: newTeacherId,
            day: newDay,
            timeSlot: newTimeSlot,
            id: { not: id }, // Exclude current class
          },
        })

        if (existingBooking) {
          return { success: false, error: 'El profesor ya tiene una clase programada en este horario' }
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.teacherId) updateData.teacherId = data.teacherId
    if (data.day) updateData.day = data.day
    if (data.timeSlot) updateData.timeSlot = data.timeSlot
    if (data.status) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.studentPeriodId) updateData.studentPeriodId = data.studentPeriodId
    if (data.creditId) updateData.creditId = data.creditId
    if (data.completedAt) updateData.completedAt = data.completedAt

    const classBooking = await db.classBooking.update({
      where: { id },
      data: updateData,
    })

    revalidatePath('/admin/classes')
    return { success: true, class: classBooking }
  } catch (error) {
    console.error('Error updating class:', error)
    return { success: false, error: 'Failed to update class' }
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
        isTeacher: true,
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

    const busyTeacherIds = new Set(busyTeachers.map(b => b.teacherId))

    // Filter out busy teachers
    const availableTeachers = allTeachers.filter(teacher => !busyTeacherIds.has(teacher.id))

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

export async function getAllTeachers() {
  try {
    const teachers = await db.user.findMany({
      where: {
        isTeacher: true,
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
        isStudent: true,
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
