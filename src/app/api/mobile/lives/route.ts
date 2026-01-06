import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { differenceInMinutes } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    // Obtener o crear registro de vidas
    let lives = await db.userLives.findUnique({
      where: { userId: user.id },
    })

    if (!lives) {
      lives = await db.userLives.create({
        data: {
          userId: user.id,
          currentLives: 5,
          maxLives: 5,
          rechargeRate: 30, // 30 minutos por vida
        },
      })
    }

    // Calcular vidas regeneradas
    const minutesSinceRecharge = differenceInMinutes(new Date(), lives.lastRechargeTime)
    const livesRegenerated = Math.floor(minutesSinceRecharge / lives.rechargeRate)

    if (livesRegenerated > 0 && lives.currentLives < lives.maxLives) {
      const newLives = Math.min(lives.maxLives, lives.currentLives + livesRegenerated)
      
      lives = await db.userLives.update({
        where: { userId: user.id },
        data: {
          currentLives: newLives,
          lastRechargeTime: new Date(),
        },
      })
    }

    // Calcular tiempo hasta próxima vida
    let minutesUntilNextLife = null
    if (lives.currentLives < lives.maxLives) {
      const minutesSinceLastRecharge = differenceInMinutes(new Date(), lives.lastRechargeTime)
      minutesUntilNextLife = lives.rechargeRate - (minutesSinceLastRecharge % lives.rechargeRate)
    }

    return NextResponse.json({
      success: true,
      lives: {
        current: lives.currentLives,
        max: lives.maxLives,
        rechargeRate: lives.rechargeRate,
        minutesUntilNextLife,
        lastRechargeTime: lives.lastRechargeTime,
      },
    })
  } catch (error) {
    console.error('Error obteniendo vidas:', error)

    return NextResponse.json(
      { error: 'Error al obtener las vidas' },
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

    const body = await req.json()
    const { action } = body // 'use' o 'refill'

    let lives = await db.userLives.findUnique({
      where: { userId: user.id },
    })

    if (!lives) {
      lives = await db.userLives.create({
        data: {
          userId: user.id,
          currentLives: 5,
          maxLives: 5,
          rechargeRate: 30,
        },
      })
    }

    if (action === 'use') {
      if (lives.currentLives <= 0) {
        return NextResponse.json(
          { error: 'No tienes vidas disponibles' },
          { status: 400 }
        )
      }

      lives = await db.userLives.update({
        where: { userId: user.id },
        data: {
          currentLives: lives.currentLives - 1,
        },
      })

      return NextResponse.json({
        success: true,
        lives: {
          current: lives.currentLives,
          max: lives.maxLives,
        },
        message: 'Vida usada',
      })
    }

    if (action === 'refill') {
      // Verificar si tiene puntos para recargar
      const rewards = await db.userRewards.findUnique({
        where: { userId: user.id },
      })

      const refillCost = 20 // Puntos por recarga completa
      const availablePoints = (rewards?.totalPoints || 0) - (rewards?.spentPoints || 0)

      if (availablePoints < refillCost) {
        return NextResponse.json(
          { error: 'No tienes suficientes puntos para recargar vidas' },
          { status: 400 }
        )
      }

      // Recargar vidas y gastar puntos
      await db.$transaction([
        db.userLives.update({
          where: { userId: user.id },
          data: {
            currentLives: lives.maxLives,
            lastRechargeTime: new Date(),
          },
        }),
        db.userRewards.update({
          where: { userId: user.id },
          data: {
            spentPoints: { increment: refillCost },
          },
        }),
        db.rewardTransaction.create({
          data: {
            userId: user.id,
            type: 'SPENT_LIVES',
            amount: -refillCost,
            description: 'Recarga de vidas',
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        lives: {
          current: lives.maxLives,
          max: lives.maxLives,
        },
        pointsSpent: refillCost,
        message: 'Vidas recargadas',
      })
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error actualizando vidas:', error)

    return NextResponse.json(
      { error: 'Error al actualizar las vidas' },
      { status: 500 }
    )
  }
}
