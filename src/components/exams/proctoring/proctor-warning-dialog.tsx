'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ShieldAlert, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface ProctorWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  warningType: string | null
  violationCount: number
  maxWarnings: number
  onEnterFullscreen?: () => void
}

const WARNING_MESSAGES: Record<string, { title: string; description: string; icon: 'warning' | 'critical' }> = {
  tab_switch: {
    title: 'Cambio de Pestaña Detectado',
    description: 'Has cambiado de pestaña durante el examen. Esta acción ha sido registrada.',
    icon: 'warning'
  },
  fullscreen_exit: {
    title: 'Saliste del Modo Pantalla Completa',
    description: 'Debes permanecer en modo pantalla completa durante todo el examen.',
    icon: 'warning'
  },
  copy_attempt: {
    title: 'Intento de Copiar Detectado',
    description: 'No está permitido copiar contenido durante el examen. Esta acción ha sido registrada como incidente crítico.',
    icon: 'critical'
  },
  paste_attempt: {
    title: 'Intento de Pegar Detectado',
    description: 'No está permitido pegar contenido durante el examen. Esta acción ha sido registrada como incidente crítico.',
    icon: 'critical'
  },
  right_click: {
    title: 'Clic Derecho Detectado',
    description: 'El menú contextual está deshabilitado durante el examen.',
    icon: 'warning'
  },
  window_blur: {
    title: 'Ventana Perdió el Foco',
    description: 'La ventana del examen perdió el foco. Mantén el examen en primer plano.',
    icon: 'warning'
  },
  max_warnings: {
    title: 'Límite de Advertencias Alcanzado',
    description: 'Has alcanzado el número máximo de advertencias permitidas. Tu examen será revisado por el profesor.',
    icon: 'critical'
  }
}

export function ProctorWarningDialog({
  isOpen,
  onClose,
  warningType,
  violationCount,
  maxWarnings,
  onEnterFullscreen
}: ProctorWarningDialogProps) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (isOpen && warningType !== 'max_warnings') {
      setCountdown(5)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            onClose()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isOpen, warningType, onClose])

  if (!warningType) return null

  const warning = WARNING_MESSAGES[warningType]
  const isCritical = warning.icon === 'critical'
  const showFullscreenButton = warningType === 'fullscreen_exit'

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className={cn(
        "max-w-md",
        isCritical && "border-red-500"
      )}>
        <AlertDialogHeader>
          <div className={cn(
            "mx-auto size-16 rounded-full flex items-center justify-center mb-4",
            isCritical 
              ? "bg-red-100 dark:bg-red-900/30" 
              : "bg-yellow-100 dark:bg-yellow-900/30"
          )}>
            {isCritical ? (
              <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
          <AlertDialogTitle className={cn(
            "text-center",
            isCritical && "text-red-600 dark:text-red-400"
          )}>
            {warning.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {warning.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className={cn(
          "p-4 rounded-lg text-center",
          isCritical 
            ? "bg-red-50 dark:bg-red-900/20" 
            : "bg-yellow-50 dark:bg-yellow-900/20"
        )}>
          <p className="text-sm font-medium">
            Advertencias: <span className={cn(
              "font-bold",
              violationCount >= maxWarnings - 1 && "text-red-600"
            )}>{violationCount}</span> / {maxWarnings}
          </p>
          {violationCount >= maxWarnings - 1 && warningType !== 'max_warnings' && (
            <p className="text-xs text-red-600 mt-1">
              ¡Próxima advertencia resultará en revisión obligatoria!
            </p>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {showFullscreenButton && onEnterFullscreen && (
            <Button
              onClick={() => {
                onEnterFullscreen()
                onClose()
              }}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <Maximize className="h-4 w-4" />
              Volver a Pantalla Completa
            </Button>
          )}
          {warningType !== 'max_warnings' && (
            <Button
              variant={showFullscreenButton ? "outline" : "default"}
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Entendido ({countdown}s)
            </Button>
          )}
          {warningType === 'max_warnings' && (
            <Button
              variant="destructive"
              onClick={onClose}
              className="w-full"
            >
              Continuar con el Examen
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
