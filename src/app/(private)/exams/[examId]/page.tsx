import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ examId: string }>
  searchParams: { error?: string }
}

export default async function ExamPage({ params, searchParams }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { examId } = await params
  const { error } = searchParams

  // Obtener información del examen
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      description: true,
      maxAttempts: true,
      courseId: true
    }
  })

  if (!exam) {
    redirect('/dashboard')
  }

  // Obtener información del curso si existe
  let courseName: string | undefined
  // Usar la página de mis cursos en lugar de una ruta dinámica que no existe
  const courseUrl = '/my-courses'
  if (exam.courseId) {
    const course = await db.course.findUnique({
      where: { id: exam.courseId },
      select: { title: true }
    })
    courseName = course?.title
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#1a2632] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        {error === 'max-attempts' ? (
          <>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Límite de intentos alcanzado</h1>
            <p className="text-muted-foreground text-center mb-6">
              Has alcanzado el número máximo de intentos permitidos ({exam.maxAttempts}) para este examen.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Si necesitas acceso adicional, por favor contacta a tu profesor.
              </p>
              <div className="flex justify-center">
                <Button asChild className="w-full">
                  <Link href={courseUrl || '/dashboard'} className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {courseName ? `Volver a ${courseName}` : 'Volver al Dashboard'}
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mb-4">{exam.title}</h1>
            {exam.description && (
              <p className="text-muted-foreground text-center mb-6">{exam.description}</p>
            )}
            <div className="flex justify-center">
              <Button asChild className="w-full">
                <Link href={`/exams/${examId}/take`}>
                  Comenzar Examen
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
