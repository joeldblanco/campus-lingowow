import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { ordersController } from '@/lib/paypal'
import { db } from '@/lib/db'
import { processCreditPackagePurchase } from '@/lib/actions/credits'
import { sendCreditPurchaseConfirmationEmail } from '@/lib/mail'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = rateLimit(`credit-payment:${ip}`, { windowMs: 60000, maxRequests: 5 })
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de pago. Por favor espera un momento.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Autenticación
    const token = await getToken({
      req,
      secret: process.env.JWT_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
    })

    let userId = token?.sub

    if (!userId) {
      const session = await auth()
      userId = session?.user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { orderID, packageId } = body as {
      orderID: string
      packageId: string
    }

    if (!orderID || !packageId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Capturar el pago en PayPal
    const { result: captureData } = await ordersController.captureOrder({ id: orderID })

    // Verificar que el pago fue exitoso
    if (captureData?.status === 'COMPLETED') {
      // Obtener información del paquete
      const pkg = await db.creditPackage.findUnique({
        where: { id: packageId },
      })

      if (!pkg) {
        return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
      }

      // Crear la factura en la base de datos
      const invoiceNumber = `INV-CREDITS-${Date.now().toString().slice(-8)}`

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          userId: userId,
          subtotal: pkg.price,
          discount: 0,
          tax: 0,
          total: pkg.price,
          status: 'PAID',
          currency: 'USD',
          paidAt: new Date(),
          paymentMethod: 'paypal',
          paypalOrderId: orderID,
          paypalCaptureId: captureData.id,
          paypalPayerEmail: captureData.payer?.emailAddress,
          notes: `Compra de paquete de créditos: ${pkg.name}`,
        },
      })

      // Procesar la compra del paquete de créditos
      const purchaseResult = await processCreditPackagePurchase(userId, packageId, invoice.id)

      if (!purchaseResult.success) {
        return NextResponse.json(
          { error: purchaseResult.error || 'Error al procesar la compra' },
          { status: 500 }
        )
      }

      // Enviar email de confirmación
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true, lastName: true },
        })
        
        if (user?.email) {
          await sendCreditPurchaseConfirmationEmail(user.email, {
            customerName: `${user.name || ''} ${user.lastName || ''}`.trim() || 'Cliente',
            invoiceNumber: invoice.invoiceNumber,
            creditsAmount: pkg.credits + pkg.bonusCredits,
            price: pkg.price,
            currency: 'USD',
          })
        }
      } catch (emailError) {
        console.error('Error sending credit purchase confirmation email:', emailError)
      }

      return NextResponse.json({
        success: true,
        captureID: captureData.id,
        status: captureData.status,
        invoice,
        creditsAdded: pkg.credits + pkg.bonusCredits,
        package: pkg,
      })
    } else {
      return NextResponse.json(
        { error: 'El pago no se completó correctamente' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error capturing PayPal credit order:', error)
    return NextResponse.json({ error: 'Error al capturar el pago de PayPal' }, { status: 500 })
  }
}
