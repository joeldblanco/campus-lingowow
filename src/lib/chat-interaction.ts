import type { ChatInteraction, ToolResult } from '@/types/ai-chat'

/**
 * Build a ChatInteraction (clickable buttons) from a tool result that contains
 * a `code` discriminator plus structured selection data.
 *
 * Returns `undefined` when the result has no `data`, no `code`, an unknown
 * `code`, or an empty list for the relevant entity.
 */
export function buildInteractionFromToolResult(
  toolResult: ToolResult | undefined
): ChatInteraction | undefined {
  if (!toolResult || !toolResult.data || typeof toolResult.data !== 'object') return undefined

  const data = toolResult.data as Record<string, unknown>
  const code = data.code as string | undefined
  if (!code) return undefined

  switch (code) {
    case 'MULTIPLE_STUDENTS': {
      const students = data.students as Array<{ name: string; email: string }> | undefined
      if (!students?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el estudiante:',
        options: students.map((s) => ({
          id: s.email,
          label: `${s.name} (${s.email})`,
        })),
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_TEACHERS': {
      const teachers = data.teachers as Array<{ name: string; email: string }> | undefined
      if (!teachers?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el profesor:',
        options: teachers.map((t) => ({
          id: t.email,
          label: `${t.name} (${t.email})`,
        })),
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_INVOICES': {
      const invoices = data.invoices as
        | Array<{
            id: string
            invoiceNumber: string
            planName?: string
            total: number
            currency: string
            paidAt?: string
          }>
        | undefined
      if (!invoices?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona la factura:',
        options: invoices.map((inv) => ({
          id: inv.id,
          label: `${inv.invoiceNumber}: ${inv.planName ?? 'Sin plan'} ($${inv.total} ${inv.currency})`,
          payload: { invoiceId: inv.id },
        })),
        allowFreeText: false,
      }
    }
    case 'CONFIRM_PAYMENT': {
      const planName = (data.planName as string | undefined) ?? 'tu plan'
      const price = data.price as string | undefined
      const priceLabel = price ? ` ($${price} USD)` : ''
      return {
        kind: 'single-select',
        prompt: `Confirma tu inscripción: ${planName}${priceLabel}`,
        options: [
          { id: 'confirm', label: `Sí, generar el link de pago — ${planName}${priceLabel}` },
          { id: 'cancel', label: 'Cancelar' },
        ],
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_USERS': {
      const users = data.users as Array<{ name: string; email: string }> | undefined
      if (!users?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el usuario:',
        options: users.map((u) => ({
          id: u.email,
          label: `${u.name} (${u.email})`,
        })),
        allowFreeText: false,
      }
    }
    default:
      return undefined
  }
}
