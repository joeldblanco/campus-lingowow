import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureGoogleMeetSpaceForBooking } from '@/lib/google-meet'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { formatFullName } from '@/lib/utils/name-formatter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

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
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    const isStudent = booking.studentId === user.id
    const isTeacher = booking.teacherId === user.id

    if (!isStudent && !isTeacher) {
      return NextResponse.json({ error: 'No tienes acceso a esta clase' }, { status: 403 })
    }

    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Esta clase no esta disponible para unirse' },
        { status: 400 }
      )
    }

    const participantName = isTeacher
      ? formatFullName(booking.teacher.name, booking.teacher.lastName)
      : formatFullName(booking.student.name, booking.student.lastName)

    const meetResult = await ensureGoogleMeetSpaceForBooking(booking.id)
    if (!meetResult.success) {
      return NextResponse.json(
        {
          error: 'No se pudo preparar Google Meet',
          details: meetResult.error,
        },
        { status: 503 }
      )
    }

    await db.videoCall.upsert({
      where: { bookingId: booking.id },
      update: {
        roomId: meetResult.meetingSpaceName || meetResult.meetingUrl,
        status: 'ACTIVE',
      },
      create: {
        roomId: meetResult.meetingSpaceName || meetResult.meetingUrl,
        bookingId: booking.id,
        teacherId: booking.teacherId,
        studentId: booking.studentId,
        status: 'ACTIVE',
        startTime: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      provider: 'GOOGLE_MEET',
      googleMeet: {
        meetingUrl: meetResult.meetingUrl,
        meetingCode: meetResult.meetingCode,
        meetingSpaceName: meetResult.meetingSpaceName,
      },
      booking: {
        id: booking.id,
        courseName: booking.enrollment?.course.title ?? 'Clase de prueba',
        duration: booking.enrollment?.course.classDuration ?? 30,
        isTeacher,
        participantName,
      },
    })
  } catch (error) {
    console.error('Error uniendose a clase:', error)

    return NextResponse.json({ error: 'Error al unirse a la clase' }, { status: 500 })
  }
}
