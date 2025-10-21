import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { ordersController } from '@/lib/paypal'
import { getCreditPackageById } from '@/lib/actions/credits'
import {
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk'

export async function POST(req: NextRequest) {
  try {
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
    const { packageId } = body as { packageId: string }

    if (!packageId) {
      return NextResponse.json({ error: 'ID de paquete requerido' }, { status: 400 })
    }

    // Obtener información del paquete
    const packageResult = await getCreditPackageById(packageId)
    if (!packageResult.success || !packageResult.data) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    const pkg = packageResult.data
    const totalCredits = pkg.credits + pkg.bonusCredits

    // Crear la orden en PayPal
    const collect = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: pkg.price.toFixed(2),
              breakdown: {
                itemTotal: {
                  currencyCode: 'USD',
                  value: pkg.price.toFixed(2),
                },
              },
            },
            items: [
              {
                name: pkg.name,
                description: `${totalCredits} créditos (${pkg.credits} base + ${pkg.bonusCredits} bonus)`,
                unitAmount: {
                  currencyCode: 'USD',
                  value: pkg.price.toFixed(2),
                },
                quantity: '1',
              },
            ],
          },
        ],
        applicationContext: {
          brandName: 'Lingowow',
          landingPage: OrderApplicationContextLandingPage.NoPreference,
          userAction: OrderApplicationContextUserAction.PayNow,
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/credits/confirmation`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/credits/buy`,
        },
      },
    }

    const { result } = await ordersController.createOrder(collect)

    return NextResponse.json({
      orderID: result?.id,
      packageId,
    })
  } catch (error) {
    console.error('Error creating PayPal credit order:', error)

    return NextResponse.json({ error: 'Error al crear la orden de PayPal' }, { status: 500 })
  }
}
