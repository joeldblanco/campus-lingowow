'use client'

import { Card } from '@/components/ui/card'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import {
  BlockTemplate,
  BLOCK_TEMPLATES,
  isExamAllowedBlock,
  BlockType,
} from '@/types/course-builder'
import { ContentBuilderMode } from './types'

interface BlockLibraryProps {
  mode: ContentBuilderMode
  excludedTypes?: BlockType[]
}

export function BlockLibrary({ mode, excludedTypes = [] }: BlockLibraryProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'cancel-zone',
    data: {
      accepts: ['sortable-block'],
    },
  })

  // Filter templates based on mode
  const filteredTemplates = BLOCK_TEMPLATES.filter((template) => {
    // Check if explicitly excluded
    if (excludedTypes.includes(template.type)) return false
    
    // In exam mode, exclude lesson-only blocks
    if (mode === 'exam' && !isExamAllowedBlock(template.type)) return false
    
    return true
  })

  // Categorize blocks
  const contentBlocks = filteredTemplates.filter((t) =>
    ['title', 'text', 'image', 'video', 'audio', 'embed', 'file', 'structured-content'].includes(t.type)
  )
  
  const interactiveBlocks = filteredTemplates.filter((t) =>
    ['quiz', 'multiple_choice', 'multi_select', 'true_false', 'short_answer', 'fill_blanks', 'match', 'ordering', 'drag_drop', 'essay', 'recording'].includes(t.type)
  )
  
  const educationalBlocks = filteredTemplates.filter((t) =>
    ['grammar', 'vocabulary', 'grammar-visualizer', 'teacher_notes'].includes(t.type)
  )

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-64 border-r bg-background flex flex-col shrink-0 z-10 h-full transition-colors relative',
        isOver && 'bg-destructive/10 border-destructive'
      )}
    >
      {isOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-[1px] text-destructive animate-in fade-in duration-200">
          <Trash2 className="w-12 h-12 mb-2" />
          <span className="font-bold text-lg">Soltar para eliminar</span>
        </div>
      )}

      <div className="p-4 border-b">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Biblioteca de Bloques
        </h2>
        <p className="text-xs text-muted-foreground">
          Arrastra bloques al canvas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Content Blocks */}
        {contentBlocks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              Contenido
            </h3>
            <div className="flex flex-col gap-2">
              {contentBlocks.map((template) => (
                <DraggableBlock key={template.type} template={template} />
              ))}
            </div>
          </div>
        )}

        {/* Interactive Blocks */}
        {interactiveBlocks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              Interactivo
            </h3>
            <div className="flex flex-col gap-2">
              {interactiveBlocks.map((template) => (
                <DraggableBlock key={template.type} template={template} />
              ))}
            </div>
          </div>
        )}

        {/* Educational Blocks (only in lesson mode) */}
        {mode === 'lesson' && educationalBlocks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              Educativo
            </h3>
            <div className="flex flex-col gap-2">
              {educationalBlocks.map((template) => (
                <DraggableBlock key={template.type} template={template} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DraggableBlockProps {
  template: BlockTemplate
  variant?: 'list' | 'grid'
  onClick?: () => void
  disableDrag?: boolean
}

export function DraggableBlock({
  template,
  variant = 'list',
  onClick,
  disableDrag,
}: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${template.type}`,
    data: {
      type: 'new-block',
      template,
    },
    disabled: disableDrag,
  })

  const IconComponent = template.icon

  if (variant === 'grid') {
    return (
      <Card
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={cn(
          'p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-primary hover:shadow-md transition-all active:cursor-grabbing',
          isDragging && 'opacity-50',
          disableDrag && 'cursor-pointer active:cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className="text-muted-foreground group-hover:text-primary">
          <IconComponent className="size-6" />
        </div>
        <span className="text-xs font-medium text-center">{template.label}</span>
      </Card>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50',
        disableDrag && 'cursor-pointer active:cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="text-muted-foreground">
        <IconComponent className="size-5" />
      </div>
      <span className="text-sm font-medium">{template.label}</span>
    </div>
  )
}

// Grid selection for modal
interface BlockSelectionGridProps {
  mode: ContentBuilderMode
  onSelect: (template: BlockTemplate) => void
  excludedTypes?: BlockType[]
}

export function BlockSelectionGrid({ mode, onSelect, excludedTypes = [] }: BlockSelectionGridProps) {
  const filteredTemplates = BLOCK_TEMPLATES.filter((template) => {
    if (excludedTypes.includes(template.type)) return false
    if (mode === 'exam' && !isExamAllowedBlock(template.type)) return false
    return true
  })

  return (
    <div className="grid grid-cols-3 gap-3">
      {filteredTemplates.map((template) => (
        <DraggableBlock
          key={template.type}
          template={template}
          variant="grid"
          onClick={() => onSelect(template)}
          disableDrag
        />
      ))}
    </div>
  )
}
