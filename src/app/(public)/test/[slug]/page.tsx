import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { canAccessExamBySlug } from '@/lib/actions/exams'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Lock } from 'lucide-react'
import Link from 'next/link'

interface TestPageProps {
  params: Promise<{ slug: string }>
}

export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params
  const session = await auth()
  
  const accessCheck = await canAccessExamBySlug(slug, session?.user?.id)

  if (!accessCheck.canAccess || !accessCheck.exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              {accessCheck.reason?.includes('sesión') ? (
                <Lock className="h-6 w-6 text-destructive" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>{accessCheck.reason}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {accessCheck.reason?.includes('sesión') ? (
              <Button asChild>
                <Link href={`/auth/signin?callbackUrl=/test/${slug}`}>Iniciar Sesión</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const exam = accessCheck.exam

  // Si el usuario está autenticado, redirigir a la ruta unificada de exámenes
  if (session?.user?.id) {
    redirect(`/exams/${exam.id}/take`)
  }

  // Si no está autenticado pero el examen es público, mostrar página de inicio
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{exam.title}</CardTitle>
          <CardDescription className="mt-2">{exam.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="font-semibold text-lg">{exam.timeLimit || 60}</div>
              <div className="text-muted-foreground">minutos</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="font-semibold text-lg">
                {exam.questions?.length || 0}
              </div>
              <div className="text-muted-foreground">preguntas</div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Para tomar este test necesitas iniciar sesión o crear una cuenta.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href={`/auth/signin?callbackUrl=/test/${slug}`}>Iniciar Sesión</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/register?callbackUrl=/test/${slug}`}>Crear Cuenta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
