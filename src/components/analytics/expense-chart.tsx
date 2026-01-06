'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
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
import type { MonthlyExpense, TeacherPayment } from '@/types/analytics'
import { getUserAvatarUrl } from '@/lib/utils'

interface MonthlyExpenseChartProps {
  data: MonthlyExpense[]
  title?: string
  description?: string
}

export function MonthlyExpenseChart({ 
  data, 
  title = 'Gastos Mensuales',
  description = 'Pagos a profesores por mes'
}: MonthlyExpenseChartProps) {
  const chartData = data.map(d => ({
    name: `${d.month} ${d.year}`,
    pagos: d.totalPayments,
    clases: d.classCount,
    profesores: d.teacherCount,
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
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'pagos') return [`$${value.toFixed(2)}`, 'Pagos']
                  if (name === 'clases') return [value, 'Clases']
                  return [value, name]
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="pagos" 
                fill="hsl(var(--destructive) / 0.2)" 
                stroke="hsl(var(--destructive))"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="clases" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface TeacherPaymentsTableProps {
  data: TeacherPayment[]
  title?: string
  description?: string
}

export function TeacherPaymentsTable({ 
  data, 
  title = 'Pagos por Profesor',
  description = 'Desglose de pagos del mes actual'
}: TeacherPaymentsTableProps) {
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
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">Pago Total</TableHead>
              <TableHead className="text-right">Promedio/Clase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((teacher) => (
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
                  {teacher.rankName ? (
                    <Badge variant="outline">{teacher.rankName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{teacher.totalClasses}</TableCell>
                <TableCell className="text-right">{teacher.totalHours.toFixed(1)}h</TableCell>
                <TableCell className="text-right font-medium">
                  ${teacher.totalPayment.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ${teacher.averagePerClass.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay datos de pagos para este período
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface ExpenseTrendChartProps {
  data: MonthlyExpense[]
  title?: string
}

export function ExpenseTrendChart({ data, title = 'Tendencia de Gastos' }: ExpenseTrendChartProps) {
  const chartData = data.map(d => ({
    name: d.month,
    gastos: d.totalPayments,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Gastos']} />
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--destructive))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface TeacherPaymentsBarChartProps {
  data: TeacherPayment[]
  title?: string
  limit?: number
}

export function TeacherPaymentsBarChart({ 
  data, 
  title = 'Top Profesores por Pago',
  limit = 10
}: TeacherPaymentsBarChartProps) {
  const chartData = data.slice(0, limit).map(d => ({
    name: d.teacherName.split(' ')[0],
    pago: d.totalPayment,
    clases: d.totalClasses,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(value) => `$${value}`} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'pago') return [`$${value.toFixed(2)}`, 'Pago']
                  return [value, 'Clases']
                }}
              />
              <Bar dataKey="pago" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
