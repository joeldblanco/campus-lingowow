'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  ShoppingCart,
  BookOpen,
} from 'lucide-react'
import type { ProductAnalytics } from '@/types/analytics'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F']

interface ProductAnalyticsChartsProps {
  data: ProductAnalytics
}

export function ProductAnalyticsCharts({ data }: ProductAnalyticsChartsProps) {
  const totalSales = data.topProducts.reduce((sum, p) => sum + p.totalSales, 0)
  const totalRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0)

  const planChartData = data.planDistribution.map((p, idx) => ({
    name: p.planName,
    ventas: p.totalSales,
    ingresos: p.revenue,
    fill: COLORS[idx % COLORS.length],
  }))

  const productChartData = data.topProducts.map((p, idx) => ({
    name: p.productName,
    value: p.revenue,
    fill: COLORS[idx % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">productos vendidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">de productos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.courseEnrollments.length}</div>
            <p className="text-xs text-muted-foreground">con inscripciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Productos más vendidos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos Más Vendidos</CardTitle>
          <CardDescription>Ranking de productos por ingresos generados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-4">
                <span className="font-bold text-muted-foreground w-6">{index + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{product.productName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {product.totalSales} ventas
                      </span>
                      <span className="font-semibold">${product.revenue.toFixed(2)}</span>
                      {product.trend !== 0 && (
                        <Badge 
                          variant={product.trend > 0 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {product.trend > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {product.trend > 0 ? '+' : ''}{product.trend}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de productos disponibles
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de distribución */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por Producto */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {productChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribución por Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Plan</CardTitle>
            <CardDescription>Conversión por nivel de plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'ventas') return [value, 'Ventas']
                      return [`$${value.toFixed(2)}`, 'Ingresos']
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ventas" fill="hsl(var(--primary))" name="Ventas" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Planes */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Plan</CardTitle>
          <CardDescription>Detalle de ventas y conversión por plan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Conversión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.planDistribution.map((plan) => (
                <TableRow key={plan.planId}>
                  <TableCell className="font-medium">{plan.planName}</TableCell>
                  <TableCell>{plan.productName}</TableCell>
                  <TableCell className="text-right">{plan.totalSales}</TableCell>
                  <TableCell className="text-right">${plan.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{plan.conversionRate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.planDistribution.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay datos de planes disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inscripciones por Curso */}
      <Card>
        <CardHeader>
          <CardTitle>Inscripciones por Curso</CardTitle>
          <CardDescription>Estado de inscripciones en cada curso</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Activas</TableHead>
                <TableHead className="text-right">Completadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.courseEnrollments.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-medium">{course.courseTitle}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.courseLanguage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{course.totalEnrollments}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600">{course.activeEnrollments}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-blue-600">{course.completedEnrollments}</span>
                  </TableCell>
                </TableRow>
              ))}
              {data.courseEnrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay datos de cursos disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
