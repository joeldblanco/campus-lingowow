export enum ProductTypeEnum {
  COURSE = 'course',
  MERCHANDISE = 'merchandise',
}

// Tipo para distinguir entre tipos de productos
export type ProductType = (typeof ProductTypeEnum)[keyof typeof ProductTypeEnum]

export type Plan = {
  id: string
  name: string
  price: number
  features: string[]
}

export type Course = {
  id: string
  title: string
  description: string
  levels: string[]
  language: string
  category: string
  image: string
  plans: Plan[]
}

export type Product = {
  id: string
  title: string
  description: string
  category: string
  image: string
  plans: Plan[]
  type: ProductType
}

// Mantenemos la estructura actual para CartItem
export type CartItem = {
  product: Pick<Product, 'id' | 'title' | 'description' | 'type'>
  plan: Pick<Plan, 'id' | 'name' | 'price'>
  cartItemDescription?: string
  quantity?: number
}

export type Filters = {
  levels: string[]
  languages: string[]
  categories: string[]
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
