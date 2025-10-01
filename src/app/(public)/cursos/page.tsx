import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, Users, Star } from 'lucide-react'
import Link from 'next/link'

export default function CursosPage() {
  const courses = [
    {
      id: 1,
      name: 'Inglés para Principiantes',
      level: 'A1-A2',
      duration: '3 meses',
      students: 150,
      rating: 4.8,
      description: 'Aprende inglés desde cero con nuestro método comunicativo. Ideal para quienes nunca han estudiado el idioma.',
      available: true,
    },
    {
      id: 2,
      name: 'Inglés Intermedio',
      level: 'B1-B2',
      duration: '4 meses',
      students: 120,
      rating: 4.9,
      description: 'Perfecciona tu inglés y alcanza fluidez conversacional. Enfoque en situaciones reales y vocabulario avanzado.',
      available: true,
    },
    {
      id: 3,
      name: 'Inglés Avanzado',
      level: 'C1-C2',
      duration: '5 meses',
      students: 80,
      rating: 5.0,
      description: 'Domina el inglés a nivel profesional. Preparación para certificaciones internacionales.',
      available: true,
    },
    {
      id: 4,
      name: 'Español para Extranjeros',
      level: 'A1-C2',
      duration: 'Variable',
      students: 95,
      rating: 4.9,
      description: 'Aprende español con profesores nativos. Todos los niveles disponibles.',
      available: true,
    },
    {
      id: 5,
      name: 'Inglés de Negocios',
      level: 'B2+',
      duration: '3 meses',
      students: 65,
      rating: 4.8,
      description: 'Inglés especializado para el mundo empresarial. Presentaciones, negociaciones y comunicación profesional.',
      available: true,
    },
    {
      id: 6,
      name: 'Preparación TOEFL',
      level: 'B2+',
      duration: '2 meses',
      students: 45,
      rating: 4.9,
      description: 'Preparación intensiva para el examen TOEFL. Estrategias y práctica de todas las secciones.',
      available: true,
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
                Cursos Disponibles
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Nuestros Cursos de Idiomas
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Descubre nuestra amplia oferta de cursos diseñados para todos los niveles. 
                Desde principiantes hasta avanzados, tenemos el curso perfecto para ti.
              </p>
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{course.level}</Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{course.rating}</span>
                      </div>
                    </div>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Duración: {course.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{course.students} estudiantes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>Materiales incluidos</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href="/shop" className="w-full">
                      <Button className="w-full">Ver Planes</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className="text-3xl font-bold tracking-tight">
                ¿No encuentras el curso que buscas?
              </h2>
              <p className="text-muted-foreground max-w-[600px]">
                Contáctanos y diseñaremos un programa personalizado según tus necesidades específicas.
              </p>
              <Link href="/contacto">
                <Button size="lg">Contactar</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
