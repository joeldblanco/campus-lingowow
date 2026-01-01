'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import Image from 'next/image'
import { LibraryResourceType, LibraryResourceStatus } from '@prisma/client'
import type { LibraryCategory, LibraryResource } from '@/lib/types/library'
import { RESOURCE_TYPE_LABELS } from '@/lib/types/library'

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'ja', label: 'Japonés' },
]

const LEVELS = [
  { value: 'A1', label: 'Principiante (A1)' },
  { value: 'A2', label: 'Elemental (A2)' },
  { value: 'B1', label: 'Intermedio (B1)' },
  { value: 'B2', label: 'Intermedio Alto (B2)' },
  { value: 'C1', label: 'Avanzado (C1)' },
  { value: 'C2', label: 'Maestría (C2)' },
]

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    excerpt: '',
    type: 'ARTICLE' as LibraryResourceType,
    content: '',
    fileUrl: '',
    fileSize: '',
    fileFormat: '',
    thumbnailUrl: '',
    duration: '',
    language: 'es',
    level: '',
    tags: '',
    categoryId: '',
    metaTitle: '',
    metaDescription: '',
    status: 'DRAFT' as LibraryResourceStatus,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resourceRes, categoriesRes] = await Promise.all([
          fetch(`/api/library/${id}`),
          fetch('/api/library/categories'),
        ])

        if (categoriesRes.ok) {
          const cats = await categoriesRes.json()
          setCategories(cats)
        }

        if (resourceRes.ok) {
          const data = await resourceRes.json()
          const resource: LibraryResource = data.resource
          
          setFormData({
            title: resource.title,
            description: resource.description || '',
            excerpt: resource.excerpt || '',
            type: resource.type,
            content: resource.content || '',
            fileUrl: resource.fileUrl || '',
            fileSize: resource.fileSize?.toString() || '',
            fileFormat: resource.fileFormat || '',
            thumbnailUrl: resource.thumbnailUrl || '',
            duration: resource.duration ? (resource.duration / 60).toString() : '',
            language: resource.language,
            level: resource.level || '',
            tags: resource.tags.join(', '),
            categoryId: resource.categoryId || '',
            metaTitle: resource.metaTitle || '',
            metaDescription: resource.metaDescription || '',
            status: resource.status,
          })
        } else {
          router.push('/admin/library')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/admin/library')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, router])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : null,
        duration: formData.duration ? parseInt(formData.duration) * 60 : null,
        categoryId: formData.categoryId || null,
        status: publish ? 'PUBLISHED' : formData.status,
      }

      const response = await fetch(`/api/library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push('/admin/library')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al actualizar el recurso')
      }
    } catch (error) {
      console.error('Error updating resource:', error)
      alert('Error al actualizar el recurso')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/library')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar el recurso')
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Error al eliminar el recurso')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const showContentField = formData.type === 'ARTICLE'
  const showFileFields = ['PDF', 'IMAGE', 'AUDIO', 'VIDEO', 'INFOGRAPHIC', 'TEMPLATE', 'EXERCISE_SHEET'].includes(formData.type)
  const showDurationField = ['AUDIO', 'VIDEO'].includes(formData.type)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/library">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Editar Recurso</h1>
            <p className="text-muted-foreground">
              Modifica los datos del recurso
            </p>
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El recurso será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Título del recurso"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Resumen corto</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => handleChange('excerpt', e.target.value)}
                    placeholder="Breve descripción para listados"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descripción detallada del recurso"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {showContentField && (
              <Card>
                <CardHeader>
                  <CardTitle>Contenido del Artículo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido HTML</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleChange('content', e.target.value)}
                      placeholder="<h2>Título</h2><p>Contenido...</p>"
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {showFileFields && (
              <Card>
                <CardHeader>
                  <CardTitle>Archivo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fileUrl">URL del archivo</Label>
                    <Input
                      id="fileUrl"
                      value={formData.fileUrl}
                      onChange={(e) => handleChange('fileUrl', e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fileFormat">Formato</Label>
                      <Input
                        id="fileFormat"
                        value={formData.fileFormat}
                        onChange={(e) => handleChange('fileFormat', e.target.value)}
                        placeholder="pdf, mp3, mp4..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fileSize">Tamaño (bytes)</Label>
                      <Input
                        id="fileSize"
                        value={formData.fileSize}
                        onChange={(e) => handleChange('fileSize', e.target.value)}
                        type="number"
                      />
                    </div>
                  </div>

                  {showDurationField && (
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duración (minutos)</Label>
                      <Input
                        id="duration"
                        value={formData.duration}
                        onChange={(e) => handleChange('duration', e.target.value)}
                        type="number"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta título</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => handleChange('metaTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta descripción</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleChange('metaDescription', e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publicación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="PUBLISHED">Publicado</SelectItem>
                      <SelectItem value="ARCHIVED">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="flex-1"
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={saving}
                    onClick={(e) => handleSubmit(e, true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Publicar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clasificación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de recurso</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Categoría</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleChange('categoryId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => handleChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Nivel</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => handleChange('level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Etiquetas</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="gramática, verbos..."
                  />
                  <p className="text-xs text-muted-foreground">Separadas por comas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imagen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">URL de miniatura</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
                    type="url"
                  />
                </div>
                {formData.thumbnailUrl && (
                  <div className="mt-4">
                    <Image
                      src={formData.thumbnailUrl}
                      alt="Vista previa"
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
