'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { generateRoomName } from '@/lib/livekit'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentDate } from '@/lib/utils/date'

export async function createLiveKitMeeting(bookingId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
        teacher: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (!booking) {
      throw new Error('Reserva no encontrada')
    }

    if (booking.studentId !== session.user.id && booking.teacherId !== session.user.id) {
      throw new Error('No tienes permisos para crear esta videollamada')
    }

    let roomName = generateRoomName(bookingId)

    const existingVideoCall = await db.videoCall.findFirst({
      where: { bookingId },
    })

    let videoCall
    if (existingVideoCall) {
      roomName = existingVideoCall.roomId

      videoCall = await db.videoCall.update({
        where: { id: existingVideoCall.id },
        data: {
          status: 'SCHEDULED',
          startTime: getCurrentDate(),
        },
      })
    } else {
      videoCall = await db.videoCall.create({
        data: {
          roomId: roomName,
          teacherId: booking.teacherId,
          studentId: booking.studentId,
          bookingId: bookingId,
          status: 'SCHEDULED',
          startTime: getCurrentDate(),
        },
      })
    }

    await db.classBooking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    })

    return {
      success: true,
      roomName: videoCall.roomId,
      meetingUrl: `/classroom?classId=${bookingId}`,
    }
  } catch (error) {
    console.error('Error creando videollamada LiveKit:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function endLiveKitMeeting(bookingId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const videoCall = await db.videoCall.findFirst({
      where: { bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        startTime: true,
        bookingId: true,
        roomId: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    if (!videoCall) {
      throw new Error('Videollamada no encontrada para esta reserva')
    }

    if (videoCall.teacherId !== session.user.id && videoCall.studentId !== session.user.id) {
      throw new Error('No tienes permisos para finalizar esta videollamada')
    }

    const endTime = getCurrentDate()
    const duration = Math.round((endTime.getTime() - videoCall.startTime.getTime()) / 1000 / 60)

    await db.videoCall.update({
      where: { id: videoCall.id },
      data: {
        status: 'ENDED',
        endTime,
        duration,
      },
    })

    await db.classBooking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        completedAt: endTime,
      },
    })

    const roomName = videoCall.roomId
    revalidatePath(`/classroom`)
    revalidatePath(`/dashboard`)

    return { success: true, duration, roomName }
  } catch (error) {
    console.error('Error finalizando videollamada LiveKit:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function getLiveKitMeetingHistory(userId?: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const targetUserId = userId || session.user.id

    const videoCalls = await db.videoCall.findMany({
      where: {
        OR: [{ teacherId: targetUserId }, { studentId: targetUserId }],
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        booking: {
          select: {
            id: true,
            day: true,
            timeSlot: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    })

    return { success: true, videoCalls }
  } catch (error) {
    console.error('Error obteniendo historial LiveKit:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function startLiveKitMeetingFromBooking(bookingId: string) {
  try {
    const result = await createLiveKitMeeting(bookingId)

    if (!result.success || !result.roomName) {
      return result
    }

    redirect(`/classroom?classId=${bookingId}`)
  } catch (error) {
    console.error('Error iniciando videollamada LiveKit desde reserva:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
