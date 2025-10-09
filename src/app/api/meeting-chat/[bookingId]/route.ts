import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    bookingId: string
  }>
}

// GET - Obtener mensajes del chat de la reunión
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { bookingId } = await params

    // Verificar que el usuario sea parte de la reserva
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

    if (booking.teacherId !== session.user.id && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Obtener mensajes del chat
    const messages = await db.meetingMessage.findMany({
      where: { bookingId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name || 'Usuario',
      senderImage: msg.sender.image,
      content: msg.content,
      timestamp: msg.createdAt,
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Error obteniendo mensajes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Enviar mensaje al chat de la reunión
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { bookingId } = await params
    const { content } = await request.json()

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 })
    }

    // Verificar que el usuario sea parte de la reserva
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

    if (booking.teacherId !== session.user.id && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Crear mensaje
    const message = await db.meetingMessage.create({
      data: {
        bookingId,
        senderId: session.user.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    const formattedMessage = {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name || 'Usuario',
      senderImage: message.sender.image,
      content: message.content,
      timestamp: message.createdAt,
    }

    return NextResponse.json({ message: formattedMessage })
  } catch (error) {
    console.error('Error enviando mensaje:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
