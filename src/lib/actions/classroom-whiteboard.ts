'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'

export interface WhiteboardAction {
  tool: string
  color: string
  lineWidth: number
  points: { x: number; y: number }[]
  text?: string
  id?: string
}

export async function saveWhiteboardData(bookingId: string, actions: WhiteboardAction[]) {
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

    await db.whiteboardData.upsert({
      where: { bookingId },
      create: {
        bookingId,
        data: JSON.parse(JSON.stringify(actions))
      },
      update: {
        data: JSON.parse(JSON.stringify(actions))
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error saving whiteboard data:', error)
    return { success: false, error: 'Error al guardar pizarra' }
  }
}

export async function getWhiteboardData(bookingId: string): Promise<WhiteboardAction[]> {
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

    const whiteboardData = await db.whiteboardData.findUnique({
      where: { bookingId }
    })

    if (!whiteboardData) {
      return []
    }

    return (whiteboardData.data as unknown) as WhiteboardAction[]
  } catch (error) {
    console.error('Error getting whiteboard data:', error)
    return []
  }
}
