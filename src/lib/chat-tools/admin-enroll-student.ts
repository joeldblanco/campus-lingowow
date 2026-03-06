import { db } from '@/lib/db'
import { EnrollmentStatus, UserRole } from '@prisma/client'
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
  slots: Array<{ dayOfWeek: string; localTime: string }>
  adminTimezone: string
}): Promise<ToolResult> {
  try {
    const { studentNameOrEmail, teacherNameOrEmail, courseName, periodQuery, slots, adminTimezone } = params

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
        return { success: false, message: `No se encontró ningún estudiante con el nombre "${studentNameOrEmail}".` }
      }
      if (users.length > 1) {
        const list = users.map((u) => `- ${u.name} (${u.email})`).join('\n')
        return {
          success: false,
          message: `Se encontraron ${users.length} estudiantes:\n${list}\nPide al admin que confirme cuál.`,
        }
      }
      student = users[0]
    }
    if (!student) return { success: false, message: `No se encontró el estudiante "${studentNameOrEmail}".` }

    // 2. Find Teacher (Optional but highly recommended)
    let teacherId = null
    let teacherNameStr = "Sin profesor asignado"
    if (teacherNameOrEmail) {
      const isTeacherEmail = teacherNameOrEmail.includes('@')
      let teacher
      if (isTeacherEmail) {
        teacher = await db.user.findFirst({
          where: { email: { equals: teacherNameOrEmail.trim(), mode: 'insensitive' }, roles: { has: UserRole.TEACHER } },
          select: { id: true, name: true, email: true },
        })
      } else {
        const teachers = await db.user.findMany({
          where: { name: { contains: teacherNameOrEmail.trim(), mode: 'insensitive' }, roles: { has: UserRole.TEACHER } },
          select: { id: true, name: true, email: true },
          take: 5,
        })
        if (teachers.length === 0) {
          return { success: false, message: `No se encontró ningún profesor con el nombre "${teacherNameOrEmail}".` }
        }
        if (teachers.length > 1) {
          const list = teachers.map((u) => `- ${u.name} (${u.email})`).join('\n')
          return {
            success: false,
            message: `Se encontraron ${teachers.length} profesores:\n${list}\nPide al admin que confirme cuál.`,
          }
        }
        teacher = teachers[0]
      }
      if (teacher) {
        teacherId = teacher.id
        teacherNameStr = teacher.name || teacher.email || "Profesor"
      }
    }

    // 3. Find Course (Default to first published course if not specified)
    let course
    if (courseName) {
      course = await db.course.findFirst({
        where: { title: { contains: courseName.trim(), mode: 'insensitive' }, isPublished: true },
      })
      if (!course) {
        return { success: false, message: `No se encontró ningún curso activo con el nombre "${courseName}".` }
      }
    } else {
      course = await db.course.findFirst({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } })
      if (!course) {
        return { success: false, message: `No hay cursos activos disponibles en el sistema.` }
      }
    }

    // 4. Find Academic Period
    let period
    const now = new Date()
    if (periodQuery) {
      period = await db.academicPeriod.findFirst({
        where: { name: { contains: periodQuery.trim(), mode: 'insensitive' } },
      })
      if (!period) {
        return { success: false, message: `No se encontró ningún periodo académico llamado "${periodQuery}".` }
      }
    } else {
      period = await db.academicPeriod.findFirst({
        where: { startDate: { lte: now }, endDate: { gte: now } },
      })
      if (!period) {
        return { success: false, message: `No hay un periodo académico activo actualmente. Por favor especifica uno.` }
      }
    }

    // 5. Promote to STUDENT if necessary
    if (student.roles.includes(UserRole.GUEST) && !student.roles.includes(UserRole.STUDENT)) {
      await db.user.update({
        where: { id: student.id },
        data: { roles: { push: UserRole.STUDENT } },
      })
      console.log(`[AdminEnrollStudent] Promoted GUEST "${student.name}" to STUDENT`)
    }

    // 6. Check if already enrolled in this period to avoid duplicates
    const existingEnrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        academicPeriodId: period.id,
        courseId: course.id,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING] }
      }
    })

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        return { success: false, message: `El estudiante "${student.name}" ya tiene una inscripción activa en el periodo "${period.name}" para el curso "${course.title}". Usa admin_schedule_class para agregar más clases a esta inscripción.` }
      } else {
        // Update to active
        await db.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { status: EnrollmentStatus.ACTIVE, teacherId: teacherId || existingEnrollment.teacherId }
        })
      }
    } else {
      // Create Enrollment
      await db.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          academicPeriodId: period.id,
          teacherId: teacherId, // Can be null
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
        }
      })
    }

    // 7. Schedule Classes using the existing logic (since we just created an ACTIVE enrollment)
    if (slots && slots.length > 0) {
      const scheduleResult = await handleAdminScheduleClass({
        studentNameOrEmail: student.email || student.id, // we know exact email/id now, use email to guarantee match
        teacherId: teacherId || undefined,
        slots: slots,
        adminTimezone: adminTimezone
      })

      if (scheduleResult.success) {
         return {
           success: true,
           message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}).\n\n${scheduleResult.message}`,
           data: { ...((scheduleResult.data as ScheduleResultData) || {}), enrolled: true }
         }
      } else {
         return {
           success: false,
           message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}), PERO falló el agendamiento de clases: ${scheduleResult.message}`,
         }
      }
    }

    return {
      success: true,
      message: `Se inscribió al estudiante "${student.name}" en el curso "${course.title}" para el periodo "${period.name}" (Profesor: ${teacherNameStr}). No se solicitaron horarios para agendar.`,
      data: { enrolled: true }
    }

  } catch (error) {
    console.error('[AdminEnrollStudent] Error:', error)
    return {
      success: false,
      message: 'Error al inscribir al estudiante. Por favor intenta de nuevo.',
    }
  }
}
