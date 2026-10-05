import { TokenVerifier } from 'livekit-server-sdk'
import { db } from '@/lib/db'

export type RecorderBooking = {
  id: string
  teacherId: string
  studentId: string
  enrollmentId: string | null
  enrollment: { courseId: string; studentId: string } | null
}

export type RecorderAuthorization = {
  roomName: string
  bookingId: string | null
  booking: RecorderBooking | null
}

/**
 * Resolve a room to the booking that owns it. Class rooms use the canonical
 * `class-<bookingId>` name; the recording/video-call fallbacks preserve support
 * for older rooms without making the room name itself an authorization grant.
 */
export async function resolveRecorderBookingId(roomName: string): Promise<string | null> {
  if (roomName.startsWith('class-') && roomName.length > 'class-'.length) {
    return roomName.slice('class-'.length)
  }

  const recording = await db.classRecording.findFirst({
    where: { roomName },
    orderBy: { createdAt: 'desc' },
    select: { bookingId: true },
  })

  if (recording?.bookingId) {
    return recording.bookingId
  }

  const videoCall = await db.videoCall.findFirst({
    where: { roomId: roomName },
    select: { bookingId: true },
  })

  return videoCall?.bookingId ?? null
}

/**
 * Verify the signed LiveKit token supplied by egress and bind it to the room
 * named in the token. The token is deliberately the only credential accepted
 * by the recorder routes; query-string room names are never trusted by
 * themselves.
 */
export async function authorizeRecorderToken(token: string): Promise<RecorderAuthorization | null> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!token || !apiKey || !apiSecret) {
    return null
  }

  try {
    const claims = await new TokenVerifier(apiKey, apiSecret).verify(token)
    const video = claims.video as {
      room?: unknown
      roomJoin?: unknown
      canSubscribe?: unknown
      recorder?: unknown
    } | undefined
    const claimKind = claims.kind
    const hasEgressKind = typeof claimKind === 'string' && claimKind.toLowerCase() === 'egress'
    const hasRecorderGrant = video?.recorder === true

    if (
      typeof video?.room !== 'string' ||
      video.room.length === 0 ||
      video.roomJoin !== true ||
      video.canSubscribe === false ||
      (!hasEgressKind && !hasRecorderGrant)
    ) {
      return null
    }

    const roomName = video.room
    const bookingId = await resolveRecorderBookingId(roomName)

    // Egress test rooms can legitimately have no booking. They still receive
    // the room's camera/screen-share recording, while content access below
    // remains unavailable without a real booking.
    if (!bookingId) {
      return { roomName, bookingId: null, booking: null }
    }

    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        enrollmentId: true,
        enrollment: {
          select: {
            courseId: true,
            studentId: true,
          },
        },
      },
    })

    if (!booking) {
      return { roomName, bookingId: null, booking: null }
    }

    return { roomName, bookingId: booking.id, booking }
  } catch (error) {
    console.warn('[Egress recorder] LiveKit token verification failed:', error)
    return null
  }
}
