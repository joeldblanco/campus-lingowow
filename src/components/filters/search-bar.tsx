'use client'

import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useShopStore } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'

export function SearchBar() {
  const searchQuery = useShopStore((state) => state.searchQuery)
  const setSearchQuery = useShopStore((state) => state.setSearchQuery)

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar productos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-10"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchQuery('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
