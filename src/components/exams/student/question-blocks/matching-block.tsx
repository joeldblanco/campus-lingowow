'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchingBlockProps {
  items: { id: string; term: string }[]
  options: string[]
  matches: Record<string, string>
  onMatch: (itemId: string, option: string) => void
  disabled?: boolean
}

export function MatchingBlock({
  items,
  options,
  matches,
  onMatch,
  disabled = false
}: MatchingBlockProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {items.map((item) => (
        <>
          <div 
            key={`term-${item.id}`}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <span className="font-medium text-gray-700 dark:text-gray-200">{item.term}</span>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <select
            key={`select-${item.id}`}
            value={matches[item.id] || ''}
            onChange={(e) => onMatch(item.id, e.target.value)}
            disabled={disabled}
            className={cn(
              "block w-full rounded-lg border-gray-300 bg-white dark:bg-gray-900",
              "dark:border-gray-700 dark:text-white focus:border-primary focus:ring-primary h-[48px]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <option value="">Selecciona traducción...</option>
            {options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        </>
      ))}
    </div>
  )
}
