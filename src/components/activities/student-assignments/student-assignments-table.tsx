'use client'

import { useState, useEffect } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { studentColumns, StudentAssignment } from './columns'
import { getStudentsForActivity } from '@/lib/actions/activity'

interface StudentAssignmentsTableProps {
  activityId: string
}

export function StudentAssignmentsTable({ activityId }: StudentAssignmentsTableProps) {
  const [students, setStudents] = useState<StudentAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await getStudentsForActivity(activityId)
      // Mapear los datos al tipo StudentAssignment
      const mappedData: StudentAssignment[] = data.map(item => ({
        id: `${item.activityId}-${item.userId}`, // ID único combinado
        user: {
          name: item.user.name,
          lastName: item.user.lastName || undefined,
          email: item.user.email,
        },
        status: item.status as 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED',
        score: item.score,
        attempts: item.attempts,
        assignedAt: item.assignedAt,
        completedAt: item.completedAt,
      }))
      setStudents(mappedData)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Estudiantes Asignados</h3>
          <p className="text-sm text-muted-foreground">
            Lista de estudiantes que tienen esta actividad asignada
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {students.length} estudiante{students.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <DataTable 
        columns={studentColumns} 
        data={students}
        isLoading={loading}
        searchPlaceholder="Buscar estudiante..."
      />
    </div>
  )
}
