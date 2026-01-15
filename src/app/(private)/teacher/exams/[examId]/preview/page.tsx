import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamForPreview } from '@/lib/actions/teacher-exams'
import { ExamPreviewClient } from './exam-preview-client'

interface PageProps {
  params: Promise<{ examId: string }>
}

export default async function TeacherExamPreviewPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { examId } = await params
  const result = await getExamForPreview(examId)

  if (!result.success || !result.exam) {
    notFound()
  }

  const { exam } = result

  const sections = exam.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: section.questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options as string[] | null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      points: q.points,
      minLength: q.minLength,
      maxLength: q.maxLength,
    }))
  }))

  return (
    <ExamPreviewClient
      examId={examId}
      title={exam.title}
      description={exam.description}
      courseName={exam.course?.title}
      sections={sections}
      timeLimit={exam.timeLimit || 60}
      passingScore={exam.passingScore}
      totalPoints={exam.totalPoints}
      questionCount={exam.questionCount}
    />
  )
}
