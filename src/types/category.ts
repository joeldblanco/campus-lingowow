import { Prisma } from '@prisma/client'

// Tipo base de Category generado por Prisma
export type Category = Prisma.CategoryGetPayload<{
  select: {
    id: true
    name: true
    slug: true
    description: true
    image: true
    isActive: true
    sortOrder: true
    createdAt: true
    updatedAt: true
  }
}>

// Tipo de Category con conteo de productos
export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        products: true
      }
    }
  }
}>