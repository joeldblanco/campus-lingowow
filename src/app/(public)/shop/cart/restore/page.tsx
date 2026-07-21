'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShoppingCart } from 'lucide-react'

import { useShopStore } from '@/stores/useShopStore'
import { getAbandonedCartForRecovery } from '@/lib/actions/abandoned-cart'
import { Button } from '@/components/ui/button'

/**
 * Página de destino del enlace "Retomar mi carrito" del correo de recuperación.
 * Resuelve el token a su snapshot, reconstruye el carrito en el store de Zustand
 * (que persiste en localStorage) y redirige al checkout.
 */
export default function RestoreCartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const ran = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setError('Este enlace no es válido. Falta el código de recuperación.')
      return
    }

    getAbandonedCartForRecovery(token)
      .then((res) => {
        if (!res.success || !res.data) {
          setError(res.message)
          return
        }
        useShopStore.setState({
          cart: res.data.items.map((item) => ({
            product: {
              id: item.product.id,
              title: item.product.title,
              image: item.product.image ?? null,
            },
            plan: { id: item.plan.id, name: item.plan.name, price: item.plan.price },
            quantity: item.quantity ?? 1,
            language: item.language,
          })),
        })
        router.replace('/shop/cart/checkout')
      })
      .catch(() => setError('No pudimos recuperar tu carrito. Inténtalo de nuevo más tarde.'))
  }, [token, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      {error ? (
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h1 className="font-lexend text-2xl font-semibold text-slate-900">
            No pudimos abrir tu carrito
          </h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/shop">Ir a la tienda</Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="font-sans text-sm">Recuperando tu carrito…</p>
        </div>
      )}
    </div>
  )
}
