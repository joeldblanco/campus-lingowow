import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    newsletterSubscription: {
      upsert: vi.fn(),
    },
  },
}))

import { captureLead } from './newsletter'

describe('captureLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.newsletterSubscription.upsert).mockResolvedValue({} as never)
  })

  it('stores a valid email as a subscribed lead with its source', async () => {
    const result = await captureLead({ email: 'lead@example.com', source: 'footer' })

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/avisaremos/i)
    expect(db.newsletterSubscription.upsert).toHaveBeenCalledTimes(1)

    const arg = vi.mocked(db.newsletterSubscription.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ email: 'lead@example.com' })
    expect(arg.create).toMatchObject({
      email: 'lead@example.com',
      source: 'footer',
      isSubscribed: true,
    })
    expect(arg.update).toMatchObject({ isSubscribed: true, unsubscribedAt: null })
  })

  it('accepts a lead without a source', async () => {
    const result = await captureLead({ email: 'nosource@example.com' })

    expect(result.success).toBe(true)
    expect(db.newsletterSubscription.upsert).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid email and never touches the database', async () => {
    const result = await captureLead({ email: 'not-an-email' })

    expect(result).toEqual({ success: false, message: 'Email inválido' })
    expect(db.newsletterSubscription.upsert).not.toHaveBeenCalled()
  })

  it('returns a failure message when the database write throws', async () => {
    vi.mocked(db.newsletterSubscription.upsert).mockRejectedValue(new Error('DB down'))

    const result = await captureLead({ email: 'lead@example.com', source: 'footer' })

    expect(result.success).toBe(false)
    expect(result.message).toBe('DB down')
  })
})
