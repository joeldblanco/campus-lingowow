'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Plus } from 'lucide-react'

import {
  getFinancialReport,
  type FinancialReportRow,
  type FinancialReportSummary,
} from '@/lib/actions/finance'
import { downloadCSV, downloadExcel, ExportButton } from '@/components/analytics/export-button'
import { CreateFinancialMovementDialog } from '@/components/admin/finance/create-financial-movement-dialog'
import { FinancialMovementsTable } from '@/components/admin/finance/financial-movements-table'
import { FinanceSummaryCards } from '@/components/admin/finance/finance-summary-cards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type FilterState = {
  startDate: string
  endDate: string
}

function formatDateInput(value: Date) {
  return value.toISOString().split('T')[0]
}

function buildInitialFilterState(): FilterState {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    startDate: formatDateInput(firstDay),
    endDate: formatDateInput(now),
  }
}

function buildActionFilters(filters: FilterState) {
  return {
    basis: 'cash' as const,
    startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : undefined,
    endDate: filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : undefined,
  }
}

function mapRowsForExport(rows: FinancialReportRow[]) {
  return rows.map((row) => ({
    Fecha: new Date(row.effectiveDate).toLocaleDateString('es-PE'),
    Movimiento: row.direction === 'INCOME' ? 'Entró' : 'Salió',
    Origen: row.sourceType,
    Categoría: row.category,
    Detalle: row.description,
    Relacionado: row.counterparty || '-',
    Monto: row.netAmount.toFixed(2),
    Moneda: row.currency,
    Estado: row.status,
    Manual: row.isManual ? 'Sí' : 'No',
  }))
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
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
        <CardContent className="pt-6">
          <Skeleton className="h-[420px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function FinanceDashboard() {
  const [filters, setFilters] = useState<FilterState>(() => buildInitialFilterState())
  const [rows, setRows] = useState<FinancialReportRow[]>([])
  const [summary, setSummary] = useState<FinancialReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadReport = async (nextFilters: FilterState) => {
    setError(null)
    const report = await getFinancialReport(buildActionFilters(nextFilters))
    setRows(report.rows)
    setSummary(report.summary)
  }

  useEffect(() => {
    void (async () => {
      try {
        const initialFilters = buildInitialFilterState()
        const report = await getFinancialReport(buildActionFilters(initialFilters))
        setRows(report.rows)
        setSummary(report.summary)
      } catch (loadError) {
        console.error('Error loading finance report:', loadError)
        setError('No se pudo cargar la caja del mes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const applyFilters = () => {
    startTransition(async () => {
      try {
        await loadReport(filters)
      } catch (loadError) {
        console.error('Error applying finance filters:', loadError)
        const message =
          loadError instanceof Error ? loadError.message : 'No se pudo actualizar la caja del mes'
        setError(message)
        toast.error(message)
      }
    })
  }

  const resetFilters = () => {
    const nextFilters = buildInitialFilterState()
    setFilters(nextFilters)

    startTransition(async () => {
      try {
        await loadReport(nextFilters)
      } catch (loadError) {
        console.error('Error resetting finance filters:', loadError)
        toast.error('No se pudo reiniciar la vista')
      }
    })
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    const exportData = mapRowsForExport(rows)
    const filename = `caja-del-mes-${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      downloadCSV(exportData, filename)
      return
    }

    downloadExcel(exportData, filename)
  }

  const refreshAfterCreate = async () => {
    await loadReport(filters)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Caja del Mes</h1>
          <p className="text-muted-foreground">
            Lo que entró por facturas, lo que salió por profesores y las demás salidas que cargas
            manualmente.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ExportButton onExport={handleExport} disabled={rows.length === 0 || loading} />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar otra salida
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          La plataforma registra automáticamente lo que entra por facturas pagadas y lo que sale
          por pagos a profesores. Aquí solo agregas manualmente las otras salidas del mes.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Período a Revisar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetFilters} disabled={isPending || loading}>
              Mes actual
            </Button>
            <Button onClick={applyFilters} disabled={isPending || loading}>
              {isPending ? 'Actualizando...' : 'Actualizar caja'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {summary && <FinanceSummaryCards summary={summary} />}
          <FinancialMovementsTable rows={rows} basis="cash" />
        </>
      )}

      <CreateFinancialMovementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={refreshAfterCreate}
      />
    </div>
  )
}