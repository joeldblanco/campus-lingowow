import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { startOfDay, differenceInDays } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    // Obtener o crear registro de racha
    const streak = await db.userStreak.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
      },
    })

    // Verificar si la racha está activa (última actividad fue ayer o hoy)
    const today = startOfDay(new Date())
    const lastActivity = streak.lastActivityDate 
      ? startOfDay(streak.lastActivityDate) 
      : null

    let isActive = false
    let daysSinceLastActivity = null

    if (lastActivity) {
      daysSinceLastActivity = differenceInDays(today, lastActivity)
      isActive = daysSinceLastActivity <= 1
    }

    // Si la racha se rompió, resetear
    if (daysSinceLastActivity !== null && daysSinceLastActivity > 1 && streak.currentStreak > 0) {
      await db.userStreak.update({
        where: { userId: user.id },
        data: { currentStreak: 0 },
      })
      streak.currentStreak = 0
    }

    return NextResponse.json({
      success: true,
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActivityDate: streak.lastActivityDate,
        isActive,
        daysSinceLastActivity,
      },
    })
  } catch (error) {
    console.error('Error obteniendo racha:', error)

    return NextResponse.json(
      { error: 'Error al obtener la racha' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const today = startOfDay(new Date())

    // Obtener racha actual
    const streak = await db.userStreak.findUnique({
      where: { userId: user.id },
    })

    if (!streak) {
      // Crear nueva racha
      const newStreak = await db.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        streak: newStreak,
        pointsEarned: 0,
      })
    }

    const lastActivity = streak.lastActivityDate 
      ? startOfDay(streak.lastActivityDate) 
      : null

    // Si ya registró actividad hoy, no hacer nada
    if (lastActivity && differenceInDays(today, lastActivity) === 0) {
      return NextResponse.json({
        success: true,
        streak,
        message: 'Ya registraste actividad hoy',
        pointsEarned: 0,
      })
    }

    // Calcular nueva racha
    let newCurrentStreak = 1
    if (lastActivity && differenceInDays(today, lastActivity) === 1) {
      // Continuar racha
      newCurrentStreak = streak.currentStreak + 1
    }

    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak)

    // Actualizar racha
    const updatedStreak = await db.userStreak.update({
      where: { userId: user.id },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: new Date(),
      },
    })

    // Otorgar puntos por racha (bonus cada 7 días)
    let pointsEarned = 0
    if (newCurrentStreak % 7 === 0) {
      pointsEarned = 50 // Bonus semanal

      await db.userRewards.upsert({
        where: { userId: user.id },
        update: { totalPoints: { increment: pointsEarned } },
        create: {
          userId: user.id,
          totalPoints: pointsEarned,
        },
      })

      await db.rewardTransaction.create({
        data: {
          userId: user.id,
          type: 'EARNED_STREAK',
          amount: pointsEarned,
          description: `Bonus por racha de ${newCurrentStreak} días`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      streak: updatedStreak,
      pointsEarned,
    })
  } catch (error) {
    console.error('Error actualizando racha:', error)

    return NextResponse.json(
      { error: 'Error al actualizar la racha' },
      { status: 500 }
    )
  }
}
