import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })
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

    // Verificar asistencia del profesor
    const teacherAttendance = await db.teacherAttendance.findFirst({
      where: {
        classId: bookingId,
        teacherId: booking.teacherId,
      },
    })

    // Verificar asistencia del estudiante
    const studentAttendance = await db.classAttendance.findFirst({
      where: {
        classId: bookingId,
        studentId: booking.studentId,
      },
    })

    return NextResponse.json({
      success: true,
      teacherPresent: !!teacherAttendance,
      studentPresent: !!studentAttendance,
      bothPresent: !!teacherAttendance && !!studentAttendance,
      teacherAttendance: teacherAttendance ? {
        timestamp: teacherAttendance.timestamp,
        status: teacherAttendance.status,
      } : null,
      studentAttendance: studentAttendance ? {
        timestamp: studentAttendance.timestamp,
        status: studentAttendance.status,
      } : null,
    })
  } catch (error) {
    console.error('Error verificando asistencia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
