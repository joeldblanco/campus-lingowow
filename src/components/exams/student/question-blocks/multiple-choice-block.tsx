'use client'

import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

interface MultipleChoiceItem {
  id: string
  question: string
  options: string[]
}

interface MultipleChoiceBlockProps {
  questionId: string
  options: string[]
  items?: MultipleChoiceItem[]
  selectedOption: string | Record<string, string> | null
  onSelect: (option: string | Record<string, string>) => void
  disabled?: boolean
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export function MultipleChoiceBlock({
  questionId,
  options,
  items,
  selectedOption,
  onSelect,
  disabled = false
}: MultipleChoiceBlockProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Multi-step render
  if (items && items.length > 0) {
    const currentItem = items[currentStep]
    const currentAnswers = (selectedOption as Record<string, string>) || {}
    const currentAnswer = currentAnswers[currentItem.id]

    const handleSelect = (option: string) => {
      onSelect({
        ...currentAnswers,
        [currentItem.id]: option
      })
    }

    const isLastStep = currentStep === items.length - 1
    const isFirstStep = currentStep === 0

    return (
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Pregunta {currentStep + 1} de {items.length}</span>
          <div className="flex gap-1">
            {items.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 w-8 rounded-full transition-colors",
                  idx === currentStep ? "bg-primary" :
                    idx < currentStep ? "bg-primary/40" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-medium">{currentItem.question}</h4>

          <div className="space-y-3">
            {currentItem.options.map((option, index) => {
              const isSelected = currentAnswer === option
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
                    name={`${questionId}-${currentItem.id}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => !disabled && handleSelect(option)}
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
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={isFirstStep}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <Button
            onClick={() => setCurrentStep(prev => Math.min(items.length - 1, prev + 1))}
            disabled={isLastStep} // Finish is handled by exam navigation
            variant={isLastStep ? "ghost" : "secondary"}
            size="sm"
            className={isLastStep ? "invisible" : ""}
          >
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Single-step render (original)
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
