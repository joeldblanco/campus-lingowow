import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/db', () => ({
  db: {
    classBooking: {
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/class-booking-auto-completion', () => ({
  syncAutoCompletedClassBookings: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Identity UTC conversion so the test asserts the locally-computed slot directly.
vi.mock('@/lib/utils/date', () => ({
  convertTimeSlotToUTC: vi.fn((day: string, timeSlot: string) => ({ day, timeSlot })),
}))

import { createTrialClass, toggleClassPayable } from './classes'

describe('toggleClassPayable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
  })

  it('updates the booking payable flag and returns a success message', async () => {
    const result = await toggleClassPayable('booking-1', true)

    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { isPayable: true },
    })
    expect(result).toEqual({
      success: true,
      message: 'Clase marcada como válida para pago',
    })
  })

  it('returns the unmarked message when toggling payable off', async () => {
    const result = await toggleClassPayable('booking-1', false)

    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { isPayable: false },
    })
    expect(result).toEqual({
      success: true,
      message: 'Clase desmarcada como válida para pago',
    })
  })

  // Regression: the inline classes table relies on optimistic client updates and
  // keeps its filters in the URL via history.replaceState. Calling revalidatePath
  // here forced a refresh of /admin/classes that wiped those filters, unlike the
  // "mark completed" flow. toggleClassPayable must not revalidate any path.
  it('does not call revalidatePath so the classes table filters are preserved', async () => {
    await toggleClassPayable('booking-1', true)

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns an error result when the update fails', async () => {
    vi.mocked(db.classBooking.update).mockRejectedValueOnce(new Error('db down'))

    const result = await toggleClassPayable('booking-1', true)

    expect(result).toEqual({
      success: false,
      error: 'Error al actualizar el estado de pago de la clase',
    })
  })
})

describe('createTrialClass', () => {
  const baseInput = {
    studentId: 'student-1',
    teacherId: 'teacher-1',
    datetime: '2026-06-10T10:00',
    timezone: 'America/Lima',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Defaults: student is a STUDENT, teacher exists, no conflicts.
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'student-1',
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'teacher-1' } as never)
    vi.mocked(db.user.update).mockResolvedValue({} as never)
    vi.mocked(db.classBooking.findMany).mockResolvedValue([] as never)
    vi.mocked(db.classBooking.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.classBooking.create).mockResolvedValue({ id: 'booking-trial' } as never)
  })

  it('creates a booking with no enrollment, isTrial true and a 30-min slot', async () => {
    const result = await createTrialClass(baseInput)

    expect(db.classBooking.create).toHaveBeenCalledWith({
      data: {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        enrollmentId: null,
        isTrial: true,
        day: '2026-06-10',
        timeSlot: '10:00-10:30',
        notes: undefined,
        status: 'CONFIRMED',
      },
    })
    expect(result.success).toBe(true)
    // Already a STUDENT, so no role promotion happens.
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('promotes a GUEST student to STUDENT before scheduling', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'student-1',
      roles: ['GUEST'],
    } as never)

    const result = await createTrialClass(baseInput)

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { roles: { push: 'STUDENT' } },
    })
    expect(result.success).toBe(true)
    expect(db.classBooking.create).toHaveBeenCalled()
  })

  it('rejects when the teacher already has an overlapping class', async () => {
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      { id: 'other', timeSlot: '10:00-11:00' },
    ] as never)

    const result = await createTrialClass(baseInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('se superpone')
    expect(db.classBooking.create).not.toHaveBeenCalled()
  })

  it('rejects when the student already has a class in that slot', async () => {
    vi.mocked(db.classBooking.findFirst).mockResolvedValue({ id: 'clash' } as never)

    const result = await createTrialClass(baseInput)

    expect(result).toEqual({
      success: false,
      error: 'El estudiante ya tiene una clase en ese horario',
    })
    expect(db.classBooking.create).not.toHaveBeenCalled()
  })

  it('returns an error when the student does not exist', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null as never)

    const result = await createTrialClass(baseInput)

    expect(result).toEqual({ success: false, error: 'Estudiante no encontrado' })
    expect(db.classBooking.create).not.toHaveBeenCalled()
  })
})
