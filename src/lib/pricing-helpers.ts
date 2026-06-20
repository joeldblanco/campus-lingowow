/**
 * Pure helpers for the public pricing + shop surfaces.
 *
 * These keep the CRO logic (recommended-tier anchoring, monthly/annual billing
 * toggle, period suffixes) out of the React components so it can be unit-tested
 * and reused. Everything here is data-driven from the real Plan rows — we never
 * synthesize prices or invent an annual plan that does not exist in the DB.
 */

/** Minimal shape we need from a Plan for these helpers. */
export interface PlanLike {
  id: string
  isPopular?: boolean | null
  billingCycle?: string | null
  sortOrder?: number | null
}

/** Billing views the toggle can offer. */
export type BillingView = 'monthly' | 'annual'

/**
 * A plan is "annual" when its real billingCycle says so. Everything else
 * (MONTHLY, WEEKLY, QUARTERLY, or null) is treated as the non-annual bucket so
 * the default monthly view never hides a plan.
 */
export function isAnnualPlan(plan: PlanLike): boolean {
  return (plan.billingCycle ?? '').toUpperCase() === 'ANNUAL'
}

/**
 * Only show the monthly/annual toggle when the catalogue genuinely contains
 * BOTH an annual plan and a non-annual plan. Otherwise there is nothing to
 * toggle between and we keep the page honest by not rendering a dead control.
 */
export function hasBillingToggle(plans: PlanLike[]): boolean {
  const annual = plans.some(isAnnualPlan)
  const nonAnnual = plans.some((p) => !isAnnualPlan(p))
  return annual && nonAnnual
}

/** Filter plans down to the selected billing view (preserves the element type). */
export function filterByBillingView<T extends PlanLike>(plans: T[], view: BillingView): T[] {
  return plans.filter((p) => (view === 'annual' ? isAnnualPlan(p) : !isAnnualPlan(p)))
}

/** Human label for a billing view (Spanish UI). */
export function billingViewLabel(view: BillingView): string {
  return view === 'annual' ? 'Anual' : 'Mensual'
}

/**
 * Price suffix shown after the amount, derived from the plan's real cycle.
 * Falls back to "/mes" because the default catalogue is monthly.
 */
export function billingPeriodSuffix(billingCycle?: string | null): string {
  switch ((billingCycle ?? '').toUpperCase()) {
    case 'ANNUAL':
      return '/año'
    case 'QUARTERLY':
      return '/trimestre'
    case 'WEEKLY':
      return '/semana'
    case 'MONTHLY':
    default:
      return '/mes'
  }
}

/** Whether a set of plans contains at least one explicitly recommended plan. */
export function hasRecommendedPlan(plans: PlanLike[]): boolean {
  return plans.some((p) => p.isPopular === true)
}

/**
 * Derive a real annual price from a monthly price.
 *
 * `monthsCharged` is the operator's chosen commitment (e.g. 10 = "pay 10, get
 * 12" = 2 months free). The returned `price` is what the customer actually pays
 * for the year; `comparePrice` is the full 12× monthly so the saving renders as
 * a genuine strikethrough. Both are real values stored on the annual Plan row —
 * nothing is faked at render time.
 */
export function annualFromMonthly(
  monthlyPrice: number,
  monthsCharged: number
): { price: number; comparePrice: number } {
  const round2 = (n: number) => Math.round(n * 100) / 100
  return {
    price: round2(monthlyPrice * monthsCharged),
    comparePrice: round2(monthlyPrice * 12),
  }
}

/**
 * Anchor-hero-decoy: exactly ONE tier must read as recommended.
 *
 * Priority:
 *  1. The plan an admin explicitly flagged `isPopular` (first by input order).
 *  2. Fallback — the middle tier, so a recommended badge always renders even
 *     when no flag is set in the DB.
 * Returns null only when there are no plans at all.
 */
export function getRecommendedPlanId<T extends PlanLike>(plans: T[]): string | null {
  if (plans.length === 0) return null
  const flagged = plans.find((p) => p.isPopular === true)
  if (flagged) return flagged.id
  const middleIndex = Math.floor((plans.length - 1) / 2)
  return plans[middleIndex].id
}
