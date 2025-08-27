'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Clock } from 'lucide-react'

interface BookingModeToggleProps {
  bookingMode: '40min' | '90min'
  setBookingMode: (mode: '40min' | '90min') => void
  disabled?: boolean
}

export function BookingModeToggle({
  bookingMode,
  setBookingMode,
  disabled = false,
}: BookingModeToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Duración de clase:</span>
      </div>
      <ToggleGroup
        type="single"
        value={bookingMode}
        onValueChange={(value) => {
          if (value) setBookingMode(value as '40min' | '90min')
        }}
        disabled={disabled}
      >
        <ToggleGroupItem value="40min" aria-label="40 minutos">
          40 min
        </ToggleGroupItem>
        <ToggleGroupItem value="90min" aria-label="90 minutos">
          90 min
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
