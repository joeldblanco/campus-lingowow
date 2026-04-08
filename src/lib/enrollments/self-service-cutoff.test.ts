import { describe, expect, it } from 'vitest'

import {
  getEarlyMorningTeacherDeadline,
  getEnrollmentAdvanceCutoff,
  getFirstEligibleRecurringOccurrenceOnOrAfter,
  isOccurrenceEligibleForSelfService,
  resolveEligibleEnrollmentWindow,
} from './self-service-cutoff'

describe('self-service-cutoff', () => {
  it('allows a 6 a. m. teacher-local class when it is still before 6 p. m. the previous day', () => {
    const now = new Date('2026-04-07T12:00:00.000Z')
    const periods = [
      {
        id: 'period-4',
        name: 'Periodo 4',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-30T23:59:59.999Z'),
      },
    ]

    const result = resolveEligibleEnrollmentWindow(
      periods,
      [{ dayOfWeek: 3, startTime: '11:00', teacherTimezone: 'America/Lima' }],
      now
    )

    expect(result?.period.id).toBe('period-4')
    expect(result?.enrollmentStart.toISOString()).toBe('2026-04-07T20:00:00.000Z')
    expect(result?.firstClassAt.toISOString()).toBe('2026-04-08T11:00:00.000Z')
  })

  it('blocks a 6 a. m. teacher-local class once it reaches 6 p. m. the previous day', () => {
    const now = new Date('2026-04-07T23:00:00.000Z')
    const periods = [
      {
        id: 'period-4',
        name: 'Periodo 4',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-30T23:59:59.999Z'),
      },
    ]

    const result = resolveEligibleEnrollmentWindow(
      periods,
      [{ dayOfWeek: 3, startTime: '11:00', teacherTimezone: 'America/Lima' }],
      now
    )

    expect(result?.enrollmentStart.toISOString()).toBe('2026-04-08T07:00:00.000Z')
    expect(result?.firstClassAt.toISOString()).toBe('2026-04-15T11:00:00.000Z')
  })

  it('keeps an 8-hour minimum for non-early classes', () => {
    const allowedNow = new Date('2026-04-07T10:00:00.000Z')
    const blockedNow = new Date('2026-04-07T13:00:00.000Z')
    const cutoff = getEnrollmentAdvanceCutoff(allowedNow)

    expect(cutoff.toISOString()).toBe('2026-04-07T18:00:00.000Z')

    const eveningClass = new Date('2026-04-07T19:00:00.000Z')
    const schedule = { dayOfWeek: 2, startTime: '19:00', teacherTimezone: 'UTC' }

    expect(isOccurrenceEligibleForSelfService(eveningClass, schedule, allowedNow)).toBe(true)
    expect(isOccurrenceEligibleForSelfService(eveningClass, schedule, blockedNow)).toBe(false)
  })

  it('computes the early-morning deadline in the teacher timezone', () => {
    const occurrenceAt = new Date('2026-04-08T11:00:00.000Z')

    const deadline = getEarlyMorningTeacherDeadline(occurrenceAt, {
      dayOfWeek: 3,
      startTime: '11:00',
      teacherTimezone: 'America/Lima',
    })

    expect(deadline.toISOString()).toBe('2026-04-07T23:00:00.000Z')
  })

  it('falls forward to the next period when the current period has no eligible class after the cutoff', () => {
    const now = new Date('2026-04-30T17:30:00.000Z')
    const periods = [
      {
        id: 'period-4',
        name: 'Periodo 4',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-30T23:59:59.999Z'),
      },
      {
        id: 'period-5',
        name: 'Periodo 5',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T23:59:59.999Z'),
      },
    ]

    const result = resolveEligibleEnrollmentWindow(
      periods,
      [{ dayOfWeek: 4, startTime: '11:00', teacherTimezone: 'America/Lima' }],
      now
    )

    expect(result?.period.id).toBe('period-5')
    expect(result?.firstClassAt.toISOString()).toBe('2026-05-07T11:00:00.000Z')
  })

  it('skips to the next weekly occurrence when the first one is no longer eligible', () => {
    const now = new Date('2026-04-07T23:00:00.000Z')

    const result = getFirstEligibleRecurringOccurrenceOnOrAfter(
      { dayOfWeek: 3, startTime: '11:00', teacherTimezone: 'America/Lima' },
      new Date('2026-04-08T07:00:00.000Z'),
      new Date('2026-04-30T23:59:59.999Z'),
      now
    )

    expect(result?.toISOString()).toBe('2026-04-15T11:00:00.000Z')
  })
})