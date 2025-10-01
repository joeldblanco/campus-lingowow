import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Bookmark, Calendar, Clock, Facebook, Linkedin, Mail, Twitter } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default async function BlogPostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // En una aplicación real, buscarías el post por ID desde una API o base de datos
  const post = {
    id: id,
    title: '5 técnicas efectivas para mejorar tu fluidez en un idioma extranjero',
    excerpt:
      'Descubre los métodos más efectivos que utilizan los políglotas para alcanzar una fluidez natural en tiempo récord.',
    content: `
      <p>Uno de los desafíos más grandes al aprender un nuevo idioma es alcanzar la fluidez. Muchos estudiantes se sienten frustrados después de años de estudio cuando aún no pueden mantener una conversación fluida. La buena noticia es que existen técnicas probadas que pueden acelerar significativamente tu progreso.</p>
      
      <h2>1. La técnica de inmersión intensiva</h2>
      <p>La inmersión total consiste en rodearte completamente del idioma que estás aprendiendo. Esto significa configurar tu teléfono, computadora y redes sociales en ese idioma, consumir exclusivamente contenido (películas, libros, podcasts) en el idioma objetivo, y buscar oportunidades para practicar con hablantes nativos.</p>
      <p>Los políglotas más exitosos dedican al menos 4 horas diarias a la inmersión, incluso si no están estudiando activamente durante todo ese tiempo. Simplemente escuchar el idioma mientras realizas otras actividades ayuda a tu cerebro a familiarizarse con los patrones sonoros y la entonación.</p>
      
      <h2>2. El método de las frases modelo</h2>
      <p>En lugar de memorizar vocabulario aislado, enfócate en aprender frases completas que puedas usar en situaciones reales. Estas "frases modelo" funcionan como plantillas que puedes adaptar a diferentes contextos.</p>
      <p>Por ejemplo, en vez de aprender la palabra "hambre", aprende la frase "Tengo hambre, ¿hay algún restaurante cerca?". Esto te permite comenzar a hablar con más confianza desde el principio.</p>
      
      <h2>3. La técnica del shadowing</h2>
      <p>El shadowing consiste en repetir lo que escuchas en tiempo real, imitando la pronunciación, entonación y ritmo de un hablante nativo. Es particularmente efectivo para mejorar la pronunciación y desarrollar fluidez.</p>
      <p>Para practicar el shadowing, selecciona un audio con transcripción (como un podcast con subtítulos) y repite lo que escuchas con un retraso mínimo, tratando de imitar exactamente cómo suena. Comienza con fragmentos cortos y aumenta gradualmente la duración.</p>
      
      <h2>4. La técnica de conversación limitada</h2>
      <p>Muchos estudiantes evitan hablar hasta que se sienten "preparados", pero esto solo retrasa el progreso. La técnica de conversación limitada consiste en comenzar a hablar desde el primer día, incluso con un vocabulario mínimo.</p>
      <p>Encuentra un intercambio de idiomas o un tutor paciente y comprométete a hablar solo en el idioma objetivo durante períodos cortos pero regulares. Comienza con 5-10 minutos y aumenta gradualmente. La clave es persistir incluso cuando sientas que te faltan palabras.</p>
      
      <h2>5. El método de grabación y análisis</h2>
      <p>Grábate hablando en el idioma que estás aprendiendo y luego escucha la grabación para identificar áreas de mejora. Esta técnica te ayuda a ser consciente de patrones de error recurrentes y a corregirlos sistemáticamente.</p>
      <p>Para maximizar los beneficios, compara tu grabación con la de un hablante nativo diciendo las mismas frases. Presta atención no solo a la pronunciación, sino también al ritmo, las pausas y la entonación.</p>
      
      <h2>La consistencia es clave</h2>
      <p>Independientemente de las técnicas que elijas, la clave para alcanzar la fluidez es la práctica regular y consistente. Incluso 20 minutos diarios son más efectivos que sesiones intensivas de estudio una vez a la semana.</p>
      <p>Recuerda que la fluidez no significa perfección. El objetivo no es hablar como un nativo, sino poder comunicarte efectivamente y con confianza en situaciones reales.</p>
      
      <h2>Conclusión</h2>
      <p>Implementar estas cinco técnicas en tu rutina de estudio puede transformar radicalmente tu experiencia de aprendizaje de idiomas. La fluidez no es un destino mágico e inalcanzable, sino el resultado natural de un enfoque estratégico y consistente.</p>
      <p>En Lingowow, nuestros cursos integran estas técnicas en un método probado que ha ayudado a miles de estudiantes a alcanzar la fluidez en tiempo récord. ¿Quieres saber más? Agenda una clase de prueba gratuita con uno de nuestros profesores nativos.</p>
    `,
    category: 'Técnicas de Aprendizaje',
    author: 'María García',
    authorRole: 'Profesora de Inglés',
    authorBio:
      'María es profesora certificada con más de 10 años de experiencia enseñando inglés. Es políglota y habla con fluidez 5 idiomas.',
    authorImage: '/api/placeholder/80/80',
    date: '15 Mar 2025',
    readTime: '8 min',
    image: '/api/placeholder/1200/600',
    tags: ['fluidez', 'técnicas', 'aprendizaje', 'práctica', 'idiomas'],
    relatedPosts: [
      {
        id: 2,
        title: 'Cómo la música puede acelerar tu aprendizaje de idiomas',
        excerpt:
          'La música no es solo entretenimiento, es una poderosa herramienta para memorizar vocabulario y mejorar la pronunciación.',
        image: '/api/placeholder/400/200',
      },
      {
        id: 3,
        title: 'El método de inmersión: ventajas y desventajas',
        excerpt:
          'Analizamos en profundidad cómo funciona el método de inmersión y si realmente es tan efectivo como dicen.',
        image: '/api/placeholder/400/200',
      },
      {
        id: 6,
        title: 'Beneficios cognitivos del bilingüismo: lo que dice la ciencia',
        excerpt:
          'Estudios recientes confirman que hablar más de un idioma aporta importantes beneficios para nuestro cerebro.',
        image: '/api/placeholder/400/200',
      },
    ],
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegación */}
      <Header />

      <main className="flex-1">
        {/* Post Header */}
        <section className="w-full py-12 md:py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <Button variant="ghost" size="sm" className="mb-4" asChild>
                <Link href="/blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al blog
                </Link>
              </Button>

              <Badge className="mb-2">{post.category}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                {post.title}
              </h1>
              <p className="text-muted-foreground text-lg">{post.excerpt}</p>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Lectura: {post.readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        <div className="container px-4 md:px-6 -mt-16">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <Image
                src={post.image}
                width={1200}
                height={600}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="container px-4 md:px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Social Sharing Sidebar */}
            <div className="lg:w-16 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 flex lg:flex-col items-center gap-4 mb-6 lg:mb-0">
                <Button variant="outline" size="icon" aria-label="Compartir en Facebook">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir en Twitter">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir en LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir por email">
                  <Mail className="h-4 w-4" />
                </Button>
                <Separator className="hidden lg:flex lg:w-full" />
                <Button variant="outline" size="icon" aria-label="Guardar artículo">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4 xl:w-2/3 mx-auto order-1 lg:order-2">
              <article
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              ></article>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-8">
                <span className="text-sm font-medium">Tags:</span>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Author Bio */}
              <div className="mt-12 p-6 rounded-lg bg-slate-50">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={post.authorImage} alt={post.author} />
                    <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{post.author}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{post.authorRole}</p>
                    <p>{post.authorBio}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        <section className="w-full py-12 bg-slate-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {post.relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <Image
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardHeader>
                    <h3 className="text-lg font-bold hover:text-primary leading-tight">
                      <Link href={`/blog/${relatedPost.id}`}>{relatedPost.title}</Link>
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{relatedPost.excerpt}</p>
                    <Button variant="ghost" size="sm" className="mt-4 p-0" asChild>
                      <Link href={`/blog/${relatedPost.id}`}>Leer más</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                ¿Quieres aprender idiomas como un experto?
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Aplica las técnicas de este artículo con la guía de nuestros profesores expertos.
                Primera clase gratis sin compromiso.
              </p>
              <Button variant="secondary" size="lg" className="mt-4">
                Reservar Clase Gratuita
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
