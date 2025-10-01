'use server'

import { db } from '@/lib/db'
import { generateAcademicPeriodsForYear } from '@/lib/utils/academic-period'
import { getCurrentUser } from '@/lib/utils/session'
import { SeasonName } from '@/types/academic-period'
import { UserRole } from '@prisma/client'
import { addWeeks, endOfDay, startOfDay } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schema para validar la creación de períodos académicos
const createPeriodSchema = z.object({
  name: z.string().min(3),
  startDate: z.date(),
  seasonId: z.string(),
  isSpecialWeek: z.boolean().default(false),
  isActive: z.boolean().default(false),
})

// Schema para validar la creación de temporadas
const createSeasonSchema = z.object({
  name: z.nativeEnum(SeasonName),
  startDate: z.date(),
  endDate: z.date(),
  year: z.number().int().min(2020).max(2100),
  description: z.string().optional(),
})

/**
 * Acción para crear un período académico
 */
export async function createAcademicPeriod(
  formData:
    | FormData
    | {
        name: string
        startDate: Date
        seasonId: string
        isSpecialWeek: boolean
        isActive: boolean
      }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden crear períodos académicos')
    }

    let data: z.infer<typeof createPeriodSchema>

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      const rawData = {
        name: formData.get('name') as string,
        startDate: new Date(formData.get('startDate') as string),
        seasonId: formData.get('seasonId') as string,
        isSpecialWeek: formData.get('isSpecialWeek') === 'true',
        isActive: formData.get('isActive') === 'true',
      }

      data = createPeriodSchema.parse(rawData)
    } else {
      data = createPeriodSchema.parse(formData)
    }

    // Calcular la fecha de fin (4 semanas después del inicio, o 1 semana si es especial)
    const endDate = addWeeks(data.startDate, data.isSpecialWeek ? 1 : 4)

    // Verificar que no haya períodos superpuestos
    const overlappingPeriods = await db.academicPeriod.findMany({
      where: {
        OR: [
          {
            startDate: {
              lte: endDate,
            },
            endDate: {
              gte: data.startDate,
            },
          },
        ],
      },
    })

    if (overlappingPeriods.length > 0) {
      throw new Error('El período se superpone con otro existente')
    }

    // Si se marca como activo, desactivar cualquier otro período activo
    if (data.isActive) {
      await db.academicPeriod.updateMany({
        where: {
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
    }

    // Crear el período académico
    const period = await db.academicPeriod.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate,
        seasonId: data.seasonId,
        isSpecialWeek: data.isSpecialWeek,
        isActive: data.isActive,
      },
    })

    revalidatePath('/dashboard/periods')

    return { success: true, periodId: period.id }
  } catch (error) {
    console.error('Error al crear período académico:', error)
    return { success: false, error: 'Error al crear el período académico' }
  }
}

/**
 * Acción para crear una temporada
 */
export async function createSeason(
  formData:
    | FormData
    | {
        name: SeasonName
        startDate: Date
        endDate: Date
        year: number
        description?: string
      }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden crear temporadas')
    }

    let data: z.infer<typeof createSeasonSchema>

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      const rawData = {
        name: formData.get('name') as SeasonName,
        startDate: new Date(formData.get('startDate') as string),
        endDate: new Date(formData.get('endDate') as string),
        year: parseInt(formData.get('year') as string),
        description: formData.get('description') as string,
      }

      data = createSeasonSchema.parse(rawData)
    } else {
      data = createSeasonSchema.parse(formData)
    }

    // Verificar que no haya temporadas con el mismo nombre y año
    const existingSeason = await db.season.findFirst({
      where: {
        name: data.name,
        year: data.year,
      },
    })

    if (existingSeason) {
      throw new Error(`Ya existe una temporada ${data.name} para el año ${data.year}`)
    }

    // Verificar que la fecha de fin sea posterior a la de inicio
    if (data.endDate <= data.startDate) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
    }

    // Crear la temporada
    const season = await db.season.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        year: data.year,
        description: data.description,
      },
    })

    revalidatePath('/dashboard/periods')

    return { success: true, seasonId: season.id }
  } catch (error) {
    console.error('Error al crear temporada:', error)
    return { success: false, error: 'Error al crear la temporada' }
  }
}

/**
 * Acción para generar automáticamente los períodos académicos de un año
 */
export async function generatePeriodsForYear(year: number = new Date().getFullYear()) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden generar períodos académicos')
    }

    // Verificar que el año es válido
    if (year < 2020 || year > 2100) {
      throw new Error('El año debe estar entre 2020 y 2100')
    }

    // Verificar que no existan ya períodos para ese año
    const existingPeriods = await db.academicPeriod.findMany({
      where: {
        startDate: {
          gte: new Date(year, 0, 1),
        },
        endDate: {
          lt: new Date(year + 1, 0, 1),
        },
      },
    })

    if (existingPeriods.length > 0) {
      return {
        success: false,
        error: `Ya existen ${existingPeriods.length} períodos para el año ${year}`,
      }
    }

    // Generar los períodos usando la función auxiliar
    const periodsToCreate = generateAcademicPeriodsForYear(year)

    // Crear las temporadas primero
    const seasonsById: Record<string, string> = {}

    for (const season of periodsToCreate.seasons) {
      if (!seasonsById[season.name]) {
        // Crear la temporada si no existe
        const newSeason = await db.season.create({
          data: {
            name: season.name,
            startDate: new Date(year, 0, 1), // Inicio del año
            endDate: new Date(year, 11, 31), // Fin del año
            year,
            description: `Temporada ${season.name} del año ${year}`,
          },
        })

        seasonsById[season.id] = newSeason.id
      }
    }

    // Crear los períodos
    const createdPeriods = []

    for (const period of periodsToCreate.academicPeriods) {
      const newPeriod = await db.academicPeriod.create({
        data: {
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          seasonId: seasonsById[period.seasonId],
          isSpecialWeek: period.isSpecialWeek,
          isActive: period.isActive,
        },
      })

      createdPeriods.push(newPeriod)
    }

    return {
      success: true,
      count: createdPeriods.length,
      message: `Se han generado ${createdPeriods.length} períodos para el año ${year}`,
    }
  } catch (error) {
    console.error('Error al generar períodos para el año:', error)
    return { success: false, error: 'Error al generar los períodos académicos' }
  }
}

/**
 * Acción para establecer un período como activo
 */
export async function setActivePeriod(periodId: string) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden cambiar el período activo')
    }

    // Verificar que el período existe
    const period = await db.academicPeriod.findUnique({
      where: {
        id: periodId,
      },
    })

    if (!period) {
      throw new Error('Período no encontrado')
    }

    // Desactivar cualquier otro período activo
    await db.academicPeriod.updateMany({
      where: {
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Activar el período seleccionado
    await db.academicPeriod.update({
      where: {
        id: periodId,
      },
      data: {
        isActive: true,
      },
    })

    revalidatePath('/dashboard/periods')

    return { success: true, periodId }
  } catch (error) {
    console.error('Error al establecer período activo:', error)
    return { success: false, error: 'Error al establecer el período como activo' }
  }
}

/**
 * Acción para inscribir a un estudiante en un período académico
 */
export async function enrollStudentInPeriod(
  formData:
    | FormData
    | {
        studentId: string
        periodId: string
        packageType: string
        proratedStart: boolean
        proratedClasses?: number
      }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.STUDENT))) {
      throw new Error('No autorizado para realizar esta acción')
    }

    // Si es estudiante, solo puede inscribirse a sí mismo
    if (
      user.roles.includes(UserRole.STUDENT) &&
      user.id !== (formData instanceof FormData ? formData.get('studentId') : formData.studentId)
    ) {
      throw new Error('No puedes inscribir a otro estudiante')
    }

    let studentId: string
    let periodId: string
    let packageType: string
    let proratedStart: boolean
    let proratedClasses: number = 0

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      studentId = formData.get('studentId') as string
      periodId = formData.get('periodId') as string
      packageType = formData.get('packageType') as string
      proratedStart = formData.get('proratedStart') === 'true'
      proratedClasses = parseInt((formData.get('proratedClasses') as string) || '0')
    } else {
      studentId = formData.studentId
      periodId = formData.periodId
      packageType = formData.packageType
      proratedStart = formData.proratedStart
      proratedClasses = formData.proratedClasses || 0
    }

    // Verificar que el estudiante y el período existen
    const [student, period] = await Promise.all([
      db.user.findUnique({
        where: {
          id: studentId,
          roles: {
            has: UserRole.STUDENT,
          },
        },
      }),
      db.academicPeriod.findUnique({
        where: {
          id: periodId,
        },
      }),
    ])

    if (!student || !period) {
      throw new Error('Estudiante o período no encontrado')
    }

    // Verificar que el estudiante no esté ya inscrito en este período
    const existingEnrollment = await db.studentPeriod.findUnique({
      where: {
        studentId_periodId: {
          studentId,
          periodId,
        },
      },
    })

    if (existingEnrollment) {
      throw new Error('El estudiante ya está inscrito en este período')
    }

    // Calcular el número total de clases según el tipo de paquete
    let classesTotal

    switch (packageType) {
      case 'basic':
        classesTotal = 8 // 2 clases x 4 semanas
        break
      case 'standard':
        classesTotal = 12 // 3 clases x 4 semanas
        break
      case 'intensive':
        classesTotal = 16 // 4 clases x 4 semanas
        break
      case 'custom':
        // Si es prorateado, usar el número especificado
        if (proratedStart && proratedClasses > 0) {
          classesTotal = proratedClasses
        } else {
          throw new Error(
            'Se requiere especificar el número de clases para un paquete personalizado'
          )
        }
        break
      default:
        throw new Error('Tipo de paquete no válido')
    }

    // Ajustar el número de clases si es prorrateado y no es personalizado
    if (proratedStart && packageType !== 'custom' && proratedClasses > 0) {
      classesTotal = proratedClasses
    }

    // Crear la inscripción
    const enrollment = await db.studentPeriod.create({
      data: {
        studentId,
        periodId,
        packageType,
        classesTotal,
        proratedStart,
        proratedClasses: proratedStart ? proratedClasses : 0,
      },
    })

    revalidatePath('/dashboard/students')
    revalidatePath(`/dashboard/students/${studentId}`)
    revalidatePath('/dashboard/periods')

    return { success: true, enrollmentId: enrollment.id }
  } catch (error) {
    console.error('Error al inscribir estudiante:', error)
    return { success: false, error: 'Error al inscribir al estudiante en el período' }
  }
}

/**
 * Acción para obtener los períodos académicos
 */
export async function getPeriods(year: number = new Date().getFullYear()) {
  try {
    const periods = await db.academicPeriod.findMany({
      where: {
        startDate: {
          gte: startOfDay(new Date(year, 0, 1)),
        },
        endDate: {
          lte: endOfDay(new Date(year, 11, 31)),
        },
      },
      include: {
        season: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return { success: true, periods }
  } catch (error) {
    console.error('Error al obtener períodos:', error)
    return { success: false, error: 'Error al obtener los períodos académicos' }
  }
}

/**
 * Acción para obtener las temporadas
 */
export async function getSeasons() {
  try {
    // Obtener las temporadas
    const seasons = await db.season.findMany({
      where: {
        year: {
          gte: new Date().getFullYear(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, seasons }
  } catch (error) {
    console.error('Error al obtener las temporadas:', error)
    return { success: false, error: 'Error al obtener las temporadas' }
  }
}

/**
 * Acción para encontrar el período académico que contiene una fecha específica
 */
export async function getPeriodByDate(date: Date | string) {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date

    const period = await db.academicPeriod.findFirst({
      where: {
        startDate: {
          lte: targetDate,
        },
        endDate: {
          gte: targetDate,
        },
      },
      include: {
        season: true,
      },
    })

    if (!period) {
      return {
        success: false,
        error: 'No existe un período académico para la fecha seleccionada',
      }
    }

    return { success: true, period }
  } catch (error) {
    console.error('Error al buscar período por fecha:', error)
    return { success: false, error: 'Error al buscar el período académico' }
  }
}
