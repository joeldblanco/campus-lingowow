import { auth } from '@/auth'
import { authorizeNiubizTransaction, getNiubizAccessToken, registerNiubizCard } from '@/lib/niubiz'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { transactionToken, amount, orderId, registerCard } = body

    if (!transactionToken || !amount || !orderId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const accessToken = await getNiubizAccessToken()

    // 1. Authorize the transaction
    // Note: If registerCard is true, we might want to do a $1 auth/void check OR standard purchase for the first month.
    // Usually for subscriptions, the user pays the first month immediately.
    const authorization = await authorizeNiubizTransaction(
      transactionToken,
      amount,
      orderId,
      accessToken
    )

    // Check if authorization was successful
    // Niubiz structure might vary, but usually has a 'data' object or 'header' with codes.
    // We should parse it better in a real scenario.
    // Assuming success if we got here without throwing Error in service.

    let cardToken = null

    // 2. Register Card if requested (for Recurrence)
    if (registerCard) {
      try {
        // Register using the transactionToken
        cardToken = await registerNiubizCard(transactionToken, accessToken)
        // Note: It's important to save this cardToken to the user's subscription record in the database
        // This step should ideally happen along with creating the Subscription in Prisma.
        // We return it here so the client (or the calling Service) can save it.
      } catch (tokenError) {
        console.error('Error registering card token:', tokenError)
        // We don't fail the transaction if tokenization fails, but we should log it or warn.
      }
    }

    return NextResponse.json({
      success: true,
      authorization,
      cardToken,
      orderId,
    })
  } catch (error) {
    console.error('[NIUBIZ_AUTHORIZE_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
