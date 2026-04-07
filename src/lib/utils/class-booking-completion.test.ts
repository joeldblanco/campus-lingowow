import { describe, expect, it } from 'vitest'

import {
  AUTO_COMPLETE_AFTER_START_MINUTES,
  getClassAutoCompletionDate,
  isClassBookingCompleted,
  shouldAutoCompleteClassBooking,
} from './class-booking-completion'

describe('class-booking-completion', () => {
  it('returns the auto-completion timestamp 60 minutes after class start', () => {
    const completionDate = getClassAutoCompletionDate('2026-04-06', '14:00-15:00')

    expect(completionDate?.toISOString()).toBe('2026-04-06T15:00:00.000Z')
    expect(AUTO_COMPLETE_AFTER_START_MINUTES).toBe(60)
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

  it('does not auto-complete before 60 minutes from class start', () => {
    const result = shouldAutoCompleteClassBooking(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-15:00',
        teacherAttendances: [{ id: 'teacher-attendance-1' }],
      },
      new Date('2026-04-06T14:59:59.000Z')
    )

    expect(result).toBe(false)
  })

  it('auto-completes after 60 minutes from class start when teacher attendance exists', () => {
    const result = shouldAutoCompleteClassBooking(
      {
        status: 'CONFIRMED',
        day: '2026-04-06',
        timeSlot: '14:00-15:00',
        teacherAttendances: [{ id: 'teacher-attendance-1' }],
      },
      new Date('2026-04-06T15:00:00.000Z')
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