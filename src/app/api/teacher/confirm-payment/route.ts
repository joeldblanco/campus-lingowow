import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

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
      select: { name: true, email: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Profesor no encontrado' }, { status: 404 })
    }

    // Handle file upload if provided
    let fileUrl: string | null = null
    if (paymentProof && paymentProof.size > 0) {
      // For now, we'll just note that a file was provided
      // In production, you would upload to a storage service
      fileUrl = `payment-proof-${teacherId}-${Date.now()}.pdf`
    }

    // Log the payment confirmation (notification model doesn't exist yet)
    // In production, you could send an email or create a record in a payments table
    console.log('Payment confirmation:', {
      teacherId,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      amount: parseFloat(amount),
      confirmedAt: new Date().toISOString(),
      hasProof: !!fileUrl,
      proofUrl: fileUrl,
    })

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
