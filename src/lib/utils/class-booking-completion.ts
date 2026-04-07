export const AUTO_COMPLETE_AFTER_START_MINUTES = 60

export interface ClassBookingCompletionInput {
  status: string
  day: string
  timeSlot: string
  completedAt?: Date | null
  teacherAttendances?: Array<{ id: string }> | null
}

function parseClassStart(day: string, timeSlot: string): Date | null {
  const [startTime] = timeSlot.split('-').map((value) => value.trim())
  if (!startTime) {
    return null
  }

  const [year, month, dayOfMonth] = day.split('-').map(Number)
  const [startHour, startMinute] = startTime.split(':').map(Number)

  if (
    [year, month, dayOfMonth, startHour, startMinute].some((value) => Number.isNaN(value))
  ) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0))
}

export function getClassAutoCompletionDate(
  day: string,
  timeSlot: string
): Date | null {
  const classStart = parseClassStart(day, timeSlot)
  if (!classStart) {
    return null
  }

  return new Date(classStart.getTime() + AUTO_COMPLETE_AFTER_START_MINUTES * 60 * 1000)
}

export function shouldAutoCompleteClassBooking(
  booking: ClassBookingCompletionInput,
  now: Date = new Date()
): boolean {
  if (booking.status === 'CANCELLED') {
    return false
  }

  if (!booking.teacherAttendances || booking.teacherAttendances.length === 0) {
    return false
  }

  const autoCompletionDate = getClassAutoCompletionDate(booking.day, booking.timeSlot)
  if (!autoCompletionDate) {
    return false
  }

  return now.getTime() >= autoCompletionDate.getTime()
}

export function isClassBookingCompleted(
  booking: ClassBookingCompletionInput,
  now: Date = new Date()
): boolean {
  if (booking.status === 'CANCELLED') {
    return false
  }

  if (booking.status === 'COMPLETED' || Boolean(booking.completedAt)) {
    return true
  }

  return shouldAutoCompleteClassBooking(booking, now)
}