'use client'

import { CalloutBlock } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalloutBlockEditorProps {
  block: CalloutBlock
  onUpdate: (updates: Partial<CalloutBlock>) => void
  isActive: boolean
}

const VARIANT_CONFIG = {
  info: {
    label: 'Informacion',
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
  success: {
    label: 'Exito',
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
  },
}

export function CalloutBlockEditor({ block, onUpdate }: CalloutBlockEditorProps) {
  const config = VARIANT_CONFIG[block.variant]
  const IconComponent = config.icon

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Titulo (opcional)</Label>
          <Input
            value={block.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titulo de la nota..."
          />
        </div>
        <div className="space-y-2">
          <Label>Estilo</Label>
          <Select
            value={block.variant}
            onValueChange={(value: CalloutBlock['variant']) => onUpdate({ variant: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VARIANT_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <cfg.icon className={cn("h-4 w-4", cfg.iconColor)} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Contenido</Label>
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Contenido de la nota..."
          rows={3}
        />
      </div>

      <div className={cn(
        "p-4 rounded-lg border",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start gap-3">
          <IconComponent className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconColor)} />
          <div className="flex-1">
            {block.title && (
              <h4 className="font-semibold text-sm mb-1">{block.title}</h4>
            )}
            <p className="text-sm">{block.content || 'Contenido de la nota...'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
