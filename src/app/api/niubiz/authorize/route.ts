import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { authorizeNiubizTransaction, getNiubizAccessToken, registerNiubizCard } from '@/lib/niubiz'
import { db } from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/mail'
import { Invoice } from '@prisma/client'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface InvoiceItem {
  productId: string
  planId?: string
  name: string
  price: number
  quantity: number
  selectedSchedule?: ScheduleSlot[]
  proratedClasses?: number
  proratedPrice?: number
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
    const session = await auth()

    // allow guest checkout with customer info

    const body = await req.json()
    const { transactionToken, amount, orderId, registerCard, invoiceData, customerInfo } = body as {
      transactionToken: string
      amount: number
      orderId: string
      registerCard?: boolean
      invoiceData?: InvoiceData
      customerInfo?: {
        email: string
        firstName: string
        lastName: string
      }
    }

    if (!transactionToken || !amount || !orderId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Determine user ID
    let userId = session?.user?.id

    // If no user but customerInfo aka GUEST
    if (!userId && customerInfo) {
      // Check if user exists by email first?
      const existingUser = await db.user.findUnique({
        where: { email: customerInfo.email },
      })

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create guest user
        const guestUser = await db.user.create({
          data: {
            name: customerInfo.firstName,
            lastName: customerInfo.lastName,
            email: customerInfo.email,
            roles: ['GUEST'],
          },
        })
        userId = guestUser.id
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized and no customer info provided', { status: 401 })
    }

    const accessToken = await getNiubizAccessToken()

    // 1. Authorize the transaction
    const authorization = await authorizeNiubizTransaction(
      transactionToken,
      amount,
      orderId,
      accessToken
    )

    // Check if authorization was successful
    // ACTION_CODE "000" means Approved usually
    if (authorization?.dataMap?.ACTION_CODE !== '000') {
      throw new Error(
        `Niubiz Payment Failed: ${authorization?.dataMap?.ACTION_DESCRIPTION || 'Unknown error'}`
      )
    }

    let cardToken = null

    // 2. Register Card if requested (for Recurrence)
    if (registerCard) {
      try {
        cardToken = await registerNiubizCard(transactionToken, accessToken)
      } catch (tokenError) {
        console.error('Error registering card token:', tokenError)
      }
    }

    // 3. Create Invoice if invoiceData is present
    let invoice: Invoice | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let purchases: any[] = []
    let needsScheduleSetup = false

    if (invoiceData) {
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`

      invoice = await db.invoice.create({
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
          paymentMethod: 'niubiz',
          niubizTransactionId: transactionToken,
          niubizOrderId: orderId,
          notes: `Niubiz Order ID: ${orderId}, Auth: ${authorization?.header?.ecoreTransactionUUID}`,
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

      // Get current academic period
      const currentPeriod = await db.academicPeriod.findFirst({
        where: { isActive: true },
      })

      // Process purchases
      purchases = await Promise.all(
        invoiceData.items.map(async (item) => {
          let plan = null
          let enrollment: { id: string; course?: { title?: string } } | null = null

          if (item.planId) {
            plan = await db.plan.findUnique({
              where: { id: item.planId },
              include: { course: true },
            })
          }

          const purchase = await db.productPurchase.create({
            data: {
              userId: userId!,
              productId: item.productId,
              invoiceId: invoice!.id,
              status: 'CONFIRMED',
              selectedSchedule: item.selectedSchedule
                ? JSON.parse(JSON.stringify(item.selectedSchedule))
                : undefined,
              proratedClasses: item.proratedClasses || undefined,
              proratedPrice: item.proratedPrice || undefined,
            },
          })

          // Enrollment logic
          if (
            plan?.includesClasses &&
            plan.courseId &&
            item.selectedSchedule &&
            item.selectedSchedule.length > 0 &&
            currentPeriod
          ) {
            enrollment = await db.enrollment.upsert({
              where: {
                studentId_courseId_academicPeriodId: {
                  studentId: userId!,
                  courseId: plan.courseId,
                  academicPeriodId: currentPeriod.id,
                },
              },
              create: {
                studentId: userId!,
                courseId: plan.courseId,
                academicPeriodId: currentPeriod.id,
                status: 'ACTIVE',
                classesTotal: item.proratedClasses || plan.classesPerPeriod || 8,
                classesAttended: 0,
                classesMissed: 0,
              },
              update: {
                status: 'ACTIVE',
                classesTotal: item.proratedClasses || plan.classesPerPeriod || 8,
              },
            })

            await db.productPurchase.update({
              where: { id: purchase.id },
              data: {
                enrollmentId: enrollment.id,
                status: 'ENROLLED',
              },
            })

            // Create schedules and bookings
            if (enrollment) {
              await Promise.all(
                item.selectedSchedule.map(async (slot) => {
                  const existingSchedule = await db.classSchedule.findUnique({
                    where: {
                      enrollmentId_dayOfWeek_startTime: {
                        enrollmentId: enrollment!.id,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                      },
                    },
                  })

                  if (!existingSchedule) {
                    await db.classSchedule.create({
                      data: {
                        enrollmentId: enrollment!.id,
                        teacherId: slot.teacherId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      },
                    })
                  }
                })
              )

              // Bookings for current period
              const periodStart = new Date(currentPeriod.startDate)
              const periodEnd = new Date(currentPeriod.endDate)
              const today = new Date()
              const startDate = today > periodStart ? today : periodStart
              const currentDate = new Date(startDate)

              while (currentDate <= periodEnd) {
                const dayOfWeek = currentDate.getDay()
                const scheduleForDay = item.selectedSchedule.find(
                  (slot) => slot.dayOfWeek === dayOfWeek
                )

                if (scheduleForDay) {
                  const dayString = currentDate.toISOString().split('T')[0]
                  const existingBooking = await db.classBooking.findFirst({
                    where: {
                      studentId: userId!,
                      teacherId: scheduleForDay.teacherId,
                      day: dayString,
                      timeSlot: `${scheduleForDay.startTime}-${scheduleForDay.endTime}`,
                    },
                  })

                  if (!existingBooking) {
                    await db.classBooking.create({
                      data: {
                        studentId: userId!,
                        teacherId: scheduleForDay.teacherId,
                        enrollmentId: enrollment!.id,
                        day: dayString,
                        timeSlot: `${scheduleForDay.startTime}-${scheduleForDay.endTime}`,
                        status: 'CONFIRMED',
                      },
                    })
                  }
                }
                currentDate.setDate(currentDate.getDate() + 1)
              }
            }

            // Update role to STUDENT
            const user = await db.user.findUnique({
              where: { id: userId },
              select: { roles: true },
            })

            if (user && user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
              const updatedRoles = user.roles.filter((role) => role !== 'GUEST')
              updatedRoles.push('STUDENT')
              await db.user.update({
                where: { id: userId },
                data: { roles: updatedRoles },
              })
            } else if (user && !user.roles.includes('STUDENT')) {
              await db.user.update({
                where: { id: userId },
                data: { roles: { push: 'STUDENT' } },
              })
            }
          }

          return {
            ...purchase,
            enrollment,
          }
        })
      )

      needsScheduleSetup = purchases.some((p) => p.enrollment && !p.selectedSchedule)

      // Send Email
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true, lastName: true },
        })

        if (user?.email) {
          await sendPaymentConfirmationEmail(user.email, {
            customerName: `${user.name || ''} ${user.lastName || ''}`.trim() || 'Cliente',
            invoiceNumber: invoice.invoiceNumber,
            items: invoiceData.items.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
            })),
            subtotal: invoiceData.subtotal,
            discount: invoiceData.discount || 0,
            tax: invoiceData.tax || 0,
            total: invoiceData.total,
            currency: invoiceData.currency || 'USD',
          })
        }
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      authorization,
      cardToken,
      orderId,
      invoice,
      purchases,
      needsScheduleSetup,
      enrollments: purchases
        .filter((p) => p.enrollment !== null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({
          id: p.enrollment!.id,
          courseTitle: p.enrollment!.course?.title,
        })),
    })
  } catch (error) {
    console.error('[NIUBIZ_AUTHORIZE_ERROR]', error)
    // Return error message for client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse((error as any).message || 'Internal Error', { status: 500 })
  }
}
