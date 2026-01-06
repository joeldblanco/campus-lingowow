'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts'
import type { Projection, Seasonality, TrendAlert } from '@/types/analytics'
import { AlertTriangle, AlertCircle, Info, TrendingUp, TrendingDown, Sun } from 'lucide-react'

interface ProjectionsChartProps {
  data: Projection[]
  title?: string
  description?: string
}

export function ProjectionsChart({ 
  data, 
  title = 'Proyecciones Financieras',
  description = 'Estimaciones para los próximos meses'
}: ProjectionsChartProps) {
  const chartData = data.map(d => ({
    name: `${d.month} ${d.year}`,
    ingresos: d.projectedRevenue,
    gastos: d.projectedExpenses,
    margen: d.projectedNetMargin,
    confianza: d.confidence,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    ingresos: 'Ingresos Proyectados',
                    gastos: 'Gastos Proyectados',
                    margen: 'Margen Neto',
                  }
                  return [`$${value.toFixed(2)}`, labels[name] || name]
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="ingresos" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Ingresos"
              />
              <Bar 
                dataKey="gastos" 
                fill="hsl(var(--destructive) / 0.7)" 
                radius={[4, 4, 0, 0]}
                name="Gastos"
              />
              <Line 
                type="monotone" 
                dataKey="margen" 
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(142 76% 36%)' }}
                name="Margen"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex gap-2 justify-center">
          {data.map((d, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {d.month}: {d.confidence}% confianza
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface SeasonalityChartProps {
  data: Seasonality[]
  title?: string
}

export function SeasonalityChart({ data, title = 'Estacionalidad Anual' }: SeasonalityChartProps) {
  const chartData = data.map(d => ({
    name: d.month.slice(0, 3),
    ingresos: d.averageRevenue,
    estudiantes: d.averageStudents,
    isHigh: d.isHighSeason,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription>Promedio histórico por mes del año</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'ingresos') return [`$${value.toFixed(2)}`, 'Ingresos Promedio']
                  return [value.toFixed(1), 'Estudiantes Promedio']
                }}
              />
              <Bar 
                dataKey="ingresos" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.filter(d => d.isHighSeason).map((d, idx) => (
            <Badge key={idx} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <Sun className="h-3 w-3 mr-1" />
              {d.month}
            </Badge>
          ))}
          {data.filter(d => d.isHighSeason).length === 0 && (
            <span className="text-sm text-muted-foreground">
              No hay meses de alta temporada identificados aún
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface TrendAlertsProps {
  alerts: TrendAlert[]
  title?: string
}

export function TrendAlerts({ alerts, title = 'Alertas de Tendencias' }: TrendAlertsProps) {
  const getAlertIcon = (type: TrendAlert['type']) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-4 w-4" />
      case 'warning':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getAlertVariant = (type: TrendAlert['type']) => {
    switch (type) {
      case 'danger':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mr-3 text-green-500" />
            <span>¡Todo en orden! No hay alertas de tendencias negativas.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription>Métricas que requieren atención</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert, idx) => (
          <Alert key={idx} variant={getAlertVariant(alert.type)}>
            {getAlertIcon(alert.type)}
            <AlertTitle className="flex items-center gap-2">
              {alert.metric}
              <Badge variant="outline" className="ml-2">
                {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p>{alert.message}</p>
              <p className="mt-1 text-sm font-medium">
                💡 {alert.recommendation}
              </p>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}

interface YearOverYearCardProps {
  growth: number
  title?: string
}

export function YearOverYearCard({ growth, title = 'Crecimiento Anual' }: YearOverYearCardProps) {
  const isPositive = growth >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{growth.toFixed(1)}%
        </div>
        <p className="text-xs text-muted-foreground">
          comparado con el año anterior (estimado)
        </p>
      </CardContent>
    </Card>
  )
}

interface ProjectionSummaryCardsProps {
  projections: Projection[]
}

export function ProjectionSummaryCards({ projections }: ProjectionSummaryCardsProps) {
  const nextMonth = projections[0]
  const totalProjectedRevenue = projections.reduce((sum, p) => sum + p.projectedRevenue, 0)
  const totalProjectedExpenses = projections.reduce((sum, p) => sum + p.projectedExpenses, 0)
  const avgConfidence = projections.reduce((sum, p) => sum + p.confidence, 0) / projections.length

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Próximo Mes</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${nextMonth?.projectedRevenue.toFixed(0) || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            ingresos proyectados ({nextMonth?.month})
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total 3 Meses</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${totalProjectedRevenue.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground">
            ingresos proyectados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos 3 Meses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${totalProjectedExpenses.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground">
            gastos proyectados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Confianza</CardTitle>
          <Info className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgConfidence.toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground">
            promedio de las proyecciones
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
