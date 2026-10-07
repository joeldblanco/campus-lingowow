'use client'

import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ExamEntryDialogProps {
  title: string
  proctoring: {
    enabled: boolean
    requireFullscreen: boolean
    blockCopyPaste: boolean
    blockRightClick: boolean
    maxWarnings: number
  }
  onEnter: () => Promise<void>
  onCancel: () => void
}

function getFullscreenErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'fullscreen-unsupported') {
    return 'Tu navegador no permite activar la pantalla completa. Usa un navegador compatible y vuelve a intentarlo.'
  }

  return 'No se pudo activar la pantalla completa. Permite la pantalla completa en tu navegador y vuelve a intentarlo.'
}

export function ExamEntryDialog({
  title,
  proctoring,
  onEnter,
  onCancel,
}: ExamEntryDialogProps) {
  const [open, setOpen] = useState(true)
  const [isEntering, setIsEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enteredFullscreen = useRef(false)

  const exitEnteredFullscreen = async () => {
    if (!enteredFullscreen.current) return

    enteredFullscreen.current = false
    if (typeof document.exitFullscreen !== 'function') return

    try {
      await document.exitFullscreen()
    } catch {
      // The browser may have left fullscreen while the attempt request was pending.
    }
  }

  const handleCancel = () => {
    if (isEntering) return

    setOpen(false)
    onCancel()
  }

  const handleEnter = async () => {
    if (isEntering || !open) return

    setError(null)
    setIsEntering(true)

    try {
      if (proctoring.requireFullscreen && !document.fullscreenElement) {
        const requestFullscreen = document.documentElement.requestFullscreen

        if (typeof requestFullscreen !== 'function') {
          setError(getFullscreenErrorMessage(new Error('fullscreen-unsupported')))
          return
        }

        try {
          // Keep this call before the first await so the browser's user gesture is preserved.
          await requestFullscreen.call(document.documentElement)
          enteredFullscreen.current = true
        } catch (requestError) {
          setError(getFullscreenErrorMessage(requestError))
          return
        }
      }

      try {
        await onEnter()
      } catch {
        await exitEnteredFullscreen()
        setError('No se pudo iniciar la evaluación. Revisa tu conexión y vuelve a intentarlo.')
        return
      }

      setOpen(false)
    } finally {
      setIsEntering(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true)
      return
    }

    handleCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,42rem)] max-w-lg overflow-y-auto rounded-2xl border-[#d9def0] bg-[#faf8f4] p-6 text-[#10245c] sm:p-8 [&>button]:size-11 [&>button]:rounded-full"
        onPointerDownOutside={(event) => {
          if (isEntering) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (isEntering) event.preventDefault()
        }}
      >
        <DialogHeader className="gap-3 text-left">
          <DialogTitle className="font-serif text-[26px] leading-tight text-[#10245c] sm:text-[32px]">
            Antes de entrar a la evaluación
          </DialogTitle>
          <p className="text-base font-semibold leading-6 text-[#245cff]">{title}</p>
          <DialogDescription className="text-base leading-6 text-[#506187]">
            Revisa estas condiciones antes de comenzar. Podrás volver a intentarlo si el navegador
            no permite activar una condición requerida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-base leading-6 text-[#10245c]">
          <p>
            {proctoring.requireFullscreen
              ? 'Para entrar, debes usar la pantalla completa.'
              : 'Esta evaluación no requiere usar la pantalla completa.'}
          </p>

          {proctoring.enabled ? (
            <>
              <p>
                La supervisión está activa: se monitorizan los cambios de pestaña, ventana y
                pantalla completa.
              </p>
              {proctoring.blockCopyPaste && <p>Copiar y pegar estarán bloqueados durante la evaluación.</p>}
              {proctoring.blockRightClick && <p>El clic derecho estará bloqueado durante la evaluación.</p>}
              <p>
                Al llegar a {proctoring.maxWarnings} advertencias, el intento pasa a revisión; no
                se marca automáticamente como reprobado.
              </p>
            </>
          ) : (
            <p>
              La supervisión está desactivada para esta evaluación; esta configuración no monitorea
              tu actividad.
            </p>
          )}
        </div>

        {error && (
          <p
            className="rounded-xl border border-[#f3c2ca] bg-[#fff1f2] p-3 text-base leading-6 text-[#c13e50]"
            role="alert"
          >
            {error}
          </p>
        )}

        <DialogFooter className="flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            className="min-h-11 w-full rounded-full border-[#506187] px-5 text-base text-[#10245c] sm:w-auto"
            disabled={isEntering}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            aria-busy={isEntering}
            className="min-h-11 w-full rounded-full bg-[#245cff] px-5 text-base text-white hover:bg-[#10245c] sm:w-auto"
            disabled={isEntering}
            onClick={handleEnter}
            type="button"
          >
            {isEntering ? 'Entrando...' : 'Entrar a la evaluación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
