'use server'

import { db } from '@/lib/db'
import { ConfirmationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface PaymentConfirmation {
  id: string
  teacherId: string
  teacherName: string
  teacherEmail: string
  amount: number
  periodStart: Date
  periodEnd: Date
  confirmedAt: Date
  hasProof: boolean
  proofUrl: string | null
  notes: string | null
  status: ConfirmationStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Crea una nueva confirmación de pago de profesor
 */
export async function createPaymentConfirmation(data: {
  teacherId: string
  amount: number
  periodStart: Date
  periodEnd: Date
  hasProof?: boolean
  proofUrl?: string
  notes?: string
}) {
  try {
    const confirmation = await db.teacherPaymentConfirmation.create({
      data: {
        teacherId: data.teacherId,
        amount: data.amount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        hasProof: data.hasProof || false,
        proofUrl: data.proofUrl,
        notes: data.notes,
        status: ConfirmationStatus.PENDING,
      },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    revalidatePath('/admin/payments/teachers')
    revalidatePath('/teacher/earnings')

    return {
      success: true,
      confirmation: {
        id: confirmation.id,
        teacherId: confirmation.teacherId,
        teacherName: `${confirmation.teacher.name} ${confirmation.teacher.lastName || ''}`.trim(),
        teacherEmail: confirmation.teacher.email || '',
        amount: confirmation.amount,
        periodStart: confirmation.periodStart,
        periodEnd: confirmation.periodEnd,
        confirmedAt: confirmation.confirmedAt,
        hasProof: confirmation.hasProof,
        proofUrl: confirmation.proofUrl,
        notes: confirmation.notes,
        status: confirmation.status,
        createdAt: confirmation.createdAt,
        updatedAt: confirmation.updatedAt,
      } as PaymentConfirmation,
    }
  } catch (error) {
    console.error('Error creating payment confirmation:', error)
    return {
      success: false,
      error: 'Error al crear la confirmación de pago',
    }
  }
}

/**
 * Obtiene confirmaciones de pago por profesor y período
 */
export async function getPaymentConfirmations(filters?: {
  teacherId?: string
  periodStart?: Date
  periodEnd?: Date
  status?: ConfirmationStatus
}): Promise<PaymentConfirmation[]> {
  try {
    const where: {
      teacherId?: string
      periodStart?: { gte: Date }
      periodEnd?: { lte: Date }
      status?: ConfirmationStatus
    } = {}

    if (filters?.teacherId) {
      where.teacherId = filters.teacherId
    }

    if (filters?.periodStart && filters?.periodEnd) {
      where.periodStart = { gte: filters.periodStart }
      where.periodEnd = { lte: filters.periodEnd }
    }

    if (filters?.status) {
      where.status = filters.status
    }

    const confirmations = await db.teacherPaymentConfirmation.findMany({
      where,
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    })

    return confirmations.map((c) => ({
      id: c.id,
      teacherId: c.teacherId,
      teacherName: `${c.teacher.name} ${c.teacher.lastName || ''}`.trim(),
      teacherEmail: c.teacher.email || '',
      amount: c.amount,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      confirmedAt: c.confirmedAt,
      hasProof: c.hasProof,
      proofUrl: c.proofUrl,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  } catch (error) {
    console.error('Error getting payment confirmations:', error)
    return []
  }
}

/**
 * Obtiene una confirmación específica por ID
 */
export async function getPaymentConfirmationById(id: string): Promise<PaymentConfirmation | null> {
  try {
    const confirmation = await db.teacherPaymentConfirmation.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!confirmation) return null

    return {
      id: confirmation.id,
      teacherId: confirmation.teacherId,
      teacherName: `${confirmation.teacher.name} ${confirmation.teacher.lastName || ''}`.trim(),
      teacherEmail: confirmation.teacher.email || '',
      amount: confirmation.amount,
      periodStart: confirmation.periodStart,
      periodEnd: confirmation.periodEnd,
      confirmedAt: confirmation.confirmedAt,
      hasProof: confirmation.hasProof,
      proofUrl: confirmation.proofUrl,
      notes: confirmation.notes,
      status: confirmation.status,
      createdAt: confirmation.createdAt,
      updatedAt: confirmation.updatedAt,
    }
  } catch (error) {
    console.error('Error getting payment confirmation:', error)
    return null
  }
}

/**
 * Actualiza el estado de una confirmación de pago
 */
export async function updatePaymentConfirmationStatus(
  id: string,
  status: ConfirmationStatus,
  notes?: string
) {
  try {
    const confirmation = await db.teacherPaymentConfirmation.update({
      where: { id },
      data: {
        status,
        notes: notes || undefined,
      },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    revalidatePath('/admin/payments/teachers')
    revalidatePath('/admin/payments/confirmations')

    return {
      success: true,
      confirmation: {
        id: confirmation.id,
        teacherId: confirmation.teacherId,
        teacherName: `${confirmation.teacher.name} ${confirmation.teacher.lastName || ''}`.trim(),
        teacherEmail: confirmation.teacher.email || '',
        amount: confirmation.amount,
        periodStart: confirmation.periodStart,
        periodEnd: confirmation.periodEnd,
        confirmedAt: confirmation.confirmedAt,
        hasProof: confirmation.hasProof,
        proofUrl: confirmation.proofUrl,
        notes: confirmation.notes,
        status: confirmation.status,
        createdAt: confirmation.createdAt,
        updatedAt: confirmation.updatedAt,
      } as PaymentConfirmation,
    }
  } catch (error) {
    console.error('Error updating payment confirmation status:', error)
    return {
      success: false,
      error: 'Error al actualizar el estado de la confirmación',
    }
  }
}

/**
 * Verifica si existe una confirmación para un profesor en un período específico
 */
export async function checkPaymentConfirmationExists(
  teacherId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ exists: boolean; confirmation?: PaymentConfirmation }> {
  try {
    const confirmation = await db.teacherPaymentConfirmation.findUnique({
      where: {
        teacherId_periodStart_periodEnd: {
          teacherId,
          periodStart,
          periodEnd,
        },
      },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!confirmation) {
      return { exists: false }
    }

    return {
      exists: true,
      confirmation: {
        id: confirmation.id,
        teacherId: confirmation.teacherId,
        teacherName: `${confirmation.teacher.name} ${confirmation.teacher.lastName || ''}`.trim(),
        teacherEmail: confirmation.teacher.email || '',
        amount: confirmation.amount,
        periodStart: confirmation.periodStart,
        periodEnd: confirmation.periodEnd,
        confirmedAt: confirmation.confirmedAt,
        hasProof: confirmation.hasProof,
        proofUrl: confirmation.proofUrl,
        notes: confirmation.notes,
        status: confirmation.status,
        createdAt: confirmation.createdAt,
        updatedAt: confirmation.updatedAt,
      },
    }
  } catch (error) {
    console.error('Error checking payment confirmation:', error)
    return { exists: false }
  }
}

/**
 * Obtiene el historial de confirmaciones de un profesor
 */
export async function getTeacherPaymentHistory(teacherId: string): Promise<PaymentConfirmation[]> {
  try {
    const confirmations = await db.teacherPaymentConfirmation.findMany({
      where: { teacherId },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    })

    return confirmations.map((c) => ({
      id: c.id,
      teacherId: c.teacherId,
      teacherName: `${c.teacher.name} ${c.teacher.lastName || ''}`.trim(),
      teacherEmail: c.teacher.email || '',
      amount: c.amount,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      confirmedAt: c.confirmedAt,
      hasProof: c.hasProof,
      proofUrl: c.proofUrl,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  } catch (error) {
    console.error('Error getting teacher payment history:', error)
    return []
  }
}

/**
 * Obtiene estadísticas de confirmaciones de pago
 */
export async function getPaymentConfirmationStats() {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      db.teacherPaymentConfirmation.count(),
      db.teacherPaymentConfirmation.count({ where: { status: ConfirmationStatus.PENDING } }),
      db.teacherPaymentConfirmation.count({ where: { status: ConfirmationStatus.APPROVED } }),
      db.teacherPaymentConfirmation.count({ where: { status: ConfirmationStatus.REJECTED } }),
    ])

    const totalAmount = await db.teacherPaymentConfirmation.aggregate({
      _sum: { amount: true },
      where: { status: ConfirmationStatus.APPROVED },
    })

    return {
      total,
      pending,
      approved,
      rejected,
      totalAmountApproved: totalAmount._sum.amount || 0,
    }
  } catch (error) {
    console.error('Error getting payment confirmation stats:', error)
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmountApproved: 0,
    }
  }
}
