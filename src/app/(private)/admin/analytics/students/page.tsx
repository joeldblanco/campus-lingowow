import { Suspense } from 'react'
import { getStudentAnalytics } from '@/lib/actions/analytics'
import { 
  StudentGrowthChart, 
  RetentionChart,
  StudentActivityTable,
  StudentSummaryCards 
} from '@/components/analytics/student-analytics'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function StudentAnalyticsDashboard() {
  const data = await getStudentAnalytics(12)

  return (
    <div className="space-y-6">
      {/* KPIs de Estudiantes */}
      <StudentSummaryCards
        totalStudents={data.totalStudents}
        activeStudents={data.activeStudents}
        newThisMonth={data.newThisMonth}
        retentionRate={data.retentionRate}
        churnRate={data.churnRate}
      />

      {/* Gráfico de Crecimiento */}
      <StudentGrowthChart 
        data={data.growth}
        title="Crecimiento de Estudiantes"
        description="Evolución de la base de estudiantes en los últimos 12 meses"
      />

      {/* Gráfico de Retención vs Abandono */}
      <RetentionChart 
        data={data.growth}
        title="Nuevos vs Abandonos por Mes"
      />

      {/* Tablas de Actividad */}
      <div className="grid gap-6 md:grid-cols-2">
        <StudentActivityTable 
          students={data.mostActive}
          title="Estudiantes Más Activos"
          description="Top 10 estudiantes con más clases en los últimos 30 días"
          type="active"
        />
        
        <StudentActivityTable 
          students={data.inactive}
          title="Estudiantes Inactivos"
          description="Estudiantes con inscripción activa pero sin clases recientes"
          type="inactive"
        />
      </div>
    </div>
  )
}

export default function StudentAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Análisis de Estudiantes</h1>
        <p className="text-muted-foreground">
          Crecimiento, retención, abandono y actividad de estudiantes
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <StudentAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
