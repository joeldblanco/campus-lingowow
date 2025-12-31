'use client'

import { Search, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

const categories = [
  { id: 'all', label: 'Todos los Productos' },
  { id: 'subscriptions', label: 'Suscripciones' },
  { id: 'events', label: 'Eventos y Webinars' },
  { id: 'materials', label: 'Materiales de Estudio' },
]

const levels = [
  { id: 'all', label: 'Nivel' },
  { id: 'beginner', label: 'Principiante' },
  { id: 'intermediate', label: 'Intermedio' },
  { id: 'advanced', label: 'Avanzado' },
]

export function SearchFilters() {
  const searchQuery = useShopStore((state) => state.searchQuery)
  const setSearchQuery = useShopStore((state) => state.setSearchQuery)
  const filters = useShopStore((state) => state.filters)
  const toggleFilter = useShopStore((state) => state.toggleFilter)

  const activeCategory = filters.categories[0] || 'all'

  return (
    <div className="space-y-4">
      <div className="w-full">
        <label className="flex flex-col h-14 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
            <div className="text-slate-400 bg-white border border-r-0 border-slate-200 items-center justify-center pl-4 rounded-l-xl flex">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="Buscar productos, eventos o suscripciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-l-none text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-l-0 border-slate-200 bg-white placeholder:text-slate-400 px-4 pl-2 text-base font-normal leading-normal transition-all h-full shadow-none"
            />
          </div>
        </label>
      </div>

      {/* Category Filters */}
      <div className="flex gap-3 py-2 flex-wrap items-center">
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => {
              if (category.id === 'all') {
                filters.categories.forEach(cat => toggleFilter('categories', cat))
              } else {
                filters.categories.forEach(cat => toggleFilter('categories', cat))
                toggleFilter('categories', category.id)
              }
            }}
            className={cn(
              'flex h-9 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 transition-transform hover:scale-105 active:scale-95 shadow-none',
              activeCategory === category.id
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-primary/50'
            )}
          >
            <p className="text-sm font-medium leading-normal">{category.label}</p>
            {category.id !== 'all' && (
              <ChevronDown className="text-slate-500 h-5 w-5" />
            )}
          </Button>
        ))}

        <div className="w-px h-6 bg-slate-300 mx-2" />

        {/* Level Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="flex h-9 items-center justify-center gap-x-2 rounded-full bg-white border border-slate-200 hover:border-primary/50 pl-4 pr-3 transition-all hover:bg-slate-50 text-slate-700 shadow-none"
            >
              <p className="text-sm font-medium leading-normal">Nivel</p>
              <svg className="text-slate-500 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {levels.map((level) => (
              <DropdownMenuItem
                key={level.id}
                onClick={() => {
                  if (level.id !== 'all') {
                    toggleFilter('levels', level.label)
                  }
                }}
                className={cn(
                  filters.levels.includes(level.label) && 'bg-blue-50 text-primary'
                )}
              >
                {level.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
