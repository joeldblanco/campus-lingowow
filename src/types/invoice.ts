import { Prisma } from '@prisma/client'

// =============================================
// TIPOS GENERADOS POR PRISMA CON RELACIONES
// =============================================

// Tipo para Invoice con items y relaciones
export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
      }
    }
    coupon: {
      select: {
        id: true
        code: true
        name: true
        type: true
        value: true
      }
    }
    items: {
      include: {
        product: {
          select: {
            id: true
            name: true
            slug: true
            sku: true
          }
        }
        plan: {
          select: {
            id: true
            name: true
            slug: true
          }
        }
      }
    }
  }
}>

// Tipo para InvoiceItem con relaciones
export type InvoiceItemWithDetails = Prisma.InvoiceItemGetPayload<{
  include: {
    product: {
      select: {
        id: true
        name: true
        slug: true
        sku: true
      }
    }
    plan: {
      select: {
        id: true
        name: true
        slug: true
      }
    }
  }
}>

// Tipo base de Invoice sin relaciones
export type Invoice = Prisma.InvoiceGetPayload<{
  select: {
    id: true
    invoiceNumber: true
    userId: true
    subtotal: true
    discount: true
    tax: true
    total: true
    status: true
    currency: true
    couponId: true
    notes: true
    dueDate: true
    paidAt: true
    createdAt: true
    updatedAt: true
  }
}>

// Tipo base de InvoiceItem sin relaciones
export type InvoiceItem = Prisma.InvoiceItemGetPayload<{
  select: {
    id: true
    invoiceId: true
    productId: true
    planId: true
    name: true
    price: true
    quantity: true
    total: true
  }
}>

// =============================================
// TIPOS PARA ESTADÍSTICAS Y DATOS
// =============================================

export interface InvoiceStats {
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  totalRevenue: number
  averageInvoiceValue: number
}

// =============================================
// TIPOS PARA RESPUESTAS DE API
// =============================================

export interface InvoiceCreateResponse {
  success: boolean
  invoice?: InvoiceWithDetails
  error?: string
}

export interface InvoiceUpdateResponse {
  success: boolean
  invoice?: InvoiceWithDetails
  error?: string
}

export interface InvoiceDeleteResponse {
  success: boolean
  error?: string
}
