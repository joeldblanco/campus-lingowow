'use server'

import { auth } from '@/auth'
import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getUserLives(userId?: string) {
  try {
    const session = await auth()
    const targetUserId = userId || session?.user?.id

    if (!targetUserId) {
      throw new Error('Usuario no autenticado')
    }

    let userLives = await prisma.userLives.findUnique({
      where: { userId: targetUserId },
    })

    // Crear registro si no existe
    if (!userLives) {
      userLives = await prisma.userLives.create({
        data: {
          userId: targetUserId,
          currentLives: 5,
          maxLives: 5,
          lastRechargeTime: new Date(),
          rechargeRate: 30,
        },
      })
    }

    // Calcular vidas recargadas automáticamente
    const now = new Date()
    const timeDiff = now.getTime() - userLives.lastRechargeTime.getTime()
    const minutesPassed = Math.floor(timeDiff / (1000 * 60))
    const livesToRecharge = Math.floor(minutesPassed / userLives.rechargeRate)

    if (livesToRecharge > 0 && userLives.currentLives < userLives.maxLives) {
      const newLives = Math.min(userLives.currentLives + livesToRecharge, userLives.maxLives)
      const rechargeTime = new Date(
        userLives.lastRechargeTime.getTime() + livesToRecharge * userLives.rechargeRate * 60 * 1000
      )

      userLives = await prisma.userLives.update({
        where: { userId: targetUserId },
        data: {
          currentLives: newLives,
          lastRechargeTime: rechargeTime,
        },
      })
    }

    // Calcular tiempo hasta próxima recarga
    const nextRechargeTime =
      userLives.currentLives < userLives.maxLives
        ? new Date(userLives.lastRechargeTime.getTime() + userLives.rechargeRate * 60 * 1000)
        : null

    return {
      ...userLives,
      nextRechargeTime,
      minutesUntilRecharge: nextRechargeTime
        ? Math.max(0, Math.ceil((nextRechargeTime.getTime() - now.getTime()) / (1000 * 60)))
        : 0,
    }
  } catch (error) {
    console.error('Error getting user lives:', error)
    throw new Error('Error al obtener las vidas del usuario')
  }
}

export async function decreaseLives(userId?: string) {
  try {
    const session = await auth()
    const targetUserId = userId || session?.user?.id

    if (!targetUserId) {
      throw new Error('Usuario no autenticado')
    }

    const userLives = await getUserLives(targetUserId)

    if (userLives.currentLives <= 0) {
      throw new Error('No tienes vidas disponibles')
    }

    const updatedLives = await prisma.userLives.update({
      where: { userId: targetUserId },
      data: {
        currentLives: userLives.currentLives - 1,
      },
    })

    revalidatePath('/activities')
    return updatedLives
  } catch (error) {
    console.error('Error decreasing lives:', error)
    throw new Error('Error al reducir las vidas')
  }
}

export async function purchaseLives(livesToBuy: number) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const pointsCost = livesToBuy * 50 // 50 puntos por vida

    // Verificar puntos disponibles
    const userRewards = await prisma.userRewards.findUnique({
      where: { userId: session.user.id },
    })

    if (!userRewards || userRewards.totalPoints - userRewards.spentPoints < pointsCost) {
      throw new Error('No tienes suficientes puntos')
    }

    const userLives = await getUserLives(session.user.id)
    const newLives = Math.min(userLives.currentLives + livesToBuy, userLives.maxLives)
    const actualLivesBought = newLives - userLives.currentLives

    if (actualLivesBought === 0) {
      throw new Error('Ya tienes el máximo de vidas')
    }

    const actualCost = actualLivesBought * 50

    // Actualizar vidas y puntos en transacción
    await prisma.$transaction([
      prisma.userLives.update({
        where: { userId: session.user.id },
        data: { currentLives: newLives },
      }),
      prisma.userRewards.update({
        where: { userId: session.user.id },
        data: { spentPoints: userRewards.spentPoints + actualCost },
      }),
      prisma.rewardTransaction.create({
        data: {
          userId: session.user.id,
          type: 'SPENT_LIVES',
          amount: -actualCost,
          description: `Compra de ${actualLivesBought} vida(s)`,
        },
      }),
    ])

    revalidatePath('/activities')
    return { success: true, livesBought: actualLivesBought, pointsSpent: actualCost }
  } catch (error) {
    console.error('Error purchasing lives:', error)
    throw new Error('Error al comprar vidas')
  }
}
