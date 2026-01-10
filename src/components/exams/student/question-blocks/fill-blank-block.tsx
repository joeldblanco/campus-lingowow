'use client'

import { cn } from '@/lib/utils'

interface FillBlankBlockProps {
  sentence: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function FillBlankBlock({
  sentence,
  value,
  onChange,
  disabled = false
}: FillBlankBlockProps) {
  const parts = sentence.split('___')
  
  return (
    <div className="bg-muted p-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center flex-wrap gap-2 text-lg leading-loose">
      {parts.map((part, index) => (
        <span key={index}>
          <span className="text-gray-800 dark:text-gray-200">{part}</span>
          {index < parts.length - 1 && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder="escribe aquí"
              className={cn(
                "border-0 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent",
                "focus:ring-0 focus:border-primary text-center w-32 font-medium text-primary",
                "placeholder-gray-400 px-1 py-0",
                disabled && "cursor-not-allowed opacity-60"
              )}
            />
          )}
        </span>
      ))}
    </div>
  )
}
