import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { AttendanceStatus } from '@prisma/client'
import { getCurrentDate } from '@/lib/utils/date'

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

    // Obtener información de la reserva
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        enrollmentId: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
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
