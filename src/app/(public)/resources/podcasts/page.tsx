import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Headphones, Play } from 'lucide-react'
import NewsletterSignup from '@/components/public-components/newsletter-signup'

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
        <section className="w-full py-12 md:py-24 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="w-fit">
                Audio Learning
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Podcasts Educativos
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
                <Card key={podcast.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Headphones className="h-5 w-5 text-primary" />
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
                      <span>⏱️ {podcast.duration}</span>
                      <span>📚 {podcast.level}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Coming Soon + lead capture */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto space-y-6 text-center">
              <Headphones className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-3xl font-bold">Próximamente</h2>
              <p className="text-muted-foreground">
                Estamos preparando una biblioteca completa de podcasts educativos.
                Déjanos tu correo y serás el primero en escucharlos.
              </p>
              <div className="text-left">
                <NewsletterSignup
                  variant="panel"
                  source="resources-podcasts"
                  title="Avísame cuando publiquemos los podcasts"
                  description="Te escribimos en cuanto el primer episodio esté disponible."
                  buttonLabel="Avísame"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
