import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { ordersController } from '@/lib/paypal'
import { 
  CheckoutPaymentIntent, 
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction 
} from '@paypal/paypal-server-sdk'

interface CartItem {
  productId: string
  planId?: string
  name: string
  description?: string
  price: number
  quantity: number
}

export async function POST(req: NextRequest) {
  try {
    // Intentar obtener el token primero (más confiable)
    const token = await getToken({ 
      req,
      secret: process.env.JWT_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token'
    })
    
    // Si no hay token, intentar con auth()
    let userId = token?.sub
    
    if (!userId) {
      const session = await auth()
      userId = session?.user?.id
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    
    const { items, subtotal, tax, total, currency = 'USD' } = body as {
      items: CartItem[]
      subtotal: number
      tax: number
      total: number
      currency?: string
    }

    if (!items || !subtotal || total === undefined) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Crear la orden en PayPal
    const collect = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: total.toFixed(2),
              breakdown: {
                itemTotal: {
                  currencyCode: currency,
                  value: subtotal.toFixed(2),
                },
                taxTotal: {
                  currencyCode: currency,
                  value: tax.toFixed(2),
                },
              },
            },
            items: items.map((item) => ({
              name: item.name,
              description: item.description || '',
              unitAmount: {
                currencyCode: currency,
                value: item.price.toFixed(2),
              },
              quantity: item.quantity.toString(),
            })),
          },
        ],
        applicationContext: {
          brandName: 'Lingowow',
          landingPage: OrderApplicationContextLandingPage.NoPreference,
          userAction: OrderApplicationContextUserAction.PayNow,
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/cart/checkout/confirmation`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/cart/checkout`,
        },
      },
    }

    const { result } = await ordersController.createOrder(collect)

    return NextResponse.json({
      orderID: result?.id,
    })
  } catch (error) {
    console.error('Error creating PayPal order:', error)
    
    return NextResponse.json(
      { error: 'Error al crear la orden de PayPal' },
      { status: 500 }
    )
  }
}
