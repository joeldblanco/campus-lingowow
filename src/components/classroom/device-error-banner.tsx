'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Camera, Mic, RefreshCw, X } from 'lucide-react'

interface DeviceErrorBannerProps {
  type: 'camera' | 'microphone' | 'both'
  message: string
  canRetry: boolean
  onRetry: () => void
  onDismiss: () => void
}

export function DeviceErrorBanner({
  type,
  message,
  canRetry,
  onRetry,
  onDismiss,
}: DeviceErrorBannerProps) {
  const getIcon = () => {
    switch (type) {
      case 'camera':
        return <Camera className="h-4 w-4" />
      case 'microphone':
        return <Mic className="h-4 w-4" />
      case 'both':
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'camera':
        return 'Cámara no disponible'
      case 'microphone':
        return 'Micrófono no disponible'
      case 'both':
        return 'Dispositivos no disponibles'
    }
  }

  return (
    <Alert 
      variant="destructive" 
      className="bg-amber-50 border-amber-200 text-amber-900 animate-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0 mt-0.5 text-amber-600">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{getTitle()}</div>
          <AlertDescription className="text-xs text-amber-700 mt-0.5">
            {message}
            <span className="block mt-1 text-amber-600">
              Puedes continuar en la clase sin {type === 'camera' ? 'video' : type === 'microphone' ? 'audio' : 'video ni audio'}.
            </span>
          </AlertDescription>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-7 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-7 w-7 text-amber-600 hover:text-amber-900 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  )
}
