import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { refreshAuthTokens } from '@/lib/mobile-auth'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken, deviceId } = refreshSchema.parse(body)

    // Intentar refrescar los tokens
    const tokens = await refreshAuthTokens(refreshToken, deviceId)

    if (!tokens) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      tokens,
    })
  } catch (error) {
    console.error('Error refrescando tokens:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al refrescar sesión' },
      { status: 500 }
    )
  }
}
