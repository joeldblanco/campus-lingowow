'use client'

import { cn } from '@/lib/utils'

interface ShortAnswerBlockProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ShortAnswerBlock({
  value,
  onChange,
  placeholder = "Escribe tu respuesta aquí...",
  disabled = false
}: ShortAnswerBlockProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "w-full p-4 rounded-lg border border-gray-300 dark:border-gray-700",
        "dark:bg-gray-900 focus:ring-primary focus:border-primary",
        disabled && "cursor-not-allowed opacity-60"
      )}
    />
  )
}
