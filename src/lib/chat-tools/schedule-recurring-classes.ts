import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'
import { convertTimeSlotToUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

const UTC_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Normalize Spanish and English day names to English lowercase
const DAY_ALIASES: Record<string, string> = {
  lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', miercoles: 'wednesday',
  jueves: 'thursday', viernes: 'friday', sábado: 'saturday', sabado: 'saturday',
  domingo: 'sunday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
  friday: 'friday', saturday: 'saturday', sunday: 'sunday',
}

function normalizeDayName(day: string): string {
  return DAY_ALIASES[day.toLowerCase().trim()] ?? day.toLowerCase().trim()
}

export async function handleScheduleRecurringClasses(params: {
  userId: string
  slots: Array<{ dayOfWeek: string; localTime: string }>
}): Promise<ToolResult> {
  try {
    const { userId, slots } = params

    // 1. Get timezone and active enrollment in the current academic period
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = user?.timezone ?? 'UTC'

    const now = new Date()

    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: userId,
        status: EnrollmentStatus.ACTIVE,
        academicPeriod: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      include: {
        academicPeriod: { select: { startDate: true, endDate: true, name: true } },
        course: { select: { classDuration: true } },
      },
      orderBy: { enrollmentDate: 'desc' },
    })

    if (!enrollment) {
      return {
        success: false,
        message: 'NO_ENROLLMENT: El usuario no tiene inscripción activa en el período actual. Inicia el flujo de pago para que pueda inscribirse.',
      }
    }

    const classDuration = enrollment.course?.classDuration ?? 40
    const periodStart = new Date(enrollment.academicPeriod.startDate)
    const periodEnd = new Date(enrollment.academicPeriod.endDate)
    periodStart.setUTCHours(0, 0, 0, 0)
    periodEnd.setUTCHours(23, 59, 59, 999)

    // Guard: period should already be current given the query above, but double-check
    if (now > periodEnd) {
      const endedOn = periodEnd.toISOString().split('T')[0]
      return {
        success: false,
        message: `NO_ENROLLMENT: El período "${enrollment.academicPeriod.name}" finalizó el ${endedOn}. No hay inscripción activa en un período vigente. Inicia el flujo de pago.`,
      }
    }

    const iterStart = now > periodStart ? now : periodStart

    // Normalize requested days to English lowercase (handles Spanish input from Gemini)
    const normalizedSlots = slots.map((s) => ({
      dayOfWeek: normalizeDayName(s.dayOfWeek),
      localTime: s.localTime,
    }))

    const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const localDayFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      weekday: 'long',
    })

    console.log('[RecurringClasses] period:', enrollment.academicPeriod.name, 'start:', periodStart.toISOString(), 'end:', periodEnd.toISOString())
    console.log('[RecurringClasses] iterStart:', iterStart.toISOString(), 'now:', now.toISOString())
    console.log('[RecurringClasses] normalizedSlots:', JSON.stringify(normalizedSlots))
    console.log('[RecurringClasses] timezone:', timezone, 'classDuration:', classDuration)

    let scheduledCount = 0
    let skippedCount = 0
    const scheduledSummary: string[] = []

    // 2. Iterate every day in the period
    const cursor = new Date(iterStart)
    cursor.setUTCHours(12, 0, 0, 0) // noon UTC avoids DST edge cases

    while (cursor <= periodEnd) {
      const localDayName = localDayFormatter.format(cursor).toLowerCase()
      const matchingSlot = normalizedSlots.find((s) => s.dayOfWeek === localDayName)

      if (matchingSlot) {
        const localDate = localDateFormatter.format(cursor) // YYYY-MM-DD in student TZ

        // Compute local end time
        const [startH, startM] = matchingSlot.localTime.split(':').map(Number)
        const endTotalMin = startH * 60 + startM + classDuration
        const endH = Math.floor(endTotalMin / 60) % 24
        const endM = endTotalMin % 60
        const localTimeSlot = `${matchingSlot.localTime}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

        // Convert to UTC
        const utcData = convertTimeSlotToUTC(localDate, localTimeSlot, timezone)
        const [utcStart, utcEnd] = utcData.timeSlot.split('-')

        console.log(`[RecurringClasses] ${localDate} ${matchingSlot.localTime} → UTC day:${utcData.day} slot:${utcData.timeSlot}`)

        // Skip if student already has a booking at this time
        const studentConflict = await db.classBooking.findFirst({
          where: {
            studentId: userId,
            day: utcData.day,
            timeSlot: { startsWith: utcStart },
            status: { not: 'CANCELLED' },
          },
        })
        if (studentConflict) {
          console.log(`[RecurringClasses]   SKIP: student conflict`)
          skippedCount++
          cursor.setDate(cursor.getDate() + 1)
          continue
        }

        // Get UTC day of week for availability lookup
        const utcDateObj = new Date(`${utcData.day}T${utcStart}:00Z`)
        const utcDayOfWeek = UTC_DAY_NAMES[utcDateObj.getUTCDay()]

        // Find teachers available on this UTC day/time
        const rawTeachers = await db.teacherAvailability.findMany({
          where: {
            day: utcDayOfWeek,
            startTime: { lte: utcStart },
            endTime: { gte: utcEnd },
          },
          select: { userId: true },
        })

        console.log(`[RecurringClasses]   utcDayOfWeek:${utcDayOfWeek} startTime<=${utcStart} endTime>=${utcEnd} → ${rawTeachers.length} raw teachers`)

        const seen = new Set<string>()
        const availableTeachers = rawTeachers.filter((t) => {
          if (seen.has(t.userId)) return false
          seen.add(t.userId)
          return true
        })

        if (availableTeachers.length === 0) {
          skippedCount++
          cursor.setDate(cursor.getDate() + 1)
          continue
        }

        // Filter out teachers already booked for this specific date
        const bookedTeachers = await db.classBooking.findMany({
          where: {
            day: utcData.day,
            timeSlot: { startsWith: utcStart },
            status: { not: 'CANCELLED' },
          },
          select: { teacherId: true },
        })
        const bookedIds = new Set(bookedTeachers.map((b) => b.teacherId))
        const freeTeachers = availableTeachers.filter((t) => !bookedIds.has(t.userId))

        if (freeTeachers.length === 0) {
          skippedCount++
          cursor.setDate(cursor.getDate() + 1)
          continue
        }

        // Prefer the enrollment's assigned teacher
        let selectedTeacherId = freeTeachers[0].userId
        if (
          enrollment.teacherId &&
          freeTeachers.some((t) => t.userId === enrollment.teacherId)
        ) {
          selectedTeacherId = enrollment.teacherId
        }

        // Create the booking
        try {
          await db.classBooking.create({
            data: {
              studentId: userId,
              teacherId: selectedTeacherId,
              enrollmentId: enrollment.id,
              day: utcData.day,
              timeSlot: utcData.timeSlot,
              status: 'CONFIRMED',
            },
          })
          scheduledCount++
          const slotLabel = `${matchingSlot.dayOfWeek} ${matchingSlot.localTime}`
          if (!scheduledSummary.includes(slotLabel)) scheduledSummary.push(slotLabel)
        } catch (err) {
          if ((err as { code?: string }).code === 'P2002') {
            skippedCount++ // Unique constraint — already exists
          }
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    if (scheduledCount === 0) {
      const reason = skippedCount > 0
        ? `${skippedCount} fechas fueron omitidas — todas con conflictos de horario o sin profesores disponibles.`
        : `No se encontraron fechas en el período para los días solicitados (${normalizedSlots.map(s => s.dayOfWeek).join(', ')}).`
      return {
        success: false,
        message: `No se pudo agendar ninguna clase en el período "${enrollment.academicPeriod.name}". ${reason} Contacta al equipo de Lingowow si necesitas ayuda.`,
      }
    }

    const skippedNote =
      skippedCount > 0
        ? ` ${skippedCount} fecha(s) fueron omitidas por conflictos o falta de disponibilidad.`
        : ''

    return {
      success: true,
      message: `Se agendaron ${scheduledCount} clases en el período "${enrollment.academicPeriod.name}" para los horarios recurrentes: ${scheduledSummary.join(', ')}.${skippedNote}`,
      data: { scheduledCount, skippedCount, scheduledDays: scheduledSummary },
    }
  } catch (error) {
    console.error('[ScheduleRecurringClasses] Error:', error)
    return {
      success: false,
      message: 'No se pudieron agendar las clases recurrentes. Por favor intenta de nuevo.',
    }
  }
}
