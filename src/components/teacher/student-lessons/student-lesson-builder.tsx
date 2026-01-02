'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateStudentLesson } from '@/lib/actions/student-lessons'
import { cn } from '@/lib/utils'
import { Block, BlockTemplate } from '@/types/course-builder'
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
  EyeOff,
  LayoutGrid,
  Loader2,
  Save,
  Settings,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { BlockLibrary, BlockSelectionGrid, DraggableBlock } from '@/components/admin/course-builder/lesson-builder/block-library'
import { Canvas } from '@/components/admin/course-builder/lesson-builder/canvas'
import { PropertiesPanel } from '@/components/admin/course-builder/lesson-builder/properties-panel'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface StudentLessonData {
  id: string
  title: string
  description: string
  content: string // JSON string of blocks
  duration: number
  videoUrl: string | null
  summary: string | null
  transcription: string | null
  isPublished: boolean
}

interface StudentLessonBuilderProps {
  lesson: StudentLessonData
  studentName: string
  courseName: string
  onBack?: () => void
}

export function StudentLessonBuilder({
  lesson: initialLesson,
  studentName,
  courseName,
  onBack,
}: StudentLessonBuilderProps) {
  const router = useRouter()
  
  // Parse blocks from content JSON
  const parseBlocks = (content: string): Block[] => {
    try {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const [lesson, setLesson] = useState({
    ...initialLesson,
    blocks: parseBlocks(initialLesson.content),
  })

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(lesson.title)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    description: lesson.description,
    duration: lesson.duration,
    videoUrl: lesson.videoUrl || '',
    summary: lesson.summary || '',
    transcription: lesson.transcription || '',
  })

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
    async (blocks: Block[], metadata?: Partial<typeof settingsForm>) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await updateStudentLesson({
            id: lesson.id,
            content: JSON.stringify(blocks),
            ...(metadata?.description !== undefined && { description: metadata.description }),
            ...(metadata?.duration !== undefined && { duration: metadata.duration }),
            ...(metadata?.videoUrl !== undefined && { videoUrl: metadata.videoUrl || undefined }),
            ...(metadata?.summary !== undefined && { summary: metadata.summary || undefined }),
            ...(metadata?.transcription !== undefined && { transcription: metadata.transcription || undefined }),
          })
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

  // Auto-save on blocks change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave(lesson.blocks)
  }, [lesson.blocks, debouncedSave])

  const handleTitleSave = async () => {
    if (titleInput.trim() !== lesson.title) {
      setLesson(prev => ({ ...prev, title: titleInput }))
      setSaveStatus('saving')
      try {
        const result = await updateStudentLesson({
          id: lesson.id,
          title: titleInput,
        })
        if (result.success) {
          setSaveStatus('saved')
        } else {
          setSaveStatus('error')
        }
      } catch {
        setSaveStatus('error')
      }
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'new-block') {
      setActiveDragItem({ type: 'new-block', template: active.data.current.template })
    } else {
      const block = lesson.blocks.find((b) => b.id === active.id)
      if (block) {
        setActiveDragItem({ type: 'sortable-block', block })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    if (over.id === 'cancel-zone') {
      if (active.data.current?.type !== 'new-block') {
        handleRemoveBlock(active.id as string)
      }
      return
    }

    if (active.data.current?.type === 'new-block') {
      const template = active.data.current.template
      const newBlock: Block = {
        ...template.defaultData,
        id: `block_${Date.now()}`,
        order: lesson.blocks.length,
      }

      let insertIndex = lesson.blocks.length

      if (over.id !== 'canvas-droppable') {
        const overIndex = lesson.blocks.findIndex((b) => b.id === over.id)
        if (overIndex !== -1) {
          insertIndex = overIndex + 1
        }
      }

      const newBlocks = [...lesson.blocks]
      newBlocks.splice(insertIndex, 0, newBlock)
      const reordered = newBlocks.map((b, idx) => ({ ...b, order: idx }))

      setLesson(prev => ({ ...prev, blocks: reordered }))
      setSelectedBlockId(newBlock.id)
      return
    }

    if (active.id !== over.id) {
      const oldIndex = lesson.blocks.findIndex((b) => b.id === active.id)
      const newIndex = lesson.blocks.findIndex((b) => b.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(lesson.blocks, oldIndex, newIndex).map((b, idx) => ({
          ...b,
          order: idx,
        }))
        setLesson(prev => ({ ...prev, blocks: newBlocks }))
      }
    }
  }

  const handleAddBlock = (block: Block) => {
    setLesson(prev => ({
      ...prev,
      blocks: [...prev.blocks, { ...block, order: prev.blocks.length }],
    }))
  }

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    setLesson(prev => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } as Block : b
      ),
    }))
  }

  const handleRemoveBlock = (blockId: string) => {
    setLesson(prev => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId).map((b, idx) => ({ ...b, order: idx })),
    }))
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const handlePublishToggle = async () => {
    const newPublished = !lesson.isPublished
    setLesson(prev => ({ ...prev, isPublished: newPublished }))
    setSaveStatus('saving')
    try {
      const result = await updateStudentLesson({
        id: lesson.id,
        isPublished: newPublished,
      })
      if (result.success) {
        setSaveStatus('saved')
        toast.success(newPublished ? 'Lección publicada' : 'Lección despublicada')
      } else {
        setSaveStatus('error')
        setLesson(prev => ({ ...prev, isPublished: !newPublished }))
      }
    } catch {
      setSaveStatus('error')
      setLesson(prev => ({ ...prev, isPublished: !newPublished }))
    }
  }

  const handleAddBlockFromModal = (template: BlockTemplate) => {
    const newBlock: Block = {
      ...template.defaultData,
      id: `block_${Date.now()}`,
      order: lesson.blocks.length,
      type: template.type as Block['type'],
    } as Block
    handleAddBlock(newBlock)
    setSelectedBlockId(newBlock.id)
    setIsAddBlockModalOpen(false)
    toast.success('Bloque agregado')
  }

  const handleSaveSettings = async () => {
    setLesson(prev => ({
      ...prev,
      description: settingsForm.description,
      duration: settingsForm.duration,
      videoUrl: settingsForm.videoUrl || null,
      summary: settingsForm.summary || null,
      transcription: settingsForm.transcription || null,
    }))
    
    setSaveStatus('saving')
    try {
      const result = await updateStudentLesson({
        id: lesson.id,
        description: settingsForm.description,
        duration: settingsForm.duration,
        videoUrl: settingsForm.videoUrl || undefined,
        summary: settingsForm.summary || undefined,
        transcription: settingsForm.transcription || undefined,
      })
      if (result.success) {
        setSaveStatus('saved')
        toast.success('Configuración guardada')
        setIsSettingsOpen(false)
      } else {
        setSaveStatus('error')
        toast.error('Error al guardar la configuración')
      }
    } catch {
      setSaveStatus('error')
      toast.error('Error al guardar la configuración')
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

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
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <span className="font-semibold">Lesson Builder</span>
              </div>
              <div className="h-6 w-px bg-border mx-2" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-sm">
                  {isEditingTitle ? (
                    <input
                      className="bg-transparent border-b border-primary outline-none font-medium w-[200px]"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="font-medium max-w-[200px] truncate" title={lesson.title}>
                        {lesson.title}
                      </span>
                      <Edit3
                        className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => setIsEditingTitle(true)}
                      />
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Para {studentName} • {courseName}
                </span>
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
                      <span className="text-destructive">Error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Guardado</span>
                    </>
                  )}
                </div>
              )}

              <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Configuración</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Configuración de la Lección</SheetTitle>
                    <SheetDescription>
                      Configura los detalles adicionales de la lección
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={settingsForm.description}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe el contenido de esta lección..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duración (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={settingsForm.duration}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="videoUrl">URL del Video</Label>
                      <Input
                        id="videoUrl"
                        value={settingsForm.videoUrl}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="summary">Resumen</Label>
                      <Textarea
                        id="summary"
                        value={settingsForm.summary}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, summary: e.target.value }))}
                        placeholder="Un resumen corto para el estudiante..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transcription">Transcripción</Label>
                      <Textarea
                        id="transcription"
                        value={settingsForm.transcription}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, transcription: e.target.value }))}
                        placeholder="Transcripción del video o audio..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleSaveSettings} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

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
                {isPreviewMode ? 'Editar' : 'Vista Previa'}
              </Button>

              {!isPreviewMode && (
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
                      <EyeOff className="h-4 w-4" />
                      Despublicar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Publicar
                    </>
                  )}
                </Button>
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
                onUpdateMetadata={(updates) => {
                  if (updates.title) {
                    setLesson(prev => ({ ...prev, title: updates.title! }))
                    setTitleInput(updates.title)
                  }
                  if (updates.description) {
                    setLesson(prev => ({ ...prev, description: updates.description! }))
                    setSettingsForm(prev => ({ ...prev, description: updates.description! }))
                  }
                }}
                blocks={lesson.blocks}
                title={lesson.title}
                description={lesson.description || ''}
                selectedBlockId={isPreviewMode ? null : selectedBlockId}
                onSelectBlock={!isPreviewMode ? setSelectedBlockId : () => {}}
                readOnly={isPreviewMode}
                onAddBlockClick={() => setIsAddBlockModalOpen(true)}
                onUpdateBlock={handleUpdateBlock}
                onRemoveBlock={handleRemoveBlock}
              />
            </div>

            {/* Right Sidebar: Properties Panel */}
            {!isPreviewMode && selectedBlock && selectedBlock.type !== 'grammar-visualizer' && (
              <PropertiesPanel
                block={selectedBlock}
                onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                onRemove={() => handleRemoveBlock(selectedBlock.id)}
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
              Arrastra para reordenar
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
