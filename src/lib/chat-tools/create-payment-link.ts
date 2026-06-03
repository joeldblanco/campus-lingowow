import { randomUUID } from 'crypto'
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
  /** Only create the invoice once the user confirmed via the buttons. */
  confirmed?: boolean
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

    const programType = (params.programType ?? 'Esencial').trim()
    const mappedProgramName = programType.toLowerCase().includes('exclusivo')
      ? 'Lingowow Exclusivo'
      : 'Lingowow Esencial'

    // Find matching plan in DB
    let plan = await db.plan.findFirst({
      where: {
        AND: [
          { name: { equals: rawPlanType, mode: 'insensitive' } },
          { product: { name: { equals: mappedProgramName, mode: 'insensitive' } } },
        ],
        isActive: true,
      },
    })

    // Fallback if rawPlanType was something complex, try to match by slugKey
    if (!plan && slugKey) {
      plan = await db.plan.findFirst({
        where: {
          AND: [
            { slug: { contains: slugKey, mode: 'insensitive' } },
            { product: { name: { equals: mappedProgramName, mode: 'insensitive' } } },
          ],
          isActive: true,
        },
      })
    }

    if (!plan) {
      return {
        success: false,
        message: `No se encontró el plan ${rawPlanType || slugKey} para el programa ${mappedProgramName}. Un asesor confirmará el precio exacto. Por favor escríbenos por WhatsApp.`,
      }
    }

    const planDisplayName = `${programType} ${rawPlanType || slugKey}`
    const scheduleNote = params.startNow
      ? 'Inicio inmediato con prorrateo'
      : 'Inicio en el próximo período'
    const description = `${planDisplayName} - Lingowow | ${scheduleNote} | Horario: ${params.desiredDay} ${params.desiredTime}`
    const amountStr = plan.price.toFixed(2)

    // Idempotency: if this user already has a PENDING, non-expired payment link
    // for the same plan + timing, reuse it instead of generating a second
    // invoice (which would let them be billed twice if both got paid).
    if (params.userId) {
      const existing = await db.pendingOrder.findFirst({
        where: {
          userId: params.userId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          AND: [
            { invoiceData: { path: ['planId'], equals: plan.id } },
            { invoiceData: { path: ['startNow'], equals: params.startNow } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
      const existingData = existing?.invoiceData as
        | { payerViewUrl?: string; planName?: string }
        | undefined
      if (existing && existingData?.payerViewUrl) {
        return {
          success: true,
          message: `Ya existe una factura de pago pendiente para este plan. Reutilizo el mismo link: ${existingData.payerViewUrl} — Muéstralo al usuario tal como está, sin modificarlo. Si necesita uno nuevo, primero hay que cancelar el anterior.`,
          data: {
            paymentUrl: existingData.payerViewUrl,
            planName: existingData.planName ?? planDisplayName,
            price: `$${amountStr} USD`,
            invoiceId: existing.purchaseNumber,
            reused: true,
          },
        }
      }
    }

    // Confirmation gate: never create a real PayPal invoice on the first call.
    // Surface the exact, server-side plan + price as forced-choice buttons so the
    // user explicitly confirms the amount before anything is billed. The model
    // re-calls with confirmed=true only after the user taps the confirm button.
    if (!params.confirmed) {
      return {
        success: true,
        message: `Para confirmar tu inscripción: plan ${planDisplayName} por $${amountStr} USD (${scheduleNote}). Pulsa el botón para generar el link de pago, o cancela.`,
        data: {
          code: 'CONFIRM_PAYMENT',
          planName: planDisplayName,
          price: amountStr,
          currency: 'USD',
          scheduleNote,
          programType,
          planType: rawPlanType || slugKey,
          startNow: params.startNow,
          desiredDay: params.desiredDay,
          desiredTime: params.desiredTime,
        },
      }
    }

    // Unguessable, collision-free invoice number. The old Date.now().slice(-6)
    // repeated every ~16 min and is enumerable; purchaseNumber is @unique, so a
    // collision would also throw P2002.
    const invoiceNumber = `LW-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`

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
            payerViewUrl: paypalInvoice.payerViewUrl,
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
