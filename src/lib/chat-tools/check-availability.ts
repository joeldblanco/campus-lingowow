import { db } from '@/lib/db'
import { convertAvailabilityToUTC, convertAvailabilityFromUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

const DAY_ALIASES: Record<string, string> = {
  lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', miercoles: 'wednesday',
  jueves: 'thursday', viernes: 'friday', sábado: 'saturday', sabado: 'saturday',
  domingo: 'sunday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
  friday: 'friday', saturday: 'saturday', sunday: 'sunday',
}

const UTC_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Returns up to 5 alternative time slots on the same LOCAL day as `localDay`.
 * Queries both the given UTC day and the adjacent UTC day to account for
 * timezone crossings (e.g. Lima 20:00 = UTC Wednesday 01:00 for a Tuesday slot).
 */
async function getAlternativesForLocalDay(
  localDay: string,
  utcDay: string,
  timezone: string
): Promise<string[]> {
  const utcDayIdx = UTC_DAY_NAMES.indexOf(utcDay)
  const nextUtcDay = UTC_DAY_NAMES[(utcDayIdx + 1) % 7]

  const rows = await db.teacherAvailability.findMany({
    where: { day: { in: [utcDay, nextUtcDay] } },
    distinct: ['startTime'],
    orderBy: { startTime: 'asc' },
    take: 30,
  })

  const seen = new Set<string>()
  const result: string[] = []

  for (const row of rows) {
    const local = convertAvailabilityFromUTC(row.day, row.startTime, row.endTime, timezone)
    if (local.day !== localDay) continue
    const label = `las ${local.startTime}`
    if (seen.has(label)) continue
    seen.add(label)
    result.push(label)
    if (result.length >= 5) break
  }

  return result
}

export async function handleCheckAvailability(params: {
  dayOfWeek: string
  localTime: string
  timezone: string
}): Promise<ToolResult> {
  try {
    const { localTime, timezone } = params
    const dayOfWeek = DAY_ALIASES[params.dayOfWeek.toLowerCase().trim()] ?? params.dayOfWeek.toLowerCase()

    // Build a 40-minute slot (default class duration) — must match schedule_recurring_classes
    // Using 1 hour caused false positives for evening slots because 1h after 23:xx wraps to "00:xx"
    // which always passes the "endTime >= '00:xx'" string comparison
    const [hours, minutes] = localTime.split(':').map(Number)
    const endTotalMin = hours * 60 + minutes + 40
    const endHours = Math.floor(endTotalMin / 60) % 24
    const endMins = endTotalMin % 60
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

    // Convert the requested local slot to UTC
    const utcSlot = convertAvailabilityToUTC(dayOfWeek, localTime, endTime, timezone)

    // Find teachers with availability covering the requested UTC slot
    const rawTeachers = await db.teacherAvailability.findMany({
      where: {
        day: utcSlot.day,
        startTime: { lte: utcSlot.startTime },
        endTime: { gte: utcSlot.endTime },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    // Deduplicate: a teacher with multiple overlapping slots counts as one
    const seen = new Set<string>()
    const availableTeachers = rawTeachers.filter((t) => {
      if (seen.has(t.userId)) return false
      seen.add(t.userId)
      return true
    })

    if (availableTeachers.length === 0) {
      const altLocalTimes = await getAlternativesForLocalDay(dayOfWeek, utcSlot.day, timezone)
      return {
        success: false,
        message:
          altLocalTimes.length > 0
            ? `El horario del ${dayOfWeek} a las ${localTime} no está disponible. Horarios alternativos el mismo día: ${altLocalTimes.join(', ')}.`
            : `El horario del ${dayOfWeek} a las ${localTime} no está disponible y no hay otros horarios para ese día. Por favor elige otro día de la semana.`,
        data: { available: false, alternatives: altLocalTimes },
      }
    }

    // Check for conflicting bookings on the next occurrence of that UTC day
    const dayNames = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ]
    const targetDayIdx = dayNames.indexOf(utcSlot.day.toLowerCase())
    const now = new Date()
    const nowDayIdx = now.getUTCDay()
    let daysUntil = targetDayIdx - nowDayIdx
    if (daysUntil <= 0) daysUntil += 7
    const targetDate = new Date(now)
    targetDate.setUTCDate(now.getUTCDate() + daysUntil)
    const targetDateStr = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.getUTCDate()).padStart(2, '0')}`

    const conflictingBookings = await db.classBooking.findMany({
      where: {
        day: targetDateStr,
        timeSlot: { startsWith: utcSlot.startTime },
        status: 'CONFIRMED',
      },
      select: { teacherId: true },
    })

    const bookedTeacherIds = new Set(conflictingBookings.map((b) => b.teacherId))
    const freeTeachers = availableTeachers.filter((t) => !bookedTeacherIds.has(t.userId))

    if (freeTeachers.length === 0) {
      const altLocalTimes = await getAlternativesForLocalDay(dayOfWeek, utcSlot.day, timezone)
      const busyNames = availableTeachers.map((t) => t.user.name ?? 'Sin nombre')
      return {
        success: false,
        message: altLocalTimes.length > 0
          ? `El horario del ${dayOfWeek} a las ${localTime} está ocupado (profesores con horario pero ya con clase: ${busyNames.join(', ')}). Horarios alternativos el mismo día: ${altLocalTimes.join(', ')}.`
          : `El horario del ${dayOfWeek} a las ${localTime} está ocupado y no hay otros horarios disponibles para ese día.`,
        data: { available: false, alternatives: altLocalTimes, busyTeachers: busyNames },
      }
    }

    const teacherNames = freeTeachers.map((t) => t.user.name ?? 'Sin nombre')

    return {
      success: true,
      message: `El horario del ${dayOfWeek} a las ${localTime} (${timezone}) está disponible. Profesores disponibles: ${teacherNames.join(', ')} (${freeTeachers.length} en total).`,
      data: { available: true, teacherCount: freeTeachers.length, teacherNames },
    }
  } catch (error) {
    console.error('[CheckAvailability] Error:', error)
    return {
      success: false,
      message:
        'No se pudo verificar la disponibilidad en este momento. Por favor intenta de nuevo.',
    }
  }
}
