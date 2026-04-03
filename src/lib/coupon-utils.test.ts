import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { getPaidCouponUsageCounts, validateCoupon } from './coupon-utils'

vi.mock('@/lib/db', () => ({
  db: {
    coupon: {
      findUnique: vi.fn(),
    },
    invoice: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

const baseCoupon = {
  id: 'coupon-1',
  code: 'SAVE10',
  name: 'Save 10',
  description: null,
  type: 'PERCENTAGE',
  value: 10,
  minAmount: null,
  maxDiscount: null,
  usageLimit: 2,
  usageCount: 0,
  userLimit: null,
  isActive: true,
  startsAt: null,
  expiresAt: null,
  restrictedToUserId: null,
  restrictedToPlanId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('coupon-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks a coupon when paid invoice usage reaches the limit', async () => {
    vi.mocked(db.coupon.findUnique).mockResolvedValue(baseCoupon as never)
    vi.mocked(db.invoice.count).mockResolvedValue(2)

    const result = await validateCoupon('SAVE10', 'user-1', 'plan-1')

    expect(result).toEqual({
      valid: false,
      error: 'Este cupón ha alcanzado su límite de uso',
    })
  })

  it('builds paid usage counts from grouped invoices', async () => {
    vi.mocked(db.invoice.groupBy).mockResolvedValue(
      [
        { couponId: 'coupon-1', _count: { _all: 3 } },
        { couponId: 'coupon-2', _count: { _all: 1 } },
      ] as never
    )

    const usageCounts = await getPaidCouponUsageCounts(['coupon-1', 'coupon-2'])

    expect(usageCounts).toEqual({
      'coupon-1': 3,
      'coupon-2': 1,
    })
  })
})