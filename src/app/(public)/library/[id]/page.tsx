'use client'

import { useState, useEffect, use } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Home,
  ChevronRight,
  Bookmark,
  Share2,
  Download,
  Play,
  Heart,
  Video,
  FileText,
  Headphones,
  FileIcon,
  Image as ImageIcon,
  BarChart3,
  FileCode,
  ClipboardList,
  BookOpen,
  List,
  File,
  Eye,
  Calendar,
  ArrowLeft,
  Lock,
  Crown,
  Sparkles,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  MessageCircle,
  GraduationCap,
  Users,
  Globe,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LibraryResourceType, LibraryResourceAccess } from '@prisma/client'
import type { LibraryResource, LibraryResourceDetailResponse } from '@/lib/types/library'
import { RESOURCE_TYPE_LABELS, ACCESS_LEVEL_DESCRIPTIONS } from '@/lib/types/library'
import { ArticleBlockRenderer } from '@/components/library/article-editor'
import { parseArticleContent } from '@/lib/types/article-blocks'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import type { Block } from '@/types/course-builder'
import { processHtmlLinks } from '@/lib/utils'

interface ExtendedLibraryResourceDetailResponse extends LibraryResourceDetailResponse {
  accessRestricted?: boolean
  requiredAccess?: LibraryResourceAccess
  userAccess?: {
    accessibleLevels: LibraryResourceAccess[]
    hasActiveSubscription: boolean
    hasPremiumPlan: boolean
  }
}

const getTypeIcon = (type: LibraryResourceType, className = 'h-4 w-4') => {
  const iconMap: Record<LibraryResourceType, React.ReactNode> = {
    ARTICLE: <FileText className={className} />,
    PDF: <FileIcon className={className} />,
    IMAGE: <ImageIcon className={className} />,
    AUDIO: <Headphones className={className} />,
    VIDEO: <Video className={className} />,
    INFOGRAPHIC: <BarChart3 className={className} />,
    TEMPLATE: <FileCode className={className} />,
    EXERCISE_SHEET: <ClipboardList className={className} />,
    GRAMMAR_GUIDE: <BookOpen className={className} />,
    VOCABULARY_LIST: <List className={className} />,
    OTHER: <File className={className} />,
  }
  return iconMap[type] || <File className={className} />
}

const formatDate = (date: Date | string | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}min`
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  ja: 'Japonés',
}

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [resource, setResource] = useState<LibraryResource | null>(null)
  const [relatedResources, setRelatedResources] = useState<LibraryResource[]>([])
  const [userInteraction, setUserInteraction] = useState<{
    hasLiked: boolean
    hasSaved: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [accessRestricted, setAccessRestricted] = useState(false)
  const [requiredAccess, setRequiredAccess] = useState<LibraryResourceAccess | null>(null)

  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/library/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Recurso no encontrado')
          } else {
            setError('Error al cargar el recurso')
          }
          return
        }

        const data: ExtendedLibraryResourceDetailResponse = await response.json()
        setResource(data.resource)
        setRelatedResources(data.relatedResources)
        setUserInteraction(data.userInteraction)
        setAccessRestricted(data.accessRestricted || false)
        setRequiredAccess(data.requiredAccess || null)
      } catch (err) {
        console.error('Error fetching resource:', err)
        setError('Error al cargar el recurso')
      } finally {
        setLoading(false)
      }
    }

    fetchResource()
  }, [id])

  const handleLike = async () => {
    if (!resource || isLiking) return

    setIsLiking(true)
    try {
      const response = await fetch(`/api/library/${resource.id}/like`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setUserInteraction((prev) =>
          prev ? { ...prev, hasLiked: data.liked } : { hasLiked: data.liked, hasSaved: false }
        )
        setResource((prev) =>
          prev
            ? {
                ...prev,
                likeCount: data.liked ? prev.likeCount + 1 : prev.likeCount - 1,
              }
            : null
        )
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    } finally {
      setIsLiking(false)
    }
  }

  const handleSave = async () => {
    if (!resource || isSaving) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/library/${resource.id}/save`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setUserInteraction((prev) =>
          prev ? { ...prev, hasSaved: data.saved } : { hasLiked: false, hasSaved: data.saved }
        )
      }
    } catch (err) {
      console.error('Error toggling save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (resource?.fileUrl) {
      window.open(resource.fileUrl, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share && resource) {
      try {
        await navigator.share({
          title: resource.title,
          text: resource.description || '',
          url: window.location.href,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-6 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-[400px] w-full rounded-xl" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-4 space-y-8">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">{error || 'Recurso no encontrado'}</h1>
            <p className="text-muted-foreground mb-6">
              El recurso que buscas no existe o ha sido eliminado.
            </p>
            <Button onClick={() => router.push('/library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Biblioteca
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const renderMediaContent = () => {
    switch (resource.type) {
      case 'VIDEO':
        return (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-muted group">
            {resource.fileUrl ? (
              <video
                src={resource.fileUrl}
                controls
                className="w-full h-full object-cover"
                poster={resource.thumbnailUrl || undefined}
              />
            ) : (
              <>
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{
                    backgroundImage: resource.thumbnailUrl
                      ? `url('${resource.thumbnailUrl}')`
                      : "url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200')",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button className="absolute inset-0 flex items-center justify-center group">
                  <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 group-hover:bg-white/30 transition-all shadow-xl group-hover:scale-110">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </button>
              </>
            )}
          </div>
        )

      case 'AUDIO':
        return (
          <div className="w-full p-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
            <div className="flex items-center gap-6 mb-6">
              <div className="size-24 bg-white/20 rounded-xl flex items-center justify-center">
                <Headphones className="h-12 w-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{resource.title}</h3>
                {resource.duration && (
                  <p className="text-white/80">{formatDuration(resource.duration)}</p>
                )}
              </div>
            </div>
            {resource.fileUrl && <audio src={resource.fileUrl} controls className="w-full" />}
          </div>
        )

      case 'IMAGE':
      case 'INFOGRAPHIC':
        return (
          <div className="w-full rounded-xl overflow-hidden shadow-lg">
            <Image
              src={resource.fileUrl || resource.thumbnailUrl || ''}
              alt={resource.title}
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>
        )

      case 'PDF':
        return (
          <div className="w-full p-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white">
            <div className="flex items-center gap-6">
              <div className="size-24 bg-white/20 rounded-xl flex items-center justify-center">
                <FileIcon className="h-12 w-12" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{resource.title}</h3>
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
                  {resource.fileFormat && <span className="uppercase">{resource.fileFormat}</span>}
                </div>
              </div>
              <Button variant="secondary" size="lg" onClick={handleDownload} className="shrink-0">
                <Download className="h-5 w-5 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        )

      default:
        if (resource.thumbnailUrl) {
          return (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
              <Image
                src={resource.thumbnailUrl}
                alt={resource.title}
                fill
                className="object-cover"
              />
            </div>
          )
        }
        return null
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex mb-6">
          <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="inline-flex items-center text-muted-foreground hover:text-primary"
              >
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Link
                  href="/library"
                  className="ml-1 text-muted-foreground hover:text-primary md:ml-2"
                >
                  Biblioteca
                </Link>
              </div>
            </li>
            {resource.category && (
              <li>
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/library?category=${resource.category.slug}`}
                    className="ml-1 text-muted-foreground hover:text-primary md:ml-2"
                  >
                    {resource.category.name}
                  </Link>
                </div>
              </li>
            )}
            <li aria-current="page">
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="ml-1 font-medium md:ml-2 truncate max-w-[200px]">
                  {resource.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Area */}
          <article className="lg:col-span-8 flex flex-col gap-6">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="secondary" className="gap-1">
                  {getTypeIcon(resource.type, 'h-3 w-3')}
                  {RESOURCE_TYPE_LABELS[resource.type]}
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  {LANGUAGE_LABELS[resource.language] || resource.language}
                </Badge>
                {resource.level && (
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 border-purple-200"
                  >
                    {resource.level}
                  </Badge>
                )}
                {resource.category && <Badge variant="outline">{resource.category.name}</Badge>}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                {resource.title}
              </h1>

              {resource.description && (
                <div 
                  className="text-xl text-muted-foreground leading-relaxed prose prose-lg max-w-none prose-p:my-2 prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ 
                    __html: processHtmlLinks(resource.description
                      .replace(/\n/g, '<br />')
                      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*([^*]+)\*/g, '<em>$1</em>'))
                  }}
                />
              )}

              {/* Author & Metadata Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b">
                <div className="flex items-center gap-3">
                  {resource.author.image ? (
                    <Image
                      src={resource.author.image}
                      alt={resource.author.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {resource.author.name.charAt(0)}
                      {resource.author.lastName?.charAt(0) || ''}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {resource.author.name} {resource.author.lastName}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(resource.publishedAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {resource.viewCount} vistas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    disabled={isLiking}
                    title="Me gusta"
                  >
                    <Heart
                      className={`h-5 w-5 ${userInteraction?.hasLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                  <span className="text-sm text-muted-foreground">{resource.likeCount}</span>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSave}
                    disabled={isSaving}
                    title="Guardar para después"
                  >
                    <Bookmark
                      className={`h-5 w-5 ${userInteraction?.hasSaved ? 'fill-current' : ''}`}
                    />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={handleShare} title="Compartir">
                    <Share2 className="h-5 w-5" />
                  </Button>

                  {resource.fileUrl &&
                    ['PDF', 'TEMPLATE', 'EXERCISE_SHEET'].includes(resource.type) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDownload}
                        title="Descargar"
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    )}
                </div>
              </div>
            </div>

            {/* Main Media */}
            {renderMediaContent()}

            {/* Access Restriction Banner */}
            {accessRestricted && (
              <Card className="border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center py-8">
                    <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                      {requiredAccess === 'PREMIUM' ? (
                        <Crown className="h-8 w-8 text-amber-600" />
                      ) : (
                        <Lock className="h-8 w-8 text-amber-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {requiredAccess === 'PREMIUM'
                        ? 'Contenido Premium'
                        : 'Contenido para Suscriptores'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      {requiredAccess === 'PREMIUM'
                        ? ACCESS_LEVEL_DESCRIPTIONS.PREMIUM
                        : ACCESS_LEVEL_DESCRIPTIONS.PRIVATE}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/pricing">
                        <Button className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          {requiredAccess === 'PREMIUM' ? 'Obtener Plan Wow' : 'Ver Planes'}
                        </Button>
                      </Link>
                      <Link href="/library">
                        <Button variant="outline">Explorar Recursos Gratuitos</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Area - Only show if not restricted */}
            {!accessRestricted && resource.content && (
              <>
                {(() => {
                  try {
                    const parsed = JSON.parse(resource.content)
                    
                    // Check if it has blocks array
                    if (parsed.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
                      // First check if it's Article format by looking for article-exclusive types
                      const articleExclusiveTypes = ['heading', 'key-rule', 'grammar-table', 'examples-in-context', 'callout', 'divider']
                      const hasArticleExclusiveType = parsed.blocks.some((block: { type?: string }) => 
                        block.type && articleExclusiveTypes.includes(block.type)
                      )
                      
                      if (hasArticleExclusiveType) {
                        // It's an Article format
                        const articleContent = parseArticleContent(resource.content)
                        return <ArticleBlockRenderer content={articleContent} />
                      }
                      
                      // Check if it's Course Builder format by looking for course-builder-exclusive types
                      const courseBuilderExclusiveTypes = ['title', 'audio', 'quiz', 'assignment', 'file', 'embed', 'grammar', 'vocabulary', 'fill_blanks', 'match', 'true_false', 'essay', 'short_answer', 'multi_select', 'multiple_choice', 'ordering', 'drag_drop', 'recording', 'structured-content', 'grammar-visualizer', 'teacher_notes', 'tab_group', 'layout', 'block_group']
                      const hasCourseBuilderExclusiveType = parsed.blocks.some((block: { type?: string }) => 
                        block.type && courseBuilderExclusiveTypes.includes(block.type)
                      )
                      
                      if (hasCourseBuilderExclusiveType) {
                        // Render using BlockPreview from Course Builder
                        return (
                          <div className="space-y-6">
                            {(parsed.blocks as Block[]).map((block: Block) => (
                              <BlockPreview key={block.id} block={block} hideBlockHeader={true} />
                            ))}
                          </div>
                        )
                      }
                      
                      // If we can't determine the format by exclusive types, check for format-specific properties
                      // Course Builder text blocks have 'format' property, video/audio have 'duration'
                      // Article text blocks don't have 'format', and use simpler structure
                      const hasCourseBuilderProperties = parsed.blocks.some((block: { type?: string; format?: string; duration?: number }) => 
                        block.format !== undefined || block.duration !== undefined
                      )
                      
                      if (hasCourseBuilderProperties) {
                        return (
                          <div className="space-y-6">
                            {(parsed.blocks as Block[]).map((block: Block) => (
                              <BlockPreview key={block.id} block={block} hideBlockHeader={true} />
                            ))}
                          </div>
                        )
                      }
                      
                      // Default to Course Builder format since BlockPreview handles more block types gracefully
                      return (
                        <div className="space-y-6">
                          {(parsed.blocks as Block[]).map((block: Block) => (
                            <BlockPreview key={block.id} block={block} hideBlockHeader={true} />
                          ))}
                        </div>
                      )
                    }
                  } catch {
                    // Not JSON, fall through to HTML rendering
                  }
                  
                  // Fallback to HTML rendering for legacy content
                  return (
                    <div
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: processHtmlLinks(resource.content || '') }}
                    />
                  )
                })()}
              </>
            )}

            {/* Tags */}
            {resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {resource.tags.map((tag) => (
                  <Link key={tag} href={`/library?search=${tag}`}>
                    <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Social Share Buttons */}
            <div className="pt-6 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Compartir este recurso
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
                      '_blank',
                      'width=600,height=400'
                    )
                  }}
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const text = encodeURIComponent(resource.title)
                    window.open(
                      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
                      '_blank',
                      'width=600,height=400'
                    )
                  }}
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    window.open(
                      `https://linkedin.com/sharing/share-offsite/?url=${url}`,
                      '_blank',
                      'width=600,height=400'
                    )
                  }}
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const text = encodeURIComponent(resource.title)
                    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast.success('¡Enlace copiado!')
                  }}
                >
                  <Link2 className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>

            {/* Lingowow CTA Banner */}
            <div className="mt-8 p-8 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-primary/20">
              <div className="text-center max-w-2xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Aprende inglés con profesores expertos
                </h3>
                <p className="text-muted-foreground mb-6">
                  Clases personalizadas 1 a 1 con tutores certificados. Mejora tu fluidez con
                  práctica real.
                </p>
                <Link href="/demo">
                  <Button size="lg" className="gap-2 px-8">
                    <GraduationCap className="h-5 w-5" />
                    Comienza Ahora
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    +500 estudiantes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    Tutores de todo el mundo
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Clases personalizadas
                  </span>
                </div>
              </div>
            </div>

            {/* Related Articles Section (Full Width) */}
            {relatedResources.length > 0 && (
              <div className="mt-12 pt-8 border-t">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Artículos Relacionados</h3>
                  <Link
                    href="/library"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Ver más recursos →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedResources.slice(0, 3).map((related) => (
                    <Link key={related.id} href={`/library/${related.slug}`} className="group">
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                        <div
                          className="h-40 bg-cover bg-center relative"
                          style={{
                            backgroundImage: related.thumbnailUrl
                              ? `url('${related.thumbnailUrl}')`
                              : `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400')`,
                          }}
                        >
                          {related.type === 'VIDEO' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="size-12 bg-white/90 rounded-full flex items-center justify-center">
                                <Play className="h-5 w-5 text-primary fill-primary" />
                              </div>
                            </div>
                          )}
                          <Badge className="absolute top-3 left-3" variant="secondary">
                            {RESOURCE_TYPE_LABELS[related.type]}
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {related.title}
                          </h4>
                          {related.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {related.excerpt}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {/* About Author Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Sobre el Autor</h3>
                <div className="flex items-start gap-4 mb-4">
                  {resource.author.image ? (
                    <Image
                      src={resource.author.image}
                      alt={resource.author.name}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                      {resource.author.name.charAt(0)}
                      {resource.author.lastName?.charAt(0) || ''}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold">
                      {resource.author.name} {resource.author.lastName}
                    </h4>
                    {resource.author.bio && (
                      <p className="text-sm text-muted-foreground mt-1">{resource.author.bio}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Resources */}
            {relatedResources.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Recursos Relacionados</h3>
                    <Link
                      href="/library"
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Ver todos
                    </Link>
                  </div>
                  <div className="flex flex-col gap-4">
                    {relatedResources.map((related) => (
                      <Link
                        key={related.id}
                        href={`/library/${related.slug}`}
                        className="group flex gap-3 items-start p-2 -mx-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <div
                          className="rounded-md w-24 h-16 shrink-0 shadow-sm bg-cover bg-center group-hover:opacity-90 transition-opacity relative"
                          style={{
                            backgroundImage: related.thumbnailUrl
                              ? `url('${related.thumbnailUrl}')`
                              : `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200')`,
                          }}
                        >
                          {related.type === 'VIDEO' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="h-5 w-5 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {related.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            {getTypeIcon(related.type, 'h-3 w-3')}
                            {RESOURCE_TYPE_LABELS[related.type]}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Promo Card */}
            <Card className="bg-gradient-to-br from-primary to-blue-600 text-white border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative z-10">
                <h3 className="text-lg font-bold mb-2">¿Quieres practicar en vivo?</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Reserva una sesión 1 a 1 con un tutor para practicar tus habilidades de
                  conversación.
                </p>
                <Link href="/demo">
                  <Button variant="secondary" className="w-full">
                    Encontrar un Tutor
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
