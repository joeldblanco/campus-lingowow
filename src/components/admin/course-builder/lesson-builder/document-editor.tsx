'use client'

import { useState } from 'react'
import { Block, BLOCK_TEMPLATES } from '@/types/course-builder'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Video,
  Image as ImageIcon,
  Music,
  HelpCircle,
  FileText,
  Paperclip,
  Link as LinkIcon,
  GripVertical,
  Trash2,
  Plus,
  Edit3,
} from 'lucide-react'
import { BlockEditor } from './block-editor'
import { BlockPreview as BlockPreviewComponent } from './block-preview'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DocumentEditorProps {
  content: string
  blocks: Block[]
  onContentChange: (content: string) => void
  onBlocksChange: (blocks: Block[]) => void
  onAddBlock: (block: Block, position?: number) => void
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
  onRemoveBlock: (blockId: string) => void
}

export function DocumentEditor({
  content,
  blocks,
  onContentChange,
  onBlocksChange,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
}: DocumentEditorProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const [insertPosition, setInsertPosition] = useState<number | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id)
      const newIndex = blocks.findIndex((block) => block.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex)
        onBlocksChange(reorderedBlocks)
      }
    }
  }

  const handleInsertBlock = (template: typeof BLOCK_TEMPLATES[0]) => {
    const newBlock: Block = {
      ...template.defaultData,
      id: `block-${Date.now()}`,
      order: blocks.length + 1,
    }
    onAddBlock(newBlock, insertPosition || undefined)
    setShowBlockMenu(false)
    setInsertPosition(null)
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />
      case 'image':
        return <ImageIcon className="h-5 w-5" />
      case 'audio':
        return <Music className="h-5 w-5" />
      case 'quiz':
        return <HelpCircle className="h-5 w-5" />
      case 'assignment':
        return <FileText className="h-5 w-5" />
      case 'file':
        return <Paperclip className="h-5 w-5" />
      case 'embed':
        return <LinkIcon className="h-5 w-5" />
      default:
        return <Plus className="h-5 w-5" />
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar with blocks */}
      <div className="w-64 shrink-0">
        <Card className="sticky top-6 p-4">
          <h3 className="text-sm font-semibold mb-4">Agregar Contenido</h3>
          <div className="space-y-2">
            {BLOCK_TEMPLATES.filter((t) => t.type !== 'text').map((template) => (
              <Button
                key={template.type}
                variant="outline"
                className="w-full justify-start h-auto py-3 hover:bg-accent"
                onClick={() => handleInsertBlock(template)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-muted rounded">
                    {getBlockIcon(template.type)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{template.label}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Document-style editor */}
      <div className="flex-1 w-full">
        <Card className="min-h-[800px] p-12 shadow-lg">
          <div className="space-y-6">
            {/* Main content editor */}
            <div className="prose prose-lg max-w-none">
              <RichTextEditor
                value={content}
                onChange={onContentChange}
                placeholder="Comienza a escribir el contenido de tu lección..."
              />
            </div>

            {/* Embedded blocks */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 mt-8">
                  {blocks.map((block, index) => (
                    <div key={block.id}>
                      <SortableBlockItem
                        block={block}
                        isEditing={editingBlockId === block.id}
                        onEdit={() => setEditingBlockId(block.id)}
                        onSave={() => setEditingBlockId(null)}
                        onCancel={() => setEditingBlockId(null)}
                        onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                        onRemove={() => onRemoveBlock(block.id)}
                      />
                      {/* Insert button between blocks */}
                      <div className="flex justify-center my-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setInsertPosition(index + 1)
                            setShowBlockMenu(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Insertar bloque
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add block button at the end */}
            <div className="flex justify-center pt-8 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setInsertPosition(blocks.length)
                  setShowBlockMenu(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar bloque
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Block insertion menu */}
      {showBlockMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Insertar bloque</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowBlockMenu(false)}>
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {BLOCK_TEMPLATES.filter((t) => t.type !== 'text').map((template) => (
                  <Button
                    key={template.type}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleInsertBlock(template)}
                  >
                    {getBlockIcon(template.type)}
                    <span className="text-sm">{template.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// Sortable block item component
function SortableBlockItem({
  block,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onUpdate,
  onRemove,
}: {
  block: Block
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
        {/* Drag handle */}
        {!isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Block content */}
        <div className="ml-8 mr-8">
          {isEditing ? (
            <div className="space-y-4">
              <BlockEditor
                block={block}
                isEditing={isEditing}
                onEdit={onEdit}
                onSave={onSave}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onCancel={onCancel}
              />
            </div>
          ) : (
            <div onClick={onEdit} className="cursor-pointer">
              <BlockPreviewComponent block={block} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
