import { describe, expect, it } from 'vitest'
import { verifyPaidAmount } from './verify-paid-amount'

const base = { expectedAmount: 100, expectedCurrency: 'USD' }

describe('verifyPaidAmount', () => {
  it('accepts an exact full payment', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '100.00', resourceAmountCurrency: 'USD', resourceDueValue: '0' })
    ).toEqual({ ok: true })
  })

  it('accepts an overpayment', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '120.00', resourceAmountCurrency: 'USD', resourceDueValue: '0' }).ok
    ).toBe(true)
  })

  it('accepts within the 1-cent float tolerance', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '99.99', resourceAmountCurrency: 'USD', resourceDueValue: '0' }).ok
    ).toBe(true)
  })

  it('rejects an underpayment', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '50.00', resourceAmountCurrency: 'USD', resourceDueValue: '50.00' })
    ).toEqual({ ok: false, reason: 'underpaid' })
  })

  it('rejects a currency mismatch', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '100.00', resourceAmountCurrency: 'PEN', resourceDueValue: '0' })
    ).toEqual({ ok: false, reason: 'currency-mismatch' })
  })

  it('rejects a partially paid invoice (due_amount > 0)', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '100.00', resourceAmountCurrency: 'USD', resourceDueValue: '40.00' })
    ).toEqual({ ok: false, reason: 'not-fully-paid' })
  })

  it('rejects an unparseable amount', () => {
    expect(verifyPaidAmount({ ...base, resourceAmountValue: 'abc' })).toEqual({
      ok: false,
      reason: 'amount-unparseable',
    })
  })

  it('fails SAFE (accepts) when the amount is absent — cannot compare', () => {
    expect(verifyPaidAmount({ ...base, resourceAmountValue: null })).toEqual({
      ok: true,
      reason: 'amount-absent',
    })
    expect(verifyPaidAmount({ ...base, resourceAmountValue: undefined }).ok).toBe(true)
  })

  it('accepts when due_amount is absent but the total covers the bill', () => {
    expect(
      verifyPaidAmount({ ...base, resourceAmountValue: '100.00', resourceAmountCurrency: 'USD' }).ok
    ).toBe(true)
  })
})
