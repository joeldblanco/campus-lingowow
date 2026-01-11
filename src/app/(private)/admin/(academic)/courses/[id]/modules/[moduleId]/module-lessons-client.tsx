'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Lesson, Module } from '@/types/course-builder'
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  FileText,
  GripVertical,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  Trash2,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderLessons, upsertLesson, deleteLesson } from '@/lib/actions/course-builder'
import { EditLessonDialog } from '@/components/admin/lessons/edit-lesson-dialog'

interface ModuleLessonsClientProps {
  moduleData: Module
  courseId: string
  courseTitle: string
}

function SortableLessonItem({
  lesson,
  moduleId,
  courseId,
  onRemove,
  onLessonUpdated,
  onOptimisticUpdate,
}: {
  lesson: Lesson
  moduleId: string
  courseId: string
  onRemove: (lessonId: string) => Promise<void>
  onLessonUpdated: () => void
  onOptimisticUpdate: (lessonId: string, moduleId: string, updates: { title: string; description: string; order: number; moduleId: string }) => Promise<void>
}) {
  const router = useRouter()
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
            <Badge variant={lesson.isPublished ? 'default' : 'secondary'} className="text-xs">
              {lesson.isPublished ? 'Publicada' : 'Borrador'}
            </Badge>
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
              onOptimisticUpdate={onOptimisticUpdate}
            >
              <Button variant="ghost" size="sm" title="Editar información">
                <Edit2 className="h-4 w-4" />
              </Button>
            </EditLessonDialog>
            <Button 
              variant="ghost" 
              size="sm" 
              title="Editar contenido"
              onClick={() => {
                router.push(`/admin/courses/${courseId}/lessons/${lesson.id}/builder`)
              }}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(lesson.id)}
              className="text-destructive hover:text-destructive"
              title="Eliminar lección"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ModuleLessonsClient({ moduleData, courseId, courseTitle }: ModuleLessonsClientProps) {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>(moduleData.lessons)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(lessons.map(l => l.id), oldIndex, newIndex)
      
      // Optimistic update
      const reorderedLessons = arrayMove(lessons, oldIndex, newIndex).map((l, idx) => ({
        ...l,
        order: idx + 1
      }))
      setLessons(reorderedLessons)

      try {
        await reorderLessons(moduleData.id, newOrder)
        toast.success('Orden actualizado')
      } catch {
        toast.error('Error al reordenar lecciones')
        setLessons(lessons) // Revert
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

    setIsSaving(true)
    try {
      const maxOrder = lessons.reduce((max, l) => Math.max(max, l.order), 0)
      const nextOrder = maxOrder + 1

      const result = await upsertLesson(moduleData.id, {
        title: newLesson.title,
        description: newLesson.description,
        order: nextOrder,
        duration: 0,
        isPublished: false,
      })

      if (!result.success || !result.lesson) {
        throw new Error(result.error || 'Error al crear la lección')
      }

      const createdLesson: Lesson = {
        id: result.lesson.id,
        title: result.lesson.title,
        description: result.lesson.description || '',
        order: result.lesson.order,
        duration: result.lesson.duration,
        blocks: [],
        moduleId: moduleData.id,
        isPublished: result.lesson.isPublished,
      }

      setLessons([...lessons, createdLesson])
      setIsCreatingNew(false)
      setNewLesson({ title: '', description: '' })
      toast.success('Lección creada exitosamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la lección')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveLesson = async (lessonId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta lección?')) return

    const originalLessons = [...lessons]
    setLessons(lessons.filter(l => l.id !== lessonId))

    try {
      const result = await deleteLesson(lessonId)
      if (!result.success) {
        throw new Error(result.error)
      }
      toast.success('Lección eliminada')
    } catch {
      toast.error('Error al eliminar la lección')
      setLessons(originalLessons)
    }
  }

  const handleLessonUpdated = () => {
    router.refresh()
  }

  const handleOptimisticUpdate = async (lessonId: string, _moduleId: string, updates: { title: string; description: string; order: number }) => {
    setLessons(lessons.map(l => 
      l.id === lessonId ? { ...l, ...updates } : l
    ))
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewLesson({ title: '', description: '' })
  }

  return (
    <div className="pb-20">
      {/* Breadcrumb */}
      <div className="px-4 lg:px-10 py-4 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-wrap gap-2 items-center text-sm font-medium text-muted-foreground">
          <Link href="/admin" className="hover:text-primary transition-colors">
            Administración
          </Link>
          <span>/</span>
          <Link href="/admin/courses" className="hover:text-primary transition-colors">
            Cursos
          </Link>
          <span>/</span>
          <Link href={`/admin/courses/${courseId}`} className="hover:text-primary transition-colors">
            {courseTitle}
          </Link>
          <span>/</span>
          <span className="text-foreground">{moduleData.title}</span>
        </div>
      </div>

      <main className="px-4 lg:px-10 w-full max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/courses/${courseId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{moduleData.title}</h1>
                <Badge variant={moduleData.isPublished ? 'default' : 'secondary'}>
                  {moduleData.isPublished ? 'Publicado' : 'Borrador'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {moduleData.description || 'Sin descripción'}
              </p>
            </div>
          </div>
        </div>

        {/* Module Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Nivel</p>
                <p className="font-medium">{moduleData.level}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Orden</p>
                <p className="font-medium">Módulo {moduleData.order}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Lecciones</p>
                <p className="font-medium">{lessons.length} lecciones</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Objetivos</p>
                <p className="font-medium truncate" title={moduleData.objectives}>
                  {moduleData.objectives || 'Sin objetivos definidos'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lecciones del Módulo</h2>
            <Badge variant="outline">{lessons.length} lecciones</Badge>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lessons.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {lessons.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Este módulo no tiene lecciones</p>
                  <p className="text-sm mt-1">Crea tu primera lección para comenzar</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <SortableLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      moduleId={moduleData.id}
                      courseId={courseId}
                      onRemove={handleRemoveLesson}
                      onLessonUpdated={handleLessonUpdated}
                      onOptimisticUpdate={handleOptimisticUpdate}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>

          {/* Add Lesson Form */}
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
                <div className="flex gap-2">
                  <Button onClick={handleCreateLesson} disabled={isSaving}>
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
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Lección
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
