'use client'

import { SimpleKPICard } from '@/components/analytics/kpi-card'
import type { FinancialReportSummary } from '@/lib/actions/finance'
import { ArrowUpCircle, FileText, Landmark, Wallet } from 'lucide-react'

interface FinanceSummaryCardsProps {
  summary: FinancialReportSummary
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  const teacherOutflows = summary.teacherExpenses + summary.incentiveExpenses

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SimpleKPICard
        title="Entró por Facturas"
        value={summary.invoiceIncome}
        format="currency"
        icon={<ArrowUpCircle className="h-5 w-5" />}
        description="Facturas asociadas al período o rango seleccionado"
      />
      <SimpleKPICard
        title="Salió a Profesores"
        value={teacherOutflows}
        format="currency"
        icon={<Landmark className="h-5 w-5" />}
        description="Costo docente e incentivos del período evaluado"
      />
      <SimpleKPICard
        title="Otras Salidas"
        value={summary.manualExpenses}
        format="currency"
        icon={<FileText className="h-5 w-5" />}
        description="Salidas manuales registradas por fecha"
      />
      <SimpleKPICard
        title="Te Queda"
        value={summary.netIncome}
        format="currency"
        icon={<Wallet className="h-5 w-5" />}
        description={`${summary.movementCount} movimientos registrados en total`}
      />
    </div>
  )
}
