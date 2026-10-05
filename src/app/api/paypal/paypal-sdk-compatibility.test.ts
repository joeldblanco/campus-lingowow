import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getToken: vi.fn(),
  createOrder: vi.fn(),
  captureOrder: vi.fn(),
  getCreditPackageById: vi.fn(),
  processCreditPackagePurchase: vi.fn(),
  creditPackageFindUnique: vi.fn(),
  invoiceCreate: vi.fn(),
  userFindUnique: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('next-auth/jwt', () => ({ getToken: mocks.getToken }))
vi.mock('@/lib/paypal', () => ({
  ordersController: {
    createOrder: mocks.createOrder,
    captureOrder: mocks.captureOrder,
  },
}))
vi.mock('@/lib/actions/credits', () => ({
  getCreditPackageById: mocks.getCreditPackageById,
  processCreditPackagePurchase: mocks.processCreditPackagePurchase,
}))
vi.mock('@/lib/db', () => ({
  db: {
    creditPackage: { findUnique: mocks.creditPackageFindUnique },
    invoice: { create: mocks.invoiceCreate },
    user: { findUnique: mocks.userFindUnique },
  },
}))
vi.mock('@/lib/mail', () => ({
  sendCreditPurchaseConfirmationEmail: mocks.sendEmail,
}))

import {
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk'
import { POST as createCreditOrder } from './create-credit-order/route'
import { POST as captureCreditOrder } from './capture-credit-order/route'

const creditPackage = {
  id: 'package-1',
  name: 'Paquete A1',
  credits: 10,
  bonusCredits: 2,
  price: 12.5,
}

function buildRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `paypal-sdk-compat-${path}`,
    },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof createCreditOrder>[0]
}

describe('PayPal Server SDK v2 compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockResolvedValue({ sub: 'user-1' })
    mocks.auth.mockResolvedValue(null)
    mocks.getCreditPackageById.mockResolvedValue({ success: true, data: creditPackage })
    mocks.createOrder.mockResolvedValue({ result: { id: 'order-1' } })
    mocks.captureOrder.mockResolvedValue({
      result: {
        id: 'capture-1',
        status: 'COMPLETED',
        payer: { emailAddress: 'student@example.com' },
      },
    })
    mocks.creditPackageFindUnique.mockResolvedValue(creditPackage)
    mocks.invoiceCreate.mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-CREDITS-1' })
    mocks.processCreditPackagePurchase.mockResolvedValue({ success: true })
    mocks.userFindUnique.mockResolvedValue({
      email: 'student@example.com',
      name: 'María',
      lastName: 'López',
    })
    mocks.sendEmail.mockResolvedValue(undefined)
  })

  it('creates a credit order with the v2 request shape and enums', async () => {
    const response = await createCreditOrder(
      buildRequest('/api/paypal/create-credit-order', { packageId: creditPackage.id })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ orderID: 'order-1', packageId: creditPackage.id })
    expect(mocks.createOrder).toHaveBeenCalledWith({
      body: expect.objectContaining({
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: expect.arrayContaining([
          expect.objectContaining({
            amount: expect.objectContaining({ currencyCode: 'USD', value: '12.50' }),
          }),
        ]),
        applicationContext: {
          brandName: 'Lingowow',
          landingPage: OrderApplicationContextLandingPage.NoPreference,
          userAction: OrderApplicationContextUserAction.PayNow,
          returnUrl: expect.stringContaining('/credits/confirmation'),
          cancelUrl: expect.stringContaining('/credits/buy'),
        },
      }),
    })
  })

  it('captures a completed credit order with the v2 id request shape', async () => {
    const response = await captureCreditOrder(
      buildRequest('/api/paypal/capture-credit-order', {
        orderID: 'order-1',
        packageId: creditPackage.id,
      })
    )

    expect(response.status).toBe(200)
    expect((await response.json()).captureID).toBe('capture-1')
    expect(mocks.captureOrder).toHaveBeenCalledWith({ id: 'order-1' })
    expect(mocks.invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paypalOrderId: 'order-1',
        paypalCaptureId: 'capture-1',
        paypalPayerEmail: 'student@example.com',
      }),
    })
  })
})
