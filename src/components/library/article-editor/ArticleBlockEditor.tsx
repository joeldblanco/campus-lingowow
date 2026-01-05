'use client'

import { useState, useCallback } from 'react'
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
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Type, 
  Heading, 
  Lightbulb, 
  Table, 
  MessageSquareQuote, 
  Video, 
  Image as ImageIcon, 
  AlertCircle, 
  Minus,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { 
  ArticleBlock, 
  ArticleBlockType, 
  ArticleContent,
  ARTICLE_BLOCK_TEMPLATES,
  createEmptyBlock,
} from '@/lib/types/article-blocks'
import { SortableBlock } from './SortableBlock'
import { TextBlockEditor } from './blocks/TextBlockEditor'
import { HeadingBlockEditor } from './blocks/HeadingBlockEditor'
import { KeyRuleBlockEditor } from './blocks/KeyRuleBlockEditor'
import { GrammarTableBlockEditor } from './blocks/GrammarTableBlockEditor'
import { ExamplesBlockEditor } from './blocks/ExamplesBlockEditor'
import { VideoBlockEditor } from './blocks/VideoBlockEditor'
import { ImageBlockEditor } from './blocks/ImageBlockEditor'
import { CalloutBlockEditor } from './blocks/CalloutBlockEditor'
import { DividerBlockEditor } from './blocks/DividerBlockEditor'

const BLOCK_ICONS: Record<ArticleBlockType, React.ReactNode> = {
  'text': <Type className="h-4 w-4" />,
  'heading': <Heading className="h-4 w-4" />,
  'key-rule': <Lightbulb className="h-4 w-4" />,
  'grammar-table': <Table className="h-4 w-4" />,
  'examples-in-context': <MessageSquareQuote className="h-4 w-4" />,
  'video': <Video className="h-4 w-4" />,
  'image': <ImageIcon className="h-4 w-4" />,
  'callout': <AlertCircle className="h-4 w-4" />,
  'divider': <Minus className="h-4 w-4" />,
}

interface ArticleBlockEditorProps {
  content: ArticleContent
  onChange: (content: ArticleContent) => void
}

export function ArticleBlockEditor({ content, onChange }: ArticleBlockEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [addBlockPopoverOpen, setAddBlockPopoverOpen] = useState(false)

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = content.blocks.findIndex((block) => block.id === active.id)
      const newIndex = content.blocks.findIndex((block) => block.id === over.id)

      const newBlocks = arrayMove(content.blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index,
      }))

      onChange({ ...content, blocks: newBlocks })
    }
  }, [content, onChange])

  const addBlock = useCallback((type: ArticleBlockType, insertAfterIndex?: number) => {
    const order = insertAfterIndex !== undefined ? insertAfterIndex + 1 : content.blocks.length
    const newBlock = createEmptyBlock(type, order)
    
    let newBlocks: ArticleBlock[]
    if (insertAfterIndex !== undefined) {
      newBlocks = [
        ...content.blocks.slice(0, insertAfterIndex + 1),
        newBlock,
        ...content.blocks.slice(insertAfterIndex + 1).map(b => ({ ...b, order: b.order + 1 })),
      ]
    } else {
      newBlocks = [...content.blocks, newBlock]
    }
    
    onChange({ ...content, blocks: newBlocks })
    setActiveBlockId(newBlock.id)
    setAddBlockPopoverOpen(false)
  }, [content, onChange])

  const updateBlock = useCallback((blockId: string, updates: Partial<ArticleBlock>) => {
    const newBlocks = content.blocks.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    )
    onChange({ ...content, blocks: newBlocks as ArticleBlock[] })
  }, [content, onChange])

  const deleteBlock = useCallback((blockId: string) => {
    const newBlocks = content.blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }))
    onChange({ ...content, blocks: newBlocks })
    setActiveBlockId(null)
  }, [content, onChange])

  const duplicateBlock = useCallback((blockId: string) => {
    const blockIndex = content.blocks.findIndex(b => b.id === blockId)
    if (blockIndex === -1) return

    const originalBlock = content.blocks[blockIndex]
    const newBlock = {
      ...originalBlock,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: blockIndex + 1,
    }

    const newBlocks = [
      ...content.blocks.slice(0, blockIndex + 1),
      newBlock,
      ...content.blocks.slice(blockIndex + 1).map(b => ({ ...b, order: b.order + 1 })),
    ]

    onChange({ ...content, blocks: newBlocks })
  }, [content, onChange])

  const renderBlockEditor = (block: ArticleBlock) => {
    const commonProps = {
      onUpdate: (updates: Partial<ArticleBlock>) => updateBlock(block.id, updates),
      isActive: activeBlockId === block.id,
    }

    switch (block.type) {
      case 'text':
        return <TextBlockEditor block={block} {...commonProps} />
      case 'heading':
        return <HeadingBlockEditor block={block} {...commonProps} />
      case 'key-rule':
        return <KeyRuleBlockEditor block={block} {...commonProps} />
      case 'grammar-table':
        return <GrammarTableBlockEditor block={block} {...commonProps} />
      case 'examples-in-context':
        return <ExamplesBlockEditor block={block} {...commonProps} />
      case 'video':
        return <VideoBlockEditor block={block} {...commonProps} />
      case 'image':
        return <ImageBlockEditor block={block} {...commonProps} />
      case 'callout':
        return <CalloutBlockEditor block={block} {...commonProps} />
      case 'divider':
        return <DividerBlockEditor block={block} {...commonProps} />
      default:
        return null
    }
  }

  const groupedTemplates = ARTICLE_BLOCK_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, typeof ARTICLE_BLOCK_TEMPLATES>)

  const categoryLabels: Record<string, string> = {
    content: 'Contenido',
    educational: 'Herramientas Educativas',
    media: 'Multimedia',
    layout: 'Diseño',
  }

  return (
    <div className="space-y-4">

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={content.blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {content.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                isActive={activeBlockId === block.id}
                onActivate={() => setActiveBlockId(block.id)}
                onDelete={() => deleteBlock(block.id)}
                onDuplicate={() => duplicateBlock(block.id)}
                blockType={block.type}
                blockIcon={BLOCK_ICONS[block.type]}
              >
                {renderBlockEditor(block)}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {content.blocks.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Comienza a crear tu artículo</p>
              <p className="text-sm text-muted-foreground">
                Añade bloques de contenido para construir tu artículo
              </p>
            </div>
          </div>
        </div>
      )}

      <Popover open={addBlockPopoverOpen} onOpenChange={setAddBlockPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Añadir Bloque
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Añadir Contenido</h4>
            <p className="text-xs text-muted-foreground">Selecciona un tipo de bloque</p>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category} className="mb-3 last:mb-0">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
                  {categoryLabels[category] || category}
                </h5>
                <div className="space-y-1">
                  {templates.map((template) => (
                    <button
                      key={template.type}
                      onClick={() => addBlock(template.type)}
                      className={cn(
                        "w-full flex items-start gap-3 p-2 rounded-md text-left",
                        "hover:bg-accent transition-colors"
                      )}
                    >
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        {BLOCK_ICONS[template.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{template.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
