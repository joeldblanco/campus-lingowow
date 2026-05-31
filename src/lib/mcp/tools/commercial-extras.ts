import { z } from 'zod'
import {
  addFeatureToPlan,
  associatePlanToProduct,
  createCategory,
  createFeature,
  createInvoice,
  deleteCategory,
  deleteFeature,
  dissociatePlanFromProduct,
  getAvailablePlansForProduct,
  getCategoryById,
  getFeatureById,
  getFeatures,
  getInvoiceById,
  getInvoiceByNumber,
  getInvoices,
  getUserInvoices,
  removeFeatureFromPlan,
  updateCategory,
  updateFeature,
  updateInvoice,
  updatePlanFeatures,
} from '@/lib/actions/commercial'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const invoiceStatusEnum = z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])

export const commercialExtrasTools: AnyToolModule[] = [
  // Categorías de productos
  {
    name: 'lingowow_categories_get',
    description: 'Obtiene una categoría de productos por ID con sus productos asociados.',
    scopes: ['mcp:products:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const cat = await getCategoryById(id)
      if (!cat) throw new Error('Categoría no encontrada')
      return cat
    },
  },

  {
    name: 'lingowow_categories_create',
    description: 'Crea una categoría de productos.',
    scopes: ['mcp:products:write'],
    inputShape: {
      name: z.string().min(1).max(100),
      slug: z.string().min(1),
      description: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    },
    handler: async (args) => {
      const result = await createCategory({
        name: args.name,
        slug: args.slug,
        description: args.description ?? null,
        image: args.image ?? null,
        isActive: args.isActive,
        sortOrder: args.sortOrder,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_categories_update',
    description: 'Actualiza una categoría de productos.',
    scopes: ['mcp:products:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      slug: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateCategory(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_categories_delete',
    description: 'Elimina una categoría de productos. Falla si tiene productos asociados.',
    scopes: ['mcp:products:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteCategory(id)
      return unwrapActionResult(result)
    },
  },

  // Features
  {
    name: 'lingowow_features_list',
    description: 'Lista todas las features (características) que pueden asociarse a planes.',
    scopes: ['mcp:products:read'],
    handler: async () => getFeatures(),
  },

  {
    name: 'lingowow_features_get',
    description: 'Obtiene una feature por ID con los planes que la usan.',
    scopes: ['mcp:products:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const feat = await getFeatureById(id)
      if (!feat) throw new Error('Feature no encontrada')
      return feat
    },
  },

  {
    name: 'lingowow_features_create',
    description: 'Crea una feature reutilizable.',
    scopes: ['mcp:products:write'],
    inputShape: {
      name: z.string().min(1).max(100),
      description: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
    },
    handler: async (args) => {
      const result = await createFeature({
        name: args.name,
        description: args.description ?? null,
        icon: args.icon ?? null,
        isActive: args.isActive,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_features_update',
    description: 'Actualiza una feature.',
    scopes: ['mcp:products:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      description: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateFeature(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_features_delete',
    description: 'Elimina una feature permanentemente.',
    scopes: ['mcp:products:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteFeature(id)
      return unwrapActionResult(result)
    },
  },

  // Plan ↔ Feature management
  {
    name: 'lingowow_plans_add_feature',
    description: 'Asocia una feature a un plan. value puede usarse para descripciones tipo "Hasta 10 clases".',
    scopes: ['mcp:products:write'],
    inputShape: {
      planId: z.string().min(1),
      featureId: z.string().min(1),
      included: z.boolean().default(true),
      value: z.string().optional(),
    },
    handler: async ({ planId, featureId, included, value }) => {
      const result = await addFeatureToPlan(planId, featureId, included, value)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_remove_feature',
    description: 'Desasocia una feature de un plan.',
    scopes: ['mcp:products:write'],
    inputShape: {
      planId: z.string().min(1),
      featureId: z.string().min(1),
    },
    handler: async ({ planId, featureId }) => {
      const result = await removeFeatureFromPlan(planId, featureId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_set_features',
    description:
      'Reemplaza el set completo de features de un plan. Útil para sincronizar todas las features de una sola llamada.',
    scopes: ['mcp:products:write'],
    inputShape: {
      planId: z.string().min(1),
      features: z
        .array(
          z.object({
            featureId: z.string().min(1),
            included: z.boolean(),
            value: z.string().nullable().optional(),
          })
        )
        .min(0),
    },
    handler: async ({ planId, features }) => {
      const result = await updatePlanFeatures(planId, features)
      return unwrapActionResult(result)
    },
  },

  // Plan ↔ Product association
  {
    name: 'lingowow_plans_associate_product',
    description: 'Asocia un plan a un producto.',
    scopes: ['mcp:products:write'],
    inputShape: {
      planId: z.string().min(1),
      productId: z.string().min(1),
    },
    handler: async ({ planId, productId }) => {
      const result = await associatePlanToProduct(planId, productId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_dissociate_product',
    description: 'Desasocia un plan de su producto actual.',
    scopes: ['mcp:products:write'],
    inputShape: { planId: z.string().min(1) },
    handler: async ({ planId }) => {
      const result = await dissociatePlanFromProduct(planId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_plans_available_for_product',
    description: 'Lista los planes que aún no tienen producto asociado (candidatos para asociar).',
    scopes: ['mcp:products:read'],
    handler: async () => getAvailablePlansForProduct(),
  },

  // Facturas (CRUD admin)
  {
    name: 'lingowow_invoices_list',
    description: 'Lista todas las facturas con sus items, cupones y datos del cliente.',
    scopes: ['mcp:finance:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getInvoices()
      return {
        total: all.length,
        limit,
        offset,
        invoices: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_invoices_list_for_user',
    description: 'Lista las facturas de un usuario específico.',
    scopes: ['mcp:finance:read'],
    inputShape: { userId: z.string().min(1) },
    handler: async ({ userId }) => getUserInvoices(userId),
  },

  {
    name: 'lingowow_invoices_get',
    description: 'Obtiene una factura por ID o por invoiceNumber. Indica al menos uno.',
    scopes: ['mcp:finance:read'],
    inputShape: {
      id: z.string().optional(),
      invoiceNumber: z.string().optional(),
    },
    handler: async ({ id, invoiceNumber }) => {
      if (!id && !invoiceNumber) throw new Error('Indica id o invoiceNumber')
      const invoice = id
        ? await getInvoiceById(id)
        : await getInvoiceByNumber(invoiceNumber!)
      if (!invoice) throw new Error('Factura no encontrada')
      return invoice
    },
  },

  {
    name: 'lingowow_invoices_create',
    description:
      'Crea una factura con items. invoiceNumber debe ser único. couponId opcional. Cada item necesita name, price, quantity, total y opcionalmente productId/planId.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      invoiceNumber: z.string().min(1),
      userId: z.string().min(1),
      status: invoiceStatusEnum,
      subtotal: z.number().min(0),
      tax: z.number().min(0).default(0),
      discount: z.number().min(0).default(0),
      total: z.number().min(0),
      dueDate: z.string().datetime().nullable().optional(),
      couponId: z.string().nullable().optional(),
      items: z
        .array(
          z.object({
            productId: z.string().nullable().optional(),
            planId: z.string().nullable().optional(),
            name: z.string().min(1),
            price: z.number().min(0),
            quantity: z.number().int().min(1),
            total: z.number().min(0),
          })
        )
        .min(1),
    },
    handler: async (args) => {
      const result = await createInvoice({
        invoiceNumber: args.invoiceNumber,
        userId: args.userId,
        status: args.status,
        subtotal: args.subtotal,
        tax: args.tax,
        discount: args.discount,
        total: args.total,
        dueDate: args.dueDate ? new Date(args.dueDate) : null,
        couponId: args.couponId ?? null,
        items: (args.items as Array<{
          productId?: string | null
          planId?: string | null
          name: string
          price: number
          quantity: number
          total: number
        }>).map((i) => ({
          productId: i.productId ?? null,
          planId: i.planId ?? null,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          total: i.total,
        })),
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_invoices_update',
    description:
      'Actualiza campos no destructivos de una factura (status, dueDate, paidAt, invoiceNumber). Para crear/eliminar items, recrea la factura.',
    scopes: ['mcp:finance:write'],
    inputShape: {
      id: z.string().min(1),
      invoiceNumber: z.string().optional(),
      status: invoiceStatusEnum.optional(),
      dueDate: z.string().datetime().nullable().optional(),
      paidAt: z.string().datetime().nullable().optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateInvoice(id, {
        invoiceNumber: data.invoiceNumber,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        paidAt: data.paidAt ? new Date(data.paidAt) : data.paidAt === null ? null : undefined,
      })
      return unwrapActionResult(result)
    },
  },
]
