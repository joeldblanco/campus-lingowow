'use server'

import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import {
  RecordAbandonedCartSchema,
  AbandonedCartItemSchema,
  type RecordAbandonedCartInput,
  type AbandonedCartItemInput,
} from '@/schemas/abandoned-cart'
import * as z from 'zod'

const computeTotal = (items: AbandonedCartItemInput[]): number =>
  items.reduce((sum, item) => sum + item.plan.price * (item.quantity ?? 1), 0)

/**
 * Persiste (o actualiza) el snapshot server-side de un carrito abandonado para
 * un email conocido. Upsert manual por email => un registro activo por persona.
 *
 * Anti-spam / dedupe: si ya existe un registro en curso (PENDING/EMAILED) NO se
 * re-arma el envío — `recoveryEmailSentAt` y `status` se dejan intactos, de modo
 * que el cron nunca envía un segundo correo del mismo ciclo. Solo se inicia un
 * ciclo nuevo si el anterior ya se cerró (PURCHASED/RECOVERED).
 */
export async function recordAbandonedCart(
  input: RecordAbandonedCartInput
): Promise<{ success: boolean; message: string }> {
  const parsed = RecordAbandonedCartSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const { email, userId, currency, items } = parsed.data
  const total = computeTotal(items)

  try {
    const existing = await db.abandonedCart.findUnique({ where: { email } })

    if (!existing) {
      await db.abandonedCart.create({
        data: { email, userId, items, total, currency, status: 'PENDING' },
      })
      return { success: true, message: 'Carrito registrado' }
    }

    const startNewCycle = existing.status === 'PURCHASED' || existing.status === 'RECOVERED'

    await db.abandonedCart.update({
      where: { email },
      data: {
        items,
        total,
        currency,
        userId: userId ?? existing.userId ?? undefined,
        // Re-armar SOLO cuando el ciclo previo está cerrado; nunca dentro de un
        // ciclo PENDING/EMAILED (eso garantiza el "máximo 1 correo por ciclo").
        ...(startNewCycle
          ? { status: 'PENDING', recoveryEmailSentAt: null, recoveredAt: null, purchasedAt: null }
          : {}),
      },
    })

    return { success: true, message: 'Carrito actualizado' }
  } catch (error) {
    console.error('Error recording abandoned cart:', error)
    return { success: false, message: handleError(error) }
  }
}

/**
 * Marca el carrito de un email como comprado para que el cron deje de enviar (o
 * no envíe) el correo de recuperación. Idempotente: no falla si no existe fila.
 */
export async function markCartPurchased(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    await db.abandonedCart.updateMany({
      where: { email },
      data: { status: 'PURCHASED', purchasedAt: new Date() },
    })
    return { success: true, message: 'Carrito marcado como comprado' }
  } catch (error) {
    console.error('Error marking cart as purchased:', error)
    return { success: false, message: handleError(error) }
  }
}

/**
 * Resuelve un token de recuperación a su snapshot de carrito para que la página
 * de restauración reconstruya el store. Marca el registro como RECOVERED.
 */
export async function getAbandonedCartForRecovery(token: string): Promise<{
  success: boolean
  message: string
  data?: { email: string; items: AbandonedCartItemInput[] }
}> {
  try {
    const record = await db.abandonedCart.findUnique({ where: { recoveryToken: token } })
    if (!record) {
      return { success: false, message: 'Enlace de recuperación inválido o expirado' }
    }

    const items = z.array(AbandonedCartItemSchema).safeParse(record.items)
    if (!items.success) {
      return { success: false, message: 'No se pudo reconstruir el carrito' }
    }

    if (record.status !== 'PURCHASED') {
      await db.abandonedCart.update({
        where: { id: record.id },
        data: { status: 'RECOVERED', recoveredAt: new Date() },
      })
    }

    return { success: true, message: 'Carrito recuperado', data: { email: record.email, items: items.data } }
  } catch (error) {
    console.error('Error recovering abandoned cart:', error)
    return { success: false, message: handleError(error) }
  }
}

/**
 * Da de baja (opt-out) al email asociado a un token de recuperación. Upsert sobre
 * `newsletter_subscriptions` con isSubscribed=false: el cron de recuperación
 * respeta esa baja y no volverá a enviar correos a esa dirección.
 */
export async function unsubscribeAbandonedCart(
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const record = await db.abandonedCart.findUnique({ where: { recoveryToken: token } })
    if (!record) {
      return { success: false, message: 'Enlace inválido' }
    }

    await db.newsletterSubscription.upsert({
      where: { email: record.email },
      create: {
        email: record.email,
        source: 'cart-recovery-unsubscribe',
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
      update: { isSubscribed: false, unsubscribedAt: new Date() },
    })

    return { success: true, message: 'Has sido dado de baja. No volverás a recibir estos correos.' }
  } catch (error) {
    console.error('Error unsubscribing from cart recovery:', error)
    return { success: false, message: handleError(error) }
  }
}
