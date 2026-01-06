import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const whereClause: Record<string, unknown> = {
      isActive: true,
    }

    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    const products = await db.product.findMany({
      where: whereClause,
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        plans: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            comparePrice: true,
            duration: true,
            isPopular: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    })

    // Obtener categorías
    const categories = await db.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      products,
      categories,
    })
  } catch (error) {
    console.error('Error obteniendo productos:', error)

    return NextResponse.json(
      { error: 'Error al obtener los productos' },
      { status: 500 }
    )
  }
}
