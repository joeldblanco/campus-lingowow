import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse, isTeacher } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'CONFIRMED'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Determinar si es estudiante o profesor
    const isUserTeacher = isTeacher(user)

    const whereClause: Record<string, unknown> = isUserTeacher
      ? { teacherId: user.id }
      : { studentId: user.id }

    if (status !== 'all') {
      whereClause.status = status
    }

    if (from) {
      whereClause.day = { ...((whereClause.day as object) || {}), gte: from }
    }

    if (to) {
      whereClause.day = { ...((whereClause.day as object) || {}), lte: to }
    }

    const bookings = await db.classBooking.findMany({
      where: whereClause,
      select: {
        id: true,
        day: true,
        timeSlot: true,
        status: true,
        notes: true,
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
                title: true,
                image: true,
                classDuration: true,
              },
            },
          },
        },
      },
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      bookings: bookings.map((b) => ({
        id: b.id,
        day: b.day,
        timeSlot: b.timeSlot,
        status: b.status,
        notes: b.notes,
        student: b.student,
        teacher: b.teacher,
        course: b.enrollment.course,
        enrollmentId: b.enrollment.id,
      })),
    })
  } catch (error) {
    console.error('Error obteniendo clases:', error)

    return NextResponse.json(
      { error: 'Error al obtener las clases' },
      { status: 500 }
    )
  }
}
