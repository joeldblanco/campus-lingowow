import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { Activity } from '@prisma/client'

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

    // Función para mezclar actividades por nivel manteniendo distribución
    const shuffleActivitiesByLevel = (activities: Activity[], userId: string) => {
      // Crear semilla basada en el ID del usuario para consistencia
      const createSeed = (str: string) => {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i)
          hash = hash & hash // Convertir a 32-bit integer
        }
        return Math.abs(hash)
      }
      
      const seed = createSeed(userId)
      const random = (index: number) => {
        const x = Math.sin(seed + index) * 10000
        return x - Math.floor(x)
      }

      // Agrupar por nivel
      const grouped = activities.reduce((acc: Record<number, Activity[]>, activity: Activity) => {
        const level = activity.level
        if (!acc[level]) acc[level] = []
        acc[level].push(activity)
        return acc
      }, {} as Record<number, Activity[]>)

      // Mezclar cada grupo usando la semilla
      Object.keys(grouped).forEach(level => {
        const group = grouped[parseInt(level)]
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(random(i) * (i + 1))
          ;[group[i], group[j]] = [group[j], group[i]]
        }
      })

      // Crear array mezclado tomando de cada grupo alternadamente
      const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b)
      const shuffled: Activity[] = []
      let groupIndex = 0

      while (shuffled.length < activities.length) {
        const currentLevel = levels[groupIndex % levels.length]
        const group = grouped[currentLevel]
        
        if (group.length > 0) {
          shuffled.push(group.shift()!)
        }
        
        groupIndex++
        
        // Si todos los grupos están vacíos, salir del bucle
        if (levels.every(level => grouped[level].length === 0)) {
          break
        }
      }

      return shuffled
    }

    // Determinar el filtro basado en el rol del usuario
    const isAdminOrTeacher = session.user.roles.some(role => 
      ['ADMIN', 'TEACHER', 'EDITOR'].includes(role)
    )
    
    const activities = await db.activity.findMany({
      where: {
        ...where,
        // Solo filtrar por asignaciones si es estudiante
        ...(isAdminOrTeacher ? {} : {
          userProgress: {
            some: {
              userId: session.user.id,
              status: {
                in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
              }
            }
          }
        })
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userProgress: isAdminOrTeacher ? {
          select: {
            status: true,
            score: true,
            completedAt: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        } : {
          where: { userId: session.user.id },
          select: {
            status: true,
            score: true,
            completedAt: true,
            assignedBy: true,
            assignedAt: true,
          },
        },
      },
    })

    // Mezclar actividades por nivel
    const shuffledActivities = shuffleActivitiesByLevel(activities, session.user.id!)

    // Filtrar por tag si se proporciona (ya que tags está en JSON)
    let filteredActivities = shuffledActivities
    if (tag) {
      filteredActivities = shuffledActivities.filter((activity) => {
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
