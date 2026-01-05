import { auth } from '@/auth'
import { createNiubizSession, getNiubizAccessToken } from '@/lib/niubiz'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    const body = await req.json()
    const { amount, allowGuest, purchaseNumber, invoiceData, customerInfo } = body

    if (!amount) {
      return new NextResponse('Amount is required', { status: 400 })
    }
    
    if (!session?.user && !allowGuest) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 1. Get Access Token
    const accessToken = await getNiubizAccessToken()

    // 2. Create Session
    const niubizSession = await createNiubizSession(amount, accessToken)
    console.log('[NIUBIZ_SESSION_DEBUG] Created session for Merchant:', niubizSession.merchantId)

    // 3. Save pending order data if provided (for 3DS redirect flow)
    if (purchaseNumber && invoiceData) {
      console.log('[NIUBIZ_SESSION] Saving pending order:', purchaseNumber)
      
      // Delete any existing pending order with same purchaseNumber
      await db.pendingOrder.deleteMany({
        where: { purchaseNumber }
      }).catch(() => {}) // Ignore if table doesn't exist yet
      
      // Create new pending order
      await db.pendingOrder.create({
        data: {
          purchaseNumber,
          userId: session?.user?.id || null,
          customerEmail: customerInfo?.email || null,
          customerName: customerInfo?.firstName || null,
          amount,
          currency: invoiceData.currency || 'USD',
          invoiceData: invoiceData,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        }
      }).catch((err) => {
        console.error('[NIUBIZ_SESSION] Error saving pending order:', err)
      })
    }

    return NextResponse.json(niubizSession)
  } catch (error) {
    console.error('[NIUBIZ_SESSION_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
