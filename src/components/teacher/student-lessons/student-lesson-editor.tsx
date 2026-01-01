'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  createStudentLesson,
  updateStudentLesson,
} from '@/lib/actions/student-lessons'
import type { CreateStudentLessonInput, UpdateStudentLessonInput } from '@/types/student-lesson'

interface StudentLessonEditorProps {
  mode: 'create' | 'edit'
  studentId: string
  studentName: string
  teacherId: string
  enrollmentId: string
  courseName: string
  initialData?: {
    id: string
    title: string
    description: string
    duration: number
    content: string
    videoUrl: string | null
    summary: string | null
    transcription: string | null
    isPublished: boolean
  }
}

export function StudentLessonEditor({
  mode,
  studentId,
  studentName,
  teacherId,
  enrollmentId,
  courseName,
  initialData,
}: StudentLessonEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    duration: initialData?.duration || 30,
    content: initialData?.content || '[]',
    videoUrl: initialData?.videoUrl || '',
    summary: initialData?.summary || '',
    transcription: initialData?.transcription || '',
    isPublished: initialData?.isPublished || false,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setIsSaving(true)

    try {
      if (mode === 'create') {
        const data: CreateStudentLessonInput = {
          title: formData.title,
          description: formData.description,
          duration: formData.duration,
          content: formData.content,
          videoUrl: formData.videoUrl || undefined,
          summary: formData.summary || undefined,
          transcription: formData.transcription || undefined,
          isPublished: formData.isPublished,
          studentId,
          teacherId,
          enrollmentId,
        }

        const result = await createStudentLesson(data)

        if (result.success) {
          toast.success('Lección creada exitosamente')
          router.push(`/teacher/students`)
          router.refresh()
        } else {
          toast.error(result.error || 'Error al crear la lección')
        }
      } else if (initialData) {
        const data: UpdateStudentLessonInput = {
          id: initialData.id,
          title: formData.title,
          description: formData.description,
          duration: formData.duration,
          content: formData.content,
          videoUrl: formData.videoUrl || undefined,
          summary: formData.summary || undefined,
          transcription: formData.transcription || undefined,
          isPublished: formData.isPublished,
        }

        const result = await updateStudentLesson(data)

        if (result.success) {
          toast.success('Lección actualizada exitosamente')
          router.push(`/teacher/students`)
          router.refresh()
        } else {
          toast.error(result.error || 'Error al actualizar la lección')
        }
      }
    } catch {
      toast.error('Error inesperado al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.push(`/teacher/students`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Nueva Lección' : 'Editar Lección'}
            </h1>
            <p className="text-muted-foreground">
              Para {studentName} • {courseName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {formData.isPublished ? (
              <Eye className="h-4 w-4 text-green-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="isPublished" className="text-sm">
              {formData.isPublished ? 'Publicada' : 'Borrador'}
            </Label>
            <Switch
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isPublished: checked }))
              }
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>
                Configura el título y descripción de la lección
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ej: Clase 1 - Introducción al presente simple"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe brevemente el contenido de esta lección..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumen (visible al estudiante)</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  placeholder="Un resumen corto que el estudiante verá al inicio de la lección..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenido Multimedia</CardTitle>
              <CardDescription>
                Agrega video y transcripción para la lección
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL del Video</Label>
                <Input
                  id="videoUrl"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Puedes usar URLs de YouTube, Vimeo o videos directos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcription">Transcripción</Label>
                <Textarea
                  id="transcription"
                  name="transcription"
                  value={formData.transcription}
                  onChange={handleChange}
                  placeholder="Transcripción del video o audio..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenido de la Lección</CardTitle>
              <CardDescription>
                Usa el editor de bloques para crear el contenido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 min-h-[200px] bg-muted/30">
                <p className="text-sm text-muted-foreground text-center py-8">
                  El editor de bloques estará disponible aquí.
                  <br />
                  Por ahora, puedes editar el JSON directamente:
                </p>
                <Textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder='[{"type": "text", "content": "..."}]'
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración estimada (minutos)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={1}
                  value={formData.duration}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estudiante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{studentName}</p>
                <p className="text-sm text-muted-foreground">{courseName}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">Publicar lección</span>
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPublished: checked }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formData.isPublished
                  ? 'El estudiante puede ver esta lección'
                  : 'Solo tú puedes ver esta lección'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
