import { Metadata } from 'next'
import { TeacherEarningsReport } from '@/components/teacher/teacher-earnings-report'

export const metadata: Metadata = {
  title: 'Mis Ganancias | Profesor',
  description: 'Visualiza tus ganancias basadas en clases impartidas',
}

export default function TeacherEarningsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mis Ganancias</h1>
        <p className="text-muted-foreground">
          Visualiza tus ganancias basadas en las clases donde tanto tú como el estudiante asistieron.
        </p>
      </div>

      <TeacherEarningsReport />
    </div>
  )
}
