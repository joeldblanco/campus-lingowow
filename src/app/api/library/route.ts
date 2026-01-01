import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { LibraryResourceStatus, LibraryResourceType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const type = searchParams.get('type') as LibraryResourceType | null
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const language = searchParams.get('language')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const featured = searchParams.get('featured') === 'true'

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      status: LibraryResourceStatus.PUBLISHED,
    }

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = {
        slug: category,
      }
    }

    if (level) {
      where.level = level
    }

    if (language) {
      where.language = language
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    let orderBy: Record<string, string> = {}
    switch (sort) {
      case 'popular':
        orderBy = { viewCount: 'desc' }
        break
      case 'oldest':
        orderBy = { publishedAt: 'asc' }
        break
      case 'alphabetical':
        orderBy = { title: 'asc' }
        break
      default:
        orderBy = { publishedAt: 'desc' }
    }

    const [resources, total] = await Promise.all([
      db.libraryResource.findMany({
        where,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              lastName: true,
              image: true,
            },
          },
          _count: {
            select: {
              userLikes: true,
              userSaves: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.libraryResource.count({ where }),
    ])

    // Get featured resource if requested
    let featuredResource = null
    if (featured) {
      featuredResource = await db.libraryResource.findFirst({
        where: {
          status: LibraryResourceStatus.PUBLISHED,
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              lastName: true,
              image: true,
            },
          },
        },
        orderBy: { viewCount: 'desc' },
      })
    }

    return NextResponse.json({
      resources,
      featuredResource,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching library resources:', error)
    return NextResponse.json(
      { error: 'Error al obtener los recursos' },
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

    // Check if user has permission to create resources
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true, permissions: true },
    })

    const hasPermission = user?.roles.some(role => 
      ['ADMIN', 'EDITOR', 'TEACHER'].includes(role)
    ) || user?.permissions?.includes('library:create')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear recursos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    const {
      title,
      description,
      excerpt,
      type,
      content,
      fileUrl,
      fileSize,
      fileFormat,
      thumbnailUrl,
      duration,
      language,
      level,
      tags,
      categoryId,
      metaTitle,
      metaDescription,
      status,
    } = body

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check for existing slug and make unique if needed
    let slug = baseSlug
    let counter = 1
    while (await db.libraryResource.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const resource = await db.libraryResource.create({
      data: {
        title,
        slug,
        description,
        excerpt,
        type,
        content,
        fileUrl,
        fileSize,
        fileFormat,
        thumbnailUrl,
        duration,
        language: language || 'es',
        level,
        tags: tags || [],
        categoryId,
        authorId: session.user.id,
        metaTitle,
        metaDescription,
        status: status || LibraryResourceStatus.DRAFT,
        publishedAt: status === LibraryResourceStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error('Error creating library resource:', error)
    return NextResponse.json(
      { error: 'Error al crear el recurso' },
      { status: 500 }
    )
  }
}
