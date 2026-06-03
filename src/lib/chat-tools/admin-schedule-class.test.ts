import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminScheduleClass } from './admin-schedule-class'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    enrollment: {
      findFirst: vi.fn(),
    },
    classBooking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    teacherAvailability: {
      findMany: vi.fn(),
    },
  },
}))

const STUDENT = {
  id: 'student-1',
  name: 'Elizabeth Mendoza',
  email: 'student@x.com',
  roles: ['STUDENT'],
  timezone: 'America/New_York',
}

function mockUserFindFirst() {
  // Resolves the student lookup, the teacher-by-id attempt (no match), and the
  // teacher-by-email lookup, based on the where clause shape.
  vi.mocked(db.user.findFirst).mockImplementation((async (args: { where: Record<string, unknown> }) => {
    const where = args.where
    if (where.id) return null // teacher-by-id attempt with an email string → no match
    const email = (where.email as { equals?: string } | undefined)?.equals
    if (email === 'student@x.com') return STUDENT
    if (email === 'teacher@x.com') return { id: 'teacher-1' }
    return null
  }) as never)
}

describe('handleAdminScheduleClass', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Monday 2026-06-01 12:00 UTC — the test period spans one week so it
    // contains exactly one Wednesday (2026-06-03).
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

    mockUserFindFirst()

    vi.mocked(db.enrollment.findFirst).mockResolvedValue({
      id: 'enr-1',
      teacherId: 'teacher-1',
      academicPeriod: {
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2026-06-07T00:00:00Z'),
        name: 'Período 6',
      },
      course: { classDuration: 40 },
    } as never)

    // No existing student bookings, no teacher already booked.
    vi.mocked(db.classBooking.findFirst).mockResolvedValue(null)
    vi.mocked(db.classBooking.findMany).mockResolvedValue([] as never)
    // The teacher is available for every queried slot.
    vi.mocked(db.teacherAvailability.findMany).mockResolvedValue([{ userId: 'teacher-1' }] as never)
    vi.mocked(db.classBooking.create).mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('books every slot when two slots fall on the same weekday (Wed 19:00 + Wed 20:00)', async () => {
    const result = await handleAdminScheduleClass({
      studentNameOrEmail: 'student@x.com',
      teacherNameOrEmail: 'teacher@x.com',
      slots: [
        { dayOfWeek: 'wednesday', localTime: '19:00' },
        { dayOfWeek: 'wednesday', localTime: '20:00' },
      ],
      adminTimezone: 'America/Lima',
    })

    expect(result.success).toBe(true)
    // One Wednesday in the period × two distinct slots = two bookings.
    expect(db.classBooking.create).toHaveBeenCalledTimes(2)
    expect((result.data as { scheduledCount: number }).scheduledCount).toBe(2)

    const bookedTimeSlots = vi
      .mocked(db.classBooking.create)
      .mock.calls.map((c) => (c[0] as { data: { timeSlot: string } }).data.timeSlot)
      .sort()
    // Lima 19:00→00:00 UTC, 20:00→01:00 UTC (both on the following UTC day).
    expect(bookedTimeSlots).toEqual(['00:00-00:40', '01:00-01:40'])
  })

  it('books a single slot on a weekday normally', async () => {
    const result = await handleAdminScheduleClass({
      studentNameOrEmail: 'student@x.com',
      teacherNameOrEmail: 'teacher@x.com',
      slots: [{ dayOfWeek: 'wednesday', localTime: '19:00' }],
      adminTimezone: 'America/Lima',
    })

    expect(result.success).toBe(true)
    expect(db.classBooking.create).toHaveBeenCalledTimes(1)
    expect((result.data as { scheduledCount: number }).scheduledCount).toBe(1)
  })
})
