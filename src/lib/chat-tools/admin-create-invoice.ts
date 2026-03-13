import { db } from '@/lib/db'
import { createPayPalInvoice } from '@/lib/paypal'
import type { ToolResult } from '@/types/ai-chat'

export async function handleAdminCreateInvoice(params: {
  clientNameOrEmail: string
  programType: string
  planType: string
  startDate: string
  language: string
}): Promise<ToolResult> {
  try {
    const { clientNameOrEmail, programType, planType, startDate, language } = params

    const isEmail = clientNameOrEmail.includes('@')

    let recipientEmail: string
    let recipientName: string

    if (isEmail) {
      recipientEmail = clientNameOrEmail.trim()
      const user = await db.user.findFirst({
        where: { email: { equals: recipientEmail, mode: 'insensitive' } },
        select: { name: true, email: true },
      })
      recipientName = user?.name ?? recipientEmail.split('@')[0]
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
          message: `NO_USER_FOUND: No se encontró ningún usuario con el nombre "${clientNameOrEmail}". Pregúntale al admin si quiere intentar con otro nombre o proporcionar un correo electrónico directamente.`,
          data: { code: 'NO_USER_FOUND' },
        }
      }

      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email})`).join('\n')
        return {
          success: false,
          message: `MULTIPLE_USERS: Se encontraron ${users.length} usuarios con ese nombre. Pide al admin que confirme cuál:\n${list}`,
          data: { code: 'MULTIPLE_USERS', users: users.map((u) => ({ name: u.name, email: u.email })) },
        }
      }

      recipientEmail = users[0].email ?? ''
      recipientName = users[0].name ?? clientNameOrEmail
      if (!recipientEmail) {
        return {
          success: false,
          message: `El usuario "${recipientName}" no tiene correo electrónico registrado. Pide al admin que proporcione un correo.`,
        }
      }
    }

    const mappedProgramName = programType.toLowerCase().includes('exclusiv')
      ? 'Lingowow Exclusivo'
      : 'Lingowow Esencial'

    const normalizedPlan = planType.toLowerCase().trim()
    const planSlugMap: Record<string, string> = { go: 'go', lingo: 'lingo', wow: 'wow' }
    const slugKey =
      planSlugMap[normalizedPlan] ??
      Object.entries(planSlugMap).find(([k]) => normalizedPlan.includes(k))?.[1]

    if (!slugKey) {
      return {
        success: false,
        message: `Plan no válido: "${planType}". Los planes disponibles son: Go (2 clases/semana), Lingo (3 clases/semana), Wow (4 clases/semana).`,
      }
    }

    let plan = await db.plan.findFirst({
      where: {
        AND: [
          { name: { equals: slugKey, mode: 'insensitive' } },
          { product: { name: { equals: mappedProgramName, mode: 'insensitive' } } },
        ],
        isActive: true,
      },
      include: { pricing: true },
    })

    if (!plan) {
      plan = await db.plan.findFirst({
        where: {
          AND: [
            { slug: { contains: slugKey, mode: 'insensitive' } },
            { product: { name: { equals: mappedProgramName, mode: 'insensitive' } } },
          ],
          isActive: true,
        },
        include: { pricing: true },
      })
    }

    if (!plan) {
      return {
        success: false,
        message: `No se encontró el plan "${slugKey}" para el programa "${mappedProgramName}". Verifica que existan planes activos en la configuración.`,
      }
    }

    const lang = (language || 'en').toLowerCase().trim()
    const langPricing = plan.pricing.find((p) => p.language === lang && p.isActive)
    const amount = langPricing ? langPricing.price : plan.price
    const currency = langPricing ? langPricing.currency : 'USD'

    if (amount <= 0) {
      return {
        success: false,
        message: `El plan "${plan.name}" del programa "${mappedProgramName}" tiene precio $0 para el idioma "${lang}". Verifica la configuración de precios.`,
      }
    }

    const amountStr = amount.toFixed(2)
    const planDisplayName = `${mappedProgramName} - ${plan.name}`
    const description = `${planDisplayName} | Idioma: ${lang === 'en' ? 'Inglés' : 'Español'} | Inicio: ${startDate}`
    const invoiceNumber = `LW-${Date.now().toString().slice(-6)}`

    return {
      success: true,
      message: `CONFIRM_INVOICE: Factura lista para emitir.\n\nDestinatario: ${recipientName} (${recipientEmail})\nPlan: ${planDisplayName}\nIdioma: ${lang === 'en' ? 'Inglés' : 'Español'}\nMonto: $${amountStr} ${currency}\nInicio: ${startDate}\n\nPide al admin que confirme antes de emitir. Cuando confirme, llama admin_send_invoice con invoiceReady=true.`,
      data: {
        code: 'READY_TO_SEND',
        recipientEmail,
        recipientName,
        planDisplayName,
        amount: amountStr,
        currency,
        description,
        invoiceNumber,
        startDate,
      },
    }
  } catch (error) {
    console.error('[AdminCreateInvoice] Error:', error)
    return {
      success: false,
      message: 'Error al preparar la factura. Por favor intenta de nuevo.',
    }
  }
}

export async function handleAdminSendInvoice(params: {
  recipientEmail: string
  recipientName: string
  planDisplayName: string
  amount: string
  currency: string
  description: string
  invoiceNumber: string
}): Promise<ToolResult> {
  try {
    const paypalInvoice = await createPayPalInvoice({
      amount: params.amount,
      currency: params.currency,
      planName: params.planDisplayName,
      description: params.description,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      invoiceNumber: params.invoiceNumber,
    })

    if (!paypalInvoice) {
      return {
        success: false,
        message: 'No se pudo crear la factura en PayPal. Verifica las credenciales de PayPal o intenta de nuevo.',
      }
    }

    return {
      success: true,
      message: `Factura emitida exitosamente.\n\nDestinatario: ${params.recipientName} (${params.recipientEmail})\nPlan: ${params.planDisplayName}\nMonto: $${params.amount} ${params.currency}\nID PayPal: ${paypalInvoice.id}\nLink de pago: ${paypalInvoice.payerViewUrl}\n\nLa factura fue enviada al correo del cliente automáticamente por PayPal.`,
      data: {
        invoiceId: paypalInvoice.id,
        payerViewUrl: paypalInvoice.payerViewUrl,
      },
    }
  } catch (error) {
    console.error('[AdminSendInvoice] Error:', error)
    return {
      success: false,
      message: 'Error al enviar la factura a PayPal. Por favor intenta de nuevo.',
    }
  }
}
