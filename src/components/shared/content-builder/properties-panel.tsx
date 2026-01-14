'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { X, Trash2 } from 'lucide-react'
import { Block, isInteractiveBlock } from '@/types/course-builder'
import { ContentBuilderMode } from './types'

interface BlockPropertiesPanelProps {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
  onClose: () => void
  mode: ContentBuilderMode
  children?: React.ReactNode // For custom block-specific editors
}

export function BlockPropertiesPanel({
  block,
  onUpdate,
  onRemove,
  onClose,
  mode,
  children,
}: BlockPropertiesPanelProps) {
  const showExamFields = mode === 'exam' && isInteractiveBlock(block.type)

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Propiedades</h2>
          <p className="text-xs text-muted-foreground capitalize">{block.type.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Block-specific content (passed as children) */}
          {children}

          {/* Exam-specific fields */}
          {showExamFields && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Configuración de Examen
                </h3>

                {/* Points */}
                <div className="space-y-2">
                  <Label>Puntos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={block.points || 0}
                    onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* Required */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requerida</Label>
                    <p className="text-xs text-muted-foreground">El estudiante debe responder</p>
                  </div>
                  <Switch
                    checked={block.required !== false}
                    onCheckedChange={(checked) => onUpdate({ required: checked })}
                  />
                </div>

                {/* Partial Credit */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Crédito Parcial</Label>
                    <p className="text-xs text-muted-foreground">Permitir puntuación parcial</p>
                  </div>
                  <Switch
                    checked={block.partialCredit || false}
                    onCheckedChange={(checked) => onUpdate({ partialCredit: checked })}
                  />
                </div>

                {/* Hint */}
                <div className="space-y-2">
                  <Label>Pista (opcional)</Label>
                  <Textarea
                    value={block.hint || ''}
                    onChange={(e) => onUpdate({ hint: e.target.value })}
                    placeholder="Pista para ayudar al estudiante..."
                    rows={2}
                  />
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label>Explicación (se muestra después)</Label>
                  <Textarea
                    value={block.explanation || ''}
                    onChange={(e) => onUpdate({ explanation: e.target.value })}
                    placeholder="Explicación de la respuesta correcta..."
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
