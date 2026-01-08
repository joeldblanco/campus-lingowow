import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const progressSchema = z.object({
  contentId: z.string().min(1, 'Content ID es requerido'),
  completed: z.boolean().optional(),
  percentage: z.number().min(0).max(100).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id: lessonId } = await params
    const body = await req.json()
    const { contentId, completed, percentage } = progressSchema.parse(body)

    // Verificar que el contenido pertenece a la lección
    const content = await db.content.findFirst({
      where: {
        id: contentId,
        lessonId,
      },
      select: {
        id: true,
        lesson: {
          select: {
            module: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    })

    if (!content) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso al curso
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: user.id,
        courseId: content.lesson.module?.courseId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No tienes acceso a este contenido' },
        { status: 403 }
      )
    }

    // Actualizar o crear progreso
    const userContent = await db.userContent.upsert({
      where: {
        userId_contentId: {
          userId: user.id,
          contentId,
        },
      },
      update: {
        completed: completed ?? undefined,
        percentage: percentage ?? undefined,
        lastAccessed: new Date(),
      },
      create: {
        userId: user.id,
        contentId,
        completed: completed ?? false,
        percentage: percentage ?? 0,
        lastAccessed: new Date(),
      },
    })

    // Recalcular progreso del enrollment
    const allLessonContents = await db.content.findMany({
      where: {
        lesson: {
          module: {
            courseId: content.lesson.module?.courseId,
          },
        },
      },
      select: { id: true },
    })

    const completedContents = await db.userContent.count({
      where: {
        userId: user.id,
        contentId: { in: allLessonContents.map((c) => c.id) },
        completed: true,
      },
    })

    const totalContents = allLessonContents.length
    const newProgress = totalContents > 0 
      ? Math.round((completedContents / totalContents) * 100) 
      : 0

    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { 
        progress: newProgress,
        lastAccessed: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      progress: {
        contentProgress: userContent,
        courseProgress: newProgress,
      },
    })
  } catch (error) {
    console.error('Error guardando progreso:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al guardar el progreso' },
      { status: 500 }
    )
  }
}
