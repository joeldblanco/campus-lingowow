import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    classRecording: { findFirst: vi.fn() },
    videoCall: { findFirst: vi.fn() },
    classBooking: { findUnique: vi.fn() },
  },
}))

vi.mock('livekit-server-sdk', () => ({
  TokenVerifier: vi.fn(),
}))

import { db } from '@/lib/db'
import { TokenVerifier } from 'livekit-server-sdk'
import { authorizeRecorderToken } from './auth'

describe('authorizeRecorderToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LIVEKIT_API_KEY = 'api-key'
    process.env.LIVEKIT_API_SECRET = 'api-secret'
    vi.mocked(db.classRecording.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.videoCall.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue(null as never)
  })

  it('requires a signed token whose join grant is scoped to a room', async () => {
    vi.mocked(TokenVerifier).mockImplementation(() => ({
      verify: vi.fn().mockResolvedValue({
        kind: 'EGRESS',
        video: { room: 'class-booking-1', roomJoin: true, canSubscribe: true, recorder: true },
      }),
    }) as never)

    const auth = await authorizeRecorderToken('signed-token')

    expect(auth).toEqual({ roomName: 'class-booking-1', bookingId: null, booking: null })
    expect(TokenVerifier).toHaveBeenCalledWith('api-key', 'api-secret')
  })

  it('rejects unsigned or non-join claims without querying lesson scope', async () => {
    vi.mocked(TokenVerifier).mockImplementation(() => ({
      verify: vi.fn().mockResolvedValue({
        kind: 'EGRESS',
        video: { room: 'class-booking-1', roomJoin: false, recorder: true },
      }),
    }) as never)

    await expect(authorizeRecorderToken('bad-token')).resolves.toBeNull()
    expect(db.classBooking.findUnique).not.toHaveBeenCalled()
  })

  it('resolves the booking from a class room before exposing booking-scoped data', async () => {
    vi.mocked(TokenVerifier).mockImplementation(() => ({
      verify: vi.fn().mockResolvedValue({
        kind: 'EGRESS',
        video: { room: 'class-booking-1', roomJoin: true, canSubscribe: true, recorder: true },
      }),
    }) as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      enrollmentId: 'enrollment-1',
      enrollment: { courseId: 'course-1', studentId: 'student-1' },
    } as never)

    const auth = await authorizeRecorderToken('signed-token')

    expect(auth?.bookingId).toBe('booking-1')
    expect(db.classBooking.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'booking-1' },
    }))
  })

  it('rejects a normal participant join token without the recorder grant', async () => {
    vi.mocked(TokenVerifier).mockImplementation(() => ({
      verify: vi.fn().mockResolvedValue({
        video: { room: 'class-booking-1', roomJoin: true, canSubscribe: true },
      }),
    }) as never)

    await expect(authorizeRecorderToken('participant-token')).resolves.toBeNull()
  })
})
