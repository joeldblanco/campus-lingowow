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

    // Obtener o crear balance de créditos
    const balance = await db.userCreditBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        totalCredits: 0,
        availableCredits: 0,
        spentCredits: 0,
        bonusCredits: 0,
      },
    })

    let history = null
    if (includeHistory) {
      history = await db.creditTransaction.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          transactionType: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          relatedEntityType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: historyLimit,
      })
    }

    // Obtener paquetes de créditos disponibles
    const packages = await db.creditPackage.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        credits: true,
        price: true,
        bonusCredits: true,
        isPopular: true,
        image: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      balance: {
        total: balance.totalCredits,
        available: balance.availableCredits,
        spent: balance.spentCredits,
        bonus: balance.bonusCredits,
      },
      packages,
      history,
    })
  } catch (error) {
    console.error('Error obteniendo créditos:', error)

    return NextResponse.json(
      { error: 'Error al obtener los créditos' },
      { status: 500 }
    )
  }
}
