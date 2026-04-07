'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Plus } from 'lucide-react'

import { getRelevantPeriods } from '@/lib/actions/academic-period'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type FilterState = {
  periodId: string
  startDate: string
  endDate: string
}

interface AcademicPeriodOption {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

function formatDateInput(value: Date) {
  return value.toISOString().split('T')[0]
}

function buildInitialFilterState(): FilterState {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    periodId: 'custom',
    startDate: formatDateInput(firstDay),
    endDate: formatDateInput(now),
  }
}

function buildFilterStateFromPeriod(period: AcademicPeriodOption): FilterState {
  return {
    periodId: period.id,
    startDate: formatDateInput(new Date(period.startDate)),
    endDate: formatDateInput(new Date(period.endDate)),
  }
}

function buildDefaultFilterState(periods: AcademicPeriodOption[]) {
  const activePeriod = periods.find((period) => period.isActive)
  return activePeriod ? buildFilterStateFromPeriod(activePeriod) : buildInitialFilterState()
}

function buildActionFilters(filters: FilterState) {
  return {
    basis: 'cash' as const,
    periodId: filters.periodId !== 'custom' ? filters.periodId : undefined,
    startDate:
      filters.periodId === 'custom' && filters.startDate
        ? new Date(`${filters.startDate}T00:00:00`)
        : undefined,
    endDate:
      filters.periodId === 'custom' && filters.endDate
        ? new Date(`${filters.endDate}T23:59:59`)
        : undefined,
  }
}

function mapRowsForExport(rows: FinancialReportRow[]) {
  return rows.map((row) => ({
    Fecha: new Date(row.effectiveDate).toLocaleDateString('es-PE'),
    Movimiento: row.direction === 'INCOME' ? 'Entró' : 'Salió',
    Origen: row.sourceType,
    'Período Académico': row.academicPeriodName || '-',
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
  const [periods, setPeriods] = useState<AcademicPeriodOption[]>([])
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
        const periodsData = await getRelevantPeriods()
        const initialFilters = buildDefaultFilterState(periodsData)

        setPeriods(periodsData)
        setFilters(initialFilters)

        const report = await getFinancialReport(buildActionFilters(initialFilters))
        setRows(report.rows)
        setSummary(report.summary)
      } catch (loadError) {
        console.error('Error loading finance report:', loadError)
        setError('No se pudo cargar el resultado del período')
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
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo actualizar el resultado del período'
        setError(message)
        toast.error(message)
      }
    })
  }

  const resetFilters = () => {
    const nextFilters = buildDefaultFilterState(periods)
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

  const selectedPeriod = periods.find((period) => period.id === filters.periodId) || null

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setFilters(buildInitialFilterState())
      return
    }

    const period = periods.find((item) => item.id === value)
    if (!period) {
      return
    }

    setFilters(buildFilterStateFromPeriod(period))
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resultado del Período</h1>
          <p className="text-muted-foreground">
            Ingresos por clase y costo docente asociados a clases agendadas dentro del período
            académico, más gastos fijos del mes y descuentos automáticos por pasarela y
            ofrenda.
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
          {selectedPeriod
            ? `Si una clase está agendada dentro de ${selectedPeriod.name}, ese período suma tanto el ingreso relacionado como el costo docente. El ingreso se agrupa por estudiante y el egreso por profesor. Los gastos fijos, descuentos y demás movimientos manuales se toman desde el inicio hasta el fin del mes actual, y la pasarela/ofrenda se calculan automáticamente sobre ese resultado.`
            : 'Sin período académico seleccionado, la vista usa el rango elegido para clases y pagos docentes. Los gastos fijos, descuentos y demás movimientos manuales siempre se toman desde el inicio hasta el fin del mes actual, y la pasarela/ofrenda se calculan automáticamente sobre ese resultado.'}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Alcance del Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label>Período académico</Label>
              <Select value={filters.periodId} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Ver por fechas</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name}
                      {period.isActive ? ' (Actual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                disabled={filters.periodId !== 'custom'}
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
                disabled={filters.periodId !== 'custom'}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetFilters} disabled={isPending || loading}>
              {periods.some((period) => period.isActive) ? 'Período actual' : 'Mes actual'}
            </Button>
            <Button onClick={applyFilters} disabled={isPending || loading}>
              {isPending ? 'Actualizando...' : 'Actualizar resultado'}
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
        rows={rows}
        scope={{
          periodName: selectedPeriod?.name || null,
        }}
      />
    </div>
  )
}
