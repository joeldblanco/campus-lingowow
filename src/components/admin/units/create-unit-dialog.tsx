'use client'

import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createModule, getAllCourses } from '@/lib/actions/modules'
import { toast } from 'sonner'
import { useEffect } from 'react'

interface Course {
  id: string
  title: string
  isPublished: boolean
}

interface CreateUnitDialogProps {
  children: React.ReactNode
  onUnitCreated: () => void
}

export function CreateUnitDialog({ children, onUnitCreated }: CreateUnitDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 1,
    order: 0,
    courseId: '',
    isPublished: false,
  })

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesData = await getAllCourses()
        setCourses(coursesData)
      } catch (error) {
        console.error('Error loading courses:', error)
        toast.error('Error al cargar los cursos')
      }
    }

    if (open) {
      loadCourses()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('El título es requerido')
      return
    }

    if (!formData.courseId) {
      toast.error('Debe seleccionar un curso')
      return
    }

    try {
      setIsLoading(true)
      await createModule(formData)
      toast.success('Unidad creada exitosamente')
      setOpen(false)
      setFormData({
        title: '',
        description: '',
        level: 1,
        order: 0,
        courseId: '',
        isPublished: false,
      })
      onUnitCreated()
    } catch (error) {
      console.error('Error creating unit:', error)
      toast.error('Error al crear la unidad')
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
          <DialogTitle>Crear Nueva Unidad</DialogTitle>
          <DialogDescription>
            Crea una nueva unidad para organizar el contenido del curso.
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
                placeholder="Ej: Introducción al Inglés Básico"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la unidad..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Curso *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <SelectItem value="" disabled>
                        No hay cursos disponibles
                      </SelectItem>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Nivel</Label>
                <Select
                  value={formData.level.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, level: parseInt(value) }))}
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
              </div>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
              />
              <Label htmlFor="published">Publicar inmediatamente</Label>
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
              {isLoading ? 'Creando...' : 'Crear Unidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
