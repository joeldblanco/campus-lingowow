'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArticleBlockType } from '@/lib/types/article-blocks'

interface SortableBlockProps {
  id: string
  children: React.ReactNode
  isActive: boolean
  onActivate: () => void
  onDelete: () => void
  onDuplicate: () => void
  blockType: ArticleBlockType
  blockIcon: React.ReactNode
}

const BLOCK_TYPE_LABELS: Record<ArticleBlockType, string> = {
  'text': 'TEXTO',
  'heading': 'ENCABEZADO',
  'key-rule': 'REGLA CLAVE',
  'grammar-table': 'TABLA GRAMATICAL',
  'examples-in-context': 'EJEMPLOS',
  'video': 'VIDEO',
  'image': 'IMAGEN',
  'callout': 'NOTA',
  'divider': 'SEPARADOR',
}

export function SortableBlock({
  id,
  children,
  isActive,
  onActivate,
  onDelete,
  onDuplicate,
  blockType,
  blockIcon,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg",
        isActive && "ring-2 ring-primary border-primary"
      )}
      onClick={onActivate}
    >
      <div className="flex items-start">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex flex-col items-center gap-1 p-2 cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isActive && "opacity-100"
          )}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
              blockType === 'key-rule' && "bg-blue-100 text-blue-700",
              blockType === 'grammar-table' && "bg-purple-100 text-purple-700",
              blockType === 'examples-in-context' && "bg-green-100 text-green-700",
              blockType === 'video' && "bg-red-100 text-red-700",
              blockType === 'image' && "bg-orange-100 text-orange-700",
              blockType === 'callout' && "bg-amber-100 text-amber-700",
              blockType === 'text' && "bg-gray-100 text-gray-700",
              blockType === 'heading' && "bg-indigo-100 text-indigo-700",
              blockType === 'divider' && "bg-slate-100 text-slate-700",
            )}>
              {blockIcon}
              {BLOCK_TYPE_LABELS[blockType]}
            </span>
          </div>
          {children}
        </div>

        <div className={cn(
          "flex items-center gap-1 p-2",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isActive && "opacity-100"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            title="Duplicar bloque"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Eliminar bloque"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
