import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revokeRefreshToken, revokeAllUserTokens, getMobileUser } from '@/lib/mobile-auth'

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  allDevices: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken, allDevices } = logoutSchema.parse(body)

    if (allDevices) {
      // Cerrar sesión en todos los dispositivos
      const user = await getMobileUser(req)
      if (user) {
        await revokeAllUserTokens(user.id)
      }
    } else if (refreshToken) {
      // Cerrar sesión solo en este dispositivo
      await revokeRefreshToken(refreshToken)
    }

    return NextResponse.json({
      success: true,
      message: allDevices 
        ? 'Sesión cerrada en todos los dispositivos' 
        : 'Sesión cerrada correctamente',
    })
  } catch (error) {
    console.error('Error en logout:', error)

    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
