import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

/**
 * DELETE /api/api-keys/[keyId]
 * Revoke (delete) an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyId } = await params

    // Verify the key belongs to the user
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.userId !== session.user.id) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Delete the key
    await db.apiKey.delete({
      where: { id: keyId },
    })

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/api-keys/[keyId]
 * Update an API key (activate/deactivate, rename)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyId } = await params

    // Verify the key belongs to the user
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.userId !== session.user.id) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, isActive } = body

    const updatedKey = await db.apiKey.update({
      where: { id: keyId },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedKey,
    })
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
