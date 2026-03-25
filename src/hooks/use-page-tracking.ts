'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trackEvent } from '@/lib/actions/audit-log'

function sendBeaconJson(url: string, data: Record<string, unknown>) {
  navigator.sendBeacon(
    url,
    new Blob([JSON.stringify(data)], { type: 'application/json' })
  )
}

/**
 * Hook que registra cuándo el usuario entra y sale de la página.
 * Usa visibilitychange como único mecanismo de salida para evitar duplicados.
 * Reacciona a cambios de ruta SPA via usePathname().
 */
export function usePageTracking() {
  const { data: session } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (!session?.user?.id) return

    const page = pathname

    // Registrar entrada a la página
    trackEvent({
      action: 'PAGE_ENTER',
      category: 'SESSION',
      description: `Ingresó a: ${page}`,
      metadata: { path: page },
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendBeaconJson('/api/audit-log', {
          action: 'PAGE_LEAVE',
          category: 'SESSION',
          description: `Salió de: ${page}`,
          metadata: { path: page, trigger: 'visibility' },
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session?.user?.id, pathname])
}
