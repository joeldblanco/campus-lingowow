import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId es requerido' },
        { status: 400 }
      )
    }

    console.log(`[API] Buscando profesores para curso: ${courseId}`)

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
      
      console.log(`[API] Procesando profesor: ${teacher.name} ${teacher.lastName} (${teacher.id})`)
      console.log(`[API] Registros de disponibilidad: ${teacher.teacherAvailability.length}`)
      
      // Agrupar disponibilidad por día de la semana
      const availabilityByDay: Record<string, Array<{ startTime: string; endTime: string }>> = {}
      
      teacher.teacherAvailability.forEach((avail) => {
        console.log(`[API] - Disponibilidad: ${avail.day} ${avail.startTime}-${avail.endTime}`)
        
        // Si es un día de la semana (no una fecha específica)
        if (avail.day.length <= 10 && !avail.day.includes('-')) {
          // Es un día de la semana como "monday", "tuesday", etc. (en minúsculas)
          // Normalizar a minúsculas por si acaso
          const dayKey = avail.day.toLowerCase()
          if (!availabilityByDay[dayKey]) {
            availabilityByDay[dayKey] = []
          }
          availabilityByDay[dayKey].push({
            startTime: avail.startTime,
            endTime: avail.endTime,
          })
        } else if (avail.day.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Es una fecha específica YYYY-MM-DD
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

      return {
        id: teacher.id,
        name: `${teacher.name} ${teacher.lastName}`,
        email: teacher.email,
        image: teacher.image,
        bio: teacher.bio,
        rank: teacher.teacherRank,
        availability: availabilityByDay,
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
