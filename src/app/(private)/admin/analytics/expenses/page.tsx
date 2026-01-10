import { Suspense } from 'react'
import { Metadata } from 'next'
import { getExpenseAnalytics } from '@/lib/actions/analytics'

export const metadata: Metadata = {
  title: 'Análisis de Gastos | Analytics | Lingowow',
  description: 'Desglose de pagos a profesores, costos por clase e incentivos',
}
import { 
  MonthlyExpenseChart, 
  TeacherPaymentsTable,
  TeacherPaymentsBarChart 
} from '@/components/analytics/expense-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DollarSign, 
  Users,
  Clock,
  Target,
  Award,
} from 'lucide-react'
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

async function ExpenseAnalyticsDashboard() {
  const data = await getExpenseAnalytics(12)

  return (
    <div className="space-y-6">
      {/* KPIs de Gastos */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${data.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">pagos a profesores (mes actual)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyección Gastos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.projectedExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">estimado fin de mes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo por Clase</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.averageCostPerClass.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">promedio</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesores Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.teacherPayments.length}</div>
            <p className="text-xs text-muted-foreground">con clases este mes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incentivos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalIncentives.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">bonos pagados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Gastos Mensuales */}
      <MonthlyExpenseChart 
        data={data.monthlyExpenses} 
        title="Gastos por Mes"
        description="Evolución de pagos a profesores en los últimos 12 meses"
      />

      {/* Gráfico de Top Profesores */}
      <div className="grid gap-4 md:grid-cols-2">
        <TeacherPaymentsBarChart 
          data={data.teacherPayments} 
          title="Top 10 Profesores por Pago"
          limit={10}
        />
        
        {/* Resumen de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Total Clases Pagables</span>
              <span className="text-lg font-bold">
                {data.teacherPayments.reduce((sum, t) => sum + t.totalClasses, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Total Horas Impartidas</span>
              <span className="text-lg font-bold">
                {data.teacherPayments.reduce((sum, t) => sum + t.totalHours, 0).toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Pago Promedio por Profesor</span>
              <span className="text-lg font-bold">
                ${data.teacherPayments.length > 0 
                  ? (data.totalExpenses / data.teacherPayments.length).toFixed(2) 
                  : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">Margen Estimado</span>
              <span className="text-lg font-bold text-primary">
                Ver en Dashboard
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Pagos por Profesor */}
      <TeacherPaymentsTable 
        data={data.teacherPayments} 
        title="Desglose de Pagos por Profesor"
        description="Detalle de clases y pagos del mes actual"
      />
    </div>
  )
}

export default function ExpenseAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Análisis de Gastos</h1>
        <p className="text-muted-foreground">
          Desglose de pagos a profesores, costos por clase e incentivos
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ExpenseAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
