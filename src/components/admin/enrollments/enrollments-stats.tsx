'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnrollmentStats } from '@/lib/actions/enrollments'
import { BookOpen, CheckCircle2, Pause, Users } from 'lucide-react'

interface EnrollmentsStatsProps {
  stats: EnrollmentStats
}

export function EnrollmentsStats({ stats }: EnrollmentsStatsProps) {
  const statCards = [
    {
      title: 'Total de Inscripciones',
      value: stats.totalEnrollments,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pre-inscripciones',
      value: stats.pendingEnrollments,
      icon: BookOpen,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Inscripciones Activas',
      value: stats.activeEnrollments,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Cursos Completados',
      value: stats.completedEnrollments,
      icon: Pause,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {index === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Progreso promedio: {stats.averageProgress}%
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
