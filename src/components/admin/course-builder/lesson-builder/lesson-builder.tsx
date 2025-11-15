'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Block, Lesson } from '@/types/course-builder'
import { Clock, Edit3, Eye, Layers, Save } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DocumentEditor } from './document-editor'

interface LessonBuilderProps {
  lesson: Lesson
  onAddBlock: (block: Block) => void
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
  onRemoveBlock: (blockId: string) => void
  onReorderBlocks: (blocks: Block[]) => void
}

export function LessonBuilder({
  lesson,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onReorderBlocks,
}: LessonBuilderProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [lessonContent, setLessonContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleContentChange = (content: string) => {
    setLessonContent(content)
    setHasUnsavedChanges(true)
  }

  const handleBlocksChange = (blocks: Block[]) => {
    onReorderBlocks(blocks)
    setHasUnsavedChanges(true)
  }

  const handleAddBlockAtPosition = (block: Block) => {
    onAddBlock(block)
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    // Aquí guardarías el contenido y los bloques
    toast.success('Lección guardada exitosamente')
    setHasUnsavedChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">{lesson.title}</h2>
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600">
              Cambios sin guardar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>{lesson.blocks.length} bloques</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{lesson.duration} min</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)}>
              {isPreviewMode ? (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </>
              )}
            </Button>

            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      {!isPreviewMode ? (
        <DocumentEditor
          content={lessonContent}
          blocks={lesson.blocks}
          onContentChange={handleContentChange}
          onBlocksChange={handleBlocksChange}
          onAddBlock={handleAddBlockAtPosition}
          onUpdateBlock={onUpdateBlock}
          onRemoveBlock={onRemoveBlock}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-12 min-h-[800px]">
            <div className="prose prose-lg max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: lessonContent || '<p class="text-muted-foreground">Sin contenido</p>',
                }}
              />
            </div>

            {lesson.blocks.length > 0 && (
              <div className="space-y-6 mt-8">
                {lesson.blocks.map((block) => (
                  <div key={block.id} className="border rounded-lg p-4">
                    <Badge variant="secondary" className="mb-2">
                      {block.type}
                    </Badge>
                    <p className="text-sm text-muted-foreground">Vista previa del bloque</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
