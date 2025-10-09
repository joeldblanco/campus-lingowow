import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, GraduationCap, MessageCircle, Star, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PricingSection } from '@/components/public-components/pricing-section'
import { getTeachersForLanding } from '@/lib/actions/teachers'
import { ContactForm } from '@/components/public-components/contact-form'

export default async function LandingPage() {
  const teachers = await getTeachersForLanding(4)
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegación */}
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col gap-4 md:w-1/2">
              <Badge className="w-fit" variant="outline">
                ¡Aprende Inglés y Español con expertos!
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Domina cualquier idioma con instructores expertos
              </h1>
              <p className="text-muted-foreground">
                Clases personalizadas, metodología probada y resultados garantizados. Aprende de
                manera efectiva y divertida.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/demo">
                  <Button size="lg" className="w-full sm:w-auto">
                    Comienza Ahora
                  </Button>
                </Link>
                <Link href="/method">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Conoce Nuestros Métodos
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-2">
                  {[
                    { name: 'Cristian' },
                    { name: 'Maria' },
                    { name: 'Miguel' },
                    { name: 'Elena' },
                  ].map((student, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white overflow-hidden bg-muted"
                    >
                      <Image
                        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${student.name}`}
                        width={32}
                        height={32}
                        alt={student.name}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">+145</span> estudiantes satisfechos
                </p>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="rounded-lg border bg-card overflow-hidden shadow-lg">
                <Image
                  src="/media/images/hero-img.png"
                  width={600}
                  height={400}
                  alt="Estudiantes aprendiendo idiomas"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Idiomas Ofrecidos */}
        <section id="cursos" className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Nuestros Idiomas</h2>
              <p className="text-muted-foreground max-w-[700px]">
                Ofrecemos una amplia gama de idiomas para todos los niveles, desde principiantes
                hasta avanzados.
              </p>
            </div>
            <Tabs defaultValue="populares" className="w-full max-w-3xl mx-auto">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="populares">Más Populares</TabsTrigger>
                <TabsTrigger value="europeos">Europeos</TabsTrigger>
                <TabsTrigger value="asiaticos">Asiáticos</TabsTrigger>
              </TabsList>
              <TabsContent value="populares" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Inglés', available: true },
                    { name: 'Español', available: true },
                    { name: 'Francés', available: false },
                    { name: 'Alemán', available: false },
                    { name: 'Italiano', available: false },
                    { name: 'Portugués', available: false },
                  ].map((idioma) => (
                    <Card key={idioma.name} className={!idioma.available ? 'opacity-60' : ''}>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{idioma.name}</CardTitle>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Badge variant="outline">
                          {idioma.available ? 'Todos los niveles' : 'Próximamente'}
                        </Badge>
                        {idioma.available && (
                          <Link href="/courses">
                            <Button variant="ghost" size="sm">
                              Ver más
                            </Button>
                          </Link>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="europeos" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Inglés', available: true },
                    { name: 'Español', available: true },
                    { name: 'Francés', available: false },
                    { name: 'Alemán', available: false },
                    { name: 'Italiano', available: false },
                    { name: 'Portugués', available: false },
                    { name: 'Ruso', available: false },
                    { name: 'Sueco', available: false },
                    { name: 'Holandés', available: false },
                  ].map((idioma) => (
                    <Card key={idioma.name} className={!idioma.available ? 'opacity-60' : ''}>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{idioma.name}</CardTitle>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Badge variant="outline">
                          {idioma.available ? 'Todos los niveles' : 'Próximamente'}
                        </Badge>
                        {idioma.available && (
                          <Link href="/courses">
                            <Button variant="ghost" size="sm">
                              Ver más
                            </Button>
                          </Link>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="asiaticos" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Chino Mandarín', available: false },
                    { name: 'Japonés', available: false },
                    { name: 'Coreano', available: false },
                    { name: 'Árabe', available: false },
                    { name: 'Hindi', available: false },
                    { name: 'Tailandés', available: false },
                  ].map((idioma) => (
                    <Card key={idioma.name} className="opacity-60">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{idioma.name}</CardTitle>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Badge variant="outline">Próximamente</Badge>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Metodología */}
        <section id="metodo" className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Nuestra Metodología</h2>
              <p className="text-muted-foreground max-w-[700px]">
                Combinamos lo mejor de diferentes enfoques para garantizar un aprendizaje efectivo y
                duradero.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="flex flex-col items-center">
                  <div className="p-2 bg-primary/10 rounded-full mb-4">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Inmersión Total</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>
                    Desde el primer día, las clases se imparten en el idioma objetivo. Esto acelera
                    tu comprensión y adaptación.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-col items-center">
                  <div className="p-2 bg-primary/10 rounded-full mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Práctica Constante</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>
                    Conversaciones reales, ejercicios interactivos y situaciones prácticas para
                    aplicar lo aprendido.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-col items-center">
                  <div className="p-2 bg-primary/10 rounded-full mb-4">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Enfoque Personalizado</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>
                    Adaptamos el contenido y ritmo a tus necesidades y objetivos específicos de
                    aprendizaje.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Profesores */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Nuestros Profesores</h2>
              <p className="text-muted-foreground max-w-[700px]">
                Contamos con profesores certificados y con amplia experiencia docente.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {teachers.map((teacher) => (
                <Card key={teacher.id} className="overflow-hidden">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <Image
                      src={teacher.image}
                      width={200}
                      height={200}
                      alt={teacher.name}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">{teacher.name}</CardTitle>
                    <CardDescription>{teacher.rank}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link href="/cursos">
                <Button variant="outline">Ver Todos los Profesores</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonios */}
        <section id="testimonios" className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Lo Que Dicen Nuestros Estudiantes
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Calificación de 4.9 estrellas en Google con más de 38 opiniones reales de nuestros
                estudiantes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Cristian Villamizar',
                  text: 'Si quieres aprender inglés de forma personalizada no dudes en que Lingowow es la mejor opción… mi progreso con ellos ha sido inigualable y los recomiendo con toda confianza!',
                },
                {
                  name: 'Mari Carmen Rico',
                  text: 'Son súper profesionales!!! Son profesores titulados en Lenguas Extranjeras!! Atención 100% personalizada, es una Escuela en línea, que lo hace muy accesible para cualquier parte del mundo que te encuentres, estoy simplemente fascinada.',
                },
                {
                  name: 'Mariana Hernandez',
                  text: 'Cuando estás aprendiendo un nuevo idioma no hay nada más importante que un sistema de enseñanza dinámico, entretenido y que te rete a exponerte. Tener un profesor particular que conoce cuál es tu nivel y cuáles son tus objetivos es invaluable.',
                },
                {
                  name: 'Cristina Castillo',
                  text: 'Excelente servicio, son profesionales cada clase es un completo aprendizaje, lo recomiendo completamente, si estás pensando aprender un idioma no dudes que esta es la mejor opción.',
                },
                {
                  name: 'Eme Savedra',
                  text: 'Excelente academia, profesionales y dedicados con sus estudiantes. Atención personalizada, siempre guiándonos para lograr nuestra meta de aprender un nuevo idioma.',
                },
                {
                  name: 'Mónica Pereira',
                  text: 'El profesor es excelente, divertido y muy comprometido. Lo recomiendo ampliamente.',
                },
              ].map((testimonial, i) => (
                <Card key={i} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                    <CardDescription>Reseña de Google</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">&quot;{testimonial.text}&quot;</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <a
                href="https://www.google.com/maps/place/Lingowow/@-12.0015217,-77.1199284,17z/data=!4m8!3m7!1s0x9105cd90a8800b7d:0xceb4d33979f426ad!8m2!3d-12.0015217!4d-77.1173535!9m1!1b1!16s%2Fg%2F11j2wlfzw8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Ver todas las opiniones en Google →
              </a>
            </div>
          </div>
        </section>

        {/* Precios */}
        <PricingSection />

        {/* FAQ */}
        <section id="faq" className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Preguntas Frecuentes</h2>
              <p className="text-muted-foreground max-w-[700px]">
                Encuentra respuestas a las preguntas más comunes sobre nuestros servicios.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>¿Cuál es el método de enseñanza?</AccordionTrigger>
                  <AccordionContent>
                    Utilizamos un método comunicativo con inmersión total. Desde el primer día, las
                    clases se imparten en el idioma objetivo, con énfasis en situaciones reales y
                    práctica constante.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    ¿Cuánto tiempo se necesita para aprender un idioma?
                  </AccordionTrigger>
                  <AccordionContent>
                    El tiempo varía según el idioma, tu dedicación y conocimientos previos. En
                    general, para alcanzar un nivel intermedio (B1) se necesitan entre 6-8 meses con
                    práctica regular.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    ¿Puedo cancelar mi suscripción en cualquier momento?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sí, todos nuestros planes son flexibles y puedes cancelar en cualquier momento.
                    Solo necesitas avisar con 15 días de antelación antes del siguiente ciclo de
                    facturación.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>¿Qué certificaciones tienen los profesores?</AccordionTrigger>
                  <AccordionContent>
                    Todos nuestros profesores cuentan con certificaciones internacionales para la
                    enseñanza de idiomas y amplia experiencia docente.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>¿Ofrecen certificaciones oficiales?</AccordionTrigger>
                  <AccordionContent>
                    Preparamos a los estudiantes para certificaciones oficiales como TOEFL, IELTS,
                    DELE, DELF, TestDaF, entre otros. Los exámenes se realizan en centros
                    autorizados.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA + Formulario */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-indigo-100 to-blue-100">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  ¿Listo para empezar tu viaje lingüístico?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Regístrate hoy para una clase de prueba gratuita y descubre cómo podemos ayudarte
                  a alcanzar la fluidez.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Sin compromiso de permanencia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Garantía de satisfacción 30 días</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Asesoramiento personalizado</span>
                  </div>
                </div>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
