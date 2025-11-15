'use client'

import { useState } from 'react'
import { Module, Lesson } from '@/types/course-builder'
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
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { GripVertical, Plus, Edit2, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface ModulesTabProps {
  modules: Module[]
  courseId: string
  onModulesChange: (modules: Module[]) => void
  onAddModule: (module: Module) => void
  onUpdateModule: (moduleId: string, updates: Partial<Module>) => void
  onRemoveModule: (moduleId: string) => void
  onReorderModules: (modules: Module[]) => void
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
  onUpdateModule: (moduleId: string, updates: Partial<Module>) => void
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

  const isEditing = editingModuleId === module.id

  const handleSave = () => {
    onUpdateModule(module.id, editValues)
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
  const [isExpanded, setIsExpanded] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

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
          <div className="grid grid-cols-2 gap-4">
            <Select
              value={editValues.level.toString()}
              onValueChange={(value) => setEditValues({ ...editValues, level: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Nivel {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Orden"
              min="1"
              value={editValues.order}
              onChange={(e) => setEditValues({ ...editValues, order: parseInt(e.target.value) || 1 })}
            />
          </div>
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
            <Button onClick={handleSave}>
              Guardar Cambios
            </Button>
            <Button variant="outline" onClick={handleCancel}>
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
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="flex-1">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant={module.isPublished ? 'default' : 'secondary'}>
                    {module.isPublished ? 'Publicado' : 'Borrador'}
                  </Badge>
                  <Badge variant="outline">Nivel {module.level}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    {module.lessons.length} lecciones
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditModule(module.id)}
                  >
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
                <CollapsibleContent className="mt-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {module.description || 'Sin descripción'}
                    </p>
                    {module.objectives && (
                      <div>
                        <p className="text-sm font-medium mb-1">Objetivos:</p>
                        <p className="text-sm text-muted-foreground">{module.objectives}</p>
                      </div>
                    )}
                    {module.lessons.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Lecciones:</p>
                        <div className="space-y-1">
                          {module.lessons.map((lesson: Lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded"
                            >
                              <span className="w-4 h-4 bg-primary/10 text-primary text-xs rounded flex items-center justify-center">
                                {lesson.order}
                              </span>
                              {lesson.title}
                              <span className="ml-auto">{lesson.duration}min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    level: 1,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = modules.findIndex((module) => module.id === active.id)
      const newIndex = modules.findIndex((module) => module.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedModules = arrayMove(modules, oldIndex, newIndex)
        onReorderModules(reorderedModules)
      }
    }
  }

  const handleCreateModule = () => {
    if (!newModule.title.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!newModule.description.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    const newModuleData: Module = {
      id: `module-${Date.now()}`, // Temporary ID, will be replaced by backend
      title: newModule.title,
      description: newModule.description,
      level: newModule.level,
      order: newModule.order,
      objectives: newModule.objectives,
      isPublished: newModule.isPublished,
      lessons: [],
      courseId: courseId,
    }

    onAddModule(newModuleData)
    setIsCreatingNew(false)
    setNewModule({
      title: '',
      description: '',
      level: 1,
      order: modules.length + 2,
      objectives: '',
      isPublished: false,
    })
    toast.success('Módulo creado exitosamente')
  }

  const handleEditModule = (moduleId: string) => {
    setEditingModuleId(moduleId)
  }

  const handleUpdateModule = (moduleId: string, updates: Partial<Module>) => {
    if (!updates.title?.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!updates.description?.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    onUpdateModule(moduleId, updates)
    setEditingModuleId(null)
    toast.success('Módulo actualizado exitosamente')
  }

  const handleRemoveModule = (moduleId: string) => {
    onRemoveModule(moduleId)
    toast.success('Módulo eliminado exitosamente')
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewModule({
      title: '',
      description: '',
      level: 1,
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modules.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
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
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={newModule.level.toString()}
                onValueChange={(value) => setNewModule({ ...newModule, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Nivel {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Orden"
                min="1"
                value={newModule.order}
                onChange={(e) => setNewModule({ ...newModule, order: parseInt(e.target.value) || 1 })}
              />
            </div>
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
              <Button onClick={handleCreateModule}>
                Crear Módulo
              </Button>
              <Button variant="outline" onClick={handleCancelCreate}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : modules.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Módulo
          </Button>
        </div>
      )}
    </div>
  )
}
