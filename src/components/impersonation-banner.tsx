'use client'

import { exitImpersonation } from '@/lib/actions/impersonate'
import { Button } from '@/components/ui/button'
import { AlertCircle, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTransition } from 'react'
import { toast } from 'sonner'

/**
 * Banner que se muestra cuando un administrador está suplantando a otro usuario
 * Permite volver a la sesión de administrador original
 */
export function ImpersonationBanner() {
  const { data: session } = useSession()
  const [isPending, startTransition] = useTransition()

  // No mostrar el banner si no hay suplantación activa
  if (!session?.user?.impersonationData) {
    return null
  }

  const handleExitImpersonation = () => {
    startTransition(() => {
      exitImpersonation()
        .then((response) => {
          if (response.error) {
            toast.error(response.error)
          } else {
            toast.success('Suplantación finalizada', {
              description: 'Has vuelto a tu cuenta de administrador',
            })
            // Recargar la página completamente para actualizar la sesión
            window.location.href = '/dashboard'
          }
        })
        .catch((error) => {
          toast.error('Error al salir de la suplantación')
          console.error('Error:', error)
        })
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="font-medium">Modo suplantación activo</span>
            <span className="text-sm text-amber-100">
              Estás navegando como {session.user.name || session.user.email}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExitImpersonation}
          disabled={isPending}
          className="bg-white text-amber-600 hover:bg-gray-100"
        >
          <X className="h-4 w-4 mr-2" />
          {isPending ? 'Saliendo...' : 'Salir de suplantación'}
        </Button>
      </div>
    </div>
  )
}
