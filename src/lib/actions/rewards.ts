'use server'

import { auth } from '@/auth'
import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getUserRewards(userId?: string) {
  try {
    const session = await auth()
    const targetUserId = userId || session?.user?.id

    if (!targetUserId) {
      throw new Error('Usuario no autenticado')
    }

    let userRewards = await prisma.userRewards.findUnique({
      where: { userId: targetUserId },
    })

    // Crear registro si no existe
    if (!userRewards) {
      userRewards = await prisma.userRewards.create({
        data: {
          userId: targetUserId,
          totalPoints: 0,
          spentPoints: 0,
          currentLevel: 1,
        },
      })
    }

    const availablePoints = userRewards.totalPoints - userRewards.spentPoints
    const nextLevelPoints = userRewards.currentLevel * 1000 // 1000 puntos por nivel

    return {
      ...userRewards,
      availablePoints,
      nextLevelPoints,
    }
  } catch (error) {
    console.error('Error getting user rewards:', error)
    throw new Error('Error al obtener las recompensas del usuario')
  }
}

export async function addRewardPoints(
  userId: string,
  points: number,
  type: string,
  description: string
) {
  try {
    const userRewards = await getUserRewards(userId)
    const newTotalPoints = userRewards.totalPoints + points
    const newLevel = Math.floor(newTotalPoints / 1000) + 1

    await prisma.$transaction([
      prisma.userRewards.update({
        where: { userId },
        data: {
          totalPoints: newTotalPoints,
          currentLevel: newLevel,
        },
      }),
      prisma.rewardTransaction.create({
        data: {
          userId,
          type: type as 'EARNED_ACTIVITY' | 'EARNED_STREAK' | 'EARNED_LEVEL' | 'SPENT_LIVES' | 'SPENT_PREMIUM' | 'SPENT_MERCHANDISE' | 'SPENT_COUPON',
          amount: points,
          description,
        },
      }),
    ])

    return { success: true, newLevel: newLevel > userRewards.currentLevel }
  } catch (error) {
    console.error('Error adding reward points:', error)
    throw new Error('Error al agregar puntos de recompensa')
  }
}

export async function getRewardTransactions(userId?: string, limit: number = 20) {
  try {
    const session = await auth()
    const targetUserId = userId || session?.user?.id

    if (!targetUserId) {
      throw new Error('Usuario no autenticado')
    }

    const transactions = await prisma.rewardTransaction.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return transactions
  } catch (error) {
    console.error('Error getting reward transactions:', error)
    throw new Error('Error al obtener las transacciones de recompensas')
  }
}

export async function spendPoints(amount: number, type: string, description: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const userRewards = await getUserRewards(session.user.id)

    if (userRewards.availablePoints < amount) {
      throw new Error('No tienes suficientes puntos')
    }

    await prisma.$transaction([
      prisma.userRewards.update({
        where: { userId: session.user.id },
        data: { spentPoints: userRewards.spentPoints + amount },
      }),
      prisma.rewardTransaction.create({
        data: {
          userId: session.user.id,
          type: type as 'EARNED_ACTIVITY' | 'EARNED_STREAK' | 'EARNED_LEVEL' | 'SPENT_LIVES' | 'SPENT_PREMIUM' | 'SPENT_MERCHANDISE' | 'SPENT_COUPON',
          amount: -amount,
          description,
        },
      }),
    ])

    revalidatePath('/activities')
    return { success: true }
  } catch (error) {
    console.error('Error spending points:', error)
    throw new Error('Error al gastar puntos')
  }
}

// Funciones específicas para diferentes tipos de gastos
export async function purchasePremiumLesson(lessonId: string) {
  return spendPoints(200, 'SPENT_PREMIUM', `Lección premium desbloqueada: ${lessonId}`)
}

export async function purchaseMerchandise(itemName: string, cost: number) {
  return spendPoints(cost, 'SPENT_MERCHANDISE', `Mercancía comprada: ${itemName}`)
}

export async function purchaseDiscountCoupon(couponCode: string, cost: number) {
  return spendPoints(cost, 'SPENT_COUPON', `Cupón de descuento: ${couponCode}`)
}
