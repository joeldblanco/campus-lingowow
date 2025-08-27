import { db } from '@/lib/db'
import { User, TeacherAvailability as PrismaTeacherAvailability, ClassBooking } from '@prisma/client'

// Helper function to convert day string to day of week number
function getDayOfWeekNumber(day: string): number {
  // Handle both day names and specific dates
  if (day.includes('-')) {
    // If it's a specific date (YYYY-MM-DD), convert to day of week
    const date = new Date(day)
    return date.getDay()
  }
  
  // If it's a day name, convert to number
  const dayMap: Record<string, number> = {
    'sunday': 0, 'domingo': 0,
    'monday': 1, 'lunes': 1,
    'tuesday': 2, 'martes': 2,
    'wednesday': 3, 'miércoles': 3, 'miercoles': 3,
    'thursday': 4, 'jueves': 4,
    'friday': 5, 'viernes': 5,
    'saturday': 6, 'sábado': 6, 'sabado': 6
  }
  
  return dayMap[day.toLowerCase()] || 0
}

// Helper function to generate teacher specialties based on bio
function generateTeacherSpecialties(bio?: string | null): string[] {
  if (!bio) {
    return ['Conversación General', 'Gramática Básica']
  }
  
  const specialtyKeywords = {
    'conversación': 'Conversación',
    'conversation': 'Conversación',
    'negocios': 'Inglés de Negocios',
    'business': 'Inglés de Negocios',
    'toefl': 'TOEFL',
    'ielts': 'IELTS',
    'cambridge': 'Cambridge',
    'gramática': 'Gramática Avanzada',
    'grammar': 'Gramática Avanzada',
    'niños': 'Inglés para Niños',
    'children': 'Inglés para Niños',
    'kids': 'Inglés para Niños',
    'fonética': 'Fonética',
    'phonetics': 'Fonética',
    'pronunciación': 'Pronunciación',
    'pronunciation': 'Pronunciación',
    'escritura': 'Escritura',
    'writing': 'Escritura'
  }
  
  const foundSpecialties: string[] = []
  const bioLower = bio.toLowerCase()
  
  Object.entries(specialtyKeywords).forEach(([keyword, specialty]) => {
    if (bioLower.includes(keyword) && !foundSpecialties.includes(specialty)) {
      foundSpecialties.push(specialty)
    }
  })
  
  return foundSpecialties.length > 0 ? foundSpecialties : ['Conversación General', 'Gramática Básica']
}

export interface TeacherAvailability {
  id: string
  name: string
  avatarUrl: string
  specialties: string[]
  availability: {
    dayOfWeek: number
    slots: Array<{
      startTime: string
      endTime: string
      isBooked: boolean
    }>
  }[]
  rating: number
  totalClasses: number
}

export async function getAvailableTeachers(options?: {
  courseId?: string
  languageId?: string
  startDate?: Date
  endDate?: Date
}): Promise<TeacherAvailability[]> {
  try {
    const teachers = await db.user.findMany({
      where: {
        isTeacher: true,
        status: 'ACTIVE',
        // Filter by course if provided
        ...(options?.courseId && {
          createdCourses: {
            some: {
              id: options.courseId
            }
          }
        }),
      },
      include: {
        teacherAvailability: true,
        teacherRank: true,
        bookingsAsTeacher: {
          where: {
            ...(options?.startDate && options?.endDate && {
              day: {
                gte: options.startDate.toISOString().split('T')[0],
                lte: options.endDate.toISOString().split('T')[0]
              }
            }),
            status: {
              in: ['CONFIRMED', 'COMPLETED']
            }
          }
        }
      }
    })

    // Transform the data to match the TeacherAvailability interface
    const transformedTeachers: TeacherAvailability[] = teachers.map((teacher: User & {
      teacherAvailability: PrismaTeacherAvailability[]
      bookingsAsTeacher: ClassBooking[]
    }) => {
      // Group availability by day of week
      const availabilityByDay = new Map<number, Array<{startTime: string, endTime: string, isBooked: boolean}>>()
      
      // Process teacher availability slots
      teacher.teacherAvailability.forEach((slot: PrismaTeacherAvailability) => {
        // Convert day string to day of week number (assuming format like "monday", "tuesday", etc.)
        const dayOfWeek = getDayOfWeekNumber(slot.day)
        
        if (!availabilityByDay.has(dayOfWeek)) {
          availabilityByDay.set(dayOfWeek, [])
        }
        
        // Check if this slot is booked
        const isBooked = teacher.bookingsAsTeacher.some((booking: ClassBooking) => 
          booking.day === slot.day && 
          booking.timeSlot === `${slot.startTime}-${slot.endTime}`
        )
        
        availabilityByDay.get(dayOfWeek)!.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked
        })
      })
      
      // Convert map to array format expected by interface
      const availability = Array.from(availabilityByDay.entries()).map(([dayOfWeek, slots]) => ({
        dayOfWeek,
        slots: slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
      }))
      
      // Calculate rating based on completed classes (simplified calculation)
      const totalClasses = teacher.bookingsAsTeacher.length
      const rating = Math.min(5, Math.max(3, 4 + (totalClasses / 100)))
      
      // Generate specialties based on teacher bio or default values
      const specialties = generateTeacherSpecialties(teacher.bio)
      
      return {
        id: teacher.id,
        name: `${teacher.name} ${teacher.lastName}`.trim(),
        avatarUrl: teacher.image || `https://api.dicebear.com/7.x/lorelei/svg?seed=${teacher.name}`,
        specialties,
        availability,
        rating: Math.round(rating * 10) / 10,
        totalClasses
      }
    })

    return transformedTeachers
  } catch (error) {
    console.error('Error fetching available teachers:', error)
    throw new Error('Failed to fetch available teachers')
  }
}
