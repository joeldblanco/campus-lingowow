/**
 * Defense-in-depth check for PayPal invoice payments.
 *
 * The webhook is already signature-verified, so the event is authentic. This
 * guard additionally confirms the amount actually paid matches what we billed
 * before granting access — protecting against under-payment, currency
 * mismatches, and partially-paid invoices.
 *
 * Designed to FAIL SAFE for legitimate payments: when the amount is absent from
 * the event it returns ok (PayPal only emits INVOICE.PAID on full payment), so
 * a missing field never blocks a real enrollment. It only rejects when it can
 * positively determine the payment is short, the wrong currency, or not fully
 * paid.
 */
export interface PaidAmountInput {
  /** resource.amount.value from the verified webhook event */
  resourceAmountValue?: string | null
  /** resource.amount.currency_code */
  resourceAmountCurrency?: string | null
  /** resource.due_amount.value (0 when fully paid) */
  resourceDueValue?: string | null
  /** what we billed (PendingOrder.invoiceData.amount) */
  expectedAmount: number
  /** what we billed it in (PendingOrder.currency) */
  expectedCurrency: string
}

export type PaidAmountResult = { ok: true; reason?: string } | { ok: false; reason: string }

// Currency amounts are compared with a 1-cent tolerance to absorb float noise.
const EPSILON = 0.01

export function verifyPaidAmount(input: PaidAmountInput): PaidAmountResult {
  const {
    resourceAmountValue,
    resourceAmountCurrency,
    resourceDueValue,
    expectedAmount,
    expectedCurrency,
  } = input

  if (resourceAmountValue == null || resourceAmountValue === '') {
    // Amount not present in the (already signature-verified) event — cannot
    // compare; accept rather than block a real payment.
    return { ok: true, reason: 'amount-absent' }
  }

  const paid = Number(resourceAmountValue)
  if (!Number.isFinite(paid)) {
    return { ok: false, reason: 'amount-unparseable' }
  }

  if (resourceAmountCurrency && resourceAmountCurrency !== expectedCurrency) {
    return { ok: false, reason: 'currency-mismatch' }
  }

  if (paid + EPSILON < expectedAmount) {
    return { ok: false, reason: 'underpaid' }
  }

  if (resourceDueValue != null && resourceDueValue !== '') {
    const due = Number(resourceDueValue)
    if (Number.isFinite(due) && due > EPSILON) {
      return { ok: false, reason: 'not-fully-paid' }
    }
  }

  return { ok: true }
}
