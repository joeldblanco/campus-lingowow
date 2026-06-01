'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

/**
 * Route-level error boundary for the virtual classroom.
 *
 * Catches any render/SSR failure of /classroom (e.g. the jsdom ENOENT that
 * caused production 500s on 2026-06-01) and shows a friendly, actionable
 * screen instead of a raw 500 — while reporting the full error to Sentry so we
 * always have the details next time.
 */
export default function ClassroomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#202124]">
      <div className="text-center max-w-md p-6 bg-[#292a2d] rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-red-400 mb-2">No pudimos cargar el aula</h2>
        <p className="text-white/60 mb-4">
          Hubo un problema al preparar tu clase. Intenta de nuevo; si el problema persiste, recarga
          la página o contáctanos.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()}>Reintentar</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </div>
      </div>
    </div>
  )
}
