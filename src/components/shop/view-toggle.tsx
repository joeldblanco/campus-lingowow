'use client'

import { Button } from '@/components/ui/button'
import { useShopStore } from '@/stores/useShopStore'
import { Grid3x3, List } from 'lucide-react'

export function ViewToggle() {
  const viewMode = useShopStore((state) => state.viewMode)
  const setViewMode = useShopStore((state) => state.setViewMode)

  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('grid')}
        className="h-8 w-8 p-0"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('list')}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
