import { getAllStudentGrades, getGradeStats } from '@/lib/actions/grades'
import { GradesTable } from './grades-table'
import { GradesStats } from './grades-stats'

export async function GradesContainer() {
  const [grades, stats] = await Promise.all([
    getAllStudentGrades(),
    getGradeStats(),
  ])

  return (
    <div className="space-y-6">
      <GradesStats stats={stats} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Calificaciones por Estudiante</h2>
      </div>

      <GradesTable grades={grades} />
    </div>
  )
}
