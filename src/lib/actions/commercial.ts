'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { Category, Product, Plan, Feature, Coupon, Invoice } from '@prisma/client'
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

export async function getProducts() {
  try {
    const products = await db.product.findMany({
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

export async function getProductById(id: string) {
  try {
    return await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        invoiceItems: true,
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
