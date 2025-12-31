import { Metadata } from 'next'
import { auth } from '@/auth'
import { StudentActivitiesView } from '@/components/activities/student-activities-view'
import { TeacherActivitiesView } from '@/components/activities/teacher-activities-view'

export const metadata: Metadata = {
  title: 'Actividades | Lingowow',
  description: 'Sistema de actividades gamificadas para aprender idiomas',
}

export default async function ActivitiesPage() {
  const session = await auth()
  const userRoles = session?.user?.roles || []
  
  // Determinar si es profesor o admin
  const isTeacherOrAdmin = userRoles.some((role: string) => 
    ['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role)
  )

  return (
    <div className="h-[calc(100vh-4rem)]">
      {isTeacherOrAdmin ? (
        <TeacherActivitiesView />
      ) : (
        <StudentActivitiesView />
      )}
    </div>
  )
}
