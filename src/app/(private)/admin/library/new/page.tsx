'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { LibraryResourceType, LibraryResourceStatus } from '@prisma/client'
import type { LibraryCategory } from '@/lib/types/library'
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

export default function NewResourcePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/library/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : null,
        duration: formData.duration ? parseInt(formData.duration) * 60 : null,
        categoryId: formData.categoryId || null,
        status: publish ? 'PUBLISHED' : formData.status,
      }

      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push('/admin/library')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear el recurso')
      }
    } catch (error) {
      console.error('Error creating resource:', error)
      alert('Error al crear el recurso')
    } finally {
      setLoading(false)
    }
  }

  const showContentField = formData.type === 'ARTICLE'
  const showFileFields = ['PDF', 'IMAGE', 'AUDIO', 'VIDEO', 'INFOGRAPHIC', 'TEMPLATE', 'EXERCISE_SHEET'].includes(formData.type)
  const showDurationField = ['AUDIO', 'VIDEO'].includes(formData.type)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/library">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Recurso</h1>
          <p className="text-muted-foreground">
            Crea un nuevo recurso para la biblioteca
          </p>
        </div>
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
                    placeholder="Breve descripción para listados (máx. 200 caracteres)"
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
                      placeholder="<h2>Título</h2><p>Contenido del artículo...</p>"
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Puedes usar HTML para dar formato al contenido
                    </p>
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
                    <Label htmlFor="fileUrl">URL del archivo *</Label>
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
                        placeholder="1048576"
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
                        placeholder="15"
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
                    placeholder="Título para motores de búsqueda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta descripción</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleChange('metaDescription', e.target.value)}
                    placeholder="Descripción para motores de búsqueda"
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
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={loading}
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
                  <Label htmlFor="type">Tipo de recurso *</Label>
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
                      <SelectValue placeholder="Seleccionar categoría" />
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
                      <SelectValue placeholder="Seleccionar nivel" />
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
                    placeholder="gramática, verbos, subjuntivo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separadas por comas
                  </p>
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
                    placeholder="https://..."
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
