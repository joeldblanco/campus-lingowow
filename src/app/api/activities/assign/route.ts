import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

// POST - Asignar actividad a estudiantes
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { activityId, studentIds, assignedBy } = body

    if (!activityId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la actividad' },
        { status: 400 }
      )
    }

    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un estudiante' },
        { status: 400 }
      )
    }

    // Verificar que la actividad existe
    const activity = await db.activity.findUnique({
      where: { id: activityId },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      )
    }

    // Crear asignaciones para cada estudiante
    const assignments = await Promise.all(
      studentIds.map(async (studentId: string) => {
        // Verificar si ya existe la asignación
        const existing = await db.userActivity.findUnique({
          where: {
            userId_activityId: {
              userId: studentId,
              activityId,
            },
          },
        })

        if (existing) {
          return existing
        }

        // Crear nueva asignación
        return db.userActivity.create({
          data: {
            userId: studentId,
            activityId,
            status: 'ASSIGNED',
            assignedBy: assignedBy || session.user.id,
            assignedAt: new Date(),
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      assignedCount: assignments.length,
    })
  } catch (error) {
    console.error('Error asignando actividad:', error)
    return NextResponse.json(
      { error: 'Error al asignar la actividad' },
      { status: 500 }
    )
  }
}

// DELETE - Desasignar actividad de estudiantes
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { activityId, studentIds } = body

    if (!activityId || !studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la actividad y al menos un estudiante' },
        { status: 400 }
      )
    }

    // Eliminar asignaciones
    await db.userActivity.deleteMany({
      where: {
        activityId,
        userId: {
          in: studentIds,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error desasignando actividad:', error)
    return NextResponse.json(
      { error: 'Error al desasignar la actividad' },
      { status: 500 }
    )
  }
}
