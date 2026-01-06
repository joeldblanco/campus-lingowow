import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const booking = await db.classBooking.findUnique({
      where: { id },
      select: {
        id: true,
        day: true,
        timeSlot: true,
        status: true,
        notes: true,
        reminderSent: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
            bio: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            progress: true,
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                classDuration: true,
                language: true,
                level: true,
              },
            },
          },
        },
        attendances: {
          select: {
            status: true,
            timestamp: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario sea parte de la clase
    if (booking.student.id !== user.id && booking.teacher.id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta clase' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error) {
    console.error('Error obteniendo clase:', error)

    return NextResponse.json(
      { error: 'Error al obtener la clase' },
      { status: 500 }
    )
  }
}

const cancelSchema = z.object({
  reason: z.string().optional(),
})

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { reason } = cancelSchema.parse(body)

    const booking = await db.classBooking.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        status: true,
        day: true,
        timeSlot: true,
        notes: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario sea parte de la clase
    if (booking.studentId !== user.id && booking.teacherId !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para cancelar esta clase' },
        { status: 403 }
      )
    }

    // Verificar que la clase no esté ya cancelada o completada
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta clase no puede ser cancelada' },
        { status: 400 }
      )
    }

    // Cancelar la clase
    await db.classBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: user.id,
        notes: reason ? `Cancelado: ${reason}` : booking.notes,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Clase cancelada correctamente',
    })
  } catch (error) {
    console.error('Error cancelando clase:', error)

    return NextResponse.json(
      { error: 'Error al cancelar la clase' },
      { status: 500 }
    )
  }
}
