import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createOrderSchema = z.object({
  planId: z.string().min(1, 'Plan ID es requerido'),
  language: z.string().default('es'),
  couponCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const body = await req.json()
    const { planId, language, couponCode } = createOrderSchema.parse(body)

    // Obtener el plan con su precio localizado
    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: {
        pricing: {
          where: { language, isActive: true },
        },
        product: true,
      },
    })

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: 'Plan no encontrado o no disponible' },
        { status: 404 }
      )
    }

    // Determinar precio
    const localizedPricing = plan.pricing[0]
    const price = localizedPricing?.price || plan.price
    const currency = localizedPricing?.currency || 'USD'

    let discount = 0
    let coupon = null

    // Validar cupón si se proporciona
    if (couponCode) {
      coupon = await db.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: new Date() } },
          ],
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gte: new Date() } },
              ],
            },
          ],
        },
      })

      if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
          discount = (price * coupon.value) / 100
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount
          }
        } else {
          discount = coupon.value
        }
      }
    }

    const total = Math.max(0, price - discount)

    // Crear orden pendiente en PayPal
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!
    const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'

    // Obtener access token de PayPal
    const authResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const authData = await authResponse.json()

    if (!authData.access_token) {
      throw new Error('Error obteniendo token de PayPal')
    }

    // Crear orden en PayPal
    const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: total.toFixed(2),
            },
            description: `${plan.name}${plan.product ? ` - ${plan.product.name}` : ''}`,
          },
        ],
      }),
    })

    const orderData = await orderResponse.json()

    if (!orderData.id) {
      throw new Error('Error creando orden en PayPal')
    }

    // Generar número de compra único
    const purchaseNumber = `MBL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Guardar orden pendiente usando la estructura existente del schema
    await db.pendingOrder.create({
      data: {
        purchaseNumber,
        userId: user.id,
        customerEmail: user.email,
        customerName: user.name,
        amount: total,
        currency,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        invoiceData: {
          paypalOrderId: orderData.id,
          planId: plan.id,
          planName: plan.name,
          language,
          originalPrice: price,
          discount,
          couponId: coupon?.id,
          couponCode: coupon?.code,
        },
      },
    })

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      purchaseNumber,
      amount: total,
      currency,
      discount,
      plan: {
        id: plan.id,
        name: plan.name,
      },
    })
  } catch (error) {
    console.error('Error creando orden PayPal:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear la orden de pago' },
      { status: 500 }
    )
  }
}
