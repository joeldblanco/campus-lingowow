import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

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

    const activity = await db.activity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        activityType: true,
        level: true,
        points: true,
        duration: true,
        activityData: true,
        steps: true,
        questions: true,
        timeLimit: true,
        isPublished: true,
      },
    })

    if (!activity || !activity.isPublished) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      )
    }

    // Obtener progreso del usuario
    const userProgress = await db.userActivity.findUnique({
      where: {
        userId_activityId: {
          userId: user.id,
          activityId: id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      activity,
      userProgress,
    })
  } catch (error) {
    console.error('Error obteniendo actividad:', error)

    return NextResponse.json(
      { error: 'Error al obtener la actividad' },
      { status: 500 }
    )
  }
}

const submitSchema = z.object({
  answers: z.any(),
  score: z.number().min(0).max(100).optional(),
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

    const { id } = await params
    const body = await req.json()
    const { answers, score } = submitSchema.parse(body)

    // Verificar que la actividad existe
    const activity = await db.activity.findUnique({
      where: { id },
      select: {
        id: true,
        points: true,
        questions: true,
      },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar o crear progreso
    const userActivity = await db.userActivity.upsert({
      where: {
        userId_activityId: {
          userId: user.id,
          activityId: id,
        },
      },
      update: {
        answers,
        score,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        status: score !== undefined && score >= 70 ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: score !== undefined && score >= 70 ? new Date() : undefined,
      },
      create: {
        userId: user.id,
        activityId: id,
        answers,
        score,
        attempts: 1,
        lastAttemptAt: new Date(),
        status: score !== undefined && score >= 70 ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: score !== undefined && score >= 70 ? new Date() : undefined,
      },
    })

    // Si completó la actividad, otorgar puntos
    if (userActivity.status === 'COMPLETED' && userActivity.attempts === 1) {
      await db.userRewards.upsert({
        where: { userId: user.id },
        update: {
          totalPoints: { increment: activity.points },
        },
        create: {
          userId: user.id,
          totalPoints: activity.points,
        },
      })

      // Registrar transacción de recompensa
      await db.rewardTransaction.create({
        data: {
          userId: user.id,
          type: 'EARNED_ACTIVITY',
          amount: activity.points,
          description: `Completaste la actividad`,
          metadata: { activityId: id, score },
        },
      })
    }

    return NextResponse.json({
      success: true,
      result: {
        status: userActivity.status,
        score: userActivity.score,
        attempts: userActivity.attempts,
        pointsEarned: userActivity.status === 'COMPLETED' && userActivity.attempts === 1 
          ? activity.points 
          : 0,
      },
    })
  } catch (error) {
    console.error('Error enviando actividad:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al enviar la actividad' },
      { status: 500 }
    )
  }
}
