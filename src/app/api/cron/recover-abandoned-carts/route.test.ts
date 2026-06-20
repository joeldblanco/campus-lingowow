import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the data layer and the mailer so the cron's selection + send + dedupe
// logic can be exercised without a DB or Resend.
vi.mock('@/lib/db', () => ({
  db: {
    abandonedCart: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    newsletterSubscription: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/mail', () => ({
  sendCartRecoveryEmail: vi.fn(),
}))

import { db } from '@/lib/db'
import { sendCartRecoveryEmail } from '@/lib/mail'
import { GET } from './route'

function buildRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/recover-abandoned-carts', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

const validItems = [
  {
    product: { id: 'prod-1', title: 'Curso de Inglés', image: null },
    plan: { id: 'plan-1', name: 'Plan Mensual', price: 50 },
    quantity: 1,
    language: 'en',
  },
]

function buildCart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    email: 'shopper@example.com',
    userId: null,
    items: validItems,
    total: 50,
    currency: 'USD',
    recoveryToken: 'tok-123',
    status: 'PENDING',
    recoveryEmailSentAt: null,
    ...overrides,
  }
}

describe('GET /api/cron/recover-abandoned-carts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    vi.mocked(db.abandonedCart.findMany).mockResolvedValue([] as never)
    vi.mocked(db.abandonedCart.update).mockResolvedValue({} as never)
    vi.mocked(db.newsletterSubscription.findUnique).mockResolvedValue(null as never)
    vi.mocked(sendCartRecoveryEmail).mockResolvedValue(undefined as never)
  })

  it('returns 401 and never queries when the secret is missing', async () => {
    const res = await GET(buildRequest())
    expect(res.status).toBe(401)
    expect(db.abandonedCart.findMany).not.toHaveBeenCalled()
  })

  it('only selects in-flight, un-emailed, idle carts (dedupe + skip-purchased at the query)', async () => {
    await GET(buildRequest('Bearer test-secret'))

    expect(db.abandonedCart.findMany).toHaveBeenCalledTimes(1)
    const where = vi.mocked(db.abandonedCart.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >
    // status PENDING => PURCHASED/RECOVERED carts are never emailed.
    expect(where.status).toBe('PENDING')
    // recoveryEmailSentAt null => a cart that already got its email is excluded (max 1).
    expect(where.recoveryEmailSentAt).toBeNull()
    // updatedAt lte threshold => only carts idle for the delay window.
    expect(where.updatedAt).toHaveProperty('lte')
    expect((where.updatedAt as { lte: Date }).lte).toBeInstanceOf(Date)
  })

  it('sends exactly one email and marks the cart EMAILED', async () => {
    vi.mocked(db.abandonedCart.findMany).mockResolvedValue([buildCart()] as never)

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(sendCartRecoveryEmail).toHaveBeenCalledTimes(1)
    expect(sendCartRecoveryEmail).toHaveBeenCalledWith(
      'shopper@example.com',
      expect.objectContaining({
        recoveryToken: 'tok-123',
        currency: 'USD',
        total: 50,
        items: [
          expect.objectContaining({ name: 'Curso de Inglés', planName: 'Plan Mensual', price: 50 }),
        ],
      })
    )
    // Marked sent so the next run won't re-send (idempotent / dedupe).
    expect(db.abandonedCart.update).toHaveBeenCalledTimes(1)
    const update = vi.mocked(db.abandonedCart.update).mock.calls[0][0]
    expect(update.where).toEqual({ id: 'cart-1' })
    expect(update.data).toMatchObject({ status: 'EMAILED' })
    expect((update.data as { recoveryEmailSentAt: Date }).recoveryEmailSentAt).toBeInstanceOf(Date)
    expect(body.sentCount).toBe(1)
  })

  it('skips a candidate whose email previously unsubscribed (consent)', async () => {
    vi.mocked(db.abandonedCart.findMany).mockResolvedValue([buildCart()] as never)
    vi.mocked(db.newsletterSubscription.findUnique).mockResolvedValue({
      isSubscribed: false,
    } as never)

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(sendCartRecoveryEmail).not.toHaveBeenCalled()
    expect(db.abandonedCart.update).not.toHaveBeenCalled()
    expect(body.sentCount).toBe(0)
    expect(body.skippedCount).toBe(1)
  })
})
