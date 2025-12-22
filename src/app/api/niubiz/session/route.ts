import { auth } from '@/auth'
import { createNiubizSession, getNiubizAccessToken } from '@/lib/niubiz'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { amount } = body

    if (!amount) {
      return new NextResponse('Amount is required', { status: 400 })
    }

    // 1. Get Access Token
    const accessToken = await getNiubizAccessToken()

    // 2. Create Session
    const niubizSession = await createNiubizSession(amount, accessToken)
    console.log('[NIUBIZ_SESSION_DEBUG] Created session for Merchant:', niubizSession.merchantId)

    return NextResponse.json(niubizSession)
  } catch (error) {
    console.error('[NIUBIZ_SESSION_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
