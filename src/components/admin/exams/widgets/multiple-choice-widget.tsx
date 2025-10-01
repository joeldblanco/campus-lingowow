'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Check } from 'lucide-react'
import { CreateExamQuestionData } from '@/types/exam'
import { cn } from '@/lib/utils'

interface MultipleChoiceWidgetProps {
  question: CreateExamQuestionData
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
}

export function MultipleChoiceWidget({ question, onUpdate }: MultipleChoiceWidgetProps) {
  const options = question.options || []
  const correctAnswer = question.correctAnswer as string

  const addOption = () => {
    const newOptions = [...options, `Opción ${String.fromCharCode(65 + options.length)}`]
    onUpdate({ options: newOptions })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    onUpdate({ options: newOptions })

    // Update correct answer if it was the modified option
    if (correctAnswer === options[index]) {
      onUpdate({ correctAnswer: value })
    }
  }

  const deleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    onUpdate({ options: newOptions })

    // Reset correct answer if deleted option was correct
    if (correctAnswer === options[index]) {
      onUpdate({ correctAnswer: newOptions[0] || '' })
    }
  }

  const setCorrectAnswer = (option: string) => {
    onUpdate({ correctAnswer: option })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Opciones de respuesta</label>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar opción
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Option Letter */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
              {String.fromCharCode(65 + index)}
            </div>

            {/* Option Input */}
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Opción ${String.fromCharCode(65 + index)}`}
              className="flex-1"
            />

            {/* Correct Answer Radio */}
            <Button
              type="button"
              variant={correctAnswer === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCorrectAnswer(option)}
              className={cn(
                'w-24',
                correctAnswer === option && 'bg-green-600 hover:bg-green-700'
              )}
            >
              {correctAnswer === option && <Check className="h-4 w-4 mr-1" />}
              {correctAnswer === option ? 'Correcta' : 'Marcar'}
            </Button>

            {/* Delete Button */}
            {options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteOption(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Se requieren al menos 2 opciones para una pregunta de opción múltiple.
        </p>
      )}
    </div>
  )
}
