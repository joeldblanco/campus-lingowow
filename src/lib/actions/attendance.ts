'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function checkStudentAttendance(
  classId: string,
  studentId: string
): Promise<{ attendanceMarked: boolean; error?: string }> {
  try {
    const attendance = await prisma.classAttendance.findFirst({
      where: {
        classId,
        studentId,
      },
    })

    return { attendanceMarked: !!attendance }
  } catch (error) {
    console.error('Error checking attendance:', error)
    return { attendanceMarked: false, error: 'Error al verificar la asistencia' }
  }
}

export async function markStudentAttendance(
  classId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if attendance is already marked
    const existingAttendance = await prisma.classAttendance.findFirst({
      where: {
        classId,
        studentId,
      },
    })

    if (existingAttendance) {
      return { success: true } // Already marked attendance
    }

    // Get the class booking to find the studentPeriodId
    const classBooking = await prisma.classBooking.findUnique({
      where: { id: classId },
      select: { studentPeriodId: true }
    })

    if (!classBooking || !classBooking.studentPeriodId) {
      return { success: false, error: 'No se encontró información del período estudiantil' }
    }

    // Mark attendance
    await prisma.classAttendance.create({
      data: {
        classId,
        studentId,
        studentPeriodId: classBooking.studentPeriodId,
        status: 'PRESENT',
        timestamp: new Date(),
      },
    })

    revalidatePath(`/classroom`)
    return { success: true }
  } catch (error) {
    console.error('Error marking attendance:', error)
    return { success: false, error: 'Error al marcar la asistencia' }
  }
}

export async function checkTeacherAttendance(
  classId: string,
  teacherId: string
): Promise<{ attendanceMarked: boolean; error?: string }> {
  try {
    const attendance = await prisma.teacherAttendance.findFirst({
      where: {
        classId,
        teacherId,
      },
    })

    return { attendanceMarked: !!attendance }
  } catch (error) {
    console.error('Error checking teacher attendance:', error)
    return { attendanceMarked: false, error: 'Error al verificar la asistencia del profesor' }
  }
}

export async function markTeacherAttendance(
  classId: string,
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if attendance is already marked
    const existingAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        classId,
        teacherId,
      },
    })

    if (existingAttendance) {
      return { success: true } // Already marked attendance
    }

    // Mark teacher attendance
    await prisma.teacherAttendance.create({
      data: {
        classId,
        teacherId,
        status: 'PRESENT',
        timestamp: new Date(),
      },
    })

    revalidatePath(`/classroom`)
    return { success: true }
  } catch (error) {
    console.error('Error marking teacher attendance:', error)
    return { success: false, error: 'Error al marcar la asistencia del profesor' }
  }
}
