import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/class-booking-auto-completion', () => ({
  syncAutoCompletedClassBookings: vi.fn(),
}))

import { syncAutoCompletedClassBookings } from '@/lib/class-booking-auto-completion'
import { GET } from './route'

function buildRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/complete-classes', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/cron/complete-classes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejects requests without the cron secret', async () => {
    const response = await GET(buildRequest())

    expect(response.status).toBe(401)
    expect(syncAutoCompletedClassBookings).not.toHaveBeenCalled()
  })

  it('completes only bookings eligible under the shared completion rule', async () => {
    vi.mocked(syncAutoCompletedClassBookings).mockResolvedValue(['booking-1', 'booking-2'])

    const response = await GET(buildRequest('Bearer test-secret'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      completedCount: 2,
    })
    expect(syncAutoCompletedClassBookings).toHaveBeenCalledWith()
  })

  it('returns 500 when class completion cannot be processed', async () => {
    vi.mocked(syncAutoCompletedClassBookings).mockRejectedValue(new Error('Database unavailable'))

    const response = await GET(buildRequest('Bearer test-secret'))

    expect(response.status).toBe(500)
  })
})
