import { BadgeCheck, GraduationCap, Star } from 'lucide-react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Real, verifiable social proof shared across the public commerce surfaces
 * (home, pricing, courses). The reviews below are genuine named Google reviews;
 * the rating + count + Maps link point at the real Lingowow listing. Do NOT add
 * invented reviewers, ratings, or counts here.
 */
export const GOOGLE_REVIEWS = {
  rating: 4.9,
  count: 38,
  mapsUrl:
    'https://www.google.com/maps/place/Lingowow/@-12.0015217,-77.1199284,17z/data=!4m8!3m7!1s0x9105cd90a8800b7d:0xceb4d33979f426ad!8m2!3d-12.0015217!4d-77.1173535!9m1!1b1!16s%2Fg%2F11j2wlfzw8',
} as const

export const STUDENT_TESTIMONIALS = [
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
] as const

function FiveStars({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  )
}

/**
 * Compact Google-rating pill for placing near a decision point (hero, CTA).
 * Links straight to the real Maps listing so the proof is verifiable.
 */
export function GoogleRatingBadge({ className }: { className?: string }) {
  return (
    <a
      href={GOOGLE_REVIEWS.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm transition-colors hover:border-primary/50 dark:border-slate-700 dark:bg-[#1a2632]',
        className
      )}
    >
      <FiveStars />
      <span className="font-bold text-slate-900 dark:text-white">{GOOGLE_REVIEWS.rating}</span>
      <span className="text-slate-500 dark:text-slate-400">
        · {GOOGLE_REVIEWS.count} reseñas reales en Google
      </span>
    </a>
  )
}

interface StudentTestimonialsProps {
  id?: string
  className?: string
  heading?: string
  subheading?: string
  /** Cap how many reviews render (e.g. 3 on dense pages). Defaults to all. */
  limit?: number
}

/**
 * Full testimonials section: heading, real Google reviews grid and a link to
 * the live listing. Shared by the home page and the commerce pages.
 */
export function StudentTestimonials({
  id,
  className,
  heading = 'Lo Que Dicen Nuestros Estudiantes',
  subheading = `Calificación de ${GOOGLE_REVIEWS.rating} estrellas en Google con más de ${GOOGLE_REVIEWS.count} opiniones reales de nuestros estudiantes.`,
  limit,
}: StudentTestimonialsProps) {
  const items = limit ? STUDENT_TESTIMONIALS.slice(0, limit) : STUDENT_TESTIMONIALS

  return (
    <section id={id} className={cn('w-full py-12 md:py-16', className)}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">{heading}</h2>
          <p className="text-muted-foreground max-w-[700px]">{subheading}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((testimonial) => (
            <Card key={testimonial.name} className="relative">
              <CardHeader>
                <FiveStars className="mb-2" />
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
            href={GOOGLE_REVIEWS.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Ver todas las opiniones en Google →
          </a>
        </div>
      </div>
    </section>
  )
}

/** Certifications that back the "profesores certificados" claim. Real and stated in the FAQ. */
const CERTIFICATIONS = ['Nivel C2', 'TEFL', 'TESOL', 'CELTA', 'DELE', 'ELE'] as const

/**
 * Instructor-credibility band. Surfaces the real certification claim from the
 * FAQ (C2 + TEFL/TESOL/CELTA for English, DELE/ELE for Spanish) with the FAQ as
 * the verifiable source, so the proof is concrete rather than vague.
 */
export function InstructorCredentials({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 md:p-8 dark:border-slate-700 dark:bg-[#1a2632]',
        className
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Profesores certificados, no improvisados
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Todos nuestros profesores son profesionales con nivel C2 certificado y certificaciones
            internacionales para la enseñanza de idiomas: TEFL, TESOL y CELTA para inglés; DELE y ELE
            para español.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CERTIFICATIONS.map((cert) => (
              <Badge
                key={cert}
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary hover:bg-primary/15"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {cert}
              </Badge>
            ))}
          </div>
          <Link
            href="/faq"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Conoce las certificaciones de nuestros profesores →
          </Link>
        </div>
      </div>
    </div>
  )
}
