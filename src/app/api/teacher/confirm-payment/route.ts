import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sendTeacherPaymentConfirmationSlack } from '@/lib/slack'
import { sendTeacherPaymentConfirmationAdminEmail } from '@/lib/mail'
import { notifyTeacherPaymentConfirmed } from '@/lib/actions/notifications'

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
    if (paymentProof && paymentProof.size > 0) {
      // For now, we'll just note that a file was provided
      // In production, you would upload to a storage service
      hasProof = true
    }

    const confirmedAt = new Date().toISOString()
    const parsedAmount = parseFloat(amount)
    const teacherFullName = `${teacher.name || ''} ${teacher.lastName || ''}`.trim() || 'Sin nombre'

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
    })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Error al confirmar el pago' },
      { status: 500 }
    )
  }
}
