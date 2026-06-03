import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleCreatePaymentLink } from './create-payment-link'
import { db } from '@/lib/db'
import { createPayPalInvoice } from '@/lib/paypal'

vi.mock('@/lib/db', () => ({
  db: {
    plan: { findFirst: vi.fn() },
    pendingOrder: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/paypal', () => ({
  createPayPalInvoice: vi.fn(),
}))

const PARAMS = {
  programType: 'Esencial',
  planType: 'go',
  startNow: true,
  desiredDay: 'lunes',
  desiredTime: '10:00',
  userEmail: 'u@x.com',
  userName: 'U',
  userId: 'user-1',
}

describe('handleCreatePaymentLink', () => {
  beforeEach(() => {
    vi.mocked(db.plan.findFirst).mockResolvedValue({ id: 'plan-1', price: 100 } as never)
    vi.mocked(db.pendingOrder.create).mockResolvedValue({} as never)
    vi.mocked(createPayPalInvoice).mockResolvedValue({
      id: 'pp-1',
      payerViewUrl: 'https://paypal.com/pay/pp-1',
    } as never)
  })

  afterEach(() => vi.clearAllMocks())

  it('shows a forced-choice confirmation (no invoice) on the first call', async () => {
    vi.mocked(db.pendingOrder.findFirst).mockResolvedValue(null)

    const res = await handleCreatePaymentLink(PARAMS) // no `confirmed`

    expect(res.success).toBe(true)
    expect((res.data as { code?: string }).code).toBe('CONFIRM_PAYMENT')
    expect((res.data as { price?: string }).price).toBe('100.00')
    // Nothing is billed yet.
    expect(createPayPalInvoice).not.toHaveBeenCalled()
    expect(db.pendingOrder.create).not.toHaveBeenCalled()
  })

  it('creates a new invoice with an unguessable LW- number and stores the payer URL', async () => {
    vi.mocked(db.pendingOrder.findFirst).mockResolvedValue(null)

    const res = await handleCreatePaymentLink({ ...PARAMS, confirmed: true })

    expect(res.success).toBe(true)
    expect(createPayPalInvoice).toHaveBeenCalledTimes(1)
    const invoiceNumber = vi.mocked(createPayPalInvoice).mock.calls[0][0].invoiceNumber
    // Unguessable, not the old Date.now().slice(-6) shape.
    expect(invoiceNumber).toMatch(/^LW-[A-Z0-9]{10}$/)

    // payerViewUrl is persisted so a later call can reuse it.
    const createArg = vi.mocked(db.pendingOrder.create).mock.calls[0][0] as {
      data: { invoiceData: { payerViewUrl?: string } }
    }
    expect(createArg.data.invoiceData.payerViewUrl).toBe('https://paypal.com/pay/pp-1')
    expect((res.data as { reused?: boolean }).reused).toBeFalsy()
  })

  it('generates a different invoice number on each call (not time-derived)', async () => {
    vi.mocked(db.pendingOrder.findFirst).mockResolvedValue(null)
    await handleCreatePaymentLink({ ...PARAMS, confirmed: true })
    await handleCreatePaymentLink({ ...PARAMS, confirmed: true })
    const n1 = vi.mocked(createPayPalInvoice).mock.calls[0][0].invoiceNumber
    const n2 = vi.mocked(createPayPalInvoice).mock.calls[1][0].invoiceNumber
    expect(n1).not.toBe(n2)
  })

  it('reuses an existing PENDING payment link instead of creating a duplicate (no double charge)', async () => {
    vi.mocked(db.pendingOrder.findFirst).mockResolvedValue({
      purchaseNumber: 'LW-OLD0000000',
      invoiceData: { payerViewUrl: 'https://paypal.com/pay/old', planName: 'Esencial go' },
    } as never)

    const res = await handleCreatePaymentLink(PARAMS)

    expect(res.success).toBe(true)
    expect((res.data as { reused?: boolean }).reused).toBe(true)
    expect((res.data as { paymentUrl: string }).paymentUrl).toBe('https://paypal.com/pay/old')
    // No new PayPal invoice and no new pending order.
    expect(createPayPalInvoice).not.toHaveBeenCalled()
    expect(db.pendingOrder.create).not.toHaveBeenCalled()
  })
})
