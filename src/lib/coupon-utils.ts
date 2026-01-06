import { db } from '@/lib/db'
import type { Coupon } from '@prisma/client'

export async function validateCoupon(
  code: string,
  userId?: string,
  planId?: string
): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  try {
    const coupon = await db.coupon.findUnique({
      where: { code },
    })

    if (!coupon) {
      return { valid: false, error: 'Cupón no encontrado' }
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'Este cupón no está activo' }
    }

    const now = new Date()
    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, error: 'Este cupón aún no está vigente' }
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, error: 'Este cupón ha expirado' }
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: 'Este cupón ha alcanzado su límite de uso' }
    }

    // Validar restricción de usuario
    if (coupon.restrictedToUserId && coupon.restrictedToUserId !== userId) {
      return { valid: false, error: 'Este cupón no es válido para tu cuenta' }
    }

    // Validar restricción de plan
    if (coupon.restrictedToPlanId && coupon.restrictedToPlanId !== planId) {
      return { valid: false, error: 'Este cupón no aplica para el plan seleccionado' }
    }

    return { valid: true, coupon }
  } catch (error) {
    console.error('Error validating coupon:', error)
    return { valid: false, error: 'Error al validar el cupón' }
  }
}
