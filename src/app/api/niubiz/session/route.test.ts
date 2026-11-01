import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  db: {
    invoice: {
      findFirst: vi.fn(),
    },
    pendingOrder: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  auth: vi.fn(),
  getNiubizAccessToken: vi.fn(),
  createNiubizSession: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: mocks.db }))
vi.mock('@/lib/niubiz', () => ({
  getNiubizAccessToken: mocks.getNiubizAccessToken,
  createNiubizSession: mocks.createNiubizSession,
}))

import { POST } from './route'

const customerInfo = {
  email: 'student@example.com',
  firstName: 'Student',
  address: 'Main Street',
  city: 'Lima',
  country: 'PE',
  zipCode: '15000',
}

const invoiceData = {
  items: [{ productId: 'product-1', planId: 'plan-1', name: 'English classes', price: 100 }],
  subtotal: 100,
  discount: 0,
  tax: 0,
  total: 100,
  currency: 'USD',
}

function registeredInvoiceData(overrides: Record<string, unknown> = {}) {
  return { ...invoiceData, customerInfo: { ...customerInfo, ...overrides } }
}

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/niubiz/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      amount: 100,
      allowGuest: false,
      purchaseNumber: 'order-1',
      invoiceData,
      customerInfo,
      ...overrides,
    }),
  })
}

function pendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pending-1',
    purchaseNumber: 'order-1',
    userId: 'student-1',
    customerEmail: customerInfo.email,
    customerName: customerInfo.firstName,
    amount: 100,
    currency: 'USD',
    invoiceData: registeredInvoiceData(),
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    ...overrides,
  }
}

describe('POST /api/niubiz/session durable order preparation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'student-1' } })
    mocks.db.invoice.findFirst.mockResolvedValue(null)
    mocks.db.pendingOrder.findUnique.mockResolvedValue(null)
    mocks.db.pendingOrder.create.mockImplementation(async ({ data }) => ({
      ...pendingOrder(),
      ...data,
    }))
    mocks.getNiubizAccessToken.mockResolvedValue('access-token')
    mocks.createNiubizSession.mockResolvedValue({
      sessionKey: 'session-key',
      merchantId: 'merchant-id',
    })
  })

  it('persists a PENDING order before offering a provider session', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      sessionKey: 'session-key',
      merchantId: 'merchant-id',
    })
    expect(mocks.db.pendingOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purchaseNumber: 'order-1',
        userId: 'student-1',
        amount: 100,
        currency: 'USD',
        status: 'PENDING',
      }),
    })
    expect(mocks.db.pendingOrder.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getNiubizAccessToken.mock.invocationCallOrder[0]
    )
  })

  it('rejects a nonnumeric amount before persisting or contacting the provider', async () => {
    const response = await POST(request({ amount: '100junk' }))

    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Amount is required')
    expect(mocks.db.pendingOrder.create).not.toHaveBeenCalled()
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
  })

  it('keeps an existing PENDING order and allows a matching session retry', async () => {
    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder())

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.db.pendingOrder.create).not.toHaveBeenCalled()
    expect(mocks.getNiubizAccessToken).toHaveBeenCalledTimes(1)
    expect(mocks.createNiubizSession).toHaveBeenCalledTimes(1)
  })

  it('rejects a matching-amount session retry when fulfillment data changes', async () => {
    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder())

    const response = await POST(
      request({
        invoiceData: {
          ...invoiceData,
          items: [
            {
              ...invoiceData.items[0],
              selectedSchedule: [
                { teacherId: 'teacher-2', dayOfWeek: 2, startTime: '16:00', endTime: '17:00' },
              ],
            },
          ],
        },
      })
    )

    expect(response.status).toBe(409)
    expect(await response.text()).toBe('Payment request does not match the pending order')
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
    expect(mocks.createNiubizSession).not.toHaveBeenCalled()
  })

  it('does not offer another provider session for an existing invoice', async () => {
    mocks.db.invoice.findFirst.mockResolvedValueOnce({ id: 'invoice-1' })

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(await response.text()).toBe('Payment request is already being processed')
    expect(mocks.db.pendingOrder.findUnique).not.toHaveBeenCalled()
    expect(mocks.db.pendingOrder.create).not.toHaveBeenCalled()
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
  })

  it.each(['COMPLETED', 'EXPIRED', 'CANCELLED'])(
    'does not replace a %s order or offer another provider session',
    async (status) => {
      mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder({ status }))

      const response = await POST(request())

      expect(response.status).toBe(409)
      expect(await response.text()).toBe('Payment request is already being processed')
      expect(mocks.db.pendingOrder.create).not.toHaveBeenCalled()
      expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
      expect(mocks.createNiubizSession).not.toHaveBeenCalled()
    }
  )

  it('rejects an expired PENDING order before offering a provider session', async () => {
    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(
      pendingOrder({ expiresAt: new Date(Date.now() - 1_000) })
    )

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(await response.text()).toBe('Payment request is already being processed')
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
  })

  it('rejects amount, currency, and user mismatches without replacing the order', async () => {
    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder())

    const changedAmount = await POST(request({ amount: 99 }))
    expect(changedAmount.status).toBe(400)

    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder())
    const changedCurrency = await POST(
      request({ invoiceData: { ...invoiceData, currency: 'PEN' } })
    )
    expect(changedCurrency.status).toBe(409)

    mocks.db.pendingOrder.findUnique.mockResolvedValueOnce(pendingOrder())
    mocks.auth.mockResolvedValueOnce({ user: { id: 'other-user' } })
    const changedUser = await POST(request())
    expect(changedUser.status).toBe(409)

    expect(mocks.db.pendingOrder.create).not.toHaveBeenCalled()
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
  })

  it('fails closed when order persistence fails before contacting the provider', async () => {
    mocks.db.pendingOrder.create.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mocks.getNiubizAccessToken).not.toHaveBeenCalled()
    expect(mocks.createNiubizSession).not.toHaveBeenCalled()
  })

  it('binds a concurrent create race to the existing order without overwriting it', async () => {
    mocks.db.pendingOrder.create.mockRejectedValueOnce({ code: 'P2002' })
    mocks.db.pendingOrder.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingOrder())

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.db.pendingOrder.create).toHaveBeenCalledTimes(1)
    expect(mocks.getNiubizAccessToken).toHaveBeenCalledTimes(1)
  })

  it('does not offer a session after the provider tool fails, leaving the PENDING order durable', async () => {
    mocks.getNiubizAccessToken.mockRejectedValueOnce(new Error('provider unavailable'))

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mocks.db.pendingOrder.create).toHaveBeenCalledTimes(1)
    expect(mocks.createNiubizSession).not.toHaveBeenCalled()
  })
})
