import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

// GET - Obtener estudiantes asignados a una actividad
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const activityId = params.id

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

    // Obtener asignaciones de esta actividad
    const assignments = await db.userActivity.findMany({
      where: {
        activityId,
      },
      select: {
        userId: true,
        status: true,
        assignedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Retornar solo los IDs de estudiantes asignados
    const assignedStudentIds = assignments
      .filter(assignment => assignment.status === 'ASSIGNED')
      .map(assignment => assignment.userId)

    return NextResponse.json({
      success: true,
      assignedStudentIds,
      assignments: assignments, // Información completa para debugging
    })
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener las asignaciones' },
      { status: 500 }
    )
  }
}
