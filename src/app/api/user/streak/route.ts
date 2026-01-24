import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const streak = await db.userStreak.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      lastActivityDate: streak?.lastActivityDate || null,
    })
  } catch (error) {
    console.error('Error obteniendo racha:', error)
    return NextResponse.json(
      { error: 'Error al obtener la racha' },
      { status: 500 }
    )
  }
}
