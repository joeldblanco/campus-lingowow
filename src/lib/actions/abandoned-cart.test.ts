import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    abandonedCart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    newsletterSubscription: {
      upsert: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { recordAbandonedCart, markCartPurchased } from './abandoned-cart'

const baseInput = {
  email: 'shopper@example.com',
  currency: 'USD',
  items: [
    {
      product: { id: 'prod-1', title: 'Curso de Inglés', image: null },
      plan: { id: 'plan-1', name: 'Plan Mensual', price: 50 },
      quantity: 2,
    },
  ],
}

describe('recordAbandonedCart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.abandonedCart.create).mockResolvedValue({} as never)
    vi.mocked(db.abandonedCart.update).mockResolvedValue({} as never)
  })

  it('rejects an invalid email and never writes', async () => {
    const result = await recordAbandonedCart({ ...baseInput, email: 'not-an-email' })

    expect(result.success).toBe(false)
    expect(db.abandonedCart.findUnique).not.toHaveBeenCalled()
    expect(db.abandonedCart.create).not.toHaveBeenCalled()
  })

  it('creates a PENDING record with a server-computed total for a new email', async () => {
    vi.mocked(db.abandonedCart.findUnique).mockResolvedValue(null as never)

    const result = await recordAbandonedCart(baseInput)

    expect(result.success).toBe(true)
    expect(db.abandonedCart.create).toHaveBeenCalledTimes(1)
    const data = vi.mocked(db.abandonedCart.create).mock.calls[0][0].data as Record<string, unknown>
    expect(data).toMatchObject({ email: 'shopper@example.com', status: 'PENDING' })
    // total = price(50) * quantity(2), recomputed server-side (not trusted from client).
    expect(data.total).toBe(100)
  })

  it('does NOT re-arm an in-flight cart already emailed (dedupe within a cycle)', async () => {
    vi.mocked(db.abandonedCart.findUnique).mockResolvedValue({
      status: 'EMAILED',
      userId: null,
    } as never)

    await recordAbandonedCart(baseInput)

    expect(db.abandonedCart.create).not.toHaveBeenCalled()
    expect(db.abandonedCart.update).toHaveBeenCalledTimes(1)
    const data = vi.mocked(db.abandonedCart.update).mock.calls[0][0].data as Record<string, unknown>
    // Snapshot refreshed, but status / sent-marker left intact => no second email.
    expect(data.status).toBeUndefined()
    expect('recoveryEmailSentAt' in data).toBe(false)
  })

  it('starts a fresh cycle when the previous one already closed (PURCHASED)', async () => {
    vi.mocked(db.abandonedCart.findUnique).mockResolvedValue({
      status: 'PURCHASED',
      userId: null,
    } as never)

    await recordAbandonedCart(baseInput)

    const data = vi.mocked(db.abandonedCart.update).mock.calls[0][0].data as Record<string, unknown>
    expect(data.status).toBe('PENDING')
    expect(data.recoveryEmailSentAt).toBeNull()
  })
})

describe('markCartPurchased', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.abandonedCart.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  it('marks the cart PURCHASED so the cron stops sending', async () => {
    const result = await markCartPurchased('shopper@example.com')

    expect(result.success).toBe(true)
    expect(db.abandonedCart.updateMany).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(db.abandonedCart.updateMany).mock.calls[0][0]
    expect(arg.where).toEqual({ email: 'shopper@example.com' })
    expect(arg.data).toMatchObject({ status: 'PURCHASED' })
  })
})
