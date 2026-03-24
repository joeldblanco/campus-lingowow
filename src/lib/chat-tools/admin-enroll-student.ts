import { db } from '@/lib/db'
import { EnrollmentStatus, InvoiceStatus, UserRole } from '@prisma/client'
import type { ToolResult } from '@/types/ai-chat'
import { handleAdminScheduleClass } from './admin-schedule-class'

type ScheduleResultData = {
  scheduledCount?: number
  skippedCount?: number
  scheduledDays?: string[]
  studentName?: string | null
}

export async function handleAdminEnrollStudent(params: {
  studentNameOrEmail: string
  teacherNameOrEmail?: string
  courseName?: string
  periodQuery?: string
  invoiceId?: string
  slots: Array<{ dayOfWeek: string; localTime: string }>
  adminTimezone: string
}): Promise<ToolResult> {
  try {
    const {
      studentNameOrEmail,
      teacherNameOrEmail,
      courseName,
      periodQuery,
      invoiceId,
      slots,
      adminTimezone,
    } = params

    // 1. Find Student
    let student
    const isStudentEmail = studentNameOrEmail.includes('@')
    if (isStudentEmail) {
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
          message: `No se encontró ningún estudiante con el nombre "${studentNameOrEmail}".`,
        }
      }
      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email})`).join('\n')
        return {
          success: false,
          message: `Se encontraron ${users.length} estudiantes:\n${list}\nPide al admin que confirme cuál.`,
          data: {
            code: 'MULTIPLE_STUDENTS',
            students: users.map((u) => ({ name: u.name, email: u.email })),
          },
        }
      }
      student = users[0]
    }
    if (!student)
      return { success: false, message: `No se encontró el estudiante "${studentNameOrEmail}".` }

    // 2. Validate Paid Invoice — enrollment MUST be tied to a paid invoice
    let paidInvoice
    if (invoiceId) {
      paidInvoice = await db.invoice.findFirst({
        where: { id: invoiceId, userId: student.id, status: InvoiceStatus.PAID },
        include: { items: { include: { plan: true } } },
      })
      if (!paidInvoice) {
        return {
          success: false,
          message: `No se encontró una factura pagada con ID "${invoiceId}" para el estudiante "${student.name}". Verifica que la factura exista y esté pagada antes de inscribir.`,
          data: { code: 'INVOICE_NOT_FOUND' },
        }
      }
    } else {
      // Search for recent paid invoices for this student
      const paidInvoices = await db.invoice.findMany({
        where: { userId: student.id, status: InvoiceStatus.PAID },
        include: { items: { include: { plan: true } } },
        orderBy: { paidAt: 'desc' },
        take: 5,
      })

      if (paidInvoices.length === 0) {
        return {
          success: false,
          message: `El estudiante "${student.name}" no tiene facturas pagadas. Primero genera y envía una factura con admin_create_invoice, espera el pago, y luego inscríbelo.`,
          data: { code: 'NO_PAID_INVOICE' },
        }
      }

      // Check if any of the paid invoices already have an associated enrollment
      const invoicesWithoutEnrollment = []
      for (const inv of paidInvoices) {
        const planId = inv.items[0]?.planId
        if (!planId) continue
        const existingEnrollment = await db.enrollment.findFirst({
          where: {
            studentId: student.id,
            // An enrollment was already created for this invoice if there's one in the same period
            // We check by looking at purchases tied to this invoice
            purchases: { some: { invoiceId: inv.id } },
          },
        })
        if (!existingEnrollment) {
          invoicesWithoutEnrollment.push(inv)
        }
      }

      if (invoicesWithoutEnrollment.length === 0) {
        // All invoices already used — check if the most recent one could still be used
        paidInvoice = paidInvoices[0]
      } else if (invoicesWithoutEnrollment.length === 1) {
        paidInvoice = invoicesWithoutEnrollment[0]
      } else {
        const list = invoicesWithoutEnrollment
          .map((inv) => {
            const planName = inv.items[0]?.name ?? 'Sin plan'
            const paidDate = inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('es-PE') : '?'
            return `- ${inv.invoiceNumber}: ${planName} ($${inv.total} ${inv.currency}) — Pagada: ${paidDate}`
          })
          .join('\n')
        return {
          success: false,
          message: `El estudiante "${student.name}" tiene ${invoicesWithoutEnrollment.length} facturas pagadas sin inscripción asociada:\n${list}\nIndica cuál factura usar para esta inscripción (usa el número de factura).`,
          data: {
            code: 'MULTIPLE_INVOICES',
            invoices: invoicesWithoutEnrollment.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              planName: inv.items[0]?.name,
              total: inv.total,
              currency: inv.currency,
              paidAt: inv.paidAt,
            })),
          },
        }
      }
    }

    // 3. Resolve Course from Invoice → PlanPricing → Course (instead of dangerous fallback)
    let course
    const invoicePlanId = paidInvoice.items[0]?.planId
    if (invoicePlanId) {
      // Resolve course from PlanPricing (plan + language → course)
      const planPricing = await db.planPricing.findFirst({
        where: { planId: invoicePlanId, isActive: true, courseId: { not: null } },
        include: { course: true },
      })
      if (planPricing?.course) {
        course = planPricing.course
      }
    }

    // If course couldn't be resolved from invoice, try explicit courseName
    if (!course && courseName) {
      course = await db.course.findFirst({
        where: { title: { contains: courseName.trim(), mode: 'insensitive' }, isPublished: true },
      })
      if (!course) {
        return {
          success: false,
          message: `No se encontró ningún curso activo con el nombre "${courseName}".`,
        }
      }
    }

    if (!course) {
      return {
        success: false,
        message: `No se pudo determinar el curso para esta inscripción. La factura no tiene un plan vinculado a un curso específico. Indica el nombre del curso explícitamente.`,
        data: { code: 'COURSE_NOT_RESOLVED' },
      }
    }

    // 4. Find Teacher — REQUIRED for synchronous courses
    let teacherId: string | null = null
    let teacherNameStr = 'Sin profesor asignado'
    if (teacherNameOrEmail) {
      const isTeacherEmail = teacherNameOrEmail.includes('@')
      let teacher
      if (isTeacherEmail) {
        teacher = await db.user.findFirst({
          where: {
            email: { equals: teacherNameOrEmail.trim(), mode: 'insensitive' },
            roles: { has: UserRole.TEACHER },
          },
          select: { id: true, name: true, email: true },
        })
      } else {
        const teachers = await db.user.findMany({
          where: {
            name: { contains: teacherNameOrEmail.trim(), mode: 'insensitive' },
            roles: { has: UserRole.TEACHER },
          },
          select: { id: true, name: true, email: true },
          take: 5,
        })
        if (teachers.length === 0) {
          return {
            success: false,
            message: `No se encontró ningún profesor con el nombre "${teacherNameOrEmail}".`,
          }
        }
        if (teachers.length > 1) {
          const list = teachers.map((u) => `- ${u.name} (${u.email})`).join('\n')
          return {
            success: false,
            message: `Se encontraron ${teachers.length} profesores:\n${list}\nPide al admin que confirme cuál.`,
            data: {
              code: 'MULTIPLE_TEACHERS',
              teachers: teachers.map((u) => ({ name: u.name, email: u.email })),
            },
          }
        }
        teacher = teachers[0]
      }
      if (teacher) {
        teacherId = teacher.id
        teacherNameStr = teacher.name || teacher.email || 'Profesor'
      }
    }

    // Enforce: synchronous courses REQUIRE a teacher
    if (course.isSynchronous && !teacherId) {
      return {
        success: false,
        message: `El curso "${course.title}" es sincrónico (clases en vivo) y requiere un profesor asignado. Usa check_teacher_availability para verificar disponibilidad y selecciona un profesor antes de inscribir.`,
        data: { code: 'TEACHER_REQUIRED' },
      }
    }

    // 5. Find Academic Period
    let period
    const now = new Date()
    if (periodQuery) {
      period = await db.academicPeriod.findFirst({
        where: { name: { contains: periodQuery.trim(), mode: 'insensitive' } },
      })
      if (!period) {
        return {
          success: false,
          message: `No se encontró ningún periodo académico llamado "${periodQuery}".`,
        }
      }
    } else {
      period = await db.academicPeriod.findFirst({
        where: { startDate: { lte: now }, endDate: { gte: now } },
      })
      if (!period) {
        return {
          success: false,
          message: `No hay un periodo académico activo actualmente. Por favor especifica uno.`,
        }
      }
    }

    // 6. Promote to STUDENT if necessary
    if (student.roles.includes(UserRole.GUEST) && !student.roles.includes(UserRole.STUDENT)) {
      await db.user.update({
        where: { id: student.id },
        data: { roles: { push: UserRole.STUDENT } },
      })
      console.log(`[AdminEnrollStudent] Promoted GUEST "${student.name}" to STUDENT`)
    }

    // 7. Check if already enrolled in this period to avoid duplicates
    const existingEnrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        academicPeriodId: period.id,
        courseId: course.id,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING] },
      },
    })

    let enrollmentId: string
    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        return {
          success: false,
          message: `El estudiante "${student.name}" ya tiene una inscripción activa en el periodo "${period.name}" para el curso "${course.title}". Usa admin_schedule_class para agregar más clases a esta inscripción.`,
        }
      } else {
        // Update to active
        await db.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: EnrollmentStatus.ACTIVE,
            teacherId: teacherId || existingEnrollment.teacherId,
          },
        })
        enrollmentId = existingEnrollment.id
      }
    } else {
      // Create Enrollment
      const newEnrollment = await db.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          academicPeriodId: period.id,
          teacherId: teacherId,
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
          enrollmentType: 'MANUAL',
          enrolledBy: params.adminTimezone ? undefined : undefined, // Admin ID would go here if available
        },
      })
      enrollmentId = newEnrollment.id
    }

    // 8. Schedule Classes — only for synchronous courses with slots
    if (course.isSynchronous && slots && slots.length > 0) {
      const scheduleResult = await handleAdminScheduleClass({
        studentNameOrEmail: student.email || student.id,
        teacherId: teacherId || undefined,
        slots: slots,
        adminTimezone: adminTimezone,
      })

      if (scheduleResult.success) {
        return {
          success: true,
          message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}).\n\n${scheduleResult.message}`,
          data: {
            ...((scheduleResult.data as ScheduleResultData) || {}),
            enrolled: true,
            enrollmentId,
          },
        }
      } else {
        return {
          success: false,
          message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}), PERO falló el agendamiento de clases: ${scheduleResult.message}`,
        }
      }
    }

    // For async courses, no scheduling needed
    const asyncNote = !course.isSynchronous
      ? ' Este es un curso asincrónico, no requiere agendamiento de clases.'
      : ' No se solicitaron horarios para agendar.'

    return {
      success: true,
      message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}).${asyncNote}`,
      data: { enrolled: true, enrollmentId },
    }
  } catch (error) {
    console.error('[AdminEnrollStudent] Error:', error)
    return {
      success: false,
      message: 'Error al inscribir al estudiante. Por favor intenta de nuevo.',
    }
  }
}
