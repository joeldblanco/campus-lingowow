'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { LibraryCategory } from '@/lib/types/library'
import {
  BookOpen,
  FileIcon,
  FileText,
  Headphones,
  Loader2,
  Save,
  Settings,
  Tag,
  Upload,
  Video,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArticleBlockEditor } from '@/components/library/article-editor'
import { ArticleContent, serializeArticleContent } from '@/lib/types/article-blocks'

type ResourceType = 'article' | 'video' | 'pdf' | 'audio' | 'lesson-plan'
type AccessLevel = 'public' | 'private' | 'premium'

const resourceTypes = [
  { id: 'article', label: 'Artículo', icon: FileText },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'pdf', label: 'PDF', icon: FileIcon },
  { id: 'audio', label: 'Audio', icon: Headphones },
  { id: 'lesson-plan', label: 'Plan de Lección', icon: BookOpen },
] as const

const languages = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'pt', label: 'Portugués' },
]

const proficiencyLevels = [
  { value: 'A1', label: 'Principiante (A1)' },
  { value: 'A2', label: 'Elemental (A2)' },
  { value: 'B1', label: 'Intermedio (B1)' },
  { value: 'B2', label: 'Intermedio Alto (B2)' },
  { value: 'C1', label: 'Avanzado (C1)' },
  { value: 'C2', label: 'Maestría (C2)' },
]

const accessLevels = [
  { value: 'public', label: 'Público', description: 'Accesible por todos' },
  { value: 'private', label: 'Privado', description: 'Solo usuarios registrados' },
  { value: 'premium', label: 'Premium', description: 'Solo suscriptores' },
]

export default function PublishResourcePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Data State
  const [categories, setCategories] = useState<LibraryCategory[]>([])

  // Form State
  const [resourceType, setResourceType] = useState<ResourceType>('article')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content] = useState('')
  const [articleContent, setArticleContent] = useState<ArticleContent>({ blocks: [], version: 1 })
  const [fileUrl, setFileUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const [isFeatured, setIsFeatured] = useState(false)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public')

  const [language, setLanguage] = useState('es')
  const [level, setLevel] = useState('A1')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    // Fetch categories
    fetch('/api/library/categories')
      .then((res) => {
        if (res.ok) return res.json()
        return []
      })
      .then((data) => setCategories(data))
      .catch((err) => console.error('Error fetching categories', err))
  }, [])

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      if (!tags.includes(newTag.trim().toLowerCase())) {
        setTags([...tags, newTag.trim().toLowerCase()])
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title) {
      toast.error('Por favor ingresa un título')
      return
    }

    setLoading(true)
    try {
      const contentToSave = (resourceType === 'article' || resourceType === 'lesson-plan')
        ? serializeArticleContent(articleContent)
        : content

      const payload = {
        title,
        excerpt: description,
        description: description,
        type: resourceType.toUpperCase(),
        content: resourceType === 'article' || resourceType === 'lesson-plan' ? contentToSave : null,
        fileUrl: resourceType !== 'article' && resourceType !== 'lesson-plan' ? fileUrl : null,
        thumbnailUrl,
        tags,
        language,
        level,
        categoryId: categoryId || null,
        status,
      }

      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/admin/library')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear el recurso')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex text-sm font-medium text-muted-foreground mb-6">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/admin" className="hover:text-primary">
                Inicio
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link href="/admin/library" className="hover:text-primary">
                Recursos
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-semibold">Nuevo Recurso</li>
          </ol>
        </nav>

        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Publicar Nuevo Recurso</h1>
            <p className="mt-2 text-muted-foreground">
              Crea y sube nuevos materiales de enseñanza para la biblioteca.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground mr-2">
              {/* Status indicator could go here */}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit('DRAFT')}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>
            {/* Preview button could be added if we implement preview mode */}

            <Button size="sm" onClick={() => handleSubmit('PUBLISHED')} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Publicar
            </Button>
          </div>
        </div>

        {/* Layout: Main Form + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resource Type Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Tipo de Recurso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {resourceTypes.map((type) => {
                    const Icon = type.icon
                    const isSelected = resourceType === type.id
                    return (
                      <button
                        key={type.id}
                        onClick={() => setResourceType(type.id)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                        type="button"
                      >
                        <Icon
                          className={`h-6 w-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                        <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                          {type.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Core Details Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Detalles del Contenido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="title">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="ej., Introducción a la Conjugación de Verbos en Francés"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción Corta</Label>
                  <Textarea
                    id="description"
                    placeholder="Resumen breve que se mostrará en los resultados de búsqueda (máx. 160 caracteres)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 160))}
                    className="mt-1.5 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-muted-foreground">{description.length}/160</span>
                  </div>
                </div>

                {/* Dynamic Content Area based on resource type */}
                <div>
                  <Label>Contenido Principal</Label>

                  {resourceType === 'article' || resourceType === 'lesson-plan' ? (
                    <div className="mt-1.5">
                      <ArticleBlockEditor
                          content={articleContent}
                          onChange={setArticleContent}
                        />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mt-1.5 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium">Sube tu archivo (PDF, Video, Audio)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Funcionalidad de subida directa pendiente)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="fileUrl">O ingresa URL del recurso *</Label>
                        <Input
                          id="fileUrl"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="https://..."
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <Label>Imagen de Portada (URL)</Label>
                  <div className="flex gap-4 items-start mt-1.5">
                    <Input
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://... (URL de la imagen)"
                    />
                  </div>
                  {thumbnailUrl && (
                    <div className="mt-2 relative w-32 h-20 rounded overflow-hidden border">
                      <Image src={thumbnailUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Access Level Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Nivel de Acceso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {accessLevels.map((lvl) => (
                    <button
                      key={lvl.value}
                      onClick={() => setAccessLevel(lvl.value as AccessLevel)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        accessLevel === lvl.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                      type="button"
                    >
                      <p
                        className={`font-medium ${accessLevel === lvl.value ? 'text-primary' : ''}`}
                      >
                        {lvl.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{lvl.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Metadata (1/3) */}
          <div className="space-y-6">
            {/* Categorization Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-primary" />
                  Categorización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nivel de Competencia</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {proficiencyLevels.map((lvl) => (
                        <SelectItem key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Etiquetas</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2 p-2 border rounded-lg bg-background min-h-[42px]">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Agregar etiqueta..."
                      className="flex-1 min-w-[80px] text-sm bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Presiona Enter para agregar una etiqueta
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-primary" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Author display could go here if available */}

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Recurso Destacado</p>
                    <p className="text-xs text-muted-foreground">Destacar en la página principal</p>
                  </div>
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
