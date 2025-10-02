'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, BookOpen } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <BookOpen className="h-24 w-24 text-indigo-600 opacity-50" />
          </div>
          <h1 className="text-8xl font-bold text-indigo-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">
            Página no encontrada
          </h2>
          <p className="text-base text-gray-600">
            Lo sentimos, la página que buscas no existe en esta sección.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/activities">
              <Home className="h-5 w-5" />
              Ir a actividades
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
      </div>
    </div>
  )
}
