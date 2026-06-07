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
  ArrowRight,
  Check,
  GraduationCap,
  MessageCircle,
  Star,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getTeachersForLanding } from '@/lib/actions/teachers'
import { ContactForm } from '@/components/public-components/contact-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inicio | Lingowow - Aprende Idiomas con Expertos',
  description:
    'Domina cualquier idioma con instructores expertos. Clases personalizadas, metodología probada y resultados garantizados. Aprende de manera efectiva y divertida.',
}

const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/place/Lingowow/@-12.0015217,-77.1199284,17z/data=!4m8!3m7!1s0x9105cd90a8800b7d:0xceb4d33979f426ad!8m2!3d-12.0015217!4d-77.1173535!9m1!1b1!16s%2Fg%2F11j2wlfzw8'

const PILLARS = [
  {
    icon: GraduationCap,
    title: 'Inmersión total',
    body: 'Desde el primer día las clases se imparten en el idioma objetivo. Aceleras tu comprensión y dejas de traducir mentalmente.',
  },
  {
    icon: Users,
    title: 'Práctica constante',
    body: 'Conversaciones reales, ejercicios interactivos y situaciones del día a día para aplicar lo aprendido.',
  },
  {
    icon: MessageCircle,
    title: 'Enfoque personalizado',
    body: 'Adaptamos contenido y ritmo a tus objetivos. Cada estudiante avanza por su propio camino.',
  },
]

const AVAILABLE_LANGUAGES = ['Inglés', 'Español']
const UPCOMING_LANGUAGES = ['Francés', 'Alemán', 'Italiano', 'Portugués', 'Chino', 'Japonés']

const TESTIMONIALS = [
  {
    name: 'Cristian Villamizar',
    text: 'Si quieres aprender inglés de forma personalizada no dudes en que Lingowow es la mejor opción… mi progreso con ellos ha sido inigualable y los recomiendo con toda confianza.',
  },
  {
    name: 'Mari Carmen Rico',
    text: 'Son súper profesionales. Profesores titulados en Lenguas Extranjeras, atención 100% personalizada y accesible desde cualquier parte del mundo. Estoy simplemente fascinada.',
  },
  {
    name: 'Mariana Hernández',
    text: 'No hay nada más importante que un sistema de enseñanza dinámico que te rete a exponerte. Tener un profesor que conoce tu nivel y tus objetivos es invaluable.',
  },
  {
    name: 'Cristina Castillo',
    text: 'Excelente servicio, son profesionales. Cada clase es un completo aprendizaje. Si estás pensando en aprender un idioma, esta es la mejor opción.',
  },
  {
    name: 'Eme Savedra',
    text: 'Excelente academia, profesionales y dedicados con sus estudiantes. Atención personalizada, siempre guiándonos para lograr nuestra meta.',
  },
  {
    name: 'Mónica Pereira',
    text: 'El profesor es excelente, divertido y muy comprometido. Lo recomiendo ampliamente.',
  },
]

const FAQS = [
  {
    q: '¿Cuál es el método de enseñanza?',
    a: 'Usamos un método comunicativo con inmersión total. Desde el primer día las clases se imparten en el idioma objetivo, con énfasis en situaciones reales y práctica constante.',
  },
  {
    q: '¿Cuánto tiempo se necesita para aprender un idioma?',
    a: 'Depende del idioma, tu dedicación y conocimientos previos. En general, para alcanzar un nivel intermedio (B1) se necesitan entre 6 y 8 meses con práctica regular.',
  },
  {
    q: '¿Puedo cancelar mi suscripción en cualquier momento?',
    a: 'Sí, todos nuestros planes son flexibles y puedes cancelar cuando quieras. Solo necesitas avisar con 15 días de antelación antes del siguiente ciclo de facturación.',
  },
  {
    q: '¿Qué certificaciones tienen los profesores?',
    a: 'Todos cuentan con certificaciones internacionales para la enseñanza de idiomas y amplia experiencia docente.',
  },
  {
    q: '¿Ofrecen certificaciones oficiales?',
    a: 'Preparamos a los estudiantes para certificaciones oficiales como TOEFL, IELTS, DELE, DELF y TestDaF, entre otras. Los exámenes se realizan en centros autorizados.',
  },
]

export default async function LandingPage() {
  const teachers = await getTeachersForLanding(4)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero — playful Marquee: big rounded statement left, photo-in-circle right */}
        <section className="relative overflow-hidden">
          {/* soft blob backdrops (the refined, restrained motif) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-soft/70 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-secondary blur-2xl"
          />
          <div className="container relative mx-auto grid items-center gap-10 px-4 py-16 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-12 md:px-6 md:py-24">
            <div className="flex flex-col items-start gap-6">
              <Badge
                variant="outline"
                className="rounded-full border-teal/40 bg-teal-soft/60 px-3 py-1 font-medium text-teal-ink"
              >
                Inglés y Español con profesores titulados
              </Badge>
              <h1 className="font-display text-[clamp(3rem,9vw,5.75rem)] font-bold leading-[0.95] tracking-tight [overflow-wrap:anywhere]">
                Go{' '}
                <span className="relative inline-block text-teal">
                  wow
                  {/* hand-built swoosh — one refined brand motif (replaces doodles) */}
                  <svg
                    aria-hidden
                    viewBox="0 0 200 24"
                    className="absolute -bottom-2 left-0 h-3 w-full text-teal"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M4 14 C 50 4, 150 4, 196 12"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                with us
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Clases personalizadas en vivo con profesores expertos. Aprende de forma
                efectiva — y disfrútalo.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo">
                  <Button
                    size="lg"
                    className="w-full rounded-full px-7 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
                  >
                    Comienza ahora
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button
                    size="lg"
                    className="w-full rounded-full bg-teal px-7 text-teal-ink hover:bg-teal/90 sm:w-auto"
                  >
                    Inicia sesión
                  </Button>
                </Link>
              </div>
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">4,9</span>
                <span>· 38 reseñas verificadas en Google</span>
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              </a>
            </div>

            {/* Photo in a teal circle — the character moment (gentle bob) */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="lw-bob relative aspect-square">
                <div className="absolute inset-0 rounded-full bg-teal" />
                <div className="absolute inset-3 overflow-hidden rounded-full border-4 border-background shadow-lg">
                  <Image
                    src="/media/images/hero-img.png"
                    alt="Estudiantes aprendiendo idiomas con Lingowow"
                    fill
                    sizes="(max-width: 768px) 90vw, 40vw"
                    className="object-cover"
                    priority
                  />
                </div>
                {/* small accent dot */}
                <span
                  aria-hidden
                  className="absolute -right-1 top-8 h-6 w-6 rounded-full bg-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Idiomas */}
        <section id="cursos" className="container mx-auto px-4 py-20 md:px-6">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="flex flex-wrap gap-3 md:order-1">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-base font-medium text-primary"
                >
                  <Check className="h-4 w-4" />
                  {lang}
                </span>
              ))}
              {UPCOMING_LANGUAGES.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center rounded-full border border-border px-4 py-2 text-base text-muted-foreground"
                >
                  {lang}
                </span>
              ))}
            </div>
            <div className="md:order-2">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Empieza por Inglés o Español
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Dos idiomas con cobertura completa, de principiante a avanzado — y más en
                camino. Te avisamos cuando abra el tuyo.
              </p>
              <Link
                href="/courses"
                className="mt-6 inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
              >
                Ver todos los cursos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Metodología — soft band */}
        <section id="metodo" className="border-y border-border bg-secondary/40">
          <div className="container mx-auto grid gap-10 px-4 py-24 md:grid-cols-2 md:gap-16 md:px-6">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Una metodología que se nota
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Combinamos lo mejor de distintos enfoques para que el aprendizaje sea
                efectivo y duradero, no solo teoría.
              </p>
              <Link href="/method">
                <Button variant="outline" className="mt-6 rounded-full">
                  Conoce el método completo
                </Button>
              </Link>
            </div>
            <ul className="flex flex-col gap-4">
              {PILLARS.map((pillar) => (
                <li
                  key={pillar.title}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
                    <pillar.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{pillar.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{pillar.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Profesores — circular avatars */}
        <section className="container mx-auto px-4 py-20 md:px-6">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="grid grid-cols-2 gap-6 md:order-1">
              {teachers.map((teacher) => (
                <figure key={teacher.id} className="flex flex-col items-center text-center">
                  <div className="aspect-square w-full overflow-hidden rounded-full border-4 border-teal-soft bg-muted">
                    <Image
                      src={teacher.image}
                      width={240}
                      height={240}
                      alt={teacher.name}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <figcaption className="mt-3">
                    <p className="font-display font-semibold leading-tight">{teacher.name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.rank}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="md:order-2">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Profesores que enseñan de verdad
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Certificados, con experiencia docente y obsesionados con tu progreso.
                Conoces a tu profesor desde la primera clase.
              </p>
              <Link href="/courses">
                <Button variant="outline" className="mt-6 rounded-full">
                  Ver todos los profesores
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonios — soft cards */}
        <section id="testimonios" className="border-y border-border bg-secondary/40">
          <div className="container mx-auto px-4 py-24 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight md:text-4xl">
                Lo que dicen nuestros estudiantes
              </h2>
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">4,9</span>
                <span>· 38 reseñas en Google</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span aria-hidden className="font-display text-4xl leading-none text-teal">
                    “
                  </span>
                  <blockquote className="-mt-2 flex-1 text-[15px] leading-relaxed text-foreground">
                    {t.text}
                  </blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <p className="font-display font-semibold leading-tight">{t.name}</p>
                    <p className="text-sm text-muted-foreground">Reseña de Google</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container mx-auto px-4 py-20 md:px-6">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Preguntas frecuentes
              </h2>
              <p className="mt-4 max-w-sm text-muted-foreground">
                ¿Aún tienes dudas?{' '}
                <Link href="/contact" className="text-primary transition-colors hover:text-primary/80">
                  Escríbenos
                </Link>{' '}
                y te respondemos.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-display text-base font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA + form — teal-soft band */}
        <section className="border-t border-border bg-teal-soft/40">
          <div className="container mx-auto grid items-center gap-10 px-4 py-24 md:grid-cols-2 md:gap-16 md:px-6">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                ¿Listo para empezar tu viaje lingüístico?
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Regístrate hoy para una clase de prueba gratuita y descubre cómo podemos
                ayudarte a alcanzar la fluidez.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  'Sin compromiso de permanencia',
                  'Garantía de satisfacción de 30 días',
                  'Asesoramiento personalizado',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-teal-ink">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
