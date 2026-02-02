import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { convertAvailabilityFromUTC, convertTimeSlotFromUTC } from '@/lib/utils/date'
import { EnrollmentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const timezone = searchParams.get('timezone') || 'America/Lima'

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId es requerido' },
        { status: 400 }
      )
    }

    console.log(`[API] Buscando profesores para curso: ${courseId}, timezone: ${timezone}`)

    // Obtener profesores que pueden enseñar este curso
    const teacherCourses = await db.teacherCourse.findMany({
      where: {
        courseId,
      },
      include: {
        teacher: {
          include: {
            teacherAvailability: true,
            teacherRank: true,
            // Incluir clases agendadas (no canceladas) de inscripciones ACTIVAS
            // Excluir clases de inscripciones COMPLETED o PAUSED
            bookingsAsTeacher: {
              where: {
                status: { not: 'CANCELLED' },
                enrollment: {
                  status: EnrollmentStatus.ACTIVE,
                },
              },
              select: {
                day: true,
                timeSlot: true,
              },
            },
          },
        },
      },
    })

    console.log(`[API] Encontrados ${teacherCourses.length} profesores asignados al curso`)
    
    if (teacherCourses.length === 0) {
      console.log(`[API] ⚠️ No hay profesores asignados al curso ${courseId}`)
      console.log('[API] Verifica la tabla teacher_courses')
    }

    // Formatear la respuesta con disponibilidad agrupada
    const teachersWithAvailability = teacherCourses.map((tc) => {
      const teacher = tc.teacher
      
      console.log(`[API] Procesando profesor: ${teacher.name} ${teacher.lastName || ''} (${teacher.id})`)
      console.log(`[API] Registros de disponibilidad: ${teacher.teacherAvailability.length}`)
      
      // Agrupar disponibilidad por día de la semana (convertir de UTC a hora local)
      const availabilityByDay: Record<string, Array<{ startTime: string; endTime: string }>> = {}
      
      teacher.teacherAvailability.forEach((avail) => {
        console.log(`[API] - Disponibilidad UTC: ${avail.day} ${avail.startTime}-${avail.endTime}`)
        
        // Si es un día de la semana (no una fecha específica)
        if (avail.day.length <= 10 && !avail.day.includes('-')) {
          // Es un día de la semana como "monday", "tuesday", etc. (en minúsculas)
          // Convertir de UTC a hora local del usuario
          try {
            const localData = convertAvailabilityFromUTC(
              avail.day.toLowerCase(),
              avail.startTime,
              avail.endTime,
              timezone
            )
            console.log(`[API] - Disponibilidad Local (${timezone}): ${localData.day} ${localData.startTime}-${localData.endTime}`)
            
            const dayKey = localData.day.toLowerCase()
            if (!availabilityByDay[dayKey]) {
              availabilityByDay[dayKey] = []
            }
            availabilityByDay[dayKey].push({
              startTime: localData.startTime,
              endTime: localData.endTime,
            })
          } catch (error) {
            console.error(`[API] Error converting availability: ${error}`)
          }
        } else if (avail.day.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Es una fecha específica YYYY-MM-DD - mantener como está por ahora
          const date = new Date(avail.day)
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
          if (!availabilityByDay[dayName]) {
            availabilityByDay[dayName] = []
          }
          availabilityByDay[dayName].push({
            startTime: avail.startTime,
            endTime: avail.endTime,
          })
        }
      })

      console.log(`[API] Disponibilidad agrupada:`, availabilityByDay)

      // Procesar clases agendadas para obtener horarios ocupados por día de la semana
      // Las clases están en UTC, convertir a hora local
      const bookedSlotsByDay: Record<string, Array<{ startTime: string; endTime: string }>> = {}
      
      teacher.bookingsAsTeacher.forEach((classItem) => {
        try {
          // Convertir de UTC a hora local
          const localData = convertTimeSlotFromUTC(classItem.day, classItem.timeSlot, timezone)
          
          // Obtener el día de la semana de la fecha
          const classDate = new Date(localData.day + 'T12:00:00')
          const dayName = classDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
          
          // Parsear el timeSlot (formato "HH:MM-HH:MM")
          const [startTime, endTime] = localData.timeSlot.split('-')
          
          if (!bookedSlotsByDay[dayName]) {
            bookedSlotsByDay[dayName] = []
          }
          bookedSlotsByDay[dayName].push({
            startTime: startTime.trim(),
            endTime: endTime.trim(),
          })
          
          console.log(`[API] - Clase ocupada: ${localData.day} (${dayName}) ${localData.timeSlot}`)
        } catch (error) {
          console.error(`[API] Error converting booked class: ${error}`)
        }
      })

      console.log(`[API] Horarios ocupados:`, bookedSlotsByDay)

      return {
        id: teacher.id,
        name: `${teacher.name} ${teacher.lastName || ''}`,
        email: teacher.email,
        image: teacher.image,
        bio: teacher.bio,
        rank: teacher.teacherRank,
        availability: availabilityByDay,
        bookedSlots: bookedSlotsByDay,
      }
    })

    return NextResponse.json(teachersWithAvailability)
  } catch (error) {
    console.error('Error fetching teacher availability:', error)
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad de profesores' },
      { status: 500 }
    )
  }
}
