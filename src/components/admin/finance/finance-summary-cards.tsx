'use client'

import { SimpleKPICard } from '@/components/analytics/kpi-card'
import type { FinancialProjection, FinancialReportSummary } from '@/lib/actions/finance'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  GraduationCap,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'

interface FinanceProjectionCardsProps {
  projection: FinancialProjection
}

export function FinanceProjectionCards({ projection }: FinanceProjectionCardsProps) {
  const projectedRemainingNet =
    projection.projectedAdditionalIncome - projection.projectedAdditionalExpenses

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SimpleKPICard
        title="Neto Proyectado al Cierre"
        value={projection.projectedClosingNet}
        format="currency"
        icon={<TrendingUp className="h-5 w-5" />}
        description={`${projection.daysRemaining} días restantes en el mes`}
      />
      <SimpleKPICard
        title="Ingreso Pendiente Proyectado"
        value={projection.projectedAdditionalIncome}
        format="currency"
        icon={<CalendarRange className="h-5 w-5" />}
        description={`${projection.remainingSubscriptionsDue} cobros recurrentes pendientes`}
      />
      <SimpleKPICard
        title="Costo Docente Pendiente"
        value={projection.projectedScheduledTeacherExpenses}
        format="currency"
        icon={<GraduationCap className="h-5 w-5" />}
        description={`${projection.remainingConfirmedClasses} clases confirmadas aún por impartir`}
      />
      <SimpleKPICard
        title="Neto Adicional Esperado"
        value={projectedRemainingNet}
        format="currency"
        icon={<Wallet className="h-5 w-5" />}
        description="Resto del mes según compromisos ya visibles"
      />
    </div>
  )
}

interface FinanceSummaryCardsProps {
  summary: FinancialReportSummary
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SimpleKPICard
        title="Ingresos Reales del Rango"
        value={summary.totalIncome}
        format="currency"
        icon={<ArrowUpCircle className="h-5 w-5" />}
        description="Acumulado actual del filtro seleccionado"
      />
      <SimpleKPICard
        title="Egresos Reales del Rango"
        value={summary.totalExpenses}
        format="currency"
        icon={<ArrowDownCircle className="h-5 w-5" />}
        description="Costos ya reconocidos en el período"
      />
      <SimpleKPICard
        title="Neto Actual"
        value={summary.netIncome}
        format="currency"
        icon={<Wallet className="h-5 w-5" />}
        description={`Vista ${summary.basis === 'cash' ? 'de caja real' : 'devengada'} ya cerrada hasta la fecha`}
      />
      <SimpleKPICard
        title="Descuentos"
        value={summary.totalDiscounts}
        format="currency"
        icon={<Receipt className="h-5 w-5" />}
        description={`${summary.movementCount} movimientos en el reporte`}
      />
    </div>
  )
}