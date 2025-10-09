'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AttendanceStatus } from '@prisma/client'
import { getCurrentDate } from '@/lib/utils/date'

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

    // Get the class booking to find the enrollmentId
    const classBooking = await prisma.classBooking.findUnique({
      where: { id: classId },
      select: { enrollmentId: true },
    })

    if (!classBooking || !classBooking.enrollmentId) {
      return { success: false, error: 'No se encontró información de la inscripción' }
    }

    // Mark attendance
    await prisma.classAttendance.create({
      data: {
        classId,
        studentId,
        enrollmentId: classBooking.enrollmentId,
        status: AttendanceStatus.PRESENT,
        timestamp: getCurrentDate(),
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
        status: AttendanceStatus.PRESENT,
        timestamp: getCurrentDate(),
      },
    })

    revalidatePath(`/classroom`)
    return { success: true }
  } catch (error) {
    console.error('Error marking teacher attendance:', error)
    return { success: false, error: 'Error al marcar la asistencia del profesor' }
  }
}

export async function checkBothAttendances(
  classId: string
): Promise<{ 
  success: boolean
  teacherPresent: boolean
  studentPresent: boolean
  bothPresent: boolean
  error?: string 
}> {
  try {
    const booking = await prisma.classBooking.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        studentId: true,
      },
    })

    if (!booking) {
      return {
        success: false,
        teacherPresent: false,
        studentPresent: false,
        bothPresent: false,
        error: 'Reserva no encontrada',
      }
    }

    const teacherAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        classId,
        teacherId: booking.teacherId,
      },
    })

    const studentAttendance = await prisma.classAttendance.findFirst({
      where: {
        classId,
        studentId: booking.studentId,
      },
    })

    const teacherPresent = !!teacherAttendance
    const studentPresent = !!studentAttendance
    const bothPresent = teacherPresent && studentPresent

    return {
      success: true,
      teacherPresent,
      studentPresent,
      bothPresent,
    }
  } catch (error) {
    console.error('Error checking both attendances:', error)
    return {
      success: false,
      teacherPresent: false,
      studentPresent: false,
      bothPresent: false,
      error: 'Error al verificar las asistencias',
    }
  }
}
