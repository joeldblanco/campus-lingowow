'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { CreateExamQuestionData } from '@/types/exam'
import { cn } from '@/lib/utils'

interface TrueFalseWidgetProps {
  question: CreateExamQuestionData
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
}

export function TrueFalseWidget({ question, onUpdate }: TrueFalseWidgetProps) {
  const correctAnswer = question.correctAnswer as string

  const setCorrectAnswer = (value: 'Verdadero' | 'Falso') => {
    onUpdate({ correctAnswer: value, options: ['Verdadero', 'Falso'] })
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Respuesta correcta</label>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={correctAnswer === 'Verdadero' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setCorrectAnswer('Verdadero')}
          className={cn(
            'h-20 text-lg',
            correctAnswer === 'Verdadero' && 'bg-green-600 hover:bg-green-700'
          )}
        >
          {correctAnswer === 'Verdadero' && <Check className="h-5 w-5 mr-2" />}
          Verdadero
        </Button>

        <Button
          type="button"
          variant={correctAnswer === 'Falso' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setCorrectAnswer('Falso')}
          className={cn(
            'h-20 text-lg',
            correctAnswer === 'Falso' && 'bg-green-600 hover:bg-green-700'
          )}
        >
          {correctAnswer === 'Falso' && <Check className="h-5 w-5 mr-2" />}
          Falso
        </Button>
      </div>
    </div>
  )
}
