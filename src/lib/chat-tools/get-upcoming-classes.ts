import { db } from '@/lib/db'
import type { ToolResult } from '@/types/ai-chat'

function formatLocalDatetime(utcDateStr: string, utcStartTime: string, timezone: string): string {
  const [year, month, day] = utcDateStr.split('-').map(Number)
  const [hours, minutes] = utcStartTime.split(':').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

  return new Intl.DateTimeFormat('es', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(utcDate)
}

export async function handleGetUpcomingClasses(userId: string): Promise<ToolResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = user?.timezone ?? 'UTC'

    const todayUtc = new Date().toISOString().split('T')[0]

    const bookings = await db.classBooking.findMany({
      where: {
        studentId: userId,
        status: 'CONFIRMED',
        day: { gte: todayUtc },
      },
      select: {
        id: true,
        day: true,
        timeSlot: true,
        teacher: { select: { name: true } },
      },
      orderBy: { day: 'asc' },
      take: 8,
    })

    if (bookings.length === 0) {
      return {
        success: true,
        message: 'El estudiante no tiene clases próximas confirmadas.',
        data: { classes: [] },
      }
    }

    const classes = bookings.map((b) => {
      const startTime = b.timeSlot.split('-')[0]
      const localDatetime = formatLocalDatetime(b.day, startTime, timezone)
      return { id: b.id, localDatetime, teacherName: b.teacher.name }
    })

    const classListText = classes
      .map((c, i) => `${i + 1}. ${c.localDatetime} con ${c.teacherName} [ref:${c.id}]`)
      .join('\n')

    return {
      success: true,
      message: `Próximas clases del estudiante:\n${classListText}\n\nUsa el valor entre [ref:...] como bookingId al llamar reschedule_class. No muestres la referencia al usuario.`,
      data: { classes },
    }
  } catch (error) {
    console.error('[GetUpcomingClasses] Error:', error)
    return {
      success: false,
      message: 'No se pudieron obtener las próximas clases. Por favor intenta de nuevo.',
    }
  }
}
