'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, Clock, TrendingUp } from 'lucide-react'
import type { PaymentPeriodSummary } from '@/lib/actions/teacher-payments'

interface PaymentSummaryCardsProps {
  summary: PaymentPeriodSummary
}

export function PaymentSummaryCards({ summary }: PaymentSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pago Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${summary.totalPayment.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalClasses} clases pagables
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profesores Activos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalTeachers}</div>
          <p className="text-xs text-muted-foreground">
            con clases en el período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground">
            horas impartidas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio por Clase</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${summary.averagePaymentPerClass.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            costo promedio
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
