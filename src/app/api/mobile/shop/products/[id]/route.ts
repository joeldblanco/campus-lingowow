import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        shortDesc: true,
        price: true,
        comparePrice: true,
        image: true,
        images: true,
        isDigital: true,
        tags: true,
        pricingType: true,
        paymentType: true,
        creditPrice: true,
        acceptsCredits: true,
        acceptsRealMoney: true,
        requiresScheduling: true,
        courseId: true,
        category: {
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
            description: true,
            level: true,
            language: true,
          },
        },
        plans: {
          where: { isActive: true },
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
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('Error obteniendo producto:', error)

    return NextResponse.json(
      { error: 'Error al obtener el producto' },
      { status: 500 }
    )
  }
}
