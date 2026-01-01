import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para dar like' },
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

    // Check if already liked
    const existingLike = await db.libraryResourceLike.findUnique({
      where: {
        userId_resourceId: {
          userId: session.user.id,
          resourceId: id,
        },
      },
    })

    if (existingLike) {
      // Unlike
      await db.libraryResourceLike.delete({
        where: { id: existingLike.id },
      })

      await db.libraryResource.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      })

      return NextResponse.json({ liked: false })
    } else {
      // Like
      await db.libraryResourceLike.create({
        data: {
          userId: session.user.id,
          resourceId: id,
        },
      })

      await db.libraryResource.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      })

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Error al procesar el like' },
      { status: 500 }
    )
  }
}
