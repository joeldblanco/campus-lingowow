import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, BookOpen, PenTool, Mic } from 'lucide-react'
import Link from 'next/link'

export default function EjerciciosPage() {
  const ejercicios = [
    {
      id: 1,
      title: 'Gramática Básica',
      icon: BookOpen,
      level: 'A1-A2',
      exercises: 25,
      description: 'Ejercicios de presente simple, artículos y pronombres.',
      topics: ['Presente Simple', 'Artículos', 'Pronombres'],
    },
    {
      id: 2,
      title: 'Vocabulario Cotidiano',
      icon: PenTool,
      level: 'A2-B1',
      exercises: 30,
      description: 'Practica vocabulario de situaciones diarias: compras, restaurantes, viajes.',
      topics: ['Compras', 'Restaurantes', 'Viajes'],
    },
    {
      id: 3,
      title: 'Comprensión Auditiva',
      icon: Mic,
      level: 'B1-B2',
      exercises: 20,
      description: 'Escucha diálogos reales y responde preguntas de comprensión.',
      topics: ['Conversaciones', 'Noticias', 'Entrevistas'],
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
                Práctica Gratuita
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Ejercicios Gratuitos
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Practica y mejora tus habilidades con nuestros ejercicios interactivos gratuitos. 
                Perfecto para complementar tus clases o estudiar por tu cuenta.
              </p>
            </div>
          </div>
        </section>

        {/* Exercises Grid */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ejercicios.map((ejercicio) => {
                const Icon = ejercicio.icon
                return (
                  <Card key={ejercicio.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="outline">{ejercicio.level}</Badge>
                      </div>
                      <CardTitle>{ejercicio.title}</CardTitle>
                      <CardDescription>{ejercicio.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{ejercicio.exercises} ejercicios</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Temas incluidos:</p>
                          <div className="flex flex-wrap gap-2">
                            {ejercicio.topics.map((topic, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" disabled>
                        Próximamente
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">¿Por Qué Practicar con Ejercicios?</h2>
                <p className="text-muted-foreground">
                  La práctica constante es clave para dominar un idioma
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Refuerza lo Aprendido</h3>
                    <p className="text-sm text-muted-foreground">
                      Consolida los conceptos vistos en clase con práctica adicional.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Feedback Inmediato</h3>
                    <p className="text-sm text-muted-foreground">
                      Recibe correcciones instantáneas para aprender de tus errores.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">A Tu Ritmo</h3>
                    <p className="text-sm text-muted-foreground">
                      Practica cuando quieras, sin presión de tiempo.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Seguimiento de Progreso</h3>
                    <p className="text-sm text-muted-foreground">
                      Visualiza tu avance y áreas de mejora.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">¿Listo para Aprender en Serio?</h2>
                  <p className="text-muted-foreground">
                    Combina estos ejercicios con clases personalizadas para resultados óptimos. 
                    Nuestros profesores te guiarán paso a paso.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/courses">
                      <Button size="lg">Ver Cursos</Button>
                    </Link>
                    <Link href="/demo">
                      <Button size="lg" variant="outline">Clase de Prueba Gratuita</Button>
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
