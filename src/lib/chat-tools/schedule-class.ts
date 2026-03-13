import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'
import { convertTimeSlotToUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

export async function handleScheduleClass(params: {
  userId: string
  localDate: string // YYYY-MM-DD in student's local timezone
  localTime: string // HH:MM start time in student's local timezone
}): Promise<ToolResult> {
  try {
    const { userId, localDate, localTime } = params

    // 1. Get student's timezone and active enrollment in the current academic period
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

    // 2. Compute end time from course's class duration (default 40 min)
    const classDuration = enrollment.course?.classDuration ?? 40
    const [startH, startM] = localTime.split(':').map(Number)
    const endTotalMin = startH * 60 + startM + classDuration
    const endH = Math.floor(endTotalMin / 60) % 24
    const endM = endTotalMin % 60
    const localTimeSlot = `${localTime}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    // 3. Convert local date + time slot to UTC
    const utcData = convertTimeSlotToUTC(localDate, localTimeSlot, timezone)
    const [utcStart, utcEnd] = utcData.timeSlot.split('-')

    // 4. Validate the date is within the enrollment's academic period
    const classDate = new Date(localDate + 'T12:00:00')
    const periodStart = new Date(enrollment.academicPeriod.startDate)
    const periodEnd = new Date(enrollment.academicPeriod.endDate)
    periodStart.setHours(0, 0, 0, 0)
    periodEnd.setHours(23, 59, 59, 999)

    if (classDate < periodStart || classDate > periodEnd) {
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      return {
        success: false,
        message: `La fecha ${localDate} está fuera del período académico activo "${enrollment.academicPeriod.name}" (${fmt(periodStart)} – ${fmt(periodEnd)}). Consulta con el equipo de Lingowow para más información.`,
      }
    }

    // 5. Check the student doesn't already have a class at this time
    const studentConflict = await db.classBooking.findFirst({
      where: {
        studentId: userId,
        day: utcData.day,
        timeSlot: { startsWith: utcStart },
        status: { not: 'CANCELLED' },
      },
    })
    if (studentConflict) {
      return {
        success: false,
        message: `Ya tienes una clase agendada el ${localDate} a las ${localTime}. Elige otro horario.`,
      }
    }

    // 6. Get UTC day-of-week to query TeacherAvailability (which stores day names)
    const utcDateObj = new Date(`${utcData.day}T${utcStart}:00Z`)
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const utcDayOfWeek = DAY_NAMES[utcDateObj.getUTCDay()]

    // 7. Find teachers with recurring availability for this UTC day/time
    const rawTeachers = await db.teacherAvailability.findMany({
      where: {
        day: utcDayOfWeek,
        startTime: { lte: utcStart },
        endTime: { gte: utcEnd },
      },
      select: { userId: true },
    })

    // Deduplicate: a teacher with multiple overlapping slots counts as one
    const seenTeachers = new Set<string>()
    const availableTeachers = rawTeachers.filter((t) => {
      if (seenTeachers.has(t.userId)) return false
      seenTeachers.add(t.userId)
      return true
    })

    if (availableTeachers.length === 0) {
      return {
        success: false,
        message: `No hay profesores con disponibilidad para ese horario. Verifica otros horarios con check_teacher_availability.`,
      }
    }

    // 8. Filter out teachers already booked for this specific UTC date
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
      return {
        success: false,
        message: `Todos los profesores disponibles están ocupados el ${localDate} a las ${localTime}. Intenta con otro horario.`,
      }
    }

    // 9. Prefer the teacher assigned to the student's enrollment, otherwise pick any free one
    let selectedTeacherId = freeTeachers[0].userId
    if (enrollment.teacherId && freeTeachers.some((t) => t.userId === enrollment.teacherId)) {
      selectedTeacherId = enrollment.teacherId
    }

    // 10. Create the ClassBooking
    const booking = await db.classBooking.create({
      data: {
        studentId: userId,
        teacherId: selectedTeacherId,
        enrollmentId: enrollment.id,
        day: utcData.day,
        timeSlot: utcData.timeSlot,
        status: 'CONFIRMED',
      },
    })

    return {
      success: true,
      message: `Clase agendada correctamente para el ${localDate} a las ${localTime} (hora local). El profesor asignado será notificado. ID de reserva interno: ${booking.id}.`,
      data: { bookingId: booking.id },
    }
  } catch (error) {
    console.error('[ScheduleClass] Error:', error)
    // P2002 = unique constraint violation (teacher double-booked)
    if ((error as { code?: string }).code === 'P2002') {
      return {
        success: false,
        message: 'Ya existe una clase en ese horario exacto. Por favor elige otro horario.',
      }
    }
    return {
      success: false,
      message: 'No se pudo agendar la clase en este momento. Por favor intenta de nuevo.',
    }
  }
}
