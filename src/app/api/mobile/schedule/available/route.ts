import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { addDays, format, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const enrollmentId = searchParams.get('enrollmentId')
    const fromDate = searchParams.get('from') || format(new Date(), 'yyyy-MM-dd')
    const days = parseInt(searchParams.get('days') || '14')

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'enrollmentId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga esta inscripción
    const enrollment = await db.enrollment.findFirst({
      where: {
        id: enrollmentId,
        studentId: user.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        courseId: true,
        course: {
          select: {
            classDuration: true,
            teacherCourses: {
              select: {
                teacherId: true,
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscripción no encontrada' },
        { status: 404 }
      )
    }

    // Obtener profesores disponibles para este curso
    const teacherIds = enrollment.course.teacherCourses.map((tc) => tc.teacherId)

    if (teacherIds.length === 0) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: 'No hay profesores disponibles para este curso',
      })
    }

    // Obtener disponibilidad de los profesores
    const startDate = parseISO(fromDate)
    const endDate = addDays(startDate, days)

    // Obtener todas las disponibilidades
    const availabilities = await db.teacherAvailability.findMany({
      where: {
        userId: { in: teacherIds },
      },
      select: {
        userId: true,
        day: true,
        startTime: true,
        endTime: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
      },
    })

    // Obtener clases ya reservadas en el rango de fechas
    const existingBookings = await db.classBooking.findMany({
      where: {
        teacherId: { in: teacherIds },
        day: {
          gte: fromDate,
          lte: format(endDate, 'yyyy-MM-dd'),
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        teacherId: true,
        day: true,
        timeSlot: true,
      },
    })

    // Crear set de slots ocupados
    const bookedSlots = new Set(
      existingBookings.map((b) => `${b.teacherId}-${b.day}-${b.timeSlot}`)
    )

    // Generar slots disponibles
    const availableSlots: Array<{
      date: string
      timeSlot: string
      teacher: {
        id: string
        name: string
        lastName: string | null
        image: string | null
      }
    }> = []

    // Para cada día en el rango
    for (let d = 0; d < days; d++) {
      const currentDate = addDays(startDate, d)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const dayOfWeek = currentDate.getDay().toString()

      // Buscar disponibilidades para este día
      availabilities.forEach((avail) => {
        // Verificar si es disponibilidad recurrente (día de la semana) o fecha específica
        const isRecurring = avail.day.length === 1 // "0", "1", etc.
        const matchesDay = isRecurring 
          ? avail.day === dayOfWeek 
          : avail.day === dateStr

        if (matchesDay) {
          const timeSlot = `${avail.startTime}-${avail.endTime}`
          const slotKey = `${avail.userId}-${dateStr}-${timeSlot}`

          // Verificar si el slot no está ocupado
          if (!bookedSlots.has(slotKey)) {
            availableSlots.push({
              date: dateStr,
              timeSlot,
              teacher: avail.user,
            })
          }
        }
      })
    }

    // Ordenar por fecha y hora
    availableSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeSlot.localeCompare(b.timeSlot)
    })

    return NextResponse.json({
      success: true,
      availableSlots,
      enrollment: {
        id: enrollment.id,
        classDuration: enrollment.course.classDuration,
      },
    })
  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error)

    return NextResponse.json(
      { error: 'Error al obtener horarios disponibles' },
      { status: 500 }
    )
  }
}
