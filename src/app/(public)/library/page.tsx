'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  BookOpen,
  FileText,
  Video,
  FileIcon,
  Headphones,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Globe,
  Briefcase,
  Calendar,
  Image,
  BarChart3,
  FileCode,
  ClipboardList,
  List,
  File,
  Eye,
  Download,
  Heart,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { LibraryResourceType } from '@prisma/client'
import type { LibraryResource, LibraryCategory, LibraryResourcesResponse } from '@/lib/types/library'
import { RESOURCE_TYPE_LABELS } from '@/lib/types/library'

const defaultCategories = [
  { id: 'all', slug: 'all', name: 'Todos los Recursos', icon: 'BookOpen' },
]

const resourceFormats: { id: LibraryResourceType; label: string; icon: string }[] = [
  { id: 'ARTICLE', label: 'Artículo', icon: 'FileText' },
  { id: 'VIDEO', label: 'Video', icon: 'Video' },
  { id: 'PDF', label: 'PDF', icon: 'FileIcon' },
  { id: 'AUDIO', label: 'Audio', icon: 'Headphones' },
  { id: 'IMAGE', label: 'Imagen', icon: 'Image' },
  { id: 'INFOGRAPHIC', label: 'Infografía', icon: 'BarChart3' },
]

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  FileText,
  Video,
  FileIcon,
  Headphones,
  Image,
  BarChart3,
  FileCode,
  ClipboardList,
  List,
  File,
  Globe,
  Briefcase,
}

const getTypeIcon = (type: LibraryResourceType) => {
  const iconMap: Record<LibraryResourceType, React.ReactNode> = {
    ARTICLE: <FileText className="h-3.5 w-3.5" />,
    PDF: <FileIcon className="h-3.5 w-3.5" />,
    IMAGE: <Image className="h-3.5 w-3.5" />,
    AUDIO: <Headphones className="h-3.5 w-3.5" />,
    VIDEO: <Video className="h-3.5 w-3.5" />,
    INFOGRAPHIC: <BarChart3 className="h-3.5 w-3.5" />,
    TEMPLATE: <FileCode className="h-3.5 w-3.5" />,
    EXERCISE_SHEET: <ClipboardList className="h-3.5 w-3.5" />,
    GRAMMAR_GUIDE: <BookOpen className="h-3.5 w-3.5" />,
    VOCABULARY_LIST: <List className="h-3.5 w-3.5" />,
    OTHER: <File className="h-3.5 w-3.5" />,
  }
  return iconMap[type] || <File className="h-3.5 w-3.5" />
}

const formatDate = (date: Date | string | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatViewCount = (count: number) => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k vistas`
  }
  return `${count} vistas`
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}min`
}

export default function LibraryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [featuredResource, setFeaturedResource] = useState<LibraryResource | null>(null)
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedFormats, setSelectedFormats] = useState<LibraryResourceType[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [language, setLanguage] = useState(searchParams.get('language') || 'es')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/library/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  const fetchResources = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      params.set('sort', sortBy)
      params.set('featured', 'true')
      
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      if (selectedFormats.length === 1) {
        params.set('type', selectedFormats[0])
      }
      if (selectedLevels.length > 0) {
        params.set('level', selectedLevels[0])
      }
      if (language) {
        params.set('language', language)
      }

      const response = await fetch(`/api/library?${params.toString()}`)
      if (response.ok) {
        const data: LibraryResourcesResponse = await response.json()
        setResources(data.resources)
        setFeaturedResource(data.featuredResource)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sortBy, selectedCategory, searchQuery, selectedFormats, selectedLevels, language])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const toggleFormat = (formatId: LibraryResourceType) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId) ? prev.filter((f) => f !== formatId) : [...prev, formatId]
    )
  }

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchResources()
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const allCategories = [
    ...defaultCategories,
    ...categories.map(cat => ({
      id: cat.slug,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon || 'BookOpen',
    })),
  ]

  const popularResources = resources.slice(0, 3)
  const latestResources = resources.slice(3)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="flex flex-1">
        {/* Sidebar Navigation & Filters */}
        <aside className="hidden lg:flex w-72 flex-col gap-8 border-r bg-background p-6 overflow-y-auto sticky top-16 h-[calc(100vh-64px)]">
          {/* Categories */}
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-bold">Categorías</h3>
              <p className="text-muted-foreground text-xs mt-1">Filtrar recursos por tema</p>
            </div>
            <div className="flex flex-col gap-2">
              {allCategories.map((cat) => {
                const Icon = IconMap[cat.icon] || BookOpen
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Proficiency Level */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Nivel de Competencia
            </h3>
            <div className="space-y-3">
              {[
                { id: 'A1,A2', label: 'Principiante (A1-A2)' },
                { id: 'B1,B2', label: 'Intermedio (B1-B2)' },
                { id: 'C1,C2', label: 'Avanzado (C1-C2)' },
              ].map((level) => (
                <label key={level.id} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={selectedLevels.includes(level.id)}
                    onCheckedChange={() => toggleLevel(level.id)}
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    {level.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resource Type */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Formato
            </h3>
            <div className="flex flex-wrap gap-2">
              {resourceFormats.map((format) => {
                const Icon = IconMap[format.icon] || File
                const isSelected = selectedFormats.includes(format.id)
                return (
                  <button
                    key={format.id}
                    onClick={() => toggleFormat(format.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted border-transparent hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {format.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language Selector */}
          <div className="mt-auto bg-muted/50 p-4 rounded-xl">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Idioma de Aprendizaje
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">Inglés</SelectItem>
                <SelectItem value="fr">Francés</SelectItem>
                <SelectItem value="de">Alemán</SelectItem>
                <SelectItem value="ja">Japonés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12 max-w-[1600px] mx-auto w-full">
          {/* Header & Search */}
          <section className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  Biblioteca de Recursos
                </h1>
                <p className="text-muted-foreground">
                  Descubre artículos, videos y guías para dominar tu idioma objetivo.
                </p>
              </div>
            </div>

            {/* Large Search Bar */}
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-24 py-6 text-lg rounded-xl"
                placeholder="Buscar guías de gramática, listas de vocabulario o consejos culturales..."
              />
              <Button type="submit" className="absolute inset-y-2 right-2 px-6">Buscar</Button>
            </form>
          </section>

          {/* Featured/Hero Resource */}
          {loading ? (
            <section className="mb-12">
              <Skeleton className="w-full h-[360px] rounded-2xl" />
            </section>
          ) : featuredResource ? (
            <section className="mb-12">
              <Link href={`/library/${featuredResource.slug}`}>
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 text-white min-h-[360px] flex items-end group cursor-pointer shadow-lg">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: featuredResource.thumbnailUrl 
                        ? `url('${featuredResource.thumbnailUrl}')`
                        : "url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200')",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                  <div className="relative z-10 p-8 md:p-10 w-full max-w-3xl">
                    <Badge className="mb-4 bg-blue-900/60 text-blue-200 border-blue-500/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Destacado
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight group-hover:text-blue-200 transition-colors">
                      {featuredResource.title}
                    </h2>
                    <p className="text-slate-200 text-lg mb-6 line-clamp-2">
                      {featuredResource.description || featuredResource.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        {featuredResource.author.image ? (
                          <img 
                            src={featuredResource.author.image} 
                            alt={featuredResource.author.name}
                            className="size-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-6 rounded-full bg-primary/20" />
                        )}
                        <span>Por {featuredResource.author.name} {featuredResource.author.lastName}</span>
                      </div>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {formatViewCount(featuredResource.viewCount)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(featuredResource.publishedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          {/* Popular Resources Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Recursos Populares
              </h2>
              <button
                onClick={() => setSortBy('popular')}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1 group"
              >
                Ver todos{' '}
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-video" />
                    <CardContent className="p-5">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularResources.map((resource) => (
                  <Link key={resource.id} href={`/library/${resource.slug}`}>
                    <Card className="group overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full">
                      <div className="relative aspect-video overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{
                            backgroundImage: resource.thumbnailUrl
                              ? `url('${resource.thumbnailUrl}')`
                              : `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600')`,
                          }}
                        />
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="gap-1 bg-white/90 text-foreground">
                            {getTypeIcon(resource.type)}
                            {RESOURCE_TYPE_LABELS[resource.type]}
                          </Badge>
                        </div>
                        {resource.duration && (
                          <div className="absolute bottom-3 right-3">
                            <Badge variant="secondary" className="bg-black/70 text-white">
                              {formatDuration(resource.duration)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        {resource.category && (
                          <Badge variant="outline" className="mb-2 text-primary">
                            {resource.category.name}
                          </Badge>
                        )}
                        <h3 className="text-lg font-bold mb-2 leading-snug group-hover:text-primary transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                          {resource.excerpt || resource.description}
                        </p>
                        <div className="pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {resource.author.image ? (
                              <img 
                                src={resource.author.image} 
                                alt={resource.author.name}
                                className="size-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-6 rounded-full bg-primary/20" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {resource.author.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {resource.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {resource.likeCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Latest Additions Section */}
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {sortBy === 'popular' ? 'Todos los Recursos' : 'Últimas Adiciones'}
              </h2>
              <div className="flex items-center gap-2 bg-background rounded-lg p-1 border shadow-sm">
                <span className="text-xs font-medium text-muted-foreground pl-2">Ordenar por:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-none shadow-none w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Más Recientes</SelectItem>
                    <SelectItem value="oldest">Más Antiguos</SelectItem>
                    <SelectItem value="popular">Más Populares</SelectItem>
                    <SelectItem value="alphabetical">Alfabético</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-40" />
                    <CardContent className="p-4">
                      <Skeleton className="h-3 w-16 mb-2" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-4" />
                      <Skeleton className="h-3 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : latestResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {latestResources.map((resource) => (
                  <Link key={resource.id} href={`/library/${resource.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full group">
                      <div
                        className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{
                          backgroundImage: resource.thumbnailUrl
                            ? `url('${resource.thumbnailUrl}')`
                            : `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400')`,
                        }}
                      />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            {resource.category?.name || RESOURCE_TYPE_LABELS[resource.type]}
                          </span>
                          {getTypeIcon(resource.type)}
                        </div>
                        <h3 className="text-base font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                          {resource.excerpt || resource.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(resource.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {resource.viewCount}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay recursos disponibles</h3>
                <p className="text-muted-foreground">
                  Aún no se han publicado recursos. ¡Vuelve pronto!
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                
                {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handlePageChange(pagination.totalPages)}
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
                
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}
