import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { validateCoupon } from '@/lib/coupon-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, planId } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'El código del cupón es requerido' },
        { status: 400 }
      )
    }

    const session = await auth()
    const userId = session?.user?.id

    const result = await validateCoupon(code, userId, planId)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.coupon!.id,
        code: result.coupon!.code,
        name: result.coupon!.name,
        type: result.coupon!.type,
        value: result.coupon!.value,
        maxDiscount: result.coupon!.maxDiscount,
        restrictedToPlanId: result.coupon!.restrictedToPlanId,
      },
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { valid: false, error: 'Error al validar el cupón' },
      { status: 500 }
    )
  }
}
