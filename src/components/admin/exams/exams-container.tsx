import { getAllExams } from '@/lib/actions/exams'
import { ExamsTable } from './exams-table'

export async function ExamsContainer() {
  const exams = await getAllExams()

  return <ExamsTable exams={exams} />
}
