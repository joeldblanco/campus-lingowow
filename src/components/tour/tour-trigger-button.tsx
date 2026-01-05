'use client'

import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import { useTour } from './tour-context'
import type { TourType } from './tour-types'

interface TourTriggerButtonProps {
  tourType: TourType
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function TourTriggerButton({
  tourType,
  variant = 'ghost',
  size = 'sm',
  className = '',
  showLabel = true,
}: TourTriggerButtonProps) {
  const { startTour } = useTour()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => startTour(tourType)}
      className={`gap-2 ${className}`}
      title="Iniciar tour guiado"
    >
      <HelpCircle className="h-4 w-4" />
      {showLabel && <span>Tour Guiado</span>}
    </Button>
  )
}
