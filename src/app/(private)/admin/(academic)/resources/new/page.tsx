'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Video,
  FileIcon,
  Headphones,
  BookOpen,
  Tag,
  Settings,
  Lightbulb,
  Eye,
  Upload,
  X,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
} from 'lucide-react'
import Link from 'next/link'

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
  { value: 'a1', label: 'Principiante (A1)' },
  { value: 'a2', label: 'Elemental (A2)' },
  { value: 'b1', label: 'Intermedio (B1)' },
  { value: 'b2', label: 'Intermedio Alto (B2)' },
  { value: 'c1', label: 'Avanzado (C1)' },
  { value: 'c2', label: 'Maestría (C2)' },
]

const categories = [
  { value: 'grammar', label: 'Gramática' },
  { value: 'vocabulary', label: 'Vocabulario' },
  { value: 'reading', label: 'Comprensión Lectora' },
  { value: 'listening', label: 'Comprensión Auditiva' },
  { value: 'culture', label: 'Cultura' },
  { value: 'business', label: 'Negocios' },
  { value: 'conversation', label: 'Conversación' },
]

const accessLevels = [
  { value: 'public', label: 'Público', description: 'Accesible por todos' },
  { value: 'private', label: 'Privado', description: 'Solo usuarios registrados' },
  { value: 'premium', label: 'Premium', description: 'Solo suscriptores' },
]

export default function PublishResourcePage() {
  const [resourceType, setResourceType] = useState<ResourceType>('article')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>(['verbos', 'práctica'])
  const [newTag, setNewTag] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public')
  const [language, setLanguage] = useState('es')
  const [level, setLevel] = useState('a1')
  const [category, setCategory] = useState('grammar')

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
              <Link href="/admin/resources" className="hover:text-primary">
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
            <span className="text-xs text-muted-foreground mr-2">Borrador guardado hace 2m</span>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
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
                    <div className="mt-1.5 border rounded-lg overflow-hidden bg-background">
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
                        <button className="p-2 rounded hover:bg-muted transition-colors" title="Negrita">
                          <Bold className="h-4 w-4" />
                        </button>
                        <button className="p-2 rounded hover:bg-muted transition-colors" title="Cursiva">
                          <Italic className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Subrayado"
                        >
                          <Underline className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <button
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Encabezado 1"
                        >
                          <Heading1 className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Encabezado 2"
                        >
                          <Heading2 className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <button
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Lista con viñetas"
                        >
                          <List className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Lista numerada"
                        >
                          <ListOrdered className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <button className="p-2 rounded hover:bg-muted transition-colors" title="Enlace">
                          <LinkIcon className="h-4 w-4" />
                        </button>
                        <button className="p-2 rounded hover:bg-muted transition-colors" title="Imagen">
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Editor Area */}
                      <div
                        className="p-4 min-h-[300px] outline-none"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        <p className="text-muted-foreground">
                          Comienza a escribir el contenido de tu artículo aquí...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Haz clic para subir o arrastra y suelta</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {resourceType === 'pdf' && 'PDF hasta 10MB'}
                        {resourceType === 'video' && 'MP4, MOV hasta 500MB o enlace de YouTube/Vimeo'}
                        {resourceType === 'audio' && 'MP3, WAV hasta 50MB'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Video/Audio URL input */}
                {(resourceType === 'video' || resourceType === 'audio') && (
                  <div>
                    <Label htmlFor="mediaUrl">O ingresa una URL externa</Label>
                    <Input
                      id="mediaUrl"
                      placeholder={
                        resourceType === 'video'
                          ? 'https://youtube.com/watch?v=...'
                          : 'https://soundcloud.com/...'
                      }
                      className="mt-1.5"
                    />
                  </div>
                )}

                {/* Thumbnail Upload */}
                <div>
                  <Label>Imagen de Portada</Label>
                  <div className="mt-1.5 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Subir imagen de portada</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 2MB</p>
                  </div>
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
                  {accessLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setAccessLevel(level.value as AccessLevel)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        accessLevel === level.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <p
                        className={`font-medium ${accessLevel === level.value ? 'text-primary' : ''}`}
                      >
                        {level.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
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
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
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
                <div>
                  <Label>Autor</Label>
                  <div className="mt-1.5 flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                    <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                      AM
                    </div>
                    <span className="text-sm font-medium">Alex Morgan</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Recurso Destacado</p>
                    <p className="text-xs text-muted-foreground">Destacar en la página principal</p>
                  </div>
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Publicando en
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>Biblioteca Principal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-6">
                <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Consejos Rápidos
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                  <li>Usa títulos claros y descriptivos.</li>
                  <li>Agrega al menos 3 etiquetas relevantes para mejor visibilidad.</li>
                  <li>Verifica los derechos de autor del contenido multimedia.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
