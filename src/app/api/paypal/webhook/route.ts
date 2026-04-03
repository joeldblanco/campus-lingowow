import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'
import { notifySelfServiceEnrollmentCreated } from '@/lib/enrollments/self-service-enrollment'

// Webhook para eventos de PayPal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.event_type

    console.log('PayPal Webhook Event:', eventType)

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // El pago fue capturado exitosamente
        const orderId = body.resource?.supplementary_data?.related_ids?.order_id

        if (orderId) {
          // Actualizar el estado de la factura si existe
          await db.invoice.updateMany({
            where: {
              notes: {
                contains: orderId,
              },
            },
            data: {
              status: 'PAID',
              paidAt: new Date(),
            },
          })
        }
        break
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED': {
        // El pago fue denegado o reembolsado
        const deniedOrderId = body.resource?.supplementary_data?.related_ids?.order_id

        if (deniedOrderId) {
          await db.invoice.updateMany({
            where: {
              notes: {
                contains: deniedOrderId,
              },
            },
            data: {
              status: 'CANCELLED',
            },
          })

          // Cancelar las compras asociadas
          const invoices = await db.invoice.findMany({
            where: {
              notes: {
                contains: deniedOrderId,
              },
            },
          })

          for (const invoice of invoices) {
            await db.productPurchase.updateMany({
              where: {
                invoiceId: invoice.id,
              },
              data: {
                status: 'CANCELLED',
              },
            })
          }
        }
        break
      }

      case 'INVOICING.INVOICE.PAID': {
        const paypalInvoiceId = body.resource?.id as string | undefined
        if (!paypalInvoiceId) break

        // Idempotency: skip if this invoice was already processed
        const existingInvoice = await db.invoice.findFirst({
          where: { paypalOrderId: paypalInvoiceId },
        })
        if (existingInvoice) break

        // Find the PendingOrder created when the chat sent the invoice
        const pendingOrder = await db.pendingOrder.findFirst({
          where: {
            status: 'PENDING',
            invoiceData: {
              path: ['paypalInvoiceId'],
              equals: paypalInvoiceId,
            },
          },
        })

        if (!pendingOrder || !pendingOrder.userId) break

        const data = pendingOrder.invoiceData as {
          paypalInvoiceId: string
          planId: string
          planName: string
          amount: number
          startNow: boolean
        }

        // Find plan and current period before starting the transaction
        const plan = await db.plan.findUnique({
          where: { id: data.planId },
          select: { includesClasses: true, courseId: true, classesPerPeriod: true },
        })

        let currentPeriod = null
        if (plan?.includesClasses && plan.courseId) {
          const today = new Date()
          currentPeriod = await db.academicPeriod.findFirst({
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
        }

        const user = await db.user.findUnique({
          where: { id: pendingOrder.userId },
          select: { roles: true },
        })

        // Wrap all writes in a single transaction
        const invoiceNumber = `INV-CHAT-${Date.now().toString().slice(-8)}`
        let newlyCreatedEnrollmentId: string | null = null
        await db.$transaction(async (tx) => {
          // Create Invoice record in DB
          await tx.invoice.create({
            data: {
              invoiceNumber,
              userId: pendingOrder.userId!,
              subtotal: data.amount,
              discount: 0,
              tax: 0,
              total: data.amount,
              status: 'PAID',
              currency: pendingOrder.currency,
              paidAt: new Date(),
              paymentMethod: 'paypal',
              paypalOrderId: paypalInvoiceId,
              notes: `Chat invoice: ${data.planName}. PayPal Invoice ID: ${paypalInvoiceId}`,
              items: {
                create: [
                  {
                    planId: data.planId,
                    name: data.planName,
                    price: data.amount,
                    quantity: 1,
                    total: data.amount,
                  },
                ],
              },
            },
          })

          // Create enrollment if plan includes classes
          if (plan?.includesClasses && plan.courseId && currentPeriod) {
            const existingEnrollment = await tx.enrollment.findUnique({
              where: {
                studentId_courseId_academicPeriodId: {
                  studentId: pendingOrder.userId!,
                  courseId: plan.courseId,
                  academicPeriodId: currentPeriod.id,
                },
              },
              select: { id: true },
            })

            if (existingEnrollment) {
              await tx.enrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                  status: EnrollmentStatus.ACTIVE,
                  classesTotal: plan.classesPerPeriod ?? 8,
                },
              })
            } else {
              const enrollment = await tx.enrollment.create({
                data: {
                  studentId: pendingOrder.userId!,
                  courseId: plan.courseId,
                  academicPeriodId: currentPeriod.id,
                  status: EnrollmentStatus.ACTIVE,
                  classesTotal: plan.classesPerPeriod ?? 8,
                  classesAttended: 0,
                  classesMissed: 0,
                },
              })
              newlyCreatedEnrollmentId = enrollment.id
            }
          }

          // Promote GUEST → STUDENT
          if (user) {
            if (user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
              const updatedRoles = user.roles.filter((r) => r !== 'GUEST')
              updatedRoles.push('STUDENT')
              await tx.user.update({
                where: { id: pendingOrder.userId! },
                data: { roles: updatedRoles },
              })
            } else if (!user.roles.includes('STUDENT')) {
              await tx.user.update({
                where: { id: pendingOrder.userId! },
                data: { roles: { push: 'STUDENT' } },
              })
            }
          }

          // Mark pending order as completed
          await tx.pendingOrder.update({
            where: { id: pendingOrder.id },
            data: { status: 'COMPLETED' },
          })
        })

        try {
          if (newlyCreatedEnrollmentId) {
            const result = await notifySelfServiceEnrollmentCreated(newlyCreatedEnrollmentId)

            if (!result.success) {
              console.error(
                `Error sending new enrollment notification for ${newlyCreatedEnrollmentId}:`,
                result.error
              )
            }
          }
        } catch (notificationError) {
          console.error('Error sending self-service enrollment notification:', notificationError)
        }

        break
      }

      default:
        console.log('Unhandled webhook event:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    return NextResponse.json(
      { error: 'Error al procesar el webhook' },
      { status: 500 }
    )
  }
}
