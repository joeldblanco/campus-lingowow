import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  try {
    const categories = await db.libraryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { resources: true },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching library categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener las categorías' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    })

    if (!user?.roles.some(role => ['ADMIN', 'EDITOR'].includes(role))) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear categorías' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, icon, color, sortOrder } = body

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const category = await db.libraryCategory.create({
      data: {
        name,
        slug,
        description,
        icon,
        color,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating library category:', error)
    return NextResponse.json(
      { error: 'Error al crear la categoría' },
      { status: 500 }
    )
  }
}
