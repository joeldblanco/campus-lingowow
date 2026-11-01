import type { Invoice } from '@prisma/client'

export const RESERVATION_REVIEW_MARKER = 'reservation_pending_review'
export const RESERVATION_SCHEDULING_IN_PROGRESS_MARKER =
  `${RESERVATION_REVIEW_MARKER}:scheduling_in_progress`

export type ReservationReviewReason = 'schedule_conflict' | 'scheduling_failed'

type InvoiceUpdateClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>
}

const reservationSchedulingInProgressPattern =
  `(^|; )${RESERVATION_SCHEDULING_IN_PROGRESS_MARKER}(; |$)`

export function appendReservationSchedulingInProgressMarker(
  notes: string | null | undefined
) {
  if (!notes) {
    return RESERVATION_SCHEDULING_IN_PROGRESS_MARKER
  }

  if (notes.includes(`${RESERVATION_REVIEW_MARKER}:`)) {
    return notes
  }

  return `${notes}; ${RESERVATION_SCHEDULING_IN_PROGRESS_MARKER}`
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

export async function clearReservationSchedulingInProgressMarker(
  client: InvoiceUpdateClient,
  invoiceId: string
): Promise<{ id: string; notes: string | null; status: string }> {
  const rows = await client.$queryRaw<Array<{ id: string; notes: string | null; status: string }>>`
    UPDATE "invoices"
    SET "notes" = NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          COALESCE("notes", ''),
          ${reservationSchedulingInProgressPattern},
          ${String.raw`\1`},
          'g'
        ),
        '; $',
        '',
        'g'
      ),
      ''
    )
    WHERE "id" = ${invoiceId}
      AND "status" = 'PAID'
      AND POSITION(${RESERVATION_SCHEDULING_IN_PROGRESS_MARKER} IN COALESCE("notes", '')) > 0
    RETURNING "id", "notes", "status"
  `

  const updatedInvoice = rows[0]
  if (!updatedInvoice || updatedInvoice.status !== 'PAID') {
    throw new Error('reservation_review_invoice_not_paid')
  }

  return updatedInvoice
}

export async function persistReservationReview<T extends Pick<Invoice, 'id' | 'notes'>>(
  client: InvoiceUpdateClient,
  invoice: T,
  reason: ReservationReviewReason
): Promise<T & { notes: string }> {
  const marker = appendReservationReviewMarker(null, reason)
  const replaceInProgressWithMarker = `${String.raw`\1`}${marker}${String.raw`\2`}`

  const rows = await client.$queryRaw<Array<{ id: string; notes: string | null; status: string }>>`
    UPDATE "invoices"
    SET "notes" = CASE
      WHEN POSITION(${RESERVATION_SCHEDULING_IN_PROGRESS_MARKER} IN COALESCE("notes", '')) > 0 THEN
        NULLIF(
          REGEXP_REPLACE(
            COALESCE("notes", ''),
            ${reservationSchedulingInProgressPattern},
            ${replaceInProgressWithMarker},
            'g'
          ),
          ''
        )
      WHEN "notes" IS NULL OR "notes" = '' THEN ${marker}
      WHEN POSITION(${`${RESERVATION_REVIEW_MARKER}:`} IN "notes") > 0 THEN "notes"
      ELSE "notes" || '; ' || ${marker}
    END
    WHERE "id" = ${invoice.id} AND "status" = 'PAID'
    RETURNING "id", "notes", "status"
  `

  const updatedInvoice = rows[0]
  if (!updatedInvoice || updatedInvoice.status !== 'PAID') {
    throw new Error('reservation_review_invoice_not_paid')
  }

  return { ...invoice, notes: updatedInvoice.notes ?? marker }
}
