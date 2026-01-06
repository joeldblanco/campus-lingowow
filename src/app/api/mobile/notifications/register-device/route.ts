import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const registerDeviceSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const body = await req.json()
    const { token, platform, deviceId } = registerDeviceSchema.parse(body)

    // Verificar si el token ya existe
    const existingToken = await db.deviceToken.findUnique({
      where: { token },
    })

    if (existingToken) {
      // Actualizar si es del mismo usuario
      if (existingToken.userId === user.id) {
        await db.deviceToken.update({
          where: { id: existingToken.id },
          data: {
            platform,
            deviceId,
            isActive: true,
          },
        })
      } else {
        // Transferir token al nuevo usuario
        await db.deviceToken.update({
          where: { id: existingToken.id },
          data: {
            userId: user.id,
            platform,
            deviceId,
            isActive: true,
          },
        })
      }
    } else {
      // Crear nuevo token
      await db.deviceToken.create({
        data: {
          userId: user.id,
          token,
          platform,
          deviceId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Dispositivo registrado correctamente',
    })
  } catch (error) {
    console.error('Error registrando dispositivo:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al registrar el dispositivo' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token es requerido' },
        { status: 400 }
      )
    }

    await db.deviceToken.updateMany({
      where: {
        token,
        userId: user.id,
      },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Dispositivo desregistrado correctamente',
    })
  } catch (error) {
    console.error('Error desregistrando dispositivo:', error)

    return NextResponse.json(
      { error: 'Error al desregistrar el dispositivo' },
      { status: 500 }
    )
  }
}
