'use client'

import { SimpleKPICard } from '@/components/analytics/kpi-card'
import type { FinancialReportSummary } from '@/lib/actions/finance'
import { ArrowDownCircle, ArrowUpCircle, Receipt, Wallet } from 'lucide-react'

interface FinanceSummaryCardsProps {
  summary: FinancialReportSummary
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SimpleKPICard
        title="Ingresos"
        value={summary.totalIncome}
        format="currency"
        icon={<ArrowUpCircle className="h-5 w-5" />}
        description="Ingresos netos dentro del rango seleccionado"
      />
      <SimpleKPICard
        title="Egresos"
        value={summary.totalExpenses}
        format="currency"
        icon={<ArrowDownCircle className="h-5 w-5" />}
        description="Salidas contabilizadas en el período"
      />
      <SimpleKPICard
        title="Ingreso Neto"
        value={summary.netIncome}
        format="currency"
        icon={<Wallet className="h-5 w-5" />}
        description={`Vista ${summary.basis === 'cash' ? 'de caja real' : 'devengada'}`}
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