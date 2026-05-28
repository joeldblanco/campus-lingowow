import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { syncAutoCompletedClassBooking } from '@/lib/class-booking-auto-completion'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit-log'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    videoCall: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    classBooking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/livekit', () => ({
  generateRoomName: vi.fn((bookingId: string) => `class-${bookingId}`),
}))

vi.mock('@/lib/class-booking-auto-completion', () => ({
  syncAutoCompletedClassBooking: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/utils/date', () => ({
  getCurrentDate: vi.fn(() => new Date('2026-04-07T19:05:00.000Z')),
}))

vi.mock('@/lib/audit-log', () => ({
  auditLog: vi.fn(),
}))

import { createLiveKitMeeting, endLiveKitMeeting } from './livekit'

describe('endLiveKitMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(db.videoCall.findFirst).mockResolvedValue({
      id: 'video-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: new Date('2026-04-07T18:20:00.000Z'),
      bookingId: 'booking-1',
      roomId: 'room-1',
    } as never)

    vi.mocked(db.videoCall.update).mockResolvedValue({} as never)
    vi.mocked(syncAutoCompletedClassBooking).mockResolvedValue(false)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      status: 'CONFIRMED',
      completedAt: null,
      isPayable: false,
    } as never)
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
  })

  it('marks the class completed and payable immediately when the teacher confirms finalization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'teacher-1',
      },
    } as never)

    const result = await endLiveKitMeeting('booking-1')

    expect(result).toEqual({
      success: true,
      duration: 45,
      roomName: 'room-1',
    })
    expect(db.classBooking.findUnique).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      select: {
        status: true,
        completedAt: true,
        isPayable: true,
      },
    })
    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date('2026-04-07T19:05:00.000Z'),
        isPayable: true,
      },
    })
    expect(syncAutoCompletedClassBooking).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/classes')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/reports')
    expect(auditLog).toHaveBeenCalled()
  })

  it('keeps using the 60-minute auto-completion path when the meeting is ended by a non-teacher participant', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'student-1',
      },
    } as never)

    const result = await endLiveKitMeeting('booking-1')

    expect(result).toEqual({
      success: true,
      duration: 45,
      roomName: 'room-1',
    })
    expect(db.classBooking.findUnique).not.toHaveBeenCalled()
    expect(db.classBooking.update).not.toHaveBeenCalled()
    expect(syncAutoCompletedClassBooking).toHaveBeenCalledWith('booking-1')
  })
})

describe('createLiveKitMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      student: { id: 'student-1', name: 'S', email: 's@x', image: null },
      teacher: { id: 'teacher-1', name: 'T', email: 't@x', image: null },
    } as never)
    vi.mocked(db.videoCall.upsert).mockResolvedValue({} as never)
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
  })

  it('moves the booking to CONFIRMED and writes an audit log when called by the teacher', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1' } } as never)

    const result = await createLiveKitMeeting('booking-1')
    expect(result.success).toBe(true)
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

  it('does NOT change booking status or write an audit log when called by the student', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'student-1' } } as never)

    const result = await createLiveKitMeeting('booking-1')
    expect(result.success).toBe(true)
    expect(db.classBooking.update).not.toHaveBeenCalled()
    expect(auditLog).not.toHaveBeenCalled()
  })

  it('does NOT reset VideoCall status to SCHEDULED when the student arrives first', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'student-1' } } as never)

    await createLiveKitMeeting('booking-1')
    const upsertCall = vi.mocked(db.videoCall.upsert).mock.calls[0]?.[0]
    expect(upsertCall).toBeDefined()
    expect(upsertCall.update).not.toHaveProperty('status')
    // teacher path DOES reset status
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1' } } as never)
    await createLiveKitMeeting('booking-1')
    const teacherUpsertCall = vi.mocked(db.videoCall.upsert).mock.calls[1]?.[0]
    expect(teacherUpsertCall.update).toMatchObject({ status: 'SCHEDULED' })
  })

  it('returns success: false when caller is neither student nor teacher of the booking', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'rogue' } } as never)

    const result = await createLiveKitMeeting('booking-1')
    expect(result.success).toBe(false)
  })

  it('returns success: false when booking does not exist', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1' } } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValueOnce(null as never)

    const result = await createLiveKitMeeting('missing')
    expect(result.success).toBe(false)
  })
})
