import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'
import { ensureGoogleMeetSpaceForBooking } from '@/lib/google-meet'
import { getMobileUser } from '@/lib/mobile-auth'

vi.mock('@/lib/db', () => ({
  db: {
    classBooking: {
      findUnique: vi.fn(),
    },
    videoCall: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/google-meet', () => ({
  ensureGoogleMeetSpaceForBooking: vi.fn(),
}))

vi.mock('@/lib/mobile-auth', () => ({
  getMobileUser: vi.fn(),
  unauthorizedResponse: vi.fn(() => Response.json({ error: 'Unauthorized' }, { status: 401 })),
}))

import { POST } from './route'

function request() {
  return new Request('http://localhost/api/mobile/bookings/booking-1/join', {
    method: 'POST',
  }) as never
}

describe('POST /api/mobile/bookings/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getMobileUser).mockResolvedValue({ id: 'student-1' } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      day: '2026-07-01',
      timeSlot: '15:00-15:40',
      status: 'CONFIRMED',
      studentId: 'student-1',
      teacherId: 'teacher-1',
      student: { name: 'Student', lastName: 'One' },
      teacher: { name: 'Teacher', lastName: 'One' },
      enrollment: {
        course: {
          title: 'English',
          classDuration: 40,
        },
      },
    } as never)
    vi.mocked(ensureGoogleMeetSpaceForBooking).mockResolvedValue({
      success: true,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingCode: 'abc-defg-hij',
      meetingSpaceName: 'spaces/abc123',
      created: false,
    })
    vi.mocked(db.videoCall.upsert).mockResolvedValue({} as never)
  })

  it('returns Google Meet details instead of a LiveKit token', async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: 'booking-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      provider: 'GOOGLE_MEET',
      googleMeet: {
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      },
    })
    expect(body.livekit).toBeUndefined()
    expect(db.videoCall.upsert).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1' },
      update: { roomId: 'spaces/abc123', status: 'ACTIVE' },
      create: expect.objectContaining({
        roomId: 'spaces/abc123',
        bookingId: 'booking-1',
        status: 'ACTIVE',
      }),
    })
  })

  it('does not expose meeting details to a user outside the booking', async () => {
    vi.mocked(getMobileUser).mockResolvedValue({ id: 'other-user' } as never)

    const response = await POST(request(), { params: Promise.resolve({ id: 'booking-1' }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'No tienes acceso a esta clase' })
    expect(ensureGoogleMeetSpaceForBooking).not.toHaveBeenCalled()
  })
})

