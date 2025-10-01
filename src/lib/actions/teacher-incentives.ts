'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/lib/db'
import { IncentiveType } from '@/types/academic-period'
import { getCurrentUser } from '@/lib/utils/session'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'

// Schema para validar la creación de incentivos
const createIncentiveSchema = z.object({
  teacherId: z.string(),
  periodId: z.string(),
  type: z.nativeEnum(IncentiveType),
  percentage: z.number().min(0).max(100),
  baseAmount: z.number().min(0),
})

// Schema para validar el procesamiento de incentivos
const processIncentivesSchema = z.object({
  incentiveIds: z.array(z.string()),
})

/**
 * Acción para calcular y crear incentivos de retención
 */
export async function calculateRetentionIncentives(periodId: string) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden ejecutar esta acción')
    }

    // Obtener el período
    const period = await db.academicPeriod.findUnique({
      where: {
        id: periodId,
      },
      include: {
        studentPeriods: {
          include: {
            student: true,
          },
        },
      },
    })

    if (!period) {
      throw new Error('Período no encontrado')
    }

    // Obtener período anterior para comparar
    // Esto dependerá de la estructura de la base de datos
    // Aquí asumimos que tenemos alguna forma de encontrar el período anterior
    const previousPeriod = await db.academicPeriod.findFirst({
      where: {
        endDate: {
          lt: period.startDate,
        },
      },
      orderBy: {
        endDate: 'desc',
      },
      include: {
        studentPeriods: true,
      },
    })

    if (!previousPeriod) {
      throw new Error('No se encontró un período anterior para calcular la retención')
    }

    // Calcular la retención para cada profesor
    // Obtenemos todos los profesores activos
    const teachers = await db.user.findMany({
      where: {
        roles: {
          has: UserRole.TEACHER,
        },
        status: 'ACTIVE',
      },
    })

    const createdIncentives = []

    // Para cada profesor, calcular su tasa de retención y crear incentivo si aplica
    for (const teacher of teachers) {
      // Obtener las reservas del profesor en ambos períodos
      const currentPeriodBookings = await db.classBooking.findMany({
        where: {
          teacherId: teacher.id,
          studentPeriod: {
            periodId: period.id,
          },
        },
        include: {
          student: true,
        },
      })

      const previousPeriodBookings = await db.classBooking.findMany({
        where: {
          teacherId: teacher.id,
          studentPeriod: {
            periodId: previousPeriod.id,
          },
        },
        include: {
          student: true,
        },
      })

      // Si no tuvo reservas en el período anterior, no aplica incentivo
      if (previousPeriodBookings.length === 0) {
        continue
      }

      // Obtener estudiantes únicos en cada período
      const previousStudentIds = new Set(previousPeriodBookings.map((b) => b.studentId))
      const currentStudentIds = new Set(currentPeriodBookings.map((b) => b.studentId))

      // Contar estudiantes que continúan (intersección de conjuntos)
      const continuingStudents = [...previousStudentIds].filter((id) => currentStudentIds.has(id))

      // Calcular tasa de retención
      const retentionRate = (continuingStudents.length / previousStudentIds.size) * 100

      // Determinar el porcentaje de incentivo según la tasa de retención
      let incentivePercentage = 0
      if (retentionRate >= 90) {
        incentivePercentage = 10 // 10% por retención superior al 90%
      } else if (retentionRate >= 80) {
        incentivePercentage = 5 // 5% por retención entre 80% y 90%
      }

      // Si aplica incentivo, crearlo
      if (incentivePercentage > 0) {
        // Calcular el monto base (ingresos totales del profesor en el período actual)
        // Esto es un ejemplo simplificado
        const baseAmount = currentPeriodBookings.length * 50 // Asumimos $50 por clase

        // Calcular el monto de la bonificación
        const bonusAmount = (baseAmount * incentivePercentage) / 100

        // Crear el incentivo
        const incentive = await db.teacherIncentive.create({
          data: {
            teacherId: teacher.id,
            periodId: period.id,
            type: IncentiveType.RETENTION,
            percentage: incentivePercentage,
            baseAmount,
            bonusAmount,
            paid: false,
          },
        })

        createdIncentives.push(incentive)
      }
    }

    revalidatePath('/dashboard/teachers')
    revalidatePath('/dashboard/incentives')

    return {
      success: true,
      count: createdIncentives.length,
      message: `Se han creado ${createdIncentives.length} incentivos por retención`,
    }
  } catch (error) {
    console.error('Error al calcular incentivos de retención:', error)
    return { success: false, error: 'Error al calcular los incentivos de retención' }
  }
}

/**
 * Acción para calcular y crear incentivos de asistencia perfecta
 */
export async function calculatePerfectAttendanceIncentives(periodId: string) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden ejecutar esta acción')
    }

    // Obtener el período
    const period = await db.academicPeriod.findUnique({
      where: {
        id: periodId,
      },
    })

    if (!period) {
      throw new Error('Período no encontrado')
    }

    // En un sistema real, tendríamos que verificar la asistencia perfecta de los profesores
    // Para este ejemplo, asumimos que tenemos alguna forma de identificarlos

    // Obtener profesores con asistencia perfecta (ejemplo simplificado)
    const teachers = await db.user.findMany({
      where: {
        roles: {
          has: UserRole.TEACHER,
        },
        status: 'ACTIVE',
        // Aquí iría la lógica para identificar asistencia perfecta
        // Por ejemplo, si tuviéramos algún campo o relación que lo indique
      },
    })

    const createdIncentives = []

    // Para cada profesor con asistencia perfecta, crear incentivo
    for (const teacher of teachers) {
      // Obtener las reservas del profesor en el período
      const periodBookings = await db.classBooking.findMany({
        where: {
          teacherId: teacher.id,
          studentPeriod: {
            periodId: period.id,
          },
        },
      })

      // Calcular el monto base (ingresos totales del profesor en el período)
      const baseAmount = periodBookings.length * 50 // Asumimos $50 por clase

      // Porcentaje fijo para incentivo de asistencia perfecta
      const incentivePercentage = 3 // 3% por asistencia perfecta

      // Calcular el monto de la bonificación
      const bonusAmount = (baseAmount * incentivePercentage) / 100

      // Crear el incentivo
      const incentive = await db.teacherIncentive.create({
        data: {
          teacherId: teacher.id,
          periodId: period.id,
          type: IncentiveType.PERFECT_ATTENDANCE,
          percentage: incentivePercentage,
          baseAmount,
          bonusAmount,
          paid: false,
        },
      })

      createdIncentives.push(incentive)
    }

    revalidatePath('/dashboard/teachers')
    revalidatePath('/dashboard/incentives')

    return {
      success: true,
      count: createdIncentives.length,
      message: `Se han creado ${createdIncentives.length} incentivos por asistencia perfecta`,
    }
  } catch (error) {
    console.error('Error al calcular incentivos de asistencia perfecta:', error)
    return { success: false, error: 'Error al calcular los incentivos de asistencia perfecta' }
  }
}

/**
 * Acción para crear manualmente un incentivo para un profesor
 */
export async function createTeacherIncentive(
  formData:
    | FormData
    | {
        teacherId: string
        periodId: string
        type: IncentiveType
        percentage: number
        baseAmount: number
      }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden crear incentivos')
    }

    let data: z.infer<typeof createIncentiveSchema>

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      const rawData = {
        teacherId: formData.get('teacherId') as string,
        periodId: formData.get('periodId') as string,
        type: formData.get('type') as IncentiveType,
        percentage: parseFloat(formData.get('percentage') as string),
        baseAmount: parseFloat(formData.get('baseAmount') as string),
      }

      data = createIncentiveSchema.parse(rawData)
    } else {
      data = createIncentiveSchema.parse(formData)
    }

    // Calcular el monto de la bonificación
    const bonusAmount = (data.baseAmount * data.percentage) / 100

    // Crear el incentivo
    const incentive = await db.teacherIncentive.create({
      data: {
        teacherId: data.teacherId,
        periodId: data.periodId,
        type: data.type,
        percentage: data.percentage,
        baseAmount: data.baseAmount,
        bonusAmount,
        paid: false,
      },
    })

    revalidatePath('/dashboard/teachers')
    revalidatePath(`/dashboard/teachers/${data.teacherId}`)
    revalidatePath('/dashboard/incentives')

    return { success: true, incentiveId: incentive.id }
  } catch (error) {
    console.error('Error al crear incentivo:', error)
    return { success: false, error: 'Error al crear el incentivo para el profesor' }
  }
}

/**
 * Acción para procesar (pagar) incentivos seleccionados
 */
export async function processTeacherIncentives(formData: FormData | { incentiveIds: string[] }) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden procesar incentivos')
    }

    let data: z.infer<typeof processIncentivesSchema>

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      const incentiveIds = formData.getAll('incentiveIds') as string[]
      data = { incentiveIds }
    } else {
      data = processIncentivesSchema.parse(formData)
    }

    if (data.incentiveIds.length === 0) {
      throw new Error('No se han seleccionado incentivos para procesar')
    }

    // Marcar los incentivos como pagados
    const now = new Date()
    const processedIncentives = await db.teacherIncentive.updateMany({
      where: {
        id: {
          in: data.incentiveIds,
        },
        paid: false, // Solo procesar los que no están pagados
      },
      data: {
        paid: true,
        paidAt: now,
      },
    })

    revalidatePath('/dashboard/teachers')
    revalidatePath('/dashboard/incentives')

    return {
      success: true,
      count: processedIncentives.count,
      message: `Se han procesado ${processedIncentives.count} incentivos correctamente`,
    }
  } catch (error) {
    console.error('Error al procesar incentivos:', error)
    return { success: false, error: 'Error al procesar los incentivos seleccionados' }
  }
}

/**
 * Acción para obtener los incentivos de un profesor
 */
export async function getTeacherIncentives(teacherId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/signin')
    }

    // Verificar acceso (solo el propio profesor o un admin pueden ver los incentivos)
    if (!user.roles.includes(UserRole.ADMIN) && user.id !== teacherId) {
      throw new Error('No autorizado para ver estos incentivos')
    }

    // Obtener los incentivos del profesor
    const incentives = await db.teacherIncentive.findMany({
      where: {
        teacherId,
      },
      include: {
        period: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, incentives }
  } catch (error) {
    console.error('Error al obtener incentivos:', error)
    return { success: false, error: 'Error al obtener los incentivos del profesor' }
  }
}
