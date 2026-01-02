'use server'

import { db } from '@/lib/db'
import { spendUserCredits } from './credits'
import { revalidatePath } from 'next/cache'

/**
 * Comprar un producto usando créditos
 */
export async function purchaseProductWithCredits(
  userId: string,
  productId: string,
  academicPeriodId?: string
) {
  try {
    // Obtener el producto
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        course: true,
      },
    })

    if (!product) {
      return { success: false, error: 'Producto no encontrado' }
    }

    if (!product.acceptsCredits || !product.creditPrice) {
      return { success: false, error: 'Este producto no acepta créditos' }
    }

    // Gastar los créditos
    const spendResult = await spendUserCredits(
      userId,
      product.creditPrice,
      'SPEND_PRODUCT',
      `Compra de ${product.name}`,
      productId,
      'product',
      {
        productName: product.name,
        productPrice: product.price,
        creditPrice: product.creditPrice,
      }
    )

    if (!spendResult.success) {
      return spendResult
    }

    // Crear factura con créditos
    const invoiceNumber = `INV-CREDITS-${Date.now().toString().slice(-8)}`
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId,
        subtotal: 0, // Pagado con créditos
        discount: 0,
        tax: 0,
        total: 0,
        status: 'PAID',
        currency: 'CREDITS',
        paidAt: new Date(),
        paymentMethod: 'credits',
        notes: `Pagado con ${product.creditPrice} créditos`,
        items: {
          create: {
            productId,
            name: product.name,
            price: 0, // Precio en créditos, no en dinero
            quantity: 1,
            total: 0,
          },
        },
      },
    })

    // Crear la compra
    let enrollmentId: string | undefined

    // Si tiene curso asociado, inscribir automáticamente
    if (product.courseId && academicPeriodId) {
      const enrollment = await db.enrollment.upsert({
        where: {
          studentId_courseId_academicPeriodId: {
            studentId: userId,
            courseId: product.courseId,
            academicPeriodId,
          },
        },
        create: {
          studentId: userId,
          courseId: product.courseId,
          academicPeriodId,
          status: 'ACTIVE',
          classesTotal: 8,
          classesAttended: 0,
          classesMissed: 0,
        },
        update: {
          status: 'ACTIVE',
        },
      })
      enrollmentId = enrollment.id
    }

    const purchase = await db.productPurchase.create({
      data: {
        userId,
        productId,
        invoiceId: invoice.id,
        enrollmentId,
        status: enrollmentId ? 'ENROLLED' : 'CONFIRMED',
      },
    })

    // Actualizar rol del usuario a STUDENT si es GUEST
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    })

    if (user && user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
      const updatedRoles = user.roles.filter((role) => role !== 'GUEST')
      updatedRoles.push('STUDENT')

      await db.user.update({
        where: { id: userId },
        data: { roles: updatedRoles },
      })
    } else if (user && !user.roles.includes('STUDENT')) {
      await db.user.update({
        where: { id: userId },
        data: { roles: { push: 'STUDENT' } },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/shop')

    return {
      success: true,
      data: {
        purchase,
        invoice,
        enrollment: enrollmentId,
      },
    }
  } catch (error) {
    console.error('Error purchasing product with credits:', error)
    return {
      success: false,
      error: 'Error al procesar la compra con créditos',
    }
  }
}

/**
 * Comprar un plan usando créditos
 */
export async function purchasePlanWithCredits(
  userId: string,
  planId: string,
  academicPeriodId?: string,
  selectedSchedule?: Array<{
    teacherId: string
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
) {
  try {
    // Obtener el plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: {
        course: true,
      },
    })

    if (!plan) {
      return { success: false, error: 'Plan no encontrado' }
    }

    if (!plan.acceptsCredits || !plan.creditPrice) {
      return { success: false, error: 'Este plan no acepta créditos' }
    }

    // Gastar los créditos
    const spendResult = await spendUserCredits(
      userId,
      plan.creditPrice,
      'SPEND_PLAN',
      `Compra de ${plan.name}`,
      planId,
      'plan',
      {
        planName: plan.name,
        planPrice: plan.price,
        creditPrice: plan.creditPrice,
      }
    )

    if (!spendResult.success) {
      return spendResult
    }

    // Crear factura con créditos
    const invoiceNumber = `INV-CREDITS-${Date.now().toString().slice(-8)}`
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId,
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        status: 'PAID',
        currency: 'CREDITS',
        paidAt: new Date(),
        paymentMethod: 'credits',
        notes: `Pagado con ${plan.creditPrice} créditos`,
        items: {
          create: {
            planId,
            name: plan.name,
            price: 0,
            quantity: 1,
            total: 0,
          },
        },
      },
    })

    // Crear suscripción
    const subscription = await db.subscription.create({
      data: {
        userId,
        planId,
        status: 'ACTIVE',
        nextBillingDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      },
    })

    let enrollmentId: string | undefined

    // Si incluye clases y tiene curso, crear inscripción
    if (plan.includesClasses && plan.courseId && academicPeriodId) {
      const currentPeriod = await db.academicPeriod.findUnique({
        where: { id: academicPeriodId },
      })

      if (!currentPeriod) {
        return { success: false, error: 'Período académico no encontrado' }
      }

      const enrollment = await db.enrollment.upsert({
        where: {
          studentId_courseId_academicPeriodId: {
            studentId: userId,
            courseId: plan.courseId,
            academicPeriodId,
          },
        },
        create: {
          studentId: userId,
          courseId: plan.courseId,
          academicPeriodId,
          status: 'ACTIVE',
          classesTotal: plan.classesPerPeriod || 8,
          classesAttended: 0,
          classesMissed: 0,
        },
        update: {
          status: 'ACTIVE',
          classesTotal: plan.classesPerPeriod || 8,
        },
      })
      enrollmentId = enrollment.id

      // Crear horarios si se proporcionaron (con conversión a UTC)
      if (selectedSchedule && selectedSchedule.length > 0) {
        const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
        
        // Obtener timezones de los profesores
        const teacherIds = [...new Set(selectedSchedule.map(s => s.teacherId))]
        const teachers = await db.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, timezone: true },
        })
        const teacherTimezones = new Map(teachers.map(t => [t.id, t.timezone || 'America/Lima']))
        
        await Promise.all(
          selectedSchedule.map(async (slot) => {
            const timezone = teacherTimezones.get(slot.teacherId) || 'America/Lima'
            const utcData = convertRecurringScheduleToUTC(
              slot.dayOfWeek,
              slot.startTime,
              slot.endTime,
              timezone
            )
            
            const existingSchedule = await db.classSchedule.findUnique({
              where: {
                enrollmentId_dayOfWeek_startTime: {
                  enrollmentId: enrollment.id,
                  dayOfWeek: utcData.dayOfWeek,
                  startTime: utcData.startTime,
                },
              },
            })

            if (!existingSchedule) {
              await db.classSchedule.create({
                data: {
                  enrollmentId: enrollment.id,
                  teacherId: slot.teacherId,
                  dayOfWeek: utcData.dayOfWeek,
                  startTime: utcData.startTime,
                  endTime: utcData.endTime,
                },
              })
            }
          })
        )
      }
    }

    // Actualizar rol del usuario
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    })

    if (user && user.roles.includes('GUEST') && !user.roles.includes('STUDENT')) {
      const updatedRoles = user.roles.filter((role) => role !== 'GUEST')
      updatedRoles.push('STUDENT')

      await db.user.update({
        where: { id: userId },
        data: { roles: updatedRoles },
      })
    } else if (user && !user.roles.includes('STUDENT')) {
      await db.user.update({
        where: { id: userId },
        data: { roles: { push: 'STUDENT' } },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/shop')

    return {
      success: true,
      data: {
        subscription,
        invoice,
        enrollment: enrollmentId,
      },
    }
  } catch (error) {
    console.error('Error purchasing plan with credits:', error)
    return {
      success: false,
      error: 'Error al procesar la compra con créditos',
    }
  }
}
