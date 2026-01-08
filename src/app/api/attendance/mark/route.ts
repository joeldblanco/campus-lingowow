import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { bookingId, userType } = await request.json()

    if (!bookingId || !userType) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Obtener información de la reserva incluyendo día y horario
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        enrollmentId: true,
        day: true,
        timeSlot: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    // Validar que estamos dentro del horario de la clase
    const scheduleCheck = isWithinClassSchedule(booking.day, booking.timeSlot)
    if (!scheduleCheck.isValid) {
      return NextResponse.json({ 
        error: scheduleCheck.message,
        outsideSchedule: true 
      }, { status: 400 })
    }

    // Verificar que el usuario sea parte de la reserva
    if (booking.teacherId !== session.user.id && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos para esta clase' }, { status: 403 })
    }

    const timestamp = getCurrentDate()

    // Marcar asistencia según el tipo de usuario
    if (userType === 'teacher' && booking.teacherId === session.user.id) {
      // Verificar si ya existe asistencia del profesor
      const existingAttendance = await db.teacherAttendance.findFirst({
        where: {
          classId: bookingId,
          teacherId: session.user.id,
        },
      })

      if (!existingAttendance) {
        await db.teacherAttendance.create({
          data: {
            classId: bookingId,
            teacherId: session.user.id,
            status: 'PRESENT',
            timestamp,
          },
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Asistencia del profesor marcada',
        attendanceMarked: true
      })
    } else if (userType === 'student' && booking.studentId === session.user.id) {
      // Verificar si ya existe asistencia del estudiante
      const existingAttendance = await db.classAttendance.findFirst({
        where: {
          classId: bookingId,
          studentId: session.user.id,
        },
      })

      if (!existingAttendance) {
        await db.classAttendance.create({
          data: {
            classId: bookingId,
            studentId: session.user.id,
            enrollmentId: booking.enrollmentId,
            status: AttendanceStatus.PRESENT,
            timestamp,
          },
        })

        // Actualizar contador de clases asistidas en la inscripción
        await db.enrollment.update({
          where: { id: booking.enrollmentId },
          data: {
            classesAttended: {
              increment: 1,
            },
          },
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Asistencia del estudiante marcada',
        attendanceMarked: true
      })
    }

    return NextResponse.json({ error: 'Tipo de usuario inválido' }, { status: 400 })
  } catch (error) {
    console.error('Error marcando asistencia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
