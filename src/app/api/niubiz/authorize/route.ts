import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { authorizeNiubizTransaction, getNiubizAccessToken, registerNiubizCard } from '@/lib/niubiz'
import { db } from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/mail'
import { formatFullName } from '@/lib/utils/name-formatter'
import type { Invoice } from '@prisma/client'
import {
  notifySelfServiceEnrollmentCreated,
  upsertSelfServiceEnrollment,
} from '@/lib/enrollments/self-service-enrollment'
import {
  classifyReservationReviewReason,
  persistReservationReview,
  RESERVATION_REVIEW_MARKER,
} from '@/lib/enrollments/paid-reservation-review'
import {
  DEFAULT_TEACHER_TIMEZONE,
  getUtcOccurrenceForDate,
  isOccurrenceEligibleForSelfService,
  resolveEligibleEnrollmentWindow,
} from '@/lib/enrollments/self-service-cutoff'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherTimezone?: string | null
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
  couponId?: string
}

interface CustomerInfo {
  email: string
  firstName: string
  lastName?: string | null
  address?: string
  city?: string
  country?: string
  zipCode?: string
}

const hasRequiredBillingInfo = (customerInfo?: CustomerInfo) => {
  return Boolean(
    customerInfo?.address?.trim() &&
    customerInfo?.city?.trim() &&
    customerInfo?.country?.trim() &&
    customerInfo?.zipCode?.trim()
  )
}

const isPendingOrderExpired = (expiresAt?: Date | null) =>
  Boolean(expiresAt && expiresAt <= new Date())

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
      customerInfo?: CustomerInfo
    }

    if (!transactionToken || !amount || !orderId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    if (invoiceData && !hasRequiredBillingInfo(customerInfo)) {
      return new NextResponse('Billing address is required for card payments', { status: 400 })
    }

    // Determine user ID without creating a guest until the order claim succeeds.
    const signedInUserId = session?.user?.id
    let userId = signedInUserId

    // If no user but customerInfo aka GUEST
    if (!userId && customerInfo) {
      const existingUser = await db.user.findUnique({
        where: { email: customerInfo.email },
        select: { id: true },
      })

      if (existingUser) {
        userId = existingUser.id
      }
    }

    const existingInvoice = await db.invoice.findFirst({
      where: { niubizOrderId: orderId },
      include: { items: true },
    })

    const matchingPaidInvoice =
      existingInvoice?.status === 'PAID' &&
      existingInvoice.userId === userId &&
      existingInvoice.niubizTransactionId === transactionToken &&
      Math.abs(existingInvoice.total - amount) < 0.0001

    if (existingInvoice) {
      if (!matchingPaidInvoice) {
        return new NextResponse('Payment already processed', { status: 409 })
      }

      const reservationPendingReview = existingInvoice.notes?.includes(
        `${RESERVATION_REVIEW_MARKER}:`
      )

      return NextResponse.json({
        success: true,
        replayed: true,
        authorization: null,
        cardToken: null,
        orderId,
        // Replays only need the public confirmation identifier. Do not return
        // the stored billing address, notes, items, or user relation again.
        invoice: {
          invoiceNumber: existingInvoice.invoiceNumber,
          status: existingInvoice.status,
          total: existingInvoice.total,
          currency: existingInvoice.currency,
          paymentMethod: existingInvoice.paymentMethod,
        },
        purchases: [],
        needsScheduleSetup: reservationPendingReview,
        reservation_pending_review: reservationPendingReview,
        enrollments: [],
      })
    }

    const pendingOrder = await db.pendingOrder.findUnique({ where: { purchaseNumber: orderId } })
    let pendingOrderClaimed = false

    if (pendingOrder) {
      const pendingIdentityMatches = pendingOrder.userId
        ? pendingOrder.userId === userId
        : Boolean(
            !signedInUserId &&
            customerInfo?.email &&
            pendingOrder.customerEmail &&
            customerInfo.email.trim().toLowerCase() ===
              pendingOrder.customerEmail.trim().toLowerCase()
          )

      if (!pendingIdentityMatches || Math.abs(pendingOrder.amount - amount) >= 0.0001) {
        return new NextResponse('Payment request does not match the pending order', { status: 409 })
      }

      if (pendingOrder.status !== 'PENDING' || isPendingOrderExpired(pendingOrder.expiresAt)) {
        return new NextResponse('Payment request is already being processed', { status: 409 })
      }

      const claim = await db.pendingOrder.updateMany({
        where: { id: pendingOrder.id, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      })

      if (claim.count !== 1) {
        return new NextResponse('Payment request is already being processed', { status: 409 })
      }

      pendingOrderClaimed = true
    }

    if (!userId && customerInfo) {
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
      if (pendingOrderClaimed && pendingOrder) {
        await db.pendingOrder.updateMany({
          where: { id: pendingOrder.id, status: 'COMPLETED' },
          data: { status: 'PENDING' },
        })
      }
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
    let reservationPendingReview = false
    let newlyCreatedEnrollmentIds: string[] = []

    if (invoiceData) {
      console.log('[NIUBIZ] Processing invoiceData:', JSON.stringify(invoiceData, null, 2))
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
          couponId: invoiceData.couponId || null,
          paidAt: new Date(),
          paymentMethod: 'niubiz',
          niubizTransactionId: transactionToken,
          niubizOrderId: orderId,
          billingCountry: customerInfo?.country?.trim() || null,
          billingCity: customerInfo?.city?.trim() || null,
          billingAddress: customerInfo?.address?.trim() || null,
          billingZipCode: customerInfo?.zipCode?.trim() || null,
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

      try {
        await db.$transaction(async (tx) => {
          const db = tx

          if (invoiceData.couponId) {
            await db.coupon.update({
              where: { id: invoiceData.couponId },
              data: { usageCount: { increment: 1 } },
            })
          }

          const today = new Date()

          const upcomingPeriods = await db.academicPeriod.findMany({
            where: {
              endDate: { gte: today },
              isSpecialWeek: false,
            },
            orderBy: { startDate: 'asc' },
          })

          // Process purchases
          purchases = await Promise.all(
            invoiceData.items.map(async (item) => {
              let plan = null
              let enrollment: { id: string; course?: { title?: string } } | null = null
              let enrollmentWasCreated = false
              let courseId: string | null = null
              let teacherTimezones = new Map<string, string>()
              let selectedScheduleWithTeacherTimezones = item.selectedSchedule

              if (item.planId) {
                plan = await db.plan.findUnique({
                  where: { id: item.planId },
                  include: {
                    course: true,
                    product: {
                      include: { course: true },
                    },
                  },
                })
                // Get courseId from plan, or from product if plan doesn't have it
                courseId = plan?.courseId || plan?.product?.courseId || null
              }

              if (item.selectedSchedule?.length) {
                const teacherIds = [...new Set(item.selectedSchedule.map((slot) => slot.teacherId))]
                const teachers = await db.user.findMany({
                  where: { id: { in: teacherIds } },
                  select: { id: true, timezone: true },
                })
                teacherTimezones = new Map(
                  teachers.map((teacher) => [
                    teacher.id,
                    teacher.timezone || DEFAULT_TEACHER_TIMEZONE,
                  ])
                )
                selectedScheduleWithTeacherTimezones = item.selectedSchedule.map((slot) => ({
                  ...slot,
                  teacherTimezone: teacherTimezones.get(slot.teacherId) || DEFAULT_TEACHER_TIMEZONE,
                }))
              }

              // If still no courseId, try to get it from the product directly
              if (!courseId && item.productId) {
                const product = await db.product.findUnique({
                  where: { id: item.productId },
                  select: { courseId: true },
                })
                courseId = product?.courseId || null
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
              console.log('[NIUBIZ] Enrollment check:', {
                planId: item.planId,
                includesClasses: plan?.includesClasses,
                planCourseId: plan?.courseId,
                productCourseId: plan?.product?.courseId,
                resolvedCourseId: courseId,
                selectedSchedule: item.selectedSchedule,
                selectedScheduleLength: item.selectedSchedule?.length,
                upcomingPeriods: upcomingPeriods.length,
              })

              const eligibleWindow = selectedScheduleWithTeacherTimezones?.length
                ? resolveEligibleEnrollmentWindow(
                    upcomingPeriods,
                    selectedScheduleWithTeacherTimezones,
                    today
                  )
                : null

              if (
                plan?.includesClasses &&
                courseId &&
                item.selectedSchedule &&
                item.selectedSchedule.length > 0 &&
                eligibleWindow
              ) {
                console.log(
                  '[NIUBIZ] Creating enrollment for student:',
                  userId,
                  'in course:',
                  courseId
                )

                // Extraer el teacherId del primer slot del horario seleccionado
                const firstTeacherId = item.selectedSchedule[0]?.teacherId || null

                const enrollmentResult = await upsertSelfServiceEnrollment({
                  studentId: userId!,
                  courseId: courseId!,
                  academicPeriodId: eligibleWindow.period.id,
                  teacherId: firstTeacherId,
                  classesTotal: item.proratedClasses ?? plan.classesPerPeriod ?? 8,
                  client: db,
                })
                enrollment = enrollmentResult.enrollment
                enrollmentWasCreated = enrollmentResult.wasCreated

                await db.productPurchase.update({
                  where: { id: purchase.id },
                  data: {
                    enrollmentId: enrollment.id,
                    status: 'ENROLLED',
                  },
                })

                // Create schedules and bookings
                if (enrollment) {
                  const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')

                  await Promise.all(
                    item.selectedSchedule.map(async (slot) => {
                      const timezone =
                        teacherTimezones.get(slot.teacherId) || DEFAULT_TEACHER_TIMEZONE
                      const utcData = convertRecurringScheduleToUTC(
                        slot.dayOfWeek,
                        slot.startTime,
                        slot.endTime,
                        timezone
                      )

                      const existingSchedule = await db.classSchedule.findUnique({
                        where: {
                          enrollmentId_dayOfWeek_startTime: {
                            enrollmentId: enrollment!.id,
                            dayOfWeek: utcData.dayOfWeek,
                            startTime: utcData.startTime,
                          },
                        },
                      })

                      if (!existingSchedule) {
                        await db.classSchedule.create({
                          data: {
                            enrollmentId: enrollment!.id,
                            teacherId: slot.teacherId,
                            dayOfWeek: utcData.dayOfWeek,
                            startTime: utcData.startTime,
                            endTime: utcData.endTime,
                          },
                        })
                      }
                    })
                  )

                  // Bookings for current period
                  // IMPORTANTE: Los horarios en selectedSchedule ya están convertidos a UTC
                  // Debemos iterar sobre las fechas UTC y comparar con dayOfWeek UTC
                  const periodEnd = new Date(eligibleWindow.period.endDate)
                  const startDate = new Date(eligibleWindow.enrollmentStart)
                  const currentDate = new Date(startDate)
                  currentDate.setUTCHours(0, 0, 0, 0)

                  while (currentDate <= periodEnd) {
                    // Usar getUTCDay() para obtener el día de la semana en UTC
                    // ya que los slots del schedule están en UTC
                    const dayOfWeekUTC = currentDate.getUTCDay()
                    const scheduleForDay = selectedScheduleWithTeacherTimezones?.find(
                      (slot) => slot.dayOfWeek === dayOfWeekUTC
                    )

                    if (scheduleForDay) {
                      const occurrenceAt = getUtcOccurrenceForDate(currentDate, scheduleForDay)

                      if (
                        occurrenceAt.getTime() < startDate.getTime() ||
                        occurrenceAt.getTime() > periodEnd.getTime() ||
                        !isOccurrenceEligibleForSelfService(occurrenceAt, scheduleForDay, today)
                      ) {
                        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
                        continue
                      }

                      // Formatear fecha en UTC para consistencia
                      const year = currentDate.getUTCFullYear()
                      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0')
                      const day = String(currentDate.getUTCDate()).padStart(2, '0')
                      const dayString = `${year}-${month}-${day}`

                      const timeSlot = `${scheduleForDay.startTime}-${scheduleForDay.endTime}`

                      const existingBooking = await db.classBooking.findFirst({
                        where: {
                          studentId: userId!,
                          teacherId: scheduleForDay.teacherId,
                          day: dayString,
                          timeSlot: timeSlot,
                        },
                      })

                      if (!existingBooking) {
                        await db.classBooking.create({
                          data: {
                            studentId: userId!,
                            teacherId: scheduleForDay.teacherId,
                            enrollmentId: enrollment!.id,
                            day: dayString,
                            timeSlot: timeSlot,
                            status: 'CONFIRMED',
                          },
                        })
                      }
                    }
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
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
                enrollmentWasCreated,
              }
            })
          )

          needsScheduleSetup = purchases.some((p) => p.enrollment && !p.selectedSchedule)
          newlyCreatedEnrollmentIds = purchases.flatMap((purchase) =>
            purchase.enrollmentWasCreated && purchase.enrollment ? [purchase.enrollment.id] : []
          )
        })
      } catch (error) {
        reservationPendingReview = true
        purchases = []
        newlyCreatedEnrollmentIds = []
        needsScheduleSetup = true
        invoice = await persistReservationReview(
          db,
          invoice,
          classifyReservationReviewReason(error)
        )
      }

      // Send Email
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true, lastName: true },
        })

        if (user?.email) {
          await sendPaymentConfirmationEmail(user.email, {
            customerName: formatFullName(user.name, user.lastName) || 'Cliente',
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

      try {
        await Promise.all(
          newlyCreatedEnrollmentIds.map(async (enrollmentId) => {
            const result = await notifySelfServiceEnrollmentCreated(enrollmentId)

            if (!result.success) {
              console.error(
                `Error sending new enrollment notification for ${enrollmentId}:`,
                result.error
              )
            }
          })
        )
      } catch (notificationError) {
        console.error('Error sending self-service enrollment notifications:', notificationError)
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
      reservation_pending_review: reservationPendingReview,
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
