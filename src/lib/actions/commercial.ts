'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { Category, Product, Plan, Feature, Coupon, Invoice, Prisma } from '@prisma/client'
import type { InvoiceWithDetails } from '@/types/invoice'

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
        createdAt: 'desc',
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

export async function deleteInvoice(id: string) {
  try {
    await db.invoice.delete({
      where: { id },
    })
    revalidatePath('/admin/invoices')
    return { success: true }
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
