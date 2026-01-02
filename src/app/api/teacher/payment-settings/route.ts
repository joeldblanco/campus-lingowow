import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!session.user.roles?.includes(UserRole.TEACHER)) {
      return NextResponse.json({ error: 'Solo profesores pueden acceder' }, { status: 403 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        paymentSettings: true,
      },
    })

    return NextResponse.json({
      success: true,
      settings: user?.paymentSettings ? JSON.parse(user.paymentSettings as string) : null,
    })
  } catch (error) {
    console.error('Error getting payment settings:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!session.user.roles?.includes(UserRole.TEACHER)) {
      return NextResponse.json({ error: 'Solo profesores pueden acceder' }, { status: 403 })
    }

    const settings = await request.json()

    await db.user.update({
      where: { id: session.user.id },
      data: {
        paymentSettings: JSON.stringify(settings),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
    })
  } catch (error) {
    console.error('Error saving payment settings:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
