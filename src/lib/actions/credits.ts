'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// =============================================
// GESTIÓN DE BALANCE DE CRÉDITOS
// =============================================

/**
 * Obtener el balance de créditos de un usuario
 */
export async function getUserCreditBalance(userId: string) {
  try {
    let balance = await db.userCreditBalance.findUnique({
      where: { userId },
    })

    // Si no existe, crear uno nuevo
    if (!balance) {
      balance = await db.userCreditBalance.create({
        data: {
          userId,
          totalCredits: 0,
          availableCredits: 0,
          spentCredits: 0,
          bonusCredits: 0,
        },
      })
    }

    return {
      success: true,
      data: balance,
    }
  } catch (error) {
    console.error('Error getting user credit balance:', error)
    return {
      success: false,
      error: 'Error al obtener el balance de créditos',
    }
  }
}

/**
 * Agregar créditos al balance de un usuario
 */
export async function addCreditsToUser(
  userId: string,
  amount: number,
  transactionType: 'PURCHASE' | 'BONUS' | 'ADMIN_ADJUSTMENT' | 'REWARD' | 'REFUND',
  description: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Obtener balance actual
    const balanceResult = await getUserCreditBalance(userId)
    if (!balanceResult.success || !balanceResult.data) {
      return { success: false, error: 'No se pudo obtener el balance' }
    }

    const currentBalance = balanceResult.data

    // Calcular nuevo balance
    const newAvailableCredits = currentBalance.availableCredits + amount
    const newTotalCredits =
      transactionType === 'PURCHASE' || transactionType === 'ADMIN_ADJUSTMENT'
        ? currentBalance.totalCredits + amount
        : currentBalance.totalCredits
    const newBonusCredits =
      transactionType === 'BONUS' || transactionType === 'REWARD'
        ? currentBalance.bonusCredits + amount
        : currentBalance.bonusCredits

    // Actualizar balance y crear transacción en una transacción de DB
    const result = await db.$transaction(async (tx) => {
      // Actualizar balance
      const updatedBalance = await tx.userCreditBalance.update({
        where: { userId },
        data: {
          availableCredits: newAvailableCredits,
          totalCredits: newTotalCredits,
          bonusCredits: newBonusCredits,
        },
      })

      // Crear registro de transacción
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          transactionType,
          amount,
          balanceBefore: currentBalance.availableCredits,
          balanceAfter: newAvailableCredits,
          description,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      })

      return { balance: updatedBalance, transaction }
    })

    revalidatePath('/dashboard')
    revalidatePath('/credits')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error adding credits to user:', error)
    return {
      success: false,
      error: 'Error al agregar créditos',
    }
  }
}

/**
 * Gastar créditos del balance de un usuario
 */
export async function spendUserCredits(
  userId: string,
  amount: number,
  transactionType: 'SPEND_PRODUCT' | 'SPEND_PLAN' | 'SPEND_COURSE',
  description: string,
  relatedEntityId?: string,
  relatedEntityType?: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Obtener balance actual
    const balanceResult = await getUserCreditBalance(userId)
    if (!balanceResult.success || !balanceResult.data) {
      return { success: false, error: 'No se pudo obtener el balance' }
    }

    const currentBalance = balanceResult.data

    // Verificar que tenga suficientes créditos
    if (currentBalance.availableCredits < amount) {
      return {
        success: false,
        error: 'No tienes suficientes créditos',
        data: {
          required: amount,
          available: currentBalance.availableCredits,
          missing: amount - currentBalance.availableCredits,
        },
      }
    }

    // Calcular nuevo balance
    const newAvailableCredits = currentBalance.availableCredits - amount
    const newSpentCredits = currentBalance.spentCredits + amount

    // Actualizar balance y crear transacción
    const result = await db.$transaction(async (tx) => {
      // Actualizar balance
      const updatedBalance = await tx.userCreditBalance.update({
        where: { userId },
        data: {
          availableCredits: newAvailableCredits,
          spentCredits: newSpentCredits,
        },
      })

      // Crear registro de transacción (negativo para gasto)
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          transactionType,
          amount: -amount, // Negativo para indicar gasto
          balanceBefore: currentBalance.availableCredits,
          balanceAfter: newAvailableCredits,
          description,
          relatedEntityId,
          relatedEntityType,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      })

      return { balance: updatedBalance, transaction }
    })

    revalidatePath('/dashboard')
    revalidatePath('/credits')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error spending user credits:', error)
    return {
      success: false,
      error: 'Error al gastar créditos',
    }
  }
}

/**
 * Obtener historial de transacciones de créditos
 */
export async function getCreditTransactions(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    type?: 'PURCHASE' | 'SPEND_PRODUCT' | 'SPEND_PLAN' | 'SPEND_COURSE' | 'REFUND' | 'BONUS' | 'ADMIN_ADJUSTMENT' | 'REWARD' | 'EXPIRED'
  }
) {
  try {
    const { limit = 50, offset = 0, type } = options || {}

    const where = {
      userId,
      ...(type && { transactionType: type }),
    }

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.creditTransaction.count({ where }),
    ])

    return {
      success: true,
      data: {
        transactions,
        total,
        hasMore: offset + limit < total,
      },
    }
  } catch (error) {
    console.error('Error getting credit transactions:', error)
    return {
      success: false,
      error: 'Error al obtener el historial de transacciones',
    }
  }
}

// =============================================
// GESTIÓN DE PAQUETES DE CRÉDITOS
// =============================================

/**
 * Obtener todos los paquetes de créditos activos
 */
export async function getCreditPackages() {
  try {
    const packages = await db.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    return {
      success: true,
      data: packages,
    }
  } catch (error) {
    console.error('Error getting credit packages:', error)
    return {
      success: false,
      error: 'Error al obtener los paquetes de créditos',
    }
  }
}

/**
 * Obtener un paquete de créditos por ID
 */
export async function getCreditPackageById(packageId: string) {
  try {
    const pkg = await db.creditPackage.findUnique({
      where: { id: packageId },
    })

    if (!pkg) {
      return {
        success: false,
        error: 'Paquete no encontrado',
      }
    }

    return {
      success: true,
      data: pkg,
    }
  } catch (error) {
    console.error('Error getting credit package:', error)
    return {
      success: false,
      error: 'Error al obtener el paquete de créditos',
    }
  }
}

/**
 * Crear un paquete de créditos (admin)
 */
export async function createCreditPackage(data: {
  name: string
  description?: string
  credits: number
  price: number
  bonusCredits?: number
  isPopular?: boolean
  sortOrder?: number
  image?: string
}) {
  try {
    const pkg = await db.creditPackage.create({
      data: {
        name: data.name,
        description: data.description,
        credits: data.credits,
        price: data.price,
        bonusCredits: data.bonusCredits || 0,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
        image: data.image,
      },
    })

    revalidatePath('/admin/credits')
    revalidatePath('/credits/packages')

    return {
      success: true,
      data: pkg,
    }
  } catch (error) {
    console.error('Error creating credit package:', error)
    return {
      success: false,
      error: 'Error al crear el paquete de créditos',
    }
  }
}

/**
 * Actualizar un paquete de créditos (admin)
 */
export async function updateCreditPackage(
  packageId: string,
  data: {
    name?: string
    description?: string
    credits?: number
    price?: number
    bonusCredits?: number
    isActive?: boolean
    isPopular?: boolean
    sortOrder?: number
    image?: string
  }
) {
  try {
    const pkg = await db.creditPackage.update({
      where: { id: packageId },
      data,
    })

    revalidatePath('/admin/credits')
    revalidatePath('/credits/packages')

    return {
      success: true,
      data: pkg,
    }
  } catch (error) {
    console.error('Error updating credit package:', error)
    return {
      success: false,
      error: 'Error al actualizar el paquete de créditos',
    }
  }
}

/**
 * Procesar compra de paquete de créditos
 */
export async function processCreditPackagePurchase(
  userId: string,
  packageId: string,
  invoiceId: string
) {
  try {
    // Obtener el paquete
    const pkgResult = await getCreditPackageById(packageId)
    if (!pkgResult.success || !pkgResult.data) {
      return { success: false, error: 'Paquete no encontrado' }
    }

    const pkg = pkgResult.data
    const totalCredits = pkg.credits + pkg.bonusCredits

    // Crear registro de compra y agregar créditos en una transacción
    const result = await db.$transaction(async (tx) => {
      // Crear registro de compra
      const purchase = await tx.creditPackagePurchase.create({
        data: {
          userId,
          packageId,
          invoiceId,
          creditsReceived: totalCredits,
          status: 'CONFIRMED',
        },
      })

      // Obtener balance actual
      let balance = await tx.userCreditBalance.findUnique({
        where: { userId },
      })

      if (!balance) {
        balance = await tx.userCreditBalance.create({
          data: {
            userId,
            totalCredits: 0,
            availableCredits: 0,
            spentCredits: 0,
            bonusCredits: 0,
          },
        })
      }

      // Actualizar balance
      const updatedBalance = await tx.userCreditBalance.update({
        where: { userId },
        data: {
          totalCredits: balance.totalCredits + totalCredits,
          availableCredits: balance.availableCredits + totalCredits,
          bonusCredits: balance.bonusCredits + pkg.bonusCredits,
        },
      })

      // Crear transacción de compra
      await tx.creditTransaction.create({
        data: {
          userId,
          transactionType: 'PURCHASE',
          amount: totalCredits,
          balanceBefore: balance.availableCredits,
          balanceAfter: updatedBalance.availableCredits,
          description: `Compra de ${pkg.name}`,
          relatedEntityId: packageId,
          relatedEntityType: 'credit_package',
          metadata: {
            packageName: pkg.name,
            baseCredits: pkg.credits,
            bonusCredits: pkg.bonusCredits,
            price: pkg.price,
          },
        },
      })

      return { purchase, balance: updatedBalance }
    })

    revalidatePath('/dashboard')
    revalidatePath('/credits')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error processing credit package purchase:', error)
    return {
      success: false,
      error: 'Error al procesar la compra de créditos',
    }
  }
}

/**
 * Obtener historial de compras de paquetes de créditos
 */
export async function getCreditPackagePurchases(userId: string) {
  try {
    const purchases = await db.creditPackagePurchase.findMany({
      where: { userId },
      include: {
        package: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: purchases,
    }
  } catch (error) {
    console.error('Error getting credit package purchases:', error)
    return {
      success: false,
      error: 'Error al obtener el historial de compras',
    }
  }
}
