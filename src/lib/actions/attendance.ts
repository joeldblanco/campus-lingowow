'use server'

import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AttendanceStatus } from '@prisma/client'
import { getCurrentDate } from '@/lib/utils/date'

const EARLY_ENTRY_MINUTES = 15
const LATE_ENTRY_MINUTES = 15

function isWithinClassSchedule(day: string, timeSlot: string): { isValid: boolean; message?: string } {
  const now = new Date()
  
  const [startTimeStr, endTimeStr] = timeSlot.split('-').map(t => t.trim())
  if (!startTimeStr || !endTimeStr) {
    return { isValid: false, message: 'Formato de horario inválido' }
  }

  const [startHour, startMin] = startTimeStr.split(':').map(Number)
  const [endHour, endMin] = endTimeStr.split(':').map(Number)
  const [year, month, dayOfMonth] = day.split('-').map(Number)

  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    return { isValid: false, message: 'Formato de hora inválido' }
  }

  const classStartUTC = Date.UTC(year, month - 1, dayOfMonth, startHour, startMin, 0)
  const classEndUTC = Date.UTC(year, month - 1, dayOfMonth, endHour, endMin, 0)

  const allowedStartTime = classStartUTC - (EARLY_ENTRY_MINUTES * 60 * 1000)
  const allowedEndTime = classEndUTC + (LATE_ENTRY_MINUTES * 60 * 1000)

  const nowUTC = now.getTime()

  if (nowUTC < allowedStartTime) {
    const minutesUntilStart = Math.ceil((allowedStartTime - nowUTC) / 60000)
    return { 
      isValid: false, 
      message: `La clase aún no ha comenzado. Podrás ingresar en ${minutesUntilStart} minutos.` 
    }
  }

  if (nowUTC > allowedEndTime) {
    return { 
      isValid: false, 
      message: 'El horario de la clase ya ha finalizado.' 
    }
  }

  return { isValid: true }
}

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
): Promise<{ success: boolean; error?: string; outsideSchedule?: boolean }> {
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

    // Get the class booking to find the enrollmentId and schedule
    const classBooking = await prisma.classBooking.findUnique({
      where: { id: classId },
      select: { 
        enrollmentId: true,
        day: true,
        timeSlot: true,
      },
    })

    if (!classBooking || !classBooking.enrollmentId) {
      return { success: false, error: 'No se encontró información de la inscripción' }
    }

    // Validate that we are within the class schedule
    const scheduleCheck = isWithinClassSchedule(classBooking.day, classBooking.timeSlot)
    if (!scheduleCheck.isValid) {
      return { success: false, error: scheduleCheck.message, outsideSchedule: true }
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
): Promise<{ success: boolean; error?: string; outsideSchedule?: boolean }> {
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

    // Get the class booking to find the schedule
    const classBooking = await prisma.classBooking.findUnique({
      where: { id: classId },
      select: { 
        day: true,
        timeSlot: true,
      },
    })

    if (!classBooking) {
      return { success: false, error: 'No se encontró la reserva de clase' }
    }

    // Validate that we are within the class schedule
    const scheduleCheck = isWithinClassSchedule(classBooking.day, classBooking.timeSlot)
    if (!scheduleCheck.isValid) {
      return { success: false, error: scheduleCheck.message, outsideSchedule: true }
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
