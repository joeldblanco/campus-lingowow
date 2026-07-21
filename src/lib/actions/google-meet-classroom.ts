'use server'

import { auth } from '@/auth'
import { auditLog } from '@/lib/audit-log'
import { syncAutoCompletedClassBooking } from '@/lib/class-booking-auto-completion'
import { db } from '@/lib/db'
import { ensureGoogleMeetSpaceForBooking } from '@/lib/google-meet'
import { getCurrentDate } from '@/lib/utils/date'
import { revalidatePath } from 'next/cache'

async function syncTeacherFinalizedClassBooking(
  bookingId: string,
  endTime: Date,
  endedByTeacher: boolean
) {
  if (!endedByTeacher) {
    return false
  }

  const booking = await db.classBooking.findUnique({
    where: { id: bookingId },
    select: {
      status: true,
      completedAt: true,
      isPayable: true,
    },
  })

  if (!booking || booking.status === 'CANCELLED') {
    return false
  }

  const updateData: {
    status?: 'COMPLETED'
    completedAt?: Date
    isPayable?: boolean
  } = {}

  if (booking.status !== 'COMPLETED') {
    updateData.status = 'COMPLETED'
  }

  if (!booking.completedAt) {
    updateData.completedAt = endTime
  }

  if (!booking.isPayable) {
    updateData.isPayable = true
  }

  if (Object.keys(updateData).length === 0) {
    return false
  }

  await db.classBooking.update({
    where: { id: bookingId },
    data: updateData,
  })

  return true
}

export async function enterGoogleMeetClassroom(bookingId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        status: true,
        meetingUrl: true,
        meetingSpaceName: true,
      },
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    const isTeacher = booking.teacherId === session.user.id
    const isStudent = booking.studentId === session.user.id

    if (!isTeacher && !isStudent) {
      return { success: false, error: 'No tienes permisos para esta clase' }
    }

    if (booking.status === 'CANCELLED') {
      return { success: false, error: 'Esta clase fue cancelada' }
    }

    const meetResult = await ensureGoogleMeetSpaceForBooking(bookingId)
    if (!meetResult.success) {
      return {
        success: false,
        error: 'No se pudo preparar la sala de Google Meet. Intenta nuevamente en unos minutos.',
        details: meetResult.error,
      }
    }

    const roomId = meetResult.meetingSpaceName || meetResult.meetingUrl
    await db.videoCall.upsert({
      where: { bookingId },
      update: { roomId, status: 'ACTIVE' },
      create: {
        roomId,
        teacherId: booking.teacherId,
        studentId: booking.studentId,
        bookingId,
        status: 'ACTIVE',
        startTime: getCurrentDate(),
      },
    })

    if (isTeacher) {
      await db.classBooking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      })

      auditLog({
        userId: session.user.id,
        action: 'CLASSROOM_START',
        category: 'CLASSROOM',
        description: `Clase iniciada en Google Meet: booking ${bookingId}`,
        metadata: {
          bookingId,
          teacherId: booking.teacherId,
          studentId: booking.studentId,
          meetingSpaceName: meetResult.meetingSpaceName,
        },
      })
    }

    return {
      success: true,
      provider: 'GOOGLE_MEET' as const,
      meetingUrl: meetResult.meetingUrl,
      meetingCode: meetResult.meetingCode,
      meetingSpaceName: meetResult.meetingSpaceName,
      isTeacher,
    }
  } catch (error) {
    console.error('Error entering Google Meet classroom:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al preparar el aula',
    }
  }
}

export async function endGoogleMeetClassroom(bookingId: string) {
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

    const endedByTeacher = videoCall.teacherId === session.user.id
    const markedCompletedByTeacher = await syncTeacherFinalizedClassBooking(
      bookingId,
      endTime,
      endedByTeacher
    )

    if (!markedCompletedByTeacher) {
      await syncAutoCompletedClassBooking(bookingId)
    }

    auditLog({
      userId: session.user.id,
      action: 'CLASSROOM_END',
      category: 'CLASSROOM',
      description: `Clase Google Meet finalizada: booking ${bookingId} (${duration} min)`,
      metadata: {
        bookingId,
        teacherId: videoCall.teacherId,
        studentId: videoCall.studentId,
        duration,
        roomId: videoCall.roomId,
        endedByTeacher,
        markedCompletedByTeacher,
      },
    })

    revalidatePath('/classroom')
    revalidatePath('/dashboard')
    revalidatePath('/admin/classes')
    revalidatePath('/admin/reports')

    return { success: true, duration, roomName: videoCall.roomId }
  } catch (error) {
    console.error('Error finalizando videollamada Google Meet:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

