'use client'

import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CreateExamQuestionData } from '@/types/exam'
import { Info, Sparkles } from 'lucide-react'

interface EssayWidgetProps {
  question: CreateExamQuestionData
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
}

export function EssayWidget({ question, onUpdate }: EssayWidgetProps) {
  const handleAiGradingToggle = (enabled: boolean) => {
    onUpdate({
      aiGrading: enabled,
      aiGradingConfig: enabled
        ? question.aiGradingConfig || { language: 'spanish', targetLevel: 'B1' }
        : undefined,
    })
  }

  const handleConfigChange = (key: string, value: string) => {
    onUpdate({
      aiGradingConfig: {
        ...question.aiGradingConfig,
        [key]: value,
      } as CreateExamQuestionData['aiGradingConfig'],
    })
  }

  return (
    <div className="space-y-4">
      {/* AI Grading Toggle - Prominent Position */}
      <div className="flex items-center justify-between p-4 border-2 border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <Label className="text-base font-semibold text-violet-900 dark:text-violet-300">
              Corrección con IA
            </Label>
            <p className="text-xs text-violet-700 dark:text-violet-400">
              Habilitar corrección automática usando Gemini AI
            </p>
          </div>
        </div>
        <Switch
          checked={question.aiGrading || false}
          onCheckedChange={handleAiGradingToggle}
        />
      </div>

      {/* AI Grading Configuration */}
      {question.aiGrading && (
        <div className="space-y-4 p-4 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idioma del Ensayo</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={question.aiGradingConfig?.language || 'spanish'}
                onChange={(e) => handleConfigChange('language', e.target.value)}
              >
                <option value="spanish">Español</option>
                <option value="english">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nivel Objetivo</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={question.aiGradingConfig?.targetLevel || 'B1'}
                onChange={(e) => handleConfigChange('targetLevel', e.target.value)}
              >
                <option value="A1">A1 - Principiante</option>
                <option value="A2">A2 - Elemental</option>
                <option value="B1">B1 - Intermedio</option>
                <option value="B2">B2 - Intermedio Alto</option>
                <option value="C1">C1 - Avanzado</option>
                <option value="C2">C2 - Maestría</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            La IA evaluará gramática, vocabulario, coherencia y cumplimiento de la tarea según el nivel seleccionado.
          </p>
        </div>
      )}

      {/* Manual Grading Info - Only show if AI grading is disabled */}
      {!question.aiGrading && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Calificación manual</p>
            <p className="text-xs mt-1">
              Las respuestas de ensayo requerirán calificación manual. Los estudiantes escribirán
              respuestas largas que deberás revisar y calificar individualmente.
            </p>
          </div>
        </div>
      )}

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
