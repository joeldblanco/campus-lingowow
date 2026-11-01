import { describe, expect, it, vi } from 'vitest'
import {
  appendReservationSchedulingInProgressMarker,
  appendReservationReviewMarker,
  classifyReservationReviewReason,
  clearReservationSchedulingInProgressMarker,
  persistReservationReview,
} from './paid-reservation-review'

describe('paid reservation review marker', () => {
  it('marks a newly paid invoice as scheduling in progress without duplicating notes', () => {
    const notes = appendReservationSchedulingInProgressMarker('payment-auth')

    expect(notes).toBe('payment-auth; reservation_pending_review:scheduling_in_progress')
    expect(appendReservationSchedulingInProgressMarker(notes)).toBe(notes)
  })

  it('clears only the in-progress marker and returns the authoritative invoice row', async () => {
    const client = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'invoice-1',
          notes: 'payment-auth',
          status: 'PAID',
        },
      ]),
    }

    const updated = await clearReservationSchedulingInProgressMarker(client, 'invoice-1')

    expect(updated).toEqual({ id: 'invoice-1', notes: 'payment-auth', status: 'PAID' })
    expect(client.$queryRaw).toHaveBeenCalledTimes(1)
    const values = client.$queryRaw.mock.calls[0].slice(1)
    expect(values).toContain('reservation_pending_review:scheduling_in_progress')
  })

  it('preserves notes and appends at most one safe marker', () => {
    const notes = 'Niubiz Order ID: order-1'
    const marked = appendReservationReviewMarker(notes, 'schedule_conflict')

    expect(marked).toBe(`${notes}; reservation_pending_review:schedule_conflict`)
    expect(appendReservationReviewMarker(marked, 'schedule_conflict')).toBe(marked)
    expect(appendReservationReviewMarker(marked, 'scheduling_failed')).toBe(marked)
  })

  it('uses one conditional database update without persisting raw errors', async () => {
    const client = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'invoice-1',
          notes: 'payment-auth; reservation_pending_review:scheduling_failed',
          status: 'PAID',
        },
      ]),
    }
    const invoice = { id: 'invoice-1', notes: 'payment-auth' }

    await persistReservationReview(client, invoice, 'scheduling_failed')

    expect(client.$queryRaw).toHaveBeenCalledTimes(1)
    const values = client.$queryRaw.mock.calls[0].slice(1)
    expect(values).toContain('reservation_pending_review:scheduling_failed')
    expect(values).not.toContain('payment-auth; reservation_pending_review:scheduling_failed')
    expect(values.some((value: unknown) => String(value).includes('Error:'))).toBe(false)
  })

  it('replaces the in-progress marker with a classified marker without duplicating notes', async () => {
    const client = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'invoice-1',
          notes: 'payment-auth; reservation_pending_review:schedule_conflict',
          status: 'PAID',
        },
      ]),
    }

    const invoice = {
      id: 'invoice-1',
      notes: 'payment-auth; reservation_pending_review:scheduling_in_progress',
    }

    const updated = await persistReservationReview(client, invoice, 'schedule_conflict')

    expect(updated.notes).toBe('payment-auth; reservation_pending_review:schedule_conflict')
    expect(client.$queryRaw).toHaveBeenCalledTimes(1)
    const values = client.$queryRaw.mock.calls[0].slice(1)
    expect(values).toContain('reservation_pending_review:schedule_conflict')
    expect(values).not.toContain('payment-auth; reservation_pending_review:schedule_conflict')
  })

  it('fails closed when the invoice is missing or no longer paid', async () => {
    const client = { $queryRaw: vi.fn().mockResolvedValue([]) }

    await expect(
      persistReservationReview(client, { id: 'invoice-1', notes: null }, 'scheduling_failed')
    ).rejects.toThrow('reservation_review_invoice_not_paid')
  })

  it('maps only safe reason codes', () => {
    expect(classifyReservationReviewReason({ code: 'P2002' })).toBe('schedule_conflict')
    expect(classifyReservationReviewReason(new Error('database unavailable'))).toBe(
      'scheduling_failed'
    )
  })
})
