'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ScheduleHeatmap, HourlyDemand } from '@/types/analytics'
import { Clock, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleHeatmapProps {
  data: ScheduleHeatmap
}

const demandColors: Record<HourlyDemand['demand'], string> = {
  low: 'bg-gray-100 dark:bg-gray-800',
  medium: 'bg-blue-200 dark:bg-blue-900',
  high: 'bg-orange-300 dark:bg-orange-800',
  peak: 'bg-red-400 dark:bg-red-700',
}

const demandLabels: Record<HourlyDemand['demand'], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  peak: 'Pico',
}

export function ScheduleHeatmapChart({ data }: ScheduleHeatmapProps) {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const hours = Array.from({ length: 17 }, (_, i) => i + 6) // 6:00 - 22:00

  const getDataForCell = (hour: number, day: string): HourlyDemand | undefined => {
    return data.data.find(d => d.hour === hour && d.day === day)
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Slot</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageBookingsPerSlot}</div>
            <p className="text-xs text-muted-foreground">reservas por horario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hora Pico #1</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.peakHours[0]?.hour || 0}:00
            </div>
            <p className="text-xs text-muted-foreground">
              {data.peakHours[0]?.day || '-'} ({data.peakHours[0]?.bookings || 0} reservas)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hora Pico #2</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.peakHours[1]?.hour || 0}:00
            </div>
            <p className="text-xs text-muted-foreground">
              {data.peakHours[1]?.day || '-'} ({data.peakHours[1]?.bookings || 0} reservas)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menor Demanda</CardTitle>
            <TrendingDown className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.lowDemandHours[0]?.hour || 0}:00
            </div>
            <p className="text-xs text-muted-foreground">
              {data.lowDemandHours[0]?.day || '-'} ({data.lowDemandHours[0]?.bookings || 0} reservas)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Calor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Mapa de Calor de Horarios
          </CardTitle>
          <CardDescription>
            Demanda de clases por día y hora. Los colores más intensos indican mayor demanda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium">Hora</th>
                  {days.map(day => (
                    <th key={day} className="p-2 text-center font-medium">
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour}>
                    <td className="p-2 font-medium text-muted-foreground">
                      {hour}:00
                    </td>
                    {days.map(day => {
                      const cellData = getDataForCell(hour, day)
                      return (
                        <td key={`${hour}-${day}`} className="p-1">
                          <div
                            className={cn(
                              'rounded p-2 text-center transition-all hover:scale-105 cursor-default',
                              cellData ? demandColors[cellData.demand] : 'bg-gray-50 dark:bg-gray-900'
                            )}
                            title={cellData 
                              ? `${cellData.bookings} reservas, ${cellData.completedClasses} completadas, ${cellData.cancellations} canceladas`
                              : 'Sin datos'
                            }
                          >
                            <span className={cn(
                              'font-medium',
                              cellData?.demand === 'peak' && 'text-white',
                              cellData?.demand === 'high' && 'text-gray-900'
                            )}>
                              {cellData?.bookings || 0}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Demanda:</span>
            {Object.entries(demandColors).map(([demand, color]) => (
              <div key={demand} className="flex items-center gap-1">
                <div className={cn('w-4 h-4 rounded', color)} />
                <span>{demandLabels[demand as HourlyDemand['demand']]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Horarios Pico y Baja Demanda */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingUp className="h-5 w-5" />
              Top 5 Horarios Pico
            </CardTitle>
            <CardDescription>Horarios con mayor demanda de clases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.peakHours.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-100 text-red-700">
                      #{idx + 1}
                    </Badge>
                    <span className="font-medium">{slot.day}</span>
                    <span className="text-muted-foreground">{slot.hour}:00</span>
                  </div>
                  <Badge>{slot.bookings} reservas</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <TrendingDown className="h-5 w-5" />
              Top 5 Horarios Baja Demanda
            </CardTitle>
            <CardDescription>Horarios con menor demanda - oportunidad de promoción</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.lowDemandHours.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      #{idx + 1}
                    </Badge>
                    <span className="font-medium">{slot.day}</span>
                    <span className="text-muted-foreground">{slot.hour}:00</span>
                  </div>
                  <Badge variant="secondary">{slot.bookings} reservas</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
