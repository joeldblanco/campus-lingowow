import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateRetentionIncentives } from './teacher-incentives'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    academicPeriod: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    classBooking: {
      findMany: vi.fn(),
    },
    teacherIncentive: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/utils/session', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'admin1', roles: ['ADMIN'] }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('teacher-incentives performance test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('measures calculateRetentionIncentives performance', async () => {
    const numTeachers = 100
    const bookingsPerTeacher = 50

    // Mock the data
    vi.mocked(db.academicPeriod.findUnique).mockResolvedValue({
      id: 'period2',
      startDate: new Date('2024-02-01'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(db.academicPeriod.findFirst).mockResolvedValue({
      id: 'period1',
      startDate: new Date('2024-01-01'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const teachers = Array.from({ length: numTeachers }).map((_, i) => ({ id: `teacher${i}` }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.user.findMany).mockResolvedValue(teachers as any)

    // Generate bookings
    let findManyCalls = 0
    // @ts-expect-error -- simplified mock for benchmark test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.classBooking.findMany).mockImplementation(async (query: any) => {
      findManyCalls++
      // Return dummy bookings for all teachers
      const periodId = query.where.enrollment.academicPeriodId
      const teacherIds = query.where.teacherId.in as string[]

      const allBookings = []
      for (const teacherId of teacherIds) {
        allBookings.push(
          ...Array.from({ length: bookingsPerTeacher }).map((_, i) => ({
            id: `booking-${teacherId}-${periodId}-${i}`,
            teacherId,
            studentId: `student${i}`, // same students for perfect retention
          }))
        )
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return allBookings as any
    })

    // @ts-expect-error -- simplified mock for benchmark test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.teacherIncentive.create).mockImplementation(async (args: any) => {
      return { id: 'new_incentive', ...args.data }
    })

    const start = performance.now()
    await calculateRetentionIncentives('period2')
    const end = performance.now()

    console.log(`Execution time: ${end - start} ms`)
    console.log(`Number of classBooking.findMany calls: ${findManyCalls}`)
    expect(findManyCalls).toBe(2) // Only 2 queries, no N+1
  })
})
