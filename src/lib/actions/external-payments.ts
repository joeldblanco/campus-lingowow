'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { ExternalPaymentEnrollmentSchema } from '@/schemas/external-payment'
import { revalidatePath } from 'next/cache'

class PaymentInputError extends Error {}

export async function getExternalPaymentEnrollmentOptions() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN') || session.user.isImpersonating) {
    throw new Error('Acceso restringido a administradores')
  }
  const [students, courses, periods] = await Promise.all([
    db.user.findMany({
      where: { roles: { has: 'STUDENT' }, status: 'ACTIVE' },
      select: { id: true, name: true, lastName: true, email: true },
      orderBy: { name: 'asc' },
    }),
    db.course.findMany({
      where: { isPublished: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    db.academicPeriod.findMany({
      where: { endDate: { gte: new Date() } },
      select: { id: true, name: true },
      orderBy: { startDate: 'asc' },
    }),
  ])
  return { students, courses, periods }
}

/** Record evidence supplied by an administrator; never contacts a payment gateway. */
export async function registerExternalPaymentEnrollment(input: unknown) {
  const session = await auth()
  if (
    !session?.user?.id ||
    !session.user.roles?.includes('ADMIN') ||
    session.user.isImpersonating
  ) {
    return {
      success: false as const,
      error: 'Solo un administrador puede registrar pagos externos.',
    }
  }
  const parsed = ExternalPaymentEnrollmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }
  const data = parsed.data
  const actorId = session.user.id
  try {
    const result = await db.$transaction(async (tx) => {
      // Exact retries return the original result, even after the period has ended.
      const previous = await tx.externalPayment.findUnique({
        where: { provider_reference: { provider: data.provider, reference: data.reference } },
        include: { enrollment: true },
      })
      if (previous) {
        const enrollment = previous.enrollment
        if (
          previous.amountMinor !== data.amount ||
          previous.currency !== data.currency ||
          previous.paidAt.getTime() !== Date.parse(data.paidAt) ||
          previous.description !== data.description ||
          enrollment.studentId !== data.studentId ||
          enrollment.courseId !== data.courseId ||
          enrollment.academicPeriodId !== data.academicPeriodId ||
          enrollment.classesTotal !== data.classesTotal
        ) {
          throw new PaymentInputError(
            'La referencia Culqi ya está registrada con otros datos. Revisa el comprobante.'
          )
        }
        return { enrollmentId: enrollment.id, paymentId: previous.id, alreadyRecorded: true }
      }
      const student = await tx.user.findUnique({ where: { id: data.studentId } })
      if (!student?.roles.includes('STUDENT') || student.status !== 'ACTIVE') {
        throw new PaymentInputError('Selecciona un estudiante activo.')
      }
      const course = await tx.course.findUnique({ where: { id: data.courseId } })
      if (!course?.isPublished) throw new PaymentInputError('Selecciona un curso publicado.')
      const period = await tx.academicPeriod.findUnique({ where: { id: data.academicPeriodId } })
      const now = new Date()
      if (!period || period.endDate < now)
        throw new PaymentInputError('Selecciona un período vigente o futuro.')
      const existing = await tx.enrollment.findUnique({
        where: {
          studentId_courseId_academicPeriodId: {
            studentId: data.studentId,
            courseId: data.courseId,
            academicPeriodId: data.academicPeriodId,
          },
        },
      })
      if (existing)
        throw new PaymentInputError(
          'El estudiante ya tiene una matrícula para este curso y período.'
        )
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
          status: period.startDate > now ? 'PENDING' : 'ACTIVE',
          enrollmentType: 'MANUAL',
          enrolledBy: actorId,
          classesTotal: data.classesTotal,
          notes: `Pago externo Culqi: ${data.reference}. ${data.description}. Clases pendientes de programar.`,
        },
      })
      const payment = await tx.externalPayment.create({
        data: {
          provider: data.provider,
          reference: data.reference,
          amountMinor: data.amount,
          currency: data.currency,
          paidAt: new Date(data.paidAt),
          recordedBy: actorId,
          description: data.description,
          enrollmentId: enrollment.id,
        },
      })
      // Fail closed: evidence, enrollment and audit must commit together.
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'PAYMENT_COMPLETED',
          category: 'COMMERCE',
          description: 'Pago externo Culqi registrado manualmente y matrícula creada',
          metadata: {
            paymentId: payment.id,
            enrollmentId: enrollment.id,
            provider: data.provider,
            reference: data.reference,
            amountMinor: data.amount,
            currency: data.currency,
            paidAt: data.paidAt,
            verification: 'ADMIN_ATTESTED',
            classesTotal: data.classesTotal,
          },
        },
      })
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'ENROLLMENT_CREATED',
          category: 'ACADEMIC',
          description: 'Matrícula manual respaldada por pago externo Culqi',
          metadata: {
            enrollmentId: enrollment.id,
            paymentId: payment.id,
            studentId: data.studentId,
          },
        },
      })
      return { enrollmentId: enrollment.id, paymentId: payment.id, alreadyRecorded: false }
    })
    // Cache errors after commit must not imply that the recorded payment failed.
    try {
      revalidatePath('/admin/enrollments')
    } catch {
      /* An exact retry is safe. */
    }
    return { success: true as const, data: result }
  } catch (error) {
    if (error instanceof PaymentInputError)
      return { success: false as const, error: handleError(error) }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false as const,
        error:
          'La referencia o matrícula ya existe. Reintenta con los mismos datos para comprobar el resultado.',
      }
    }
    return {
      success: false as const,
      error:
        'No se pudo registrar el pago. Reintenta con los mismos datos; si persiste, contacta con soporte.',
    }
  }
}
