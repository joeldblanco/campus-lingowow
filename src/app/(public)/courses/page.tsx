import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Globe, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'
import { db } from '@/lib/db'
import { toPublicCourseCards } from '@/lib/public-courses'

export const metadata: Metadata = {
  title: 'Cursos | Lingowow - Aprende Inglés y Español',
  description: 'Descubre nuestra oferta de cursos de idiomas diseñados para todos los niveles. Desde principiantes hasta avanzados, tenemos el curso perfecto para ti.',
}

// Revalidate the public catalogue periodically so it always reflects the
// real published courses without rebuilding the whole site.
export const revalidate = 3600

export default async function CursosPage() {
  const publishedCourses = await db.course.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, description: true, language: true, level: true },
    orderBy: { title: 'asc' },
  })
  const courses = toPublicCourseCards(publishedCourses)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-16 md:px-6 md:py-24">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge
                variant="outline"
                className="rounded-full border-teal/40 bg-teal-soft/60 px-3 py-1 font-medium text-teal-ink"
              >
                Cursos disponibles
              </Badge>
              <h1 className="font-lexend text-4xl md:text-5xl font-bold tracking-tight">
                Nuestros cursos de idiomas
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Descubre nuestra oferta de cursos diseñados para distintos niveles.
                Desde principiantes hasta avanzados, encuentra el curso que se ajusta a ti.
              </p>
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            {courses.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-4 py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Pronto publicaremos nuevos cursos</h2>
                <p className="text-muted-foreground max-w-[600px]">
                  Estamos preparando nuestra oferta de cursos. Mientras tanto, contáctanos
                  y diseñaremos un programa a tu medida.
                </p>
                <Link href="/contact">
                  <Button size="lg" className="rounded-full">Contactar</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="flex flex-col rounded-2xl transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="font-lexend text-xl font-bold">{course.title}</CardTitle>
                      {course.level && (
                        <div className="mt-2">
                          <Badge>{course.level}</Badge>
                        </div>
                      )}
                      {course.description && (
                        <CardDescription className="mt-3">{course.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-2">
                        {course.languageLabel && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <span>Idioma: {course.languageLabel}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>Materiales incluidos</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link href="/shop" className="w-full">
                        <Button size="lg" className="w-full rounded-full font-semibold">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ver planes
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full border-t border-border bg-secondary/50 py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className="font-lexend text-3xl font-bold tracking-tight">
                ¿No encuentras el curso que buscas?
              </h2>
              <p className="text-muted-foreground max-w-[600px]">
                Contáctanos y diseñaremos un programa personalizado según tus necesidades específicas.
              </p>
              <Link href="/contact">
                <Button size="lg" className="rounded-full">Contactar</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
