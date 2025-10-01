'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { generateRoomName } from '@/lib/jitsi-jwt'
import { redirect } from 'next/navigation'

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
          select: { id: true, name: true, email: true, image: true }
        },
        teacher: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    if (!booking) {
      throw new Error('Reserva no encontrada')
    }

    // Verificar permisos
    if (booking.studentId !== session.user.id && booking.teacherId !== session.user.id) {
      throw new Error('No tienes permisos para crear esta videollamada')
    }

    // Generar nombre de sala único
    const roomName = generateRoomName(bookingId)

    // Buscar videollamada existente por bookingId
    const existingVideoCall = await db.videoCall.findFirst({
      where: { bookingId }
    })

    let videoCall
    if (existingVideoCall) {
      // Actualizar videollamada existente
      videoCall = await db.videoCall.update({
        where: { id: existingVideoCall.id },
        data: {
          roomId: roomName,
          status: 'SCHEDULED',
          startTime: new Date()
        }
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
          startTime: new Date()
        }
      })
    }

    // Actualizar estado de la reserva
    await db.classBooking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' }
    })

    return { 
      success: true, 
      roomName: videoCall.roomId,
      meetingUrl: `/meeting/${videoCall.roomId}?bookingId=${bookingId}`
    }
  } catch (error) {
    console.error('Error creando videollamada JaaS:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

export async function endJitsiMeeting(roomName: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado')
    }

    // Buscar videollamada por roomId
    const videoCall = await db.videoCall.findUnique({
      where: { roomId: roomName },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        startTime: true,
        bookingId: true
      }
    })

    if (!videoCall) {
      throw new Error('Videollamada no encontrada')
    }

    // Verificar permisos
    if (videoCall.teacherId !== session.user.id && videoCall.studentId !== session.user.id) {
      throw new Error('No tienes permisos para finalizar esta videollamada')
    }

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - videoCall.startTime.getTime()) / 1000 / 60) // minutos

    // Actualizar videollamada
    await db.videoCall.update({
      where: { roomId: roomName },
      data: {
        status: 'ENDED',
        endTime,
        duration
      }
    })

    // Actualizar reserva si existe
    if (videoCall.bookingId) {
      await db.classBooking.update({
        where: { id: videoCall.bookingId },
        data: { 
          status: 'COMPLETED',
          completedAt: endTime
        }
      })
    }

    return { success: true, duration }
  } catch (error) {
    console.error('Error finalizando videollamada JaaS:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
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
        OR: [
          { teacherId: targetUserId },
          { studentId: targetUserId }
        ]
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        booking: {
          select: {
            id: true,
            day: true,
            timeSlot: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 50
    })

    return { success: true, videoCalls }
  } catch (error) {
    console.error('Error obteniendo historial JaaS:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
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

    // Redirigir a la página de videollamada
    redirect(`/meeting/${result.roomName}?bookingId=${bookingId}`)
  } catch (error) {
    console.error('Error iniciando videollamada JaaS desde reserva:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}
