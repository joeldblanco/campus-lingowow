'use server'

import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamById, canUserTakePlacementTest, startExamAttempt } from '@/lib/actions/exams'
import { PlacementTestViewer } from '@/components/placement-test/placement-test-viewer'

interface PlacementTestTakePageProps {
  params: Promise<{ examId: string }>
}

export default async function PlacementTestTakePage({ params }: PlacementTestTakePageProps) {
  const { examId } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const exam = await getExamById(examId)
  
  if (!exam) {
    notFound()
  }

  if (exam.examType !== 'PLACEMENT_TEST') {
    redirect('/placement-test')
  }

  const eligibility = await canUserTakePlacementTest(examId, session.user.id)
  
  if (!eligibility.canTake) {
    redirect(`/placement-test/${examId}/results`)
  }

  const attemptResult = await startExamAttempt(examId, session.user.id)
  
  if (!attemptResult.success || !attemptResult.attempt) {
    redirect('/placement-test')
  }

  return (
    <div className="min-h-screen bg-background">
      <PlacementTestViewer 
        examId={exam.id}
        attemptId={attemptResult.attempt.id}
        title={exam.title}
        sections={exam.sections}
        timeLimit={exam.timeLimit || 60}
        startedAt={attemptResult.attempt.startedAt.toISOString()}
      />
    </div>
  )
}
