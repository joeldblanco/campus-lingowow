import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateRoomName } from '@/lib/livekit'

// Token lifetime: long enough for a class + grace period, short enough to limit replay.
const TOKEN_TTL = '2h'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : null

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })
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

    const isBookingTeacher = booking.teacherId === user.id
    const isBookingStudent = booking.studentId === user.id

    if (!isBookingTeacher && !isBookingStudent) {
      return NextResponse.json({ error: 'Sin permisos para esta sala' }, { status: 403 })
    }

    // Derive the room name from the bookingId. The client cannot influence which room the
    // token is valid for — preventing a logged-in teacher from minting tokens for arbitrary rooms.
    const roomName = generateRoomName(bookingId)

    // Moderator status is anchored to the booking's teacher only.
    // A user with TEACHER role on a different booking does NOT get moderator powers here.
    const isModerator = isBookingTeacher

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit no configurado' }, { status: 500 })
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name || 'Usuario',
      ttl: TOKEN_TTL,
      metadata: JSON.stringify({
        email: user.email,
        avatar: user.image,
        isModerator,
      }),
    })

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Moderator can administer THIS room and trigger recording on it, but is not
      // allowed to enumerate or create arbitrary rooms project-wide.
      roomAdmin: isModerator,
      roomRecord: isModerator,
      roomCreate: false,
      roomList: false,
    })

    const token = await at.toJwt()

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
