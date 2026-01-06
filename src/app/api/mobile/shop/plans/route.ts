import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const language = searchParams.get('language') || 'es'

    const whereClause: Record<string, unknown> = {
      isActive: true,
    }

    if (productId) {
      whereClause.productId = productId
    }

    const plans = await db.plan.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        duration: true,
        isPopular: true,
        includesClasses: true,
        classesPerPeriod: true,
        classesPerWeek: true,
        billingCycle: true,
        creditPrice: true,
        acceptsCredits: true,
        acceptsRealMoney: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        features: {
          select: {
            included: true,
            value: true,
            feature: {
              select: {
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        pricing: {
          where: { isActive: true },
          select: {
            language: true,
            price: true,
            comparePrice: true,
            currency: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Mapear precios según el idioma solicitado
    const plansWithLocalizedPricing = plans.map((plan) => {
      const localizedPricing = plan.pricing.find((p) => p.language === language)
      
      return {
        ...plan,
        localizedPrice: localizedPricing || {
          language,
          price: plan.price,
          comparePrice: plan.comparePrice,
          currency: 'USD',
        },
      }
    })

    return NextResponse.json({
      success: true,
      plans: plansWithLocalizedPricing,
    })
  } catch (error) {
    console.error('Error obteniendo planes:', error)

    return NextResponse.json(
      { error: 'Error al obtener los planes' },
      { status: 500 }
    )
  }
}
