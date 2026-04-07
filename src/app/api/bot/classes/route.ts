import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { formatFullName } from '@/lib/utils/name-formatter'

/**
 * GET /api/bot/classes
 * List class bookings with filters
 * Query params:
 *   enrollmentId — filter by enrollment
 *   studentEmail — filter by student email
 *   teacherId — filter by teacher
 *   status — CONFIRMED, PENDING, COMPLETED, CANCELLED, NO_SHOW
 *   from — YYYY-MM-DD start date
 *   to — YYYY-MM-DD end date
 *   limit — max results (default 50, max 100)
 * Auth: API Key with scope 'enrollments:read'
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const enrollmentId = searchParams.get('enrollmentId')
    const studentEmail = searchParams.get('studentEmail')
    const teacherId = searchParams.get('teacherId')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (enrollmentId) where.enrollmentId = enrollmentId
    if (studentEmail) where.student = { email: studentEmail }
    if (teacherId) where.teacherId = teacherId
    if (status) where.status = status
    const isValidDate = (str: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
      const [y, m, d] = str.split('-').map(Number)
      if (m < 1 || m > 12 || d < 1) return false
      const daysInMonth = new Date(y, m, 0).getDate()
      return d <= daysInMonth
    }
    if (from) {
      if (!isValidDate(from)) {
        return NextResponse.json({ error: 'Fecha "from" inválida. Usa YYYY-MM-DD con valores de fecha reales' }, { status: 400 })
      }
      where.day = { ...(where.day || {}), gte: from }
    }
    if (to) {
      if (!isValidDate(to)) {
        return NextResponse.json({ error: 'Fecha "to" inválida. Usa YYYY-MM-DD con valores de fecha reales' }, { status: 400 })
      }
      where.day = { ...(where.day || {}), lte: to }
    }

    const bookings = await db.classBooking.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            timezone: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
                title: true,
                classDuration: true,
              },
            },
          },
        },
        attendances: {
          select: {
            status: true,
            timestamp: true,
          },
        },
      },
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: bookings.map((b) => ({
        id: b.id,
        day: b.day,
        timeSlot: b.timeSlot,
        status: b.status,
        student: {
          id: b.student.id,
          name: formatFullName(b.student.name, b.student.lastName),
          email: b.student.email,
        },
        teacher: {
          id: b.teacher.id,
          name: formatFullName(b.teacher.name, b.teacher.lastName),
          timezone: b.teacher.timezone,
        },
        course: b.enrollment.course,
        enrollmentId: b.enrollment.id,
        attendance: b.attendances.length > 0 ? b.attendances[0].status : null,
        isPayable: b.isPayable,
        completedAt: b.completedAt,
        cancelledAt: b.cancelledAt,
      })),
      count: bookings.length,
    })
  } catch (error) {
    console.error('[BOT API] Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Error al obtener clases' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bot/classes
 * Create individual class bookings for an existing enrollment
 * Body: {
 *   enrollmentId: string,
 *   classes: [{
 *     date: string,      // "YYYY-MM-DD"
 *     startTime: string,  // "HH:MM" in teacher's local time
 *     endTime: string,    // "HH:MM" in teacher's local time
 *   }]
 * }
 * Auth: API Key with scope 'enrollments:write'
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { enrollmentId, classes } = body

    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId es requerido' }, { status: 400 })
    }
    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json({ error: 'classes es requerido (array de clases)' }, { status: 400 })
    }

    // Fetch enrollment with teacher
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        teacher: { select: { id: true, timezone: true } },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    if (!enrollment.teacherId || !enrollment.teacher) {
      return NextResponse.json(
        { error: 'La inscripción no tiene profesor asignado. Asigna un profesor primero.' },
        { status: 400 }
      )
    }

    const teacherId = enrollment.teacherId
    const teacherTimezone = enrollment.teacher.timezone || 'America/Lima'
    const { convertTimeSlotToUTC } = await import('@/lib/utils/date')

    let created = 0
    const skipped: string[] = []

    for (const cls of classes) {
      if (!cls.date || !cls.startTime || !cls.endTime) {
        skipped.push(`${cls.date || '?'}: datos incompletos`)
        continue
      }

      const localTimeSlot = `${cls.startTime}-${cls.endTime}`
      const utcData = convertTimeSlotToUTC(cls.date, localTimeSlot, teacherTimezone)

      // Check if slot is already booked
      const existingBooking = await db.classBooking.findUnique({
        where: {
          teacherId_day_timeSlot: {
            teacherId,
            day: utcData.day,
            timeSlot: utcData.timeSlot,
          },
        },
      })

      if (existingBooking) {
        skipped.push(`${cls.date} ${cls.startTime}-${cls.endTime}: horario ya ocupado`)
      } else {
        await db.classBooking.create({
          data: {
            studentId: enrollment.studentId,
            teacherId,
            enrollmentId: enrollment.id,
            day: utcData.day,
            timeSlot: utcData.timeSlot,
            status: 'CONFIRMED',
          },
        })
        created++
      }
    }

    // Update classesTotal on enrollment
    await db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        classesTotal: { increment: created },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        classesCreated: created,
        classesSkipped: skipped.length,
        skippedDetails: skipped,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[BOT API] Error creating classes:', error)
    return NextResponse.json(
      { error: 'Error al crear clases' },
      { status: 500 }
    )
  }
}
