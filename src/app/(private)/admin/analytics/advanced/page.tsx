import { Suspense } from 'react'
import { Metadata } from 'next'
import { 
  getFinancialHealth, 
  getCohortAnalytics, 
  getStudentLTV, 
  getScheduleHeatmap 
} from '@/lib/actions/analytics'

export const metadata: Metadata = {
  title: 'Analytics Avanzado | Admin | Lingowow',
  description: 'Salud financiera, análisis de cohortes, LTV y mapa de calor de horarios',
}
import { FinancialHealthDashboard } from '@/components/analytics/financial-health'
import { CohortAnalysis } from '@/components/analytics/cohort-analysis'
import { LTVAnalysis } from '@/components/analytics/ltv-analysis'
import { ScheduleHeatmapChart } from '@/components/analytics/schedule-heatmap'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Activity, Users, DollarSign, Clock } from 'lucide-react'

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

async function AdvancedAnalyticsDashboard() {
  const [healthData, cohortData, ltvData, heatmapData] = await Promise.all([
    getFinancialHealth(),
    getCohortAnalytics(12),
    getStudentLTV(),
    getScheduleHeatmap(3),
  ])

  return (
    <Tabs defaultValue="health" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="health" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Salud Financiera</span>
          <span className="sm:hidden">Salud</span>
        </TabsTrigger>
        <TabsTrigger value="cohorts" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Cohortes</span>
          <span className="sm:hidden">Cohortes</span>
        </TabsTrigger>
        <TabsTrigger value="ltv" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">LTV</span>
          <span className="sm:hidden">LTV</span>
        </TabsTrigger>
        <TabsTrigger value="heatmap" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Horarios</span>
          <span className="sm:hidden">Horarios</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="health">
        <FinancialHealthDashboard data={healthData} />
      </TabsContent>

      <TabsContent value="cohorts">
        <CohortAnalysis data={cohortData} />
      </TabsContent>

      <TabsContent value="ltv">
        <LTVAnalysis data={ltvData} />
      </TabsContent>

      <TabsContent value="heatmap">
        <ScheduleHeatmapChart data={heatmapData} />
      </TabsContent>
    </Tabs>
  )
}

export default function AdvancedAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Analytics Avanzado</h1>
        <p className="text-muted-foreground">
          Salud financiera, análisis de cohortes, LTV y mapa de calor de horarios
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AdvancedAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
