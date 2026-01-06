import { Suspense } from 'react'
import { getProjectionAnalytics } from '@/lib/actions/analytics'
import { 
  ProjectionsChart, 
  SeasonalityChart,
  TrendAlerts,
  YearOverYearCard,
  ProjectionSummaryCards 
} from '@/components/analytics/projections-chart'
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
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function ProjectionAnalyticsDashboard() {
  const data = await getProjectionAnalytics()

  return (
    <div className="space-y-6">
      {/* Resumen de Proyecciones */}
      <ProjectionSummaryCards projections={data.projections} />

      {/* Crecimiento Año vs Año */}
      <div className="grid gap-4 md:grid-cols-3">
        <YearOverYearCard growth={data.yearOverYearGrowth} />
        
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Resumen de Proyecciones</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Las proyecciones se calculan basándose en la tendencia de los últimos 12 meses. 
              La confianza disminuye a medida que la proyección se aleja en el tiempo.
              Los datos de estacionalidad ayudan a identificar patrones recurrentes.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Tendencias */}
      <TrendAlerts alerts={data.alerts} />

      {/* Gráfico de Proyecciones */}
      <ProjectionsChart 
        data={data.projections}
        title="Proyecciones Financieras (3 meses)"
        description="Estimaciones de ingresos, gastos y margen neto"
      />

      {/* Estacionalidad */}
      <SeasonalityChart 
        data={data.seasonality}
        title="Análisis de Estacionalidad"
      />
    </div>
  )
}

export default function ProjectionAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Proyecciones y Forecasting</h1>
        <p className="text-muted-foreground">
          Predicciones de ingresos, gastos y análisis de estacionalidad
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ProjectionAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
