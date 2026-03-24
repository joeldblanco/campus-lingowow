import { db } from '@/lib/db'
import { EnrollmentStatus, UserRole } from '@prisma/client'
import { convertTimeSlotToUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

const UTC_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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

export async function handleAdminScheduleClass(params: {
  studentNameOrEmail: string
  teacherId?: string
  slots: Array<{ dayOfWeek: string; localTime: string }>
  adminTimezone: string
}): Promise<ToolResult> {
  try {
    const { studentNameOrEmail, teacherId, slots, adminTimezone } = params
    const isEmail = studentNameOrEmail.includes('@')

    let student: { id: string; name: string | null; email: string | null; roles: UserRole[]; timezone: string } | null = null

    if (isEmail) {
      student = await db.user.findFirst({
        where: { email: { equals: studentNameOrEmail.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, email: true, roles: true, timezone: true },
      })
    } else {
      const users = await db.user.findMany({
        where: { name: { contains: studentNameOrEmail.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, email: true, roles: true, timezone: true },
        take: 5,
      })

      if (users.length === 0) {
        return {
          success: false,
          message: `No se encontró ningún usuario con el nombre "${studentNameOrEmail}". Intenta con otro nombre o correo.`,
        }
      }

      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email}) [${u.roles.join(', ')}]`).join('\n')
        return {
          success: false,
          message: `Se encontraron ${users.length} usuarios:\n${list}\nPide al admin que confirme cuál.`,
          data: { code: 'MULTIPLE_USERS', users: users.map((u) => ({ name: u.name, email: u.email })) },
        }
      }

      student = users[0]
    }

    if (!student) {
      return {
        success: false,
        message: `No se encontró el usuario "${studentNameOrEmail}".`,
      }
    }

    // Priority: student's DB timezone (most reliable), then admin-provided (as override for student's location), then fallback
    const studentTimezone = student.timezone || adminTimezone || 'America/Lima'

    if (student.roles.includes(UserRole.GUEST) && !student.roles.includes(UserRole.STUDENT)) {
      await db.user.update({
        where: { id: student.id },
        data: { roles: { push: UserRole.STUDENT } },
      })
      console.log(`[AdminScheduleClass] Promoted GUEST "${student.name}" to STUDENT`)
    }

    const now = new Date()

    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
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
        message: `El estudiante "${student.name}" no tiene inscripción activa en el período actual. Primero debe inscribirse (generar factura y completar pago).`,
        data: { code: 'NO_ENROLLMENT' },
      }
    }

    const classDuration = enrollment.course?.classDuration ?? 40
    const periodStart = new Date(enrollment.academicPeriod.startDate)
    const periodEnd = new Date(enrollment.academicPeriod.endDate)
    periodStart.setUTCHours(0, 0, 0, 0)
    periodEnd.setUTCHours(23, 59, 59, 999)

    const iterStart = now > periodStart ? now : periodStart

    const normalizedSlots = slots.map((s) => ({
      dayOfWeek: normalizeDayName(s.dayOfWeek),
      localTime: s.localTime,
    }))

    const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: studentTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const localDayFormatter = new Intl.DateTimeFormat('en', {
      timeZone: studentTimezone,
      weekday: 'long',
    })

    let scheduledCount = 0
    let skippedCount = 0
    const scheduledSummary: string[] = []

    const cursor = new Date(iterStart)
    cursor.setUTCHours(12, 0, 0, 0)

    while (cursor <= periodEnd) {
      const localDayName = localDayFormatter.format(cursor).toLowerCase()
      const matchingSlot = normalizedSlots.find((s) => s.dayOfWeek === localDayName)

      if (matchingSlot) {
        const localDate = localDateFormatter.format(cursor)

        const [startH, startM] = matchingSlot.localTime.split(':').map(Number)
        const endTotalMin = startH * 60 + startM + classDuration
        const endH = Math.floor(endTotalMin / 60) % 24
        const endM = endTotalMin % 60
        const localTimeSlot = `${matchingSlot.localTime}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

        const utcData = convertTimeSlotToUTC(localDate, localTimeSlot, studentTimezone)
        const [utcStart, utcEnd] = utcData.timeSlot.split('-')

        const studentConflict = await db.classBooking.findFirst({
          where: {
            studentId: student.id,
            day: utcData.day,
            timeSlot: { startsWith: utcStart },
            status: { not: 'CANCELLED' },
          },
        })
        if (studentConflict) {
          skippedCount++
          cursor.setDate(cursor.getDate() + 1)
          continue
        }

        const utcDateObj = new Date(`${utcData.day}T${utcStart}:00Z`)
        const utcDayOfWeek = UTC_DAY_NAMES[utcDateObj.getUTCDay()]

        const rawTeachers = await db.teacherAvailability.findMany({
          where: {
            day: utcDayOfWeek,
            startTime: { lte: utcStart },
            endTime: { gte: utcEnd },
          },
          select: { userId: true },
        })

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

        let selectedTeacherId = freeTeachers[0].userId

        // Prefer the passed teacherId, then the enrollment's teacherId
        const preferredTeacherId = teacherId || enrollment.teacherId
        if (preferredTeacherId && freeTeachers.some((t) => t.userId === preferredTeacherId)) {
          selectedTeacherId = preferredTeacherId
        } else if (preferredTeacherId) {
          skippedCount++
          cursor.setDate(cursor.getDate() + 1)
          continue
        }

        try {
          await db.classBooking.create({
            data: {
              studentId: student.id,
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
            skippedCount++
          }
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    if (scheduledCount === 0) {
      const reason = skippedCount > 0
        ? `${skippedCount} fechas omitidas por conflictos o falta de profesores.`
        : `No se encontraron fechas en el período para los días solicitados.`
      return {
        success: false,
        message: `No se pudo agendar ninguna clase para "${student.name}" en el período "${enrollment.academicPeriod.name}". ${reason}`,
      }
    }

    const skippedNote = skippedCount > 0
      ? ` ${skippedCount} fecha(s) omitidas por conflictos o falta de disponibilidad.`
      : ''

    return {
      success: true,
      message: `Se agendaron ${scheduledCount} clases para "${student.name}" en el período "${enrollment.academicPeriod.name}". Horarios recurrentes: ${scheduledSummary.join(', ')}.${skippedNote} (Zona horaria: ${studentTimezone})`,
      data: { scheduledCount, skippedCount, scheduledDays: scheduledSummary, studentName: student.name },
    }
  } catch (error) {
    console.error('[AdminScheduleClass] Error:', error)
    return {
      success: false,
      message: 'Error al agendar las clases. Por favor intenta de nuevo.',
    }
  }
}
