import { db } from '@/lib/db'
import { createPayPalInvoice } from '@/lib/paypal'
import type { ToolResult } from '@/types/ai-chat'

const PLAN_SLUG_MAP: Record<string, string> = {
  go: 'go',
  lingo: 'lingo',
  wow: 'wow',
}

export async function handleCreatePaymentLink(params: {
  programType: string
  planType: string
  startNow: boolean
  desiredDay: string
  desiredTime: string
  userEmail: string
  userName: string
  userId?: string
}): Promise<ToolResult> {
  try {
    const rawPlanType = (params.planType ?? '').toLowerCase().trim()
    // Allow exact match or substring (e.g. "plan lingo" or "lingo (3 clases)" still maps to "lingo")
    const slugKey =
      PLAN_SLUG_MAP[rawPlanType] ??
      Object.entries(PLAN_SLUG_MAP).find(([k]) => rawPlanType.includes(k))?.[1]
    if (!slugKey) {
      return {
        success: false,
        message: `Falta el tipo de plan. Valores válidos: "Go" (2 clases/semana), "Lingo" (3 clases/semana), "Wow" (4 clases/semana). Por favor vuelve a llamar esta función con el campo planType correcto.`,
      }
    }

    const programType = (params.programType ?? 'Esencial').trim() || 'Esencial'

    // Find matching plan in DB — prefer match that also filters by programType (product name)
    let plan = await db.plan.findFirst({
      where: {
        OR: [
          { slug: { contains: slugKey, mode: 'insensitive' } },
          { name: { contains: rawPlanType, mode: 'insensitive' } },
        ],
        isActive: true,
        product: { name: { contains: programType, mode: 'insensitive' } },
      },
    })
    // Fallback: find any active plan matching the slug (ignoring program type)
    if (!plan) {
      plan = await db.plan.findFirst({
        where: {
          OR: [
            { slug: { contains: slugKey, mode: 'insensitive' } },
            { name: { contains: rawPlanType, mode: 'insensitive' } },
          ],
          isActive: true,
        },
      })
    }

    if (!plan) {
      return {
        success: false,
        message: `No se encontró el plan ${slugKey} activo. Un asesor confirmará el precio exacto. Por favor escríbenos por WhatsApp.`,
      }
    }

    const planDisplayName = `${programType} ${rawPlanType || slugKey}`
    const scheduleNote = params.startNow
      ? 'Inicio inmediato con prorrateo'
      : 'Inicio en el próximo período'
    const description = `${planDisplayName} - Lingowow | ${scheduleNote} | Horario: ${params.desiredDay} ${params.desiredTime}`
    const amountStr = plan.price.toFixed(2)
    const invoiceNumber = `CHAT-${Date.now().toString().slice(-10)}`

    const paypalInvoice = await createPayPalInvoice({
      amount: amountStr,
      currency: 'USD',
      planName: planDisplayName,
      description,
      recipientEmail: params.userEmail,
      recipientName: params.userName,
      invoiceNumber,
    })

    if (!paypalInvoice) {
      return {
        success: false,
        message:
          'No se pudo generar la factura de pago en este momento. Por favor contáctanos por WhatsApp al +51 902 518 947.',
      }
    }

    // Store a PendingOrder so the webhook can create the enrollment on payment
    if (params.userId) {
      await db.pendingOrder.create({
        data: {
          purchaseNumber: invoiceNumber,
          userId: params.userId,
          customerEmail: params.userEmail,
          customerName: params.userName,
          amount: plan.price,
          currency: 'USD',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          invoiceData: {
            paypalInvoiceId: paypalInvoice.id,
            planId: plan.id,
            planName: planDisplayName,
            amount: plan.price,
            startNow: params.startNow,
          },
        },
      })
    }

    return {
      success: true,
      message: `Factura de pago generada exitosamente. Plan: ${planDisplayName} | Precio: $${amountStr} USD | ${scheduleNote}. URL de pago PayPal: ${paypalInvoice.payerViewUrl} — Muestra esta URL al usuario tal como está, sin modificarla. PayPal también le envió la factura al email ${params.userEmail}.`,
      data: {
        paymentUrl: paypalInvoice.payerViewUrl,
        planName: planDisplayName,
        price: `$${amountStr} USD`,
        invoiceId: paypalInvoice.id,
      },
    }
  } catch (error) {
    console.error('[CreatePaymentLink] Error:', error)
    return {
      success: false,
      message:
        'Error al generar la factura de pago. Por favor contáctanos por WhatsApp al +51 902 518 947.',
    }
  }
}
