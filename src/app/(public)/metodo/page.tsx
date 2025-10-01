import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer-3'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Users, MessageCircle, Target, BookOpen, Headphones, Video, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function MetodoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="w-fit">
                Metodología Probada
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Nuestro Método de Enseñanza
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Un enfoque comunicativo e inmersivo que garantiza resultados reales. 
                Aprende de forma natural, práctica y efectiva.
              </p>
            </div>
          </div>
        </section>

        {/* Pilares del Método */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Los 3 Pilares de Nuestro Método
              </h2>
              <p className="text-muted-foreground max-w-[700px] mx-auto">
                Nuestra metodología se basa en tres principios fundamentales que han demostrado 
                ser los más efectivos para el aprendizaje de idiomas.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Inmersión Total</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Desde el primer día, las clases se imparten en el idioma objetivo. 
                    Esta inmersión acelera tu comprensión y te ayuda a pensar directamente 
                    en el nuevo idioma sin traducir mentalmente.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Práctica Constante</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Conversaciones reales, ejercicios interactivos y situaciones prácticas 
                    del día a día. Aprenderás el idioma que realmente se usa, no solo 
                    gramática teórica.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Enfoque Personalizado</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Adaptamos el contenido, ritmo y metodología a tus necesidades específicas, 
                    objetivos y estilo de aprendizaje. Cada estudiante es único.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Proceso de Aprendizaje */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Cómo Funciona Nuestro Proceso
              </h2>
              <p className="text-muted-foreground max-w-[700px] mx-auto">
                Un camino estructurado y probado que te llevará desde tu nivel actual 
                hasta la fluidez que deseas alcanzar.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      1
                    </div>
                    <CardTitle className="text-lg">Evaluación Inicial</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Determinamos tu nivel actual y objetivos específicos para diseñar 
                    un plan de estudios personalizado.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      2
                    </div>
                    <CardTitle className="text-lg">Clases Interactivas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Sesiones en vivo con profesores expertos, enfocadas en conversación 
                    y práctica real del idioma.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      3
                    </div>
                    <CardTitle className="text-lg">Práctica Autónoma</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Acceso a materiales complementarios, ejercicios y recursos para 
                    practicar entre clases.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      4
                    </div>
                    <CardTitle className="text-lg">Evaluación Continua</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Seguimiento constante de tu progreso con evaluaciones periódicas 
                    y feedback personalizado.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Recursos y Herramientas */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Recursos y Herramientas
              </h2>
              <p className="text-muted-foreground max-w-[700px] mx-auto">
                Utilizamos las mejores herramientas y recursos para maximizar tu aprendizaje.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Clases en Vivo por Videollamada</h3>
                  <p className="text-sm text-muted-foreground">
                    Interacción directa con profesores nativos en tiempo real, desde cualquier lugar.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Material Didáctico Exclusivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Libros digitales, guías de estudio y ejercicios diseñados por nuestro equipo pedagógico.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Recursos Multimedia</h3>
                  <p className="text-sm text-muted-foreground">
                    Podcasts, videos, audios y contenido interactivo para practicar comprensión auditiva.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Seguimiento Personalizado</h3>
                  <p className="text-sm text-muted-foreground">
                    Plataforma digital para monitorear tu progreso, tareas y objetivos de aprendizaje.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resultados Garantizados */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  Resultados Garantizados
                </h2>
                <p className="text-muted-foreground">
                  Nuestro método ha ayudado a miles de estudiantes a alcanzar sus objetivos. 
                  Esto es lo que puedes esperar:
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Fluidez Conversacional en 6-8 Meses</h3>
                    <p className="text-sm text-muted-foreground">
                      Con práctica regular, alcanzarás un nivel B1-B2 que te permitirá mantener 
                      conversaciones fluidas en situaciones cotidianas.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Confianza para Comunicarte</h3>
                    <p className="text-sm text-muted-foreground">
                      Superarás el miedo a hablar y ganarás seguridad para expresarte en el nuevo idioma.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Preparación para Certificaciones</h3>
                    <p className="text-sm text-muted-foreground">
                      Te preparamos para exámenes oficiales como TOEFL, IELTS, DELE y otros.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Garantía de Satisfacción</h3>
                    <p className="text-sm text-muted-foreground">
                      Si no estás satisfecho en los primeros 30 días, te devolvemos tu dinero.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-24 bg-gradient-to-r from-indigo-100 to-blue-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                ¿Listo para Empezar?
              </h2>
              <p className="text-muted-foreground max-w-[600px]">
                Únete a miles de estudiantes que ya están aprendiendo con nuestro método probado.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/demo">
                  <Button size="lg">Clase de Prueba Gratuita</Button>
                </Link>
                <Link href="/cursos">
                  <Button size="lg" variant="outline">Ver Cursos</Button>
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
