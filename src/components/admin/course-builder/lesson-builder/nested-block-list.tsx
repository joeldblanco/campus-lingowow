'use client'

import { Block } from '@/types/course-builder'
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockEditor } from './block-editor'
import { BlockPreview as BlockPreviewComponent } from './block-preview'
import { Button } from '@/components/ui/button'
import { GripVertical, Edit3, Trash2, Plus } from 'lucide-react'

interface NestedBlockListProps {
    blocks: Block[]
    onBlocksChange: (blocks: Block[]) => void
    onAddBlock: (position?: number) => void // Trigger parend add menu
    editingBlockId: string | null
    setEditingBlockId: (id: string | null) => void
    onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
    onRemoveBlock: (blockId: string) => void
}

export function NestedBlockList({
    blocks,
    onBlocksChange, // eslint-disable-line @typescript-eslint/no-unused-vars
    onAddBlock,
    editingBlockId,
    setEditingBlockId,
    onUpdateBlock,
    onRemoveBlock
}: NestedBlockListProps) {

    return (
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4 min-h-[50px]">
                {blocks.length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed rounded-lg text-muted-foreground text-sm cursor-pointer hover:bg-muted/50" onClick={() => onAddBlock()}>
                        Haga clic para agregar contenido
                    </div>
                )}

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
                        <div className="flex justify-center my-1 h-2 hover:h-auto group-hover/list">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 hover:opacity-100 transition-opacity h-6 text-xs"
                                onClick={() => onAddBlock(index + 1)}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Insertar
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </SortableContext>
    )
}

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
            <div className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
                {/* Drag handle */}
                {!isEditing && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="absolute left-1 top-4 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}

                {/* Block content */}
                <div className="pl-6 pr-2">
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
                            <BlockPreviewComponent block={block} isTeacher />
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                {!isEditing && (
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onEdit}
                        >
                            <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={onRemove}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
