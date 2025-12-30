import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateLiveKitToken } from '@/lib/livekit'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { roomName, bookingId } = await request.json()

    if (!roomName) {
      return NextResponse.json({ error: 'Nombre de sala requerido' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roles: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (bookingId) {
      const booking = await db.classBooking.findUnique({
        where: { id: bookingId },
        select: {
          teacherId: true,
          studentId: true,
        },
      })

      if (!booking) {
        return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
      }

      if (booking.teacherId !== user.id && booking.studentId !== user.id) {
        return NextResponse.json({ error: 'Sin permisos para esta sala' }, { status: 403 })
      }
    }

    const isModerator = user.roles.includes('TEACHER') || user.roles.includes('ADMIN')

    const token = await generateLiveKitToken(
      {
        id: user.id,
        name: user.name || 'Usuario',
        email: user.email || '',
        avatar: user.image || undefined,
        isModerator,
      },
      roomName
    )

    return NextResponse.json({
      token,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      user: {
        id: user.id,
        name: user.name,
        isModerator,
      },
    })
  } catch (error) {
    console.error('Error generando token LiveKit:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
