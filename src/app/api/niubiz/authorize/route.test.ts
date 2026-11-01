import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const state = {
    invoices: [] as Array<Record<string, unknown>>,
    purchases: [] as Array<Record<string, unknown>>,
    schedules: [] as Array<Record<string, unknown>>,
    bookings: [] as Array<Record<string, unknown>>,
  }

  const db = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
    },
    coupon: { update: vi.fn() },
    academicPeriod: { findMany: vi.fn() },
    plan: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    productPurchase: { create: vi.fn(), update: vi.fn() },
    classSchedule: { findUnique: vi.fn(), create: vi.fn() },
    classBooking: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  }

  return {
    state,
    db,
    auth: vi.fn(),
    getNiubizAccessToken: vi.fn(),
    authorizeNiubizTransaction: vi.fn(),
    registerNiubizCard: vi.fn(),
    sendPaymentConfirmationEmail: vi.fn(),
    upsertSelfServiceEnrollment: vi.fn(),
    notifySelfServiceEnrollmentCreated: vi.fn(),
  }
})

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: mocks.db }))
vi.mock('@/lib/niubiz', () => ({
  authorizeNiubizTransaction: mocks.authorizeNiubizTransaction,
  getNiubizAccessToken: mocks.getNiubizAccessToken,
  registerNiubizCard: mocks.registerNiubizCard,
}))
vi.mock('@/lib/mail', () => ({ sendPaymentConfirmationEmail: mocks.sendPaymentConfirmationEmail }))
vi.mock('@/lib/enrollments/self-service-enrollment', () => ({
  upsertSelfServiceEnrollment: mocks.upsertSelfServiceEnrollment,
  notifySelfServiceEnrollmentCreated: mocks.notifySelfServiceEnrollmentCreated,
}))
vi.mock('@/lib/enrollments/self-service-cutoff', () => ({
  DEFAULT_TEACHER_TIMEZONE: 'America/Lima',
  getUtcOccurrenceForDate: vi.fn((date: Date) => new Date(date)),
  isOccurrenceEligibleForSelfService: vi.fn(() => true),
  resolveEligibleEnrollmentWindow: vi.fn((periods: unknown[]) => ({
    period: periods[0],
    enrollmentStart: new Date('2026-11-02T00:00:00.000Z'),
  })),
}))
vi.mock('@/lib/utils/date', () => ({
  convertRecurringScheduleToUTC: vi.fn((dayOfWeek: number, startTime: string, endTime: string) => ({
    dayOfWeek,
    startTime,
    endTime,
  })),
}))

import { POST } from './route'

const invoiceData = {
  items: [
    {
      productId: 'product-1',
      planId: 'plan-1',
      name: 'English classes',
      price: 100,
      quantity: 1,
      selectedSchedule: [
        { teacherId: 'teacher-1', dayOfWeek: 1, startTime: '15:00', endTime: '16:00' },
      ],
    },
  ],
  subtotal: 100,
  tax: 0,
  discount: 0,
  total: 100,
  currency: 'USD',
}

function request() {
  return new NextRequest('http://localhost/api/niubiz/authorize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      transactionToken: 'transaction-token',
      amount: 100,
      orderId: 'order-1',
      invoiceData,
      customerInfo: {
        email: 'student@example.com',
        firstName: 'Student',
        address: 'Main Street',
        city: 'Lima',
        country: 'PE',
        zipCode: '15000',
      },
    }),
  })
}

function resetHarness() {
  for (const values of Object.values(mocks.state)) values.splice(0)
  vi.clearAllMocks()

  mocks.auth.mockResolvedValue({ user: { id: 'student-1' } })
  mocks.getNiubizAccessToken.mockResolvedValue('access-token')
  mocks.authorizeNiubizTransaction.mockResolvedValue({
    dataMap: { ACTION_CODE: '000' },
    header: { ecoreTransactionUUID: 'auth-1' },
  })
  mocks.sendPaymentConfirmationEmail.mockResolvedValue(undefined)
  mocks.notifySelfServiceEnrollmentCreated.mockResolvedValue({ success: true })
  mocks.upsertSelfServiceEnrollment.mockResolvedValue({
    enrollment: { id: 'enrollment-1', course: { title: 'English classes' } },
    wasCreated: true,
  })
  mocks.db.invoice.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const invoice = { id: 'invoice-1', ...data, notes: data.notes }
      mocks.state.invoices.push(invoice)
      return { ...invoice, items: [] }
    }
  )
  mocks.db.coupon.update.mockResolvedValue({})
  mocks.db.academicPeriod.findMany.mockResolvedValue([
    {
      id: 'period-1',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
    },
  ])
  mocks.db.plan.findUnique.mockResolvedValue({
    includesClasses: true,
    courseId: 'course-1',
    classesPerPeriod: 8,
    course: { title: 'English classes' },
    product: null,
  })
  mocks.db.product.findUnique.mockResolvedValue({ courseId: 'course-1' })
  mocks.db.user.findMany.mockResolvedValue([{ id: 'teacher-1', timezone: 'America/Lima' }])
  mocks.db.user.findUnique.mockResolvedValue({
    roles: ['STUDENT'],
    email: 'student@example.com',
    name: 'Student',
    lastName: null,
  })
  mocks.db.user.update.mockResolvedValue({})
  mocks.db.productPurchase.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const purchase = { id: `purchase-${mocks.state.purchases.length + 1}`, ...data }
      mocks.state.purchases.push(purchase)
      return purchase
    }
  )
  mocks.db.productPurchase.update.mockResolvedValue({})
  mocks.db.classSchedule.findUnique.mockResolvedValue(null)
  mocks.db.classSchedule.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      mocks.state.schedules.push(data)
      return { id: `schedule-${mocks.state.schedules.length}`, ...data }
    }
  )
  mocks.db.classBooking.findFirst.mockResolvedValue(null)
  mocks.db.classBooking.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      mocks.state.bookings.push(data)
      return { id: `booking-${mocks.state.bookings.length}`, ...data }
    }
  )
  mocks.db.$executeRaw.mockImplementation(
    async (_query: TemplateStringsArray, ...values: unknown[]) => {
      const marker = values.find(
        (value): value is string =>
          typeof value === 'string' && value.includes('reservation_pending_review:')
      )
      if (marker) {
        const invoice = mocks.state.invoices[0]
        invoice.notes = invoice.notes ? `${invoice.notes}; ${marker}` : marker
      }
      return 1
    }
  )
  mocks.db.$transaction.mockImplementation(
    async (callback: (tx: typeof mocks.db) => Promise<unknown>) => {
      const snapshot = {
        purchases: [...mocks.state.purchases],
        schedules: [...mocks.state.schedules],
        bookings: [...mocks.state.bookings],
      }
      try {
        return await callback(mocks.db)
      } catch (error) {
        mocks.state.purchases.splice(0, mocks.state.purchases.length, ...snapshot.purchases)
        mocks.state.schedules.splice(0, mocks.state.schedules.length, ...snapshot.schedules)
        mocks.state.bookings.splice(0, mocks.state.bookings.length, ...snapshot.bookings)
        throw error
      }
    }
  )
}

describe('POST /api/niubiz/authorize reservation preparation', () => {
  beforeEach(resetHarness)

  it('keeps approved payment and invoice while rolling back scheduling on conflict', async () => {
    mocks.db.classBooking.create.mockRejectedValueOnce(
      Object.assign(new Error('unique conflict'), { code: 'P2002' })
    )

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.authorization.dataMap.ACTION_CODE).toBe('000')
    expect(body.reservation_pending_review).toBe(true)
    expect(body.needsScheduleSetup).toBe(true)
    expect(body.purchases).toEqual([])
    expect(mocks.state.invoices[0].status).toBe('PAID')
    expect(mocks.state.invoices[0].notes).toContain('reservation_pending_review:schedule_conflict')
    expect(mocks.state.purchases).toEqual([])
    expect(mocks.state.schedules).toEqual([])
    expect(mocks.state.bookings).toEqual([])
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.notifySelfServiceEnrollmentCreated).not.toHaveBeenCalled()
  })

  it('commits the local fulfillment and notifies only after a successful transaction', async () => {
    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.reservation_pending_review).toBe(false)
    expect(mocks.state.purchases).toHaveLength(1)
    expect(mocks.state.schedules).toHaveLength(1)
    expect(mocks.state.bookings.length).toBeGreaterThan(0)
    expect(mocks.notifySelfServiceEnrollmentCreated).toHaveBeenCalledWith('enrollment-1')
  })

  it('does not create a local invoice for a declined provider authorization', async () => {
    mocks.authorizeNiubizTransaction.mockResolvedValueOnce({
      dataMap: { ACTION_CODE: '101', ACTION_DESCRIPTION: 'Declined' },
    })

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mocks.db.invoice.create).not.toHaveBeenCalled()
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })

  it('does not create a local invoice when the provider tool fails', async () => {
    mocks.getNiubizAccessToken.mockRejectedValueOnce(new Error('provider unavailable'))

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mocks.db.invoice.create).not.toHaveBeenCalled()
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })
})
