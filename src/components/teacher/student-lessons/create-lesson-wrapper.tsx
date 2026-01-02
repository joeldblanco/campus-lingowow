'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { createStudentLesson } from '@/lib/actions/student-lessons'

interface CreateLessonWrapperProps {
  studentId: string
  studentName: string
  teacherId: string
  enrollmentId: string
  courseName: string
}

export function CreateLessonWrapper({
  studentId,
  studentName,
  teacherId,
  enrollmentId,
  courseName,
}: CreateLessonWrapperProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setIsCreating(true)

    try {
      const result = await createStudentLesson({
        title: title.trim(),
        description: description.trim(),
        studentId,
        teacherId,
        enrollmentId,
        content: '[]',
        isPublished: false,
      })

      if (result.success && result.data) {
        toast.success('Lección creada. Abriendo el editor...')
        router.push(`/teacher/students/${studentId}/lessons/${result.data.id}/edit`)
      } else {
        toast.error(result.error || 'Error al crear la lección')
        setIsCreating(false)
      }
    } catch {
      toast.error('Error inesperado al crear la lección')
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    router.push('/teacher/students')
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Lección Personalizada</h1>
          <p className="text-muted-foreground">
            Para {studentName} • {courseName}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>
            Ingresa el título y descripción para comenzar a crear la lección
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Lección *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Clase 1 - Introducción al presente simple"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el contenido de esta lección..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleBack} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear y Abrir Editor
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
