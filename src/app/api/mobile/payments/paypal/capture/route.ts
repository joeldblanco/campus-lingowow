import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const captureOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID es requerido'),
  purchaseNumber: z.string().min(1, 'Purchase number es requerido'),
})

interface InvoiceData {
  paypalOrderId: string
  planId: string
  planName: string
  language: string
  originalPrice: number
  discount: number
  couponId?: string
  couponCode?: string
}

export async function POST(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const body = await req.json()
    const { orderId, purchaseNumber } = captureOrderSchema.parse(body)

    // Buscar orden pendiente por purchaseNumber
    const pendingOrder = await db.pendingOrder.findFirst({
      where: {
        purchaseNumber,
        userId: user.id,
        status: 'PENDING',
      },
    })

    if (!pendingOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Extraer datos del JSON invoiceData
    const invoiceData = pendingOrder.invoiceData as unknown as InvoiceData

    if (invoiceData.paypalOrderId !== orderId) {
      return NextResponse.json(
        { error: 'Order ID no coincide' },
        { status: 400 }
      )
    }

    // Obtener el plan
    const plan = await db.plan.findUnique({
      where: { id: invoiceData.planId },
      include: { course: true },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      )
    }

    // Capturar pago en PayPal
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!
    const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'

    const authResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const authData = await authResponse.json()

    const captureResponse = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    )

    const captureData = await captureResponse.json()

    if (captureData.status !== 'COMPLETED') {
      await db.pendingOrder.update({
        where: { id: pendingOrder.id },
        data: { status: 'CANCELLED' },
      })

      return NextResponse.json(
        { error: 'Error al procesar el pago' },
        { status: 400 }
      )
    }

    // Crear factura
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId: user.id,
        subtotal: invoiceData.originalPrice,
        discount: invoiceData.discount,
        total: pendingOrder.amount,
        status: 'PAID',
        currency: pendingOrder.currency,
        couponId: invoiceData.couponId || null,
        paymentMethod: 'paypal',
        paypalOrderId: orderId,
        paypalCaptureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        paidAt: new Date(),
        items: {
          create: {
            planId: plan.id,
            name: invoiceData.planName,
            price: pendingOrder.amount,
            quantity: 1,
            total: pendingOrder.amount,
          },
        },
      },
    })

    // Si el plan incluye clases, crear inscripción
    if (plan.includesClasses && plan.courseId) {
      const activePeriod = await db.academicPeriod.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
      })

      if (activePeriod) {
        await db.enrollment.create({
          data: {
            studentId: user.id,
            courseId: plan.courseId,
            academicPeriodId: activePeriod.id,
            status: 'ACTIVE',
            classesTotal: plan.classesPerPeriod || 8,
            enrollmentType: 'AUTOMATIC',
          },
        })
      }
    }

    // Actualizar uso del cupón
    if (invoiceData.couponId) {
      await db.coupon.update({
        where: { id: invoiceData.couponId },
        data: { usageCount: { increment: 1 } },
      })
    }

    // Marcar orden como completada
    await db.pendingOrder.update({
      where: { id: pendingOrder.id },
      data: { status: 'COMPLETED' },
    })

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        currency: invoice.currency,
      },
      message: 'Pago procesado correctamente',
    })
  } catch (error) {
    console.error('Error capturando pago PayPal:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al procesar el pago' },
      { status: 500 }
    )
  }
}
