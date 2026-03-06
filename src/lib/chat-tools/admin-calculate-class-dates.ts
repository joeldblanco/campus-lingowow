import { db } from '@/lib/db'
import type { ToolResult } from '@/types/ai-chat'

const DAY_ALIASES: Record<string, string> = {
  lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', miercoles: 'wednesday',
  jueves: 'thursday', viernes: 'friday', sábado: 'saturday', sabado: 'saturday',
  domingo: 'sunday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
  friday: 'friday', saturday: 'saturday', sunday: 'sunday',
}

const DAY_LABELS_ES: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

function normalizeDayName(day: string): string {
  return DAY_ALIASES[day.toLowerCase().trim()] ?? day.toLowerCase().trim()
}

export async function handleAdminCalculateClassDates(params: {
  slots: Array<{ dayOfWeek: string; localTime: string }>
  periodQuery: string
  timezone: string
}): Promise<ToolResult> {
  try {
    const { slots, periodQuery, timezone } = params
    const now = new Date()

    const normalizedSlots = slots.map((s) => ({
      dayOfWeek: normalizeDayName(s.dayOfWeek),
      localTime: s.localTime,
    }))

    const query = periodQuery.toLowerCase().trim()

    let period: { id: string; name: string; startDate: Date; endDate: Date } | null = null
    let isPastPeriod = false
    let isProrrated = false

    if (query === 'actual' || query === 'current' || query === 'corriente' || query === '') {
      period = await db.academicPeriod.findFirst({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { id: true, name: true, startDate: true, endDate: true },
      })
      if (period) {
        isProrrated = true
      }
    } else if (query === 'siguiente' || query === 'next' || query === 'próximo' || query === 'proximo') {
      period = await db.academicPeriod.findFirst({
        where: {
          startDate: { gt: now },
        },
        orderBy: { startDate: 'asc' },
        select: { id: true, name: true, startDate: true, endDate: true },
      })
    } else {
      period = await db.academicPeriod.findFirst({
        where: {
          name: { contains: periodQuery.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, startDate: true, endDate: true },
      })

      if (period) {
        if (new Date(period.endDate) < now) {
          isPastPeriod = true
        } else if (new Date(period.startDate) <= now && new Date(period.endDate) >= now) {
          isProrrated = true
        }
      }
    }

    if (!period) {
      const available = await db.academicPeriod.findMany({
        orderBy: { startDate: 'desc' },
        take: 5,
        select: { name: true, startDate: true, endDate: true },
      })
      const periodList = available
        .map((p) => `- ${p.name} (${p.startDate.toISOString().split('T')[0]} a ${p.endDate.toISOString().split('T')[0]})`)
        .join('\n')
      return {
        success: false,
        message: `No se encontró un período que coincida con "${periodQuery}". Períodos disponibles:\n${periodList}`,
      }
    }

    const periodStart = new Date(period.startDate)
    const periodEnd = new Date(period.endDate)
    periodStart.setUTCHours(0, 0, 0, 0)
    periodEnd.setUTCHours(23, 59, 59, 999)

    const iterStart = isProrrated && now > periodStart ? now : periodStart

    const localDayFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      weekday: 'long',
    })
    const localDateFormatter = new Intl.DateTimeFormat('es', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const dates: Array<{ date: string; formattedDate: string; dayOfWeek: string; localTime: string }> = []

    const cursor = new Date(iterStart)
    cursor.setUTCHours(12, 0, 0, 0)

    while (cursor <= periodEnd) {
      const localDayName = localDayFormatter.format(cursor).toLowerCase()
      const matchingSlot = normalizedSlots.find((s) => s.dayOfWeek === localDayName)

      if (matchingSlot) {
        const isoDate = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`
        const formattedDate = localDateFormatter.format(cursor)

        dates.push({
          date: isoDate,
          formattedDate,
          dayOfWeek: DAY_LABELS_ES[matchingSlot.dayOfWeek] ?? matchingSlot.dayOfWeek,
          localTime: matchingSlot.localTime,
        })
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    if (dates.length === 0) {
      return {
        success: true,
        message: `No hay fechas para los días solicitados en el período "${period.name}" (${periodStart.toISOString().split('T')[0]} a ${periodEnd.toISOString().split('T')[0]}).`,
        data: { dates: [], period: period.name },
      }
    }

    const slotsLabel = normalizedSlots
      .map((s) => `${DAY_LABELS_ES[s.dayOfWeek] ?? s.dayOfWeek} ${s.localTime}`)
      .join(', ')

    const dateList = dates
      .map((d, i) => `${i + 1}. ${d.formattedDate} a las ${d.localTime} (${d.dayOfWeek})`)
      .join('\n')

    let headerNote = ''
    if (isPastPeriod) {
      headerNote = '⚠️ NOTA: Este es un período que ya pasó.\n\n'
    } else if (isProrrated) {
      headerNote = '📋 Fechas prorrateadas (solo fechas futuras del período actual).\n\n'
    }

    const periodLabel = `${period.name} (${periodStart.toISOString().split('T')[0]} a ${periodEnd.toISOString().split('T')[0]})`

    return {
      success: true,
      message: `${headerNote}Fechas de clases para "${slotsLabel}" en el período ${periodLabel} (${timezone}):\n\n${dateList}\n\nTotal: ${dates.length} clases.`,
      data: {
        dates,
        period: period.name,
        totalClasses: dates.length,
        isProrrated,
        isPastPeriod,
      },
    }
  } catch (error) {
    console.error('[AdminCalculateClassDates] Error:', error)
    return {
      success: false,
      message: 'Error al calcular las fechas de clases. Por favor intenta de nuevo.',
    }
  }
}
