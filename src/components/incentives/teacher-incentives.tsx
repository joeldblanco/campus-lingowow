import React from 'react'
import {
  TrendingUp,
  Users,
  Clock,
  Award,
  Calendar,
  HelpCircle,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { IncentiveType, TeacherRankLevel } from '@/types/academic-period'

interface TeacherIncentive {
  id: string
  type: IncentiveType
  percentage: number
  baseAmount: number
  bonusAmount: number
  paid: boolean
  paidAt?: Date
  periodName: string
  periodId: string
}

interface TeacherRank {
  name: string
  level: TeacherRankLevel
  rateMultiplier: number
  requirementHours: number
  requirementRating: number
  requirementTime: number
}

interface TeacherStats {
  totalCompletedClasses: number
  currentRetentionRate: number
  perfectAttendanceCount: number
  averageRating: number
  totalClassHours: number
  monthsActive: number
}

interface TeacherIncentivesProps {
  incentives: TeacherIncentive[]
  currentRank: TeacherRank
  nextRank?: TeacherRank
  stats: TeacherStats
}

// Función para obtener el nombre amigable del tipo de incentivo
const getIncentiveTypeName = (type: IncentiveType): string => {
  const typeNames: Record<IncentiveType, string> = {
    [IncentiveType.RETENTION]: 'Retención de estudiantes',
    [IncentiveType.PERFECT_ATTENDANCE]: 'Asistencia perfecta',
    [IncentiveType.SPECIAL_ACTIVITIES]: 'Actividades especiales',
    [IncentiveType.RANK_BONUS]: 'Bono por rango',
    [IncentiveType.GROWTH]: 'Crecimiento en horas',
  }

  return typeNames[type] || type
}

// Función para obtener el ícono basado en el tipo de incentivo
const getIncentiveTypeIcon = (type: IncentiveType) => {
  const icons = {
    [IncentiveType.RETENTION]: <Users size={16} />,
    [IncentiveType.PERFECT_ATTENDANCE]: <Clock size={16} />,
    [IncentiveType.SPECIAL_ACTIVITIES]: <Calendar size={16} />,
    [IncentiveType.RANK_BONUS]: <Award size={16} />,
    [IncentiveType.GROWTH]: <TrendingUp size={16} />,
  }

  return icons[type] || <Award size={16} />
}

// Función para calcular el progreso hacia el siguiente rango
const calculateRankProgress = (
  stats: TeacherStats,
  nextRank?: TeacherRank
): { hours: number; rating: number; time: number } => {
  if (!nextRank) {
    return { hours: 100, rating: 100, time: 100 }
  }

  const hourProgress = Math.min(100, (stats.totalClassHours / nextRank.requirementHours) * 100)
  const ratingProgress = Math.min(100, (stats.averageRating / nextRank.requirementRating) * 100)
  const timeProgress = Math.min(100, (stats.monthsActive / nextRank.requirementTime) * 100)

  return {
    hours: Math.round(hourProgress),
    rating: Math.round(ratingProgress),
    time: Math.round(timeProgress),
  }
}

const TeacherIncentives: React.FC<TeacherIncentivesProps> = ({
  incentives,
  currentRank,
  nextRank,
  stats,
}) => {
  const pendingIncentives = incentives.filter((i) => !i.paid)
  const paidIncentives = incentives.filter((i) => i.paid)

  // Calcular el total de bonificaciones
  const totalPendingAmount = pendingIncentives.reduce((sum, i) => sum + i.bonusAmount, 0)
  const totalReceivedAmount = paidIncentives.reduce((sum, i) => sum + i.bonusAmount, 0)

  // Calcular progreso hacia el siguiente rango
  const rankProgress = calculateRankProgress(stats, nextRank)

  return (
    <div className="space-y-6">
      {/* Resumen de incentivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bonificaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {pendingIncentives.length} incentivos pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bonificaciones Recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalReceivedAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rango Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentRank.name}</div>
            <p className="text-xs text-muted-foreground">
              Multiplicador de tarifa: {currentRank.rateMultiplier.toFixed(2)}x
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso de rango */}
      {nextRank && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso hacia {nextRank.name}</CardTitle>
            <CardDescription>
              Completa estos requisitos para subir de rango y aumentar tu tarifa base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horas de clase</span>
                  <span>
                    {stats.totalClassHours}/{nextRank.requirementHours} horas
                  </span>
                </div>
                <Progress value={rankProgress.hours} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calificación promedio</span>
                  <span>
                    {stats.averageRating.toFixed(1)}/{nextRank.requirementRating.toFixed(1)}
                  </span>
                </div>
                <Progress value={rankProgress.rating} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiempo en plataforma</span>
                  <span>
                    {stats.monthsActive}/{nextRank.requirementTime} meses
                  </span>
                </div>
                <Progress value={rankProgress.time} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Al alcanzar el rango <strong>{nextRank.name}</strong>, tu multiplicador de tarifa
              aumentará a <strong>{nextRank.rateMultiplier.toFixed(2)}x</strong>
              (actualmente {currentRank.rateMultiplier.toFixed(2)}x).
            </p>
          </CardFooter>
        </Card>
      )}

      {/* Estadísticas actuales */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Rendimiento</CardTitle>
          <CardDescription>Datos del período actual que afectan tus incentivos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Tasa de retención</div>
                  <div className="text-2xl font-bold">{stats.currentRetentionRate}%</div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle size={16} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Porcentaje de estudiantes que continuaron al siguiente período.
                        <br />
                        80-89%: +5% de incentivo
                        <br />
                        90%+: +10% de incentivo
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-2">
                {stats.currentRetentionRate >= 90 ? (
                  <Badge className="bg-green-500">Excelente (+10%)</Badge>
                ) : stats.currentRetentionRate >= 80 ? (
                  <Badge className="bg-blue-500">Bueno (+5%)</Badge>
                ) : (
                  <Badge variant="outline">Normal</Badge>
                )}
              </div>
            </div>

            <div className="bg-muted rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Asistencia perfecta</div>
                  <div className="text-2xl font-bold">{stats.perfectAttendanceCount}</div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle size={16} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Número de períodos con asistencia perfecta.
                        <br />
                        Cada período suma un +3% de incentivo.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-2">
                {stats.perfectAttendanceCount > 0 ? (
                  <Badge className="bg-green-500">
                    +{stats.perfectAttendanceCount * 3}% de incentivo
                  </Badge>
                ) : (
                  <Badge variant="outline">Sin bonificación</Badge>
                )}
              </div>
            </div>

            <div className="bg-muted rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Crecimiento en horas</div>
                  <div className="text-2xl font-bold">
                    {stats.totalClassHours} <span className="text-sm font-normal">h</span>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle size={16} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Total de horas de clase impartidas.
                        <br />
                        Crecimiento {'>'}10%: +5% de incentivo
                        <br />
                        Crecimiento {'>'}20%: +7% de incentivo
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <ArrowUpRight size={14} />
                  +5-7% por crecimiento
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de incentivos */}
      <Card>
        <CardHeader>
          <CardTitle>Incentivos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingIncentives.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Bonificación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingIncentives.map((incentive) => (
                  <TableRow key={incentive.id}>
                    <TableCell>{incentive.periodName}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {getIncentiveTypeIcon(incentive.type)}
                      {getIncentiveTypeName(incentive.type)}
                    </TableCell>
                    <TableCell>${incentive.baseAmount.toFixed(2)}</TableCell>
                    <TableCell>{incentive.percentage}%</TableCell>
                    <TableCell className="font-medium">
                      ${incentive.bonusAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No tienes incentivos pendientes en este momento.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de incentivos pagados */}
      {paidIncentives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Incentivos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha de pago</TableHead>
                  <TableHead>Bonificación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidIncentives.map((incentive) => (
                  <TableRow key={incentive.id}>
                    <TableCell>{incentive.periodName}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {getIncentiveTypeIcon(incentive.type)}
                      {getIncentiveTypeName(incentive.type)}
                    </TableCell>
                    <TableCell>
                      {incentive.paidAt
                        ? new Date(incentive.paidAt).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-500" />$
                        {incentive.bonusAmount.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TeacherIncentives
