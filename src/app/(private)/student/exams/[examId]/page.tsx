import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getStudentExamDetails } from '@/lib/actions/student-exams'
import { StudentExamAttempts } from '@/components/student/exams/student-exam-attempts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Clock, Target, User, Calendar, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PageProps {
  params: Promise<{ examId: string }>
}

export default async function StudentExamDetailsPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/student/exams')
  }

  const { examId } = await params
  const result = await getStudentExamDetails(examId)

  if (!result.success || !result.exam) {
    notFound()
  }

  const { exam, assignment, attempts } = result
  const canTakeExam = attempts.remaining > 0 && !attempts.inProgressId
  const hasInProgress = !!attempts.inProgressId
  const hasPassed = attempts.bestScore !== null && attempts.bestScore >= exam.passingScore

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/student/exams" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Volver a exámenes
        </Link>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              {hasPassed && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Aprobado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{exam.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">Tiempo límite</h3>
            </div>
            <p className="text-2xl font-bold">{exam.timeLimit} min</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">Puntaje mínimo</h3>
            </div>
            <p className="text-2xl font-bold">{exam.passingScore}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">Intentos</h3>
            </div>
            <p className="text-2xl font-bold">{attempts.completed}/{exam.maxAttempts}</p>
          </CardContent>
        </Card>
      </div>

      {assignment.instructions && (
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Instrucciones del profesor
            </h3>
            <p className="text-sm">{assignment.instructions}</p>
          </CardContent>
        </Card>
      )}

      {assignment.dueDate && (
        <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
              <Calendar className="h-5 w-5" />
              <p className="font-medium">
                Fecha límite: {format(new Date(assignment.dueDate), 'PPP', { locale: es })}
              </p>
              {new Date(assignment.dueDate) < new Date() && (
                <Badge variant="destructive" className="ml-2">Vencido</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center mb-8">
        {hasPassed ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-semibold text-lg">¡Examen aprobado!</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Tu mejor puntaje: {attempts.bestScore?.toFixed(1)}%
            </p>
          </div>
        ) : canTakeExam ? (
          <Link href={`/exams/${examId}/take`}>
            <Button size="lg" className="shadow-lg shadow-primary/30">
              <PlayCircle className="w-5 h-5 mr-2" />
              {attempts.completed > 0 ? 'Reintentar examen' : 'Comenzar examen'}
            </Button>
          </Link>
        ) : hasInProgress ? (
          <Link href={`/exams/${examId}/take`}>
            <Button size="lg">
              <PlayCircle className="w-5 h-5 mr-2" />
              Continuar intento
            </Button>
          </Link>
        ) : (
          <Button size="lg" disabled>
            Intentos agotados
          </Button>
        )}
      </div>

      <StudentExamAttempts 
        attempts={attempts.list.map(a => ({
          id: a.id,
          status: a.status,
          score: a.score,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          attemptNumber: a.attemptNumber,
        }))} 
        examId={examId}
        passingScore={exam.passingScore}
        maxAttempts={exam.maxAttempts}
      />
    </div>
  )
}
