import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS = 8
export const SELF_SERVICE_EARLY_CLASS_LOCAL_HOUR_THRESHOLD = 9
export const SELF_SERVICE_EARLY_CLASS_PREVIOUS_DAY_DEADLINE_HOUR = 18
export const DEFAULT_TEACHER_TIMEZONE = 'America/Lima'

export interface RecurringScheduleSlot {
  dayOfWeek: number
  startTime: string
  teacherTimezone?: string | null
}

export interface AcademicPeriodCandidate {
  id?: string
  name?: string
  startDate: Date
  endDate: Date
}

export interface EligibleEnrollmentWindow<TPeriod extends AcademicPeriodCandidate> {
  period: TPeriod
  enrollmentStart: Date
  firstClassAt: Date
}

export function getEnrollmentAdvanceCutoff(
  now: Date = new Date(),
  advanceHours: number = SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS
): Date {
  return new Date(now.getTime() + advanceHours * 60 * 60 * 1000)
}

export function getFirstRecurringOccurrenceOnOrAfter(
  schedule: RecurringScheduleSlot,
  referenceDate: Date
): Date {
  const [hours, minutes] = schedule.startTime.split(':').map(Number)
  const candidate = new Date(referenceDate)

  candidate.setUTCHours(hours, minutes, 0, 0)

  let daysUntilTarget = schedule.dayOfWeek - candidate.getUTCDay()
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7
  }

  candidate.setUTCDate(candidate.getUTCDate() + daysUntilTarget)

  if (candidate.getTime() < referenceDate.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7)
  }

  return candidate
}

export function getUtcOccurrenceForDate(date: Date, schedule: RecurringScheduleSlot): Date {
  const [hours, minutes] = schedule.startTime.split(':').map(Number)

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0
    )
  )
}

function getScheduleTimezone(schedule: RecurringScheduleSlot): string {
  return schedule.teacherTimezone || DEFAULT_TEACHER_TIMEZONE
}

export function isEarlyMorningTeacherLocalOccurrence(
  occurrenceAt: Date,
  schedule: RecurringScheduleSlot,
  hourThreshold: number = SELF_SERVICE_EARLY_CLASS_LOCAL_HOUR_THRESHOLD
): boolean {
  const teacherLocalDate = toZonedTime(occurrenceAt, getScheduleTimezone(schedule))
  return teacherLocalDate.getHours() < hourThreshold
}

export function getEarlyMorningTeacherDeadline(
  occurrenceAt: Date,
  schedule: RecurringScheduleSlot,
  deadlineHour: number = SELF_SERVICE_EARLY_CLASS_PREVIOUS_DAY_DEADLINE_HOUR
): Date {
  const timezone = getScheduleTimezone(schedule)
  const teacherLocalDate = toZonedTime(occurrenceAt, timezone)
  const deadlineLocal = new Date(teacherLocalDate)

  deadlineLocal.setDate(deadlineLocal.getDate() - 1)
  deadlineLocal.setHours(deadlineHour, 0, 0, 0)

  return fromZonedTime(deadlineLocal, timezone)
}

export function isOccurrenceEligibleForSelfService(
  occurrenceAt: Date,
  schedule: RecurringScheduleSlot,
  now: Date = new Date(),
  advanceHours: number = SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS
): boolean {
  const baseCutoff = getEnrollmentAdvanceCutoff(now, advanceHours)

  if (occurrenceAt.getTime() < baseCutoff.getTime()) {
    return false
  }

  if (!isEarlyMorningTeacherLocalOccurrence(occurrenceAt, schedule)) {
    return true
  }

  const earlyMorningDeadline = getEarlyMorningTeacherDeadline(occurrenceAt, schedule)
  return now.getTime() < earlyMorningDeadline.getTime()
}

export function getFirstEligibleRecurringOccurrenceOnOrAfter(
  schedule: RecurringScheduleSlot,
  referenceDate: Date,
  periodEnd: Date,
  now: Date = new Date(),
  advanceHours: number = SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS
): Date | null {
  let candidate = getFirstRecurringOccurrenceOnOrAfter(schedule, referenceDate)

  while (candidate.getTime() <= periodEnd.getTime()) {
    if (isOccurrenceEligibleForSelfService(candidate, schedule, now, advanceHours)) {
      return candidate
    }

    candidate = new Date(candidate)
    candidate.setUTCDate(candidate.getUTCDate() + 7)
  }

  return null
}

export function getFirstRecurringOccurrenceInPeriod(
  schedules: RecurringScheduleSlot[],
  referenceDate: Date,
  periodEnd: Date,
  now: Date = new Date(),
  advanceHours: number = SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS
): Date | null {
  const occurrences = schedules
    .map((schedule) =>
      getFirstEligibleRecurringOccurrenceOnOrAfter(
        schedule,
        referenceDate,
        periodEnd,
        now,
        advanceHours
      )
    )
    .filter((candidate): candidate is Date => candidate !== null)
    .sort((left, right) => left.getTime() - right.getTime())

  return occurrences[0] ?? null
}

export function resolveEligibleEnrollmentWindow<TPeriod extends AcademicPeriodCandidate>(
  periods: TPeriod[],
  schedules: RecurringScheduleSlot[],
  now: Date = new Date(),
  advanceHours: number = SELF_SERVICE_ENROLLMENT_ADVANCE_HOURS
): EligibleEnrollmentWindow<TPeriod> | null {
  const cutoff = getEnrollmentAdvanceCutoff(now, advanceHours)
  const sortedPeriods = [...periods].sort(
    (left, right) => left.startDate.getTime() - right.startDate.getTime()
  )

  for (const period of sortedPeriods) {
    const enrollmentStart =
      cutoff.getTime() > period.startDate.getTime() ? cutoff : new Date(period.startDate)
    const firstClassAt = getFirstRecurringOccurrenceInPeriod(
      schedules,
      enrollmentStart,
      period.endDate,
      now,
      advanceHours
    )

    if (firstClassAt) {
      return {
        period,
        enrollmentStart,
        firstClassAt,
      }
    }
  }

  return null
}