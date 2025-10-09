'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { SubscriptionStatus } from '@prisma/client'
import { getCurrentDate } from '@/lib/utils/date'

// =============================================
// FUNCIONES DE CÁLCULO DE PRORATEO
// =============================================

/**
 * Calcula el prorateo de un plan basado en la fecha de compra
 * @param planId - ID del plan
 * @param purchaseDate - Fecha de compra
 * @param academicPeriodId - ID del período académico actual (opcional)
 * @returns Información de prorateo
 */
export async function calculatePlanProration(
  planId: string,
  purchaseDate: Date = getCurrentDate(),
  academicPeriodId?: string
) {
  try {
    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: {
        course: true,
      },
    })

    if (!plan) {
      return { success: false, error: 'Plan no encontrado' }
    }

    // Si el plan no incluye clases o no permite prorateo, retornar precio completo
    if (!plan.includesClasses || !plan.allowProration) {
      return {
        success: true,
        data: {
          originalPrice: plan.price,
          proratedPrice: plan.price,
          originalClasses: plan.classesPerPeriod || 0,
          proratedClasses: plan.classesPerPeriod || 0,
          remainingDays: plan.duration,
          totalDays: plan.duration,
          prorationApplied: false,
        },
      }
    }

    // Obtener el período académico actual
    let currentPeriod = null
    if (academicPeriodId) {
      currentPeriod = await db.academicPeriod.findUnique({
        where: { id: academicPeriodId },
      })
    } else {
      // Buscar el período activo actual
      currentPeriod = await db.academicPeriod.findFirst({
        where: {
          isActive: true,
          startDate: { lte: purchaseDate },
          endDate: { gte: purchaseDate },
        },
      })
    }

    if (!currentPeriod) {
      // Si no hay período académico, usar la duración del plan
      return {
        success: true,
        data: {
          originalPrice: plan.price,
          proratedPrice: plan.price,
          originalClasses: plan.classesPerPeriod || 0,
          proratedClasses: plan.classesPerPeriod || 0,
          remainingDays: plan.duration,
          totalDays: plan.duration,
          prorationApplied: false,
        },
      }
    }

    // Calcular días totales del período
    const totalDays = Math.ceil(
      (currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calcular días restantes desde la fecha de compra
    const remainingDays = Math.ceil(
      (currentPeriod.endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Si quedan menos del 10% de días, no aplicar prorateo (cobrar período completo)
    if (remainingDays / totalDays < 0.1) {
      return {
        success: true,
        data: {
          originalPrice: plan.price,
          proratedPrice: plan.price,
          originalClasses: plan.classesPerPeriod || 0,
          proratedClasses: plan.classesPerPeriod || 0,
          remainingDays,
          totalDays,
          prorationApplied: false,
          message: 'Período casi completo, se cobra el precio completo',
        },
      }
    }

    // Calcular prorateo basado en días restantes
    const prorationFactor = remainingDays / totalDays
    const proratedPrice = Math.round(plan.price * prorationFactor * 100) / 100

    // Calcular clases prorrateadas
    let proratedClasses = plan.classesPerPeriod || 0
    if (plan.classesPerWeek && plan.classesPerPeriod) {
      // Calcular semanas restantes
      const remainingWeeks = Math.ceil(remainingDays / 7)
      proratedClasses = Math.min(
        Math.ceil(remainingWeeks * plan.classesPerWeek),
        plan.classesPerPeriod
      )
    }

    return {
      success: true,
      data: {
        originalPrice: plan.price,
        proratedPrice,
        originalClasses: plan.classesPerPeriod || 0,
        proratedClasses,
        remainingDays,
        totalDays,
        prorationApplied: true,
        periodStartDate: currentPeriod.startDate,
        periodEndDate: currentPeriod.endDate,
      },
    }
  } catch (error) {
    console.error('Error calculating prorated price:', error)
    return { success: false, error: 'Error al calcular el prorateo' }
  }
}

// =============================================
// GESTIÓN DE SUSCRIPCIONES
// =============================================

export async function createSubscription(data: {
  userId: string
  planId: string
  academicPeriodId?: string
  purchaseDate?: Date
}) {
  try {
    const { userId, planId, academicPeriodId, purchaseDate = getCurrentDate() } = data

    // Calcular prorateo
    const prorationResult = await calculatePlanProration(planId, purchaseDate, academicPeriodId)

    if (!prorationResult.success || !prorationResult.data) {
      return { success: false, error: prorationResult.error || 'Error al calcular prorateo' }
    }

    const prorationData = prorationResult.data

    // Obtener el plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan no encontrado' }
    }

    // Calcular fecha de siguiente facturación
    const nextBillingDate = new Date(purchaseDate)
    nextBillingDate.setDate(nextBillingDate.getDate() + plan.duration)

    // Crear la suscripción
    const subscription = await db.subscription.create({
      data: {
        userId,
        planId,
        status: 'ACTIVE',
        startDate: purchaseDate,
        nextBillingDate: plan.autoRenewal ? nextBillingDate : null,
        proratedPrice: prorationData.proratedPrice,
        proratedClasses: prorationData.proratedClasses,
        remainingClasses: prorationData.proratedClasses,
      },
    })

    revalidatePath('/dashboard')
    return { success: true, data: subscription }
  } catch (error) {
    console.error('Error creating subscription:', error)
    return { success: false, error: 'Error al crear la suscripción' }
  }
}

export async function getActiveSubscriptions(userId: string) {
  try {
    return await db.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        plan: {
          include: {
            features: {
              include: {
                feature: true,
              },
            },
            course: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch (error) {
    console.error('Error fetching active subscriptions:', error)
    return []
  }
}

export async function cancelSubscription(subscriptionId: string, reason?: string) {
  try {
    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: getCurrentDate(),
        cancelReason: reason,
      },
    })

    revalidatePath('/dashboard')
    return { success: true, data: subscription }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return { success: false, error: 'Error al cancelar la suscripción' }
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
) {
  try {
    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: { status },
    })

    revalidatePath('/dashboard')
    return { success: true, data: subscription }
  } catch (error) {
    console.error('Error updating subscription status:', error)
    return { success: false, error: 'Error al actualizar el estado de la suscripción' }
  }
}

export async function decrementSubscriptionClasses(subscriptionId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      return { success: false, error: 'Suscripción no encontrada' }
    }

    if (!subscription.remainingClasses || subscription.remainingClasses <= 0) {
      return { success: false, error: 'No quedan clases disponibles' }
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        remainingClasses: subscription.remainingClasses - 1,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error decrementing subscription classes:', error)
    return { success: false, error: 'Error al decrementar las clases' }
  }
}

// =============================================
// FUNCIONES PÚBLICAS PARA MOSTRAR PLANES
// =============================================

export async function getPublicPlans() {
  try {
    return await db.plan.findMany({
      where: {
        isActive: true,
      },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })
  } catch (error) {
    console.error('Error fetching public plans:', error)
    return []
  }
}

export async function getPublicProducts() {
  try {
    return await db.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch (error) {
    console.error('Error fetching public products:', error)
    return []
  }
}
