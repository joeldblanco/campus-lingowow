'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

/**
 * Hook personalizado para manejar redirecciones después del inicio de sesión
 * Especialmente útil para el proceso de checkout
 */
export function useAuthRedirect() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Solo ejecutamos la lógica cuando el usuario está autenticado
    if (status === 'authenticated') {
      // Verificamos si hay una redirección de checkout pendiente
      const checkoutRedirect = sessionStorage.getItem('checkout-redirect')

      if (checkoutRedirect === 'true') {
        // Limpiamos el flag de redirección
        sessionStorage.removeItem('checkout-redirect')

        // Notificamos y redirigimos
        toast.success('Sesión iniciada correctamente')
        router.push('/checkout')
      }
    }
  }, [status, router])
}

/**
 * Este hook debe usarse en los componentes de login y registro
 * para manejar la redirección al checkout después de la autenticación
 */
