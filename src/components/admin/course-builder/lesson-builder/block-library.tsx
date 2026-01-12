'use client'

import { Card } from '@/components/ui/card'
import { BLOCK_TEMPLATES, BlockTemplate } from '@/types/course-builder'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

import { useDroppable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'

export function BlockLibrary() {
    const { setNodeRef, isOver } = useDroppable({
        id: 'cancel-zone',
        data: {
            accepts: ['sortable-block']
        }
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-72 border-r bg-background flex flex-col shrink-0 z-10 h-full transition-colors relative",
                isOver && "bg-destructive/10 border-destructive"
            )}
        >
            {isOver && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-[1px] text-destructive animate-in fade-in duration-200">
                    <Trash2 className="w-12 h-12 mb-2" />
                    <span className="font-bold text-lg">Soltar para eliminar</span>
                </div>
            )}

            <div className="p-4 border-b">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Biblioteca de Bloques</h2>
                <p className="text-xs text-muted-foreground">Arrastra bloques al lienzo</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Core Content: Grid Layout */}
                <div>
                    <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        Contenido Principal
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {BLOCK_TEMPLATES.filter(t => isCoreCategory(t.type)).map(template => (
                            <DraggableBlock key={template.type} template={template} variant="grid" />
                        ))}
                    </div>
                </div>

                {/* Language Tools: List Layout */}
                <div>
                    <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        Herramientas de Lenguaje
                    </h3>
                    <div className="flex flex-col gap-2">
                        {BLOCK_TEMPLATES.filter(t => t.type === 'grammar' || t.type === 'vocabulary' || t.type === 'audio' || t.type === 'grammar-visualizer').map(template => (
                            <DraggableBlock key={template.type} template={template} variant="list" />
                        ))}
                    </div>
                </div>

                {/* Interactive: List Layout */}
                <div>
                    <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        Interactivo
                    </h3>
                    <div className="flex flex-col gap-2">
                        {BLOCK_TEMPLATES.filter(t => ['multiple_choice', 'multi_select', 'true_false', 'short_answer', 'fill_blanks', 'match', 'ordering', 'drag_drop', 'essay', 'recording', 'quiz', 'assignment'].includes(t.type)).map(template => (
                            <DraggableBlock key={template.type} template={template} variant="list" />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}

export function BlockSelectionGrid({ onSelect }: { onSelect: (template: BlockTemplate) => void }) {
    return (
        <div className="space-y-6">
            {/* Core Content: Grid Layout */}
            <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                    Contenido Principal
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {BLOCK_TEMPLATES.filter(t => isCoreCategory(t.type)).map(template => (
                        <DraggableBlock key={template.type} template={template} variant="grid" onClick={() => onSelect(template)} disableDrag />
                    ))}
                </div>
            </div>

            {/* Language Tools: List Layout */}
            <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                    Herramientas de Lenguaje
                </h3>
                <div className="flex flex-col gap-2">
                    {BLOCK_TEMPLATES.filter(t => t.type === 'grammar' || t.type === 'vocabulary' || t.type === 'audio' || t.type === 'grammar-visualizer').map(template => (
                        <DraggableBlock key={template.type} template={template} variant="list" onClick={() => onSelect(template)} disableDrag />
                    ))}
                </div>
            </div>

            {/* Interactive: List Layout */}
            <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                    Interactivo
                </h3>
                <div className="flex flex-col gap-2">
                    {BLOCK_TEMPLATES.filter(t => ['multiple_choice', 'multi_select', 'true_false', 'short_answer', 'fill_blanks', 'match', 'ordering', 'drag_drop', 'essay', 'recording', 'quiz', 'assignment'].includes(t.type)).map(template => (
                        <DraggableBlock key={template.type} template={template} variant="list" onClick={() => onSelect(template)} disableDrag />
                    ))}
                </div>
            </div>
        </div>
    )
}

function isCoreCategory(type: string) {
    return ['text', 'image', 'video', 'title', 'file', 'embed', 'structured-content'].includes(type) || type === 'heading'
}

export function DraggableBlock({ template, variant, onClick, disableDrag }: { template: BlockTemplate, variant: 'grid' | 'list', onClick?: () => void, disableDrag?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `library-${template.type}`,
        data: {
            type: 'new-block',
            template,
        },
        disabled: disableDrag
    })

    const IconComponent = template.icon

    if (variant === 'grid') {
        return (
            <Card
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className={cn(
                    "p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-primary hover:shadow-md transition-all active:cursor-grabbing",
                    isDragging && "opacity-50",
                    disableDrag && "cursor-pointer active:cursor-pointer"
                )}
                onClick={onClick}
            >
                <div className="text-muted-foreground group-hover:text-primary">
                    <IconComponent className="size-8" />
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
                "flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all",
                isDragging && "opacity-50",
                disableDrag && "cursor-pointer active:cursor-pointer"
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


