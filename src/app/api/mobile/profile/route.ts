import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const profile = await db.user.findUnique({
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
            completedContents: true,
          },
        },
        userStreak: {
          select: {
            currentStreak: true,
            longestStreak: true,
          },
        },
        userRewards: {
          select: {
            totalPoints: true,
            spentPoints: true,
            currentLevel: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error('Error obteniendo perfil:', error)

    return NextResponse.json(
      { error: 'Error al obtener el perfil' },
      { status: 500 }
    )
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  lastName: z.string().optional(),
  timezone: z.string().optional(),
  bio: z.string().optional(),
  image: z.string().url().optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const body = await req.json()
    const data = updateProfileSchema.parse(body)

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        timezone: true,
        image: true,
        bio: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error actualizando perfil:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar el perfil' },
      { status: 500 }
    )
  }
}
