import { getAllStudentGrades } from '@/lib/actions/grades'
import { GradesTable } from './grades-table'

export async function GradesContainer() {
  const grades = await getAllStudentGrades()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Calificaciones</h1>
          <p className="text-muted-foreground">
            Administra y visualiza las calificaciones de todos los estudiantes.
          </p>
        </div>
      </div>

      <GradesTable grades={grades} />
    </div>
  )
}
