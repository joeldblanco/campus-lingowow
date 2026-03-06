import { getPayPalInvoice, normalizePayPalInvoiceId } from '@/lib/paypal'
import type { ToolResult } from '@/types/ai-chat'

interface PayPalInvoiceDetail {
  id: string
  status: string
  detail?: {
    invoice_number?: string
    invoice_date?: string
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
  payments?: {
    paid_amount?: { currency_code?: string; value?: string }
    transactions?: Array<{
      payment_id?: string
      amount?: { currency_code?: string; value?: string }
      payment_date?: string
      method?: string
    }>
  }
  items?: Array<{ name?: string; unit_amount?: { value?: string } }>
}

export async function handleAdminCheckInvoicePayment(params: {
  invoiceLinkOrId: string
}): Promise<ToolResult> {
  try {
    const { invoiceLinkOrId } = params

    const invoiceId = normalizePayPalInvoiceId(invoiceLinkOrId)

    const invoice = (await getPayPalInvoice(invoiceId)) as PayPalInvoiceDetail | null

    if (!invoice) {
      return {
        success: false,
        message: `No se encontró la factura con ID/link "${invoiceLinkOrId}". Verifica que el link o ID sea correcto. ID normalizado: ${invoiceId}`,
      }
    }

    const status = invoice.status ?? 'UNKNOWN'
    const invoiceNumber = invoice.detail?.invoice_number ?? invoice.id
    const totalAmount = invoice.amount?.value ?? '?'
    const currency = invoice.amount?.currency_code ?? 'USD'
    const dueAmount = invoice.due_amount?.value ?? '0'
    const itemName = invoice.items?.[0]?.name ?? 'Sin detalle'

    const recipient = invoice.primary_recipients?.[0]?.billing_info
    const recipientName = recipient?.name
      ? `${recipient.name.given_name ?? ''} ${recipient.name.surname ?? ''}`.trim()
      : 'Desconocido'
    const recipientEmail = recipient?.email_address ?? 'Sin correo'

    const isPaid = status === 'PAID' || status === 'MARKED_AS_PAID'

    let paymentInfo = ''
    if (isPaid && invoice.payments?.transactions?.length) {
      const tx = invoice.payments.transactions[0]
      const paidDate = tx.payment_date
        ? new Date(tx.payment_date).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Fecha desconocida'
      const paidAmount = tx.amount?.value ?? invoice.payments.paid_amount?.value ?? totalAmount
      paymentInfo = `\nFecha de pago: ${paidDate}\nMonto pagado: $${paidAmount} ${currency}\nMétodo: ${tx.method ?? 'PayPal'}`
    }

    const statusMessages: Record<string, string> = {
      PAID: `✅ PAGADA`,
      MARKED_AS_PAID: `✅ MARCADA COMO PAGADA`,
      SENT: `📩 ENVIADA (pendiente de pago)`,
      DRAFT: `📝 BORRADOR (no enviada)`,
      CANCELLED: `❌ CANCELADA`,
      REFUNDED: `🔄 REEMBOLSADA`,
      PARTIALLY_PAID: `⏳ PARCIALMENTE PAGADA (falta $${dueAmount} ${currency})`,
      UNPAID: `📩 NO PAGADA`,
      PAYMENT_PENDING: `⏳ PAGO PENDIENTE`,
    }

    const statusLabel = statusMessages[status] ?? `❓ ${status}`

    return {
      success: true,
      message: `Estado de factura ${invoiceNumber}:\n\nEstado: ${statusLabel}\nCliente: ${recipientName} (${recipientEmail})\nConcepto: ${itemName}\nMonto total: $${totalAmount} ${currency}${paymentInfo}`,
      data: {
        invoiceId: invoice.id,
        status,
        isPaid,
        recipientName,
        recipientEmail,
        totalAmount,
        currency,
      },
    }
  } catch (error) {
    console.error('[AdminCheckInvoicePayment] Error:', error)
    return {
      success: false,
      message: 'Error al verificar la factura en PayPal. Por favor intenta de nuevo.',
    }
  }
}
