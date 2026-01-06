import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    // Verificar que el usuario esté inscrito en el curso
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: user.id,
        courseId: id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No tienes acceso a este curso' },
        { status: 403 }
      )
    }

    // Obtener curso con módulos y lecciones
    const course = await db.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        level: true,
        image: true,
        classDuration: true,
        isSynchronous: true,
        isPersonalized: true,
        modules: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            objectives: true,
            lessons: {
              where: { isPublished: true },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                duration: true,
                videoUrl: true,
                summary: true,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      )
    }

    // Obtener progreso del usuario en las lecciones
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id))
    
    const userProgress = await db.userContent.findMany({
      where: {
        userId: user.id,
        content: {
          lessonId: { in: lessonIds },
        },
      },
      select: {
        contentId: true,
        completed: true,
        percentage: true,
        content: {
          select: {
            lessonId: true,
          },
        },
      },
    })

    // Crear mapa de progreso por lección
    const progressByLesson = new Map<string, { completed: number; total: number }>()
    userProgress.forEach((p) => {
      if (p.content.lessonId) {
        const current = progressByLesson.get(p.content.lessonId) || { completed: 0, total: 0 }
        current.total++
        if (p.completed) current.completed++
        progressByLesson.set(p.content.lessonId, current)
      }
    })

    // Agregar progreso a las lecciones
    const modulesWithProgress = course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const progress = progressByLesson.get(lesson.id)
        return {
          ...lesson,
          progress: progress ? Math.round((progress.completed / progress.total) * 100) : 0,
          isCompleted: progress ? progress.completed === progress.total && progress.total > 0 : false,
        }
      }),
    }))

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        modules: modulesWithProgress,
      },
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        status: enrollment.status,
      },
    })
  } catch (error) {
    console.error('Error obteniendo curso:', error)

    return NextResponse.json(
      { error: 'Error al obtener el curso' },
      { status: 500 }
    )
  }
}
