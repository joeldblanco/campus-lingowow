'use client'

import { useState } from 'react'
import { Module } from '@/types/course-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { GripVertical, Plus, Edit2, Trash2, BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ModulesTabProps {
  modules: Module[]
  courseId: string
  onModulesChange: (modules: Module[]) => void
  onAddModule: (module: Module) => Promise<void>
  onUpdateModule: (moduleId: string, updates: Partial<Module>) => Promise<void>
  onRemoveModule: (moduleId: string) => Promise<void>
  onReorderModules: (modules: Module[]) => Promise<void>
}

// Sortable Module Item Component
function SortableModuleItem({
  module,
  onRemoveModule,
  onEditModule,
  editingModuleId,
  onUpdateModule,
  onCancelEdit,
}: {
  module: Module
  onRemoveModule: (moduleId: string) => void
  onEditModule: (moduleId: string) => void
  editingModuleId: string | null
  onUpdateModule: (moduleId: string, updates: Partial<Module>) => Promise<void>
  onCancelEdit: () => void
}) {
  const [editValues, setEditValues] = useState({
    title: module.title,
    description: module.description,
    level: module.level,
    order: module.order,
    objectives: module.objectives,
    isPublished: module.isPublished,
  })
  const [isSaving, setIsSaving] = useState(false)

  const isEditing = editingModuleId === module.id

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdateModule(module.id, editValues)
    setIsSaving(false)
  }

  const handleCancel = () => {
    setEditValues({
      title: module.title,
      description: module.description,
      level: module.level,
      order: module.order,
      objectives: module.objectives,
      isPublished: module.isPublished,
    })
    onCancelEdit()
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      {isEditing ? (
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Edit2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Editando Módulo</h3>
          </div>
          <Input
            placeholder="Título del módulo"
            value={editValues.title}
            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
          />
          <Textarea
            placeholder="Descripción del módulo"
            rows={3}
            value={editValues.description}
            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
          />
          <Textarea
            placeholder="Objetivos de aprendizaje del módulo"
            rows={3}
            value={editValues.objectives}
            onChange={(e) => setEditValues({ ...editValues, objectives: e.target.value })}
          />
          <div className="flex items-center space-x-2">
            <Switch
              checked={editValues.isPublished}
              onCheckedChange={(checked) => setEditValues({ ...editValues, isPublished: checked })}
            />
            <label>Publicar módulo</label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex flex-col">
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-normal">
                    Nivel {module.level}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    {module.lessons.length} lecciones
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={module.isPublished}
                  onCheckedChange={(checked) => onUpdateModule(module.id, { isPublished: checked })}
                />
                <span className="text-sm text-muted-foreground w-16">
                  {module.isPublished ? 'Publicado' : 'Borrador'}
                </span>
              </div>

              <div className="flex items-center border-l pl-2">
                <Button variant="ghost" size="sm" onClick={() => onEditModule(module.id)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveModule(module.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      )}
    </Card>
  )
}

export function ModulesTab({
  modules,
  courseId,
  onAddModule,
  onUpdateModule,
  onRemoveModule,
  onReorderModules,
}: ModulesTabProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    level: 'A1',
    order: modules.length + 1,
    objectives: '',
    isPublished: false,
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = modules.findIndex((module) => module.id === active.id)
      const newIndex = modules.findIndex((module) => module.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedModules = arrayMove(modules, oldIndex, newIndex)
        await onReorderModules(reorderedModules)
      }
    }
  }

  const handleCreateModule = async () => {
    if (!newModule.title.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!newModule.description.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    setIsSaving(true)
    try {
      const newModuleData: Module = {
        id: `module-${Date.now()}`, // Placeholder, ignored by backend action for creation
        title: newModule.title,
        description: newModule.description,
        level: newModule.level,
        order: newModule.order,
        objectives: newModule.objectives,
        isPublished: newModule.isPublished,
        lessons: [],
        courseId: courseId,
      }

      await onAddModule(newModuleData)
      setIsCreatingNew(false)
      setNewModule({
        title: '',
        description: '',
        level: 'A1',
        order: modules.length + 2,
        objectives: '',
        isPublished: false,
      })
      toast.success('Módulo creado exitosamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al crear el módulo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditModule = (moduleId: string) => {
    setEditingModuleId(moduleId)
  }

  const handleUpdateModule = async (moduleId: string, updates: Partial<Module>) => {
    // Solo validar título y descripción si se están editando (no para cambios de isPublished)
    const isFullEdit = 'title' in updates && 'description' in updates
    if (isFullEdit) {
      if (!updates.title?.trim()) {
        toast.error('El título es requerido')
        return
      }
      if (!updates.description?.trim()) {
        toast.error('La descripción es requerida')
        return
      }
    }

    await onUpdateModule(moduleId, updates)
    
    // Solo cerrar el modo edición y mostrar toast si es una edición completa
    if (isFullEdit) {
      setEditingModuleId(null)
      toast.success('Módulo actualizado exitosamente')
    }
  }

  const handleRemoveModule = async (moduleId: string) => {
    if (confirm('¿Estás seguro de eliminar este módulo?')) {
      await onRemoveModule(moduleId)
      toast.success('Módulo eliminado exitosamente')
    }
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewModule({
      title: '',
      description: '',
      level: 'A1',
      order: modules.length + 1,
      objectives: '',
      isPublished: false,
    })
  }

  const handleCancelEdit = () => {
    setEditingModuleId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div>
          <h3 className="text-lg font-semibold">Módulos del Curso</h3>
          <p className="text-sm text-muted-foreground">
            Organiza y estructura el contenido en módulos
          </p>
        </div>
      </div>

      {/* Modules List */}
      {modules.length === 0 && !isCreatingNew ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay módulos aún</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza agregando tu primer módulo para estructurar el contenido del curso.
            </p>
            <Button onClick={() => setIsCreatingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Módulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {modules.map((module) => (
              <SortableModuleItem
                key={module.id}
                module={module}
                onRemoveModule={handleRemoveModule}
                onEditModule={handleEditModule}
                editingModuleId={editingModuleId}
                onUpdateModule={handleUpdateModule}
                onCancelEdit={handleCancelEdit}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add Module Button / Inline Form */}
      {isCreatingNew ? (
        <Card className="border-2 border-dashed border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Nuevo Módulo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Título del módulo"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción del módulo"
              rows={3}
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            />
            <Select
              value={newModule.level}
              onValueChange={(value) => setNewModule({ ...newModule, level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nivel MCER" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A1">A1 - Principiante</SelectItem>
                <SelectItem value="A2">A2 - Elemental</SelectItem>
                <SelectItem value="B1">B1 - Intermedio</SelectItem>
                <SelectItem value="B2">B2 - Intermedio Alto</SelectItem>
                <SelectItem value="C1">C1 - Avanzado</SelectItem>
                <SelectItem value="C2">C2 - Maestría</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Objetivos de aprendizaje del módulo"
              rows={3}
              value={newModule.objectives}
              onChange={(e) => setNewModule({ ...newModule, objectives: e.target.value })}
            />
            <div className="flex items-center space-x-2">
              <Switch
                checked={newModule.isPublished}
                onCheckedChange={(checked) => setNewModule({ ...newModule, isPublished: checked })}
              />
              <label>Publicar inmediatamente</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateModule} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Módulo'
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
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Módulo
            </Button>
          </div>
        )
      )}
    </div>
  )
}
