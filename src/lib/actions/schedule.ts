'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface CreateScheduleSlotData {
  productId: string
  date: Date
}

export interface BookScheduleSlotData {
  slotId: string
  userId: string
}

// Crear slots de horarios para un producto
export async function createScheduleSlots(productId: string, slots: Date[]) {
  try {
    const scheduleSlots = await db.productScheduleSlot.createMany({
      data: slots.map((date) => ({
        productId,
        date,
        isBooked: false,
      })),
      skipDuplicates: true,
    })

    revalidatePath('/admin/products')
    return { success: true, data: scheduleSlots }
  } catch (error) {
    console.error('Error creating schedule slots:', error)
    return { success: false, error: 'Error al crear los horarios' }
  }
}

// Obtener slots disponibles para un producto
export async function getAvailableSlots(productId: string, startDate?: Date, endDate?: Date): Promise<Array<{
  id: string;
  productId: string;
  date: Date;
  isBooked: boolean;
  bookedBy: string | null;
}>> {
  try {
    const where: {
      productId: string;
      isBooked: boolean;
      date?: {
        gte: Date;
        lte: Date;
      };
    } = {
      productId,
      isBooked: false,
    }

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const slots = await db.productScheduleSlot.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    })

    return slots
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return []
  }
}

// Reservar un slot de horario
export async function bookScheduleSlot(
  slotId: string,
  userId: string
): Promise<ProcessProductPurchaseResult> {
  try {
    const slot = await db.productScheduleSlot.findUnique({
      where: { id: slotId },
    })

    if (!slot) {
      return { success: false, error: 'Horario no encontrado' }
    }

    if (slot.isBooked) {
      return { success: false, error: 'Este horario ya está reservado' }
    }

    const updatedSlot = await db.productScheduleSlot.update({
      where: { id: slotId },
      data: {
        isBooked: true,
        bookedBy: userId,
      },
    })

    return {
      success: true,
      data: {
        purchase: {
          id: updatedSlot.id,
          status: 'scheduled',
          scheduledDate: updatedSlot.date,
        },
        scheduled: true,
        enrolled: false,
      },
    }
  } catch (error) {
    console.error('Error booking schedule slot:', error)
    return {
      success: false,
      error: 'Error al reservar el horario',
    }
  }
}

// Cancelar reserva de un slot
export async function cancelScheduleSlot(
  slotId: string,
  userId: string
): Promise<ProcessProductPurchaseResult> {
  try {
    const slot = await db.productScheduleSlot.findUnique({
      where: { id: slotId },
    })

    if (!slot) {
      return { success: false, error: 'Horario no encontrado' }
    }

    if (slot.bookedBy !== userId) {
      return { success: false, error: 'No tienes permisos para cancelar este horario' }
    }

    const updatedSlot = await db.productScheduleSlot.update({
      where: { id: slotId },
      data: {
        isBooked: false,
        bookedBy: null,
      },
    })

    return {
      success: true,
      data: {
        purchase: {
          id: updatedSlot.id,
          status: 'scheduled',
          scheduledDate: updatedSlot.date,
        },
        scheduled: true,
        enrolled: false,
      },
    }
  } catch (error) {
    console.error('Error canceling schedule slot:', error)
    return { success: false, error: 'Error al cancelar el horario' }
  }
}

// Obtener slots reservados por un usuario
export async function getUserBookedSlots(userId: string) {
  try {
    const slots = await db.productScheduleSlot.findMany({
      where: {
        bookedBy: userId,
        isBooked: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            scheduleDuration: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    return slots
  } catch (error) {
    console.error('Error fetching user booked slots:', error)
    return []
  }
}

// Crear una compra con horario programado
export async function createProductPurchase(data: {
  userId: string
  productId: string
  invoiceId: string
  scheduleSlotId?: string
  enrollmentId?: string
}): Promise<ProcessProductPurchaseResult> {
  try {
    const purchase = await db.productPurchase.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        invoiceId: data.invoiceId,
        scheduleSlotId: data.scheduleSlotId,
        enrollmentId: data.enrollmentId,
        status: data.scheduleSlotId ? 'SCHEDULED' : 'CONFIRMED',
        scheduledDate: data.scheduleSlotId
          ? (
              await db.productScheduleSlot.findUnique({
                where: { id: data.scheduleSlotId },
                select: { date: true },
              })
            )?.date
          : null,
      },
    })

    return {
      success: true,
      data: {
        purchase: {
          id: purchase.id,
          status: 'completed',
          scheduledDate: data.scheduleSlotId ? new Date() : null,
        },
        scheduled: !!data.scheduleSlotId,
        enrolled: !!data.enrollmentId,
      },
    }
  } catch (error) {
    console.error('Error creating product purchase:', error)
    return { success: false, error: 'Error al crear la compra' }
  }
}

// Inscribir automáticamente al usuario en un curso tras la compra
interface EnrollUserInCourseResult {
  success: boolean
  error?: string
  data?: {
    id: string
    status: string
  }
}

export async function enrollUserInCourse(
  userId: string,
  courseId: string,
  academicPeriodId: string,
  purchaseId?: string
): Promise<EnrollUserInCourseResult> {
  try {
    // Verificar si ya está inscrito en este período
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId_academicPeriodId: {
          studentId: userId,
          courseId: courseId,
          academicPeriodId: academicPeriodId,
        },
      },
    })

    if (existingEnrollment) {
      return { success: true, data: existingEnrollment }
    }

    // Crear nueva inscripción
    const enrollment = await db.enrollment.create({
      data: {
        studentId: userId,
        courseId: courseId,
        academicPeriodId: academicPeriodId,
        status: 'ACTIVE',
        progress: 0,
      },
    })

    // Si hay un purchaseId, actualizar la compra con la inscripción
    if (purchaseId) {
      await db.productPurchase.update({
        where: { id: purchaseId },
        data: {
          enrollmentId: enrollment.id,
          status: 'ENROLLED',
        },
      })
    }

    revalidatePath('/courses')
    return {
      success: true,
      data: {
        id: enrollment.id,
        status: 'enrolled',
      },
    }
  } catch (error) {
    console.error('Error enrolling user in course:', error)
    return { success: false, error: 'Error al inscribir en el curso' }
  }
}

// Procesar compra completa con programación e inscripción
interface ProcessProductPurchaseParams {
  userId: string
  productId: string
  invoiceId: string
  selectedSlots: string[]
  academicPeriodId?: string // Opcional para productos que no requieren inscripción a curso
}

interface ProcessProductPurchaseResult {
  success: boolean
  error?: string
  data?: {
    purchase: {
      id: string
      status: string
      scheduledDate: Date | null
    }
    scheduled: boolean
    enrolled: boolean
  }
}

export async function processProductPurchase(
  params: ProcessProductPurchaseParams
): Promise<ProcessProductPurchaseResult> {
  try {
    // Obtener información del producto
    const product = await db.product.findUnique({
      where: { id: params.productId },
      select: {
        requiresScheduling: true,
        courseId: true,
        maxScheduleSlots: true,
      },
    })

    if (!product) {
      return { success: false, error: 'Producto no encontrado' }
    }

    let scheduleSlotId: string | undefined
    let enrollmentId: string | undefined

    // Si requiere programación, reservar slots
    if (product.requiresScheduling && params.selectedSlots.length > 0) {
      // Por ahora, solo tomamos el primer slot seleccionado
      const slotResult = await bookScheduleSlot(params.selectedSlots[0], params.userId)
      if (!slotResult.success) {
        return slotResult
      }
      scheduleSlotId = params.selectedSlots[0]
    }

    // Si tiene curso asociado, inscribir automáticamente
    if (product.courseId) {
      if (!params.academicPeriodId) {
        return {
          success: false,
          error: 'Se requiere un período académico para inscribirse en el curso',
        }
      }
      const enrollmentResult = await enrollUserInCourse(
        params.userId,
        product.courseId,
        params.academicPeriodId,
        params.invoiceId
      )
      if (enrollmentResult?.success && enrollmentResult.data) {
        enrollmentId = enrollmentResult.data.id
      } else {
        // Revertir reservas si falló la inscripción
        if (scheduleSlotId) {
          await cancelScheduleSlot(scheduleSlotId, params.userId)
        }
        return {
          success: false,
          error: enrollmentResult?.error || 'Error al inscribir en el curso',
        }
      }
    }

    // Crear registro de compra
    const purchaseResult = await createProductPurchase({
      userId: params.userId,
      productId: params.productId,
      invoiceId: params.invoiceId,
      scheduleSlotId,
      enrollmentId,
    })

    if (!purchaseResult.success) {
      // Revertir reservas si falló la compra
      if (scheduleSlotId) {
        await cancelScheduleSlot(scheduleSlotId, params.userId)
      }
      return {
        success: false,
        error: purchaseResult.error || 'Error al procesar la compra',
      }
    }

    return {
      success: true,
      data: {
        purchase: {
          id: purchaseResult.data?.purchase.id || '',
          status: 'completed',
          scheduledDate: scheduleSlotId ? new Date() : null,
        },
        scheduled: !!scheduleSlotId,
        enrolled: !!enrollmentId,
      },
    }
  } catch (error) {
    console.error('Error processing product purchase:', error)
    return { success: false, error: 'Error al procesar la compra' }
  }
}
