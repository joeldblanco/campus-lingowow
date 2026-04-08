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
    },
    classBooking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/livekit', () => ({
  generateRoomName: vi.fn(),
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

import { endLiveKitMeeting } from './livekit'

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
