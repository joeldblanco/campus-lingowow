'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { generateRoomName } from '@/lib/jitsi-jwt'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentDate } from '@/lib/utils/date'

export async function createJitsiMeeting(bookingId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener detalles de la reserva
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

    // Verificar permisos
    if (booking.studentId !== session.user.id && booking.teacherId !== session.user.id) {
      throw new Error('No tienes permisos para crear esta videollamada')
    }

    // Generar nombre de sala único (por defecto)
    let roomName = generateRoomName(bookingId)

    // Buscar videollamada existente por bookingId
    const existingVideoCall = await db.videoCall.findFirst({
      where: { bookingId },
    })

    let videoCall
    if (existingVideoCall) {
      // Reuse existing room name to prevent splitting participants into different rooms
      roomName = existingVideoCall.roomId

      // Actualizar estado de videollamada existente (reactivar si es necesario)
      videoCall = await db.videoCall.update({
        where: { id: existingVideoCall.id },
        data: {
          status: 'SCHEDULED', // Reactivate if it was ended
          // Don't update startTime to preserve original start? Or update to now?
          // Let's update startTime to track this new session
          startTime: getCurrentDate(),
        },
      })
    } else {
      // Crear nueva videollamada
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

    // Actualizar estado de la reserva
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
    console.error('Error creando videollamada JaaS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function endJitsiMeeting(bookingId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    // Buscar videollamada por bookingId
    const videoCall = await db.videoCall.findFirst({
      where: { bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        startTime: true,
        bookingId: true,
        roomId: true, // Need roomId to potentially close Jitsi session if needed regarding API, but here we update DB
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    if (!videoCall) {
      throw new Error('Videollamada no encontrada para esta reserva')
    }

    // Verificar permisos
    if (videoCall.teacherId !== session.user.id && videoCall.studentId !== session.user.id) {
      throw new Error('No tienes permisos para finalizar esta videollamada')
    }

    const endTime = getCurrentDate()
    const duration = Math.round((endTime.getTime() - videoCall.startTime.getTime()) / 1000 / 60) // minutos

    // Actualizar videollamada
    await db.videoCall.update({
      where: { id: videoCall.id },
      data: {
        status: 'ENDED',
        endTime,
        duration,
      },
    })

    // Actualizar reserva
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
    console.error('Error finalizando videollamada JaaS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function getJitsiMeetingHistory(userId?: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    const targetUserId = userId || session.user.id

    // Obtener historial de videollamadas
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
    console.error('Error obteniendo historial JaaS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export async function startJitsiMeetingFromBooking(bookingId: string) {
  try {
    // Crear la videollamada
    const result = await createJitsiMeeting(bookingId)

    if (!result.success || !result.roomName) {
      return result
    }

    // Redirigir a la página de classroom
    redirect(`/classroom?classId=${bookingId}`)
  } catch (error) {
    console.error('Error iniciando videollamada JaaS desde reserva:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
