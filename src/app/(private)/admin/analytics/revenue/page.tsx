import { Suspense } from 'react'
import { getRevenueAnalytics } from '@/lib/actions/analytics'
import { 
  MonthlyRevenueChart, 
  RevenueByProductChart, 
  RevenueByPlanChart,
  RevenueByPaymentMethodChart 
} from '@/components/analytics/revenue-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  Ticket,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function RevenueAnalyticsDashboard() {
  const data = await getRevenueAnalytics(12)

  return (
    <div className="space-y-6">
      {/* KPIs de Ingresos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">últimos 12 meses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.averageTicket.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por factura</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descuentos Otorgados</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${data.totalDiscounts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">en cupones usados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupones Usados</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.couponUsage.length}</div>
            <p className="text-xs text-muted-foreground">cupones diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Mejores y Peores Meses */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.bestMonth && (
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
                Mejor Mes (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                ${data.bestMonth.revenue.toFixed(2)}
              </div>
              <p className="text-sm text-green-600 dark:text-green-500">
                {data.bestMonth.month} {data.bestMonth.year} - {data.bestMonth.invoiceCount} facturas
              </p>
            </CardContent>
          </Card>
        )}
        {data.worstMonth && (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
                Mes Más Bajo (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                ${data.worstMonth.revenue.toFixed(2)}
              </div>
              <p className="text-sm text-red-600 dark:text-red-500">
                {data.worstMonth.month} {data.worstMonth.year} - {data.worstMonth.invoiceCount} facturas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico de Ingresos Mensuales */}
      <MonthlyRevenueChart 
        data={data.monthlyRevenue} 
        title="Ingresos por Mes"
        description="Evolución de ingresos en los últimos 12 meses"
      />

      {/* Gráficos de distribución */}
      <div className="grid gap-4 md:grid-cols-2">
        <RevenueByProductChart data={data.byProduct} title="Ingresos por Producto" />
        <RevenueByPlanChart data={data.byPlan} title="Ingresos por Plan" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueByPaymentMethodChart data={data.byPaymentMethod} title="Por Método de Pago" />
        
        {/* Tabla de Ingresos por Idioma */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Idioma</CardTitle>
            <CardDescription>Distribución de ventas por idioma de curso</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Idioma</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byLanguage.map((lang) => (
                  <TableRow key={lang.language}>
                    <TableCell>
                      <span className="font-medium">{lang.languageLabel}</span>
                    </TableCell>
                    <TableCell className="text-right">{lang.salesCount}</TableCell>
                  </TableRow>
                ))}
                {data.byLanguage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Uso de Cupones */}
      {data.couponUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uso de Cupones</CardTitle>
            <CardDescription>Cupones utilizados y descuentos otorgados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Descuento Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.couponUsage.map((coupon) => (
                  <TableRow key={coupon.couponId}>
                    <TableCell>
                      <Badge variant="outline">{coupon.couponCode}</Badge>
                    </TableCell>
                    <TableCell>{coupon.couponName || '-'}</TableCell>
                    <TableCell className="text-right">{coupon.usageCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${coupon.totalDiscount.toFixed(2)}
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

export default function RevenueAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Análisis de Ingresos</h1>
        <p className="text-muted-foreground">
          Desglose detallado de ingresos por producto, plan, idioma y método de pago
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <RevenueAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
