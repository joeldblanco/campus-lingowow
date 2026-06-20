import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendCartRecoveryEmail } from '@/lib/mail'
import { AbandonedCartItemSchema } from '@/schemas/abandoned-cart'
import * as z from 'zod'

// Enviar el correo solo tras ~1h de inactividad del carrito.
const ABANDONMENT_DELAY_MS = 60 * 60 * 1000

export async function GET(req: NextRequest) {
  // Guard de cron (igual que el resto): exige CRON_SECRET, sin bypass en dev.
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const threshold = new Date(Date.now() - ABANDONMENT_DELAY_MS)

    // Elegibles: ciclo en curso (PENDING), correo aún no enviado e inactivos ≥1h.
    // `status: PENDING` excluye PURCHASED/RECOVERED => "no enviar si ya compró".
    // `recoveryEmailSentAt: null` => "máximo 1 correo" (dedupe).
    const carts = await db.abandonedCart.findMany({
      where: {
        status: 'PENDING',
        recoveryEmailSentAt: null,
        updatedAt: { lte: threshold },
      },
    })

    let sentCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const cart of carts) {
      try {
        // Consentimiento: respetar la baja (opt-out). Si no existe registro de
        // suscripción, se trata como transaccional (permitido por defecto).
        const subscription = await db.newsletterSubscription.findUnique({
          where: { email: cart.email },
          select: { isSubscribed: true },
        })
        if (subscription && subscription.isSubscribed === false) {
          skippedCount++
          continue
        }

        const parsedItems = z.array(AbandonedCartItemSchema).safeParse(cart.items)
        if (!parsedItems.success || parsedItems.data.length === 0) {
          skippedCount++
          continue
        }

        await sendCartRecoveryEmail(cart.email, {
          items: parsedItems.data.map((item) => ({
            name: item.product.title,
            planName: item.plan.name,
            price: item.plan.price,
            quantity: item.quantity ?? 1,
          })),
          total: cart.total,
          currency: cart.currency,
          recoveryToken: cart.recoveryToken,
        })

        // Marcar como enviado ANTES de seguir => idempotente entre corridas.
        await db.abandonedCart.update({
          where: { id: cart.id },
          data: { status: 'EMAILED', recoveryEmailSentAt: new Date() },
        })

        sentCount++
      } catch (error) {
        console.error(`Error sending cart recovery email for ${cart.id}:`, error)
        errors.push(cart.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} cart recovery emails`,
      totalCandidates: carts.length,
      sentCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in abandoned cart recovery cron:', error)
    return NextResponse.json({ error: 'Error processing cart recovery' }, { status: 500 })
  }
}
