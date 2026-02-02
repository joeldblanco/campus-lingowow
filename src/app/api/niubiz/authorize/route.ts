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
        lastName?: string | null
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

      // Get current academic period (excluding special weeks)
      const today = new Date()
      let currentPeriod = await db.academicPeriod.findFirst({
        where: { 
          isActive: true,
          isSpecialWeek: false,
        },
      })

      // If no active period or it has ended, look for the next one
      if (!currentPeriod || new Date(currentPeriod.endDate) < today) {
        currentPeriod = await db.academicPeriod.findFirst({
          where: {
            startDate: { gte: today },
            isSpecialWeek: false,
          },
          orderBy: { startDate: 'asc' },
        })
      }

      // Process purchases
      purchases = await Promise.all(
        invoiceData.items.map(async (item) => {
          let plan = null
          let enrollment: { id: string; course?: { title?: string } } | null = null
          let courseId: string | null = null

          if (item.planId) {
            plan = await db.plan.findUnique({
              where: { id: item.planId },
              include: { 
                course: true,
                product: {
                  include: { course: true }
                }
              },
            })
            // Get courseId from plan, or from product if plan doesn't have it
            courseId = plan?.courseId || plan?.product?.courseId || null
          }
          
          // If still no courseId, try to get it from the product directly
          if (!courseId && item.productId) {
            const product = await db.product.findUnique({
              where: { id: item.productId },
              select: { courseId: true }
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
            currentPeriodId: currentPeriod?.id,
          })
          
          if (
            plan?.includesClasses &&
            courseId &&
            item.selectedSchedule &&
            item.selectedSchedule.length > 0 &&
            currentPeriod
          ) {
            console.log('[NIUBIZ] Creating enrollment for student:', userId, 'in course:', courseId)
            
            // Extraer el teacherId del primer slot del horario seleccionado
            const firstTeacherId = item.selectedSchedule[0]?.teacherId || null
            
            enrollment = await db.enrollment.upsert({
              where: {
                studentId_courseId_academicPeriodId: {
                  studentId: userId!,
                  courseId: courseId!,
                  academicPeriodId: currentPeriod.id,
                },
              },
              create: {
                studentId: userId!,
                courseId: courseId!,
                academicPeriodId: currentPeriod.id,
                teacherId: firstTeacherId,
                status: 'ACTIVE',
                classesTotal: item.proratedClasses || plan.classesPerPeriod || 8,
                classesAttended: 0,
                classesMissed: 0,
              },
              update: {
                status: 'ACTIVE',
                classesTotal: item.proratedClasses || plan.classesPerPeriod || 8,
                // Si no tiene teacherId asignado, asignarlo ahora
                ...(firstTeacherId ? { teacherId: firstTeacherId } : {}),
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
              const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
              
              // Obtener timezones de los profesores
              const teacherIds = [...new Set(item.selectedSchedule.map(s => s.teacherId))]
              const teachers = await db.user.findMany({
                where: { id: { in: teacherIds } },
                select: { id: true, timezone: true },
              })
              const teacherTimezones = new Map(teachers.map(t => [t.id, t.timezone || 'America/Lima']))
              
              await Promise.all(
                item.selectedSchedule.map(async (slot) => {
                  const timezone = teacherTimezones.get(slot.teacherId) || 'America/Lima'
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
              const periodStart = new Date(currentPeriod.startDate)
              const periodEnd = new Date(currentPeriod.endDate)
              const today = new Date()
              const startDate = today > periodStart ? today : periodStart
              const currentDate = new Date(startDate)

              while (currentDate <= periodEnd) {
                // Usar getUTCDay() para obtener el día de la semana en UTC
                // ya que los slots del schedule están en UTC
                const dayOfWeekUTC = currentDate.getUTCDay()
                const scheduleForDay = item.selectedSchedule.find(
                  (slot) => slot.dayOfWeek === dayOfWeekUTC
                )

                if (scheduleForDay) {
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
