'use client'

import { useEffect, useRef } from 'react'
import { useShopStore } from '@/stores/useShopStore'
import { recordAbandonedCart } from '@/lib/actions/abandoned-cart'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface CartAbandonmentTrackerProps {
  /** Email conocido del comprador (formulario de checkout o sesión). */
  email?: string | null
  /** Id del usuario logueado, si lo hay. */
  userId?: string | null
}

/**
 * Persiste server-side un snapshot del carrito para un email conocido, de modo
 * que el cron `recover-abandoned-carts` pueda enviar UN correo de recuperación
 * si la compra no se completa. El carrito vive solo en el store de Zustand
 * (localStorage); este componente es el puente cliente→servidor.
 *
 * No renderiza nada. Debe montarse donde se conoce el email (p. ej. el checkout).
 * Hace debounce y deduplica por firma para no escribir en cada pulsación.
 */
export function CartAbandonmentTracker({ email, userId }: CartAbandonmentTrackerProps) {
  const cart = useShopStore((state) => state.cart)
  const lastSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const trimmedEmail = email?.trim() ?? ''
    // Solo registramos si hay items y un email válido (consentimiento real lo
    // evalúa el cron contra newsletter_subscriptions antes de enviar).
    if (cart.length === 0 || !EMAIL_RE.test(trimmedEmail)) return

    const items = cart.map((item) => ({
      product: {
        id: item.product.id,
        title: item.product.title,
        image: item.product.image ?? null,
      },
      plan: { id: item.plan.id, name: item.plan.name, price: item.plan.price },
      quantity: item.quantity ?? 1,
      language: item.language,
    }))

    const signature = JSON.stringify({ email: trimmedEmail, userId: userId ?? null, items })
    if (signature === lastSignatureRef.current) return

    const timeout = setTimeout(() => {
      lastSignatureRef.current = signature
      void recordAbandonedCart({
        email: trimmedEmail,
        userId: userId ?? undefined,
        currency: 'USD',
        items,
      })
    }, 2500)

    return () => clearTimeout(timeout)
  }, [cart, email, userId])

  return null
}
