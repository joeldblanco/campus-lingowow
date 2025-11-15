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
import { BookOpen, Edit2, FileText, ImageIcon, Play, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface LessonsTabProps {
  modules: Module[]
  onUpdateLesson: (moduleId: string, lessonId: string, updates: Partial<Lesson>) => void
  onAddLesson: (moduleId: string, lesson: Lesson) => void
  onRemoveLesson: (moduleId: string, lessonId: string) => void
}

export function LessonsTab({
  modules,
  onUpdateLesson,
  onAddLesson,
  onRemoveLesson,
}: LessonsTabProps) {
  const router = useRouter()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    moduleId: '',
    order: 1,
  })

  const handleCreateLesson = () => {
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

    const lesson: Lesson = {
      id: `lesson-${Date.now()}`, // Temporary ID, will be replaced by backend
      title: newLesson.title,
      description: newLesson.description,
      order: newLesson.order,
      duration: 0, // Default to 0 since duration is optional
      blocks: [], // Empty blocks for now, will be filled in the lesson builder
      moduleId: newLesson.moduleId,
      isPublished: false,
    }

    onAddLesson(newLesson.moduleId, lesson)
    setIsCreatingNew(false)
    setNewLesson({
      title: '',
      description: '',
      moduleId: '',
      order: 1,
    })
    toast.success('Lección creada exitosamente')
  }

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId)
  }

  const handleUpdateLesson = (lessonId: string, moduleId: string, updates: Partial<Lesson>) => {
    if (!updates.title?.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!updates.description?.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    onUpdateLesson(moduleId, lessonId, updates)
    setEditingLessonId(null)
    toast.success('Lección actualizada exitosamente')
  }

  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    onRemoveLesson(moduleId, lessonId)
    toast.success('Lección eliminada exitosamente')
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

  const handleCancelEdit = () => {
    setEditingLessonId(null)
  }

  const allLessons = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleName: module.title,
      moduleId: module.id,
    }))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div>
          <h3 className="text-lg font-semibold">Lecciones del Curso</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona todas las lecciones de todos los módulos
          </p>
        </div>
      </div>

      {/* Lessons List */}
      {allLessons.length === 0 && !isCreatingNew ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay lecciones aún</h3>
            <p className="text-muted-foreground text-center mb-4">
              {modules.length === 0
                ? 'Primero crea módulos para poder agregar lecciones.'
                : 'Comienza agregando tu primera lección para estructurar el contenido.'}
            </p>
            {modules.length > 0 && (
              <Button onClick={() => setIsCreatingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Lección
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allLessons.map((lesson) => (
            <EditableLessonCard
              key={lesson.id}
              lesson={lesson}
              onEdit={handleEditLesson}
              onRemove={handleRemoveLesson}
              onUpdate={handleUpdateLesson}
              isEditing={editingLessonId === lesson.id}
              onCancelEdit={handleCancelEdit}
              router={router}
            />
          ))}
        </div>
      )}

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
              <Button onClick={handleCreateLesson} disabled={!newLesson.moduleId}>
                Crear Lección
              </Button>
              <Button variant="outline" onClick={handleCancelCreate}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        allLessons.length > 0 && (
          <div className="flex justify-center">
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

// Editable Lesson Card Component
function EditableLessonCard({
  lesson,
  onEdit,
  onRemove,
  onUpdate,
  isEditing,
  onCancelEdit,
  router,
}: {
  lesson: Lesson & { moduleName: string; moduleId: string }
  onEdit: (lessonId: string) => void
  onRemove: (moduleId: string, lessonId: string) => void
  onUpdate: (lessonId: string, moduleId: string, updates: Partial<Lesson>) => void
  isEditing: boolean
  onCancelEdit: () => void
  router: ReturnType<typeof useRouter>
}) {
  const [editValues, setEditValues] = useState({
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
  })

  const handleSave = () => {
    onUpdate(lesson.id, lesson.moduleId, editValues)
  }

  const handleCancel = () => {
    setEditValues({
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
    })
    onCancelEdit()
  }

  const getLessonIcon = (lesson: Lesson) => {
    const hasVideo = lesson.blocks.some((block) => block.type === 'video')
    const hasImage = lesson.blocks.some((block) => block.type === 'image')

    if (hasVideo) return <Video className="h-4 w-4" />
    if (hasImage) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <Card>
      {isEditing ? (
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Edit2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Editando Lección</h3>
          </div>
          <Input
            placeholder="Título de la lección"
            value={editValues.title}
            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
          />
          <Textarea
            placeholder="Descripción de la lección"
            rows={3}
            value={editValues.description}
            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Orden"
            min="1"
            value={editValues.order}
            onChange={(e) => setEditValues({ ...editValues, order: parseInt(e.target.value) || 1 })}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave}>Guardar Cambios</Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-primary/10 text-primary text-sm rounded flex items-center justify-center font-medium">
                  {lesson.order}
                </span>
                {getLessonIcon(lesson)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{lesson.title}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {lesson.moduleName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    {lesson.blocks.length} bloques
                  </span>
                </div>
                {lesson.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {lesson.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={lesson.isPublished ? 'default' : 'secondary'}>
                {lesson.isPublished ? 'Publicado' : 'Borrador'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => onEdit(lesson.id)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                router.push(`/admin/courses/${lesson.moduleId}/lessons/${lesson.id}/builder`)
              }}>
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(lesson.moduleId, lesson.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
