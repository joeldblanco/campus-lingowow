import { Suspense } from 'react'
import { getTeacherAnalytics } from '@/lib/actions/analytics'
import { 
  TeacherRankingCard, 
  TeacherStatsTable,
  TeacherSummaryCards 
} from '@/components/analytics/teacher-ranking'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function TeacherAnalyticsDashboard() {
  const data = await getTeacherAnalytics()

  return (
    <div className="space-y-6">
      {/* KPIs de Profesores */}
      <TeacherSummaryCards
        totalTeachers={data.totalTeachers}
        activeTeachers={data.activeTeachers}
        averageClassesPerTeacher={data.averageClassesPerTeacher}
        averageEarningsPerTeacher={data.averageEarningsPerTeacher}
      />

      {/* Ranking de Profesores */}
      <TeacherRankingCard ranking={data.ranking} />

      {/* Tabla completa de estadísticas */}
      <TeacherStatsTable 
        teachers={data.ranking.byClasses}
        title="Estadísticas Completas de Profesores"
        description="Métricas detalladas de rendimiento de los últimos 3 meses"
      />
    </div>
  )
}

export default function TeacherAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Análisis de Profesores</h1>
        <p className="text-muted-foreground">
          Ranking, rendimiento y estadísticas de profesores
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <TeacherAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
