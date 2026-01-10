'use client'

import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

interface TrueFalseBlockProps {
  questionId: string
  selectedOption: boolean | null
  onSelect: (value: boolean) => void
  disabled?: boolean
}

export function TrueFalseBlock({
  questionId,
  selectedOption,
  onSelect,
  disabled = false
}: TrueFalseBlockProps) {
  return (
    <div className="flex gap-4">
      <label className="flex-1 relative cursor-pointer group">
        <input
          type="radio"
          name={questionId}
          value="true"
          checked={selectedOption === true}
          onChange={() => !disabled && onSelect(true)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className={cn(
          "p-4 text-center border rounded-lg transition-all",
          selectedOption === true
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
          disabled && "cursor-not-allowed opacity-60"
        )}>
          <span className="text-lg font-semibold block">Verdadero</span>
        </div>
        {selectedOption === true && (
          <div className="absolute top-4 right-4 text-primary">
            <CheckCircle className="h-5 w-5 fill-current" />
          </div>
        )}
      </label>
      <label className="flex-1 relative cursor-pointer group">
        <input
          type="radio"
          name={questionId}
          value="false"
          checked={selectedOption === false}
          onChange={() => !disabled && onSelect(false)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className={cn(
          "p-4 text-center border rounded-lg transition-all",
          selectedOption === false
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
          disabled && "cursor-not-allowed opacity-60"
        )}>
          <span className="text-lg font-semibold block">Falso</span>
        </div>
        {selectedOption === false && (
          <div className="absolute top-4 right-4 text-primary">
            <CheckCircle className="h-5 w-5 fill-current" />
          </div>
        )}
      </label>
    </div>
  )
}
