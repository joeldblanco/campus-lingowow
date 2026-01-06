import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL!

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    // Obtener la clase
    const booking = await db.classBooking.findUnique({
      where: { id },
      select: {
        id: true,
        day: true,
        timeSlot: true,
        status: true,
        studentId: true,
        teacherId: true,
        student: {
          select: {
            name: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            name: true,
            lastName: true,
          },
        },
        enrollment: {
          select: {
            course: {
              select: {
                title: true,
                classDuration: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario sea parte de la clase
    const isStudent = booking.studentId === user.id
    const isTeacher = booking.teacherId === user.id

    if (!isStudent && !isTeacher) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta clase' },
        { status: 403 }
      )
    }

    // Verificar que la clase esté confirmada
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Esta clase no está disponible para unirse' },
        { status: 400 }
      )
    }

    // Generar nombre de sala único
    const roomName = `class-${booking.id}`

    // Determinar el nombre del participante
    const participantName = isTeacher
      ? `${booking.teacher.name} ${booking.teacher.lastName || ''}`.trim()
      : `${booking.student.name} ${booking.student.lastName || ''}`.trim()

    // Generar token de LiveKit
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user.id,
      name: participantName,
      ttl: '2h',
    })

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    // Registrar o actualizar la videollamada
    const existingCall = await db.videoCall.findUnique({
      where: { bookingId: booking.id },
    })

    if (existingCall) {
      await db.videoCall.update({
        where: { id: existingCall.id },
        data: { status: 'ACTIVE' },
      })
    } else {
      await db.videoCall.create({
        data: {
          roomId: roomName,
          bookingId: booking.id,
          teacherId: booking.teacherId,
          studentId: booking.studentId,
          status: 'ACTIVE',
          startTime: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      livekit: {
        url: LIVEKIT_URL,
        token,
        roomName,
      },
      booking: {
        id: booking.id,
        courseName: booking.enrollment.course.title,
        duration: booking.enrollment.course.classDuration,
        isTeacher,
        participantName,
      },
    })
  } catch (error) {
    console.error('Error uniéndose a clase:', error)

    return NextResponse.json(
      { error: 'Error al unirse a la clase' },
      { status: 500 }
    )
  }
}
