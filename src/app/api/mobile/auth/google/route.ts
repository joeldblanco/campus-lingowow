import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { generateAuthTokens } from '@/lib/mobile-auth'

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID Token es requerido'),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { idToken, deviceId } = googleAuthSchema.parse(body)

    // Verificar el token de Google
    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: 'Token de Google inválido' },
        { status: 401 }
      )
    }

    const googleData = await googleResponse.json()
    const { email, name, picture, sub: googleId } = googleData

    if (!email) {
      return NextResponse.json(
        { error: 'No se pudo obtener el email de Google' },
        { status: 400 }
      )
    }

    // Buscar usuario existente por email
    let user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        roles: true,
        timezone: true,
        image: true,
        status: true,
      },
    })

    if (user) {
      // Usuario existente - verificar que esté activo
      if (user.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Tu cuenta está desactivada' },
          { status: 403 }
        )
      }

      // Vincular cuenta de Google si no existe
      const existingAccount = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: 'google',
        },
      })

      if (!existingAccount) {
        await db.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: googleId,
          },
        })
      }
    } else {
      // Crear nuevo usuario
      const nameParts = (name || '').split(' ')
      const firstName = nameParts[0] || 'Usuario'
      const lastName = nameParts.slice(1).join(' ') || null

      user = await db.user.create({
        data: {
          email,
          name: firstName,
          lastName,
          image: picture,
          emailVerified: new Date(),
          roles: ['STUDENT'],
          accounts: {
            create: {
              type: 'oauth',
              provider: 'google',
              providerAccountId: googleId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          roles: true,
          timezone: true,
          image: true,
          status: true,
        },
      })
    }

    // Generar tokens
    const tokens = await generateAuthTokens(
      { id: user.id, email: user.email, roles: user.roles },
      deviceId
    )

    return NextResponse.json({
      success: true,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        roles: user.roles,
        timezone: user.timezone,
        image: user.image,
      },
    })
  } catch (error) {
    console.error('Error en autenticación con Google:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al autenticar con Google' },
      { status: 500 }
    )
  }
}
