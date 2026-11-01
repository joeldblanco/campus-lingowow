import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Booking = {
  id: string
  studentId: string
  teacherId: string
  enrollmentId: string
  day: string
  timeSlot: string
  status: string
}

type TransactionClient = {
  classBooking: {
    findUnique: (args: {
      where: { teacherId_day_timeSlot: { teacherId: string; day: string; timeSlot: string } }
    }) => Promise<Booking | null>
    create: (args: { data: Omit<Booking, 'id'> }) => Promise<Booking>
  }
  enrollment: {
    update: (args: {
      where: { id: string }
      data: { classesTotal: { increment: number } }
    }) => Promise<{ classesTotal: number }>
  }
}

type State = { bookings: Booking[]; classesTotal: number }

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  enrollmentFindUnique: vi.fn(),
  classBookingFindUnique: vi.fn(),
  classBookingCreate: vi.fn(),
  enrollmentUpdate: vi.fn(),
  transaction: vi.fn(),
  convertTimeSlotToUTC: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => ({ authenticateRequest: mocks.authenticate }))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transaction,
    enrollment: {
      findUnique: mocks.enrollmentFindUnique,
      update: mocks.enrollmentUpdate,
    },
    classBooking: {
      findUnique: mocks.classBookingFindUnique,
      create: mocks.classBookingCreate,
    },
  },
}))
vi.mock('@/lib/utils/date', () => ({ convertTimeSlotToUTC: mocks.convertTimeSlotToUTC }))

import { POST } from './route'

const enrollment = {
  id: 'enrollment-1',
  studentId: 'student-1',
  teacherId: 'teacher-1',
  teacher: { id: 'teacher-1', timezone: 'America/Lima' },
}

function buildRequest(classes: unknown, enrollmentId = enrollment.id) {
  return new NextRequest('http://localhost/api/bot/classes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId, classes }),
  })
}

function installTransactionalHarness(
  state: State,
  options: { failCreateAt?: number; failOnEnrollmentUpdate?: boolean } = {}
) {
  let createCalls = 0
  mocks.transaction.mockImplementation(
    async (callback: (tx: TransactionClient) => Promise<unknown>) => {
      const staged = {
        bookings: state.bookings.map((booking) => ({ ...booking })),
        classesTotal: state.classesTotal,
      }
      const tx: TransactionClient = {
        classBooking: {
          findUnique: async ({ where }) =>
            staged.bookings.find(
              (booking) =>
                booking.teacherId === where.teacherId_day_timeSlot.teacherId &&
                booking.day === where.teacherId_day_timeSlot.day &&
                booking.timeSlot === where.teacherId_day_timeSlot.timeSlot
            ) ?? null,
          create: async ({ data }) => {
            createCalls++
            if (createCalls === options.failCreateAt) throw new Error('class booking insert failed')
            const booking = { id: `booking-${createCalls}`, ...data }
            staged.bookings.push(booking)
            return booking
          },
        },
        enrollment: {
          update: async ({ data }) => {
            if (options.failOnEnrollmentUpdate) throw new Error('enrollment update failed')
            staged.classesTotal += data.classesTotal.increment
            return { classesTotal: staged.classesTotal }
          },
        },
      }

      const result = await callback(tx)
      state.bookings = staged.bookings
      state.classesTotal = staged.classesTotal
      return result
    }
  )
}

describe('POST /api/bot/classes batch atomicity', () => {
  let state: State

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockReset()
    state = { bookings: [], classesTotal: 8 }
    mocks.authenticate.mockResolvedValue({ success: true })
    mocks.enrollmentFindUnique.mockResolvedValue(enrollment)
    mocks.convertTimeSlotToUTC.mockImplementation((day: string, timeSlot: string) => ({ day, timeSlot }))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('commits created bookings and classesTotal together while keeping occupied slots skipped', async () => {
    state.bookings.push({
      id: 'existing',
      studentId: 'student-2',
      teacherId: enrollment.teacherId,
      enrollmentId: 'other-enrollment',
      day: '2026-11-03',
      timeSlot: '10:00-10:40',
      status: 'CONFIRMED',
    })
    installTransactionalHarness(state)

    const response = await POST(
      buildRequest([
        { date: '2026-11-03', startTime: '10:00', endTime: '10:40' },
        { date: '2026-11-04', startTime: '11:00', endTime: '11:40' },
      ])
    )

    expect(response.status).toBe(201)
    expect(state.bookings).toHaveLength(2)
    expect(state.classesTotal).toBe(9)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { classesCreated: 1, classesSkipped: 1 },
    })
  })

  it('rolls back earlier inserts when a later insert fails', async () => {
    installTransactionalHarness(state, { failCreateAt: 2 })

    const response = await POST(
      buildRequest([
        { date: '2026-11-03', startTime: '10:00', endTime: '10:40' },
        { date: '2026-11-04', startTime: '11:00', endTime: '11:40' },
      ])
    )

    expect(response.status).toBe(500)
    expect(state.bookings).toEqual([])
    expect(state.classesTotal).toBe(8)
  })

  it('rolls back inserts when classesTotal cannot be updated', async () => {
    installTransactionalHarness(state, { failOnEnrollmentUpdate: true })

    const response = await POST(
      buildRequest([{ date: '2026-11-03', startTime: '10:00', endTime: '10:40' }])
    )

    expect(response.status).toBe(500)
    expect(state.bookings).toEqual([])
    expect(state.classesTotal).toBe(8)
  })

  it('does not write when authentication fails', async () => {
    mocks.authenticate.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 })
    installTransactionalHarness(state)

    const response = await POST(
      buildRequest([{ date: '2026-11-03', startTime: '10:00', endTime: '10:40' }])
    )

    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.enrollmentFindUnique).not.toHaveBeenCalled()
    expect(state.bookings).toEqual([])
    expect(state.classesTotal).toBe(8)
  })

  it('does not write when request validation fails', async () => {
    installTransactionalHarness(state)

    const response = await POST(buildRequest([]))

    expect(response.status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.enrollmentFindUnique).not.toHaveBeenCalled()
    expect(state.bookings).toEqual([])
    expect(state.classesTotal).toBe(8)
  })
})
