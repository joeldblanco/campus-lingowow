import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  Users,
  MessageCircle,
  Target,
  BookOpen,
  Headphones,
  Video,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuestro Método | Lingowow - Metodología de Enseñanza',
  description:
    'Un enfoque comunicativo e inmersivo que garantiza resultados reales. Aprende de forma natural, práctica y efectiva con nuestra metodología probada.',
}

const PILLARS = [
  {
    icon: GraduationCap,
    title: 'Inmersión total',
    body: 'Desde el primer día las clases se imparten en el idioma objetivo. Esta inmersión acelera tu comprensión y te ayuda a pensar directamente en el nuevo idioma sin traducir mentalmente.',
  },
  {
    icon: Users,
    title: 'Práctica constante',
    body: 'Conversaciones reales, ejercicios interactivos y situaciones prácticas del día a día. Aprenderás el idioma que realmente se usa, no solo gramática teórica.',
  },
  {
    icon: MessageCircle,
    title: 'Enfoque personalizado',
    body: 'Adaptamos el contenido, ritmo y metodología a tus necesidades, objetivos y estilo de aprendizaje. Cada estudiante es único.',
  },
]

const STEPS = [
  {
    title: 'Evaluación inicial',
    body: 'Determinamos tu nivel actual y objetivos específicos para diseñar un plan de estudios personalizado.',
  },
  {
    title: 'Clases interactivas',
    body: 'Sesiones en vivo con profesores expertos, enfocadas en conversación y práctica real del idioma.',
  },
  {
    title: 'Práctica autónoma',
    body: 'Acceso a materiales complementarios, ejercicios y recursos para practicar entre clases.',
  },
  {
    title: 'Evaluación continua',
    body: 'Seguimiento constante de tu progreso con evaluaciones periódicas y feedback personalizado.',
  },
]

const RESOURCES = [
  {
    icon: Video,
    title: 'Clases en vivo por videollamada',
    body: 'Interacción directa con profesores profesionales en tiempo real, desde cualquier lugar.',
  },
  {
    icon: BookOpen,
    title: 'Material didáctico exclusivo',
    body: 'Libros digitales, guías de estudio y ejercicios diseñados por nuestro equipo pedagógico.',
  },
  {
    icon: Headphones,
    title: 'Recursos multimedia',
    body: 'Podcasts, videos, audios y contenido interactivo para practicar comprensión auditiva.',
  },
  {
    icon: Target,
    title: 'Seguimiento personalizado',
    body: 'Plataforma digital para monitorear tu progreso, tareas y objetivos de aprendizaje.',
  },
]

const EXPECTATIONS = [
  {
    title: 'Avance hacia la fluidez conversacional',
    body: 'Con práctica regular irás progresando para mantener conversaciones con mayor confianza en situaciones cotidianas.',
  },
  {
    title: 'Confianza para comunicarte',
    body: 'Superarás el miedo a hablar y ganarás seguridad para expresarte en el nuevo idioma.',
  },
  {
    title: 'Práctica orientada a tus objetivos',
    body: 'Trabajamos las habilidades que necesitas según tus metas, ya sea para estudio, trabajo o viajes.',
  },
]

export default function MetodoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero — left-aligned statement (distinct from the landing's diptych hero) */}
        <section className="border-b border-border">
          <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
            <Badge
              variant="outline"
              className="rounded-full border-teal/40 bg-teal-soft/60 px-3 py-1 font-medium text-teal-ink"
            >
              Nuestra metodología
            </Badge>
            <h1 className="mt-5 font-lexend text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Un método de enseñanza que se nota
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Un enfoque comunicativo e inmersivo orientado a resultados reales.
              Aprende de forma natural, práctica y efectiva.
            </p>
          </div>
        </section>

        {/* Pilares — diptych: heading-left / pillar list-right */}
        <section className="container mx-auto grid gap-10 px-4 py-24 md:grid-cols-2 md:gap-16 md:px-6">
          <div className="md:sticky md:top-24 md:self-start">
            <h2 className="font-lexend text-3xl font-bold tracking-tight md:text-4xl">
              Los tres pilares del método
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Nuestra metodología se apoya en tres principios fundamentales para el
              aprendizaje de idiomas.
            </p>
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
                  <h3 className="font-lexend text-lg font-semibold">{pillar.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{pillar.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Proceso — numbered step sequence (genuinely ordinal), full-width band */}
        <section className="border-y border-border bg-secondary/50">
          <div className="container mx-auto px-4 py-24 md:px-6">
            <div className="max-w-2xl">
              <h2 className="font-lexend text-3xl font-bold tracking-tight md:text-4xl">
                Cómo funciona el proceso
              </h2>
              <p className="mt-4 text-muted-foreground">
                Un camino estructurado que te acompaña desde tu nivel actual hacia la
                fluidez que deseas alcanzar.
              </p>
            </div>
            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-lexend text-lg font-bold tabular-nums text-primary-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 font-lexend text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Recursos — 2-col feature list, left-aligned heading (icons inline, no tiles) */}
        <section className="container mx-auto px-4 py-24 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-lexend text-3xl font-bold tracking-tight md:text-4xl">
              Recursos y herramientas
            </h2>
            <p className="mt-4 text-muted-foreground">
              Usamos las mejores herramientas para maximizar tu aprendizaje.
            </p>
          </div>
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {RESOURCES.map((resource) => (
              <div key={resource.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
                  <resource.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-lexend text-base font-semibold">{resource.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{resource.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Qué esperar — diptych on a muted band */}
        <section className="border-y border-border bg-secondary/50">
          <div className="container mx-auto grid gap-10 px-4 py-24 md:grid-cols-2 md:gap-16 md:px-6">
            <div>
              <h2 className="font-lexend text-3xl font-bold tracking-tight md:text-4xl">
                Qué puedes esperar
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Nuestro método está orientado a ayudarte a alcanzar tus objetivos. Esto
                es en lo que nos enfocamos contigo:
              </p>
            </div>
            <ul className="flex flex-col gap-6">
              {EXPECTATIONS.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-teal-ink">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-lexend font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA — solid band */}
        <section className="border-t border-border">
          <div className="container mx-auto max-w-2xl px-4 py-24 text-center md:px-6">
            <h2 className="font-lexend text-3xl font-bold tracking-tight md:text-4xl">
              ¿Listo para empezar?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Empieza a aprender con nuestro método y avanza a tu propio ritmo.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/demo">
                <Button size="lg" className="w-full rounded-full sm:w-auto">
                  Clase de prueba gratuita
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="lg" variant="outline" className="w-full rounded-full sm:w-auto">
                  Ver cursos
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
