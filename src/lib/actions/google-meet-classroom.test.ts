import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { auditLog } from '@/lib/audit-log'
import { db } from '@/lib/db'
import { ensureGoogleMeetSpaceForBooking } from '@/lib/google-meet'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/audit-log', () => ({
  auditLog: vi.fn(),
}))

vi.mock('@/lib/class-booking-auto-completion', () => ({
  syncAutoCompletedClassBooking: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    classBooking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    videoCall: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/google-meet', () => ({
  ensureGoogleMeetSpaceForBooking: vi.fn(),
}))

vi.mock('@/lib/utils/date', () => ({
  getCurrentDate: vi.fn(() => new Date('2026-07-01T15:00:00.000Z')),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { enterGoogleMeetClassroom } from './google-meet-classroom'

describe('enterGoogleMeetClassroom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      status: 'CONFIRMED',
      meetingUrl: null,
      meetingSpaceName: null,
    } as never)
    vi.mocked(ensureGoogleMeetSpaceForBooking).mockResolvedValue({
      success: true,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingSpaceName: 'spaces/abc123',
      meetingCode: 'abc-defg-hij',
      created: true,
    })
    vi.mocked(db.videoCall.upsert).mockResolvedValue({} as never)
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
  })

  it('returns the Google Meet URL only for a participant of the booking', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'student-1' } } as never)

    const result = await enterGoogleMeetClassroom('booking-1')

    expect(result).toMatchObject({
      success: true,
      provider: 'GOOGLE_MEET',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      isTeacher: false,
    })
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

  it('does not expose the Google Meet URL to a non-participant', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'other-user' } } as never)

    const result = await enterGoogleMeetClassroom('booking-1')

    expect(result).toEqual({
      success: false,
      error: 'No tienes permisos para esta clase',
    })
    expect(ensureGoogleMeetSpaceForBooking).not.toHaveBeenCalled()
  })

  it('records a classroom start audit when the teacher enters', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1' } } as never)

    const result = await enterGoogleMeetClassroom('booking-1')

    expect(result).toMatchObject({ success: true, isTeacher: true })
    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'CONFIRMED' },
    })
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLASSROOM_START',
        userId: 'teacher-1',
      })
    )
  })
})

