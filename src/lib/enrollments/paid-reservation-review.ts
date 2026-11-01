import type { Invoice } from '@prisma/client'

export const RESERVATION_REVIEW_MARKER = 'reservation_pending_review'

export type ReservationReviewReason = 'schedule_conflict' | 'scheduling_failed'

type InvoiceUpdateClient = {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>
}

export function appendReservationReviewMarker(
  notes: string | null | undefined,
  reason: ReservationReviewReason
) {
  const marker = `${RESERVATION_REVIEW_MARKER}:${reason}`

  if (!notes) {
    return marker
  }

  if (notes.includes(`${RESERVATION_REVIEW_MARKER}:`)) {
    return notes
  }

  return `${notes}; ${marker}`
}

export function classifyReservationReviewReason(error: unknown): ReservationReviewReason {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return 'schedule_conflict'
  }

  if (error instanceof Error && /conflict|overlap|unique/i.test(error.message)) {
    return 'schedule_conflict'
  }

  return 'scheduling_failed'
}

export async function persistReservationReview<T extends Pick<Invoice, 'id' | 'notes'>>(
  client: InvoiceUpdateClient,
  invoice: T,
  reason: ReservationReviewReason
): Promise<T & { notes: string }> {
  const notes = appendReservationReviewMarker(invoice.notes, reason)

  await client.$executeRaw`
    UPDATE "invoices"
    SET "notes" = CASE
      WHEN "notes" IS NULL OR "notes" = '' THEN ${notes}
      WHEN POSITION(${`${RESERVATION_REVIEW_MARKER}:`} IN "notes") > 0 THEN "notes"
      ELSE "notes" || '; ' || ${notes}
    END
    WHERE "id" = ${invoice.id}
  `

  return { ...invoice, notes }
}
