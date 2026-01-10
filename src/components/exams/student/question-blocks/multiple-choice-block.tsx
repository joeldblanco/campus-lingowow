'use client'

import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

interface MultipleChoiceBlockProps {
  questionId: string
  options: string[]
  selectedOption: string | null
  onSelect: (option: string) => void
  disabled?: boolean
}

export function MultipleChoiceBlock({
  questionId,
  options,
  selectedOption,
  onSelect,
  disabled = false
}: MultipleChoiceBlockProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedOption === option
        return (
          <label
            key={index}
            className={cn(
              "flex items-center p-4 border rounded-lg cursor-pointer transition-colors group/option",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name={questionId}
              value={option}
              checked={isSelected}
              onChange={() => !disabled && onSelect(option)}
              disabled={disabled}
              className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
            />
            <span className={cn(
              "ml-3 text-base",
              isSelected 
                ? "text-foreground font-medium" 
                : "text-gray-700 dark:text-gray-200 group-hover/option:text-foreground"
            )}>
              {option}
            </span>
            {isSelected && (
              <CheckCircle className="ml-auto h-5 w-5 text-primary" />
            )}
          </label>
        )
      })}
    </div>
  )
}
