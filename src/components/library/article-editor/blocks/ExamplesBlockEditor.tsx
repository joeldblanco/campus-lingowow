'use client'

import { ExamplesInContextBlock, ExampleItem } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamplesBlockEditorProps {
  block: ExamplesInContextBlock
  onUpdate: (updates: Partial<ExamplesInContextBlock>) => void
  isActive: boolean
}

const EXAMPLE_TYPE_CONFIG = {
  correct: {
    label: 'Correcto',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  incorrect: {
    label: 'Incorrecto',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  neutral: {
    label: 'Neutral',
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
}

export function ExamplesBlockEditor({ block, onUpdate }: ExamplesBlockEditorProps) {
  const addExample = () => {
    const newExample: ExampleItem = {
      id: `example-${Date.now()}`,
      sentence: '',
      explanation: '',
      type: 'correct',
    }
    onUpdate({ examples: [...block.examples, newExample] })
  }

  const removeExample = (id: string) => {
    onUpdate({ examples: block.examples.filter(e => e.id !== id) })
  }

  const updateExample = (id: string, updates: Partial<ExampleItem>) => {
    onUpdate({
      examples: block.examples.map(e => 
        e.id === id ? { ...e, ...updates } : e
      )
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Titulo de la Seccion</Label>
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ej: Ejemplos en Contexto"
          />
        </div>
        <div className="space-y-2">
          <Label>Descripcion (opcional)</Label>
          <Input
            value={block.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Breve introduccion..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Ejemplos</Label>
        {block.examples.map((example, index) => {
          const config = EXAMPLE_TYPE_CONFIG[example.type]
          const IconComponent = config.icon

          return (
            <div 
              key={example.id} 
              className={cn(
                "p-4 rounded-lg border space-y-3",
                config.bgColor
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconComponent className={cn("h-5 w-5", config.color)} />
                  <span className="text-sm font-medium">Ejemplo {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={example.type}
                    onValueChange={(value: ExampleItem['type']) => 
                      updateExample(example.id, { type: value })
                    }
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXAMPLE_TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeExample(example.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  value={example.sentence}
                  onChange={(e) => updateExample(example.id, { sentence: e.target.value })}
                  placeholder="Oracion de ejemplo..."
                  className="font-medium"
                />
                <Input
                  value={example.explanation}
                  onChange={(e) => updateExample(example.id, { explanation: e.target.value })}
                  placeholder="Explicacion (ej: Indicative - Fact)"
                  className="text-sm"
                />
              </div>
            </div>
          )
        })}

        <Button variant="outline" onClick={addExample} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Anadir Ejemplo
        </Button>
      </div>
    </div>
  )
}
