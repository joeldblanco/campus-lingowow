import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

/**
 * Obtiene las inscripciones del estudiante que requieren configuración de horario
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar inscripciones activas sin horario configurado
    // Debe verificar tanto schedules (horarios recurrentes) como bookings (clases reservadas)
    const enrollmentsWithoutSchedule = await db.enrollment.findMany({
      where: {
        studentId: session.user.id,
        status: 'ACTIVE',
        AND: [
          { schedules: { none: {} } }, // No tiene horarios recurrentes
          { bookings: { none: {} } },  // No tiene clases reservadas
        ],
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        academicPeriod: {
          include: {
            season: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    // Calcular días desde la inscripción
    const enrollmentsWithDays = enrollmentsWithoutSchedule.map((enrollment) => {
      const daysSinceEnrollment = Math.floor(
        (Date.now() - enrollment.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      return {
        ...enrollment,
        daysSinceEnrollment,
        isUrgent: daysSinceEnrollment >= 5, // Urgente si han pasado 5+ días
        daysRemaining: Math.max(0, 7 - daysSinceEnrollment), // Días restantes antes de suspensión
      }
    })

    return NextResponse.json({
      enrollments: enrollmentsWithDays,
      count: enrollmentsWithDays.length,
      hasUrgent: enrollmentsWithDays.some((e) => e.isUrgent),
    })
  } catch (error) {
    console.error('Error fetching pending schedules:', error)
    return NextResponse.json(
      { error: 'Error al obtener inscripciones pendientes' },
      { status: 500 }
    )
  }
}
