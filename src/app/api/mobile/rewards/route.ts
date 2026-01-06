import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10')

    // Obtener o crear registro de recompensas
    const rewards = await db.userRewards.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        totalPoints: 0,
        spentPoints: 0,
        currentLevel: 1,
      },
    })

    const availablePoints = rewards.totalPoints - rewards.spentPoints

    // Calcular nivel basado en puntos
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]
    let level = 1
    let pointsToNextLevel = levelThresholds[1]
    let currentLevelProgress = 0

    for (let i = 1; i < levelThresholds.length; i++) {
      if (rewards.totalPoints >= levelThresholds[i]) {
        level = i + 1
      } else {
        pointsToNextLevel = levelThresholds[i] - rewards.totalPoints
        const levelStart = levelThresholds[i - 1]
        const levelEnd = levelThresholds[i]
        currentLevelProgress = Math.round(
          ((rewards.totalPoints - levelStart) / (levelEnd - levelStart)) * 100
        )
        break
      }
    }

    let history = null
    if (includeHistory) {
      history = await db.rewardTransaction.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: historyLimit,
      })
    }

    return NextResponse.json({
      success: true,
      rewards: {
        totalPoints: rewards.totalPoints,
        spentPoints: rewards.spentPoints,
        availablePoints,
        currentLevel: level,
        pointsToNextLevel,
        currentLevelProgress,
      },
      history,
    })
  } catch (error) {
    console.error('Error obteniendo recompensas:', error)

    return NextResponse.json(
      { error: 'Error al obtener las recompensas' },
      { status: 500 }
    )
  }
}
