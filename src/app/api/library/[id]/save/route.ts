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
        { error: 'Debes iniciar sesión para guardar recursos' },
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

    // Check if already saved
    const existingSave = await db.libraryResourceSave.findUnique({
      where: {
        userId_resourceId: {
          userId: session.user.id,
          resourceId: id,
        },
      },
    })

    if (existingSave) {
      // Unsave
      await db.libraryResourceSave.delete({
        where: { id: existingSave.id },
      })

      return NextResponse.json({ saved: false })
    } else {
      // Save
      await db.libraryResourceSave.create({
        data: {
          userId: session.user.id,
          resourceId: id,
        },
      })

      return NextResponse.json({ saved: true })
    }
  } catch (error) {
    console.error('Error toggling save:', error)
    return NextResponse.json(
      { error: 'Error al procesar el guardado' },
      { status: 500 }
    )
  }
}
