'use client'

import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
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
import { ArrowRight, Calendar, ChevronRight, Clock, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'

// Schema para el formulario de suscripción
const NewsletterSchema = z.object({
  email: z.string().email('Por favor ingresa un email válido'),
})

const blogPosts = [
  {
    id: 1,
    title: '5 técnicas efectivas para mejorar tu fluidez en un idioma extranjero',
    excerpt:
      'Descubre los métodos más efectivos que utilizan los políglotas para alcanzar una fluidez natural en tiempo récord.',
    category: 'Técnicas de Aprendizaje',
    author: 'María García',
    authorRole: 'Profesora de Inglés',
    date: '15 Mar 2025',
    readTime: '8 min',
    image: '/api/placeholder/800/450',
    featured: true,
    tags: ['fluidez', 'técnicas', 'aprendizaje', 'práctica'],
  },
  {
    id: 2,
    title: 'Cómo la música puede acelerar tu aprendizaje de idiomas',
    excerpt:
      'La música no es solo entretenimiento, es una poderosa herramienta para memorizar vocabulario y mejorar la pronunciación.',
    category: 'Recursos',
    author: 'John Smith',
    authorRole: 'Profesor de Francés',
    date: '10 Mar 2025',
    readTime: '6 min',
    image: '/api/placeholder/800/450',
    featured: true,
    tags: ['música', 'memoria', 'pronunciación'],
  },
  {
    id: 3,
    title: 'El método de inmersión: ventajas y desventajas',
    excerpt:
      'Analizamos en profundidad cómo funciona el método de inmersión y si realmente es tan efectivo como dicen.',
    category: 'Metodologías',
    author: 'Hiroshi Tanaka',
    authorRole: 'Profesor de Japonés',
    date: '5 Mar 2025',
    readTime: '10 min',
    image: '/api/placeholder/800/450',
    featured: false,
    tags: ['inmersión', 'metodología', 'aprendizaje'],
  },
  {
    id: 4,
    title: 'Viajando mientras aprendes: consejos para practicar idiomas en el extranjero',
    excerpt:
      'Viajar es una de las mejores formas de practicar un idioma. Te contamos cómo aprovecharlo al máximo.',
    category: 'Viajes y Cultura',
    author: 'Ana Martínez',
    authorRole: 'Coordinadora académica',
    date: '1 Mar 2025',
    readTime: '7 min',
    image: '/api/placeholder/800/450',
    featured: false,
    tags: ['viajes', 'práctica', 'cultura'],
  },
  {
    id: 5,
    title: 'Los errores más comunes al aprender alemán y cómo evitarlos',
    excerpt:
      'El alemán tiene fama de ser un idioma difícil, pero conociendo estos errores frecuentes podrás avanzar más rápido.',
    category: 'Errores Comunes',
    author: 'Klaus Mueller',
    authorRole: 'Profesor de Alemán',
    date: '25 Feb 2025',
    readTime: '9 min',
    image: '/api/placeholder/800/450',
    featured: false,
    tags: ['alemán', 'errores', 'gramática'],
  },
  {
    id: 6,
    title: 'Beneficios cognitivos del bilingüismo: lo que dice la ciencia',
    excerpt:
      'Estudios recientes confirman que hablar más de un idioma aporta importantes beneficios para nuestro cerebro.',
    category: 'Ciencia y Aprendizaje',
    author: 'Dr. Roberto Sánchez',
    authorRole: 'Neurocientífico',
    date: '20 Feb 2025',
    readTime: '12 min',
    image: '/api/placeholder/800/450',
    featured: false,
    tags: ['bilingüismo', 'ciencia', 'beneficios', 'cerebro'],
  },
]

const categories = [
  'Técnicas de Aprendizaje',
  'Recursos',
  'Metodologías',
  'Viajes y Cultura',
  'Errores Comunes',
  'Ciencia y Aprendizaje',
  'Noticias',
  'Eventos',
]

const popularTags = [
  'aprendizaje',
  'fluidez',
  'vocabulario',
  'gramática',
  'pronunciación',
  'inmersión',
  'bilingüismo',
  'cultura',
  'viajes',
  'recursos',
]

type NewsletterFormData = z.infer<typeof NewsletterSchema>

export default function BlogPage() {
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegación */}
      <Header />

      <main className="flex-1">
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
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Destacados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {blogPosts
                .filter((post) => post.featured)
                .map((post) => (
                  <Card key={post.id} className="overflow-hidden flex flex-col h-full">
                    <div className="aspect-video relative">
                      <Image src={post.image} alt={post.title} fill className="object-cover" />
                      <Badge className="absolute top-4 left-4 bg-primary hover:bg-primary">
                        {post.category}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl leading-tight hover:text-primary">
                        <Link href={`/blog/${post.id}`}>{post.title}</Link>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground">{post.excerpt}</p>
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          <Image
                            src="/api/placeholder/32/32"
                            alt={post.author}
                            className="h-full w-full object-cover"
                            width={32}
                            height={32}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{post.author}</p>
                          <p className="text-xs text-muted-foreground">{post.authorRole}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/blog/${post.id}`}>
                          Leer más <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </div>
        </section>

        {/* Main Content + Sidebar */}
        <section className="w-full py-12 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contenido principal */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Recientes</h2>

                <Tabs defaultValue="todos" className="mb-8">
                  <TabsList className="w-full flex-wrap">
                    <TabsTrigger value="todos">Todos</TabsTrigger>
                    <TabsTrigger value="tecnicas">Técnicas</TabsTrigger>
                    <TabsTrigger value="recursos">Recursos</TabsTrigger>
                    <TabsTrigger value="metodologias">Metodologías</TabsTrigger>
                    <TabsTrigger value="cultura">Cultura</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-8">
                  {blogPosts.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 relative aspect-video md:aspect-square">
                          <Image src={post.image} alt={post.title} fill className="object-cover" />
                        </div>
                        <div className="md:w-2/3 flex flex-col">
                          <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{post.category}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {post.date} · {post.readTime}
                              </span>
                            </div>
                            <CardTitle className="text-xl leading-tight hover:text-primary">
                              <Link href={`/blog/${post.id}`}>{post.title}</Link>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <p className="text-muted-foreground">{post.excerpt}</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {post.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter className="border-t pt-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                <Image
                                  src="/api/placeholder/32/32"
                                  alt={post.author}
                                  className="h-full w-full object-cover"
                                  width={32}
                                  height={32}
                                />
                              </div>
                              <span className="text-sm font-medium">{post.author}</span>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/blog/${post.id}`}>
                                Leer más <ChevronRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center mt-8">
                  <Button variant="outline">Cargar más artículos</Button>
                </div>
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
                      <Link href="/acerca-de">Conoce al Equipo</Link>
                    </Button>
                  </CardFooter>
                </Card>

                {/* Categorías */}
                <Card>
                  <CardHeader>
                    <CardTitle>Categorías</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {categories.map((category) => (
                        <li key={category}>
                          <Link
                            href={`/blog/categoria/${category.toLowerCase().replace(/\s+/g, '-')}`}
                            className="flex items-center justify-between group"
                          >
                            <span className="text-muted-foreground group-hover:text-foreground">
                              {category}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Tags populares */}
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

                {/* Curso destacado */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle>Curso destacado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg overflow-hidden">
                      <Image
                        src="/api/placeholder/400/200"
                        width={400}
                        height={200}
                        alt="Curso de inglés para profesionales"
                        className="w-full h-auto"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold">Inglés para Profesionales</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Domina el inglés de negocios en solo 8 semanas con nuestro método exclusivo.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Ver Detalles</Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="w-full py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="md:w-2/3">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                  ¿Listo para llevar tu aprendizaje al siguiente nivel?
                </h2>
                <p className="text-primary-foreground/80 max-w-[600px]">
                  Descubre nuestros cursos con profesores nativos y metodología probada. Primera
                  clase gratis.
                </p>
              </div>
              <div>
                <Button variant="secondary" size="lg" className="w-full md:w-auto">
                  Probar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
