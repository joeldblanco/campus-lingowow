import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { ordersController } from '@/lib/paypal'
import { db } from '@/lib/db'
import { sendPaymentConfirmationEmail, sendNewPurchaseAdminEmail } from '@/lib/mail'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { notifyNewPurchase } from '@/lib/actions/notifications'

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
  couponId?: string
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = rateLimit(`payment:${ip}`, { windowMs: 60000, maxRequests: 5 })
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de pago. Por favor espera un momento.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Obtener datos del request body para usuarios invitados
    const body = await req.json()
    
    const { orderID, invoiceData, customerInfo } = body as {
      orderID: string
      invoiceData: InvoiceData
      customerInfo?: {
        email: string
        firstName: string
        lastName?: string | null
        address?: string
        country?: string
        city?: string
        zipCode?: string
      }
    }

    // Verificar datos requeridos
    if (!orderID || !invoiceData) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Intentar obtener autenticación (para usuarios logueados)
    const token = await getToken({ 
      req,
      secret: process.env.JWT_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token'
    })
    
    let userId = token?.sub
    
    if (!userId) {
      const session = await auth()
      userId = session?.user?.id
    }
    
    // Para usuarios invitados, verificar que tengan información del cliente
    if (!userId && !customerInfo) {
      return NextResponse.json({ error: 'Se requiere información del cliente para usuarios invitados' }, { status: 400 })
    }

    // Si no hay usuario autenticado pero hay información de cliente, crear un usuario invitado
    if (!userId && customerInfo) {
      // Crear un usuario invitado temporal
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

    if (!orderID) {
      return NextResponse.json(
        { error: 'ID de orden requerido' },
        { status: 400 }
      )
    }
    
    // Capturar el pago en PayPal
    const { result: captureData } = await ordersController.captureOrder({ id: orderID })

    // Verificar que el pago fue exitoso
    if (captureData?.status === 'COMPLETED') {
      // Crear la factura en la base de datos
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`
      
      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          userId: userId!,
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount || 0,
          tax: invoiceData.tax || 0,
          total: invoiceData.total,
          status: 'PAID',
          currency: invoiceData.currency || 'USD',
          paidAt: new Date(),
          paymentMethod: 'paypal',
          paypalOrderId: orderID,
          paypalCaptureId: captureData.id,
          paypalPayerEmail: captureData.payer?.emailAddress,
          couponId: invoiceData.couponId || null,
          notes: `PayPal Order ID: ${orderID}, Capture ID: ${captureData.id}`,
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

      // Incrementar el contador de uso del cupón si se usó uno
      if (invoiceData.couponId) {
        await db.coupon.update({
          where: { id: invoiceData.couponId },
          data: { usageCount: { increment: 1 } },
        })
      }

      // Obtener el período académico actual basado en fechas (excluyendo special weeks)
      const today = new Date()
      
      // Buscar período donde hoy esté entre startDate y endDate
      let currentPeriod = await db.academicPeriod.findFirst({
        where: { 
          startDate: { lte: today },
          endDate: { gte: today },
          isSpecialWeek: false,
        },
      })

      // Si no hay período actual, buscar el próximo
      if (!currentPeriod) {
        currentPeriod = await db.academicPeriod.findFirst({
          where: {
            startDate: { gte: today },
            isSpecialWeek: false,
          },
          orderBy: { startDate: 'asc' },
        })
      }

      // Procesar las compras de productos
      const purchases = await Promise.all(
        invoiceData.items.map(async (item) => {
          // Obtener información del plan si existe
          let plan = null
          let enrollment: { id: string; course?: { title?: string } } | null = null
          
          if (item.planId) {
            plan = await db.plan.findUnique({
              where: { id: item.planId },
              include: { course: true },
            })
          }

          // Crear la compra del producto
          const purchase = await db.productPurchase.create({
            data: {
              userId: userId!,
              productId: item.productId,
              invoiceId: invoice.id,
              status: 'CONFIRMED',
              selectedSchedule: item.selectedSchedule ? JSON.parse(JSON.stringify(item.selectedSchedule)) : undefined,
              proratedClasses: item.proratedClasses || undefined,
              proratedPrice: item.proratedPrice || undefined,
            },
          })

          // Si el plan incluye clases y hay un horario seleccionado, crear inscripción
          if (
            plan?.includesClasses &&
            plan.courseId &&
            item.selectedSchedule &&
            item.selectedSchedule.length > 0 &&
            currentPeriod
          ) {
            // Extraer el teacherId del primer slot del horario seleccionado
            const firstTeacherId = item.selectedSchedule[0]?.teacherId || null
            
            // Crear o actualizar la inscripción
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

            // Actualizar la compra con el enrollmentId
            await db.productPurchase.update({
              where: { id: purchase.id },
              data: { 
                enrollmentId: enrollment.id,
                status: 'ENROLLED',
              },
            })

            // Crear los horarios recurrentes (ClassSchedule) con conversión a UTC
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
                  
                  // Verificar si ya existe este horario (en UTC)
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

              // Crear las clases individuales (ClassBooking) para el período actual
              // IMPORTANTE: Los horarios en selectedSchedule ya están convertidos a UTC
              // Debemos iterar sobre las fechas UTC y comparar con dayOfWeek UTC
              const periodStart = new Date(currentPeriod.startDate)
              const periodEnd = new Date(currentPeriod.endDate)
              const today = new Date()
              const startDate = today > periodStart ? today : periodStart

              // Generar clases para cada día del período que coincida con el horario
              const currentDate = new Date(startDate)
              while (currentDate <= periodEnd) {
                // Usar getUTCDay() para obtener el día de la semana en UTC
                // ya que los slots del schedule están en UTC
                const dayOfWeekUTC = currentDate.getUTCDay()

                // Buscar si hay un horario para este día
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
                  
                  // Verificar si ya existe una reserva para esta fecha
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

                // Avanzar al siguiente día
                currentDate.setDate(currentDate.getDate() + 1)
              }
            }

            // Actualizar el rol del usuario a STUDENT si es GUEST
            const user = await db.user.findUnique({
              where: { id: userId },
              select: { roles: true },
            })

            if (user && user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
              // Reemplazar GUEST con STUDENT
              const updatedRoles = user.roles.filter((role) => role !== 'GUEST')
              updatedRoles.push('STUDENT')

              await db.user.update({
                where: { id: userId },
                data: { roles: updatedRoles },
              })
            } else if (user && !user.roles.includes('STUDENT')) {
              // Si no tiene STUDENT, agregarlo (sin quitar otros roles)
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
      
      // Verificar si alguna compra requiere configuración de horario
      const needsScheduleSetup = purchases.some(p => p.enrollment && !p.selectedSchedule)
      
      // Enviar email de confirmación de pago
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true, lastName: true },
        })
        
        if (user?.email) {
          const customerName = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Cliente'
          const productNames = invoiceData.items.map(item => item.name).join(', ')
          
          // Email to customer
          await sendPaymentConfirmationEmail(user.email, {
            customerName,
            invoiceNumber: invoice.invoiceNumber,
            items: invoiceData.items.map(item => ({
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
          
          // Email notification to admins
          await sendNewPurchaseAdminEmail({
            customerName,
            customerEmail: user.email,
            productName: productNames,
            amount: invoiceData.total,
            currency: invoiceData.currency || 'USD',
            invoiceNumber: invoice.invoiceNumber,
            purchaseDate: new Date().toLocaleDateString('es-PE', {
              timeZone: 'America/Lima',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          })
          
          // Platform notification to admins
          await notifyNewPurchase({
            userId: userId!,
            userName: customerName,
            productName: productNames,
            amount: invoiceData.total,
            invoiceId: invoice.id,
          })
        }
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError)
      }
      
      return NextResponse.json({
        success: true,
        captureID: captureData.id,
        status: captureData.status,
        invoice,
        purchases,
        needsScheduleSetup,
        enrollments: purchases
          .filter(p => p.enrollment !== null)
          .map(p => ({ 
            id: p.enrollment!.id, 
            courseTitle: p.enrollment!.course?.title 
          })),
      })
    } else {
      return NextResponse.json(
        { error: 'El pago no se completó correctamente' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    return NextResponse.json(
      { error: 'Error al capturar el pago de PayPal' },
      { status: 500 }
    )
  }
}
