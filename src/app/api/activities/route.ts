import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

// GET - Obtener todas las actividades
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const published = searchParams.get('published')

    const where: Record<string, unknown> = {}

    if (difficulty) {
      const levelMap: Record<string, number> = {
        beginner: 1,
        intermediate: 2,
        advanced: 3,
      }
      where.level = levelMap[difficulty] || 1
    }

    if (published === 'true') {
      where.isPublished = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const activities = await db.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userProgress: {
          where: { userId: session.user.id },
          select: {
            status: true,
            score: true,
            completedAt: true,
          },
        },
      },
    })

    // Filtrar por tag si se proporciona (ya que tags está en JSON)
    let filteredActivities = activities
    if (tag) {
      filteredActivities = activities.filter((activity) => {
        const activityData = activity.activityData as { tags?: string[] } | null
        return activityData?.tags?.includes(tag)
      })
    }

    return NextResponse.json(filteredActivities)
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    return NextResponse.json(
      { error: 'Error al obtener las actividades' },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva actividad
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // Validaciones básicas
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      )
    }

    // Permitir crear actividades sin preguntas inicialmente (para el modal)
    if (questions && questions.length > 0) {
      // Validar preguntas si se proporcionan
      const hasValidQuestions = questions.every((q: { 
        questionText?: string; 
        type: string; 
        order?: number 
      }) => 
        q.questionText?.trim() && 
        q.type && 
        q.order !== undefined
      )
      
      if (!hasValidQuestions) {
        return NextResponse.json(
          { error: 'Las preguntas proporcionadas no son válidas' },
          { status: 400 }
        )
      }
    }

    const activity = await db.activity.create({
      data: {
        title,
        description: description || '',
        activityType: activityType || 'VOCABULARY',
        level: level || 1,
        points: points || 10,
        duration: duration || 5,
        isPublished: isPublished || false,
        createdById: session.user.id!,
        activityData: {
          tags: tags || [],
          questions,
        },
        steps: {
          questions,
        },
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error creando actividad:', error)
    return NextResponse.json(
      { error: 'Error al crear la actividad' },
      { status: 500 }
    )
  }
}
