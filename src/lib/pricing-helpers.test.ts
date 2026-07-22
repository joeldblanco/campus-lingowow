import { describe, it, expect } from 'vitest'
import {
  isAnnualPlan,
  hasBillingToggle,
  filterByBillingView,
  billingViewLabel,
  billingPeriodSuffix,
  hasRecommendedPlan,
  getRecommendedPlanId,
  annualFromMonthly,
  annualSavingsPercent,
  clampClassesPerWeek,
  monthlyClassCount,
  pricingRedirectPath,
  DEFAULT_BILLING_VIEW,
  type PlanLike,
} from './pricing-helpers'

const plan = (over: Partial<PlanLike> & { id: string }): PlanLike => ({ ...over })

describe('class quantity helpers', () => {
  it('defaults the billing switch to annual', () => {
    expect(DEFAULT_BILLING_VIEW).toBe('annual')
  })

  it('calculates four academic weeks of classes per month for allowed quantities (2 to 4)', () => {
    expect(monthlyClassCount(2)).toBe(8)
    expect(monthlyClassCount(3)).toBe(12)
    expect(monthlyClassCount(4)).toBe(16)
  })

  it('keeps the weekly class selector between 2 and 4', () => {
    expect(clampClassesPerWeek(1)).toBe(2)
    expect(clampClassesPerWeek(3.6)).toBe(4)
    expect(clampClassesPerWeek(8)).toBe(4)
  })

  it('redirects pricing to shop when productId is missing', () => {
    expect(pricingRedirectPath(null)).toBe('/shop')
    expect(pricingRedirectPath('product-1')).toBeNull()
  })
})

describe('isAnnualPlan', () => {
  it('is true only for ANNUAL billingCycle (case-insensitive)', () => {
    expect(isAnnualPlan(plan({ id: 'a', billingCycle: 'ANNUAL' }))).toBe(true)
    expect(isAnnualPlan(plan({ id: 'a', billingCycle: 'annual' }))).toBe(true)
  })

  it('treats MONTHLY/WEEKLY/QUARTERLY/null as non-annual', () => {
    expect(isAnnualPlan(plan({ id: 'a', billingCycle: 'MONTHLY' }))).toBe(false)
    expect(isAnnualPlan(plan({ id: 'a', billingCycle: 'QUARTERLY' }))).toBe(false)
    expect(isAnnualPlan(plan({ id: 'a', billingCycle: null }))).toBe(false)
    expect(isAnnualPlan(plan({ id: 'a' }))).toBe(false)
  })
})

describe('hasBillingToggle', () => {
  it('is true only when both an annual and a non-annual plan exist', () => {
    expect(
      hasBillingToggle([
        plan({ id: 'm', billingCycle: 'MONTHLY' }),
        plan({ id: 'y', billingCycle: 'ANNUAL' }),
      ])
    ).toBe(true)
  })

  it('is false when every plan is monthly (no fabricated annual option)', () => {
    expect(
      hasBillingToggle([
        plan({ id: 'm', billingCycle: 'MONTHLY' }),
        plan({ id: 'n', billingCycle: null }),
      ])
    ).toBe(false)
  })

  it('is false when only annual plans exist', () => {
    expect(hasBillingToggle([plan({ id: 'y', billingCycle: 'ANNUAL' })])).toBe(false)
  })

  it('is false for an empty catalogue', () => {
    expect(hasBillingToggle([])).toBe(false)
  })
})

describe('filterByBillingView', () => {
  const plans = [
    plan({ id: 'm', billingCycle: 'MONTHLY' }),
    plan({ id: 'n', billingCycle: null }),
    plan({ id: 'y', billingCycle: 'ANNUAL' }),
  ]

  it('monthly view excludes annual plans', () => {
    expect(filterByBillingView(plans, 'monthly').map((p) => p.id)).toEqual(['m', 'n'])
  })

  it('annual view keeps only annual plans', () => {
    expect(filterByBillingView(plans, 'annual').map((p) => p.id)).toEqual(['y'])
  })
})

describe('billingViewLabel', () => {
  it('labels each view in Spanish', () => {
    expect(billingViewLabel('monthly')).toBe('Mensual')
    expect(billingViewLabel('annual')).toBe('Anual')
  })
})

describe('billingPeriodSuffix', () => {
  it('maps each cycle to its suffix and defaults to /mes', () => {
    expect(billingPeriodSuffix('ANNUAL')).toBe('/año')
    expect(billingPeriodSuffix('QUARTERLY')).toBe('/trimestre')
    expect(billingPeriodSuffix('WEEKLY')).toBe('/semana')
    expect(billingPeriodSuffix('MONTHLY')).toBe('/mes')
    expect(billingPeriodSuffix(null)).toBe('/mes')
    expect(billingPeriodSuffix(undefined)).toBe('/mes')
  })
})

describe('hasRecommendedPlan', () => {
  it('detects an explicit recommended flag', () => {
    expect(hasRecommendedPlan([plan({ id: 'a', isPopular: true })])).toBe(true)
    expect(hasRecommendedPlan([plan({ id: 'a', isPopular: false })])).toBe(false)
    expect(hasRecommendedPlan([])).toBe(false)
  })
})

describe('getRecommendedPlanId', () => {
  it('prefers the explicitly flagged plan', () => {
    const id = getRecommendedPlanId([
      plan({ id: 'a' }),
      plan({ id: 'b', isPopular: true }),
      plan({ id: 'c' }),
    ])
    expect(id).toBe('b')
  })

  it('returns exactly one id, falling back to the middle tier when no flag set', () => {
    expect(getRecommendedPlanId([plan({ id: 'a' }), plan({ id: 'b' }), plan({ id: 'c' })])).toBe('b')
    // two-tier catalogue: middle index rounds down to the first tier
    expect(getRecommendedPlanId([plan({ id: 'a' }), plan({ id: 'b' })])).toBe('a')
    expect(getRecommendedPlanId([plan({ id: 'solo' })])).toBe('solo')
  })

  it('returns null only for an empty catalogue', () => {
    expect(getRecommendedPlanId([])).toBeNull()
  })
})

describe('annualFromMonthly', () => {
  it('charges monthsCharged and compares against the full 12 months', () => {
    expect(annualFromMonthly(20, 10)).toEqual({ price: 200, comparePrice: 240 })
  })

  it('rounds to 2 decimals', () => {
    expect(annualFromMonthly(19.99, 10)).toEqual({ price: 199.9, comparePrice: 239.88 })
  })

  it('produces a comparePrice strictly above price for any discount (real strikethrough)', () => {
    const { price, comparePrice } = annualFromMonthly(33.33, 10)
    expect(comparePrice).toBeGreaterThan(price)
  })

  it('makes no saving when monthsCharged is 12', () => {
    expect(annualFromMonthly(15, 12)).toEqual({ price: 180, comparePrice: 180 })
  })
})

describe('annualSavingsPercent', () => {
  type Priced = PlanLike & { price: number }
  const priced = (o: Partial<PlanLike> & { id: string; price: number }): Priced => ({ ...o })
  const priceOf = (p: Priced) => p.price

  it('returns annual-per-month saving vs the matching monthly tier', () => {
    const plans = [
      priced({ id: 'm2', billingCycle: 'MONTHLY', classesPerWeek: 2, price: 160 }),
      priced({ id: 'y2', billingCycle: 'ANNUAL', classesPerWeek: 2, price: 1600 }),
    ]
    // 1600/12 = 133.33 vs 160 => ~17%
    expect(annualSavingsPercent(plans, priceOf)).toBe(17)
  })

  it('takes the max across tiers and ignores annual plans without a monthly match', () => {
    const plans = [
      priced({ id: 'm2', billingCycle: 'MONTHLY', classesPerWeek: 2, price: 100 }),
      priced({ id: 'y2', billingCycle: 'ANNUAL', classesPerWeek: 2, price: 1080 }), // 90/mo => 10%
      priced({ id: 'm3', billingCycle: 'MONTHLY', classesPerWeek: 3, price: 100 }),
      priced({ id: 'y3', billingCycle: 'ANNUAL', classesPerWeek: 3, price: 960 }), // 80/mo => 20%
      priced({ id: 'y9', billingCycle: 'ANNUAL', classesPerWeek: 9, price: 500 }), // no monthly match
    ]
    expect(annualSavingsPercent(plans, priceOf)).toBe(20)
  })

  it('returns null when there is no annual/monthly pair', () => {
    expect(
      annualSavingsPercent(
        [priced({ id: 'm', billingCycle: 'MONTHLY', classesPerWeek: 2, price: 160 })],
        priceOf
      )
    ).toBeNull()
  })
})
