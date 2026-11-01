import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const state = {
    invoices: [] as Array<Record<string, unknown>>,
    purchases: [] as Array<Record<string, unknown>>,
    schedules: [] as Array<Record<string, unknown>>,
    bookings: [] as Array<Record<string, unknown>>,
    pendingStatus: 'PENDING',
  }
  const db = {
    pendingOrder: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    invoice: { create: vi.fn(), findFirst: vi.fn() },
    coupon: { update: vi.fn() },
    academicPeriod: { findMany: vi.fn() },
    plan: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    productPurchase: { create: vi.fn(), update: vi.fn() },
    classSchedule: { findUnique: vi.fn(), create: vi.fn() },
    classBooking: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  }
  return {
    state,
    db,
    getNiubizAccessToken: vi.fn(),
    authorizeNiubizTransaction: vi.fn(),
    sendPaymentConfirmationEmail: vi.fn(),
    sendGuestActivationEmail: vi.fn(),
    upsertSelfServiceEnrollment: vi.fn(),
    notifySelfServiceEnrollmentCreated: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({ db: mocks.db }))
vi.mock('@/lib/niubiz', () => ({
  authorizeNiubizTransaction: mocks.authorizeNiubizTransaction,
  getNiubizAccessToken: mocks.getNiubizAccessToken,
}))
vi.mock('@/lib/mail', () => ({ sendPaymentConfirmationEmail: mocks.sendPaymentConfirmationEmail }))
vi.mock('@/lib/guest-activation', () => ({
  sendGuestActivationEmail: mocks.sendGuestActivationEmail,
}))
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

import { GET, POST } from './route'

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
  customerInfo: {
    email: 'student@example.com',
    firstName: 'Student',
    address: 'Main Street',
    city: 'Lima',
    country: 'PE',
    zipCode: '15000',
  },
}

const schedulingInProgressMarker = 'reservation_pending_review:scheduling_in_progress'
const schedulingInProgressPattern = new RegExp(
  `(^|; )${schedulingInProgressMarker}(; |$)`,
  'g'
)

function clearSchedulingInProgressMarker(notes: unknown) {
  if (typeof notes !== 'string') return notes
  return (
    notes.replace(schedulingInProgressPattern, '$1').replace(/; $/g, '').trim() || null
  )
}

function replaceSchedulingInProgressMarker(notes: unknown, marker: string) {
  if (typeof notes !== 'string') return marker
  return notes.replace(schedulingInProgressPattern, `$1${marker}$2`)
}

function request() {
  return new NextRequest('http://localhost/api/niubiz/checkout?purchaseNumber=order-1&amount=100', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactionToken: 'transaction-token' }),
  })
}

function resetHarness() {
  for (const key of ['invoices', 'purchases', 'schedules', 'bookings'] as const) {
    mocks.state[key].splice(0)
  }
  mocks.state.pendingStatus = 'PENDING'
  vi.clearAllMocks()

  mocks.getNiubizAccessToken.mockResolvedValue('access-token')
  mocks.authorizeNiubizTransaction.mockResolvedValue({
    dataMap: { ACTION_CODE: '000' },
    header: { ecoreTransactionUUID: 'auth-1' },
  })
  mocks.sendPaymentConfirmationEmail.mockResolvedValue(undefined)
  mocks.sendGuestActivationEmail.mockResolvedValue(undefined)
  mocks.notifySelfServiceEnrollmentCreated.mockResolvedValue({ success: true })
  mocks.upsertSelfServiceEnrollment.mockResolvedValue({
    enrollment: { id: 'enrollment-1' },
    wasCreated: true,
  })
  mocks.db.pendingOrder.findUnique.mockResolvedValue({
    id: 'pending-1',
    purchaseNumber: 'order-1',
    userId: 'student-1',
    customerEmail: 'student@example.com',
    customerName: 'Student',
    amount: 100,
    status: mocks.state.pendingStatus,
    invoiceData,
  })
  mocks.db.pendingOrder.update.mockResolvedValue({})
  mocks.db.pendingOrder.findUnique.mockImplementation(async () => ({
    id: 'pending-1',
    purchaseNumber: 'order-1',
    userId: 'student-1',
    customerEmail: 'student@example.com',
    customerName: 'Student',
    amount: 100,
    status: mocks.state.pendingStatus,
    invoiceData,
  }))
  mocks.db.pendingOrder.updateMany.mockImplementation(
    async ({ where, data }: { where: { status: string }; data: { status: string } }) => {
      if (mocks.state.pendingStatus !== where.status) return { count: 0 }
      mocks.state.pendingStatus = data.status
      return { count: 1 }
    }
  )
  mocks.db.invoice.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const invoice = { id: 'invoice-1', ...data, notes: data.notes }
      mocks.state.invoices.push(invoice)
      return { ...invoice, items: [] }
    }
  )
  mocks.db.invoice.findFirst.mockImplementation(async () => mocks.state.invoices[0] || null)
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
  mocks.db.$queryRaw.mockImplementation(
    async (_query: TemplateStringsArray, ...values: unknown[]) => {
      const invoice = mocks.state.invoices[0]
      const marker = values.find(
        (value): value is string =>
          typeof value === 'string' &&
          /^reservation_pending_review:(schedule_conflict|scheduling_failed)$/.test(value)
      )
      if (marker) {
        invoice.notes = replaceSchedulingInProgressMarker(invoice.notes, marker)
      } else if (values.includes(schedulingInProgressMarker)) {
        invoice.notes = clearSchedulingInProgressMarker(invoice.notes)
      }
      return [{ id: 'invoice-1', notes: invoice.notes, status: 'PAID' }]
    }
  )
  mocks.db.$transaction.mockImplementation(
    async (callback: (tx: typeof mocks.db) => Promise<unknown>) => {
      const snapshot = {
        purchases: [...mocks.state.purchases],
        schedules: [...mocks.state.schedules],
        bookings: [...mocks.state.bookings],
        invoiceNotes: mocks.state.invoices.map((invoice) => invoice.notes),
      }
      try {
        return await callback(mocks.db)
      } catch (error) {
        mocks.state.purchases.splice(0, mocks.state.purchases.length, ...snapshot.purchases)
        mocks.state.schedules.splice(0, mocks.state.schedules.length, ...snapshot.schedules)
        mocks.state.bookings.splice(0, mocks.state.bookings.length, ...snapshot.bookings)
        mocks.state.invoices.forEach((invoice, index) => {
          invoice.notes = snapshot.invoiceNotes[index]
        })
        throw error
      }
    }
  )
}

describe('POST /api/niubiz/checkout reservation preparation', () => {
  beforeEach(resetHarness)

  it('redirects as paid with review state and rolls back schedule fulfillment on conflict', async () => {
    mocks.db.classBooking.create.mockRejectedValueOnce(
      Object.assign(new Error('unique conflict'), { code: 'P2002' })
    )

    const response = await POST(request())
    const location = response.headers.get('location') || ''

    expect(response.status).toBe(307)
    expect(location).toContain('success=true')
    expect(location).toContain('reservation_pending_review=true')
    expect(mocks.state.invoices[0].status).toBe('PAID')
    expect(mocks.state.invoices[0].notes).toContain('reservation_pending_review:schedule_conflict')
    expect(mocks.state.invoices[0].notes).not.toContain(
      'reservation_pending_review:scheduling_in_progress'
    )
    expect(mocks.state.purchases).toEqual([])
    expect(mocks.state.schedules).toEqual([])
    expect(mocks.state.bookings).toEqual([])
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.notifySelfServiceEnrollmentCreated).not.toHaveBeenCalled()
    expect(mocks.db.pendingOrder.update).not.toHaveBeenCalled()
  })

  it('commits and completes the pending order after successful local fulfillment', async () => {
    const response = await POST(request())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).not.toContain('reservation_pending_review')
    expect(mocks.state.invoices[0].notes).not.toContain(
      'reservation_pending_review:scheduling_in_progress'
    )
    expect(mocks.state.purchases).toHaveLength(1)
    expect(mocks.state.schedules).toHaveLength(1)
    expect(mocks.state.bookings.length).toBeGreaterThan(0)
    expect(mocks.db.pendingOrder.update).toHaveBeenCalledWith({
      where: { purchaseNumber: 'order-1' },
      data: { status: 'COMPLETED' },
    })
    expect(mocks.notifySelfServiceEnrollmentCreated).toHaveBeenCalledWith('enrollment-1')
  })

  it('keeps an in-flight fulfillment pending for replay and clears it only after commit', async () => {
    let releaseTransaction!: () => void
    let transactionEntered!: () => void
    const transactionReleased = new Promise<void>((resolve) => {
      releaseTransaction = resolve
    })
    const transactionStarted = new Promise<void>((resolve) => {
      transactionEntered = resolve
    })

    mocks.db.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof mocks.db) => Promise<unknown>) => {
        transactionEntered()
        await transactionReleased
        return callback(mocks.db)
      }
    )

    const firstResponsePromise = POST(request())
    await transactionStarted

    expect(mocks.state.invoices[0].notes).toContain(
      'reservation_pending_review:scheduling_in_progress'
    )

    const replayWhileInFlight = await POST(request())
    const replayLocation = new URL(replayWhileInFlight.headers.get('location') || '')
    expect(replayLocation.searchParams.get('reservation_pending_review')).toBe('true')
    expect(replayLocation.searchParams.get('orderNumber')).toBe(
      mocks.state.invoices[0].invoiceNumber
    )
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)

    releaseTransaction()
    const firstResponse = await firstResponsePromise

    expect(firstResponse.headers.get('location')).not.toContain('reservation_pending_review')
    expect(mocks.state.invoices[0].notes).not.toContain(
      'reservation_pending_review:scheduling_in_progress'
    )

    const readyReplay = await POST(request())
    const readyLocation = new URL(readyReplay.headers.get('location') || '')
    expect(readyLocation.searchParams.get('orderNumber')).toBe(
      mocks.state.invoices[0].invoiceNumber
    )
    expect(readyLocation.searchParams.get('reservation_pending_review')).toBeNull()
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
  })

  it('keeps in-flight replay pending and persists classified failure after rollback', async () => {
    let releaseTransaction!: () => void
    let transactionEntered!: () => void
    const transactionReleased = new Promise<void>((resolve) => {
      releaseTransaction = resolve
    })
    const transactionStarted = new Promise<void>((resolve) => {
      transactionEntered = resolve
    })

    mocks.db.classBooking.create.mockRejectedValueOnce(
      Object.assign(new Error('unique conflict'), { code: 'P2002' })
    )
    mocks.db.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof mocks.db) => Promise<unknown>) => {
        const snapshot = {
          purchases: [...mocks.state.purchases],
          schedules: [...mocks.state.schedules],
          bookings: [...mocks.state.bookings],
          invoiceNotes: mocks.state.invoices.map((invoice) => invoice.notes),
        }
        transactionEntered()
        await transactionReleased
        try {
          return await callback(mocks.db)
        } catch (error) {
          mocks.state.purchases.splice(0, mocks.state.purchases.length, ...snapshot.purchases)
          mocks.state.schedules.splice(0, mocks.state.schedules.length, ...snapshot.schedules)
          mocks.state.bookings.splice(0, mocks.state.bookings.length, ...snapshot.bookings)
          mocks.state.invoices.forEach((invoice, index) => {
            invoice.notes = snapshot.invoiceNotes[index]
          })
          throw error
        }
      }
    )

    const firstResponsePromise = POST(request())
    await transactionStarted

    const replayWhileInFlight = await POST(request())
    const replayLocation = new URL(replayWhileInFlight.headers.get('location') || '')
    expect(replayLocation.searchParams.get('reservation_pending_review')).toBe('true')
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)

    releaseTransaction()
    const firstResponse = await firstResponsePromise
    const firstLocation = new URL(firstResponse.headers.get('location') || '')

    expect(firstLocation.searchParams.get('reservation_pending_review')).toBe('true')
    expect(mocks.state.invoices[0].notes).toContain(
      'reservation_pending_review:schedule_conflict'
    )
    expect(mocks.state.invoices[0].notes).not.toContain(
      'reservation_pending_review:scheduling_in_progress'
    )
    expect(mocks.state.purchases).toEqual([])
    expect(mocks.state.schedules).toEqual([])
    expect(mocks.state.bookings).toEqual([])

    const reviewedReplay = await POST(request())
    const reviewedLocation = new URL(reviewedReplay.headers.get('location') || '')
    expect(reviewedLocation.searchParams.get('reservation_pending_review')).toBe('true')
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
  })

  it('replays a reviewed payment without a second provider authorization', async () => {
    mocks.db.classBooking.create.mockRejectedValueOnce(
      Object.assign(new Error('unique conflict'), { code: 'P2002' })
    )

    const firstResponse = await POST(request())
    expect(firstResponse.headers.get('location')).toContain('reservation_pending_review=true')
    expect(mocks.state.pendingStatus).toBe('COMPLETED')
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)

    const secondResponse = await POST(request())

    expect(secondResponse.status).toBe(307)
    const secondLocation = new URL(secondResponse.headers.get('location') || '')
    expect(secondLocation.searchParams.get('orderNumber')).toBe(
      mocks.state.invoices[0].invoiceNumber
    )
    expect(secondLocation.searchParams.get('reservation_pending_review')).toBe('true')
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects a changed amount for a reused order without exposing invoice data', async () => {
    mocks.db.invoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-existing',
      status: 'PAID',
      total: 100,
      niubizTransactionId: 'transaction-token',
      notes: 'private invoice notes',
      items: [{ id: 'private-item' }],
    })

    const response = await POST(
      new NextRequest('http://localhost/api/niubiz/checkout?purchaseNumber=order-1&amount=99', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionToken: 'transaction-token' }),
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=already_processed')
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })

  it('rejects a changed amount before claiming a still-pending order', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/niubiz/checkout?purchaseNumber=order-1&amount=99', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionToken: 'different-token' }),
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=already_processed')
    expect(mocks.db.pendingOrder.updateMany).not.toHaveBeenCalled()
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })

  it('rejects a nonnumeric URL amount before provider authorization', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/niubiz/checkout?purchaseNumber=order-1&amount=100junk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionToken: 'transaction-token' }),
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=invalid_amount')
    expect(mocks.db.pendingOrder.updateMany).not.toHaveBeenCalled()
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })

  it('rejects an expired pending order before provider authorization', async () => {
    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce({
      id: 'pending-1',
      purchaseNumber: 'order-1',
      userId: 'student-1',
      customerEmail: 'student@example.com',
      customerName: 'Student',
      amount: 100,
      status: 'PENDING',
      invoiceData,
      expiresAt: new Date(Date.now() - 1_000),
    })

    const response = await POST(request())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=already_processed')
    expect(mocks.db.pendingOrder.updateMany).not.toHaveBeenCalled()
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })

  it('refuses a concurrent claimant before provider authorization', async () => {
    mocks.db.pendingOrder.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    const [firstResponse, secondResponse] = await Promise.all([POST(request()), POST(request())])

    expect([firstResponse.status, secondResponse.status]).toEqual([307, 307])
    const locations = [firstResponse, secondResponse].map(
      (response) => response.headers.get('location') || ''
    )
    expect(locations.some((location) => location.includes('niubiz_error=already_processed'))).toBe(
      true
    )
    expect(mocks.getNiubizAccessToken).toHaveBeenCalledTimes(1)
    expect(mocks.authorizeNiubizTransaction).toHaveBeenCalledTimes(1)
  })

  it('does not create an invoice when provider authorization is declined', async () => {
    mocks.authorizeNiubizTransaction.mockResolvedValueOnce({
      dataMap: { ACTION_CODE: '101', ACTION_DESCRIPTION: 'Declined' },
    })

    const response = await POST(request())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=auth_failed')
    expect(mocks.db.invoice.create).not.toHaveBeenCalled()
  })

  it('does not create an invoice when the provider tool fails', async () => {
    mocks.getNiubizAccessToken.mockRejectedValueOnce(new Error('provider unavailable'))

    const response = await POST(request())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('niubiz_error=server_error')
    expect(mocks.db.invoice.create).not.toHaveBeenCalled()
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
    expect(mocks.state.pendingStatus).toBe('COMPLETED')

    const replay = await POST(request())
    expect(replay.headers.get('location')).toContain('niubiz_error=already_processed')
    expect(mocks.getNiubizAccessToken).toHaveBeenCalledTimes(1)
  })

  it('routes GET callbacks through the same no-second-authorization guard', async () => {
    mocks.db.invoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-existing',
      invoiceNumber: 'INV-existing',
      status: 'PAID',
      total: 100,
      niubizTransactionId: 'transaction-token',
      notes: 'reviewed; reservation_pending_review:schedule_conflict',
      items: [],
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/niubiz/checkout?purchaseNumber=order-1&amount=100&transactionToken=transaction-token'
      )
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location') || '')
    expect(location.searchParams.get('orderNumber')).toBe('INV-existing')
    expect(location.searchParams.get('reservation_pending_review')).toBe('true')
    expect(mocks.authorizeNiubizTransaction).not.toHaveBeenCalled()
  })
})
