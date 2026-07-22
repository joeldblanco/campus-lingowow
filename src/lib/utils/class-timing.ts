/**
 * Class timing helpers for student and teacher dashboards.
 */

export function getClassStartAndEnd(classDate: string, classTime: string): { start: Date; end: Date } {
  const [year, month, day] = classDate.split('-').map(Number)
  const parts = classTime.split('-').map((p) => p.trim())
  const [startH, startM] = parts[0].split(':').map(Number)
  const start = new Date(year, month - 1, day, startH, startM, 0, 0)

  let end: Date
  if (parts.length > 1 && parts[1]) {
    const [endH, endM] = parts[1].split(':').map(Number)
    end = new Date(year, month - 1, day, endH, endM, 0, 0)
  } else {
    // Default duration 60 mins
    end = new Date(start.getTime() + 60 * 60000)
  }
  return { start, end }
}

export function isClassTimeReached(classDate: string, classTime: string, now: Date): boolean {
  const { start, end } = getClassStartAndEnd(classDate, classTime)
  // Student can join between 5 min before start and class end time
  return now.getTime() >= start.getTime() - 5 * 60000 && now.getTime() <= end.getTime()
}

export function isClassFinished(classDate: string, classTime: string, now: Date): boolean {
  const { end } = getClassStartAndEnd(classDate, classTime)
  return now.getTime() > end.getTime()
}

export function getClassTimeLabel(classDate: string, classTime: string, now: Date): string {
  const { start, end } = getClassStartAndEnd(classDate, classTime)
  if (now.getTime() > end.getTime()) {
    return 'Clase finalizada'
  }
  const diffMinutesTotal = Math.round((start.getTime() - now.getTime()) / 60000)
  if (diffMinutesTotal <= 0) {
    return 'Tu clase está empezando'
  } else if (diffMinutesTotal < 60) {
    return `Tu clase empieza en ${diffMinutesTotal} min`
  } else {
    const diffHours = Math.floor(diffMinutesTotal / 60)
    return `Tu clase empieza en ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  }
}
