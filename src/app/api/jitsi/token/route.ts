import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateJitsiJWT } from '@/lib/jitsi-jwt'

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

    // Obtener información del usuario
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

    // Verificar permisos si hay bookingId
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

      // Verificar que el usuario sea parte de la reserva
      if (booking.teacherId !== user.id && booking.studentId !== user.id) {
        return NextResponse.json({ error: 'Sin permisos para esta sala' }, { status: 403 })
      }
    }

    // Determinar si es moderador (solo TEACHER y ADMIN son anfitriones/moderadores)
    // STUDENT y GUEST son participantes regulares sin permisos de moderador
    const isModerator = user.roles.includes('TEACHER') || user.roles.includes('ADMIN')

    // Usar clave privada desde variable de entorno (compatible con Vercel)
    const privateKey = process.env.JAAS_PRIVATE_KEY

    // Generar JWT
    const token = generateJitsiJWT(
      {
        id: user.id,
        name: user.name || 'Usuario',
        email: user.email || '',
        avatar: user.image || undefined,
        isModerator,
      },
      roomName,
      privateKey
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        isModerator,
      },
    })
  } catch (error) {
    console.error('Error generando token JWT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
