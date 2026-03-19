import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { verifyPaypalTransaction } from '@/lib/actions/commercial'

/**
 * POST /api/bot/paypal-verify
 * Verify a PayPal order/invoice/payment and return transaction details
 * Body: { paypalId: string } — can be order ID, invoice ID, invoice URL, or payment ID
 * Auth: API Key with scope 'enrollments:write'
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { paypalId } = body as { paypalId?: string }

    if (!paypalId || paypalId.trim().length === 0) {
      return NextResponse.json(
        { error: 'paypalId es requerido (puede ser order ID, invoice ID, URL de factura, o payment ID)' },
        { status: 400 }
      )
    }

    const result = await verifyPaypalTransaction(paypalId.trim())

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    const d = result.data!
    return NextResponse.json({
      success: true,
      data: {
        type: d.type,
        resourceId: d.resourceId,
        payerEmail: d.email,
        payerName: [d.firstName, d.lastName].filter(Boolean).join(' '),
        amount: d.amount,
        currency: d.currency,
        date: d.date,
        items: d.items?.map((i: { name: string; quantity: string; unit_amount: { value: string } }) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.unit_amount?.value,
        })) || [],
        // Auto-matched plan/product/course from our database
        matchedPlan: d.matchedPlan ? {
          id: d.matchedPlan.id,
          name: d.matchedPlan.name,
          includesClasses: d.matchedPlan.includesClasses,
          classesPerPeriod: d.matchedPlan.classesPerPeriod,
          classesPerWeek: d.matchedPlan.classesPerWeek,
        } : null,
        matchedProduct: d.matchedProduct ? {
          id: d.matchedProduct.id,
          name: d.matchedProduct.name,
        } : null,
        matchedCourse: d.matchedCourse ? {
          id: d.matchedCourse.id,
          title: d.matchedCourse.title,
          classDuration: d.matchedCourse.classDuration,
        } : null,
      },
    })
  } catch (error) {
    console.error('[BOT API] Error verifying PayPal:', error)
    return NextResponse.json(
      { error: 'Error al verificar la transacción de PayPal' },
      { status: 500 }
    )
  }
}
