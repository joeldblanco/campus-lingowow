import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sendTeacherPaymentConfirmationSlack } from '@/lib/slack'
import { sendTeacherPaymentConfirmationAdminEmail } from '@/lib/mail'
import { notifyTeacherPaymentConfirmed } from '@/lib/actions/notifications'
import { createPaymentConfirmation } from '@/lib/actions/payment-confirmations'
import { uploadFileByType } from '@/lib/actions/cloudinary'
import { formatFullName } from '@/lib/utils/name-formatter'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isTeacher = session.user.roles?.includes('TEACHER')
    if (!isTeacher) {
      return NextResponse.json({ error: 'Solo profesores pueden confirmar pagos' }, { status: 403 })
    }

    const formData = await request.formData()
    const amount = formData.get('amount') as string
    const teacherId = formData.get('teacherId') as string
    const paymentProof = formData.get('paymentProof') as File | null

    if (!amount || !teacherId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Verify the teacher is confirming their own payment
    if (teacherId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Get teacher info
    const teacher = await db.user.findUnique({
      where: { id: teacherId },
      select: { name: true, lastName: true, email: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Profesor no encontrado' }, { status: 404 })
    }

    // Handle file upload if provided
    let hasProof = false
    let proofUrl: string | undefined = undefined

    if (paymentProof && paymentProof.size > 0) {
      hasProof = true

      const isImage = paymentProof.type.startsWith('image/')
      const fileType = isImage ? 'image' : 'document'

      const uploadFormData = new FormData()
      uploadFormData.append('file', paymentProof)

      const uploadResult = await uploadFileByType(
        uploadFormData,
        fileType,
        'teacher-payments'
      )

      if (uploadResult.success && uploadResult.data) {
        proofUrl = uploadResult.data.secure_url
      } else {
        console.error('Failed to upload payment proof:', uploadResult.error)
        return NextResponse.json(
          { error: 'Error al subir el comprobante de pago' },
          { status: 500 }
        )
      }
    }

    const confirmedAt = new Date().toISOString()
    const parsedAmount = parseFloat(amount)
    const teacherFullName = formatFullName(teacher.name, teacher.lastName) || 'Sin nombre'

    // Anclar la confirmación al último período académico finalizado.
    // Es lo mismo que /api/teacher/earnings usa para habilitar `canConfirm`,
    // y mantiene el @@unique(teacherId, periodStart, periodEnd) consistente
    // con la regla "una confirmación por cierre académico".
    const now = new Date()
    const latestFinishedPeriod = await db.academicPeriod.findFirst({
      where: { endDate: { lt: now } },
      select: { startDate: true, endDate: true },
      orderBy: { endDate: 'desc' },
    })

    if (!latestFinishedPeriod) {
      return NextResponse.json(
        { error: 'Aún no hay un período académico finalizado para confirmar.' },
        { status: 400 }
      )
    }

    // Guardar confirmación en la base de datos
    const confirmationResult = await createPaymentConfirmation({
      teacherId,
      amount: parsedAmount,
      periodStart: latestFinishedPeriod.startDate,
      periodEnd: latestFinishedPeriod.endDate,
      hasProof,
      proofUrl,
      notes: undefined,
    })

    if (!confirmationResult.success) {
      return NextResponse.json(
        { error: confirmationResult.error || 'Error al guardar la confirmación' },
        { status: 500 }
      )
    }

    // Send notifications to administrators
    const notificationData = {
      teacherId,
      teacherName: teacherFullName,
      teacherEmail: teacher.email || '',
      amount: parsedAmount,
      hasProof,
      confirmedAt,
    }

    // Send Slack notification (non-blocking)
    sendTeacherPaymentConfirmationSlack(notificationData).catch((error) => {
      console.error('Error sending Slack notification:', error)
    })

    // Send email notification (non-blocking)
    sendTeacherPaymentConfirmationAdminEmail(notificationData).catch((error) => {
      console.error('Error sending admin email notification:', error)
    })

    // Send platform notification to admins (non-blocking)
    notifyTeacherPaymentConfirmed({
      teacherId,
      teacherName: teacherFullName,
      periodName: 'Período actual',
      amount: parsedAmount,
    }).catch((error) => {
      console.error('Error sending platform notification:', error)
    })

    console.log('Payment confirmation processed:', notificationData)

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado correctamente',
      confirmationId: confirmationResult.confirmation?.id,
    })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Error al confirmar el pago' },
      { status: 500 }
    )
  }
}
