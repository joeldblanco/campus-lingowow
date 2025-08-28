import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react'

interface GradesStatsProps {
  stats: {
    totalEnrollments: number
    activeEnrollments: number
    completedEnrollments: number
    totalActivities: number
    completedActivities: number
    averageScore: number
    completionRate: number
  }
}

export function GradesStats({ stats }: GradesStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inscripciones Activas</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.activeEnrollments}</div>
          <p className="text-xs text-muted-foreground">
            de {stats.totalEnrollments} totales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actividades Completadas</CardTitle>
          <BookOpen className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.completedActivities}</div>
          <p className="text-xs text-muted-foreground">
            de {stats.totalActivities} totales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
          <Award className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.averageScore}%</div>
          <p className="text-xs text-muted-foreground">
            Calificación promedio
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            Actividades completadas
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
