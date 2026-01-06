import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { generateAuthTokens } from '@/lib/mobile-auth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, deviceId } = loginSchema.parse(body)

    // Buscar usuario
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        password: true,
        roles: true,
        timezone: true,
        image: true,
        emailVerified: true,
        status: true,
      },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar que el email esté verificado
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Por favor verifica tu email antes de iniciar sesión' },
        { status: 403 }
      )
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada' },
        { status: 403 }
      )
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
    console.error('Error en login móvil:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}
