'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface EssayBlockProps {
  value: string
  onChange: (value: string) => void
  minWords?: number
  maxWords?: number
  placeholder?: string
  disabled?: boolean
}

export function EssayBlock({
  value,
  onChange,
  minWords,
  maxWords,
  placeholder = "Escribe tu respuesta aquí...",
  disabled = false
}: EssayBlockProps) {
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(w => w.length > 0)
    setWordCount(words.length)
  }, [value])

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full h-48 p-4 rounded-lg border-gray-300 dark:border-gray-700",
          "dark:bg-gray-900 focus:ring-primary focus:border-primary resize-y",
          disabled && "cursor-not-allowed opacity-60"
        )}
      />
      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
        {wordCount} {maxWords ? `/ ${maxWords}` : ''} palabras
        {minWords && wordCount < minWords && (
          <span className="text-red-500 ml-1">(mín. {minWords})</span>
        )}
      </div>
    </div>
  )
}
