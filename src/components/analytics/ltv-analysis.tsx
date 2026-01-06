'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'recharts'
import type { StudentLTV } from '@/types/analytics'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F']

interface LTVAnalysisProps {
  data: StudentLTV
}

export function LTVAnalysis({ data }: LTVAnalysisProps) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.averageLTV.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por estudiante</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Mediana</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.medianLTV.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">valor central</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Proyectado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${data.projectedLTV.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">estimación futura</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Plan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.ltvByPlan[0]?.ltv.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.ltvByPlan[0]?.planName || 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de LTV */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de LTV</CardTitle>
            <CardDescription>Cantidad de estudiantes por rango de valor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ltvDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Estudiantes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LTV por Producto</CardTitle>
            <CardDescription>Valor promedio por tipo de producto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.ltvByProduct.map((p, idx) => ({ ...p, fill: COLORS[idx % COLORS.length] }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="ltv"
                    nameKey="productName"
                    label={({ productName, ltv }) => `${productName}: $${ltv.toFixed(0)}`}
                  >
                    {data.ltvByProduct.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'LTV']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LTV por Plan */}
      <Card>
        <CardHeader>
          <CardTitle>LTV por Plan</CardTitle>
          <CardDescription>Valor de vida promedio de estudiantes por plan adquirido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ltvByPlan} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="planName" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'LTV Promedio']} />
                <Bar dataKey="ltv" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de LTV por Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.ltvByPlan.map((plan, idx) => (
              <div key={plan.planName} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-medium">{plan.planName}</span>
                </div>
                <Badge variant="outline" className="text-lg font-bold">
                  ${plan.ltv.toFixed(2)}
                </Badge>
              </div>
            ))}
            {data.ltvByPlan.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay datos de LTV por plan disponibles
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
