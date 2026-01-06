import {
  Client,
  Environment,
  OrdersController,
  PaymentsController,
} from '@paypal/paypal-server-sdk'

// Configuración del cliente PayPal
const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment: process.env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox,
})

// Obtener el controlador de órdenes
const ordersController = new OrdersController(paypalClient)
const paymentsController = new PaymentsController(paypalClient)

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const url =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token'

  // console.log(`[PayPal Token] Requesting token for mode: ${process.env.PAYPAL_MODE || 'sandbox'} at ${url}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[PayPal Token] Error ${response.status}: ${errorText}`)
    throw new Error(`Failed to get access token: ${errorText}`)
  }

  const data = (await response.json()) as { access_token: string; [key: string]: unknown }
  return data.access_token
}

async function getPayPalOrder(orderId: string) {
  try {
    const response = await ordersController.getOrder({
      id: orderId,
    })
    return JSON.parse(response.body as string)
  } catch (error) {
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode !== 404) {
      console.error('[PayPal Order] Error:', err.message || error)
    }
    return null
  }
}

async function getPayPalInvoice(invoiceId: string) {
  try {
    const accessToken = await getPayPalAccessToken()
    const url =
      process.env.PAYPAL_MODE === 'live'
        ? `https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`
        : `https://api-m.sandbox.paypal.com/v2/invoicing/invoices/${invoiceId}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // const errorText = await response.text()
      // console.error(`[PayPal Invoice] Error ${response.status}: ${errorText}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('[PayPal Invoice] Exception:', error)
    return null
  }
}

async function searchPayPalInvoice(invoiceNumber: string) {
  try {
    const accessToken = await getPayPalAccessToken()
    const url =
      process.env.PAYPAL_MODE === 'live'
        ? `https://api-m.paypal.com/v2/invoicing/search-invoices`
        : `https://api-m.sandbox.paypal.com/v2/invoicing/search-invoices`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        page_size: 1,
        total_required: true,
        invoice_number: invoiceNumber,
      }),
    })

    if (!response.ok) {
      console.error(`[PayPal Search] Search failed with status: ${response.status}`)
      const errorText = await response.text()
      throw new Error(`Failed to search invoice: ${errorText}`)
    }

    const data = (await response.json()) as Record<string, unknown>
    const items = data.items as unknown as Array<Record<string, unknown>>
    console.log(`[PayPal Search] Results found: ${items?.length || 0}`)
    if (items && items.length > 0) {
      return items[0]
    }
    return null
  } catch (error) {
    console.error('[PayPal Invoice Search] Exception:', error)
    return null
  }
}

/**
 * Normalizes a PayPal invoice identifier to the standard INV2-XXXX-XXXX-XXXX-XXXX format.
 * Handles:
 * - Full URLs: https://www.paypal.com/invoice/p/#HTN5SK8DF7VFPNWY
 * - Short codes: HTN5SK8DF7VFPNWY
 * - Already formatted IDs: INV2-HTN5-SK8D-F7VF-PNWY
 */
function normalizePayPalInvoiceId(input: string): string {
  // Remove whitespace
  let id = input.trim()

  // Extract from URL if present
  const urlMatch = id.match(/\/invoice\/(?:p\/#?|s\/details\/)?([A-Z0-9-]+)/i)
  if (urlMatch) {
    id = urlMatch[1]
  }

  // If already in INV2-XXXX-XXXX-XXXX-XXXX format, return as-is
  if (/^INV2-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(id)) {
    return id.toUpperCase()
  }

  // If it's a 16-character code without dashes, format it
  const cleanId = id.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (cleanId.length === 16) {
    return `INV2-${cleanId.slice(0, 4)}-${cleanId.slice(4, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}`
  }

  // Return original if we can't normalize
  return id
}

async function getPayPalPayment(paymentId: string) {
  try {
    const response = await paymentsController.getCapturedPayment({
      captureId: paymentId,
    })
    return JSON.parse(response.body as string)
  } catch (error) {
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode !== 404) {
      console.error('[PayPal Payment] Error:', err.message || error)
    }
    return null
  }
}

export {
  paypalClient,
  ordersController,
  paymentsController,
  getPayPalOrder,
  getPayPalInvoice,
  getPayPalPayment,
  searchPayPalInvoice,
  normalizePayPalInvoiceId,
}
