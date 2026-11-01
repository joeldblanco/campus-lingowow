import { isDeepStrictEqual } from 'node:util'
import { auth } from '@/auth'
import { createNiubizSession, getNiubizAccessToken } from '@/lib/niubiz'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

interface CustomerInfo {
  email: string
  firstName: string
  lastName?: string | null
  address?: string
  city?: string
  country?: string
  zipCode?: string
}

interface InvoiceData {
  currency?: string
  total?: number
}

const hasRequiredBillingInfo = (customerInfo?: CustomerInfo) => {
  return Boolean(
    customerInfo?.address?.trim() &&
      customerInfo?.city?.trim() &&
      customerInfo?.country?.trim() &&
      customerInfo?.zipCode?.trim()
  )
}

const amountsMatch = (left: number, right: number) =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.0001

const isValidAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || null


const isUniqueConstraintError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002'

type PendingOrderCheck = 'mismatch' | 'unavailable' | null

function checkExistingPendingOrder(
  pendingOrder: {
    status: string
    expiresAt: Date
    userId: string | null
    customerEmail: string | null
    amount: number
    currency: string
    invoiceData: unknown
  },
  input: {
    amount: number
    currency: string
    signedInUserId?: string
    customerEmail: string | null
    invoiceData: unknown
  }
): PendingOrderCheck {
  if (pendingOrder.status !== 'PENDING' || pendingOrder.expiresAt <= new Date()) {
    return 'unavailable'
  }

  if (
    !amountsMatch(pendingOrder.amount, input.amount) ||
    pendingOrder.currency.toUpperCase() !== input.currency
  ) {
    return 'mismatch'
  }

  const storedEmail = normalizeEmail(pendingOrder.customerEmail)
  if (storedEmail && storedEmail !== input.customerEmail) {
    return 'mismatch'
  }

  if (pendingOrder.userId) {
    return pendingOrder.userId === input.signedInUserId &&
      isDeepStrictEqual(pendingOrder.invoiceData, input.invoiceData)
      ? null
      : 'mismatch'
  }

  return !input.signedInUserId &&
    Boolean(storedEmail) &&
    storedEmail === input.customerEmail &&
    isDeepStrictEqual(pendingOrder.invoiceData, input.invoiceData)
    ? null
    : 'mismatch'
}

function pendingOrderError(check: Exclude<PendingOrderCheck, null>) {
  return new NextResponse(
    check === 'unavailable'
      ? 'Payment request is already being processed'
      : 'Payment request does not match the pending order',
    { status: 409 }
  )
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    const body = await req.json()
    const { amount, allowGuest, purchaseNumber, invoiceData, customerInfo } = body as {
      amount: number
      allowGuest?: boolean
      purchaseNumber?: string
      invoiceData?: InvoiceData
      customerInfo?: CustomerInfo
    }

    if (!isValidAmount(amount)) {
      return new NextResponse('Amount is required', { status: 400 })
    }

    if (!session?.user && !allowGuest) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (invoiceData && !hasRequiredBillingInfo(customerInfo)) {
      return new NextResponse('Billing address is required for card payments', { status: 400 })
    }

    if (Boolean(purchaseNumber) !== Boolean(invoiceData)) {
      return new NextResponse('Purchase number and invoice data are required together', {
        status: 400,
      })
    }

    if (invoiceData?.total !== undefined && !amountsMatch(invoiceData.total, amount)) {
      return new NextResponse('Payment amount does not match the order', { status: 400 })
    }

    // Register the order before opening a provider session. The status is the
    // durable pre-authorization claim used by the callbacks; never delete or
    // overwrite a claimed/non-PENDING record.
    if (purchaseNumber && invoiceData) {
      console.log('[NIUBIZ_SESSION] Saving pending order:', purchaseNumber)

      const existingInvoice = await db.invoice.findFirst({
        where: { niubizOrderId: purchaseNumber },
        select: { id: true },
      })
      if (existingInvoice) {
        return new NextResponse('Payment request is already being processed', { status: 409 })
      }

      const pendingInvoiceData = JSON.parse(
        JSON.stringify({
          ...invoiceData,
          customerInfo: customerInfo || null,
        })
      ) as Prisma.InputJsonObject

      const requestCurrency = (invoiceData.currency || 'USD').toUpperCase()
      const requestEmail = normalizeEmail(customerInfo?.email)
      const requestUserId = session?.user?.id
      const requestInvoiceData = { ...invoiceData, customerInfo: customerInfo || null }
      let pendingOrder = await db.pendingOrder.findUnique({ where: { purchaseNumber } })

      if (pendingOrder) {
        const check = checkExistingPendingOrder(pendingOrder, {
          amount,
          currency: requestCurrency,
          signedInUserId: requestUserId,
          customerEmail: requestEmail,
          invoiceData: requestInvoiceData,
        })
        if (check) return pendingOrderError(check)
      } else {
        try {
          pendingOrder = await db.pendingOrder.create({
            data: {
              purchaseNumber,
              userId: requestUserId || null,
              customerEmail: customerInfo?.email || null,
              customerName: customerInfo?.firstName || null,
              amount,
              currency: requestCurrency,
              invoiceData: pendingInvoiceData,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
            },
          })
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error

          // Another session request won the unique purchase-number race. Bind
          // this request to the record that actually exists; never overwrite it.
          pendingOrder = await db.pendingOrder.findUnique({ where: { purchaseNumber } })
          if (!pendingOrder) throw error

          const check = checkExistingPendingOrder(pendingOrder, {
            amount,
            currency: requestCurrency,
            signedInUserId: requestUserId,
            customerEmail: requestEmail,
            invoiceData: requestInvoiceData,
          })
          if (check) return pendingOrderError(check)
        }
      }
    }

    // Only offer the provider session after the local order record is durable.
    const accessToken = await getNiubizAccessToken()
    const niubizSession = await createNiubizSession(amount, accessToken)
    console.log('[NIUBIZ_SESSION_DEBUG] Created session for Merchant:', niubizSession.merchantId)

    return NextResponse.json(niubizSession)
  } catch (error) {
    console.error('[NIUBIZ_SESSION_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
