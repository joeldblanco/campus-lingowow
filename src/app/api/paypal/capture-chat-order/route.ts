import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ordersController } from '@/lib/paypal'
import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://lingowow.com'
  const searchParams = req.nextUrl.searchParams

  // PayPal sends 'token' as the order ID on redirect
  const orderId = searchParams.get('token')
  const planId = searchParams.get('planId')

  if (!orderId) {
    return NextResponse.redirect(`${domain}/dashboard?payment=error`)
  }

  const session = await auth()
  if (!session?.user?.id) {
    const callbackUrl = req.nextUrl.toString()
    return NextResponse.redirect(
      `${domain}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    )
  }

  try {
    const userId = session.user.id

    // Capture the PayPal order
    const { result: captureData } = await ordersController.captureOrder({ id: orderId })

    if (captureData?.status !== 'COMPLETED') {
      return NextResponse.redirect(`${domain}/dashboard?payment=failed`)
    }

    // Avoid double-processing: check if this order was already captured
    const existingInvoice = await db.invoice.findFirst({
      where: { paypalOrderId: orderId },
    })
    if (existingInvoice) {
      return NextResponse.redirect(`${domain}/dashboard?payment=enrolled`)
    }

    // Look up the plan
    const plan = planId
      ? await db.plan.findUnique({
          where: { id: planId },
          select: { id: true, name: true, price: true, includesClasses: true, courseId: true, classesPerPeriod: true },
        })
      : null

    const planName = plan?.name ?? 'Plan Lingowow'
    const amount = plan?.price ?? 0

    // Create invoice
    const invoiceNumber = `INV-CHAT-${Date.now().toString().slice(-8)}`
    await db.invoice.create({
      data: {
        invoiceNumber,
        userId,
        subtotal: amount,
        discount: 0,
        tax: 0,
        total: amount,
        status: 'PAID',
        currency: 'USD',
        paidAt: new Date(),
        paymentMethod: 'paypal',
        paypalOrderId: orderId,
        paypalCaptureId: (captureData as { id?: string }).id,
        paypalPayerEmail: (captureData as { payer?: { emailAddress?: string } }).payer?.emailAddress,
        notes: `Chat payment: ${planName}. PayPal Order ID: ${orderId}`,
        ...(plan
          ? {
              items: {
                create: [
                  {
                    planId: plan.id,
                    name: planName,
                    price: amount,
                    quantity: 1,
                    total: amount,
                  },
                ],
              },
            }
          : {}),
      },
    })

    // Create enrollment if plan includes classes
    if (plan?.includesClasses && plan.courseId) {
      const today = new Date()

      let currentPeriod = await db.academicPeriod.findFirst({
        where: {
          startDate: { lte: today },
          endDate: { gte: today },
          isSpecialWeek: false,
        },
      })

      if (!currentPeriod) {
        currentPeriod = await db.academicPeriod.findFirst({
          where: { startDate: { gte: today }, isSpecialWeek: false },
          orderBy: { startDate: 'asc' },
        })
      }

      if (currentPeriod) {
        await db.enrollment.upsert({
          where: {
            studentId_courseId_academicPeriodId: {
              studentId: userId,
              courseId: plan.courseId,
              academicPeriodId: currentPeriod.id,
            },
          },
          create: {
            studentId: userId,
            courseId: plan.courseId,
            academicPeriodId: currentPeriod.id,
            status: EnrollmentStatus.ACTIVE,
            classesTotal: plan.classesPerPeriod ?? 8,
            classesAttended: 0,
            classesMissed: 0,
          },
          update: {
            status: EnrollmentStatus.ACTIVE,
            classesTotal: plan.classesPerPeriod ?? 8,
          },
        })
      }
    }

    // Update role: GUEST → STUDENT
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    })

    if (user) {
      if (user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
        const updatedRoles = user.roles.filter((r) => r !== 'GUEST')
        updatedRoles.push('STUDENT')
        await db.user.update({
          where: { id: userId },
          data: { roles: updatedRoles },
        })
      } else if (!user.roles.includes('STUDENT')) {
        await db.user.update({
          where: { id: userId },
          data: { roles: { push: 'STUDENT' } },
        })
      }
    }

    return NextResponse.redirect(`${domain}/dashboard?payment=enrolled`)
  } catch (error) {
    console.error('[CaptureChatOrder] Error:', error)
    return NextResponse.redirect(`${domain}/dashboard?payment=error`)
  }
}
