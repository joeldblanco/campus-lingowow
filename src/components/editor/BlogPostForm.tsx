'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogStatus } from '@prisma/client'
import { createBlogPost, updateBlogPost } from '@/lib/actions/blog'
import { Button } from '@/components/ui/button'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { BlogContentEditor } from './BlogContentEditor'
import type { BlogContent } from '@/types/blog'
import type { Prisma } from '@prisma/client'

interface BlogPostFormProps {
  initialData?: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: BlogContent
    coverImage: string | null
    category: string | null
    tags: string[]
    status: BlogStatus
    metaTitle: string | null
    metaDescription: string | null
  }
  mode: 'create' | 'edit'
}

export function BlogPostForm({ initialData, mode }: BlogPostFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || { sections: [] },
    coverImage: initialData?.coverImage || '',
    category: initialData?.category || '',
    tags: initialData?.tags?.join(', ') || '',
    status: initialData?.status || BlogStatus.DRAFT,
    metaTitle: initialData?.metaTitle || '',
    metaDescription: initialData?.metaDescription || '',
  })

  const handleSubmit = async (e: React.FormEvent, publishNow: boolean = false) => {
    e.preventDefault()
    setIsSaving(true)

    const data = {
      title: formData.title,
      excerpt: formData.excerpt || undefined,
      content: formData.content as unknown as Prisma.JsonValue,
      coverImage: formData.coverImage || undefined,
      category: formData.category || undefined,
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
      status: publishNow ? BlogStatus.PUBLISHED : formData.status,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
    }

    const result =
      mode === 'create'
        ? await createBlogPost(data)
        : await updateBlogPost(initialData!.id, data)

    if (result.success) {
      toast.success(
        mode === 'create' ? 'Artículo creado exitosamente' : 'Artículo actualizado exitosamente'
      )
      router.push('/editor/blog')
      router.refresh()
    } else {
      toast.error(result.error || 'Error al guardar el artículo')
    }

    setIsSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/editor/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar Borrador
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Publicar'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contenido del Artículo</CardTitle>
              <CardDescription>
                Escribe el contenido de tu artículo. Puedes usar Markdown para dar formato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título del artículo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Extracto</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Breve descripción del artículo (aparecerá en las vistas previas)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverImage">Imagen de Portada (URL)</Label>
                <Input
                  id="coverImage"
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="space-y-2">
                <BlogContentEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
              <CardDescription>
                Configura la categoría, etiquetas y estado del artículo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ej: Técnicas de Aprendizaje"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Etiquetas</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="fluidez, técnicas, aprendizaje (separadas por comas)"
                />
                <p className="text-xs text-muted-foreground">
                  Separa las etiquetas con comas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as BlogStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BlogStatus.DRAFT}>Borrador</SelectItem>
                    <SelectItem value={BlogStatus.PUBLISHED}>Publicado</SelectItem>
                    <SelectItem value={BlogStatus.ARCHIVED}>Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimización SEO</CardTitle>
              <CardDescription>
                Mejora la visibilidad de tu artículo en motores de búsqueda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Título</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="Título optimizado para SEO (por defecto usa el título del artículo)"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.metaTitle.length}/60 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Descripción</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, metaDescription: e.target.value })
                  }
                  placeholder="Descripción optimizada para SEO (por defecto usa el extracto)"
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.metaDescription.length}/160 caracteres
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}
