'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import type { TeacherStats, TeacherRanking } from '@/types/analytics'
import { getUserAvatarUrl } from '@/lib/utils'
import { Trophy, Users, DollarSign, Clock, TrendingUp, TrendingDown } from 'lucide-react'

interface TeacherRankingCardProps {
  ranking: TeacherRanking
  title?: string
}

export function TeacherRankingCard({ ranking, title = 'Ranking de Profesores' }: TeacherRankingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription>Comparativa de rendimiento de profesores</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="classes">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="classes">Por Clases</TabsTrigger>
            <TabsTrigger value="earnings">Por Ingresos</TabsTrigger>
            <TabsTrigger value="students">Por Estudiantes</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>
          
          <TabsContent value="classes" className="mt-4">
            <TeacherRankingList 
              teachers={ranking.byClasses.slice(0, 10)} 
              metric="completedClasses"
              metricLabel="clases"
            />
          </TabsContent>
          
          <TabsContent value="earnings" className="mt-4">
            <TeacherRankingList 
              teachers={ranking.byEarnings.slice(0, 10)} 
              metric="totalEarnings"
              metricLabel="ganado"
              isCurrency
            />
          </TabsContent>
          
          <TabsContent value="students" className="mt-4">
            <TeacherRankingList 
              teachers={ranking.byStudents.slice(0, 10)} 
              metric="uniqueStudents"
              metricLabel="estudiantes"
            />
          </TabsContent>
          
          <TabsContent value="activity" className="mt-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Más Activos
                </h4>
                <TeacherRankingList 
                  teachers={ranking.mostActive.slice(0, 5)} 
                  metric="completedClasses"
                  metricLabel="clases"
                  compact
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Menos Activos
                </h4>
                <TeacherRankingList 
                  teachers={ranking.leastActive.slice(0, 5)} 
                  metric="completedClasses"
                  metricLabel="clases"
                  compact
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface TeacherRankingListProps {
  teachers: TeacherStats[]
  metric: keyof TeacherStats
  metricLabel: string
  isCurrency?: boolean
  compact?: boolean
}

function TeacherRankingList({ 
  teachers, 
  metric, 
  metricLabel, 
  isCurrency = false,
  compact = false
}: TeacherRankingListProps) {
  const maxValue = Math.max(...teachers.map(t => Number(t[metric]) || 0))

  return (
    <div className="space-y-3">
      {teachers.map((teacher, index) => {
        const value = Number(teacher[metric]) || 0
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

        return (
          <div 
            key={teacher.teacherId} 
            className={`flex items-center gap-3 ${compact ? 'py-1' : 'py-2'}`}
          >
            <span className={`font-bold text-muted-foreground ${compact ? 'w-4 text-xs' : 'w-6'}`}>
              {index + 1}
            </span>
            <Avatar className={compact ? 'h-6 w-6' : 'h-8 w-8'}>
              <AvatarImage 
                src={getUserAvatarUrl(teacher.teacherId, teacher.teacherImage)} 
                alt={teacher.teacherName} 
              />
              <AvatarFallback className="text-xs">
                {teacher.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                  {teacher.teacherName}
                </span>
                <span className={`font-semibold ${compact ? 'text-sm' : ''}`}>
                  {isCurrency ? `$${value.toFixed(2)}` : value} {metricLabel}
                </span>
              </div>
              {!compact && (
                <Progress value={percentage} className="h-1.5" />
              )}
            </div>
          </div>
        )
      })}
      {teachers.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          No hay datos disponibles
        </p>
      )}
    </div>
  )
}

interface TeacherStatsTableProps {
  teachers: TeacherStats[]
  title?: string
  description?: string
}

export function TeacherStatsTable({ 
  teachers, 
  title = 'Estadísticas de Profesores',
  description = 'Métricas detalladas de rendimiento'
}: TeacherStatsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesor</TableHead>
              <TableHead>Rango</TableHead>
              <TableHead className="text-right">Clases</TableHead>
              <TableHead className="text-right">Asistencia</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">Estudiantes</TableHead>
              <TableHead className="text-right">Ganancias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.teacherId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={getUserAvatarUrl(teacher.teacherId, teacher.teacherImage)} 
                        alt={teacher.teacherName} 
                      />
                      <AvatarFallback>
                        {teacher.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{teacher.teacherName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {teacher.teacherRank ? (
                    <Badge variant="outline">{teacher.teacherRank}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span>{teacher.completedClasses}</span>
                    <span className="text-xs text-muted-foreground">
                      de {teacher.totalClasses}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant={teacher.attendanceRate >= 90 ? 'default' : teacher.attendanceRate >= 70 ? 'secondary' : 'destructive'}
                  >
                    {teacher.attendanceRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{teacher.totalHours.toFixed(1)}h</TableCell>
                <TableCell className="text-right">{teacher.uniqueStudents}</TableCell>
                <TableCell className="text-right font-medium">
                  ${teacher.totalEarnings.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {teachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay datos de profesores disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface TeacherSummaryCardsProps {
  totalTeachers: number
  activeTeachers: number
  averageClassesPerTeacher: number
  averageEarningsPerTeacher: number
}

export function TeacherSummaryCards({
  totalTeachers,
  activeTeachers,
  averageClassesPerTeacher,
  averageEarningsPerTeacher,
}: TeacherSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Profesores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTeachers}</div>
          <p className="text-xs text-muted-foreground">
            {activeTeachers} activos este período
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profesores Activos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeTeachers}</div>
          <p className="text-xs text-muted-foreground">
            {totalTeachers > 0 ? ((activeTeachers / totalTeachers) * 100).toFixed(0) : 0}% del total
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio Clases</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageClassesPerTeacher}</div>
          <p className="text-xs text-muted-foreground">
            clases por profesor
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio Ganancias</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${averageEarningsPerTeacher.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            por profesor activo
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
