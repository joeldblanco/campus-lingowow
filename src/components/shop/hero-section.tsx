'use client'

import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <div className="flex flex-col gap-6 py-6 md:py-10 lg:flex-row items-center">
      <div
        className="w-full lg:w-1/2 bg-center bg-no-repeat aspect-video bg-cover rounded-xl shadow-lg relative overflow-hidden group"
        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDaAy1Y5JXlwFImpD2qbHVTlVSVPP7afJhpjafbc4JVXcraFZTEHMulV5Ccg2ha5XmAVlNXbrLLupY6LxJ3XdKxWLhR-vdMFwwBR4FDTHuF8YrTC7RD9_GIotWxdlgi1G22dahwj6QDZvvBKqLZY--BfLo6mrzvzuuRoPCb3GWxjKkc7AEmOgnsINL9bcufu4TxnKK1oSjR9Ivnfuj9k6Rvrqro54no0-nkHhjSX3ELE0ZoXUqCJNSLd1QQLaJMqTIdgp-Zzv5_kzU")' }}
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
      </div>

      <div className="flex flex-col gap-6 w-full lg:w-1/2 lg:pl-10 justify-center">
        <div className="flex flex-col gap-3 text-left">
          <span className="text-primary font-bold tracking-wider text-sm uppercase">
            Los Más Vendidos
          </span>
          <h1 className="text-slate-900 font-extrabold text-4xl md:text-5xl leading-tight tracking-[-0.033em] font-lexend">
            Domina un nuevo idioma hoy
          </h1>
          <p className="text-slate-600 text-base md:text-lg font-normal leading-relaxed">
            Desbloquea tu potencial con nuestra amplia gama de paquetes de cursos, sesiones de tutoría en vivo y materiales de aprendizaje premium diseñados para acelerar tu fluidez.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            className="h-12 px-6 bg-primary hover:bg-blue-600 text-white text-base font-bold rounded-lg shadow-md shadow-blue-500/20"
          >
            Ver Ofertas Especiales
          </Button>
          <Button
            variant="outline"
            className="h-12 px-6 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-base font-bold rounded-lg"
          >
            Cómo Funciona
          </Button>
        </div>
      </div>
    </div>
  )
}
