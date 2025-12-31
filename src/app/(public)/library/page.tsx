'use client'

import { useState } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
} from 'lucide-react'
import Link from 'next/link'

const categories = [
  { id: 'all', label: 'Todos los Recursos', icon: BookOpen },
  { id: 'grammar', label: 'Gramática', icon: FileText },
  { id: 'vocabulary', label: 'Vocabulario', icon: BookOpen },
  { id: 'culture', label: 'Cultura', icon: Globe },
  { id: 'business', label: 'Negocios', icon: Briefcase },
]

const resourceFormats = [
  { id: 'article', label: 'Artículo', icon: FileText },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'pdf', label: 'PDF', icon: FileIcon },
  { id: 'audio', label: 'Audio', icon: Headphones },
]

const featuredResource = {
  id: 'subjunctive-guide',
  title: 'Dominando el Modo Subjuntivo: Una Guía Completa para Estudiantes Intermedios',
  description:
    'Profundiza en uno de los aspectos más desafiantes de las lenguas romances. Desglosamos las reglas, excepciones y proporcionamos ejemplos del mundo real.',
  author: 'María García',
  authorImage: '/placeholder-avatar.jpg',
  readTime: '12 min de lectura',
  date: '24 Oct, 2023',
  image: '/placeholder-featured.jpg',
  type: 'article',
}

const popularResources = [
  {
    id: '1',
    title: '50 Modismos Esenciales del Español',
    description: 'Suena como un hablante nativo con estas expresiones coloquiales comunes.',
    author: 'David Ruiz',
    authorImage: '/placeholder-avatar.jpg',
    type: 'video',
    category: 'Conversación',
    views: '1.2k vistas',
    image: '/placeholder-1.jpg',
  },
  {
    id: '2',
    title: 'Hoja de Referencia de Tiempos Pasados',
    description: 'Guía rápida para conjugar pretérito e imperfecto en español.',
    author: 'Elena Gómez',
    authorImage: '/placeholder-avatar.jpg',
    type: 'pdf',
    category: 'Gramática',
    views: '856 descargas',
    image: '/placeholder-2.jpg',
  },
  {
    id: '3',
    title: 'Etiqueta de Negocios en Japón',
    description: 'Modales y costumbres esenciales para reuniones de negocios en Tokio.',
    author: 'Kenji Sato',
    authorImage: '/placeholder-avatar.jpg',
    type: 'article',
    category: 'Cultura',
    views: '5 min de lectura',
    image: '/placeholder-3.jpg',
  },
]

const latestResources = [
  {
    id: '4',
    title: 'Pedir Comida en Alemán',
    description: 'Frases para restaurantes y mercados.',
    category: 'Vocabulario',
    type: 'article',
    date: '2 Nov, 2023',
    image: '/placeholder-4.jpg',
  },
  {
    id: '5',
    title: 'Verbos Reflexivos Explicados',
    description: 'Cómo usar "se" correctamente en oraciones en español.',
    category: 'Gramática',
    type: 'article',
    date: '1 Nov, 2023',
    image: '/placeholder-5.jpg',
  },
  {
    id: '6',
    title: 'Escribiendo Correos Profesionales',
    description: 'Plantillas para correspondencia formal de negocios.',
    category: 'Negocios',
    type: 'video',
    date: '30 Oct, 2023',
    image: '/placeholder-6.jpg',
  },
  {
    id: '7',
    title: 'Jerga de los 90s',
    description: 'Lección de audio sobre palabras de jerga retro.',
    category: 'Cultura',
    type: 'audio',
    date: '28 Oct, 2023',
    image: '/placeholder-7.jpg',
  },
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <Video className="h-3.5 w-3.5" />
    case 'pdf':
      return <FileIcon className="h-3.5 w-3.5" />
    case 'audio':
      return <Headphones className="h-3.5 w-3.5" />
    default:
      return <FileText className="h-3.5 w-3.5" />
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'video':
      return 'Video'
    case 'pdf':
      return 'Guía PDF'
    case 'audio':
      return 'Audio'
    default:
      return 'Artículo'
  }
}

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['intermediate'])
  const [language, setLanguage] = useState('es')

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId) ? prev.filter((f) => f !== formatId) : [...prev, formatId]
    )
  }

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

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
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{cat.label}</span>
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
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={selectedLevels.includes('beginner')}
                  onCheckedChange={() => toggleLevel('beginner')}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  Principiante (A1-A2)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={selectedLevels.includes('intermediate')}
                  onCheckedChange={() => toggleLevel('intermediate')}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  Intermedio (B1-B2)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={selectedLevels.includes('advanced')}
                  onCheckedChange={() => toggleLevel('advanced')}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  Avanzado (C1-C2)
                </span>
              </label>
            </div>
          </div>

          {/* Resource Type */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Formato
            </h3>
            <div className="flex flex-wrap gap-2">
              {resourceFormats.map((format) => {
                const Icon = format.icon
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
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-24 py-6 text-lg rounded-xl"
                placeholder="Buscar guías de gramática, listas de vocabulario o consejos culturales..."
              />
              <Button className="absolute inset-y-2 right-2 px-6">Buscar</Button>
            </div>
          </section>

          {/* Featured/Hero Resource */}
          <section className="mb-12">
            <Link href={`/library/${featuredResource.id}`}>
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 text-white min-h-[360px] flex items-end group cursor-pointer shadow-lg">
                {/* Background Image with Gradient Overlay */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200')",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                {/* Content */}
                <div className="relative z-10 p-8 md:p-10 w-full max-w-3xl">
                  <Badge className="mb-4 bg-blue-900/60 text-blue-200 border-blue-500/30">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Destacado
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight group-hover:text-blue-200 transition-colors">
                    {featuredResource.title}
                  </h2>
                  <p className="text-slate-200 text-lg mb-6 line-clamp-2">
                    {featuredResource.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/20" />
                      <span>Por {featuredResource.author}</span>
                    </div>
                    <span>•</span>
                    <span>{featuredResource.readTime}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {featuredResource.date}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>

          {/* Popular Resources Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Recursos Populares
              </h2>
              <Link
                href="/library?sort=popular"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1 group"
              >
                Ver todos{' '}
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularResources.map((resource) => (
                <Link key={resource.id} href={`/library/${resource.id}`}>
                  <Card className="group overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full">
                    <div className="relative aspect-video overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600')`,
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="gap-1 bg-white/90 text-foreground">
                          {getTypeIcon(resource.type)}
                          {getTypeLabel(resource.type)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <Badge variant="outline" className="mb-2 text-primary">
                        {resource.category}
                      </Badge>
                      <h3 className="text-lg font-bold mb-2 leading-snug group-hover:text-primary transition-colors">
                        {resource.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {resource.description}
                      </p>
                      <div className="pt-4 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/20" />
                          <span className="text-xs text-muted-foreground">{resource.author}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{resource.views}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Latest Additions Section */}
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Últimas Adiciones
              </h2>
              <div className="flex items-center gap-2 bg-background rounded-lg p-1 border shadow-sm">
                <span className="text-xs font-medium text-muted-foreground pl-2">Ordenar por:</span>
                <Select defaultValue="newest">
                  <SelectTrigger className="border-none shadow-none w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Más Recientes</SelectItem>
                    <SelectItem value="oldest">Más Antiguos</SelectItem>
                    <SelectItem value="alphabetical">Alfabético</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {latestResources.map((resource) => (
                <Link key={resource.id} href={`/library/${resource.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400')`,
                      }}
                    />
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          {resource.category}
                        </span>
                        {getTypeIcon(resource.type)}
                      </div>
                      <h3 className="text-base font-bold mb-2 line-clamp-2 hover:text-primary cursor-pointer">
                        {resource.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                        {resource.description}
                      </p>
                      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{resource.date}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon">1</Button>
              <Button variant="outline" size="icon">
                2
              </Button>
              <Button variant="outline" size="icon">
                3
              </Button>
              <span className="px-2 text-muted-foreground">...</span>
              <Button variant="outline" size="icon">
                8
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}
