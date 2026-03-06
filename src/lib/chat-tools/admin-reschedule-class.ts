import { db } from '@/lib/db'
import { convertTimeSlotToUTC } from '@/lib/utils/date'
import type { ToolResult } from '@/types/ai-chat'

const UTC_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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

export async function handleAdminGetStudentClasses(params: {
  studentNameOrEmail: string
}): Promise<ToolResult> {
  try {
    const { studentNameOrEmail } = params
    const isEmail = studentNameOrEmail.includes('@')

    let studentId: string
    let studentName: string
    let timezone: string

    if (isEmail) {
      const user = await db.user.findFirst({
        where: { email: { equals: studentNameOrEmail.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, timezone: true },
      })
      if (!user) {
        return { success: false, message: `No se encontró usuario con correo "${studentNameOrEmail}".` }
      }
      studentId = user.id
      studentName = user.name ?? studentNameOrEmail
      timezone = user.timezone ?? 'UTC'
    } else {
      const users = await db.user.findMany({
        where: { name: { contains: studentNameOrEmail.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, email: true, timezone: true },
        take: 5,
      })

      if (users.length === 0) {
        return { success: false, message: `No se encontró ningún usuario con el nombre "${studentNameOrEmail}".` }
      }
      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email})`).join('\n')
        return {
          success: false,
          message: `Se encontraron ${users.length} usuarios:\n${list}\nPide al admin que confirme cuál.`,
        }
      }

      studentId = users[0].id
      studentName = users[0].name ?? studentNameOrEmail
      timezone = users[0].timezone ?? 'UTC'
    }

    const todayUtc = new Date().toISOString().split('T')[0]

    const bookings = await db.classBooking.findMany({
      where: {
        studentId,
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
      take: 15,
    })

    if (bookings.length === 0) {
      return {
        success: true,
        message: `"${studentName}" no tiene clases próximas confirmadas.`,
        data: { classes: [], studentName },
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
      message: `Próximas clases de "${studentName}" (${timezone}):\n${classListText}\n\nUsa el valor entre [ref:...] como bookingId para reagendar. No muestres la referencia al admin.`,
      data: { classes, studentName, timezone },
    }
  } catch (error) {
    console.error('[AdminGetStudentClasses] Error:', error)
    return { success: false, message: 'Error al obtener las clases del estudiante.' }
  }
}

export async function handleAdminRescheduleClass(params: {
  bookingId: string
  newLocalDate: string
  newLocalTime: string
}): Promise<ToolResult> {
  try {
    const { bookingId, newLocalDate, newLocalTime } = params

    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, name: true, timezone: true } },
        enrollment: { select: { id: true, teacherId: true, course: { select: { classDuration: true } } } },
      },
    })

    if (!booking) {
      return { success: false, message: `No se encontró la clase con ID "${bookingId}".` }
    }

    if (booking.status !== 'CONFIRMED') {
      return { success: false, message: `Solo se pueden reagendar clases con estado CONFIRMED. Esta clase tiene estado "${booking.status}".` }
    }

    const timezone = booking.student.timezone ?? 'UTC'
    const classDuration = booking.enrollment.course?.classDuration ?? 40

    const [startH, startM] = newLocalTime.split(':').map(Number)
    const endTotalMin = startH * 60 + startM + classDuration
    const endH = Math.floor(endTotalMin / 60) % 24
    const endM = endTotalMin % 60
    const localTimeSlot = `${newLocalTime}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    const utcData = convertTimeSlotToUTC(newLocalDate, localTimeSlot, timezone)
    const [utcStart, utcEnd] = utcData.timeSlot.split('-')

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
      return { success: false, message: `No hay profesores disponibles el ${newLocalDate} a las ${newLocalTime} (${timezone}).` }
    }

    const bookedTeachers = await db.classBooking.findMany({
      where: {
        day: utcData.day,
        timeSlot: { startsWith: utcStart },
        status: { not: 'CANCELLED' },
        id: { not: bookingId },
      },
      select: { teacherId: true },
    })
    const bookedIds = new Set(bookedTeachers.map((b) => b.teacherId))
    const freeTeachers = availableTeachers.filter((t) => !bookedIds.has(t.userId))

    if (freeTeachers.length === 0) {
      return { success: false, message: `Todos los profesores están ocupados el ${newLocalDate} a las ${newLocalTime}. Intenta otro horario.` }
    }

    let selectedTeacherId = freeTeachers[0].userId
    if (booking.enrollment.teacherId && freeTeachers.some((t) => t.userId === booking.enrollment.teacherId)) {
      selectedTeacherId = booking.enrollment.teacherId
    }

    await db.classBooking.update({
      where: { id: bookingId },
      data: {
        day: utcData.day,
        timeSlot: utcData.timeSlot,
        teacherId: selectedTeacherId,
      },
    })

    return {
      success: true,
      message: `Clase de "${booking.student.name}" reagendada correctamente al ${newLocalDate} a las ${newLocalTime} (${timezone}).`,
      data: { bookingId, newDate: newLocalDate, newTime: newLocalTime },
    }
  } catch (error) {
    console.error('[AdminRescheduleClass] Error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return { success: false, message: 'Ya existe una clase en ese horario exacto para ese profesor. Elige otro horario.' }
    }
    return { success: false, message: 'Error al reagendar la clase. Por favor intenta de nuevo.' }
  }
}
