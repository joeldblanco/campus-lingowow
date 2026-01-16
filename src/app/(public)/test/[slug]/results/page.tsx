'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getExamBySlug, getPlacementTestResult } from '@/lib/actions/exams'
import { PlacementTestResults } from '@/components/placement-test/placement-test-results'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ResultsPageProps {
  params: Promise<{ slug: string }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/test/${slug}/results`)
  }

  const exam = await getExamBySlug(slug)

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Examen no encontrado</CardTitle>
            <CardDescription>El examen que buscas no existe o fue eliminado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const result = await getPlacementTestResult(session.user.id, exam.targetLanguage || undefined)

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Sin resultados</CardTitle>
            <CardDescription>
              No has completado este test todavía. Completa el test para ver tus resultados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/test/${slug}`}>Tomar el Test</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <PlacementTestResults result={result} />
    </div>
  )
}
