import { getAllExams, getExamStats } from '@/lib/actions/exams'
import { ExamsStats } from './exams-stats'
import { ExamsTable } from './exams-table'

export async function ExamsContainer() {
  const [exams, stats] = await Promise.all([
    getAllExams(),
    getExamStats()
  ])

  return (
    <div className="space-y-6">
      <ExamsStats stats={stats} />
      <ExamsTable exams={exams} />
    </div>
  )
}
