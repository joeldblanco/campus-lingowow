'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  Loader2,
  Save,
  Settings,
  Upload,
  X,
  Library,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { BlockLibrary, BlockSelectionGrid, DraggableBlock } from '../course-builder/lesson-builder/block-library'
import { Canvas } from '../course-builder/lesson-builder/canvas'
import { PropertiesPanel } from '../course-builder/lesson-builder/properties-panel'
import type { LibraryCategory } from '@/lib/types/library'
import { RESOURCE_TYPE_LABELS, LEVEL_LABELS, ACCESS_LEVEL_LABELS, ACCESS_LEVEL_DESCRIPTIONS } from '@/lib/types/library'
import { LibraryResourceType, LibraryResourceStatus, LibraryResourceAccess } from '@prisma/client'

interface ResourceBuilderProps {
  resourceId?: string
  initialData?: {
    title: string
    description: string
    excerpt: string
    type: LibraryResourceType
    status: LibraryResourceStatus
    accessLevel: LibraryResourceAccess
    language: string
    level: string
    categoryId: string | null
    tags: string[]
    thumbnailUrl: string | null
    blocks: Block[]
  }
  onBack?: () => void
}

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'ja', label: 'Japonés' },
]

export function ResourceBuilder({
  resourceId,
  initialData,
  onBack,
}: ResourceBuilderProps) {
  const router = useRouter()
  const isEditing = !!resourceId

  // Resource metadata state
  const [title, setTitle] = useState(initialData?.title || 'Nuevo Recurso')
  const [description, setDescription] = useState(initialData?.description || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [resourceType, setResourceType] = useState<LibraryResourceType>(initialData?.type || 'ARTICLE')
  const [status, setStatus] = useState<LibraryResourceStatus>(initialData?.status || 'DRAFT')
  const [accessLevel, setAccessLevel] = useState<LibraryResourceAccess>(initialData?.accessLevel || 'PUBLIC')
  const [language, setLanguage] = useState(initialData?.language || 'es')
  const [level, setLevel] = useState(initialData?.level || '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '')
  const [blocks, setBlocks] = useState<Block[]>(initialData?.blocks || [])

  // UI state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(title)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('unsaved')
  const [isSaving, setIsSaving] = useState(false)

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

  // Fetch categories
  useEffect(() => {
    fetch('/api/library/categories')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setCategories(data))
      .catch((err) => console.error('Error fetching categories', err))
  }, [])

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      setTitle(titleInput.trim())
      setSaveStatus('unsaved')
    }
    setIsEditingTitle(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'new-block') {
      setActiveDragItem({ type: 'new-block', template: active.data.current.template })
    } else {
      const block = blocks.find((b) => b.id === active.id)
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
        order: blocks.length,
      }

      let insertIndex = blocks.length

      if (over.id !== 'canvas-droppable') {
        const overIndex = blocks.findIndex((b) => b.id === over.id)
        if (overIndex !== -1) {
          insertIndex = overIndex + 1
        }
      }

      const newBlocks = [...blocks]
      newBlocks.splice(insertIndex, 0, newBlock)
      const reordered = newBlocks.map((b, idx) => ({ ...b, order: idx }))

      setBlocks(reordered)
      setSelectedBlockId(newBlock.id)
      setSaveStatus('unsaved')
      return
    }

    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((b, idx) => ({
          ...b,
          order: idx,
        }))
        setBlocks(newBlocks)
        setSaveStatus('unsaved')
      }
    }
  }

  const handleAddBlock = (block: Block) => {
    setBlocks((prev) => [...prev, { ...block, order: prev.length }])
    setSaveStatus('unsaved')
  }

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? ({ ...b, ...updates } as Block) : b))
    )
    setSaveStatus('unsaved')
  }

  const handleRemoveBlock = (blockId: string) => {
    setBlocks((prev) =>
      prev.filter((b) => b.id !== blockId).map((b, idx) => ({ ...b, order: idx }))
    )
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
    setSaveStatus('unsaved')
  }

  const handleAddBlockFromModal = (template: BlockTemplate) => {
    const newBlock: Block = {
      ...template.defaultData,
      id: `block_${Date.now()}`,
      order: blocks.length,
      type: template.type as Block['type'],
    } as Block
    handleAddBlock(newBlock)
    setSelectedBlockId(newBlock.id)
    setIsAddBlockModalOpen(false)
    toast.success('Bloque agregado')
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      if (!tags.includes(newTag.trim().toLowerCase())) {
        setTags([...tags, newTag.trim().toLowerCase()])
        setSaveStatus('unsaved')
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
    setSaveStatus('unsaved')
  }

  const handleSave = useCallback(async (publishStatus?: LibraryResourceStatus) => {
    if (!title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      const finalStatus = publishStatus || status
      const content = JSON.stringify({ blocks, version: 1 })

      const payload = {
        title,
        description,
        excerpt,
        type: resourceType,
        content,
        thumbnailUrl: thumbnailUrl || null,
        language,
        level: level || null,
        tags,
        categoryId: categoryId || null,
        status: finalStatus,
        accessLevel,
      }

      const url = isEditing ? `/api/library/${resourceId}` : '/api/library'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaveStatus('saved')
        setStatus(finalStatus)
        toast.success(
          finalStatus === 'PUBLISHED'
            ? 'Recurso publicado exitosamente'
            : 'Recurso guardado exitosamente'
        )
        
        if (!isEditing) {
          const data = await res.json()
          router.push(`/admin/library/${data.id}/edit`)
        }
      } else {
        const err = await res.json()
        setSaveStatus('error')
        toast.error(err.error || 'Error al guardar el recurso')
      }
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
      toast.error('Error al conectar con el servidor')
    } finally {
      setIsSaving(false)
    }
  }, [title, description, excerpt, resourceType, blocks, thumbnailUrl, language, level, tags, categoryId, status, accessLevel, isEditing, resourceId, router])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/admin/library')
    }
  }

  const handleUpdateMetadata = (updates: { title?: string; description?: string }) => {
    if (updates.title !== undefined) {
      setTitle(updates.title)
    }
    if (updates.description !== undefined) {
      setDescription(updates.description)
    }
    setSaveStatus('unsaved')
  }

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null
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
                <Library className="h-5 w-5 text-primary" />
                <span className="font-semibold">Resource Builder</span>
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
                      <span className="font-medium max-w-[200px] truncate" title={title}>
                        {title}
                      </span>
                      <Edit3
                        className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => {
                          setTitleInput(title)
                          setIsEditingTitle(true)
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {RESOURCE_TYPE_LABELS[resourceType]}
                  </Badge>
                  <Badge 
                    variant={status === 'PUBLISHED' ? 'default' : 'secondary'} 
                    className={cn(
                      'text-xs',
                      status === 'PUBLISHED' && 'bg-green-100 text-green-800'
                    )}
                  >
                    {status === 'PUBLISHED' ? 'Publicado' : status === 'DRAFT' ? 'Borrador' : 'Archivado'}
                  </Badge>
                </div>
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
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-600">Sin guardar</span>
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
                <SheetContent className="overflow-y-auto w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Configuración del Recurso</SheetTitle>
                    <SheetDescription>Configura los metadatos y opciones del recurso</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Información Básica
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="excerpt">Resumen corto</Label>
                        <Textarea
                          id="excerpt"
                          value={excerpt}
                          onChange={(e) => {
                            setExcerpt(e.target.value.slice(0, 200))
                            setSaveStatus('unsaved')
                          }}
                          placeholder="Breve descripción para listados (máx. 200 caracteres)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground text-right">{excerpt.length}/200</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descripción completa</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value)
                            setSaveStatus('unsaved')
                          }}
                          placeholder="Descripción detallada del recurso"
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Classification */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Clasificación
                      </h3>
                      <div className="space-y-2">
                        <Label>Tipo de recurso</Label>
                        <Select value={resourceType} onValueChange={(v) => {
                          setResourceType(v as LibraryResourceType)
                          setSaveStatus('unsaved')
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select value={categoryId} onValueChange={(v) => {
                          setCategoryId(v)
                          setSaveStatus('unsaved')
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Idioma</Label>
                          <Select value={language} onValueChange={(v) => {
                            setLanguage(v)
                            setSaveStatus('unsaved')
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Nivel</Label>
                          <Select value={level} onValueChange={(v) => {
                            setLevel(v)
                            setSaveStatus('unsaved')
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Access Level */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Nivel de Acceso
                      </h3>
                      <div className="space-y-2">
                        <Select value={accessLevel} onValueChange={(v) => {
                          setAccessLevel(v as LibraryResourceAccess)
                          setSaveStatus('unsaved')
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACCESS_LEVEL_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex flex-col">
                                  <span>{label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {ACCESS_LEVEL_DESCRIPTIONS[key]}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Etiquetas
                      </h3>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-background min-h-[42px]">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                              type="button"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Agregar etiqueta..."
                          className="flex-1 min-w-[80px] text-sm bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Presiona Enter para agregar una etiqueta
                      </p>
                    </div>

                    {/* Thumbnail */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Imagen de Portada
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="thumbnailUrl">URL de la imagen</Label>
                        <Input
                          id="thumbnailUrl"
                          value={thumbnailUrl}
                          onChange={(e) => {
                            setThumbnailUrl(e.target.value)
                            setSaveStatus('unsaved')
                          }}
                          placeholder="https://..."
                          type="url"
                        />
                      </div>
                      {thumbnailUrl && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                          <img
                            src={thumbnailUrl}
                            alt="Vista previa"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      'gap-2',
                      status === 'PUBLISHED' && 'bg-green-600 hover:bg-green-700'
                    )}
                    onClick={() => handleSave(status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
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
                blocks={blocks}
                title={title}
                description={description}
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
