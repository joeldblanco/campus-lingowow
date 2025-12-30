'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderImage?: string
  content: string
  createdAt: Date
  isOwn: boolean
}

export async function sendChatMessage(bookingId: string, content: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const booking = await db.classBooking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { studentId: session.user.id },
          { teacherId: session.user.id }
        ]
      }
    })

    if (!booking) {
      return { success: false, error: 'Clase no encontrada' }
    }

    const message = await db.meetingMessage.create({
      data: {
        bookingId,
        senderId: session.user.id,
        content
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    revalidatePath(`/classroom`)

    return {
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender.name || 'Usuario',
        senderImage: message.sender.image || undefined,
        content: message.content,
        createdAt: message.createdAt,
        isOwn: true
      }
    }
  } catch (error) {
    console.error('Error sending chat message:', error)
    return { success: false, error: 'Error al enviar mensaje' }
  }
}

export async function getChatMessages(bookingId: string): Promise<ChatMessage[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return []
    }

    const booking = await db.classBooking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { studentId: session.user.id },
          { teacherId: session.user.id }
        ]
      }
    })

    if (!booking) {
      return []
    }

    const messages = await db.meetingMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name || 'Usuario',
      senderImage: msg.sender.image || undefined,
      content: msg.content,
      createdAt: msg.createdAt,
      isOwn: msg.senderId === session.user.id
    }))
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return []
  }
}
