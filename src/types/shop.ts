export type CartItem = {
  productId: string
  productTitle: string
  planId: string
  planName: string
  price: number
}

export type Filters = {
  levels: string[]
  languages: string[]
  categories: string[]
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

export type Plan = {
  id: string
  name: string
  price: number
  features: string[]
}

export type Product = {
  id: string
  title: string
  description: string
  category: string
  image: string
  plans: Plan[]
}

export type Merge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T & keyof U
    ? T[K] | U[K] // Keep duplicated fields as unions
    : K extends keyof T
      ? T[K]
      : K extends keyof U
        ? U[K]
        : never
}
