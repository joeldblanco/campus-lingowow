import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { generateAuthTokens } from '@/lib/mobile-auth'

const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, lastName, email, password, deviceId } = registerSchema.parse(body)
    
    // Normalizar email a minúsculas
    const normalizedEmail = email.toLowerCase()

    // Verificar si el usuario ya existe
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear el usuario
    const user = await db.user.create({
      data: {
        name,
        lastName,
        email: normalizedEmail,
        password: hashedPassword,
        roles: ['STUDENT'],
        emailVerified: new Date(), // Auto-verificar para móvil
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        roles: true,
        timezone: true,
        image: true,
      },
    })

    // Generar tokens
    const tokens = await generateAuthTokens(
      { id: user.id, email: user.email, roles: user.roles },
      deviceId
    )

    return NextResponse.json(
      {
        success: true,
        tokens,
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro móvil:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
