import { notifyNewEnrollment } from '@/lib/actions/notifications'
import { db } from '@/lib/db'
import {
  combineDateAndTimeUTC,
  convertRecurringScheduleFromUTC,
  formatInTimeZone,
} from '@/lib/utils/date'
import {
  sendEnrollmentConfirmationStudentEmail,
  sendNewEnrollmentTeacherEmail,
} from '@/lib/mail'

const ACTIVE_ENROLLMENT_STATUS = 'ACTIVE'
const DEFAULT_TIMEZONE = 'America/Lima'

const DAY_LABELS: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
}
type EnrollmentStatusValue = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

interface UpsertSelfServiceEnrollmentInput {
  studentId: string
  courseId: string
  academicPeriodId: string
  classesTotal: number
  teacherId?: string | null
  status?: EnrollmentStatusValue
  updateClassesTotal?: boolean
}

interface EnrollmentUniqueInput {
  studentId: string
  courseId: string
  academicPeriodId: string
}

function getEnrollmentUniqueWhere(input: EnrollmentUniqueInput) {
  return {
    studentId_courseId_academicPeriodId: {
      studentId: input.studentId,
      courseId: input.courseId,
      academicPeriodId: input.academicPeriodId,
    },
  }
}

function buildEnrollmentUpdateData(input: UpsertSelfServiceEnrollmentInput) {
  return {
    status: input.status ?? ACTIVE_ENROLLMENT_STATUS,
    ...(input.updateClassesTotal === false ? {} : { classesTotal: input.classesTotal }),
    ...(input.teacherId ? { teacherId: input.teacherId } : {}),
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

function getFullName(user: { name: string; lastName?: string | null }) {
  return `${user.name}${user.lastName ? ` ${user.lastName}` : ''}`
}

function joinLabelParts(values: string[]) {
  if (values.length === 0) {
    return ''
  }

  if (values.length === 1) {
    return values[0]
  }

  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`
}

function formatClockTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  return new Intl.DateTimeFormat('es-PE', {
    hour: 'numeric',
    ...(minutes > 0 ? { minute: '2-digit' } : {}),
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 0, 1, hours, minutes, 0)))
}

function formatTeacherScheduleSummary(
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  bookings: Array<{ day: string; timeSlot: string }>,
  timezone: string
) {
  if (schedules.length > 0) {
    const parts = schedules
      .map((schedule) => {
        const localSchedule = convertRecurringScheduleFromUTC(
          schedule.dayOfWeek,
          schedule.startTime,
          schedule.endTime,
          timezone
        )

        return {
          sortKey: `${localSchedule.dayOfWeek}-${localSchedule.startTime}`,
          label: `${DAY_LABELS[localSchedule.dayOfWeek]} a las ${formatClockTime(localSchedule.startTime)}`,
        }
      })
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map((item) => item.label)

    return joinLabelParts([...new Set(parts)])
  }

  if (bookings.length === 0) {
    return null
  }

  const parts = bookings
    .map((booking) => {
      const [startTime] = booking.timeSlot.split('-')
      const bookingDate = combineDateAndTimeUTC(booking.day, startTime)

      const weekday = formatInTimeZone(bookingDate, 'EEEE', timezone)
      const timeLabel = new Intl.DateTimeFormat('es-PE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      }).format(bookingDate)

      return `${weekday} a las ${timeLabel}`
    })

  return joinLabelParts([...new Set(parts)])
}

function getFirstScheduleOccurrence(
  schedules: Array<{ dayOfWeek: number; startTime: string }>,
  referenceDate: Date
) {
  const occurrences = schedules.map((schedule) => {
    const [hours, minutes] = schedule.startTime.split(':').map(Number)
    const candidate = new Date(referenceDate)

    candidate.setUTCHours(hours, minutes, 0, 0)

    let daysUntilTarget = schedule.dayOfWeek - candidate.getUTCDay()
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7
    }

    candidate.setUTCDate(candidate.getUTCDate() + daysUntilTarget)

    if (candidate < referenceDate) {
      candidate.setUTCDate(candidate.getUTCDate() + 7)
    }

    return candidate
  })

  if (occurrences.length === 0) {
    return null
  }

  return occurrences.sort((left, right) => left.getTime() - right.getTime())[0]
}

function getFirstClassDisplay(
  bookings: Array<{ day: string; timeSlot: string }>,
  schedules: Array<{ dayOfWeek: number; startTime: string }>,
  timezone: string,
  referenceDate: Date
) {
  const firstBooking = bookings[0]
  let classDate: Date | null = null

  if (firstBooking) {
    const [startTime] = firstBooking.timeSlot.split('-')
    classDate = combineDateAndTimeUTC(firstBooking.day, startTime)
  } else {
    classDate = getFirstScheduleOccurrence(schedules, referenceDate)
  }

  if (!classDate) {
    return null
  }

  return {
    firstClassDate: formatInTimeZone(classDate, "EEEE d 'de' MMMM 'de' yyyy", timezone),
    firstClassTime: new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    }).format(classDate),
  }
}

export async function upsertSelfServiceEnrollment(input: UpsertSelfServiceEnrollmentInput) {
  const uniqueWhere = getEnrollmentUniqueWhere(input)
  const updateData = buildEnrollmentUpdateData(input)

  const existingEnrollment = await db.enrollment.findUnique({
    where: uniqueWhere,
    select: { id: true },
  })

  if (existingEnrollment) {
    const enrollment = await db.enrollment.update({
      where: { id: existingEnrollment.id },
      data: updateData,
    })

    return { enrollment, wasCreated: false }
  }

  try {
    const enrollment = await db.enrollment.create({
      data: {
        studentId: input.studentId,
        courseId: input.courseId,
        academicPeriodId: input.academicPeriodId,
        status: input.status ?? ACTIVE_ENROLLMENT_STATUS,
        classesTotal: input.classesTotal,
        classesAttended: 0,
        classesMissed: 0,
        ...(input.teacherId ? { teacherId: input.teacherId } : {}),
      },
    })

    return { enrollment, wasCreated: true }
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error
    }

    const concurrentEnrollment = await db.enrollment.findUnique({
      where: uniqueWhere,
      select: { id: true },
    })

    if (!concurrentEnrollment) {
      throw error
    }

    const enrollment = await db.enrollment.update({
      where: { id: concurrentEnrollment.id },
      data: updateData,
    })

    return { enrollment, wasCreated: false }
  }
}

export async function notifySelfServiceEnrollmentCreated(enrollmentId: string) {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        enrollmentDate: true,
        student: {
          select: {
            name: true,
            lastName: true,
            email: true,
            timezone: true,
          },
        },
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
            timezone: true,
          },
        },
        course: {
          select: {
            title: true,
            isSynchronous: true,
          },
        },
        academicPeriod: {
          select: {
            startDate: true,
          },
        },
        schedules: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        bookings: {
          select: {
            day: true,
            timeSlot: true,
          },
          orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
        },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    const studentName = getFullName(enrollment.student)
    const teacherName = enrollment.teacher ? getFullName(enrollment.teacher) : null
    const teacherTimezone = enrollment.teacher?.timezone || DEFAULT_TIMEZONE
    const studentTimezone = enrollment.student.timezone || DEFAULT_TIMEZONE
    const teacherScheduleSummary = enrollment.teacher
      ? formatTeacherScheduleSummary(enrollment.schedules, enrollment.bookings, teacherTimezone)
      : null
    const firstClassReferenceDate = [
      new Date(),
      enrollment.enrollmentDate,
      enrollment.academicPeriod.startDate,
    ].sort((left, right) => right.getTime() - left.getTime())[0]
    const firstClassDisplay = getFirstClassDisplay(
      enrollment.bookings,
      enrollment.schedules,
      studentTimezone,
      firstClassReferenceDate
    )

    await notifyNewEnrollment({
      studentId: enrollment.studentId,
      studentName,
      teacherId: enrollment.teacherId || '',
      courseName: enrollment.course.title,
      enrollmentId: enrollment.id,
    })

    await sendEnrollmentConfirmationStudentEmail(enrollment.student.email, {
      studentName,
      courseName: enrollment.course.title,
      teacherName: teacherName || undefined,
      isSynchronousCourse: enrollment.course.isSynchronous,
      ...firstClassDisplay,
    })

    if (enrollment.teacher?.email && teacherScheduleSummary && teacherName) {
      await sendNewEnrollmentTeacherEmail(enrollment.teacher.email, {
        teacherName,
        studentName,
        courseName: enrollment.course.title,
        enrollmentDate: formatInTimeZone(new Date(), "d 'de' MMMM 'de' yyyy", teacherTimezone),
        studentScheduleSummary: teacherScheduleSummary,
      })
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar notificaciones de inscripción',
    }
  }
}