import { Metadata } from 'next'
import { TeacherEarningsOverview } from '@/components/teacher/teacher-earnings-overview'

export const metadata: Metadata = {
  title: 'Mis Ganancias | Profesor',
  description: 'Visualiza tus ganancias basadas en clases impartidas',
}

export default function TeacherEarningsPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 md:px-8">
      <TeacherEarningsOverview />
    </div>
  )
}
