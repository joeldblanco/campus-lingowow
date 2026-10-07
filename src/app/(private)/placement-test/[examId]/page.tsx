import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamEntryDetails } from '@/lib/actions/exam-entry'
import { ExamStartGate } from '@/components/exams/student/exam-start-gate'

export default async function PlacementTestTakePage({ params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  const { examId } = await params
  let details
  try { details = await getExamEntryDetails(examId) } catch { notFound() }
  if ('redirectUrl' in details) redirect(details.redirectUrl)
  if (!details.isPlacement) redirect('/placement-test')
  return <ExamStartGate examId={examId} title={details.title} proctoring={details.proctoring} cancelUrl="/placement-test" />
}
