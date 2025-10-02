'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 space-y-4">
          <h1 className="text-9xl font-bold text-indigo-600">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800">
            Página no encontrada
          </h2>
          <p className="text-lg text-gray-600">
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
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
            Volver atrás
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-sm text-gray-500">
            ¿Necesitas ayuda?{' '}
            <Link
              href="/contacto"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
