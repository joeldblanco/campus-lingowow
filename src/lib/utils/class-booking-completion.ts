export interface ClassBookingCompletionInput {
  status: string
  day: string
  timeSlot: string
  completedAt?: Date | null
  teacherAttendances?: Array<{ id: string }> | null
}

function parseClassEnd(day: string, timeSlot: string): Date | null {
  const [startTime, endTime] = timeSlot.split('-').map((value) => value.trim())
  if (!startTime || !endTime) {
    return null
  }

  const [year, month, dayOfMonth] = day.split('-').map(Number)
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  if (
    [year, month, dayOfMonth, startHour, startMinute, endHour, endMinute].some((value) =>
      Number.isNaN(value)
    )
  ) {
    return null
  }

  const classStart = new Date(Date.UTC(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0))
  const classEnd = new Date(Date.UTC(year, month - 1, dayOfMonth, endHour, endMinute, 0, 0))

  if (classEnd.getTime() <= classStart.getTime()) {
    classEnd.setUTCDate(classEnd.getUTCDate() + 1)
  }

  return classEnd
}

export function getClassAutoCompletionDate(
  day: string,
  timeSlot: string
): Date | null {
  return parseClassEnd(day, timeSlot)
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
