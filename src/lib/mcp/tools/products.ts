import { z } from 'zod'
import { ProductPaymentType, ProductPricingType } from '@prisma/client'
import {
  createPlan,
  createProduct,
  deletePlan,
  deleteProduct,
  getAllProductTags,
  getCategories,
  getPlanById,
  getPlans,
  getPricingPlansForProduct,
  getProductById,
  getProducts,
  updatePlan,
  updateProduct,
  updateProductSortOrder,
} from '@/lib/actions/commercial'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const pricingTypeEnum = z.enum([
  ProductPricingType.SINGLE_PRICE,
  ProductPricingType.MULTIPLE_PLANS,
] as const)
const paymentTypeEnum = z.enum([
  ProductPaymentType.ONE_TIME,
  ProductPaymentType.RECURRING,
] as const)

export const productTools: AnyToolModule[] = [
  // Productos
  {
    name: 'lingowow_products_list',
    description:
      'Lista productos de la tienda. Filtros opcionales por categoría, tags, búsqueda y estado activo.',
    scopes: ['mcp:products:read'],
    inputShape: {
      search: z.string().optional(),
      categoryId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset, ...filters }) => {
      const all = await getProducts(filters)
      return {
        total: all.length,
        limit,
        offset,
        products: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_products_get',
    description: 'Obtiene un producto por ID con su categoría, planes asociados y items de factura.',
    scopes: ['mcp:products:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const product = await getProductById(id)
      if (!product) throw new Error('Producto no encontrado')
      return product
    },
  },

  {
    name: 'lingowow_products_list_categories',
    description: 'Lista todas las categorías de productos.',
    scopes: ['mcp:products:read'],
    handler: async () => getCategories(),
  },

  {
    name: 'lingowow_products_list_tags',
    description: 'Lista todos los tags únicos usados por productos activos.',
    scopes: ['mcp:products:read'],
    handler: async () => getAllProductTags(),
  },

  {
    name: 'lingowow_products_create',
    description:
      'Crea un producto. slug debe ser único. Para productos con múltiples planes, usa pricingType MULTIPLE_PLANS y luego asocia planes con lingowow_plans_create.',
    scopes: ['mcp:products:write'],
    inputShape: {
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional().nullable(),
      shortDesc: z.string().optional().nullable(),
      price: z.number().min(0),
      comparePrice: z.number().min(0).nullable().optional(),
      sku: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      images: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
      isDigital: z.boolean().default(true),
      stock: z.number().int().nullable().optional(),
      categoryId: z.string().nullable().optional(),
      tags: z.array(z.string()).default([]),
      sortOrder: z.number().int().default(0),
      publishedAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      requiresScheduling: z.boolean().default(false),
      courseId: z.string().nullable().optional(),
      maxScheduleSlots: z.number().int().nullable().optional(),
      scheduleDuration: z.number().int().nullable().optional(),
      pricingType: pricingTypeEnum.default('SINGLE_PRICE'),
      paymentType: paymentTypeEnum.default('ONE_TIME'),
    },
    handler: async (args) => {
      const result = await createProduct(args as never)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_products_update',
    description: 'Actualiza un producto existente. Pasa solo los campos a modificar.',
    scopes: ['mcp:products:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional().nullable(),
      shortDesc: z.string().optional().nullable(),
      price: z.number().min(0).optional(),
      comparePrice: z.number().min(0).nullable().optional(),
      sku: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      images: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      isDigital: z.boolean().optional(),
      stock: z.number().int().nullable().optional(),
      categoryId: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      sortOrder: z.number().int().optional(),
      publishedAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      requiresScheduling: z.boolean().optional(),
      courseId: z.string().nullable().optional(),
      maxScheduleSlots: z.number().int().nullable().optional(),
      scheduleDuration: z.number().int().nullable().optional(),
      pricingType: pricingTypeEnum.optional(),
      paymentType: paymentTypeEnum.optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateProduct(id, data as never)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_products_set_sort_order',
    description: 'Actualiza el orden de aparición de un producto en la tienda.',
    scopes: ['mcp:products:write'],
    inputShape: {
      id: z.string().min(1),
      sortOrder: z.number().int(),
    },
    handler: async ({ id, sortOrder }) => {
      const result = await updateProductSortOrder(id, sortOrder)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_products_delete',
    description: 'Elimina un producto permanentemente. Operación destructiva.',
    scopes: ['mcp:products:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteProduct(id)
      return unwrapActionResult(result)
    },
  },

  // Planes
  {
    name: 'lingowow_plans_list',
    description: 'Lista todos los planes con su producto, curso, características y precios asociados.',
    scopes: ['mcp:products:read'],
    handler: async () => getPlans(),
  },

  {
    name: 'lingowow_plans_list_for_product',
    description: 'Lista los planes activos asociados a un producto específico.',
    scopes: ['mcp:products:read'],
    inputShape: { productId: z.string().min(1) },
    handler: async ({ productId }) => getPricingPlansForProduct(productId),
  },

  {
    name: 'lingowow_plans_get',
    description: 'Obtiene un plan por ID con sus features y items de factura.',
    scopes: ['mcp:products:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const plan = await getPlanById(id)
      if (!plan) throw new Error('Plan no encontrado')
      return plan
    },
  },

  {
    name: 'lingowow_plans_create',
    description:
      'Crea un plan. duration en días (período de facturación). Si includesClasses=true, indica classesPerPeriod o classesPerWeek.',
    scopes: ['mcp:products:write'],
    inputShape: {
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional().nullable(),
      price: z.number().min(0).default(0),
      comparePrice: z.number().min(0).nullable().optional(),
      duration: z.number().int().min(1),
      isActive: z.boolean().default(true),
      isPopular: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
      productId: z.string().nullable().optional(),
      paypalSku: z.string().nullable().optional(),
      includesClasses: z.boolean().default(false),
      classesPerPeriod: z.number().int().nullable().optional(),
      classesPerWeek: z.number().int().nullable().optional(),
      allowProration: z.boolean().default(true),
      autoRenewal: z.boolean().default(true),
      billingCycle: z.string().nullable().optional().describe('WEEKLY|MONTHLY|QUARTERLY|ANNUAL'),
      courseId: z.string().nullable().optional(),
      creditPrice: z.number().int().nullable().optional(),
      acceptsCredits: z.boolean().default(false),
      acceptsRealMoney: z.boolean().default(true),
    },
    handler: async (args) => {
      const result = await createPlan(args as never)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_update',
    description: 'Actualiza un plan existente.',
    scopes: ['mcp:products:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional().nullable(),
      price: z.number().min(0).optional(),
      comparePrice: z.number().min(0).nullable().optional(),
      duration: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      productId: z.string().nullable().optional(),
      includesClasses: z.boolean().optional(),
      classesPerPeriod: z.number().int().nullable().optional(),
      classesPerWeek: z.number().int().nullable().optional(),
      allowProration: z.boolean().optional(),
      autoRenewal: z.boolean().optional(),
      billingCycle: z.string().nullable().optional(),
      courseId: z.string().nullable().optional(),
      creditPrice: z.number().int().nullable().optional(),
      acceptsCredits: z.boolean().optional(),
      acceptsRealMoney: z.boolean().optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updatePlan(id, data as never)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_delete',
    description: 'Elimina un plan permanentemente.',
    scopes: ['mcp:products:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deletePlan(id)
      return unwrapActionResult(result)
    },
  },
]
