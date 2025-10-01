import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Download, FileText, Video, Headphones } from 'lucide-react'
import Link from 'next/link'

export default function BibliotecaPage() {
  const recursos = [
    {
      id: 1,
      title: 'Guía Completa de Gramática Inglesa',
      type: 'PDF',
      icon: FileText,
      level: 'Todos los niveles',
      description: 'Guía completa con explicaciones y ejercicios de gramática inglesa.',
      size: '2.5 MB',
    },
    {
      id: 2,
      title: 'Vocabulario Esencial - 1000 Palabras',
      type: 'PDF',
      icon: BookOpen,
      level: 'A1-B1',
      description: 'Las 1000 palabras más importantes del inglés con ejemplos de uso.',
      size: '1.8 MB',
    },
    {
      id: 3,
      title: 'Conversaciones Cotidianas',
      type: 'Audio',
      icon: Headphones,
      level: 'A2-B2',
      description: 'Diálogos de situaciones reales para practicar comprensión auditiva.',
      size: '45 MB',
    },
    {
      id: 4,
      title: 'Pronunciación y Fonética',
      type: 'Video',
      icon: Video,
      level: 'Todos los niveles',
      description: 'Videos explicativos sobre pronunciación correcta de sonidos difíciles.',
      size: '120 MB',
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
                Recursos Gratuitos
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Biblioteca de Recursos
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Accede a nuestra colección de materiales educativos gratuitos: guías, 
                ejercicios, audios y videos para complementar tu aprendizaje.
              </p>
            </div>
          </div>
        </section>

        {/* Resources Grid */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recursos.map((recurso) => {
                const Icon = recurso.icon
                return (
                  <Card key={recurso.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline">{recurso.type}</Badge>
                      </div>
                      <CardTitle className="text-lg">{recurso.title}</CardTitle>
                      <CardDescription>{recurso.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p><strong>Nivel:</strong> {recurso.level}</p>
                        <p><strong>Tamaño:</strong> {recurso.size}</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        Próximamente
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <BookOpen className="h-12 w-12 text-primary mx-auto" />
                  <h2 className="text-2xl font-bold">¿Quieres Acceso Completo?</h2>
                  <p className="text-muted-foreground">
                    Los estudiantes inscritos tienen acceso ilimitado a toda nuestra biblioteca 
                    de recursos, incluyendo materiales exclusivos y actualizaciones constantes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/cursos">
                      <Button size="lg">Ver Cursos</Button>
                    </Link>
                    <Link href="/demo">
                      <Button size="lg" variant="outline">Clase de Prueba</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
