import { Metadata } from 'next'
import { PayableClassesReport } from '@/components/reports/payable-classes-report'

export const metadata: Metadata = {
  title: 'Reporte de Clases Pagables | Admin',
  description: 'Reporte de clases donde tanto el profesor como el estudiante asistieron',
}

export default function PayableClassesReportPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reporte de Clases Pagables</h1>
        <p className="text-muted-foreground">
          Visualiza las clases donde tanto el profesor como el estudiante asistieron. 
          Solo estas clases deben ser pagadas a los profesores.
        </p>
      </div>

      <PayableClassesReport />
    </div>
  )
}
