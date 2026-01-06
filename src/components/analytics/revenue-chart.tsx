'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { MonthlyRevenue, RevenueByProduct, RevenueByPlan, RevenueByPaymentMethod } from '@/types/analytics'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F']

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[]
  title?: string
  description?: string
}

export function MonthlyRevenueChart({ 
  data, 
  title = 'Ingresos Mensuales',
  description = 'Evolución de ingresos en los últimos meses'
}: MonthlyRevenueChartProps) {
  const chartData = data.map(d => ({
    name: `${d.month} ${d.year}`,
    ingresos: d.revenue,
    facturas: d.invoiceCount,
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
            <BarChart data={chartData}>
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
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="ingresos" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface RevenueTrendChartProps {
  data: MonthlyRevenue[]
  title?: string
}

export function RevenueTrendChart({ data, title = 'Tendencia de Ingresos' }: RevenueTrendChartProps) {
  const chartData = data.map(d => ({
    name: `${d.month}`,
    ingresos: d.revenue,
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
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']} />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface RevenueByProductChartProps {
  data: RevenueByProduct[]
  title?: string
}

export function RevenueByProductChart({ data, title = 'Ingresos por Producto' }: RevenueByProductChartProps) {
  const chartData = data.map((d, idx) => ({
    name: d.productName,
    value: d.revenue,
    fill: COLORS[idx % COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface RevenueByPlanChartProps {
  data: RevenueByPlan[]
  title?: string
}

export function RevenueByPlanChart({ data, title = 'Distribución por Plan' }: RevenueByPlanChartProps) {
  const chartData = data.map((d, idx) => ({
    name: d.planName,
    ventas: d.salesCount,
    ingresos: d.revenue,
    fill: COLORS[idx % COLORS.length],
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
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']} />
              <Bar dataKey="ingresos" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface RevenueByPaymentMethodChartProps {
  data: RevenueByPaymentMethod[]
  title?: string
}

export function RevenueByPaymentMethodChart({ 
  data, 
  title = 'Ingresos por Método de Pago' 
}: RevenueByPaymentMethodChartProps) {
  const chartData = data.map((d, idx) => ({
    name: d.methodLabel,
    value: d.revenue,
    count: d.count,
    fill: COLORS[idx % COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
