import { Suspense } from 'react'
import { getDashboardKPIs, getRevenueAnalytics, getExpenseAnalytics } from '@/lib/actions/analytics'
import { KPICard, SimpleKPICard } from '@/components/analytics/kpi-card'
import { MonthlyRevenueChart } from '@/components/analytics/revenue-chart'
import { ExpenseTrendChart } from '@/components/analytics/expense-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  GraduationCap,
  Calendar,
  Target,
  Wallet,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react'
import Link from 'next/link'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function AnalyticsDashboard() {
  const [kpis, revenueData, expenseData] = await Promise.all([
    getDashboardKPIs(),
    getRevenueAnalytics(6),
    getExpenseAnalytics(6),
  ])

  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Ingresos del Mes"
          data={kpis.monthlyRevenue}
          format="currency"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Gastos del Mes"
          data={kpis.monthlyExpenses}
          format="currency"
          icon={<Wallet className="h-4 w-4" />}
        />
        <KPICard
          title="Margen Neto"
          data={kpis.netMargin}
          format="currency"
          icon={kpis.netMargin.changeType === 'increase' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
        <KPICard
          title="Nuevos Estudiantes"
          data={kpis.newStudents}
          format="number"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SimpleKPICard
          title="Proyección Ingresos"
          value={kpis.projectedRevenue}
          format="currency"
          icon={<Target className="h-4 w-4" />}
          description="Estimación para fin de mes"
        />
        <SimpleKPICard
          title="Proyección Gastos"
          value={kpis.projectedExpenses}
          format="currency"
          icon={<Target className="h-4 w-4" />}
          description="Estimación para fin de mes"
        />
        <SimpleKPICard
          title="Estudiantes Activos"
          value={kpis.totalActiveStudents}
          format="number"
          icon={<GraduationCap className="h-4 w-4" />}
          description="Con inscripción activa"
        />
        <SimpleKPICard
          title="Tasa de Retención"
          value={kpis.retentionRate.value}
          format="percentage"
          icon={<TrendingUp className="h-4 w-4" />}
          description={`Abandono: ${kpis.churnRate}%`}
        />
      </div>

      {/* Resumen de Clases */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalClasses.value}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalClasses.change > 0 ? '+' : ''}{kpis.totalClasses.change.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.completedClasses}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalClasses.value > 0 
                ? ((kpis.completedClasses / kpis.totalClasses.value) * 100).toFixed(0) 
                : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{kpis.cancelledClasses}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalClasses.value > 0 
                ? ((kpis.cancelledClasses / kpis.totalClasses.value) * 100).toFixed(0) 
                : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Show</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.noShowClasses}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalClasses.value > 0 
                ? ((kpis.noShowClasses / kpis.totalClasses.value) * 100).toFixed(0) 
                : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyRevenueChart 
          data={revenueData.monthlyRevenue} 
          title="Ingresos Mensuales"
          description="Últimos 6 meses"
        />
        <ExpenseTrendChart 
          data={expenseData.monthlyExpenses}
          title="Gastos Mensuales"
        />
      </div>

      {/* Mejores y Peores Meses */}
      {(revenueData.bestMonth || revenueData.worstMonth) && (
        <div className="grid gap-4 md:grid-cols-2">
          {revenueData.bestMonth && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-5 w-5" />
                  Mejor Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                  ${revenueData.bestMonth.revenue.toFixed(2)}
                </div>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {revenueData.bestMonth.month} {revenueData.bestMonth.year} - {revenueData.bestMonth.invoiceCount} facturas
                </p>
              </CardContent>
            </Card>
          )}
          {revenueData.worstMonth && (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <TrendingDown className="h-5 w-5" />
                  Mes Más Bajo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                  ${revenueData.worstMonth.revenue.toFixed(2)}
                </div>
                <p className="text-sm text-red-600 dark:text-red-500">
                  {revenueData.worstMonth.month} {revenueData.worstMonth.year} - {revenueData.worstMonth.invoiceCount} facturas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Links a secciones detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado</CardTitle>
          <CardDescription>Explora cada área en profundidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Link href="/admin/analytics/revenue" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <BarChart3 className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Ingresos</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics/expenses" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Wallet className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Gastos</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics/products" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <PieChart className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Productos</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics/teachers" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <GraduationCap className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Profesores</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics/students" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Users className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Estudiantes</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics/projections" className="group">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <LineChart className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium">Proyecciones</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics y Proyecciones</h1>
        <p className="text-muted-foreground">
          Panel de control financiero con métricas en tiempo real y proyecciones
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
