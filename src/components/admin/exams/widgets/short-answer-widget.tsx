'use client'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CreateExamQuestionData } from '@/types/exam'

interface ShortAnswerWidgetProps {
  question: CreateExamQuestionData
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
}

export function ShortAnswerWidget({ question, onUpdate }: ShortAnswerWidgetProps) {
  const correctAnswer = question.correctAnswer as string

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Respuesta correcta</label>
        <Input
          value={correctAnswer}
          onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
          placeholder="Escribe la respuesta correcta..."
          className="text-base"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Esta será la respuesta que se comparará con la respuesta del estudiante
        </p>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="case-sensitive">Sensible a mayúsculas/minúsculas</Label>
          <p className="text-xs text-muted-foreground">
            La respuesta debe coincidir exactamente con mayúsculas y minúsculas
          </p>
        </div>
        <Switch
          id="case-sensitive"
          checked={question.caseSensitive}
          onCheckedChange={(checked) => onUpdate({ caseSensitive: checked })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Longitud mínima (opcional)
          </label>
          <Input
            type="number"
            min="1"
            value={question.minLength || ''}
            onChange={(e) => onUpdate({ minLength: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 3"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Longitud máxima (opcional)
          </label>
          <Input
            type="number"
            min="1"
            value={question.maxLength || ''}
            onChange={(e) => onUpdate({ maxLength: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 50"
          />
        </div>
      </div>
    </div>
  )
}
