'use client'

import { useState } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Home,
  ChevronRight,
  Bookmark,
  Share2,
  Download,
  Play,
  ThumbsUp,
  Video,
  FileText,
  Headphones,
  FileIcon,
  Lock,
  Crown,
  CheckCircle,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'
import Link from 'next/link'

// Mock data - in a real app this would come from an API
const resourceData = {
  id: 'subjunctive-guide',
  title: 'Dominando el Modo Subjuntivo en Español: Una Guía Completa',
  subtitle:
    'Comprende los matices de expresar duda, deseo y posibilidad en tus conversaciones diarias en español.',
  author: {
    name: 'María González',
    role: 'Profesora Senior de Español',
    bio: 'Hablante nativa de Madrid con más de 10 años de experiencia enseñando.',
    image: '/placeholder-avatar.jpg',
  },
  publishDate: '24 Oct, 2023',
  readTime: '15 min de lectura',
  language: 'Español',
  level: 'Intermedio B2',
  category: 'Gramática',
  type: 'article',
  accessLevel: 'public', // 'public' | 'private' | 'premium'
  tags: ['subjuntivo', 'gramática', 'verbos', 'español'],
  image: '/placeholder-featured.jpg',
  content: `
    <h3>Entendiendo el Concepto</h3>
    <p>El modo subjuntivo (el subjuntivo) es uno de los aspectos más desafiantes de la gramática española para los hablantes de inglés. A diferencia del modo indicativo, que se usa para declarar hechos y certeza, el subjuntivo se usa para expresar duda, incertidumbre, subjetividad, posibilidad y deseo.</p>
    <p>Piensa en él como el "modo de la irrealidad". Si estás hablando de algo que es un hecho, usas el indicativo. Si estás hablando de cómo te sientes sobre algo, o algo que puede o no suceder, probablemente necesitas el subjuntivo.</p>
  `,
  relatedResources: [
    {
      id: '1',
      title: '5 Errores Comunes del Subjuntivo',
      type: 'article',
      readTime: '5 min de lectura',
      image: '/placeholder-1.jpg',
    },
    {
      id: '2',
      title: 'Video Lección: Subjuntivo Imperfecto',
      type: 'video',
      readTime: '12:30',
      image: '/placeholder-2.jpg',
    },
    {
      id: '3',
      title: 'Hoja de Referencia de Disparadores del Subjuntivo',
      type: 'pdf',
      readTime: 'Descargar',
      image: '/placeholder-3.jpg',
    },
  ],
  comments: [
    {
      id: '1',
      author: 'David Miller',
      avatar: '/placeholder-avatar.jpg',
      date: 'hace 2 días',
      content:
        '¡Este acrónimo WEIRDO es un cambio total! He estado luchando con cuándo usar el subjuntivo durante meses. ¡Gracias María!',
      likes: 12,
    },
    {
      id: '2',
      author: 'Sarah Jenkins',
      avatar: '/placeholder-avatar.jpg',
      date: 'hace 5 días',
      content:
        '¿Hay una regla específica para cuándo usar el subjuntivo con "quizás" o "tal vez"? A veces lo veo con indicativo.',
      likes: 4,
      reply: {
        author: 'María González',
        isAuthor: true,
        content:
          '¡Gran pregunta Sarah! Depende del nivel de duda. Si estás bastante seguro, puedes usar el indicativo. Si es muy dudoso, quédate con el subjuntivo. ¡Ambos son a menudo aceptables!',
      },
    },
  ],
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <Video className="h-4 w-4" />
    case 'pdf':
      return <FileIcon className="h-4 w-4" />
    case 'audio':
      return <Headphones className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

export default function ResourceDetailPage() {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Simulating different access states - in real app this would come from auth
  const userAccessLevel = 'registered' as 'guest' | 'registered' | 'premium'
  
  const checkAccess = (resourceAccess: string, userLevel: string): boolean => {
    if (resourceAccess === 'public') return true
    if (resourceAccess === 'private' && userLevel !== 'guest') return true
    if (resourceAccess === 'premium' && userLevel === 'premium') return true
    return false
  }
  
  const hasAccess = checkAccess(resourceData.accessLevel, userAccessLevel)

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
                <Link href="/library" className="ml-1 text-muted-foreground hover:text-primary md:ml-2">
                  Biblioteca
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Link
                  href={`/library?language=${resourceData.language.toLowerCase()}`}
                  className="ml-1 text-muted-foreground hover:text-primary md:ml-2"
                >
                  {resourceData.language}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="ml-1 font-medium md:ml-2">{resourceData.category}</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Area (Left Column) */}
          <article className="lg:col-span-8 flex flex-col gap-6">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  {resourceData.language}
                </Badge>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                  {resourceData.level}
                </Badge>
                <Badge variant="outline">{resourceData.category}</Badge>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                {resourceData.title}
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">{resourceData.subtitle}</p>

              {/* Author & Metadata Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    MG
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{resourceData.author.name}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span>{resourceData.publishDate}</span>
                      <span>•</span>
                      <span>{resourceData.readTime}</span>
                    </div>
                  </div>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    title="Guardar para después"
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Compartir">
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Descargar PDF">
                    <Download className="h-5 w-5" />
                  </Button>
                  <Button className="ml-2">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Lección
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Media / Image */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-muted group">
              <div
                className="absolute inset-0 bg-center bg-cover transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <Badge variant="secondary" className="bg-black/50 text-white border-none">
                  <Video className="h-3 w-3 mr-1" />
                  Video Incluido
                </Badge>
              </div>
              <button className="absolute inset-0 flex items-center justify-center group">
                <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 group-hover:bg-white/30 transition-all shadow-xl group-hover:scale-110">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              </button>
            </div>

            {/* Content Area with Access Control */}
            {hasAccess ? (
              <div className="prose prose-lg max-w-none">
                <h3>Entendiendo el Concepto</h3>
                <p>
                  El modo subjuntivo (el subjuntivo) es uno de los aspectos más desafiantes de la
                  gramática española para los hablantes de inglés. A diferencia del modo indicativo,
                  que se usa para declarar hechos y certeza, el subjuntivo se usa para expresar duda,
                  incertidumbre, subjetividad, posibilidad y deseo.
                </p>
                <p>
                  Piensa en él como el &quot;modo de la irrealidad&quot;. Si estás hablando de algo que es un
                  hecho, usas el indicativo. Si estás hablando de cómo te sientes sobre algo, o algo
                  que puede o no suceder, probablemente necesitas el subjuntivo.
                </p>

                {/* Highlight Box */}
                <div className="bg-blue-50 border-l-4 border-primary p-6 rounded-r-lg my-8 not-prose">
                  <h4 className="text-primary font-bold text-lg mb-2 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Regla Clave: WEIRDO
                  </h4>
                  <p className="text-muted-foreground mb-2">
                    Recuerda el acrónimo <strong>WEIRDO</strong> para saber cuándo usar el subjuntivo:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                    <li>
                      <strong>W</strong>ishes (Deseos)
                    </li>
                    <li>
                      <strong>E</strong>motions (Emociones)
                    </li>
                    <li>
                      <strong>I</strong>mpersonal Expressions (Expresiones Impersonales)
                    </li>
                    <li>
                      <strong>R</strong>ecommendations (Recomendaciones)
                    </li>
                    <li>
                      <strong>D</strong>oubt/Denial (Duda/Negación)
                    </li>
                    <li>
                      <strong>O</strong>jalá
                    </li>
                  </ul>
                </div>

                <h3>Formación del Presente de Subjuntivo</h3>
                <p>
                  Para formar el presente de subjuntivo para la mayoría de los verbos, comienzas con
                  la forma <em>yo</em> del presente de indicativo, quitas la <em>-o</em>, y agregas la
                  terminación &quot;opuesta&quot;.
                </p>
                <ul>
                  <li>
                    Para verbos <strong>-ar</strong>, usa terminaciones <strong>-e</strong>.
                  </li>
                  <li>
                    Para verbos <strong>-er/-ir</strong>, usa terminaciones <strong>-a</strong>.
                  </li>
                </ul>

                {/* Comparison Figure */}
                <figure className="my-8">
                  <div className="rounded-xl overflow-hidden bg-muted p-8 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-8 w-full max-w-lg text-center">
                      <div>
                        <p className="font-bold text-muted-foreground mb-2 uppercase text-sm tracking-wider">
                          Indicativo
                        </p>
                        <div className="bg-background p-4 rounded shadow-sm border">
                          <p className="text-lg font-mono">Hablas</p>
                          <p className="text-xs text-muted-foreground">Tú hablas (Hecho)</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-primary mb-2 uppercase text-sm tracking-wider">
                          Subjuntivo
                        </p>
                        <div className="bg-blue-50 p-4 rounded shadow-sm border border-blue-200">
                          <p className="text-lg font-mono text-primary font-bold">Hables</p>
                          <p className="text-xs text-blue-600">Tú hables (Incertidumbre)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <figcaption className="text-center mt-2 text-sm text-muted-foreground">
                    Comparación de terminaciones Indicativo vs Subjuntivo
                  </figcaption>
                </figure>

                <h3>Ejemplos en Contexto</h3>
                <p>Aquí hay algunas oraciones comunes comparando los dos modos:</p>

                <div className="grid gap-4 not-prose">
                  <div className="p-4 rounded-lg bg-muted/50 border flex gap-4 items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Es cierto que él{' '}
                        <span className="underline decoration-green-500 decoration-2 underline-offset-2">
                          viene
                        </span>
                        .
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Es seguro que él viene. (Indicativo - Hecho)
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border flex gap-4 items-start">
                    <HelpCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Es dudoso que él{' '}
                        <span className="underline decoration-primary decoration-2 underline-offset-2">
                          venga
                        </span>
                        .
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Es dudoso que él venga. (Subjuntivo - Duda)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Access Restricted Content */
              <div className="relative">
                <div className="prose prose-lg max-w-none blur-sm select-none pointer-events-none">
                  <h3>Entendiendo el Concepto</h3>
                  <p>
                    El modo subjuntivo (el subjuntivo) es uno de los aspectos más desafiantes de la
                    gramática española para los hablantes de inglés. A diferencia del modo indicativo,
                    que se usa para declarar hechos y certeza...
                  </p>
                  <p>
                    Piensa en él como el &quot;modo de la irrealidad&quot;. Si estás hablando de algo que es un
                    hecho, usas el indicativo...
                  </p>
                </div>

                {/* Access Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background via-background/80 to-transparent">
                  <Card className="max-w-md mx-4 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      {resourceData.accessLevel === 'premium' ? (
                        <>
                          <div className="size-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                            <Crown className="h-8 w-8 text-yellow-600" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Recurso Premium</h3>
                          <p className="text-muted-foreground mb-4">
                            Este es un recurso premium. Actualiza a una suscripción Premium para
                            desbloquear acceso completo.
                          </p>
                          <div className="flex flex-col gap-2">
                            <Button className="w-full">Actualizar a Premium</Button>
                            <Button variant="outline" className="w-full">
                              Ver Planes
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-8 w-8 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Contenido para Usuarios Registrados</h3>
                          <p className="text-muted-foreground mb-4">
                            Este recurso es para usuarios registrados. Por favor inicia sesión o crea
                            una cuenta para ver el contenido completo.
                          </p>
                          <div className="flex flex-col gap-2">
                            <Link href="/auth/signin">
                              <Button className="w-full">Iniciar Sesión</Button>
                            </Link>
                            <Link href="/auth/signup">
                              <Button variant="outline" className="w-full">
                                Crear Cuenta
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <hr className="my-4" />

            {/* Comments Section */}
            <div className="mt-4">
              <h3 className="text-2xl font-bold mb-6">
                Discusión ({resourceData.comments.length})
              </h3>

              {/* Comment Input */}
              <div className="flex gap-4 mb-8">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  U
                </div>
                <div className="flex-grow">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Haz una pregunta o comparte tus pensamientos..."
                    className="min-h-[100px] resize-y"
                  />
                  <div className="flex justify-end mt-2">
                    <Button>Publicar Comentario</Button>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              <div className="space-y-6">
                {resourceData.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold shrink-0">
                      {comment.author.charAt(0)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-baseline justify-between mb-1">
                        <h4 className="font-bold">{comment.author}</h4>
                        <span className="text-xs text-muted-foreground">{comment.date}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4 mb-3">
                        <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium">
                          <ThumbsUp className="h-4 w-4" /> {comment.likes}
                        </button>
                        <button className="text-xs text-muted-foreground hover:text-primary font-medium">
                          Responder
                        </button>
                      </div>

                      {/* Nested Reply */}
                      {comment.reply && (
                        <div className="flex gap-4 bg-muted/50 p-4 rounded-lg">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 text-sm">
                            MG
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-baseline gap-2 mb-1">
                              <h4 className="font-bold text-sm">{comment.reply.author}</h4>
                              {comment.reply.isAuthor && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Autor
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">{comment.reply.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Sidebar (Right Column) */}
          <aside className="lg:col-span-4 space-y-8">
            {/* About Author Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Sobre el Autor</h3>
                <div className="flex items-start gap-4 mb-4">
                  <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    MG
                  </div>
                  <div>
                    <h4 className="font-bold">{resourceData.author.name}</h4>
                    <p className="text-sm text-muted-foreground">{resourceData.author.role}</p>
                    <p className="text-sm text-muted-foreground mt-1">{resourceData.author.bio}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Ver Perfil
                </Button>
              </CardContent>
            </Card>

            {/* Related Resources */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Recursos Relacionados</h3>
                  <Link href="/library" className="text-primary text-sm font-medium hover:underline">
                    Ver todos
                  </Link>
                </div>
                <div className="flex flex-col gap-4">
                  {resourceData.relatedResources.map((resource) => (
                    <Link
                      key={resource.id}
                      href={`/library/${resource.id}`}
                      className="group flex gap-3 items-start p-2 -mx-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <div
                        className="rounded-md w-24 h-16 shrink-0 shadow-sm bg-cover bg-center group-hover:opacity-90 transition-opacity relative"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200')`,
                        }}
                      >
                        {resource.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">
                          {resource.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          {getTypeIcon(resource.type)}
                          {resource.readTime}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Promo / CTA Card */}
            <Card className="bg-gradient-to-br from-primary to-blue-600 text-white border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative z-10">
                <h3 className="text-lg font-bold mb-2">¿Quieres practicar en vivo?</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Reserva una sesión 1 a 1 con un tutor para practicar tus habilidades de
                  conversación.
                </p>
                <Button variant="secondary" className="w-full">
                  Encontrar un Tutor
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
