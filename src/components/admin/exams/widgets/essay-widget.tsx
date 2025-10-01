'use client'

import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CreateExamQuestionData } from '@/types/exam'
import { Info } from 'lucide-react'

interface EssayWidgetProps {
  question: CreateExamQuestionData
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
}

export function EssayWidget({ question, onUpdate }: EssayWidgetProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">Pregunta de ensayo</p>
          <p className="text-xs mt-1">
            Las respuestas de ensayo requieren calificación manual. Los estudiantes escribirán
            respuestas largas que deberás revisar y calificar individualmente.
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Guía de respuesta (para el evaluador)
        </label>
        <Textarea
          value={(question.correctAnswer as string) || ''}
          onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
          placeholder="Escribe los puntos clave que debe incluir una buena respuesta..."
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Esta guía solo será visible para los profesores al calificar
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Palabras mínimas (opcional)
          </label>
          <Input
            type="number"
            min="1"
            value={question.minLength || ''}
            onChange={(e) => onUpdate({ minLength: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 100"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Palabras máximas (opcional)
          </label>
          <Input
            type="number"
            min="1"
            value={question.maxLength || ''}
            onChange={(e) => onUpdate({ maxLength: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="partial-credit">Permitir calificación parcial</Label>
          <p className="text-xs text-muted-foreground">
            El evaluador podrá asignar puntos parciales en lugar de todo o nada
          </p>
        </div>
        <Switch
          id="partial-credit"
          checked={question.partialCredit}
          onCheckedChange={(checked) => onUpdate({ partialCredit: checked })}
        />
      </div>
    </div>
  )
}
