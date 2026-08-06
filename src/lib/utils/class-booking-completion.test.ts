import { describe, expect, it } from 'vitest'

import {
  getClassAutoCompletionDate,
  isClassBookingCompleted,
  shouldAutoCompleteClassBooking,
} from './class-booking-completion'

describe('class-booking-completion', () => {
  it('returns the scheduled end timestamp from the class time slot', () => {
    const completionDate = getClassAutoCompletionDate('2026-04-06', '14:00-15:30')

    expect(completionDate?.toISOString()).toBe('2026-04-06T15:30:00.000Z')
  })

  it('uses the following day when a class ends after midnight', () => {
    const completionDate = getClassAutoCompletionDate('2026-04-06', '23:40-00:20')

    expect(completionDate?.toISOString()).toBe('2026-04-07T00:20:00.000Z')
  })

  it('does not auto-complete without teacher attendance', () => {
    const result = shouldAutoCompleteClassBooking(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-15:00',
        teacherAttendances: [],
      },
      new Date('2026-04-06T15:30:00.000Z')
    )

    expect(result).toBe(false)
  })

  it('does not auto-complete before the scheduled end time', () => {
    const result = shouldAutoCompleteClassBooking(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-14:40',
        teacherAttendances: [{ id: 'teacher-attendance-1' }],
      },
      new Date('2026-04-06T14:39:59.000Z')
    )

    expect(result).toBe(false)
  })

  it('auto-completes at the scheduled end time when teacher attendance exists', () => {
    const result = shouldAutoCompleteClassBooking(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-14:40',
        teacherAttendances: [{ id: 'teacher-attendance-1' }],
      },
      new Date('2026-04-06T14:40:00.000Z')
    )

    expect(result).toBe(true)
  })

  it('treats persisted completions as completed', () => {
    const result = isClassBookingCompleted(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-15:00',
        completedAt: new Date('2026-04-06T15:00:00.000Z'),
        teacherAttendances: [],
      },
      new Date('2026-04-06T14:30:00.000Z')
    )

    expect(result).toBe(true)
  })

  it('never auto-completes cancelled classes', () => {
    const result = isClassBookingCompleted(
      {
        status: 'CANCELLED',
        day: '2026-04-06',
        timeSlot: '14:00-15:00',
        teacherAttendances: [{ id: 'teacher-attendance-1' }],
      },
      new Date('2026-04-06T15:30:00.000Z')
    )

    expect(result).toBe(false)
  })
})
