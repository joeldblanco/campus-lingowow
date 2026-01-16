'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Users, CheckCircle2, Clock, Target } from 'lucide-react'
import Link from 'next/link'
import { getExamResultsForTeacher } from '@/lib/actions/teacher-exams'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ExamAttempt {
  id: string
  status: string
  score: number | null
  startedAt: Date
  completedAt: Date | null
  user: {
    id: string
    name: string | null
    lastName: string | null
    email: string | null
  }
}

interface ExamResults {
  id: string
  title: string
  description: string
  passingScore: number
  courseId: string | null
  attempts: ExamAttempt[]
  stats: {
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    passRate: number
  }
}

export default function TeacherExamResultsPage() {
  const params = useParams()
  const { data: session } = useSession()
  const examId = params.examId as string
  const [results, setResults] = useState<ExamResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadResults = async () => {
      try {
        const data = await getExamResultsForTeacher(examId)
        
        if (!data.success || !data.results) {
          setError(data.error || 'Error al cargar los resultados')
          return
        }

        setResults(data.results)
      } catch (err) {
        console.error('Error loading exam results:', err)
        setError('Error al cargar los resultados')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      loadResults()
    }
  }, [examId, session?.user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">{error || 'Resultados no encontrados'}</p>
      </div>
    )
  }

  const backUrl = results.courseId ? `/teacher/courses/${results.courseId}` : '/teacher/courses'

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Link href={backUrl}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al curso
          </Button>
        </Link>
        
        <h1 className="text-2xl font-bold">{results.title}</h1>
        <p className="text-muted-foreground">{results.description}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{results.stats.totalAttempts}</p>
                <p className="text-sm text-muted-foreground">Intentos totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{results.stats.completedAttempts}</p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{results.stats.averageScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{results.stats.passRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Tasa de aprobación</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attempts List */}
      <Card>
        <CardHeader>
          <CardTitle>Intentos de estudiantes</CardTitle>
        </CardHeader>
        <CardContent>
          {results.attempts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aún no hay intentos para este examen
            </p>
          ) : (
            <div className="space-y-3">
              {results.attempts.map((attempt) => {
                const passed = attempt.score !== null && attempt.score >= results.passingScore
                
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">
                          {attempt.user.name} {attempt.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(attempt.startedAt), 'PPp', { locale: es })}
                        </p>
                        {attempt.status === 'IN_PROGRESS' ? (
                          <Badge variant="secondary">En progreso</Badge>
                        ) : attempt.status === 'SUBMITTED' ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pendiente de revisión</Badge>
                        ) : (
                          <p className={cn(
                            "font-semibold",
                            passed ? "text-green-600" : "text-destructive"
                          )}>
                            {attempt.score?.toFixed(1)}%
                          </p>
                        )}
                      </div>
                      
                      {attempt.status === 'COMPLETED' && (
                        <Badge className={passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {passed ? 'Aprobado' : 'No aprobado'}
                        </Badge>
                      )}
                      
                      {(attempt.status === 'COMPLETED' || attempt.status === 'SUBMITTED') && (
                        <Link href={`/teacher/grading/${examId}/${attempt.id}`}>
                          <Button size="sm" variant="outline">
                            {attempt.status === 'SUBMITTED' ? 'Revisar' : 'Ver detalles'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
