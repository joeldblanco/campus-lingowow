import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getStudentAssignedExams } from '@/lib/actions/student-exams'
import { StudentExamsList } from '@/components/student/exams/student-exams-list'

export default async function StudentExamsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/student/exams')
  }

  const result = await getStudentAssignedExams()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis Exámenes</h1>
        <p className="text-muted-foreground">
          Exámenes asignados por tus profesores
        </p>
      </div>

      <StudentExamsList exams={result.exams} />
    </div>
  )
}
