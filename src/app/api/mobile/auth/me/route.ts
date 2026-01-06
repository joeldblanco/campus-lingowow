import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    // Obtener datos adicionales del usuario
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        roles: true,
        timezone: true,
        image: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            bookingsAsStudent: true,
          },
        },
      },
    })

    if (!fullUser) {
      return unauthorizedResponse('Usuario no encontrado')
    }

    return NextResponse.json({
      success: true,
      user: fullUser,
    })
  } catch (error) {
    console.error('Error obteniendo usuario:', error)

    return NextResponse.json(
      { error: 'Error al obtener datos del usuario' },
      { status: 500 }
    )
  }
}
