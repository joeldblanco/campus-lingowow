import { describe, expect, it, vi } from 'vitest'
import {
  appendReservationReviewMarker,
  classifyReservationReviewReason,
  persistReservationReview,
} from './paid-reservation-review'

describe('paid reservation review marker', () => {
  it('preserves notes and appends at most one safe marker', () => {
    const notes = 'Niubiz Order ID: order-1'
    const marked = appendReservationReviewMarker(notes, 'schedule_conflict')

    expect(marked).toBe(`${notes}; reservation_pending_review:schedule_conflict`)
    expect(appendReservationReviewMarker(marked, 'schedule_conflict')).toBe(marked)
    expect(appendReservationReviewMarker(marked, 'scheduling_failed')).toBe(marked)
  })

  it('uses one conditional database update without persisting raw errors', async () => {
    const client = { $executeRaw: vi.fn().mockResolvedValue(1) }
    const invoice = { id: 'invoice-1', notes: 'payment-auth' }

    await persistReservationReview(client, invoice, 'scheduling_failed')

    expect(client.$executeRaw).toHaveBeenCalledTimes(1)
    const values = client.$executeRaw.mock.calls[0].slice(1)
    expect(values).toContain('payment-auth; reservation_pending_review:scheduling_failed')
    expect(values.some((value: unknown) => String(value).includes('Error:'))).toBe(false)
  })

  it('maps only safe reason codes', () => {
    expect(classifyReservationReviewReason({ code: 'P2002' })).toBe('schedule_conflict')
    expect(classifyReservationReviewReason(new Error('database unavailable'))).toBe(
      'scheduling_failed'
    )
  })
})
