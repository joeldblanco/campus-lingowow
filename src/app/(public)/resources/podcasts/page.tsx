import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Clock, Headphones, Play } from 'lucide-react'
import Link from 'next/link'

export default function PodcastsPage() {
  const podcasts = [
    {
      id: 1,
      title: 'English Daily Conversations',
      episode: 'Episodio 1: En el Aeropuerto',
      duration: '15 min',
      level: 'A2-B1',
      description: 'Aprende vocabulario y expresiones útiles para situaciones en el aeropuerto.',
    },
    {
      id: 2,
      title: 'Spanish for Beginners',
      episode: 'Episodio 1: Saludos y Presentaciones',
      duration: '12 min',
      level: 'A1',
      description: 'Primeros pasos en español: cómo saludar y presentarte correctamente.',
    },
    {
      id: 3,
      title: 'Business English',
      episode: 'Episodio 1: Reuniones Efectivas',
      duration: '20 min',
      level: 'B2-C1',
      description: 'Vocabulario y frases profesionales para reuniones de negocios.',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-16 md:px-6 md:py-24">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
                Audio learning
              </Badge>
              <h1 className="font-lexend text-4xl md:text-5xl font-bold tracking-tight">
                Podcasts educativos
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Mejora tu comprensión auditiva con nuestros podcasts diseñados específicamente 
                para estudiantes de idiomas. Aprende mientras te desplazas.
              </p>
            </div>
          </div>
        </section>

        {/* Podcasts List */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {podcasts.map((podcast) => (
                <Card
                  key={podcast.id}
                  className="rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
                            <Headphones className="h-4 w-4" />
                          </span>
                          <Badge variant="outline">{podcast.level}</Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{podcast.title}</CardTitle>
                        <CardDescription className="text-base">{podcast.episode}</CardDescription>
                      </div>
                      <Button size="icon" variant="outline" disabled>
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{podcast.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {podcast.duration}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {podcast.level}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="w-full border-t border-border bg-secondary/50 py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <Headphones className="h-16 w-16 text-primary mx-auto" />
              <h2 className="font-lexend text-3xl font-bold">Próximamente</h2>
              <p className="text-muted-foreground">
                Estamos trabajando en una biblioteca completa de podcasts educativos. 
                Suscríbete a nuestros cursos para ser el primero en acceder cuando estén disponibles.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/courses">
                  <Button size="lg" className="rounded-full">Ver Cursos</Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Mantenerme Informado
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
