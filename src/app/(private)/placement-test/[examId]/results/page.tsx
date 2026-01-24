'use server'

import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getPlacementTestResult, getRecommendedCourses, getExamById } from '@/lib/actions/exams'
import { PlacementTestResults } from '@/components/placement-test/placement-test-results'

interface PlacementTestResultsPageProps {
  params: Promise<{ examId: string }>
}

export default async function PlacementTestResultsPage({ params }: PlacementTestResultsPageProps) {
  const { examId } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const exam = await getExamById(examId)
  
  if (!exam || exam.examType !== 'PLACEMENT_TEST') {
    notFound()
  }

  const result = await getPlacementTestResult(session.user.id, exam.targetLanguage || undefined)
  
  if (!result) {
    redirect(`/placement-test/${examId}`)
  }

  const recommendedCourses = await getRecommendedCourses(
    result.recommendedLevel,
    result.targetLanguage
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <PlacementTestResults 
          result={result} 
          recommendedCourses={recommendedCourses}
        />
      </div>
    </div>
  )
}
