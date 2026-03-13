import { db } from '@/lib/db'
import { InvoiceStatus, EnrollmentStatus } from '@prisma/client'
import type { ToolResult } from '@/types/ai-chat'

export async function handleCheckInvoice(userId: string): Promise<ToolResult> {
  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [recentInvoices, activeEnrollment] = await Promise.all([
      db.invoice.findMany({
        where: {
          userId,
          status: InvoiceStatus.PAID,
          createdAt: { gte: ninetyDaysAgo },
        },
        orderBy: { paidAt: 'desc' },
        take: 3,
        include: { items: true },
      }),
      db.enrollment.findFirst({
        where: {
          studentId: userId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          course: { select: { title: true } },
        },
      }),
    ])

    if (recentInvoices.length === 0) {
      return {
        success: true,
        message:
          'No tienes facturas pagadas recientes. Puedo generar un link de pago para que completes tu inscripción.',
        data: { hasValidInvoice: false, hasActiveEnrollment: !!activeEnrollment },
      }
    }

    if (activeEnrollment) {
      return {
        success: true,
        message: `Ya tienes una factura pagada y estás activamente inscrito en "${activeEnrollment.course.title}". Si deseas cambiar de plan o tienes algún problema, por favor contacta a nuestro equipo de soporte.`,
        data: {
          hasValidInvoice: true,
          hasActiveEnrollment: true,
          courseName: activeEnrollment.course.title,
        },
      }
    }

    // Has paid invoice but no active enrollment — enrollment may be processing
    const latestInvoice = recentInvoices[0]
    const paidDate = latestInvoice.paidAt
      ? new Date(latestInvoice.paidAt).toLocaleDateString('es-PE')
      : 'fecha desconocida'

    return {
      success: true,
      message: `Tienes una factura pagada (${latestInvoice.invoiceNumber}) por $${latestInvoice.total} ${latestInvoice.currency} del ${paidDate}. Tu inscripción puede estar siendo procesada por el equipo. Si llevas más de 24 horas esperando, escríbenos por WhatsApp.`,
      data: {
        hasValidInvoice: true,
        hasActiveEnrollment: false,
        invoice: {
          number: latestInvoice.invoiceNumber,
          total: latestInvoice.total,
          currency: latestInvoice.currency,
          paidAt: latestInvoice.paidAt,
        },
      },
    }
  } catch (error) {
    console.error('[CheckInvoice] Error:', error)
    return {
      success: false,
      message:
        'No se pudo verificar el estado de tu factura. Por favor intenta de nuevo o contáctanos por WhatsApp.',
    }
  }
}
