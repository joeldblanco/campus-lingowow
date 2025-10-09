'use client'

import { Slider } from '@/components/ui/slider'
import { useShopStore } from '@/stores/useShopStore'
import { DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'

export function PriceRangeFilter() {
  const priceRange = useShopStore((state) => state.priceRange)
  const setPriceRange = useShopStore((state) => state.setPriceRange)
  const [localRange, setLocalRange] = useState(priceRange)

  useEffect(() => {
    setLocalRange(priceRange)
  }, [priceRange])

  const handleRangeChange = (value: number[]) => {
    setLocalRange([value[0], value[1]])
  }

  const handleRangeCommit = (value: number[]) => {
    setPriceRange([value[0], value[1]])
  }

  return (
    <div>
      <h3 className="font-medium mb-3 flex items-center">
        <DollarSign className="h-4 w-4 mr-2" />
        Rango de Precio
      </h3>
      <div className="space-y-4">
        <Slider
          min={0}
          max={500}
          step={10}
          value={localRange}
          onValueChange={handleRangeChange}
          onValueCommit={handleRangeCommit}
          className="w-full"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${localRange[0]}</span>
          <span>${localRange[1]}</span>
        </div>
      </div>
    </div>
  )
}
