'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="font-lexend text-9xl font-bold text-primary">404</h1>
          <h2 className="font-lexend text-3xl font-semibold text-foreground">
            Página no encontrada
          </h2>
          <p className="text-lg text-muted-foreground">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-5 w-5" />
              Ir al inicio
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
            Volver atrás
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-sm text-muted-foreground">
            ¿Necesitas ayuda?{' '}
            <Link
              href="/contact"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
