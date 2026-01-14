'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Block, isInteractiveBlock } from '@/types/course-builder'
import { ContentBuilderMode, BlockValidationError } from './types'
import { BlockItem } from './block-item'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { BlockContentEditor } from '@/components/admin/course-builder/lesson-builder/block-editor'

interface BlockCanvasProps {
  blocks: Block[]
  title: string
  description: string
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onUpdateTitle: (title: string) => void
  onUpdateDescription: (description: string) => void
  onUpdateBlock?: (blockId: string, updates: Partial<Block>) => void
  onRemoveBlock?: (blockId: string) => void
  onAddBlockClick?: () => void
  readOnly?: boolean
  mode: ContentBuilderMode
  validationErrors?: BlockValidationError[]
}

export function BlockCanvas({
  blocks,
  title,
  description,
  selectedBlockId,
  onSelectBlock,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateBlock,
  onRemoveBlock,
  onAddBlockClick,
  readOnly = false,
  mode,
  validationErrors = [],
}: BlockCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
    disabled: readOnly,
  })

  const totalPoints = blocks.reduce((sum, b) => {
    if (mode === 'exam' && isInteractiveBlock(b.type)) {
      return sum + (b.points || 0)
    }
    return sum
  }, 0)

  return (
    <div
      className="flex-1 bg-muted/10 relative overflow-y-auto h-full"
      onClick={() => !readOnly && onSelectBlock(null)}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div
        ref={setNodeRef}
        className={cn(
          'relative z-10 max-w-4xl mx-auto py-10 px-6 min-h-full flex flex-col transition-colors',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/5 rounded-xl'
        )}
      >
        {/* Header */}
        <div className="mb-8 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge
                variant="secondary"
                className={cn(
                  'mb-2',
                  mode === 'exam'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-blue-100 text-primary'
                )}
              >
                {mode === 'exam' ? 'MODO BORRADOR' : 'Borrador'}
              </Badge>

              {readOnly ? (
                <>
                  <h1 className="text-4xl font-bold tracking-tight mb-2">{title || 'Sin título'}</h1>
                  <p className="text-muted-foreground text-lg">{description || 'Sin descripción'}</p>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => onUpdateTitle(e.target.value)}
                    placeholder={mode === 'exam' ? 'Título del Examen' : 'Título de la Lección'}
                    className="text-4xl font-bold w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 tracking-tight"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => onUpdateDescription(e.target.value)}
                    placeholder={mode === 'exam' ? 'Descripción del examen...' : 'Descripción de la lección...'}
                    className="w-full mt-2 bg-transparent border-none outline-none focus:ring-0 text-muted-foreground text-lg resize-none placeholder:text-muted-foreground/50"
                    rows={2}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Blocks List */}
        <div className="space-y-6 pb-20">
          {blocks.length === 0 ? (
            readOnly ? (
              <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center shadow-sm">
                  <span className="text-2xl text-muted-foreground">?</span>
                </div>
                <p className="font-medium text-muted-foreground">
                  {mode === 'exam' ? 'No hay preguntas en este examen' : 'No hay contenidos en esta lección'}
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 flex flex-col items-center justify-center gap-4 text-center transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onAddBlockClick) onAddBlockClick()
                }}
              >
                <div className="size-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                  <span className="text-2xl text-primary">+</span>
                </div>
                <div>
                  <p className="font-medium">Arrastra bloques aquí</p>
                  <p className="text-sm text-muted-foreground">o haz clic para explorar la biblioteca</p>
                </div>
              </div>
            )
          ) : (
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className={cn('space-y-6', readOnly && 'space-y-0')}>
                {blocks.map((block, index) => {
                  const blockErrors = validationErrors.filter((e) => e.blockId === block.id)
                  const isSelected = selectedBlockId === block.id

                  if (readOnly) {
                    return (
                      <div key={block.id}>
                        <BlockPreview block={block} />
                      </div>
                    )
                  }

                  return (
                    <BlockItem
                      key={block.id}
                      block={block}
                      index={index}
                      isSelected={isSelected}
                      onSelect={() => onSelectBlock(block.id)}
                      readOnly={readOnly}
                      mode={mode}
                      errors={blockErrors}
                    >
                      {isSelected && onUpdateBlock && (block.type === 'structured-content' || block.type === 'grammar-visualizer') ? (
                        <BlockContentEditor
                          block={block}
                          onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                          onRemove={onRemoveBlock ? () => onRemoveBlock(block.id) : undefined}
                        />
                      ) : (
                        <BlockPreview block={block} />
                      )}
                    </BlockItem>
                  )
                })}
              </div>
            </SortableContext>
          )}
        </div>

        {/* Summary */}
        {blocks.length > 0 && (
          <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
            {blocks.length} {mode === 'exam' ? 'pregunta' : 'bloque'}{blocks.length !== 1 ? 's' : ''}
            {mode === 'exam' && ` · ${totalPoints} puntos totales`}
          </div>
        )}
      </div>
    </div>
  )
}
