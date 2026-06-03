import { db } from '@/lib/db'
import { convertAvailabilityToUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

const DAY_ALIASES: Record<string, string> = {
  lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', miercoles: 'wednesday',
  jueves: 'thursday', viernes: 'friday', sábado: 'saturday', sabado: 'saturday',
  domingo: 'sunday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
  friday: 'friday', saturday: 'saturday', sunday: 'sunday',
}

export async function handleCheckAvailability(params: {
  slots: Array<{ dayOfWeek: string; localTime: string }>
  timezone: string
  /**
   * Optional: the student the schedule is for. When provided, a teacher who is
   * busy ONLY because of THIS student's own class is NOT counted as unavailable,
   * and the result flags slots the student already has booked (compared by the
   * real UTC instant, regardless of which timezone label is used).
   */
  studentNameOrEmail?: string
}): Promise<ToolResult> {
  try {
    const { slots, timezone, studentNameOrEmail } = params

    if (!slots || slots.length === 0) {
      return {
        success: false,
        message: 'No se proporcionaron horarios para verificar disponibilidad.',
      }
    }

    // Resolve the target student (if named). Lets us ignore the student's OWN
    // bookings when deciding whether a teacher is free, and tell the admin when
    // the student already has that exact class.
    let targetStudentId: string | null = null
    if (studentNameOrEmail?.trim()) {
      const q = studentNameOrEmail.trim()
      const student = q.includes('@')
        ? await db.user.findFirst({
            where: { email: { equals: q, mode: 'insensitive' } },
            select: { id: true },
          })
        : await db.user.findFirst({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true },
          })
      targetStudentId = student?.id ?? null
    }

    // Keep track of teachers available for EVERY requested slot
    let commonAvailableTeachers: { id: string; name: string }[] | null = null
    const missingAvailabilityDetails = []
    // Slots the target student already has booked (same UTC instant).
    const alreadyBooked: string[] = []

    // For calculating the target date for conflict checks
    const now = new Date()
    const nowDayIdx = now.getUTCDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    for (const slot of slots) {
      const { localTime } = slot
      const dayOfWeek = DAY_ALIASES[slot.dayOfWeek.toLowerCase().trim()] ?? slot.dayOfWeek.toLowerCase()

      // Calculate 40-minute duration
      const [hours, minutes] = localTime.split(':').map(Number)
      const endTotalMin = hours * 60 + minutes + 40
      const endHours = Math.floor(endTotalMin / 60) % 24
      const endMins = endTotalMin % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

      // Convert to UTC
      const utcSlot = convertAvailabilityToUTC(dayOfWeek, localTime, endTime, timezone)

      // 1. Find teachers with availability config matching this slot
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

      // Deduplicate configured teachers
      const configuredMap = new Map<string, { id: string; name: string }>()
      for (const t of rawTeachers) {
        if (!configuredMap.has(t.userId)) {
          configuredMap.set(t.userId, { id: t.userId, name: t.user.name ?? 'Sin nombre' })
        }
      }

      // 2. Find teachers who are already booked at this EXACT time on the NEXT occurrence
      const targetDayIdx = dayNames.indexOf(utcSlot.day.toLowerCase())
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
        select: { teacherId: true, studentId: true, teacher: { select: { name: true } } },
      })

      // A teacher is "busy" only if booked with someone OTHER than the target
      // student — a teacher already teaching THIS student at this slot is exactly
      // who we want, not a conflict.
      const bookedTeacherIds = new Set(
        conflictingBookings.filter((b) => b.studentId !== targetStudentId).map((b) => b.teacherId)
      )

      // Does the target student already have this exact class? (same UTC instant)
      if (targetStudentId) {
        const own = conflictingBookings.find((b) => b.studentId === targetStudentId)
        if (own) {
          alreadyBooked.push(`${slot.dayOfWeek} ${localTime} (con ${own.teacher?.name ?? 'su profesor'})`)
        }
      }

      // 3. Filter configured teachers that are NOT booked
      const freeTeachersForSlot: { id: string; name: string }[] = []
      for (const [userId, user] of configuredMap.entries()) {
        if (!bookedTeacherIds.has(userId)) {
          freeTeachersForSlot.push(user)
        }
      }

      if (freeTeachersForSlot.length === 0) {
         missingAvailabilityDetails.push(`Para el ${dayOfWeek} a las ${localTime} no hay profesores disponibles.`)
      }

      // 4. Intersect with previous slots
      if (commonAvailableTeachers === null) {
        commonAvailableTeachers = freeTeachersForSlot
      } else {
        const currentIds = new Set(freeTeachersForSlot.map(t => t.id))
        commonAvailableTeachers = commonAvailableTeachers.filter(t => currentIds.has(t.id))
      }
    }

    // Leading note when the student already has some of these exact classes, so
    // the assistant tells the admin instead of looping or proposing a new teacher.
    const alreadyNote = alreadyBooked.length
      ? `NOTA IMPORTANTE: el estudiante YA tiene clase agendada en: ${alreadyBooked.join('; ')}. Es el MISMO instante aunque la zona horaria mostrada difiera (p. ej. 6pm Venezuela = 5pm Chicago). No agendes duplicados; si el admin pidió justamente eso, infórmale que ya está cubierto. `
      : ''

    if (missingAvailabilityDetails.length > 0) {
      return {
        success: false,
        message: alreadyNote + missingAvailabilityDetails.join(' ') + ' El estudiante debe tener el mismo profesor para todas sus clases, por favor pídele al admin que proponga otros horarios.',
        data: { available: false, alreadyBooked }
      }
    }

    if (!commonAvailableTeachers || commonAvailableTeachers.length === 0) {
       const summary = slots.map(s => `${s.dayOfWeek} ${s.localTime}`).join(', ')
       return {
         success: false,
         message: `${alreadyNote}Ningún profesor tiene disponibilidad para atender TODOS los horarios solicitados al mismo tiempo (${summary}). Por favor pídele al admin que proponga horarios distintos.`,
         data: { available: false, alreadyBooked }
       }
    }

    const teacherNames = commonAvailableTeachers.map((t) => t.name)

    return {
      success: true,
      message: `${alreadyNote}¡Horarios disponibles! Los siguientes profesores pueden cubrir TODOS los horarios solicitados: ${teacherNames.join(', ')}.`,
      data: { available: true, teacherCount: commonAvailableTeachers.length, teacherNames, alreadyBooked },
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
