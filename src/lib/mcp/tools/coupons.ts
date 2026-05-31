import { z } from 'zod'
import { CouponType } from '@prisma/client'
import {
  createCoupon,
  deleteCoupon,
  getCouponById,
  getCoupons,
  getPlansForCoupon,
  searchUsersForCoupon,
  updateCoupon,
} from '@/lib/actions/commercial'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const couponTypeEnum = z.enum([CouponType.PERCENTAGE, CouponType.FIXED_AMOUNT] as const)

export const couponTools: AnyToolModule[] = [
  {
    name: 'lingowow_coupons_list',
    description: 'Lista todos los cupones con conteo de usos pagados.',
    scopes: ['mcp:coupons:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getCoupons()
      return {
        total: all.length,
        limit,
        offset,
        coupons: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_coupons_get',
    description: 'Obtiene un cupón por ID con sus facturas asociadas y restricciones.',
    scopes: ['mcp:coupons:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const coupon = await getCouponById(id)
      if (!coupon) throw new Error('Cupón no encontrado')
      return coupon
    },
  },

  {
    name: 'lingowow_coupons_search_users',
    description: 'Busca usuarios por nombre/email para restringir un cupón a un usuario específico.',
    scopes: ['mcp:coupons:read'],
    inputShape: { query: z.string().min(1) },
    handler: async ({ query }) => searchUsersForCoupon(query),
  },

  {
    name: 'lingowow_coupons_list_plans',
    description: 'Lista los planes disponibles para asignar como restricción a un cupón.',
    scopes: ['mcp:coupons:read'],
    handler: async () => getPlansForCoupon(),
  },

  {
    name: 'lingowow_coupons_create',
    description:
      'Crea un cupón. PERCENTAGE espera value 0-100 (porcentaje); FIXED_AMOUNT espera value en la moneda base. Restricciones de usuario o plan son opcionales.',
    scopes: ['mcp:coupons:write'],
    inputShape: {
      code: z.string().min(1).max(50),
      name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      type: couponTypeEnum.default('PERCENTAGE'),
      value: z.number(),
      minAmount: z.number().nullable().optional(),
      maxDiscount: z.number().nullable().optional(),
      usageLimit: z.number().int().nullable().optional(),
      userLimit: z.number().int().nullable().optional(),
      isActive: z.boolean().default(true),
      startsAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      restrictedToUserId: z.string().nullable().optional(),
      restrictedToPlanId: z.string().nullable().optional(),
    },
    handler: async (args) => {
      const result = await createCoupon({
        code: args.code,
        name: args.name ?? null,
        description: args.description ?? null,
        type: args.type,
        value: args.value,
        minAmount: args.minAmount ?? null,
        maxDiscount: args.maxDiscount ?? null,
        usageLimit: args.usageLimit ?? null,
        userLimit: args.userLimit ?? null,
        usageCount: 0,
        isActive: args.isActive,
        startsAt: args.startsAt ? new Date(args.startsAt) : null,
        expiresAt: args.expiresAt ? new Date(args.expiresAt) : null,
        restrictedToUserId: args.restrictedToUserId ?? null,
        restrictedToPlanId: args.restrictedToPlanId ?? null,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_coupons_update',
    description: 'Actualiza un cupón. Pasa solo los campos a modificar.',
    scopes: ['mcp:coupons:write'],
    inputShape: {
      id: z.string().min(1),
      code: z.string().min(1).max(50).optional(),
      name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      type: couponTypeEnum.optional(),
      value: z.number().optional(),
      minAmount: z.number().nullable().optional(),
      maxDiscount: z.number().nullable().optional(),
      usageLimit: z.number().int().nullable().optional(),
      userLimit: z.number().int().nullable().optional(),
      isActive: z.boolean().optional(),
      startsAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      restrictedToUserId: z.string().nullable().optional(),
      restrictedToPlanId: z.string().nullable().optional(),
    },
    handler: async ({ id, ...data }) => {
      const result = await updateCoupon(id, {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_coupons_delete',
    description: 'Elimina un cupón permanentemente.',
    scopes: ['mcp:coupons:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteCoupon(id)
      return unwrapActionResult(result)
    },
  },
]
