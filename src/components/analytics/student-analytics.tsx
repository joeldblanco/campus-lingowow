'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StudentGrowth, StudentActivity } from '@/types/analytics'
import { getUserAvatarUrl } from '@/lib/utils'
import { Users, UserPlus, UserMinus, TrendingUp, AlertCircle } from 'lucide-react'

interface StudentGrowthChartProps {
  data: StudentGrowth[]
  title?: string
  description?: string
}

export function StudentGrowthChart({ 
  data, 
  title = 'Crecimiento de Estudiantes',
  description = 'Evolución mensual de la base de estudiantes'
}: StudentGrowthChartProps) {
  const chartData = data.map(d => ({
    name: `${d.month} ${d.year}`,
    nuevos: d.newStudents,
    total: d.totalStudents,
    abandonos: d.churnedStudents,
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
            <AreaChart data={chartData}>
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stackId="1"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.3)"
                name="Total Estudiantes"
              />
              <Area 
                type="monotone" 
                dataKey="nuevos" 
                stackId="2"
                stroke="hsl(142 76% 36%)"
                fill="hsl(142 76% 36% / 0.3)"
                name="Nuevos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface RetentionChartProps {
  data: StudentGrowth[]
  title?: string
}

export function RetentionChart({ data, title = 'Retención vs Abandono' }: RetentionChartProps) {
  const chartData = data.map(d => ({
    name: d.month,
    nuevos: d.newStudents,
    abandonos: d.churnedStudents,
    neto: d.newStudents - d.churnedStudents,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="nuevos" fill="hsl(142 76% 36%)" name="Nuevos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="abandonos" fill="hsl(var(--destructive))" name="Abandonos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface StudentActivityTableProps {
  students: StudentActivity[]
  title?: string
  description?: string
  type?: 'active' | 'inactive'
}

export function StudentActivityTable({ 
  students, 
  title = 'Actividad de Estudiantes',
  description,
  type = 'active'
}: StudentActivityTableProps) {
  const isInactive = type === 'inactive'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isInactive ? (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <TrendingUp className="h-5 w-5 text-green-500" />
          )}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead className="text-right">Clases</TableHead>
              <TableHead className="text-right">Última Clase</TableHead>
              <TableHead className="text-right">Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.studentId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={getUserAvatarUrl(student.studentId, student.studentImage)} 
                        alt={student.studentName} 
                      />
                      <AvatarFallback>
                        {student.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{student.studentName}</span>
                      <p className="text-xs text-muted-foreground">
                        Desde {student.enrollmentDate}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{student.courseName}</TableCell>
                <TableCell className="text-right">{student.completedClasses}</TableCell>
                <TableCell className="text-right">
                  {student.lastClassDate ? (
                    <span className={isInactive ? 'text-yellow-600' : ''}>
                      {student.lastClassDate}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Nunca</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={student.progress} className="w-16 h-2" />
                    <span className="text-sm">{student.progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay estudiantes en esta categoría
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface StudentSummaryCardsProps {
  totalStudents: number
  activeStudents: number
  newThisMonth: number
  retentionRate: number
  churnRate: number
}

export function StudentSummaryCards({
  totalStudents,
  activeStudents,
  newThisMonth,
  retentionRate,
  churnRate,
}: StudentSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
          <p className="text-xs text-muted-foreground">
            registrados en el sistema
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estudiantes Activos</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeStudents}</div>
          <p className="text-xs text-muted-foreground">
            con inscripción activa
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nuevos Este Mes</CardTitle>
          <UserPlus className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newThisMonth}</div>
          <p className="text-xs text-muted-foreground">
            estudiantes registrados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{retentionRate}%</div>
          <p className="text-xs text-muted-foreground">
            estudiantes que continúan
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Abandono</CardTitle>
          <UserMinus className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{churnRate}%</div>
          <p className="text-xs text-muted-foreground">
            estudiantes que dejaron
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
