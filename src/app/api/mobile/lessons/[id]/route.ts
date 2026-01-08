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

    // Obtener la lección con su módulo y curso
    const lesson = await db.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        duration: true,
        content: true,
        videoUrl: true,
        summary: true,
        transcription: true,
        isPublished: true,
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contents: {
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            contentType: true,
            data: true,
          },
          orderBy: { order: 'asc' },
        },
        activities: {
          select: {
            activity: {
              select: {
                id: true,
                title: true,
                description: true,
                activityType: true,
                points: true,
                duration: true,
              },
            },
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!lesson || !lesson.isPublished) {
      return NextResponse.json(
        { error: 'Lección no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario tenga acceso al curso
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: user.id,
        courseId: lesson.module?.courseId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta lección' },
        { status: 403 }
      )
    }

    // Obtener progreso del usuario en los contenidos de esta lección
    const userProgress = await db.userContent.findMany({
      where: {
        userId: user.id,
        content: {
          lessonId: id,
        },
      },
      select: {
        contentId: true,
        completed: true,
        percentage: true,
        lastAccessed: true,
      },
    })

    const progressMap = new Map(userProgress.map((p) => [p.contentId, p]))

    // Agregar progreso a los contenidos
    const contentsWithProgress = lesson.contents.map((content) => ({
      ...content,
      userProgress: progressMap.get(content.id) || null,
    }))

    // Obtener progreso en actividades
    const activityIds = lesson.activities.map((a) => a.activity.id)
    const activityProgress = await db.userActivity.findMany({
      where: {
        userId: user.id,
        activityId: { in: activityIds },
      },
      select: {
        activityId: true,
        status: true,
        score: true,
        attempts: true,
      },
    })

    const activityProgressMap = new Map(activityProgress.map((p) => [p.activityId, p]))

    const activitiesWithProgress = lesson.activities.map((a) => ({
      ...a.activity,
      order: a.order,
      userProgress: activityProgressMap.get(a.activity.id) || null,
    }))

    // Actualizar última vez accedida
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessed: new Date() },
    })

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        duration: lesson.duration,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        summary: lesson.summary,
        transcription: lesson.transcription,
        module: lesson.module ? {
          id: lesson.module.id,
          title: lesson.module.title,
        } : null,
        course: lesson.module?.course || null,
        contents: contentsWithProgress,
        activities: activitiesWithProgress,
      },
    })
  } catch (error) {
    console.error('Error obteniendo lección:', error)

    return NextResponse.json(
      { error: 'Error al obtener la lección' },
      { status: 500 }
    )
  }
}
