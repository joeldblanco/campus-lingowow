'use client'

import { useState } from 'react'
import { KeyRuleBlock } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, Lightbulb, AlertTriangle, Sparkles, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeyRuleBlockEditorProps {
  block: KeyRuleBlock
  onUpdate: (updates: Partial<KeyRuleBlock>) => void
  isActive: boolean
}

const VARIANT_CONFIG = {
  info: {
    label: 'Información',
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
  },
  warning: {
    label: 'Advertencia',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
  },
  tip: {
    label: 'Consejo',
    icon: Sparkles,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
  },
  important: {
    label: 'Importante',
    icon: Lightbulb,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
  },
}

export function KeyRuleBlockEditor({ block, onUpdate }: KeyRuleBlockEditorProps) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    if (newItem.trim()) {
      onUpdate({ items: [...block.items, newItem.trim()] })
      setNewItem('')
    }
  }

  const removeItem = (index: number) => {
    onUpdate({ items: block.items.filter((_, i) => i !== index) })
  }

  const updateItem = (index: number, value: string) => {
    const newItems = [...block.items]
    newItems[index] = value
    onUpdate({ items: newItems })
  }

  const config = VARIANT_CONFIG[block.variant]
  const IconComponent = config.icon

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título de la Regla</Label>
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ej: Key Rule: WEIRDO"
          />
        </div>
        <div className="space-y-2">
          <Label>Estilo</Label>
          <Select
            value={block.variant}
            onValueChange={(value: KeyRuleBlock['variant']) => onUpdate({ variant: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VARIANT_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <cfg.icon className="h-4 w-4" />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          value={block.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Descripción o explicación de la regla..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Puntos Clave (opcional)</Label>
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`Punto ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Añadir nuevo punto..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            />
            <Button variant="outline" size="icon" onClick={addItem} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={cn(
        "p-4 rounded-lg border-l-4",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start gap-3">
          <IconComponent className={cn("h-5 w-5 mt-0.5", config.iconColor)} />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{block.title || 'Título de la regla'}</h4>
            {block.description && (
              <p className="text-sm text-muted-foreground mt-1">{block.description}</p>
            )}
            {block.items.length > 0 && (
              <ul className="mt-2 space-y-1">
                {block.items.map((item, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
