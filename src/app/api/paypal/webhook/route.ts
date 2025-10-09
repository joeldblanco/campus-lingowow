import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Webhook para eventos de PayPal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.event_type

    console.log('PayPal Webhook Event:', eventType)

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        // El pago fue capturado exitosamente
        const orderId = body.resource?.supplementary_data?.related_ids?.order_id

        if (orderId) {
          // Actualizar el estado de la factura si existe
          await db.invoice.updateMany({
            where: {
              notes: {
                contains: orderId,
              },
            },
            data: {
              status: 'PAID',
              paidAt: new Date(),
            },
          })
        }
        break

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        // El pago fue denegado o reembolsado
        const deniedOrderId = body.resource?.supplementary_data?.related_ids?.order_id

        if (deniedOrderId) {
          await db.invoice.updateMany({
            where: {
              notes: {
                contains: deniedOrderId,
              },
            },
            data: {
              status: 'CANCELLED',
            },
          })

          // Cancelar las compras asociadas
          const invoices = await db.invoice.findMany({
            where: {
              notes: {
                contains: deniedOrderId,
              },
            },
          })

          for (const invoice of invoices) {
            await db.productPurchase.updateMany({
              where: {
                invoiceId: invoice.id,
              },
              data: {
                status: 'CANCELLED',
              },
            })
          }
        }
        break

      default:
        console.log('Unhandled webhook event:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    return NextResponse.json(
      { error: 'Error al procesar el webhook' },
      { status: 500 }
    )
  }
}
