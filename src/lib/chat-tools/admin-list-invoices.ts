import { db } from '@/lib/db'
import type { ToolResult } from '@/types/ai-chat'

interface PayPalInvoiceItem {
  id: string
  status: string
  detail?: {
    invoice_number?: string
    currency_code?: string
    metadata?: { recipient_view_url?: string }
  }
  primary_recipients?: Array<{
    billing_info?: {
      name?: { given_name?: string; surname?: string }
      email_address?: string
    }
  }>
  amount?: { currency_code?: string; value?: string }
  due_amount?: { currency_code?: string; value?: string }
  items?: Array<{ name?: string; unit_amount?: { value?: string } }>
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const url =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`)
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export async function handleAdminListInvoices(params: {
  clientNameOrEmail: string
}): Promise<ToolResult> {
  try {
    const { clientNameOrEmail } = params
    const isEmail = clientNameOrEmail.includes('@')

    let searchEmail: string

    if (isEmail) {
      searchEmail = clientNameOrEmail.trim().toLowerCase()
    } else {
      const users = await db.user.findMany({
        where: {
          name: { contains: clientNameOrEmail.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, email: true },
        take: 5,
      })

      if (users.length === 0) {
        return {
          success: false,
          message: `No se encontró ningún usuario con el nombre "${clientNameOrEmail}". Intenta con otro nombre o proporciona un correo electrónico directamente.`,
        }
      }

      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email})`).join('\n')
        return {
          success: false,
          message: `Se encontraron ${users.length} usuarios con ese nombre. Pide al admin que confirme cuál:\n${list}`,
          data: { code: 'MULTIPLE_USERS', users: users.map((u) => ({ name: u.name, email: u.email })) },
        }
      }

      searchEmail = (users[0].email ?? '').toLowerCase()
      if (!searchEmail) {
        return {
          success: false,
          message: `El usuario "${users[0].name}" no tiene correo electrónico registrado.`,
        }
      }
    }

    const accessToken = await getPayPalAccessToken()
    const baseUrl =
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

    const response = await fetch(`${baseUrl}/v2/invoicing/search-invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        page_size: 10,
        total_required: true,
        recipient_email: searchEmail,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AdminListInvoices] PayPal search error ${response.status}: ${errorText}`)
      return {
        success: false,
        message: 'Error al buscar facturas en PayPal. Intenta de nuevo.',
      }
    }

    const data = (await response.json()) as {
      total_count?: number
      items?: PayPalInvoiceItem[]
    }

    const invoices = data.items ?? []

    if (invoices.length === 0) {
      return {
        success: true,
        message: `No se encontraron facturas en PayPal para el correo ${searchEmail}.`,
        data: { invoices: [], email: searchEmail },
      }
    }

    const invoiceList = invoices.map((inv) => {
      const status = inv.status ?? 'UNKNOWN'
      const invoiceNumber = inv.detail?.invoice_number ?? inv.id
      const amount = inv.amount?.value ?? inv.due_amount?.value ?? '?'
      const currency = inv.amount?.currency_code ?? inv.due_amount?.currency_code ?? 'USD'
      const itemName = inv.items?.[0]?.name ?? 'Sin detalle'
      const viewUrl = inv.detail?.metadata?.recipient_view_url ?? ''

      const statusEmoji: Record<string, string> = {
        PAID: '✅',
        SENT: '📩',
        DRAFT: '📝',
        CANCELLED: '❌',
        REFUNDED: '🔄',
        PARTIALLY_PAID: '⏳',
        MARKED_AS_PAID: '✅',
        UNPAID: '📩',
        PAYMENT_PENDING: '⏳',
      }

      return {
        id: inv.id,
        number: invoiceNumber,
        status,
        statusLabel: `${statusEmoji[status] ?? '❓'} ${status}`,
        amount: `$${amount} ${currency}`,
        item: itemName,
        viewUrl,
      }
    })

    const listText = invoiceList
      .map((inv, i) => `${i + 1}. ${inv.statusLabel} | ${inv.number} | ${inv.amount} | ${inv.item}${inv.viewUrl ? ` | ${inv.viewUrl}` : ''}`)
      .join('\n')

    return {
      success: true,
      message: `Facturas de PayPal para ${searchEmail} (${invoiceList.length} encontradas):\n\n${listText}`,
      data: { invoices: invoiceList, email: searchEmail, totalCount: data.total_count },
    }
  } catch (error) {
    console.error('[AdminListInvoices] Error:', error)
    return {
      success: false,
      message: 'Error al buscar facturas. Por favor intenta de nuevo.',
    }
  }
}
