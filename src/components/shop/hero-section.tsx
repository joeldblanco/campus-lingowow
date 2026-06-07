'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'

export function HeroSection() {
  return (
    <div className="flex flex-col items-center gap-6 py-6 md:py-10 lg:flex-row">
      <figure className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border shadow-sm lg:w-1/2">
        <Image
          src="/media/images/hero-img.png"
          alt="Aprende idiomas con Lingowow"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </figure>

      <div className="flex w-full flex-col justify-center gap-6 lg:w-1/2 lg:pl-10">
        <div className="flex flex-col gap-3 text-left">
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            Los más vendidos
          </span>
          <h1 className="font-lexend text-4xl font-extrabold leading-tight tracking-[-0.033em] text-foreground md:text-5xl">
            Domina un nuevo idioma hoy
          </h1>
          <p className="text-base font-normal leading-relaxed text-muted-foreground md:text-lg">
            Desbloquea tu potencial con nuestra gama de paquetes de cursos, sesiones de
            tutoría en vivo y materiales de aprendizaje premium diseñados para acelerar tu
            fluidez.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button className="h-12 rounded-full px-6 text-base font-bold">
            Ver ofertas especiales
          </Button>
          <Button variant="outline" className="h-12 rounded-full px-6 text-base font-bold">
            Cómo funciona
          </Button>
        </div>
      </div>
    </div>
  )
}
