import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

// GET - Obtener una actividad por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const activity = await db.activity.findUnique({
      where: { id },
      include: {
        userProgress: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error obteniendo actividad:', error)
    return NextResponse.json(
      { error: 'Error al obtener la actividad' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar una actividad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      activityType,
      level,
      points,
      duration,
      isPublished,
      tags,
      questions,
    } = body

    const activity = await db.activity.update({
      where: { id },
      data: {
        title,
        description: description || '',
        activityType: activityType || 'VOCABULARY',
        level: level || 1,
        points: points || 10,
        duration: duration || 5,
        isPublished: isPublished || false,
        activityData: {
          tags: tags || [],
          questions,
        },
        steps: {
          questions,
        },
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error actualizando actividad:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la actividad' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una actividad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await db.activity.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando actividad:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la actividad' },
      { status: 500 }
    )
  }
}
