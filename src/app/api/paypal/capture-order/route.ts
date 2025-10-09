import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { ordersController } from '@/lib/paypal'
import { db } from '@/lib/db'

interface InvoiceItem {
  productId: string
  planId?: string
  name: string
  price: number
  quantity: number
}

interface InvoiceData {
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  currency?: string
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
    
    const { orderID, invoiceData } = body as {
      orderID: string
      invoiceData: InvoiceData
    }

    if (!orderID) {
      return NextResponse.json(
        { error: 'ID de orden requerido' },
        { status: 400 }
      )
    }
    
    // Capturar el pago en PayPal
    const { result: captureData } = await ordersController.captureOrder({ id: orderID })

    // Verificar que el pago fue exitoso
    if (captureData?.status === 'COMPLETED') {
      // Crear la factura en la base de datos
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`
      
      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          userId: userId,
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount || 0,
          tax: invoiceData.tax || 0,
          total: invoiceData.total,
          status: 'PAID',
          currency: invoiceData.currency || 'USD',
          paidAt: new Date(),
          paymentMethod: 'paypal',
          paypalOrderId: orderID,
          paypalCaptureId: captureData.id,
          paypalPayerEmail: captureData.payer?.emailAddress,
          notes: `PayPal Order ID: ${orderID}, Capture ID: ${captureData.id}`,
          items: {
            create: invoiceData.items.map((item) => ({
              productId: item.productId,
              planId: item.planId,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              total: item.price * (item.quantity || 1),
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // Procesar las compras de productos
      const purchases = await Promise.all(
        invoiceData.items.map(async (item) => {
          return await db.productPurchase.create({
            data: {
              userId: userId,
              productId: item.productId,
              invoiceId: invoice.id,
              status: 'CONFIRMED',
            },
          })
        })
      )
      
      return NextResponse.json({
        success: true,
        captureID: captureData.id,
        status: captureData.status,
        invoice,
        purchases,
      })
    } else {
      return NextResponse.json(
        { error: 'El pago no se completó correctamente' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    return NextResponse.json(
      { error: 'Error al capturar el pago de PayPal' },
      { status: 500 }
    )
  }
}
