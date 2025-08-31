'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateLesson, getAllModulesForLessons } from '@/lib/actions/lessons'
import { toast } from 'sonner'

interface LessonData {
  id: string
  title: string
  description: string
  order: number
  moduleId: string
}

interface EditLessonDialogProps {
  children: React.ReactNode
  lesson: LessonData
  onLessonUpdated: () => void
}

export function EditLessonDialog({ children, lesson, onLessonUpdated }: EditLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modules, setModules] = useState<Array<{
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  }>>([])
  const [formData, setFormData] = useState({
    title: lesson.title || '',
    description: lesson.description || '',
    order: lesson.order || 0,
    moduleId: lesson.moduleId || '',
  })

  useEffect(() => {
    const loadModules = async () => {
      try {
        const modulesData = await getAllModulesForLessons()
        setModules(modulesData)
      } catch (error) {
        console.error('Error loading modules:', error)
        toast.error('Error al cargar las unidades')
      }
    }

    if (open) {
      loadModules()
    }
  }, [open])

  useEffect(() => {
    setFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      order: lesson.order || 0,
      moduleId: lesson.moduleId || '',
    })
  }, [lesson])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('El título es requerido')
      return
    }

    if (!formData.moduleId) {
      toast.error('Debe seleccionar una unidad')
      return
    }

    try {
      setIsLoading(true)
      await updateLesson(lesson.id, formData)
      toast.success('Lección actualizada exitosamente')
      setOpen(false)
      onLessonUpdated()
    } catch (error) {
      console.error('Error updating lesson:', error)
      toast.error('Error al actualizar la lección')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Lección</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la lección.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Introducción a los Saludos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la lección..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module">Unidad *</Label>
                <Select
                  value={formData.moduleId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, moduleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.length === 0 ? (
                      <SelectItem value="" disabled>
                        No hay unidades disponibles
                      </SelectItem>
                    ) : (
                      modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.course.title} - {module.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Orden</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
