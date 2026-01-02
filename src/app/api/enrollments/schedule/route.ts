import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { enrollmentId, schedule } = body as {
      enrollmentId: string
      schedule: ScheduleSlot[]
    }

    if (!enrollmentId || !schedule || schedule.length === 0) {
      return NextResponse.json(
        { error: 'enrollmentId y schedule son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la inscripción pertenece al usuario
    const enrollment = await db.enrollment.findUnique({
      where: {
        id: enrollmentId,
        studentId: session.user.id,
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscripción no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar horarios existentes (si los hay)
    await db.classSchedule.deleteMany({
      where: {
        enrollmentId,
      },
    })

    // Crear los nuevos horarios con conversión a UTC
    const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
    
    // Obtener timezones de los profesores
    const teacherIds = [...new Set(schedule.map(s => s.teacherId))]
    const teachers = await db.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, timezone: true },
    })
    const teacherTimezones = new Map(teachers.map(t => [t.id, t.timezone || 'America/Lima']))
    
    const createdSchedules = await Promise.all(
      schedule.map((slot) => {
        const timezone = teacherTimezones.get(slot.teacherId) || 'America/Lima'
        const utcData = convertRecurringScheduleToUTC(
          slot.dayOfWeek,
          slot.startTime,
          slot.endTime,
          timezone
        )
        return db.classSchedule.create({
          data: {
            enrollmentId,
            teacherId: slot.teacherId,
            dayOfWeek: utcData.dayOfWeek,
            startTime: utcData.startTime,
            endTime: utcData.endTime,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      schedules: createdSchedules,
    })
  } catch (error) {
    console.error('Error saving schedule:', error)
    return NextResponse.json(
      { error: 'Error al guardar el horario' },
      { status: 500 }
    )
  }
}
