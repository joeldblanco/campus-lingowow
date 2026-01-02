import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario sea profesor
    if (!session.user.roles?.includes(UserRole.TEACHER)) {
      return NextResponse.json({ error: 'Solo profesores pueden acceder' }, { status: 403 })
    }

    const teacherId = session.user.id

    // Obtener estudiantes únicos que tienen clases con este profesor
    // Esto incluye estudiantes de programas personalizados y regulares
    const studentsFromBookings = await db.classBooking.findMany({
      where: {
        teacherId,
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      distinct: ['studentId'],
    })

    // También obtener estudiantes de enrollments donde el profesor tiene clases programadas
    const studentsFromEnrollments = await db.enrollment.findMany({
      where: {
        status: 'ACTIVE',
        bookings: {
          some: {
            teacherId,
          },
        },
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      distinct: ['studentId'],
    })

    // Combinar y eliminar duplicados
    const allStudents = [
      ...studentsFromBookings.map((b) => b.student),
      ...studentsFromEnrollments.map((e) => e.student),
    ]

    const uniqueStudentsMap = new Map()
    allStudents.forEach((student) => {
      if (!uniqueStudentsMap.has(student.id)) {
        uniqueStudentsMap.set(student.id, {
          id: student.id,
          name: `${student.name || ''} ${student.lastName || ''}`.trim(),
          email: student.email,
          image: student.image,
        })
      }
    })

    const students = Array.from(uniqueStudentsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      success: true,
      students,
    })
  } catch (error) {
    console.error('Error obteniendo estudiantes del profesor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
