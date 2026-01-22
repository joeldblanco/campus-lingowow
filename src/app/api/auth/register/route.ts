import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { checkForSpam } from '@/lib/utils/spam-protection'

const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  website: z.string().optional(), // Campo honeypot
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validar datos
    const validatedData = registerSchema.parse(body)
    
    // Normalizar email a minúsculas
    validatedData.email = validatedData.email.toLowerCase()

    // Verificación anti-spam
    const spamCheck = checkForSpam({
      name: validatedData.name,
      lastName: validatedData.lastName,
      email: validatedData.email,
      honeypot: validatedData.website,
    })

    if (spamCheck.isSpam) {
      console.log(`[SPAM BLOCKED] Reason: ${spamCheck.reason}, Email: ${validatedData.email}`)
      return NextResponse.json(
        { error: 'No se pudo completar el registro. Intenta más tarde.' },
        { status: 400 }
      )
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await db.user.findUnique({
      where: {
        email: validatedData.email,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Crear el usuario
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        roles: ['STUDENT'], // Por defecto, los usuarios registrados son estudiantes
        emailVerified: new Date(), // Auto-verificar para simplificar el flujo de checkout
      },
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro:', error)
    
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
