import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleCheckAvailability } from './check-availability'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    user: { findFirst: vi.fn() },
    teacherAvailability: { findMany: vi.fn() },
    classBooking: { findMany: vi.fn() },
  },
}))

const SLOTS = [{ dayOfWeek: 'wednesday', localTime: '18:00' }]
const BELEN_AVAILABLE = [{ userId: 'belen', user: { id: 'belen', name: 'Belén' } }]

describe('handleCheckAvailability (student-aware)', () => {
  afterEach(() => vi.clearAllMocks())

  it('keeps a teacher available when they are busy ONLY with the same student, and flags it', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'stu-1' } as never)
    vi.mocked(db.teacherAvailability.findMany).mockResolvedValue(BELEN_AVAILABLE as never)
    // Belén is booked at this slot — but with the TARGET student herself.
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      { teacherId: 'belen', studentId: 'stu-1', teacher: { name: 'Belén' } },
    ] as never)

    const res = await handleCheckAvailability({
      slots: SLOTS,
      timezone: 'America/Caracas',
      studentNameOrEmail: 'maria@x.com',
    })

    expect(res.success).toBe(true)
    expect((res.data as { teacherNames: string[] }).teacherNames).toContain('Belén')
    // and the assistant is told the student already has this exact class
    expect((res.data as { alreadyBooked: string[] }).alreadyBooked).toHaveLength(1)
    expect((res.data as { alreadyBooked: string[] }).alreadyBooked[0]).toContain('Belén')
    expect(res.message).toContain('YA tiene')
  })

  it('marks a teacher unavailable when booked with a DIFFERENT student', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'stu-1' } as never)
    vi.mocked(db.teacherAvailability.findMany).mockResolvedValue(BELEN_AVAILABLE as never)
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      { teacherId: 'belen', studentId: 'someone-else', teacher: { name: 'Belén' } },
    ] as never)

    const res = await handleCheckAvailability({
      slots: SLOTS,
      timezone: 'America/Caracas',
      studentNameOrEmail: 'maria@x.com',
    })

    expect(res.success).toBe(false)
    expect((res.data as { alreadyBooked: string[] }).alreadyBooked).toHaveLength(0)
  })

  it('without a student, a booked teacher is still counted busy (backwards compatible)', async () => {
    vi.mocked(db.teacherAvailability.findMany).mockResolvedValue(BELEN_AVAILABLE as never)
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      { teacherId: 'belen', studentId: 'stu-1', teacher: { name: 'Belén' } },
    ] as never)

    const res = await handleCheckAvailability({ slots: SLOTS, timezone: 'America/Caracas' })

    expect(res.success).toBe(false)
    expect(db.user.findFirst).not.toHaveBeenCalled()
  })
})
