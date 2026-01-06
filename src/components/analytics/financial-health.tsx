'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { FinancialHealth, HealthStatus } from '@/types/analytics'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancialHealthDashboardProps {
  data: FinancialHealth
}

const statusConfig: Record<HealthStatus, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  healthy: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: 'Saludable',
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    icon: <AlertTriangle className="h-5 w-5" />,
    label: 'Atención',
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    icon: <XCircle className="h-5 w-5" />,
    label: 'Crítico',
  },
}

export function FinancialHealthDashboard({ data }: FinancialHealthDashboardProps) {
  const overallConfig = statusConfig[data.overallStatus]

  return (
    <div className="space-y-6">
      {/* Score General */}
      <Card className={cn(
        'border-2',
        data.overallStatus === 'healthy' && 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20',
        data.overallStatus === 'warning' && 'border-yellow-200 bg-yellow-50/30 dark:border-yellow-900 dark:bg-yellow-950/20',
        data.overallStatus === 'critical' && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/20',
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Salud Financiera
          </CardTitle>
          <CardDescription>Evaluación general del estado financiero del negocio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {/* Semáforo */}
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center',
                data.overallStatus === 'healthy' && 'bg-green-100 dark:bg-green-900/50',
                data.overallStatus === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/50',
                data.overallStatus === 'critical' && 'bg-red-100 dark:bg-red-900/50',
              )}>
                <div className={cn('text-4xl font-bold', overallConfig.color)}>
                  {data.score}
                </div>
              </div>
              <Badge className={cn(
                data.overallStatus === 'healthy' && 'bg-green-500',
                data.overallStatus === 'warning' && 'bg-yellow-500',
                data.overallStatus === 'critical' && 'bg-red-500',
              )}>
                {overallConfig.icon}
                <span className="ml-1">{overallConfig.label}</span>
              </Badge>
            </div>

            {/* Indicadores de semáforo */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full',
                  data.overallStatus === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-red-200'
                )} />
                <span className="text-sm">Crítico (0-49)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full',
                  data.overallStatus === 'warning' ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-200'
                )} />
                <span className="text-sm">Atención (50-79)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full',
                  data.overallStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-green-200'
                )} />
                <span className="text-sm">Saludable (80-100)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Individuales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data.metrics).map(([key, metric]) => {
          const config = statusConfig[metric.status]
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <div className={cn('p-1 rounded-full', config.color)}>
                    {config.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {key === 'cashFlow' ? `$${metric.value.toFixed(2)}` : `${metric.value}%`}
                    </span>
                    {metric.trend !== 0 && (
                      <span className={cn(
                        'text-sm flex items-center',
                        metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {metric.trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <Progress 
                    value={key === 'cashFlow' 
                      ? (metric.value > 0 ? Math.min((metric.value / metric.target) * 100, 100) : 0)
                      : Math.min((metric.value / metric.target) * 100, 100)
                    } 
                    className={cn(
                      'h-2',
                      metric.status === 'healthy' && '[&>div]:bg-green-500',
                      metric.status === 'warning' && '[&>div]:bg-yellow-500',
                      metric.status === 'critical' && '[&>div]:bg-red-500',
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Meta: {key === 'cashFlow' ? `$${metric.target.toFixed(2)}` : `${metric.target}%`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recomendaciones */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <Alert key={idx} variant={data.overallStatus === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{rec}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
