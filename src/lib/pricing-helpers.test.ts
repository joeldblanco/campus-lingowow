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
  type PlanLike,
} from './pricing-helpers'

const plan = (over: Partial<PlanLike> & { id: string }): PlanLike => ({ ...over })

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
