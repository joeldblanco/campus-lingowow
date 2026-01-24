'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface CreateActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateActivityModal({ open, onOpenChange }: CreateActivityModalProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: '1',
    activityType: 'VOCABULARY',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Por favor ingresa un nombre para la actividad')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          activityType: formData.activityType,
          level: parseInt(formData.level),
          points: 0, // Will be calculated when questions are added
          duration: 0, // Will be calculated when questions are added
          isPublished: false, // Start as draft
          tags: [],
          questions: [], // Empty initially
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la actividad')
      }

      const activity = await response.json()
      
      toast.success('Actividad creada exitosamente')
      onOpenChange(false) // Close modal
      
      // Redirect to edit page
      router.push(`/admin/activities/${activity.id}/edit`)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        level: '1',
        activityType: 'VOCABULARY',
      })
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Error al crear la actividad')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false)
      // Reset form
      setFormData({
        title: '',
        description: '',
        level: '1',
        activityType: 'VOCABULARY',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Actividad</DialogTitle>
          <DialogDescription>
            Ingresa la información básica para crear una nueva actividad. Podrás agregar preguntas y configuraciones adicionales después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nombre de la Actividad *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ej: Basic Introduction: Greetings & Introductions"
              disabled={isCreating}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe brevemente el objetivo de esta actividad..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Nivel</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => handleInputChange('level', value)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Principiante</SelectItem>
                  <SelectItem value="2">Intermedio</SelectItem>
                  <SelectItem value="3">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityType">Tipo de Actividad</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) => handleInputChange('activityType', value)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VOCABULARY">Vocabulario</SelectItem>
                  <SelectItem value="GRAMMAR">Gramática</SelectItem>
                  <SelectItem value="READING">Lectura</SelectItem>
                  <SelectItem value="LISTENING">Escucha</SelectItem>
                  <SelectItem value="SPEAKING">Habla</SelectItem>
                  <SelectItem value="WRITING">Escritura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Actividad'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
