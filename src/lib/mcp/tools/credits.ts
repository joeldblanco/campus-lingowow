import { z } from 'zod'
import {
  addCreditsToUser,
  createCreditPackage,
  getCreditPackageById,
  getCreditPackages,
  getCreditTransactions,
  getUserCreditBalance,
  spendUserCredits,
  updateCreditPackage,
} from '@/lib/actions/credits'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const adjustmentTypeEnum = z.enum([
  'PURCHASE',
  'BONUS',
  'ADMIN_ADJUSTMENT',
  'REWARD',
  'REFUND',
])

const transactionFilterTypeEnum = z.enum([
  'PURCHASE',
  'SPEND_PRODUCT',
  'SPEND_PLAN',
  'SPEND_COURSE',
  'REFUND',
  'BONUS',
  'ADMIN_ADJUSTMENT',
  'REWARD',
  'EXPIRED',
])

const spendTypeEnum = z.enum(['SPEND_PRODUCT', 'SPEND_PLAN', 'SPEND_COURSE'])

export const creditTools: AnyToolModule[] = [
  {
    name: 'lingowow_credits_get_balance',
    description: 'Obtiene el balance de créditos de un usuario (totales, disponibles, gastados, bonus). Crea el balance inicial si no existe.',
    scopes: ['mcp:credits:read'],
    inputShape: { userId: z.string().min(1) },
    handler: async ({ userId }) => {
      const result = await getUserCreditBalance(userId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_list_transactions',
    description: 'Lista el historial de transacciones de créditos de un usuario, con paginación y filtro por tipo.',
    scopes: ['mcp:credits:read'],
    inputShape: {
      userId: z.string().min(1),
      type: transactionFilterTypeEnum.optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ userId, type, limit, offset }) => {
      const result = await getCreditTransactions(userId, { limit, offset, type })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_add',
    description:
      'Agrega créditos a un usuario. Útil para ADMIN_ADJUSTMENT, BONUS, REWARD, REFUND. PURCHASE normalmente se hace vía processCreditPackagePurchase con una factura.',
    scopes: ['mcp:credits:write'],
    inputShape: {
      userId: z.string().min(1),
      amount: z.number().int().positive(),
      transactionType: adjustmentTypeEnum,
      description: z.string().min(1).max(500),
      metadata: z.record(z.unknown()).optional(),
    },
    handler: async ({ userId, amount, transactionType, description, metadata }) => {
      const result = await addCreditsToUser(userId, amount, transactionType, description, metadata)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_spend',
    description:
      'Resta créditos del balance de un usuario para una compra interna (producto, plan o curso). Falla si el balance disponible es insuficiente.',
    scopes: ['mcp:credits:write'],
    inputShape: {
      userId: z.string().min(1),
      amount: z.number().int().positive(),
      transactionType: spendTypeEnum,
      description: z.string().min(1).max(500),
      relatedEntityId: z.string().optional(),
      relatedEntityType: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    },
    handler: async (args) => {
      const result = await spendUserCredits(
        args.userId,
        args.amount,
        args.transactionType,
        args.description,
        args.relatedEntityId,
        args.relatedEntityType,
        args.metadata
      )
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_packages_list',
    description: 'Lista los paquetes de créditos activos disponibles para compra.',
    scopes: ['mcp:credits:read'],
    handler: async () => {
      const result = await getCreditPackages()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_packages_get',
    description: 'Obtiene un paquete de créditos por ID.',
    scopes: ['mcp:credits:read'],
    inputShape: { packageId: z.string().min(1) },
    handler: async ({ packageId }) => {
      const result = await getCreditPackageById(packageId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_packages_create',
    description: 'Crea un paquete de créditos para venta. credits = créditos que recibe el usuario; bonusCredits = adicionales gratis.',
    scopes: ['mcp:credits:write'],
    inputShape: {
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      credits: z.number().int().positive(),
      price: z.number().min(0),
      bonusCredits: z.number().int().min(0).optional().default(0),
      isPopular: z.boolean().optional().default(false),
      sortOrder: z.number().int().optional().default(0),
      image: z.string().optional(),
    },
    handler: async (args) => {
      const result = await createCreditPackage({
        name: args.name,
        description: args.description,
        credits: args.credits,
        price: args.price,
        bonusCredits: args.bonusCredits,
        isPopular: args.isPopular,
        sortOrder: args.sortOrder,
        image: args.image,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_credits_packages_update',
    description: 'Actualiza un paquete de créditos. Pasa solo los campos a modificar.',
    scopes: ['mcp:credits:write'],
    inputShape: {
      packageId: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      credits: z.number().int().positive().optional(),
      price: z.number().min(0).optional(),
      bonusCredits: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      image: z.string().optional(),
    },
    handler: async ({ packageId, ...data }) => {
      const result = await updateCreditPackage(packageId, data)
      return unwrapActionResult(result)
    },
  },
]
