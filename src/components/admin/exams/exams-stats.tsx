import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, CheckCircle, Clock, TrendingUp } from 'lucide-react'

interface ExamStatsProps {
  stats: {
    totalExams: number
    publishedExams: number
    unpublishedExams: number
    totalAttempts: number
    passedAttempts: number
    passRate: number
  }
}

export function ExamsStats({ stats }: ExamStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Exámenes Totales</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalExams}</div>
          <p className="text-xs text-muted-foreground">
            {stats.publishedExams} publicados, {stats.unpublishedExams} borradores
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Exámenes Publicados</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publishedExams}</div>
          <p className="text-xs text-muted-foreground">
            Disponibles para los estudiantes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Intentos Totales</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          <p className="text-xs text-muted-foreground">
            {stats.passedAttempts} aprobados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.passRate}%</div>
          <p className="text-xs text-muted-foreground">
            Tasa de aprobación
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
