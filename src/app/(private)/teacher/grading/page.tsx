import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { FileText, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function GradingListPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const userRoles = session.user.roles || []
  if (!userRoles.includes('TEACHER') && !userRoles.includes('ADMIN')) {
    redirect('/not-authorized')
  }

  const examsWithPendingGrading = await db.exam.findMany({
    where: {
      OR: [
        { createdById: session.user.id },
        { course: { teacherCourses: { some: { teacherId: session.user.id } } } }
      ],
      attempts: {
        some: {
          status: 'SUBMITTED',
          answers: {
            some: { needsReview: true }
          }
        }
      }
    },
    include: {
      course: { select: { title: true } },
      attempts: {
        where: {
          status: 'SUBMITTED',
          answers: { some: { needsReview: true } }
        },
        include: {
          user: { select: { name: true, lastName: true, email: true } },
          answers: { where: { needsReview: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  type ExamWithAttempts = typeof examsWithPendingGrading[number]

  const pendingCount = examsWithPendingGrading.reduce(
    (sum: number, exam: ExamWithAttempts) => sum + exam.attempts.length, 
    0
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1a2632] border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calificaciones Pendientes</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Revisa y califica los exámenes de tus estudiantes
              </p>
            </div>
            <Badge variant={pendingCount > 0 ? "destructive" : "secondary"} className="text-lg px-4 py-2">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {examsWithPendingGrading.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">¡Todo al día!</h2>
            <p className="text-muted-foreground">
              No tienes exámenes pendientes de calificación.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {examsWithPendingGrading.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{exam.title}</h3>
                        {exam.course && (
                          <p className="text-sm text-muted-foreground">{exam.course.title}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {exam.attempts.length} estudiante{exam.attempts.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            {exam.attempts.reduce((sum: number, a: ExamWithAttempts['attempts'][number]) => sum + a.answers.length, 0)} pregunta{exam.attempts.reduce((sum: number, a: ExamWithAttempts['attempts'][number]) => sum + a.answers.length, 0) !== 1 ? 's' : ''} por revisar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {exam.attempts.map((attempt) => (
                    <div key={attempt.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                          {(attempt.user.name?.[0] || attempt.user.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {attempt.user.name} {attempt.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Enviado {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('es-ES') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          {attempt.answers.length} pendiente{attempt.answers.length !== 1 ? 's' : ''}
                        </Badge>
                        <Link href={`/teacher/grading/${exam.id}/${attempt.id}`}>
                          <Button size="sm">Calificar</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
