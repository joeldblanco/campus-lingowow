'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckoutProgressProps {
  currentStep: number
  steps: string[]
}

export function CheckoutProgress({ currentStep, steps }: CheckoutProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex items-center justify-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
              </div>

              {/* Step label */}
              <div className="ml-3 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-primary',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step}
                </p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-all duration-200',
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress percentage */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progreso del checkout</span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  )
}
