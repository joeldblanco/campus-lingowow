'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Block, isInteractiveBlock } from '@/types/course-builder'
import { ContentBuilderMode, BlockValidationError } from './types'

interface BlockItemProps {
  block: Block
  index: number
  isSelected: boolean
  onSelect: (event?: React.MouseEvent) => void
  readOnly?: boolean
  mode: ContentBuilderMode
  errors?: BlockValidationError[]
  children: React.ReactNode
}

export function BlockItem({
  block,
  index,
  isSelected,
  onSelect,
  readOnly = false,
  mode,
  errors = [],
  children,
}: BlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasErrors = errors.length > 0
  const showPoints = mode === 'exam' && isInteractiveBlock(block.type) && block.points !== undefined

  if (readOnly) {
    return <div>{children}</div>
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-index={index}
      className={cn(
        'group relative bg-card rounded-xl border-2 transition-all',
        isSelected
          ? 'border-primary shadow-[0_0_0_4px_rgba(19,127,236,0.1)]'
          : 'border-transparent hover:border-primary/50 shadow-sm hover:shadow-md',
        isDragging && 'z-50 shadow-xl opacity-50',
        hasErrors && !isSelected && 'border-red-500 ring-2 ring-red-200'
      )}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect(e)
      }}
    >
      {/* Header with drag handle and badges */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b bg-muted/30 rounded-t-xl',
          hasErrors && 'bg-red-50'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Block number (for exams) */}
          {mode === 'exam' && (
            <span className="font-semibold text-primary text-sm">#{index + 1}</span>
          )}

          {/* Editing badge */}
          {isSelected && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              EDITANDO
            </Badge>
          )}
        </div>

        {/* Points badge (for exams) */}
        {showPoints && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {block.points} pts
          </Badge>
        )}
      </div>

      {/* Block Content */}
      <div className="p-4">
        {children}

        {/* Validation Errors */}
        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            {errors.map((error, i) => (
              <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error.message}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
