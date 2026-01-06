'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CohortAnalytics } from '@/types/analytics'
import { TrendingUp, TrendingDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CohortAnalysisProps {
  data: CohortAnalytics
}

export function CohortAnalysis({ data }: CohortAnalysisProps) {
  const getRetentionColor = (value: number) => {
    if (value >= 70) return 'bg-green-500'
    if (value >= 50) return 'bg-green-400'
    if (value >= 30) return 'bg-yellow-400'
    if (value >= 15) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const getRetentionTextColor = (value: number) => {
    if (value >= 50) return 'text-white'
    return 'text-gray-900'
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Cohorte</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.bestCohort.retention}%</div>
            <p className="text-xs text-muted-foreground">
              {data.bestCohort.month || 'Sin datos'} - Retención al mes 3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peor Cohorte</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.worstCohort.retention}%</div>
            <p className="text-xs text-muted-foreground">
              {data.worstCohort.month || 'Sin datos'} - Retención al mes 3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retención Promedio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.averageRetentionByMonth[3] || data.averageRetentionByMonth[1] || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio al mes {data.averageRetentionByMonth[3] ? 3 : 1}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Cohortes (Heatmap) */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Cohortes</CardTitle>
          <CardDescription>
            Retención de estudiantes por mes de inscripción. Cada fila representa un cohorte (mes de registro).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium">Cohorte</th>
                  <th className="text-center p-2 font-medium">Tamaño</th>
                  {Array.from({ length: Math.max(...data.cohorts.map(c => c.retentionByMonth.length)) }).map((_, i) => (
                    <th key={i} className="text-center p-2 font-medium">
                      Mes {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="border-t">
                    <td className="p-2 font-medium">{cohort.cohortMonth}</td>
                    <td className="text-center p-2">
                      <Badge variant="outline">{cohort.cohortSize}</Badge>
                    </td>
                    {cohort.retentionByMonth.map((retention, idx) => (
                      <td key={idx} className="p-1">
                        <div
                          className={cn(
                            'rounded px-2 py-1 text-center text-xs font-medium',
                            getRetentionColor(retention),
                            getRetentionTextColor(retention)
                          )}
                        >
                          {retention}%
                        </div>
                      </td>
                    ))}
                    {/* Rellenar celdas vacías */}
                    {Array.from({ 
                      length: Math.max(...data.cohorts.map(c => c.retentionByMonth.length)) - cohort.retentionByMonth.length 
                    }).map((_, idx) => (
                      <td key={`empty-${idx}`} className="p-1">
                        <div className="rounded px-2 py-1 text-center text-xs text-muted-foreground bg-muted/30">
                          -
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                {data.cohorts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      No hay datos de cohortes disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Retención:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>70%+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-400" />
              <span>50-69%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-400" />
              <span>30-49%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span>15-29%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-400" />
              <span>&lt;15%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promedio de Retención por Mes */}
      <Card>
        <CardHeader>
          <CardTitle>Curva de Retención Promedio</CardTitle>
          <CardDescription>Retención promedio de todos los cohortes por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {data.averageRetentionByMonth.map((retention, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{retention}%</span>
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    getRetentionColor(retention)
                  )}
                  style={{ height: `${(retention / 100) * 150}px` }}
                />
                <span className="text-xs text-muted-foreground">M{idx}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
