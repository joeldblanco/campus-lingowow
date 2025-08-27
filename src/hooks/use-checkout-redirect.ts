'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useShopStore } from '@/stores/useShopStore'
import { toast } from 'sonner'

/**
 * Hook para gestionar la redirección post-autenticación hacia checkout
 */
export function useCheckoutRedirect() {
  const { status } = useSession()
  const router = useRouter()
  const checkoutInfo = useShopStore((state) => state.checkoutInfo)
  const setCheckoutInfo = useShopStore((state) => state.setCheckoutInfo)

  useEffect(() => {
    // Solo si está autenticado y hay una redirección pendiente
    if (status === 'authenticated' && checkoutInfo.redirectAfterAuth) {
      // Reseteamos el flag de redirección
      setCheckoutInfo({ redirectAfterAuth: false })

      // Redirigimos al checkout
      toast.success('Sesión iniciada correctamente')
      router.push('/checkout')
    }
  }, [status, checkoutInfo.redirectAfterAuth, router, setCheckoutInfo])
}
