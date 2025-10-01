'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Trash2, Copy, Volume2 } from 'lucide-react'
import { CreateExamQuestionData } from '@/types/exam'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AudioUploadWidget } from './audio-upload-widget'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface QuestionWidgetBaseProps {
  question: CreateExamQuestionData
  index: number
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
  onDelete: () => void
  onDuplicate: () => void
  children: React.ReactNode
  dragHandleProps?: Record<string, unknown>
}

export function QuestionWidgetBase({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  children,
  dragHandleProps,
}: QuestionWidgetBaseProps) {
  const [showAudioConfig, setShowAudioConfig] = useState(!!question.audioUrl)

  const handleAudioChange = (config: {
    audioUrl?: string
    audioPosition?: 'BEFORE_QUESTION' | 'AFTER_QUESTION' | 'BEFORE_OPTIONS' | 'SECTION_TOP'
    maxAudioPlays?: number
    audioAutoplay?: boolean
    audioPausable?: boolean
  }) => {
    onUpdate(config)
    setShowAudioConfig(!!config.audioUrl)
  }

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div 
            className="cursor-grab active:cursor-grabbing mt-2 opacity-50 hover:opacity-100"
            {...dragHandleProps}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Question Number & Type */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Pregunta {index + 1}</Badge>
                <Badge variant="secondary">{getQuestionTypeLabel(question.type)}</Badge>
                <Badge variant={getDifficultyColor(question.difficulty)}>
                  {getDifficultyLabel(question.difficulty)}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicate}
                  title="Duplicar pregunta"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  title="Eliminar pregunta"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Question Text */}
            <Textarea
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              placeholder="Escribe tu pregunta aquí..."
              className="min-h-[80px] text-base font-medium"
            />

            {/* Question Settings */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Puntos</label>
                <Input
                  type="number"
                  min="1"
                  value={question.points}
                  onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 1 })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Dificultad</label>
                <Select
                  value={question.difficulty}
                  onValueChange={(value) =>
                    onUpdate({ difficulty: value as CreateExamQuestionData['difficulty'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Fácil</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HARD">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                <Select
                  value={question.type}
                  onValueChange={(value) =>
                    onUpdate({ type: value as CreateExamQuestionData['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MULTIPLE_CHOICE">Opción múltiple</SelectItem>
                    <SelectItem value="TRUE_FALSE">Verdadero/Falso</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Respuesta corta</SelectItem>
                    <SelectItem value="ESSAY">Ensayo</SelectItem>
                    <SelectItem value="FILL_BLANK">Llenar espacios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Question Type Specific Content */}
        {children}

        {/* Audio Configuration */}
        <div className="mt-4">
          <Collapsible open={showAudioConfig} onOpenChange={setShowAudioConfig}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {showAudioConfig ? 'Configurar Audio' : 'Agregar Audio (Listening)'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <AudioUploadWidget
                audioUrl={question.audioUrl}
                audioPosition={question.audioPosition}
                maxAudioPlays={question.maxAudioPlays}
                audioAutoplay={question.audioAutoplay}
                audioPausable={question.audioPausable}
                onAudioChange={handleAudioChange}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Explanation (Optional) */}
        <div className="mt-4">
          <label className="text-sm text-muted-foreground mb-1 block">
            Explicación (opcional)
          </label>
          <Textarea
            value={question.explanation || ''}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
            placeholder="Agrega una explicación que se mostrará después de responder..."
            className="min-h-[60px]"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function getQuestionTypeLabel(type: CreateExamQuestionData['type']): string {
  const labels: Record<CreateExamQuestionData['type'], string> = {
    MULTIPLE_CHOICE: 'Opción múltiple',
    TRUE_FALSE: 'Verdadero/Falso',
    SHORT_ANSWER: 'Respuesta corta',
    ESSAY: 'Ensayo',
    FILL_BLANK: 'Llenar espacios',
    MATCHING: 'Emparejar',
    ORDERING: 'Ordenar',
    DRAG_DROP: 'Arrastrar y soltar',
  }
  return labels[type]
}

function getDifficultyLabel(difficulty: CreateExamQuestionData['difficulty']): string {
  const labels: Record<CreateExamQuestionData['difficulty'], string> = {
    EASY: 'Fácil',
    MEDIUM: 'Media',
    HARD: 'Difícil',
  }
  return labels[difficulty]
}

function getDifficultyColor(
  difficulty: CreateExamQuestionData['difficulty']
): 'default' | 'secondary' | 'destructive' {
  const colors: Record<CreateExamQuestionData['difficulty'], 'default' | 'secondary' | 'destructive'> = {
    EASY: 'default',
    MEDIUM: 'secondary',
    HARD: 'destructive',
  }
  return colors[difficulty]
}
