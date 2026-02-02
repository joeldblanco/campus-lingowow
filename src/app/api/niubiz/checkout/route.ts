import { NextRequest, NextResponse } from 'next/server'
import { authorizeNiubizTransaction, getNiubizAccessToken } from '@/lib/niubiz'
import { db } from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/mail'

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

// This endpoint receives the POST from Niubiz after 3DS authentication
// Niubiz sends transactionToken in the body as application/x-www-form-urlencoded
export async function POST(request: NextRequest) {
  console.log('[NIUBIZ CHECKOUT] POST request received')
  
  // Get purchaseNumber from URL params (we add it when configuring the SDK)
  const { searchParams } = new URL(request.url)
  const purchaseNumber = searchParams.get('purchaseNumber')
  const amount = searchParams.get('amount')
  
  console.log('[NIUBIZ CHECKOUT] URL params:', { purchaseNumber, amount })
  
  let transactionToken: string | null = null
  
  try {
    // Try to get the form data from Niubiz POST
    // Niubiz sends as application/x-www-form-urlencoded
    const contentType = request.headers.get('content-type') || ''
    console.log('[NIUBIZ CHECKOUT] Content-Type:', contentType)
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      transactionToken = formData.get('transactionToken') as string
      
      // Log all form fields for debugging
      const formFields: Record<string, string> = {}
      formData.forEach((value, key) => {
        formFields[key] = typeof value === 'string' ? value.substring(0, 50) : '[File]'
      })
      console.log('[NIUBIZ CHECKOUT] Form fields:', formFields)
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      transactionToken = body.transactionToken
      console.log('[NIUBIZ CHECKOUT] JSON body keys:', Object.keys(body))
    } else {
      // Try to read as text and parse
      const text = await request.text()
      console.log('[NIUBIZ CHECKOUT] Raw body (first 200 chars):', text.substring(0, 200))
      
      // Try to parse as URL encoded
      const params = new URLSearchParams(text)
      transactionToken = params.get('transactionToken')
    }
    
    console.log('[NIUBIZ CHECKOUT] Extracted transactionToken:', transactionToken ? `${transactionToken.substring(0, 30)}...` : null)
    
    if (!transactionToken) {
      console.error('[NIUBIZ CHECKOUT] No transactionToken in POST body')
      return NextResponse.redirect(
        new URL('/shop/cart/checkout?niubiz_error=missing_token', request.url)
      )
    }
    
    if (!purchaseNumber || !amount) {
      console.error('[NIUBIZ CHECKOUT] Missing purchaseNumber or amount')
      return NextResponse.redirect(
        new URL('/shop/cart/checkout?niubiz_error=missing_params', request.url)
      )
    }
    
    // Get access token for authorization
    const accessToken = await getNiubizAccessToken()
    
    // Authorize the transaction with Niubiz
    const authorization = await authorizeNiubizTransaction(
      transactionToken,
      parseFloat(amount),
      purchaseNumber,
      accessToken
    )
    
    console.log('[NIUBIZ CHECKOUT] Authorization response:', {
      actionCode: authorization?.dataMap?.ACTION_CODE,
      actionDescription: authorization?.dataMap?.ACTION_DESCRIPTION,
    })
    
    // Check if authorization was successful
    const actionCode = authorization?.dataMap?.ACTION_CODE
    if (actionCode !== '000') {
      const errorMessage = authorization?.dataMap?.ACTION_DESCRIPTION || 'Pago denegado'
      console.error('[NIUBIZ CHECKOUT] Authorization failed:', errorMessage)
      return NextResponse.redirect(
        new URL(`/shop/cart/checkout?niubiz_error=auth_failed&message=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }
    
    // Payment successful - Now create invoice and enrollment
    console.log('[NIUBIZ CHECKOUT] Payment successful, processing order...')
    
    // Get pending order data
    const pendingOrder = await db.pendingOrder.findUnique({
      where: { purchaseNumber }
    }).catch(() => null)
    
    let invoiceNumber = `INV-${purchaseNumber}`
    
    if (pendingOrder && pendingOrder.status === 'PENDING') {
      console.log('[NIUBIZ CHECKOUT] Found pending order, creating invoice and enrollment...')
      
      const invoiceData = pendingOrder.invoiceData as unknown as InvoiceData
      let userId = pendingOrder.userId
      
      // If no user but have customer email, find or create user
      if (!userId && pendingOrder.customerEmail) {
        const existingUser = await db.user.findUnique({
          where: { email: pendingOrder.customerEmail },
        })
        
        if (existingUser) {
          userId = existingUser.id
        } else {
          const guestUser = await db.user.create({
            data: {
              name: pendingOrder.customerName || 'Guest',
              email: pendingOrder.customerEmail,
              roles: ['GUEST'],
            },
          })
          userId = guestUser.id
        }
      }
      
      if (userId && invoiceData) {
        // Create invoice
        invoiceNumber = `INV-${Date.now().toString().slice(-8)}`
        
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
            paymentMethod: 'niubiz',
            niubizTransactionId: transactionToken,
            niubizOrderId: purchaseNumber,
            notes: `Niubiz Order ID: ${purchaseNumber}, Auth: ${authorization?.header?.ecoreTransactionUUID}`,
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
          include: { items: true },
        })
        
        console.log('[NIUBIZ CHECKOUT] Invoice created:', invoice.invoiceNumber)
        
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
        
        console.log('[NIUBIZ CHECKOUT] Academic period:', currentPeriod?.name || 'None found')
        
        // Process each item for enrollment
        for (const item of invoiceData.items) {
          let plan = null
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
          
          // Create product purchase
          const purchase = await db.productPurchase.create({
            data: {
              userId: userId!,
              productId: item.productId,
              invoiceId: invoice.id,
              status: 'CONFIRMED',
              selectedSchedule: item.selectedSchedule
                ? JSON.parse(JSON.stringify(item.selectedSchedule))
                : undefined,
              proratedClasses: item.proratedClasses || undefined,
              proratedPrice: item.proratedPrice || undefined,
            },
          })
          
          console.log('[NIUBIZ CHECKOUT] Enrollment check:', {
            planId: item.planId,
            includesClasses: plan?.includesClasses,
            planCourseId: plan?.courseId,
            productCourseId: plan?.product?.courseId,
            resolvedCourseId: courseId,
            selectedSchedule: item.selectedSchedule?.length,
            currentPeriodId: currentPeriod?.id,
          })
          
          // Create enrollment if plan includes classes
          if (
            plan?.includesClasses &&
            courseId &&
            item.selectedSchedule &&
            item.selectedSchedule.length > 0 &&
            currentPeriod
          ) {
            console.log('[NIUBIZ CHECKOUT] Creating enrollment for student:', userId, 'in course:', courseId)
            
            // Extraer el teacherId del primer slot del horario seleccionado
            const firstTeacherId = item.selectedSchedule[0]?.teacherId || null
            
            const enrollment = await db.enrollment.upsert({
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
            
            console.log('[NIUBIZ CHECKOUT] Enrollment created:', enrollment.id)
            
            // Update purchase with enrollment
            await db.productPurchase.update({
              where: { id: purchase.id },
              data: {
                enrollmentId: enrollment.id,
                status: 'ENROLLED',
              },
            })
            
            // Create schedules
            const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
            
            const teacherIds = [...new Set(item.selectedSchedule.map(s => s.teacherId))]
            const teachers = await db.user.findMany({
              where: { id: { in: teacherIds } },
              select: { id: true, timezone: true },
            })
            const teacherTimezones = new Map(teachers.map(t => [t.id, t.timezone || 'America/Lima']))
            
            for (const slot of item.selectedSchedule) {
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
                    enrollmentId: enrollment.id,
                    dayOfWeek: utcData.dayOfWeek,
                    startTime: utcData.startTime,
                  },
                },
              })

              if (!existingSchedule) {
                await db.classSchedule.create({
                  data: {
                    enrollmentId: enrollment.id,
                    teacherId: slot.teacherId,
                    dayOfWeek: utcData.dayOfWeek,
                    startTime: utcData.startTime,
                    endTime: utcData.endTime,
                  },
                })
                console.log('[NIUBIZ CHECKOUT] Schedule created for day:', utcData.dayOfWeek)
              }
            }
            
            // Create bookings for current period
            // IMPORTANTE: Los horarios en selectedSchedule ya están convertidos a UTC
            // Debemos iterar sobre las fechas UTC y comparar con dayOfWeek UTC
            const periodStart = new Date(currentPeriod.startDate)
            const periodEnd = new Date(currentPeriod.endDate)
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
                      enrollmentId: enrollment.id,
                      day: dayString,
                      timeSlot: timeSlot,
                      status: 'CONFIRMED',
                    },
                  })
                }
              }
              currentDate.setDate(currentDate.getDate() + 1)
            }
            
            console.log('[NIUBIZ CHECKOUT] Bookings created for period')
            
            // Update user role to STUDENT
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
        }
        
        // Send confirmation email
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
          console.error('[NIUBIZ CHECKOUT] Error sending email:', emailError)
        }
        
        // Mark pending order as completed
        await db.pendingOrder.update({
          where: { purchaseNumber },
          data: { status: 'COMPLETED' },
        })
      }
    } else {
      console.log('[NIUBIZ CHECKOUT] No pending order found for:', purchaseNumber)
    }
    
    // Redirect to confirmation page
    const confirmationUrl = new URL('/shop/cart/checkout/confirmation', request.url)
    confirmationUrl.searchParams.set('success', 'true')
    confirmationUrl.searchParams.set('orderNumber', invoiceNumber)
    confirmationUrl.searchParams.set('amount', amount)
    
    console.log('[NIUBIZ CHECKOUT] Redirecting to confirmation:', confirmationUrl.toString())
    
    return NextResponse.redirect(confirmationUrl)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[NIUBIZ CHECKOUT] Error processing payment:', errorMessage)
    console.error('[NIUBIZ CHECKOUT] Full error:', error)
    return NextResponse.redirect(
      new URL(`/shop/cart/checkout?niubiz_error=server_error&debug=${encodeURIComponent(errorMessage.substring(0, 100))}`, request.url)
    )
  }
}

// Also handle GET in case Niubiz sends a GET request
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const transactionToken = searchParams.get('transactionToken')
  
  console.log('[NIUBIZ CHECKOUT] Received GET request:', {
    transactionToken: transactionToken ? 'present' : 'missing',
    allParams: Object.fromEntries(searchParams.entries()),
  })
  
  if (transactionToken) {
    // If we got a transactionToken via GET, process it
    const purchaseNumber = searchParams.get('purchaseNumber')
    const amount = searchParams.get('amount')
    
    if (purchaseNumber && amount) {
      try {
        const accessToken = await getNiubizAccessToken()
        const authorization = await authorizeNiubizTransaction(
          transactionToken,
          parseFloat(amount),
          purchaseNumber,
          accessToken
        )
        
        const actionCode = authorization?.dataMap?.ACTION_CODE
        if (actionCode === '000') {
          const confirmationUrl = new URL('/shop/cart/checkout/confirmation', request.url)
          confirmationUrl.searchParams.set('success', 'true')
          confirmationUrl.searchParams.set('orderNumber', purchaseNumber)
          confirmationUrl.searchParams.set('amount', amount)
          return NextResponse.redirect(confirmationUrl)
        }
      } catch (error) {
        console.error('[NIUBIZ CHECKOUT] GET authorization error:', error)
      }
    }
  }
  
  // Redirect back to checkout if something went wrong
  return NextResponse.redirect(
    new URL('/shop/cart/checkout?niubiz_error=invalid_request', request.url)
  )
}
