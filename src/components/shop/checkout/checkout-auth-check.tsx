'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useShopStore } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CheckoutAuthCheckProps {
  onAuthenticated: () => void
  onSkipAuth: () => void
}

export function CheckoutAuthCheck({ onAuthenticated, onSkipAuth }: CheckoutAuthCheckProps) {
  const { status } = useSession()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const requiresAuth = useShopStore((state) => state.getRequiresAuth())
  const setCheckoutInfo = useShopStore((state) => state.setCheckoutInfo)

  // Verificamos la autenticación cuando cambia el status de la sesión
  useEffect(() => {
    if (status === 'authenticated') {
      // El usuario ya está autenticado
      onAuthenticated()
    } else if (status === 'unauthenticated' && !requiresAuth) {
      // No requiere autenticación, continuamos con el checkout
      onSkipAuth()
    }
  }, [status, requiresAuth, onAuthenticated, onSkipAuth])

  const handleLogin = () => {
    setIsRedirecting(true)
    // Guardamos en el store que debe redirigir después de autenticación
    setCheckoutInfo({ redirectAfterAuth: true })
    // Redirigimos al login
    router.push('/auth/signin?redirect=/checkout')
  }

  const handleContinueAsGuest = () => {
    // Confirmar que está bien proceder sin cuenta
    toast.info('Puedes comprar merchandising sin crear una cuenta')
    onSkipAuth()
  }

  if (status === 'loading' || isRedirecting) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Si requiere autenticación pero no está autenticado
  if (requiresAuth && status === 'unauthenticated') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Inicio de sesión requerido</CardTitle>
          <CardDescription>
            Tu carrito contiene cursos que requieren una cuenta para acceder a la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Para comprar cursos, necesitas iniciar sesión o crear una cuenta. Esto te permitirá
            acceder a tus materiales de aprendizaje después de la compra.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" onClick={handleLogin}>
            Iniciar sesión / Registrarse
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/shop')}>
            Volver a la tienda
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Si no requiere autenticación y no está autenticado, mostramos opciones
  if (!requiresAuth && status === 'unauthenticated') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Opciones de compra</CardTitle>
          <CardDescription>
            Puedes comprar merchandising sin necesidad de crear una cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Si ya tienes una cuenta o quieres crear una, puedes iniciar sesión. También puedes
            continuar como invitado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" onClick={handleContinueAsGuest}>
            Continuar como invitado
          </Button>
          <Button variant="outline" className="w-full" onClick={handleLogin}>
            Iniciar sesión / Registrarse
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Estado que no debería ocurrir
  return null
}
