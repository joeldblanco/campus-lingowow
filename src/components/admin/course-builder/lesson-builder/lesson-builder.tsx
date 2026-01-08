'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateLessonBlocks, upsertLesson } from '@/lib/actions/course-builder'
import { cn } from '@/lib/utils'
import { Block, Lesson, FileBlock, BlockTemplate } from '@/types/course-builder'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Edit3,
  Eye,
  LayoutGrid,
  Loader2,
  Save,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { BlockLibrary, BlockSelectionGrid, DraggableBlock } from './block-library'
import { Canvas } from './canvas'
import { PropertiesPanel } from './properties-panel'

interface LessonBuilderProps {
  lesson: Lesson
  onUpdateLesson: (updates: Partial<Lesson>) => void
  onAddBlock: (block: Block) => void
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
  onRemoveBlock: (blockId: string) => void
  onReorderBlocks: (blocks: Block[]) => void
}

export function LessonBuilder({
  lesson,
  onUpdateLesson,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onReorderBlocks,
}: LessonBuilderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(lesson.title)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false)

  // Sync title input if lesson title updates externally
  useEffect(() => {
    setTitleInput(lesson.title)
  }, [lesson.title])

  const handleTitleSave = () => {
    if (titleInput.trim() !== lesson.title) {
      handleUpdateMetadata({ title: titleInput })
    }
    setIsEditingTitle(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') {
      setTitleInput(lesson.title)
      setIsEditingTitle(false)
    }
  }

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  // DnD States
  const [activeDragItem, setActiveDragItem] = useState<{
    type: string
    template?: BlockTemplate
    block?: Block
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Auto-save logic
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const isFirstRender = useRef(true)

  const debouncedSave = useCallback(
    (blocks: Block[]) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await updateLessonBlocks(lesson.id, blocks)
          if (result.success) {
            setSaveStatus('saved')
          } else {
            setSaveStatus('error')
            toast.error('Error al guardar automáticamente')
          }
        } catch (error) {
          setSaveStatus('error')
          console.error(error)
        }
      }, 1500)
    },
    [lesson.id]
  )

  // Auto-save metadata logic
  const metadataSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const debouncedMetadataSave = useCallback((updates: Partial<Lesson>) => {
    setSaveStatus('saving')
    if (metadataSaveTimeoutRef.current) {
      clearTimeout(metadataSaveTimeoutRef.current)
    }

    metadataSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await upsertLesson(lesson.moduleId || '', { id: lesson.id, ...updates })
        if (result.success) {
          setSaveStatus('saved')
        } else {
          setSaveStatus('error')
          toast.error('Error al guardar metadatos')
        }
      } catch (error) {
        setSaveStatus('error')
        console.error(error)
      }
    }, 1500)
  }, [lesson.id, lesson.moduleId])

  const handleUpdateMetadata = (updates: Partial<Lesson>) => {
    onUpdateLesson(updates)
    debouncedMetadataSave(updates)
  }


  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave(lesson.blocks)
  }, [lesson.blocks, debouncedSave])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    // Check if it's a library item or a canvas item
    if (active.data.current?.type === 'new-block') {
      setActiveDragItem({ type: 'new-block', template: active.data.current.template })
    } else {
      // It's a sortable item from the canvas
      const block = lesson.blocks.find((b) => b.id === active.id)
      if (block) {
        setActiveDragItem({ type: 'sortable-block', block })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) {
      // If dropped outside everything, should we remove?
      // Usually, dnd-kit returns null over if dropped outside droppable zones.
      // If we want "drop outside to cancel" for existing blocks, we can do it here.
      // But users might accidentally drop. Safer to only remove on explicit cancel zone.
      return
    }

    // 0. Handle Cancel Zone (Block Library)
    if (over.id === 'cancel-zone') {
      if (active.data.current?.type !== 'new-block') {
        // It's an existing block being dragged back to library -> Remove it
        // We should probably ask for confirmation? Or just do it.
        // "Drag-to-cancel" usually implies immediate action or visual cue.
        // The library shows "Drop to remove", so it's explicit.
        handleRemoveBlockWrapper(active.id as string)
      }
      return
    }

    // 1. Handling dropping a new block from library
    if (active.data.current?.type === 'new-block') {
      const template = active.data.current.template
      const newBlock: Block = {
        ...template.defaultData,
        id: `block_${Date.now()}`,
        order: lesson.blocks.length, // Temporary order
      }

      // Determine insertion index
      let insertIndex = lesson.blocks.length // Default to end

      if (over.id !== 'canvas-droppable') {
        // Dropped over an existing block
        const overId = over.id
        const overIndex = lesson.blocks.findIndex((b) => b.id === overId)
        if (overIndex !== -1) {
          // Decide if before or after based on collision rect?
          // Dnd-kit's closestCenter usually snaps to center.
          // A simple logic: Always insert AFTER the target block for now, or use complex vertical coordinate check.
          // But sorting strategy uses transform.
          // Let's just insert AT the index (pushing the target down) or after.
          // Standard behavior: effectively taking the position of the over item if swapping.
          // But here we insert.
          // Let's insert AFTER.
          insertIndex = overIndex + 1
        }
      }

      // Construct new blocks array locally
      const newBlocks = [...lesson.blocks]
      newBlocks.splice(insertIndex, 0, newBlock)

      // Update orders
      const reordered = newBlocks.map((b, idx) => ({ ...b, order: idx }))

      // We need to use onReorderBlocks because we are changing the structure, not just adding to end.
      // But wait, onAddBlock is usually for "Create".
      // If we use onReorderBlocks, we need to ensure the DB knows about the new block?
      // Actually, onReorderBlocks (updateLessonBlocks) expects full block objects usually?
      // The backend `updateLessonBlocks` performs a transaction: delete all blocks (or diff) and re-create?
      // Or upsert. If upsert, it's fine.
      // Checking `updateLessonBlocks` implementation (not visible here but usually safe to pass full list)
      // However, safely, we might want to call onAddBlock to save it, then reorder?
      // But persistence is async.
      // Let's simpler: Just call onReorderBlocks with the new array including the new block.
      // Assuming onReorderBlocks handles persistence of new items or parent component handles it.
      // The `debouncedSave` inside LessonBuilder maps `lesson.blocks`.
      // `onReorderBlocks` updates the `lesson` state in parent.
      // YES. `onReorderBlocks` (which calls `onUpdateLesson` via parent probably) updates local state.
      // Then `debouncedSave` kicks in and sends `lesson.blocks` to backend.
      // So yes, we should update local state fully.

      onReorderBlocks(reordered)
      setSelectedBlockId(newBlock.id)
      return
    }

    // 2. Handling Reordering of existing blocks
    if (active.id !== over.id) {
      // If dropping on Canvas Droppable (empty space) moves to end?
      // Usually Sortable handles collisions with items.

      const oldIndex = lesson.blocks.findIndex((b) => b.id === active.id)
      const newIndex = lesson.blocks.findIndex((b) => b.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(lesson.blocks, oldIndex, newIndex).map((b, idx) => ({
          ...b,
          order: idx,
        }))
        onReorderBlocks(newBlocks)
      }
    }
  }

  const handleRemoveBlockWrapper = async (blockId: string) => {
    // Check if block has Cloudinary files (file, video, audio blocks)
    const blockToRemove = lesson.blocks.find((b) => b.id === blockId)

    // Only proceed with cleanup if it's a file block for now
    if (blockToRemove && blockToRemove.type === 'file') {
      const files = (blockToRemove as FileBlock).files || []
      // Delete all associated files from Cloudinary
      for (const file of files) {
        if (file.url && file.url.includes('cloudinary.com')) {
          try {
            // Basic extraction logic similar to properties-panel
            const parts = file.url.split('/upload/')
            if (parts.length === 2) {
              const pathParts = parts[1].split('/')
              const versionIndex = pathParts.findIndex(
                (p: string) => p.startsWith('v') && !isNaN(Number(p.substring(1)))
              )
              const relevantParts = pathParts.slice(versionIndex + 1)
              const publicId = decodeURIComponent(relevantParts.join('/'))
              // Clean fl_attachment if present (though backend handles clean publicIds usually)
              if (publicId.startsWith('fl_attachment')) {
                // Logic to strip if needed, typically standard uploads are cleaner now
              }

              // Determine resource type
              let resourceType: 'image' | 'video' | 'raw' = 'image'
              const fileWithResource = file as { resourceType?: 'image' | 'video' | 'raw' }
              if (fileWithResource.resourceType) {
                resourceType = fileWithResource.resourceType
              } else {
                const ext = publicId.split('.').pop()?.toLowerCase()
                if (
                  [
                    'pdf',
                    'doc',
                    'docx',
                    'xls',
                    'xlsx',
                    'ppt',
                    'pptx',
                    'zip',
                    'rar',
                    'txt',
                    'csv',
                  ].includes(ext || '')
                ) {
                  resourceType = 'raw'
                } else if (
                  ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg'].includes(ext || '')
                ) {
                  resourceType = 'video'
                }
              }

              // Call server action to delete
              const { deleteCloudinaryFile } = await import('@/lib/actions/cloudinary')
              await deleteCloudinaryFile(publicId, resourceType)
            }
          } catch (e) {
            console.error('Error deleting file from Cloudinary during block removal', e)
          }
        }
      }
    }

    // Also handle single file blocks like video/audio/image
    if (
      blockToRemove &&
      (blockToRemove.type === 'video' ||
        blockToRemove.type === 'audio' ||
        blockToRemove.type === 'image')
    ) {
      const url = (blockToRemove as { url?: string }).url
      if (url && url.includes('cloudinary.com')) {
        try {
          const parts = url.split('/upload/')
          if (parts.length === 2) {
            const pathParts = parts[1].split('/')
            const versionIndex = pathParts.findIndex(
              (p: string) => p.startsWith('v') && !isNaN(Number(p.substring(1)))
            )
            const relevantParts = pathParts.slice(versionIndex + 1)
            let publicId = decodeURIComponent(relevantParts.join('/'))

            let resourceType: 'image' | 'video' | 'raw' = 'image'
            if (blockToRemove.type === 'video' || blockToRemove.type === 'audio') {
              resourceType = 'video'
            } else if (blockToRemove.type === 'image') {
              resourceType = 'image'
            }

            // Fix: Cloudinary public_ids for images/video do not include extension
            // We must strip it from the URL-derived ID
            const lastDotIndex = publicId.lastIndexOf('.')
            if (lastDotIndex !== -1) {
              publicId = publicId.substring(0, lastDotIndex)
            }

            const { deleteCloudinaryFile } = await import('@/lib/actions/cloudinary')
            await deleteCloudinaryFile(publicId, resourceType)
          }
        } catch (e) {
          console.error('Error deleting media from Cloudinary during block removal', e)
        }
      }
    }

    onRemoveBlock(blockId)
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const handlePublishToggle = () => {
    handleUpdateMetadata({ isPublished: !lesson.isPublished })
  }

  const handleAddBlockFromModal = (template: BlockTemplate) => {
    // Assuming template is an object with a defaultData property and type
    const newBlock: Block = {
      ...template.defaultData,
      id: `block_${Date.now()}`,
      order: lesson.blocks.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: template.type as any, // We trust the template has the correct type
    } as Block
    onAddBlock(newBlock)
    setSelectedBlockId(newBlock.id)
    setIsAddBlockModalOpen(false)
    toast.success('Bloque agregado')
  }

  const router = useRouter()

  const selectedBlock = lesson.blocks.find((b) => b.id === selectedBlockId) || null
  const OverlayIcon = activeDragItem?.template?.icon

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="h-16 border-b flex items-center justify-between px-4 shrink-0 bg-background z-40">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <span className="font-semibold">Lesson Builder</span>
              </div>
              <div className="h-6 w-px bg-border mx-2" />
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                <span className="text-muted-foreground hidden sm:inline">Lección Actual:</span>
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border-b border-primary outline-none font-medium w-[200px]"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <span className="font-medium max-w-[200px] truncate block" title={lesson.title}>
                      {lesson.title}
                    </span>
                    <Edit3
                      className="h-3 w-3 text-muted-foreground ml-1 cursor-pointer hover:text-foreground"
                      onClick={() => setIsEditingTitle(true)}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isPreviewMode && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Error al guardar</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Guardado</span>
                    </>
                  )}
                </div>
              )}

              <Button
                variant={isPreviewMode ? 'secondary' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                  setIsPreviewMode(!isPreviewMode)
                  setSelectedBlockId(null)
                }}
              >
                <Eye className="h-4 w-4" />
                {isPreviewMode ? 'Salir de Vista Previa' : 'Vista Previa'}
              </Button>

              {!isPreviewMode && (
                <>
                  <div className="p-2 bg-muted rounded-md pointer-events-none">
                    {activeDragItem?.template?.icon && <div className="h-4 w-4" />}
                  </div>
                  <Button
                    size="sm"
                    className={cn(
                      'gap-2 min-w-[100px]',
                      lesson.isPublished ? 'bg-green-600 hover:bg-green-700' : ''
                    )}
                    onClick={handlePublishToggle}
                  >
                    {lesson.isPublished ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Publicado
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Publicar
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Sidebar: Block Library */}
            {!isPreviewMode && <BlockLibrary />}

            {/* Center: Canvas */}
            <div
              className={cn(
                'flex-1 h-full transition-all duration-300',
                isPreviewMode ? 'mx-auto max-w-5xl border-x bg-background shadow-sm' : ''
              )}
            >
              <Canvas
                onUpdateMetadata={handleUpdateMetadata}
                blocks={lesson.blocks}
                title={lesson.title}
                description={lesson.description || ''}
                selectedBlockId={isPreviewMode ? null : selectedBlockId}
                onSelectBlock={!isPreviewMode ? setSelectedBlockId : () => {}}
                readOnly={isPreviewMode}
                onAddBlockClick={() => {
                  // Functionality for + button in empty state
                  setIsAddBlockModalOpen(true)
                }}
                onUpdateBlock={onUpdateBlock}
                onRemoveBlock={handleRemoveBlockWrapper}
              />
            </div>

            {/* Right Sidebar: Properties Panel - Hide for grammar-visualizer (edits inline) */}
            {!isPreviewMode && selectedBlock && selectedBlock.type !== 'grammar-visualizer' && (
              <PropertiesPanel
                block={selectedBlock}
                onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
                onRemove={() => handleRemoveBlockWrapper(selectedBlock.id)}
                onClose={() => setSelectedBlockId(null)}
              />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragItem?.type === 'new-block' && OverlayIcon ? (
            <div className="p-3 bg-background border rounded shadow-lg w-32 flex flex-col items-center gap-2 cursor-grabbing opacity-80 z-50">
              <div className="text-2xl text-primary">
                <OverlayIcon className="size-8" />
              </div>
              <DraggableBlock template={activeDragItem.template as BlockTemplate} variant="list" />
            </div>
          ) : null}
          {activeDragItem?.type === 'sortable-block' ? (
            <div className="p-4 bg-background border border-primary rounded-lg shadow-xl w-64 opacity-90 z-50">
              Drag to reorder
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {/* Add Block Modal */}
      <Dialog open={isAddBlockModalOpen} onOpenChange={setIsAddBlockModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Bloque</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BlockSelectionGrid onSelect={handleAddBlockFromModal} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}





