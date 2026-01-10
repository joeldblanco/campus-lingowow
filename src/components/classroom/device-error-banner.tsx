'use client'

import { Button } from '@/components/ui/button'
import { Camera, Mic, RefreshCw, X } from 'lucide-react'

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
        return (
          <div className="flex gap-1">
            <Camera className="h-4 w-4" />
            <Mic className="h-4 w-4" />
          </div>
        )
    }
  }

  const getDefaultMessage = () => {
    switch (type) {
      case 'camera':
        return 'Cámara en uso por otra app. Continuarás sin video.'
      case 'microphone':
        return 'Micrófono en uso por otra app. Continuarás sin audio.'
      case 'both':
        return 'Cámara y micrófono en uso. Continuarás sin audio ni video.'
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm animate-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2">
        <span className="text-amber-600">{getIcon()}</span>
        <span>{message || getDefaultMessage()}</span>
      </div>
      <div className="flex items-center gap-1">
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
          className="h-6 w-6 text-amber-600 hover:text-amber-900 hover:bg-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
