import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { LibraryResourceStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    // Try to find by slug first, then by id
    const resource = await db.libraryResource.findFirst({
      where: {
        OR: [
          { slug: id },
          { id: id },
        ],
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            bio: true,
          },
        },
        _count: {
          select: {
            userLikes: true,
            userSaves: true,
          },
        },
      },
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Recurso no encontrado' },
        { status: 404 }
      )
    }

    // Check if resource is published or user has permission to view drafts
    if (resource.status !== LibraryResourceStatus.PUBLISHED) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Recurso no encontrado' },
          { status: 404 }
        )
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true, permissions: true },
      })

      const canViewDraft = 
        resource.authorId === session.user.id ||
        user?.roles.some(role => ['ADMIN', 'EDITOR'].includes(role)) ||
        user?.permissions?.includes('library:view_drafts')

      if (!canViewDraft) {
        return NextResponse.json(
          { error: 'Recurso no encontrado' },
          { status: 404 }
        )
      }
    }

    // Increment view count for published resources
    if (resource.status === LibraryResourceStatus.PUBLISHED) {
      await db.libraryResource.update({
        where: { id: resource.id },
        data: { viewCount: { increment: 1 } },
      })
    }

    // Check if user has liked/saved this resource
    let userInteraction = null
    if (session?.user?.id) {
      const [like, save] = await Promise.all([
        db.libraryResourceLike.findUnique({
          where: {
            userId_resourceId: {
              userId: session.user.id,
              resourceId: resource.id,
            },
          },
        }),
        db.libraryResourceSave.findUnique({
          where: {
            userId_resourceId: {
              userId: session.user.id,
              resourceId: resource.id,
            },
          },
        }),
      ])
      userInteraction = {
        hasLiked: !!like,
        hasSaved: !!save,
      }
    }

    // Get related resources
    const relatedResources = await db.libraryResource.findMany({
      where: {
        status: LibraryResourceStatus.PUBLISHED,
        id: { not: resource.id },
        OR: [
          { categoryId: resource.categoryId },
          { type: resource.type },
          { tags: { hasSome: resource.tags } },
        ],
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
      take: 4,
      orderBy: { viewCount: 'desc' },
    })

    return NextResponse.json({
      resource,
      userInteraction,
      relatedResources,
    })
  } catch (error) {
    console.error('Error fetching library resource:', error)
    return NextResponse.json(
      { error: 'Error al obtener el recurso' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const resource = await db.libraryResource.findUnique({
      where: { id },
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Recurso no encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true, permissions: true },
    })

    const canEdit = 
      resource.authorId === session.user.id ||
      user?.roles.some(role => ['ADMIN', 'EDITOR'].includes(role)) ||
      user?.permissions?.includes('library:edit')

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este recurso' },
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

    // Handle slug update if title changed
    let slug = resource.slug
    if (title && title !== resource.title) {
      const baseSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      slug = baseSlug
      let counter = 1
      while (await db.libraryResource.findFirst({ 
        where: { slug, id: { not: id } } 
      })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }

    // Handle publishedAt
    let publishedAt = resource.publishedAt
    if (status === LibraryResourceStatus.PUBLISHED && !resource.publishedAt) {
      publishedAt = new Date()
    }

    const updatedResource = await db.libraryResource.update({
      where: { id },
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
        language,
        level,
        tags,
        categoryId,
        metaTitle,
        metaDescription,
        status,
        publishedAt,
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

    return NextResponse.json(updatedResource)
  } catch (error) {
    console.error('Error updating library resource:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el recurso' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const resource = await db.libraryResource.findUnique({
      where: { id },
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Recurso no encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true, permissions: true },
    })

    const canDelete = 
      resource.authorId === session.user.id ||
      user?.roles.some(role => ['ADMIN'].includes(role)) ||
      user?.permissions?.includes('library:delete')

    if (!canDelete) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este recurso' },
        { status: 403 }
      )
    }

    await db.libraryResource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting library resource:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el recurso' },
      { status: 500 }
    )
  }
}
