'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { Category, Product, Plan, Feature, Coupon, Invoice, Prisma } from '@prisma/client'
import type { InvoiceWithDetails } from '@/types/invoice'
import {
  getPayPalOrder,
  getPayPalInvoice,
  getPayPalPayment,
  searchPayPalInvoice,
} from '@/lib/paypal'

// =============================================
// CATEGORIES
// =============================================

export async function getCategories() {
  try {
    return await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export async function getCategoryById(id: string) {
  try {
    return await db.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    })
  } catch (error) {
    console.error('Error fetching category:', error)
    return null
  }
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const category = await db.category.create({
      data,
    })
    revalidatePath('/admin/categories')
    return { success: true, data: category }
  } catch (error) {
    console.error('Error creating category:', error)
    return { success: false, error: 'Error al crear la categoría' }
  }
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const category = await db.category.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/categories')
    return { success: true, data: category }
  } catch (error) {
    console.error('Error updating category:', error)
    return { success: false, error: 'Error al actualizar la categoría' }
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.category.delete({
      where: { id },
    })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { success: false, error: 'Error al eliminar la categoría' }
  }
}

// =============================================
// FEATURES
// =============================================

export async function getFeatures() {
  try {
    return await db.feature.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { planFeatures: true },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching features:', error)
    return []
  }
}

export async function getFeatureById(id: string) {
  try {
    return await db.feature.findUnique({
      where: { id },
      include: {
        planFeatures: {
          include: {
            plan: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching feature:', error)
    return null
  }
}

export async function createFeature(data: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const feature = await db.feature.create({
      data,
    })
    revalidatePath('/admin/features')
    return { success: true, data: feature }
  } catch (error) {
    console.error('Error creating feature:', error)
    return { success: false, error: 'Error al crear la característica' }
  }
}

export async function updateFeature(
  id: string,
  data: Partial<Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const feature = await db.feature.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/features')
    return { success: true, data: feature }
  } catch (error) {
    console.error('Error updating feature:', error)
    return { success: false, error: 'Error al actualizar la característica' }
  }
}

export async function deleteFeature(id: string) {
  try {
    await db.feature.delete({
      where: { id },
    })
    revalidatePath('/admin/features')
    return { success: true }
  } catch (error) {
    console.error('Error deleting feature:', error)
    return { success: false, error: 'Error al eliminar la característica' }
  }
}

// =============================================
// PRODUCTS
// =============================================

export async function getProducts(filters?: {
  search?: string
  categoryId?: string
  tags?: string[]
  isActive?: boolean
}) {
  try {
    const where: Prisma.ProductWhereInput = {}

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      }
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { shortDesc: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            invoiceItems: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })
    return products
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export async function getAllProductTags() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { tags: true },
    })

    const allTags = products.flatMap((p) => p.tags)
    const uniqueTags = [...new Set(allTags)].sort()

    return uniqueTags
  } catch (error) {
    console.error('Error fetching product tags:', error)
    return []
  }
}

export async function getProductById(id: string) {
  try {
    return await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        invoiceItems: true,
        plans: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const product = await db.product.create({
      data,
    })
    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error) {
    console.error('Error creating product:', error)
    return { success: false, error: 'Error al crear el producto' }
  }
}

export async function createProductWithPlans(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  plans: Array<{
    name: string
    slug: string
    description?: string
    price: number
    comparePrice?: number
    duration: number
    isActive: boolean
    isPopular: boolean
    sortOrder: number
    includesClasses?: boolean
    classesPerPeriod?: number
    classesPerWeek?: number
    allowProration?: boolean
    autoRenewal?: boolean
    billingCycle?: string
  }>
) {
  try {
    const product = await db.product.create({
      data: productData,
    })

    if (plans.length > 0) {
      await db.plan.createMany({
        data: plans.map((plan) => ({
          ...plan,
          productId: product.id,
        })),
      })
    }

    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error) {
    console.error('Error creating product with plans:', error)
    return { success: false, error: 'Error al crear el producto con planes' }
  }
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const product = await db.product.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, error: 'Error al actualizar el producto' }
  }
}

export async function updateProductSortOrder(id: string, sortOrder: number) {
  try {
    const product = await db.product.update({
      where: { id },
      data: { sortOrder },
    })
    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error) {
    console.error('Error updating product sort order:', error)
    return { success: false, error: 'Error al actualizar el orden del producto' }
  }
}

export async function deleteProduct(id: string) {
  try {
    await db.product.delete({
      where: { id },
    })
    revalidatePath('/admin/products')
    return { success: true }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: 'Error al eliminar el producto' }
  }
}

// =============================================
// PLANS
// =============================================

export async function getPlans() {
  try {
    return await db.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        features: {
          include: {
            feature: true,
          },
        },
        _count: {
          select: { invoiceItems: true },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return []
  }
}

export async function getPricingPlansForProduct(productId: string) {
  try {
    return await db.plan.findMany({
      where: { productId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        features: {
          include: {
            feature: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching pricing plans for product:', error)
    return []
  }
}

export async function getPlanById(id: string) {
  try {
    return await db.plan.findUnique({
      where: { id },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
        invoiceItems: true,
      },
    })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return null
  }
}

export async function createPlan(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const plan = await db.plan.create({
      data,
    })
    revalidatePath('/admin/plans')
    return { success: true, data: plan }
  } catch (error) {
    console.error('Error creating plan:', error)
    return { success: false, error: 'Error al crear el plan' }
  }
}

export async function updatePlan(
  id: string,
  data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const plan = await db.plan.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/plans')
    return { success: true, data: plan }
  } catch (error) {
    console.error('Error updating plan:', error)
    return { success: false, error: 'Error al actualizar el plan' }
  }
}

export async function deletePlan(id: string) {
  try {
    await db.plan.delete({
      where: { id },
    })
    revalidatePath('/admin/plans')
    return { success: true }
  } catch (error) {
    console.error('Error deleting plan:', error)
    return { success: false, error: 'Error al eliminar el plan' }
  }
}

export async function addFeatureToPlan(
  planId: string,
  featureId: string,
  included: boolean = true,
  value?: string
) {
  try {
    await db.planFeature.create({
      data: {
        planId,
        featureId,
        included,
        value,
      },
    })
    revalidatePath('/admin/plans')
    return { success: true }
  } catch (error) {
    console.error('Error adding feature to plan:', error)
    return { success: false, error: 'Error al agregar característica al plan' }
  }
}

export async function removeFeatureFromPlan(planId: string, featureId: string) {
  try {
    await db.planFeature.delete({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
    })
    revalidatePath('/admin/plans')
    return { success: true }
  } catch (error) {
    console.error('Error removing feature from plan:', error)
    return { success: false, error: 'Error al eliminar característica del plan' }
  }
}

export async function updatePlanFeatures(
  planId: string,
  features: Array<{
    featureId: string
    included: boolean
    value?: string | null
  }>
) {
  try {
    // Delete all existing features for this plan
    await db.planFeature.deleteMany({
      where: { planId },
    })

    // Create new features
    if (features.length > 0) {
      await db.planFeature.createMany({
        data: features.map((f) => ({
          planId,
          featureId: f.featureId,
          included: f.included,
          value: f.value || null,
        })),
      })
    }

    revalidatePath('/admin/plans')
    return { success: true }
  } catch (error) {
    console.error('Error updating plan features:', error)
    return { success: false, error: 'Error al actualizar las características del plan' }
  }
}

// =============================================
// COUPONS
// =============================================

export async function getCoupons() {
  try {
    return await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return []
  }
}

export async function getCouponById(id: string) {
  try {
    return await db.coupon.findUnique({
      where: { id },
      include: {
        invoices: true,
      },
    })
  } catch (error) {
    console.error('Error fetching coupon:', error)
    return null
  }
}

export async function createCoupon(data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const coupon = await db.coupon.create({
      data,
    })
    revalidatePath('/admin/coupons')
    return { success: true, data: coupon }
  } catch (error) {
    console.error('Error creating coupon:', error)
    return { success: false, error: 'Error al crear el cupón' }
  }
}

export async function updateCoupon(
  id: string,
  data: Partial<Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const coupon = await db.coupon.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/coupons')
    return { success: true, data: coupon }
  } catch (error) {
    console.error('Error updating coupon:', error)
    return { success: false, error: 'Error al actualizar el cupón' }
  }
}

export async function deleteCoupon(id: string) {
  try {
    await db.coupon.delete({
      where: { id },
    })
    revalidatePath('/admin/coupons')
    return { success: true }
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return { success: false, error: 'Error al eliminar el cupón' }
  }
}

// =============================================
// INVOICES
// =============================================

export async function getUserInvoices(userId: string): Promise<InvoiceWithDetails[]> {
  try {
    return await db.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        coupon: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            value: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching user invoices:', error)
    return []
  }
}

export async function getInvoices(): Promise<InvoiceWithDetails[]> {
  try {
    return await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            value: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return []
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    return await db.invoice.findUnique({
      where: { id },
      include: {
        user: true,
        coupon: true,
        items: {
          include: {
            product: true,
            plan: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return null
  }
}

export async function createInvoice(data: {
  invoiceNumber: string
  userId: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  subtotal: number
  tax: number
  discount: number
  total: number
  dueDate: Date | null
  couponId: string | null
  items: {
    productId: string | null
    planId: string | null
    name: string
    price: number
    quantity: number
    total: number
  }[]
}) {
  try {
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        userId: data.userId,
        status: data.status,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        dueDate: data.dueDate,
        couponId: data.couponId,
        items: {
          create: data.items,
        },
      },
    })
    revalidatePath('/admin/invoices')
    return { success: true, data: invoice }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { success: false, error: 'Error al crear la factura' }
  }
}

export async function updateInvoice(
  id: string,
  data: {
    invoiceNumber?: string
    status?: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
    dueDate?: Date | null
    paidAt?: Date | null
  }
) {
  try {
    const invoice = await db.invoice.update({
      where: { id },
      data,
    })
    revalidatePath('/admin/invoices')
    return { success: true, data: invoice }
  } catch (error) {
    console.error('Error updating invoice:', error)
    return { success: false, error: 'Error al actualizar la factura' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteInvoice(_id: string) {
  try {
    // await db.invoice.delete({
    //   where: { _id },
    // })
    // revalidatePath('/admin/invoices')
    // return { success: true }
    return {
      success: false,
      error: 'La eliminación de facturas está deshabilitada por motivos de integridad de datos.',
    }
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return { success: false, error: 'Error al eliminar la factura' }
  }
}

// =============================================
// ESTADÍSTICAS Y REPORTES
// =============================================

export async function getTotalRevenue() {
  try {
    const result = await db.invoice.aggregate({
      where: {
        status: 'PAID',
      },
      _sum: {
        total: true,
      },
    })
    return result._sum.total || 0
  } catch (error) {
    console.error('Error fetching total revenue:', error)
    return 0
  }
}

export async function getMonthlyRevenue(year: number, month: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const result = await db.invoice.aggregate({
      where: {
        status: 'PAID',
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total: true,
      },
    })
    return result._sum.total || 0
  } catch (error) {
    console.error('Error fetching monthly revenue:', error)
    return 0
  }
}

export async function getRevenueByMonth(year: number) {
  try {
    const months = []
    for (let month = 1; month <= 12; month++) {
      const revenue = await getMonthlyRevenue(year, month)
      months.push({
        name: new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'short' }),
        income: revenue,
      })
    }
    return months
  } catch (error) {
    console.error('Error fetching revenue by month:', error)
    return []
  }
}

export async function getActiveSubscriptionsCount() {
  try {
    return await db.subscription.count({
      where: {
        status: 'ACTIVE',
      },
    })
  } catch (error) {
    console.error('Error fetching active subscriptions count:', error)
    return 0
  }
}

export async function getProductSalesCount() {
  try {
    return await db.productPurchase.count({
      where: {
        status: {
          in: ['CONFIRMED', 'SCHEDULED', 'ENROLLED', 'COMPLETED'],
        },
      },
    })
  } catch (error) {
    console.error('Error fetching product sales count:', error)
    return 0
  }
}

// =============================================
// ASOCIACIÓN DE PLANES A PRODUCTOS
// =============================================

export async function associatePlanToProduct(planId: string, productId: string) {
  try {
    await db.plan.update({
      where: { id: planId },
      data: { productId },
    })
    revalidatePath('/admin/products')
    return { success: true }
  } catch (error) {
    console.error('Error associating plan to product:', error)
    return { success: false, error: 'Error al asociar el plan al producto' }
  }
}

export async function dissociatePlanFromProduct(planId: string) {
  try {
    await db.plan.update({
      where: { id: planId },
      data: { productId: null },
    })
    revalidatePath('/admin/products')
    return { success: true }
  } catch (error) {
    console.error('Error dissociating plan from product:', error)
    return { success: false, error: 'Error al desasociar el plan del producto' }
  }
}

export async function getAvailablePlansForProduct() {
  try {
    // Retorna planes que no están asociados a ningún producto
    return await db.plan.findMany({
      where: {
        productId: null,
      },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error fetching available plans:', error)
    return []
  }
}

export async function createProductWithMixedPlans(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  newPlans: Array<{
    name: string
    slug: string
    description?: string
    price: number
    comparePrice?: number
    duration: number
    isActive: boolean
    isPopular: boolean
    sortOrder: number
    includesClasses?: boolean
    classesPerPeriod?: number
    classesPerWeek?: number
    allowProration?: boolean
    autoRenewal?: boolean
    billingCycle?: string
  }>,
  existingPlanIds: string[]
) {
  try {
    const product = await db.product.create({
      data: productData,
    })

    // Crear planes nuevos
    if (newPlans.length > 0) {
      await db.plan.createMany({
        data: newPlans.map((plan) => ({
          ...plan,
          productId: product.id,
        })),
      })
    }

    // Asociar planes existentes
    if (existingPlanIds.length > 0) {
      await db.plan.updateMany({
        where: {
          id: { in: existingPlanIds },
        },
        data: {
          productId: product.id,
        },
      })
    }

    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error) {
    console.error('Error creating product with mixed plans:', error)
    return { success: false, error: 'Error al crear el producto con planes' }
  }
}

// =============================================
// PAYPAL IMPORT
// =============================================

export async function verifyPaypalTransaction(resourceId: string) {
  try {
    let type = 'ORDER'
    console.log(`[Verify] Attempting to fetch as ORDER: ${resourceId}`)
    let data = await getPayPalOrder(resourceId)

    if (!data) {
      console.log(`[Verify] ORDER failed. Attempting as INVOICE: ${resourceId}`)
      type = 'INVOICE'
      data = await getPayPalInvoice(resourceId)
    }

    if (!data) {
      console.log(`[Verify] INVOICE failed. Attempting as PAYMENT: ${resourceId}`)
      type = 'PAYMENT'
      data = await getPayPalPayment(resourceId)
    }

    if (!data) {
      console.log(`[Verify] PAYMENT failed. Attempting SEARCH by Invoice Number: ${resourceId}`)
      type = 'INVOICE'
      data = await searchPayPalInvoice(resourceId)
    }

    if (!data) {
      return {
        success: false,
        error: 'No se encontró ninguna Orden, Factura o Pago de PayPal con ese ID',
      }
    }

    // Normalize Data
    let email, firstName, lastName, amount, currency, items, date

    if (type === 'ORDER') {
      if (data.status !== 'COMPLETED' && data.status !== 'APPROVED') {
        return {
          success: false,
          error: `La orden de PayPal no está pagada (Estado: ${data.status})`,
        }
      }
      const purchaseUnit = data.purchase_units?.[0]
      email = data.payer?.email_address
      firstName = data.payer?.name?.given_name || 'Cliente'
      lastName = data.payer?.name?.surname || 'PayPal'
      amount = parseFloat(purchaseUnit.amount.value)
      currency = purchaseUnit.amount.currency_code
      items = purchaseUnit.items || [
        {
          name: purchaseUnit.description || 'Compra PayPal',
          quantity: '1',
          unit_amount: { value: purchaseUnit.amount.value, currency_code: currency },
        },
      ]
      date = new Date(data.create_time)
    } else if (type === 'INVOICE') {
      if (data.status !== 'PAID') {
        return {
          success: false,
          error: `La factura de PayPal no está pagada (Estado: ${data.status})`,
        }
      }
      const primaryRecipient = data.primary_recipients?.[0]
      email = primaryRecipient?.billing_info?.email_address
      firstName = primaryRecipient?.billing_info?.name?.given_name || 'Cliente'
      lastName = primaryRecipient?.billing_info?.name?.surname || 'PayPal'
      amount = parseFloat(data.amount.value)
      currency = data.amount.currency_code
      items = data.items || []
      date = new Date(data.detail.payment_date || data.detail.metadata.create_time)
    } else if (type === 'PAYMENT') {
      if (data.status !== 'COMPLETED') {
        return {
          success: false,
          error: `El pago de PayPal no está completado (Estado: ${data.status})`,
        }
      }
      const supplementOrderId = data.supplementary_data?.related_ids?.order_id
      if (supplementOrderId) {
        return verifyPaypalTransaction(supplementOrderId)
      }
      return { success: false, error: 'No se pudo rastrear la orden original de este pago.' }
    }

    if (!email) {
      return { success: false, error: 'No se encontró el email del cliente en la transacción' }
    }

    // Check availability locally
    const existingInvoice = await db.invoice.findFirst({
      where: { paypalOrderId: resourceId },
    })

    if (existingInvoice) {
      return { success: false, error: 'Ya existe una factura registrada para este ID localmente' }
    }

    // Try to match items with plans in our database by SKU
    let matchedPlan = null
    let matchedProduct = null
    let matchedCourse = null

    if (items && items.length > 0) {
      for (const item of items) {
        // PayPal items can have sku field
        const sku = item.sku || item.name

        if (sku) {
          // First try to find by paypalSku
          const planBySku = await db.plan.findFirst({
            where: { paypalSku: sku },
            include: {
              product: {
                include: { course: true },
              },
              course: true,
            },
          })

          if (planBySku) {
            matchedPlan = {
              id: planBySku.id,
              name: planBySku.name,
              slug: planBySku.slug,
              price: planBySku.price,
              includesClasses: planBySku.includesClasses,
              classesPerPeriod: planBySku.classesPerPeriod,
              classesPerWeek: planBySku.classesPerWeek,
            }

            if (planBySku.product) {
              matchedProduct = {
                id: planBySku.product.id,
                name: planBySku.product.name,
                slug: planBySku.product.slug,
              }
              if (planBySku.product.course) {
                matchedCourse = {
                  id: planBySku.product.course.id,
                  title: planBySku.product.course.title,
                  classDuration: planBySku.product.course.classDuration,
                }
              }
            }

            // If plan has direct course relation
            if (!matchedCourse && planBySku.course) {
              matchedCourse = {
                id: planBySku.course.id,
                title: planBySku.course.title,
                classDuration: planBySku.course.classDuration,
              }
            }

            break // Found a match, stop searching
          }

          // Fallback: try to find by slug match
          const planBySlug = await db.plan.findFirst({
            where: { slug: sku.toLowerCase().replace(/\s+/g, '-') },
            include: {
              product: {
                include: { course: true },
              },
              course: true,
            },
          })

          if (planBySlug) {
            matchedPlan = {
              id: planBySlug.id,
              name: planBySlug.name,
              slug: planBySlug.slug,
              price: planBySlug.price,
              includesClasses: planBySlug.includesClasses,
              classesPerPeriod: planBySlug.classesPerPeriod,
              classesPerWeek: planBySlug.classesPerWeek,
            }

            if (planBySlug.product) {
              matchedProduct = {
                id: planBySlug.product.id,
                name: planBySlug.product.name,
                slug: planBySlug.product.slug,
              }
              if (planBySlug.product.course) {
                matchedCourse = {
                  id: planBySlug.product.course.id,
                  title: planBySlug.product.course.title,
                  classDuration: planBySlug.product.course.classDuration,
                }
              }
            }

            if (!matchedCourse && planBySlug.course) {
              matchedCourse = {
                id: planBySlug.course.id,
                title: planBySlug.course.title,
                classDuration: planBySlug.course.classDuration,
              }
            }

            break
          }
        }
      }
    }

    return {
      success: true,
      data: {
        type,
        resourceId,
        email,
        firstName,
        lastName,
        amount: amount || 0,
        currency: currency || 'USD',
        items: items || [],
        date: date || new Date(),
        // Matched data from our database
        matchedPlan,
        matchedProduct,
        matchedCourse,
      },
    }
  } catch (error) {
    console.error('Error verifying PayPal transaction:', error)
    return { success: false, error: 'Error al verificar la transacción de PayPal' }
  }
}

export async function createInvoiceFromPaypal(
  transactionData: {
    type: string
    resourceId: string
    email: string
    firstName: string
    lastName: string
    amount: number
    currency: string
    items: Array<{ name: string; quantity: string; unit_amount: { value: string } }>
    date: Date
  },
  userId: string
) {
  try {
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId: userId,
        subtotal: transactionData.amount || 0,
        discount: 0,
        tax: 0,
        total: transactionData.amount || 0,
        status: 'PAID',
        currency: transactionData.currency,
        paidAt: transactionData.date || new Date(),
        paymentMethod: 'paypal',
        paypalOrderId: transactionData.resourceId,
        paypalPayerEmail: transactionData.email,
        notes: `Imported from PayPal (${transactionData.type}): ${transactionData.resourceId}`,
        items: {
          create: transactionData.items.map((item) => ({
            name: item.name,
            price: parseFloat(item.unit_amount.value),
            quantity: parseInt(item.quantity) || 1,
            total: parseFloat(item.unit_amount.value) * (parseInt(item.quantity) || 1),
          })),
        },
      },
    })

    return { success: true, data: invoice }
  } catch (error) {
    console.error('Error creating invoice from PayPal data:', error)
    return { success: false, error: 'Error al crear la factura' }
  }
}

export async function importPaypalInvoice(resourceId: string) {
  try {
    const check = await verifyPaypalTransaction(resourceId)
    if (!check.success || !check.data) {
      return { success: false, error: check.error }
    }

    const { email, firstName, lastName } = check.data

    // Find or Create User (Legacy behavior for the standalone button)
    let user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: firstName,
          lastName: lastName,
          roles: ['GUEST'],
        },
      })
    }

    const result = await createInvoiceFromPaypal(check.data, user.id)
    if (result.success) {
      revalidatePath('/admin/invoices')
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('Error importing PayPal invoice:', error)
    return { success: false, error: 'Error al importar la factura de PayPal' }
  }
}
