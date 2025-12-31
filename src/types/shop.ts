import { Prisma } from '@prisma/client'

export enum ProductTypeEnum {
  COURSE = 'course',
  MERCHANDISE = 'merchandise',
}

// Tipo para distinguir entre tipos de productos
export type ProductType = (typeof ProductTypeEnum)[keyof typeof ProductTypeEnum]

// Tipos base generados por Prisma
export type Product = Prisma.ProductGetPayload<{
  select: {
    id: true
    name: true
    slug: true
    description: true
    shortDesc: true
    price: true
    comparePrice: true
    sku: true
    image: true
    images: true
    isActive: true
    isDigital: true
    stock: true
    categoryId: true
    tags: true
    sortOrder: true
    requiresScheduling: true
    courseId: true
    maxScheduleSlots: true
    scheduleDuration: true
    pricingType: true
    paymentType: true
    creditPrice: true
    acceptsCredits: true
    acceptsRealMoney: true
    createdAt: true
    updatedAt: true
  }
}>

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true
    course: true
    plans: true
  }
}>

export type Plan = Prisma.PlanGetPayload<{
  select: {
    id: true
    name: true
    slug: true
    description: true
    price: true
    comparePrice: true
    duration: true
    isActive: true
    isPopular: true
    sortOrder: true
    productId: true
    includesClasses: true
    classesPerPeriod: true
    classesPerWeek: true
    allowProration: true
    autoRenewal: true
    billingCycle: true
    courseId: true
    createdAt: true
    updatedAt: true
  }
}>

export type PlanWithFeatures = Prisma.PlanGetPayload<{
  include: {
    features: {
      include: {
        feature: true
      }
    }
  }
}>

// Tipo legacy para Course (mantener compatibilidad con shop público)
export type Course = {
  id: string
  title: string
  description: string
  levels: string[]
  language: string
  category: string
  image: string
  plans: (Plan & { features?: string[] })[] // Plans con features opcionales para compatibilidad
}

// CartItem para el carrito de compras
// Usa 'title' para compatibilidad con el shop público (Course legacy type)
export type CartItem = {
  product: {
    id: string
    title: string // Compatibilidad con Course legacy
    description: string | null
    type?: ProductType
  }
  plan: Pick<Plan, 'id' | 'name' | 'price'>
  cartItemDescription?: string
  quantity?: number
}

export type Filters = {
  levels: string[]
  languages: string[]
  categories: string[]
  tags: string[]
}

// Nueva interfaz para manejar información del checkout
export interface CheckoutInfo {
  requiresAuth: boolean
  redirectAfterAuth: boolean
}

// Tipos específicos para la información del cliente
export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  needsShipping?: boolean
}

// Métodos de pago aceptados
export type PaymentMethod = 'creditCard' | 'paypal' | 'bankTransfer'

// Estado del pedido
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

// Interfaz para los detalles de pedido
export interface OrderDetails {
  orderNumber: string
  orderDate: string
  totalAmount: number
  items: CartItem[]
  customer: CustomerInfo
  paymentMethod: PaymentMethod
  status?: OrderStatus
  trackingNumber?: string
  estimatedDelivery?: string
  notes?: string
}

export type Merge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T & keyof U
    ? T[K] | U[K]
    : K extends keyof T
      ? T[K]
      : K extends keyof U
        ? U[K]
        : never
}
