import { beforeEach, describe, expect, it, vi } from 'vitest'

// The route reaches Niubiz + the DB only after the auth guard passes; mock both
// so the guard can be exercised in isolation (mirrors livekit/token/route.test.ts).
vi.mock('@/lib/db', () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/niubiz', () => ({
  chargeRecurrentNiubizToken: vi.fn(),
  getNiubizAccessToken: vi.fn(),
}))

import { db } from '@/lib/db'
import { GET } from './route'

function buildRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/process-payments', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/cron/process-payments (auth guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 when the authorization header is missing', async () => {
    const res = await GET(buildRequest())
    expect(res.status).toBe(401)
    // Guard must short-circuit before touching any subscription / charge.
    expect(db.subscription.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token does not match CRON_SECRET', async () => {
    const res = await GET(buildRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(db.subscription.findMany).not.toHaveBeenCalled()
  })

  it('allows a caller presenting the correct CRON_SECRET', async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValue([] as never)
    const res = await GET(buildRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    expect(db.subscription.findMany).toHaveBeenCalledTimes(1)
  })
})
