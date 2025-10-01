'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/utils/session'
import { getCurrentPeriod } from '@/lib/utils/academic-period'
import { CreditSource, CreditUsage } from '@/types/academic-period'
import { addMonths } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Schema para validar la creación de créditos
const createCreditsSchema = z.object({
  studentId: z.string(),
  amount: z.number().min(1).default(1),
  source: z.nativeEnum(CreditSource),
  expiryMonths: z.number().min(1).default(3),
})

/**
 * Acción para añadir créditos a un estudiante
 */
export async function addStudentCredits(
  formData:
    | FormData
    | { studentId: string; amount: number; source: CreditSource; expiryMonths?: number }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.TEACHER))) {
      throw new Error('No autorizado')
    }

    let data: z.infer<typeof createCreditsSchema>

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      const rawData = {
        studentId: formData.get('studentId') as string,
        amount: parseInt(formData.get('amount') as string),
        source: formData.get('source') as CreditSource,
        expiryMonths: parseInt((formData.get('expiryMonths') as string) || '3'),
      }

      data = createCreditsSchema.parse(rawData)
    } else {
      data = createCreditsSchema.parse({
        ...formData,
        expiryMonths: formData.expiryMonths || 3,
      })
    }

    // Calcular fecha de expiración (por defecto 3 meses)
    const expiryDate = addMonths(new Date(), data.expiryMonths)

    // Crear el crédito en la base de datos
    const newCredit = await db.studentCredit.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        source: data.source,
        isUsed: false,
        expiryDate,
      },
    })

    revalidatePath('/dashboard/students')
    revalidatePath(`/dashboard/students/${data.studentId}`)
    revalidatePath('/dashboard/credits')

    return { success: true, creditId: newCredit.id }
  } catch (error) {
    console.error('Error al añadir créditos:', error)
    return { success: false, error: 'Error al añadir créditos al estudiante' }
  }
}

/**
 * Acción para usar un crédito para una clase adicional
 */
export async function useCreditsForClass(
  formData: FormData | { creditId: string; classDate: string; timeSlot: string; teacherId: string }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/signin')
    }

    let creditId: string
    let classDate: string
    let timeSlot: string
    let teacherId: string

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      creditId = formData.get('creditId') as string
      classDate = formData.get('classDate') as string
      timeSlot = formData.get('timeSlot') as string
      teacherId = formData.get('teacherId') as string
    } else {
      creditId = formData.creditId
      classDate = formData.classDate
      timeSlot = formData.timeSlot
      teacherId = formData.teacherId
    }

    // Verificar que el crédito existe y no ha sido utilizado
    const credit = await db.studentCredit.findUnique({
      where: {
        id: creditId,
        isUsed: false,
        expiryDate: {
          gte: new Date(),
        },
      },
    })

    if (!credit) {
      throw new Error('Crédito no disponible o expirado')
    }

    // Verificar que el crédito pertenece al usuario actual (si no es admin)
    if (!user.roles.includes(UserRole.ADMIN) && credit.studentId !== user.id) {
      throw new Error('No autorizado para usar este crédito')
    }

    // Buscar el período académico actual
    const currentPeriod = await getCurrentPeriod(
      await db.academicPeriod.findMany({
        where: {
          isActive: true,
        },
      })
    )

    if (!currentPeriod) {
      throw new Error('No hay un período académico activo')
    }

    // Obtener o crear el StudentPeriod para el estudiante
    let studentPeriod = await db.studentPeriod.findUnique({
      where: {
        studentId_periodId: {
          studentId: credit.studentId,
          periodId: currentPeriod.id,
        },
      },
    })

    // Si no existe, crear uno por defecto
    if (!studentPeriod) {
      studentPeriod = await db.studentPeriod.create({
        data: {
          studentId: credit.studentId,
          periodId: currentPeriod.id,
          packageType: 'custom',
          classesTotal: 1,
        },
      })
    }

    // Usar el crédito para una clase adicional
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [updatedCredit, classBooking] = await db.$transaction([
      // Marcar el crédito como utilizado
      db.studentCredit.update({
        where: {
          id: creditId,
        },
        data: {
          isUsed: true,
          usedFor: CreditUsage.CLASS,
        },
      }),

      // Crear la reserva de clase
      db.classBooking.create({
        data: {
          studentId: credit.studentId,
          teacherId: teacherId,
          day: classDate,
          timeSlot: timeSlot,
          status: 'CONFIRMED',
          creditId: creditId,
          studentPeriodId: studentPeriod.id,
        },
      }),
    ])

    revalidatePath('/dashboard/classes')
    revalidatePath('/dashboard/credits')

    return { success: true, bookingId: classBooking.id }
  } catch (error) {
    console.error('Error al usar crédito para clase:', error)
    return { success: false, error: 'Error al reservar la clase con el crédito' }
  }
}

/**
 * Acción para usar un crédito para materiales exclusivos
 */
export async function useCreditsForMaterials(formData: FormData | { creditId: string }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/signin')
    }

    let creditId: string

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      creditId = formData.get('creditId') as string
    } else {
      creditId = formData.creditId
    }

    // Verificar que el crédito existe y no ha sido utilizado
    const credit = await db.studentCredit.findUnique({
      where: {
        id: creditId,
        isUsed: false,
        expiryDate: {
          gte: new Date(),
        },
      },
    })

    if (!credit) {
      throw new Error('Crédito no disponible o expirado')
    }

    // Verificar que el crédito pertenece al usuario actual (si no es admin)
    if (!user.roles.includes(UserRole.ADMIN) && credit.studentId !== user.id) {
      throw new Error('No autorizado para usar este crédito')
    }

    // Usar el crédito para materiales exclusivos
    const updatedCredit = await db.studentCredit.update({
      where: {
        id: creditId,
      },
      data: {
        isUsed: true,
        usedFor: CreditUsage.MATERIALS,
      },
    })

    // Aquí se podría añadir lógica para enviar los materiales al estudiante
    // Por ejemplo, enviar un email con links de descarga, etc.

    revalidatePath('/dashboard/credits')

    return { success: true, creditId: updatedCredit.id }
  } catch (error) {
    console.error('Error al usar crédito para materiales:', error)
    return { success: false, error: 'Error al canjear el crédito por materiales' }
  }
}

/**
 * Acción para usar un crédito para descuento en renovación
 */
export async function useCreditsForDiscount(
  formData: FormData | { creditId: string; periodId: string; packageType: string }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/signin')
    }

    let creditId: string
    let periodId: string
    let packageType: string

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      creditId = formData.get('creditId') as string
      periodId = formData.get('periodId') as string
      packageType = formData.get('packageType') as string
    } else {
      creditId = formData.creditId
      periodId = formData.periodId
      packageType = formData.packageType
    }

    // Verificar que el crédito existe y no ha sido utilizado
    const credit = await db.studentCredit.findUnique({
      where: {
        id: creditId,
        isUsed: false,
        expiryDate: {
          gte: new Date(),
        },
      },
    })

    if (!credit) {
      throw new Error('Crédito no disponible o expirado')
    }

    // Verificar que el crédito pertenece al usuario actual (si no es admin)
    if (!user.roles.includes(UserRole.ADMIN) && credit.studentId !== user.id) {
      throw new Error('No autorizado para usar este crédito')
    }

    // Usar el crédito para descuento en renovación
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [updatedCredit, studentPeriod] = await db.$transaction([
      // Marcar el crédito como utilizado
      db.studentCredit.update({
        where: {
          id: creditId,
        },
        data: {
          isUsed: true,
          usedFor: CreditUsage.DISCOUNT,
        },
      }),

      // Crear o actualizar el período del estudiante con descuento aplicado
      db.studentPeriod.create({
        data: {
          studentId: credit.studentId,
          periodId: periodId,
          packageType: packageType,
          classesTotal: getClassesForPackage(packageType),
          // Aquí se aplicaría alguna lógica de descuento en el precio
          // que no estamos almacenando directamente en StudentPeriod
        },
      }),
    ])

    revalidatePath('/dashboard/periods')
    revalidatePath('/dashboard/credits')

    return { success: true, periodId: studentPeriod.id }
  } catch (error) {
    console.error('Error al usar crédito para descuento:', error)
    return { success: false, error: 'Error al aplicar el descuento con el crédito' }
  }
}

/**
 * Función auxiliar para obtener el número de clases según el tipo de paquete
 */
function getClassesForPackage(packageType: string): number {
  const packageMap: Record<string, number> = {
    basic: 8,
    standard: 12,
    intensive: 16,
    custom: 0,
  }

  return packageMap[packageType] || 0
}

/**
 * Acción para encontrar los créditos de un estudiante
 */
export async function getStudentCredits(studentId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/signin')
    }

    // Verificar acceso (solo el propio estudiante o un admin pueden ver los créditos)
    if (!user.roles.includes(UserRole.ADMIN) && user.id !== studentId) {
      throw new Error('No autorizado para ver estos créditos')
    }

    // Obtener los créditos del estudiante
    const credits = await db.studentCredit.findMany({
      where: {
        studentId: studentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, credits }
  } catch (error) {
    console.error('Error al obtener créditos:', error)
    return { success: false, error: 'Error al obtener los créditos del estudiante' }
  }
}

/**
 * Acción para generar créditos de asistencia perfecta
 */
export async function generatePerfectAttendanceCredits(periodId: string) {
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

    // Obtener todos los estudiantes con asistencia perfecta en este período
    const studentPeriods = await db.studentPeriod.findMany({
      where: {
        periodId: periodId,
        classesMissed: 0, // Asistencia perfecta significa 0 clases perdidas
      },
      include: {
        student: true,
      },
    })

    // Crear créditos para cada estudiante con asistencia perfecta
    const creditsPromises = studentPeriods.map(async (sp) => {
      // Calcular fecha de expiración (3 meses desde la fecha actual)
      const expiryDate = addMonths(new Date(), 3)

      return db.studentCredit.create({
        data: {
          studentId: sp.studentId,
          amount: 2, // 2 créditos por asistencia perfecta
          source: CreditSource.PERFECT_ATTENDANCE,
          isUsed: false,
          expiryDate,
        },
      })
    })

    const createdCredits = await Promise.all(creditsPromises)

    revalidatePath('/dashboard/credits')
    revalidatePath('/dashboard/periods')

    return {
      success: true,
      message: `Se han generado ${createdCredits.length} créditos por asistencia perfecta`,
      count: createdCredits.length,
    }
  } catch (error) {
    console.error('Error al generar créditos por asistencia perfecta:', error)
    return { success: false, error: 'Error al generar los créditos por asistencia perfecta' }
  }
}

/**
 * Acción para generar créditos por módulos completados
 */
export async function generateModulesCompletionCredits(studentId: string) {
  try {
    const user = await getCurrentUser()

    if (!user || (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.TEACHER))) {
      throw new Error('Solo los administradores y profesores pueden ejecutar esta acción')
    }

    // Obtener datos del estudiante
    const student = await db.user.findUnique({
      where: {
        id: studentId,
        roles: {
          has: UserRole.STUDENT,
        },
      },
    })

    if (!student) {
      throw new Error('Estudiante no encontrado')
    }

    // Aquí iría la lógica para verificar que el estudiante ha completado módulos
    // Esto dependería de la estructura de la base de datos y las reglas del negocio

    // Para este ejemplo, simplemente creamos el crédito
    const expiryDate = addMonths(new Date(), 3)

    const newCredit = await db.studentCredit.create({
      data: {
        studentId,
        amount: 1, // 1 crédito por completar módulos
        source: CreditSource.MODULES_COMPLETION,
        isUsed: false,
        expiryDate,
      },
    })

    revalidatePath('/dashboard/students')
    revalidatePath(`/dashboard/students/${studentId}`)
    revalidatePath('/dashboard/credits')

    return { success: true, creditId: newCredit.id }
  } catch (error) {
    console.error('Error al generar crédito por módulos completados:', error)
    return { success: false, error: 'Error al generar el crédito por módulos completados' }
  }
}

/**
 * Acción para generar créditos por referidos
 */
export async function generateReferralCredits(
  formData: FormData | { referrerId: string; newStudentId: string }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Solo los administradores pueden ejecutar esta acción')
    }

    let referrerId: string
    let newStudentId: string

    // Procesar datos según el tipo de entrada
    if (formData instanceof FormData) {
      referrerId = formData.get('referrerId') as string
      newStudentId = formData.get('newStudentId') as string
    } else {
      referrerId = formData.referrerId
      newStudentId = formData.newStudentId
    }

    // Verificar que ambos usuarios existan
    const [referrer, newStudent] = await Promise.all([
      db.user.findUnique({
        where: {
          id: referrerId,
          roles: {
            has: UserRole.STUDENT,
          },
        },
      }),
      db.user.findUnique({
        where: {
          id: newStudentId,
          roles: {
            has: UserRole.STUDENT,
          },
        },
      }),
    ])

    if (!referrer || !newStudent) {
      throw new Error('Uno o ambos estudiantes no encontrados')
    }

    // Calcular fecha de expiración (3 meses desde la fecha actual)
    const expiryDate = addMonths(new Date(), 3)

    // Crear crédito para el estudiante que hizo la referencia
    const newCredit = await db.studentCredit.create({
      data: {
        studentId: referrerId,
        amount: 2, // 2 créditos por referido
        source: CreditSource.REFERRAL,
        isUsed: false,
        expiryDate,
      },
    })

    revalidatePath('/dashboard/students')
    revalidatePath(`/dashboard/students/${referrerId}`)
    revalidatePath('/dashboard/credits')

    return { success: true, creditId: newCredit.id }
  } catch (error) {
    console.error('Error al generar crédito por referido:', error)
    return { success: false, error: 'Error al generar el crédito por referido' }
  }
}

/**
 * Acción para expirar créditos vencidos
 * Debe ejecutarse regularmente mediante un cron job
 */
export async function expireCredits() {
  try {
    const now = new Date()

    // Buscar todos los créditos no usados que han expirado
    const expiredCredits = await db.studentCredit.findMany({
      where: {
        isUsed: false,
        expiryDate: {
          lt: now,
        },
      },
    })

    if (expiredCredits.length === 0) {
      return { success: true, count: 0, message: 'No hay créditos expirados' }
    }

    // Marcar los créditos como expirados (no se pueden eliminar para mantener el historial)
    // En este caso, simplemente actualizaríamos un campo si existiera uno para "expirado"
    // Como no tenemos ese campo en el modelo actual, podríamos añadirlo o usar isUsed

    // Para este ejemplo, suponemos que no queremos marcarlos como "usados"
    // pero en un sistema real, deberíamos tener un estado específico para "expirado"

    return {
      success: true,
      count: expiredCredits.length,
      message: `Se han identificado ${expiredCredits.length} créditos expirados`,
    }
  } catch (error) {
    console.error('Error al expirar créditos:', error)
    return { success: false, error: 'Error al expirar los créditos vencidos' }
  }
}
