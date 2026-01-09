'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Lesson, Module } from '@/types/course-builder'
import { BookOpen, Edit2, FileText, ImageIcon, Play, Plus, Trash2, Video, Loader2, GripVertical } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderLessons } from '@/lib/actions/course-builder'
import { EditLessonDialog } from '@/components/admin/lessons/edit-lesson-dialog'

interface LessonsTabProps {
  modules: Module[]
  onAddLesson: (moduleId: string, lesson: Lesson) => Promise<void>
  onRemoveLesson: (moduleId: string, lessonId: string) => Promise<void>
  onReorderLessons: (moduleId: string, newLessonIds: string[]) => void
}

// Sortable Lesson Item Component
function SortableLessonItem({
  lesson,
  moduleId,
  onRemove,
  onLessonUpdated,
  router,
}: {
  lesson: Lesson
  moduleId: string
  moduleName: string
  onRemove: (moduleId: string, lessonId: string) => Promise<void>
  onLessonUpdated: () => void
  router: ReturnType<typeof useRouter>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getLessonIcon = (lesson: Lesson) => {
    const hasVideo = lesson.blocks.some((block) => block.type === 'video')
    const hasImage = lesson.blocks.some((block) => block.type === 'image')

    if (hasVideo) return <Video className="h-4 w-4" />
    if (hasImage) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="pt-2 pb-2 pl-2 pr-4 flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded mr-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 bg-primary/10 text-primary text-xs rounded flex items-center justify-center font-medium flex-shrink-0">
              {lesson.order}
            </span>
            {getLessonIcon(lesson)}
            <h4 className="font-medium truncate" title={lesson.title}>{lesson.title}</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {lesson.blocks.length} bloques
            </span>
            {lesson.description && (
              <span className="truncate max-w-[300px]" title={lesson.description}>- {lesson.description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border-l pl-2">
            <EditLessonDialog
              lesson={{
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                order: lesson.order,
                moduleId: moduleId,
              }}
              onLessonUpdated={onLessonUpdated}
            >
              <Button variant="ghost" size="sm">
                <Edit2 className="h-4 w-4" />
              </Button>
            </EditLessonDialog>
            <Button variant="ghost" size="sm" onClick={() => {
              router.push(`/admin/courses/${moduleId}/lessons/${lesson.id}/builder`)
            }}>
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(moduleId, lesson.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ModuleLessonsList({
  module,
  onRemoveLesson,
  onLessonUpdated,
  router
}: {
  module: Module
  onRemoveLesson: (moduleId: string, lessonId: string) => Promise<void>
  onLessonUpdated: () => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="mb-6">
      <h4 className="flex items-center gap-2 font-semibold text-lg mb-3 pb-2 border-b">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        {module.title}
        <Badge variant="outline" className="ml-2 font-normal text-xs">
          {module.lessons.length} lecciones
        </Badge>
      </h4>

      <SortableContext
        items={module.lessons.map(l => l.id)}
        strategy={verticalListSortingStrategy}
      >
        {module.lessons.length === 0 ? (
          <div className="text-sm text-muted-foreground italic py-2 pl-4">
            Este módulo no tiene lecciones.
          </div>
        ) : (
          <div className="space-y-2">
            {module.lessons.map((lesson) => (
              <SortableLessonItem
                key={lesson.id}
                lesson={lesson}
                moduleId={module.id}
                moduleName={module.title}
                onRemove={onRemoveLesson}
                onLessonUpdated={onLessonUpdated}
                router={router}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  )
}

export function LessonsTab({
  modules,
  onAddLesson,
  onRemoveLesson,
  onReorderLessons,
}: LessonsTabProps) {
  const router = useRouter()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // State for drag and drop to work immediately with optimistic updates
  // In a real app we might want to lift this state up or sync better with the parent 'modules' prop
  // But since the parent also does optimistic updates on 'modules', relies on 'modules' prop is usually fine
  // IF the parent updates the prop correctly.

  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    moduleId: '',
    order: 1,
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Find which module the active item belongs to
    // and which module the over item belongs to
    // Since we only want to reorder WITHIN a module for now (simplification)
    // we check if they are in the same module.

    let sourceModuleId = ''
    let sourceLessonIds: string[] = []

    // Locate source module
    const sourceModule = modules.find(m => m.lessons.some(l => l.id === active.id))
    if (!sourceModule) return
    sourceModuleId = sourceModule.id
    sourceLessonIds = sourceModule.lessons.map(l => l.id)

    // Locate target module (if dragging over another item)
    // If over.id is a lesson id
    const targetModule = modules.find(m => m.lessons.some(l => l.id === over.id)) ||
      (modules.find(m => m.id === over.id) ? modules.find(m => m.id === over.id) : null) // Maybe dropped on container?

    if (!targetModule) return

    // If different modules, we ignore for now as requested "like modules" usually implies reordering 
    // but moving between modules is a different feature.
    if (sourceModule.id !== targetModule.id) return

    if (active.id !== over.id) {
      const oldIndex = sourceLessonIds.indexOf(active.id as string)
      const newIndex = sourceLessonIds.indexOf(over.id as string)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Calculate new optimistic order
        const newOrder = arrayMove(sourceLessonIds, oldIndex, newIndex)

        // Optimistic update first for smooth UI
        onReorderLessons(sourceModuleId, newOrder)

        // Then persist to server
        try {
          await reorderLessons(sourceModuleId, newOrder)
          toast.success('Orden de lecciones actualizado')
        } catch {
          toast.error('Error al reordenar lecciones')
        }
      }
    }
  }

  const handleCreateLesson = async () => {
    if (!newLesson.title.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!newLesson.description.trim()) {
      toast.error('La descripción es requerida')
      return
    }
    if (!newLesson.moduleId) {
      toast.error('Debe seleccionar un módulo')
      return
    }

    setIsSaving(true)
    try {
      // Logic from before
      const lesson: Lesson = {
        id: `lesson-${Date.now()}`,
        title: newLesson.title,
        description: newLesson.description,
        order: newLesson.order,
        duration: 0,
        blocks: [],
        moduleId: newLesson.moduleId,
        isPublished: false,
      }

      await onAddLesson(newLesson.moduleId, lesson)
      setIsCreatingNew(false)
      setNewLesson({
        title: '',
        description: '',
        moduleId: '',
        order: 1,
      })
      toast.success('Lección creada exitosamente')
    } catch {
      toast.error('Error al crear la lección')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLessonUpdated = () => {
    router.refresh()
  }

  const handleRemoveLesson = async (moduleId: string, lessonId: string) => {
    if (confirm('¿Estás seguro de eliminar esta lección?')) {
      await onRemoveLesson(moduleId, lessonId)
      toast.success('Lección eliminada exitosamente')
    }
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewLesson({
      title: '',
      description: '',
      moduleId: '',
      order: 1,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div>
          <h3 className="text-lg font-semibold">Lecciones del Curso</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y organiza las lecciones de cada módulo
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {modules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay módulos definidos</h3>
              <p className="text-muted-foreground text-center">
                Debes crear módulos antes de agregar lecciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {modules.map(module => (
              <ModuleLessonsList
                key={module.id}
                module={module}
                onRemoveLesson={handleRemoveLesson}
                onLessonUpdated={handleLessonUpdated}
                router={router}
              />
            ))}
          </div>
        )}
      </DndContext>

      {/* Add Lesson Button / Inline Form */}
      {isCreatingNew ? (
        <Card className="border-2 border-dashed border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Nueva Lección</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Título de la lección"
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción de la lección"
              rows={3}
              value={newLesson.description}
              onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={newLesson.moduleId}
                onValueChange={(value) => setNewLesson({ ...newLesson, moduleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules.length === 0 ? (
                    <SelectItem value="no-modules" disabled>
                      No hay módulos disponibles
                    </SelectItem>
                  ) : (
                    modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Orden"
                min="1"
                value={newLesson.order}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, order: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateLesson} disabled={!newLesson.moduleId || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Lección'
                )}
              </Button>
              <Button variant="outline" onClick={handleCancelCreate} disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        modules.length > 0 && (
          <div className="flex justify-center pb-8">
            <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Lección
            </Button>
          </div>
        )
      )}
    </div>
  )
}
