'use client'

import { exitImpersonation } from '@/lib/actions/impersonate'
import { Button } from '@/components/ui/button'
import { formatFirstName } from '@/lib/utils/name-formatter'
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
    <div className="relative z-40 border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium">Vista de usuario ·</span>
            <span className="text-sm">
              {formatFirstName(session.user.name?.trim().split(/\s+/)[0]) || session.user.email}
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
          {isPending ? 'Saliendo...' : 'Salir'}
        </Button>
      </div>
    </div>
  )
}
