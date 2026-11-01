import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { formatFullName } from '@/lib/utils/name-formatter'
import { EnrollmentStatus } from '@prisma/client'
import { verifyPaypalTransaction, createInvoiceFromPaypal } from '@/lib/actions/commercial'
import { notifySelfServiceEnrollmentCreated } from '@/lib/enrollments/self-service-enrollment'

class EnrollmentRequestError extends Error {
  constructor(
    readonly status: number,
    readonly payload: Record<string, unknown>
  ) {
    super('Enrollment request failed')
  }
}

/**
 * GET /api/bot/enrollments
 * List enrollments with filters
 * Query params: studentId, courseId, status, limit, offset
 * Auth: API Key with scope 'enrollments:read'
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const studentEmail = searchParams.get('studentEmail')
    const courseId = searchParams.get('courseId')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (studentId) where.studentId = studentId
    if (studentEmail) where.student = { email: studentEmail }
    if (courseId) where.courseId = courseId
    if (status) where.status = status as EnrollmentStatus

    const [enrollments, total] = await Promise.all([
      db.enrollment.findMany({
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
          course: {
            select: {
              id: true,
              title: true,
              language: true,
              level: true,
              classDuration: true,
              isSynchronous: true,
            },
          },
          academicPeriod: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              isActive: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
          schedules: {
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              teacherId: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
        orderBy: { enrollmentDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.enrollment.count({ where }),
    ])

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

    return NextResponse.json({
      success: true,
      data: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        progress: e.progress,
        enrollmentDate: e.enrollmentDate,
        classesTotal: e.classesTotal,
        classesAttended: e.classesAttended,
        classesMissed: e.classesMissed,
        student: {
          id: e.student.id,
          name: formatFullName(e.student.name, e.student.lastName),
          email: e.student.email,
        },
        course: e.course,
        academicPeriod: {
          id: e.academicPeriod.id,
          name: e.academicPeriod.name,
          startDate: e.academicPeriod.startDate.toISOString().split('T')[0],
          endDate: e.academicPeriod.endDate.toISOString().split('T')[0],
        },
        teacher: e.teacher
          ? {
              id: e.teacher.id,
              name: formatFullName(e.teacher.name, e.teacher.lastName),
            }
          : null,
        schedules: e.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayName: dayNames[s.dayOfWeek],
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        totalBookings: e._count.bookings,
      })),
      pagination: { total, limit, offset },
    })
  } catch (error) {
    console.error('[BOT API] Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Error al obtener inscripciones' }, { status: 500 })
  }
}

/**
 * POST /api/bot/enrollments
 * Create a new enrollment with optional schedule and PayPal verification
 * Body: {
 *   studentEmail: string,         // Email del estudiante (se busca o crea)
 *   studentName?: string,         // Nombre (requerido si es estudiante nuevo)
 *   studentLastName?: string,     // Apellido (opcional)
 *   courseId: string,             // ID del curso
 *   academicPeriodId: string,    // ID del periodo academico
 *   teacherId?: string,          // ID del profesor asignado
 *   paypalOrderId?: string,      // ID de PayPal para verificar (orden, factura o pago)
 *   classesTotal?: number,       // Total de clases (default 8)
 *   weeklySchedule?: [{          // Horario semanal recurrente
 *     dayOfWeek: number,         // 0=Dom, 1=Lun, ... 6=Sab
 *     startTime: string,         // "HH:MM" en hora local del profesor
 *     endTime: string,           // "HH:MM" en hora local del profesor
 *   }],
 *   scheduledClasses?: [{        // Clases individuales a crear
 *     date: string,              // "YYYY-MM-DD"
 *     startTime: string,         // "HH:MM"
 *     endTime: string,           // "HH:MM"
 *   }],
 *   notes?: string,
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
    const {
      studentEmail,
      studentName,
      studentLastName,
      courseId,
      academicPeriodId,
      teacherId,
      paypalOrderId,
      classesTotal,
      weeklySchedule,
      scheduledClasses,
      notes,
    } = body

    // Validate required fields
    if (!studentEmail) {
      return NextResponse.json({ error: 'studentEmail es requerido' }, { status: 400 })
    }
    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 })
    }
    if (!academicPeriodId) {
      return NextResponse.json({ error: 'academicPeriodId es requerido' }, { status: 400 })
    }

    // Verify course exists before opening the write transaction.
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, classDuration: true, isSynchronous: true },
    })
    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Verify academic period exists before opening the write transaction.
    const academicPeriod = await db.academicPeriod.findUnique({
      where: { id: academicPeriodId },
    })
    if (!academicPeriod) {
      return NextResponse.json({ error: 'Período académico no encontrado' }, { status: 404 })
    }

    // Verify the external payment before opening the write transaction.
    let paypalData = null
    if (paypalOrderId) {
      const paypalCheck = await verifyPaypalTransaction(paypalOrderId)
      if (!paypalCheck.success || !paypalCheck.data) {
        return NextResponse.json(
          { success: false, error: paypalCheck.error || 'Error al verificar el pago de PayPal' },
          { status: 400 }
        )
      }

      paypalData = paypalCheck.data
    }

    // Determine enrollment status from the already verified period.
    const now = new Date()
    let enrollmentStatus: EnrollmentStatus
    if (academicPeriod.startDate > now) {
      enrollmentStatus = EnrollmentStatus.PENDING
    } else if (academicPeriod.endDate < now) {
      enrollmentStatus = EnrollmentStatus.COMPLETED
    } else {
      enrollmentStatus = EnrollmentStatus.ACTIVE
    }

    const { createdEnrollment, schedulesCreated, classesCreated } = await db.$transaction(async (tx) => {
      // All local writes, including a newly created student and PayPal invoice, commit together.
      let student = await tx.user.findUnique({ where: { email: studentEmail } })
      if (!student) {
        if (!studentName) {
          throw new EnrollmentRequestError(400, {
            error: 'studentName es requerido cuando el estudiante no existe en el sistema',
          })
        }
        student = await tx.user.create({
          data: {
            email: studentEmail,
            name: studentName,
            lastName: studentLastName || null,
            roles: ['STUDENT'],
            status: 'ACTIVE',
          },
        })
      }

      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_courseId_academicPeriodId: {
            studentId: student.id,
            courseId,
            academicPeriodId,
          },
        },
      })
      if (existingEnrollment) {
        throw new EnrollmentRequestError(409, {
          error: 'El estudiante ya está inscrito en este curso para este período académico',
          existingEnrollmentId: existingEnrollment.id,
        })
      }

      const resolvedTeacherId = teacherId
      if (teacherId) {
        const teacher = await tx.user.findUnique({
          where: { id: teacherId },
          select: { id: true, roles: true },
        })
        if (!teacher || !teacher.roles.includes('TEACHER')) {
          throw new EnrollmentRequestError(404, {
            error: 'Profesor no encontrado o no tiene rol TEACHER',
          })
        }
      }

      if (paypalData) {
        const existingInvoice = await tx.invoice.findFirst({ where: { paypalOrderId } })
        if (existingInvoice) {
          throw new EnrollmentRequestError(409, {
            success: false,
            error: 'Este pago de PayPal ya está asociado a otra factura/inscripción',
          })
        }
      }

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId,
          academicPeriodId,
          teacherId: resolvedTeacherId || null,
          status: enrollmentStatus,
          progress: 0,
          classesTotal: classesTotal || scheduledClasses?.length || 8,
          classesAttended: 0,
          classesMissed: 0,
          enrollmentType: 'MANUAL',
          notes: notes || null,
        },
      })

      if (paypalData) {
        const invoiceResult = await createInvoiceFromPaypal(paypalData, student.id, tx)
        if (!invoiceResult.success) {
          throw new EnrollmentRequestError(500, {
            success: false,
            error: 'Error al generar la factura. La inscripción ha sido revertida.',
          })
        }
      }

      let schedulesCreated = 0
      if (weeklySchedule && weeklySchedule.length > 0 && resolvedTeacherId) {
        const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
        const teacher = await tx.user.findUnique({
          where: { id: resolvedTeacherId },
          select: { timezone: true },
        })
        const teacherTimezone = teacher?.timezone || 'America/Lima'

        for (const slot of weeklySchedule) {
          const utcData = convertRecurringScheduleToUTC(
            slot.dayOfWeek,
            slot.startTime,
            slot.endTime,
            teacherTimezone
          )
          await tx.classSchedule.create({
            data: {
              enrollmentId: enrollment.id,
              teacherId: resolvedTeacherId,
              dayOfWeek: utcData.dayOfWeek,
              startTime: utcData.startTime,
              endTime: utcData.endTime,
            },
          })
          schedulesCreated++
        }
      }

      let classesCreated = 0
      if (scheduledClasses && scheduledClasses.length > 0 && resolvedTeacherId) {
        const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
        const teacher = await tx.user.findUnique({
          where: { id: resolvedTeacherId },
          select: { timezone: true },
        })
        const teacherTimezone = teacher?.timezone || 'America/Lima'

        for (const cls of scheduledClasses) {
          const localTimeSlot = `${cls.startTime}-${cls.endTime}`
          const utcData = convertTimeSlotToUTC(cls.date, localTimeSlot, teacherTimezone)
          const existingBooking = await tx.classBooking.findUnique({
            where: {
              teacherId_day_timeSlot: {
                teacherId: resolvedTeacherId,
                day: utcData.day,
                timeSlot: utcData.timeSlot,
              },
            },
          })

          if (!existingBooking) {
            await tx.classBooking.create({
              data: {
                studentId: student.id,
                teacherId: resolvedTeacherId,
                enrollmentId: enrollment.id,
                day: utcData.day,
                timeSlot: utcData.timeSlot,
                status: 'CONFIRMED',
              },
            })
            classesCreated++
          }
        }
      }

      const createdEnrollment = await tx.enrollment.findUnique({
        where: { id: enrollment.id },
        include: {
          student: {
            select: { id: true, name: true, lastName: true, email: true },
          },
          course: {
            select: { id: true, title: true, language: true, level: true },
          },
          academicPeriod: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          teacher: {
            select: { id: true, name: true, lastName: true },
          },
          schedules: {
            select: { dayOfWeek: true, startTime: true, endTime: true },
          },
        },
      })

      if (!createdEnrollment) throw new Error('La inscripción creada no pudo ser recuperada')
      return { createdEnrollment, schedulesCreated, classesCreated }
    })

    try {
      await notifySelfServiceEnrollmentCreated(createdEnrollment.id)
    } catch (notificationError) {
      console.error('[BOT API] Error sending enrollment notifications:', notificationError)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enrollment: {
            id: createdEnrollment.id,
            status: createdEnrollment.status,
            classesTotal: createdEnrollment.classesTotal,
            student: {
              id: createdEnrollment.student.id,
              name: [createdEnrollment.student.name, createdEnrollment.student.lastName]
                .filter(Boolean)
                .join(' '),
              email: createdEnrollment.student.email,
            },
            course: createdEnrollment.course,
            academicPeriod: {
              id: createdEnrollment.academicPeriod.id,
              name: createdEnrollment.academicPeriod.name,
              startDate: createdEnrollment.academicPeriod.startDate.toISOString().split('T')[0],
              endDate: createdEnrollment.academicPeriod.endDate.toISOString().split('T')[0],
            },
            teacher: createdEnrollment.teacher
              ? {
                  id: createdEnrollment.teacher.id,
                  name: [createdEnrollment.teacher.name, createdEnrollment.teacher.lastName]
                    .filter(Boolean)
                    .join(' '),
                }
              : null,
          },
          schedulesCreated,
          classesCreated,
          paypalVerified: !!paypalData,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof EnrollmentRequestError) {
      return NextResponse.json(error.payload, { status: error.status })
    }
    console.error('[BOT API] Error creating enrollment:', error)
    return NextResponse.json({ error: 'Error al crear la inscripción' }, { status: 500 })
  }
}
