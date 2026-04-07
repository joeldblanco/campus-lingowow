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
        description="Cobros automáticos registrados en el período"
      />
      <SimpleKPICard
        title="Salió a Profesores"
        value={teacherOutflows}
        format="currency"
        icon={<Landmark className="h-5 w-5" />}
        description="Pagos a profesores e incentivos ya registrados"
      />
      <SimpleKPICard
        title="Otras Salidas"
        value={summary.manualExpenses}
        format="currency"
        icon={<FileText className="h-5 w-5" />}
        description="Salidas manuales que cargas aparte"
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
