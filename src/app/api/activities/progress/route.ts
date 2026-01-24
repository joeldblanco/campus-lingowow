import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { activityId, status, score } = body

    if (!activityId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la actividad' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Upsert el progreso de la actividad
    const userActivity = await db.userActivity.upsert({
      where: {
        userId_activityId: {
          userId,
          activityId,
        },
      },
      update: {
        status: status || 'IN_PROGRESS',
        score: score ?? undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        lastAttemptAt: new Date(),
        attempts: {
          increment: 1,
        },
      },
      create: {
        userId,
        activityId,
        status: status || 'IN_PROGRESS',
        score: score ?? null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        lastAttemptAt: new Date(),
        attempts: 1,
      },
    })

    // Si se completó la actividad, actualizar la racha del usuario
    if (status === 'COMPLETED') {
      await updateUserStreak(userId)
    }

    return NextResponse.json(userActivity)
  } catch (error) {
    console.error('Error actualizando progreso:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el progreso' },
      { status: 500 }
    )
  }
}

async function updateUserStreak(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const streak = await db.userStreak.findUnique({
      where: { userId },
    })

    if (!streak) {
      await db.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        },
      })
      return
    }

    const lastDate = streak.lastActivityDate
      ? new Date(streak.lastActivityDate)
      : new Date(0)
    lastDate.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newCurrentStreak = 1

    if (lastDate.getTime() === yesterday.getTime()) {
      newCurrentStreak = streak.currentStreak + 1
    } else if (lastDate.getTime() === today.getTime()) {
      newCurrentStreak = streak.currentStreak
    }

    await db.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, streak.longestStreak),
        lastActivityDate: today,
      },
    })
  } catch (error) {
    console.error('Error actualizando racha:', error)
  }
}
