'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, ChevronRight, Clock, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'

const NewsletterSchema = z.object({
  email: z.string().email('Por favor ingresa un email válido'),
})

type NewsletterFormData = z.infer<typeof NewsletterSchema>

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  category: string | null
  tags: string[]
  readTime: number | null
  publishedAt: Date | null
  author: {
    id: string
    name: string
    lastName: string | null
    image: string | null
  }
}

interface BlogClientProps {
  featuredPosts: BlogPost[]
  allPosts: BlogPost[]
  categories: string[]
  popularTags: string[]
}

export default function BlogClient({
  featuredPosts,
  allPosts,
  categories,
  popularTags,
}: BlogClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')

  const form = useForm<NewsletterFormData>({
    resolver: zodResolver(NewsletterSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: NewsletterFormData) => {
    try {
      // Aquí iría la lógica para suscribir al newsletter
      console.log('Newsletter subscription:', values)
      toast.success('¡Te has suscrito exitosamente al newsletter!')
      form.reset()
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      toast.error('Error al suscribirse al newsletter')
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filteredPosts = allPosts.filter((post) => {
    const matchesCategory =
      selectedCategory === 'todos' || post.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <>
      {/* Hero Section */}
      <section className="w-full py-12 md:py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Blog de Lingowow</h1>
            <p className="text-muted-foreground max-w-[700px]">
              Recursos, consejos y noticias sobre el aprendizaje de idiomas
            </p>

            <div className="w-full max-w-md flex mt-6">
              <Input
                type="text"
                placeholder="Buscar artículos..."
                className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button className="rounded-l-none">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Destacados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden flex flex-col h-full">
                  <div className="aspect-video relative">
                    <Image
                      src={post.coverImage || '/api/placeholder/800/450'}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                    {post.category && (
                      <Badge className="absolute top-4 left-4 bg-primary hover:bg-primary">
                        {post.category}
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl leading-tight hover:text-primary">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                      {post.readTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{post.readTime} min</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{post.excerpt}</p>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {post.author.image ? (
                          <Image
                            src={post.author.image}
                            alt={post.author.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {post.author.name.charAt(0)}
                            {post.author.lastName?.charAt(0) || ''}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {post.author.name} {post.author.lastName || ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/blog/${post.slug}`}>
                        Leer más <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content + Sidebar */}
      <section className="w-full py-12 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenido principal */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Recientes</h2>

              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
                <TabsList className="w-full flex-wrap">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  {categories.slice(0, 4).map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="text-xs md:text-sm"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="space-y-8">
                {filteredPosts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        No se encontraron artículos con los filtros seleccionados
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 relative aspect-video md:aspect-square">
                          <Image
                            src={post.coverImage || '/api/placeholder/400/400'}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="md:w-2/3 flex flex-col">
                          <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                              {post.category && <Badge variant="outline">{post.category}</Badge>}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(post.publishedAt)}
                                {post.readTime && ` · ${post.readTime} min`}
                              </span>
                            </div>
                            <CardTitle className="text-xl leading-tight hover:text-primary">
                              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <p className="text-muted-foreground">{post.excerpt}</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {post.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter className="border-t pt-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {post.author.image ? (
                                  <Image
                                    src={post.author.image}
                                    alt={post.author.name}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium">
                                    {post.author.name.charAt(0)}
                                    {post.author.lastName?.charAt(0) || ''}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium">
                                {post.author.name} {post.author.lastName || ''}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/blog/${post.slug}`}>
                                Leer más <ChevronRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {filteredPosts.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline">Cargar más artículos</Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Sobre el Blog */}
              <Card>
                <CardHeader>
                  <CardTitle>Sobre Nuestro Blog</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Bienvenido al blog de Lingowow, tu fuente de recursos, consejos y noticias
                    sobre el aprendizaje de idiomas. Nuestro equipo de profesores expertos
                    comparte regularmente contenido valioso para ayudarte en tu viaje lingüístico.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/about">Conoce al Equipo</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Categorías */}
              {categories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Categorías</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {categories.map((category) => (
                        <li key={category}>
                          <button
                            onClick={() => setSelectedCategory(category)}
                            className="flex items-center justify-between group w-full text-left"
                          >
                            <span
                              className={`text-muted-foreground group-hover:text-foreground ${
                                selectedCategory === category ? 'text-foreground font-medium' : ''
                              }`}
                            >
                              {category}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Tags populares */}
              {popularTags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags Populares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Newsletter */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle>Suscríbete a nuestra newsletter</CardTitle>
                  <CardDescription>
                    Recibe los mejores consejos y recursos directamente en tu email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="email" placeholder="tu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Suscribiendo...' : 'Suscribirme'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
