import * as z from 'zod'

/**
 * Snapshot mínimo de un item del carrito. Es un subconjunto tolerante de
 * `CartItem` (src/types/shop) — solo lo necesario para reconstruir el carrito en
 * el cliente y para renderizar el correo de recuperación.
 */
export const AbandonedCartItemSchema = z.object({
  product: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    image: z.string().nullish(),
  }),
  plan: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(),
  }),
  quantity: z.number().int().positive().optional(),
  language: z.string().optional(),
  cartItemDescription: z.string().optional(),
})

export type AbandonedCartItemInput = z.infer<typeof AbandonedCartItemSchema>

/**
 * Entrada de `recordAbandonedCart`. El `total` NO se acepta del cliente: se
 * recalcula en el servidor a partir de los items para evitar manipulación.
 */
export const RecordAbandonedCartSchema = z.object({
  email: z.string().email('Email inválido'),
  userId: z.string().optional(),
  currency: z.string().min(1).max(8).default('USD'),
  items: z.array(AbandonedCartItemSchema).min(1, 'El carrito está vacío'),
})

export type RecordAbandonedCartInput = z.infer<typeof RecordAbandonedCartSchema>
