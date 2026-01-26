'use client'

import { Block } from '@/types/course-builder'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { BlockPreview } from './block-preview'
import { BlockContentEditor } from './block-editor'
import { GripVertical } from 'lucide-react'
import Image from 'next/image'

interface CanvasProps {
    blocks: Block[]
    title?: string
    description?: string
    selectedBlockId: string | null
    onSelectBlock: (id: string | null) => void
    readOnly?: boolean
    onAddBlockClick?: () => void
    onUpdateBlock?: (blockId: string, updates: Partial<Block>) => void
    onRemoveBlock?: (blockId: string) => void
    onUpdateMetadata?: (updates: { title?: string; description?: string; coverImage?: string }) => void
    hideBlockHeaders?: boolean // Hide blue title/icon headers on blocks (for Resource Builder)
    coverImage?: string // Cover image URL for the resource
    onCoverImageClick?: () => void // Callback when cover image area is clicked (for upload)
    showCoverImage?: boolean // Whether to show the cover image area
    isPublished?: boolean // Whether the lesson is published
}

export function Canvas({
    blocks,
    title = "Título de la Lección",
    description = "Descripción de la lección...",
    selectedBlockId,
    onSelectBlock,
    readOnly = false,
    onAddBlockClick,
    onUpdateBlock,
    onRemoveBlock,
    onUpdateMetadata,
    hideBlockHeaders = false,
    coverImage,
    onCoverImageClick,
    showCoverImage = false,
    isPublished = false
}: CanvasProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'canvas-droppable',
        disabled: readOnly
    })

    return (
        <div className="flex-1 bg-muted/10 relative overflow-y-auto h-full" onClick={() => !readOnly && onSelectBlock(null)}>
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div
                ref={setNodeRef}
                className={cn(
                    "relative z-10 max-w-4xl mx-auto py-10 px-6 min-h-full flex flex-col transition-colors",
                    isOver && "ring-2 ring-primary ring-inset bg-primary/5 rounded-xl"
                )}
            >
                {/* Cover Image Area */}
                {showCoverImage && (
                    <div 
                        className={cn(
                            "mb-6 relative rounded-xl overflow-hidden",
                            !readOnly && "cursor-pointer group"
                        )}
                        onClick={() => !readOnly && onCoverImageClick?.()}
                    >
                        {coverImage ? (
                            <div className="relative w-full h-48 md:h-64">
                                <Image
                                    src={coverImage}
                                    alt="Imagen de portada"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                                    unoptimized={!coverImage.includes('cloudinary') && !coverImage.includes('res.cloudinary')}
                                />
                                {!readOnly && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-medium">Cambiar imagen</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={cn(
                                "w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors",
                                !readOnly ? "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30" : "border-muted-foreground/15"
                            )}>
                                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-xl text-muted-foreground">🖼️</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {readOnly ? "Sin imagen de portada" : "Agregar imagen de portada"}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Lesson Header */}
                <div className="mb-8 group">
                    <div className="flex items-start justify-between">
                        <div>
                            {!isPublished && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-primary text-xs font-bold uppercase tracking-wide rounded mb-2">Borrador</span>
                            )}
                            {isPublished && (
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide rounded mb-2">Publicado</span>
                            )}
                            <h1 
                                className={cn(
                                    "text-4xl font-bold tracking-tight mb-2 outline-none rounded p-1 -ml-1 transition-colors",
                                    !readOnly && "hover:bg-muted/50 cursor-text"
                                )} 
                                contentEditable={!readOnly} 
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    if (onUpdateMetadata) {
                                        onUpdateMetadata({ title: e.currentTarget.textContent || '' })
                                    }
                                }}
                            >
                                {title}
                            </h1>
                            <p 
                                className={cn(
                                    "text-muted-foreground text-lg max-w-2xl outline-none rounded p-1 -ml-1 transition-colors",
                                    !readOnly && "hover:bg-muted/50 cursor-text"
                                )} 
                                contentEditable={!readOnly} 
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    if (onUpdateMetadata) {
                                        onUpdateMetadata({ description: e.currentTarget.textContent || '' })
                                    }
                                }}
                            >
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pb-20">
                    {blocks.length === 0 ? (
                        readOnly ? (
                            <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 flex flex-col items-center justify-center gap-4 text-center transition-colors">
                                <div className="size-12 rounded-full bg-muted flex items-center justify-center shadow-sm">
                                    <span className="text-2xl text-muted-foreground">?</span>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">No hay contenidos en esta lección</p>
                                </div>
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
                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className={cn("space-y-6", readOnly && "space-y-0")}>
                                {blocks.map(block => (
                                    <div key={block.id} className="relative">
                                        <SortableBlockItem
                                            block={block}
                                            isSelected={selectedBlockId === block.id}
                                            onSelect={() => !readOnly && onSelectBlock(block.id)}
                                            readOnly={readOnly}
                                            onUpdate={onUpdateBlock ? (updates) => onUpdateBlock(block.id, updates) : undefined}
                                            onRemove={onRemoveBlock ? () => onRemoveBlock(block.id) : undefined}
                                            hideBlockHeader={hideBlockHeaders}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    )}
                </div>
            </div>
        </div>
    )
}

function SortableBlockItem({
    block,
    isSelected,
    onSelect,
    readOnly,
    onUpdate,
    onRemove,
    hideBlockHeader
}: {
    block: Block
    isSelected: boolean
    onSelect: () => void
    readOnly?: boolean
    onUpdate?: (updates: Partial<Block>) => void
    onRemove?: () => void
    hideBlockHeader?: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: block.id,
        disabled: readOnly
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    if (readOnly) {
        return (
            <div>
                <BlockPreview block={block} isTeacher hideBlockHeader={hideBlockHeader} />
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={(e) => {
                e.stopPropagation()
                onSelect()
            }}
            className={cn(
                "group relative bg-card rounded-xl border-2 transition-all",
                isSelected
                    ? "border-primary shadow-[0_0_0_4px_rgba(19,127,236,0.1)]"
                    : "border-transparent hover:border-primary/50 shadow-sm hover:shadow-md",
                isDragging && "z-50 shadow-xl opacity-50"
            )}
        >
            {/* Active Badge */}
            {isSelected && (
                <div className="absolute -top-3 left-6 bg-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full z-10">
                    Editando
                </div>
            )}

            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-muted rounded"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Block Content - structured-content and grammar-visualizer edit inline, others use panel */}
            <div className={block.type !== 'structured-content' && block.type !== 'grammar-visualizer' ? 'pointer-events-none' : ''}>
                {isSelected && onUpdate && (block.type === 'structured-content' || block.type === 'grammar-visualizer') ? (
                    <BlockContentEditor block={block} onUpdate={onUpdate} onRemove={onRemove} />
                ) : (
                    <BlockPreview block={block} isTeacher hideBlockHeader={hideBlockHeader} />
                )}
            </div>
        </div>
    )
}
