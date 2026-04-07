'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Filter, Plus } from 'lucide-react'

import {
  getFinancialReport,
  type FinancialProjection,
  type FinancialReportRow,
  type FinancialReportSummary,
} from '@/lib/actions/finance'
import { downloadCSV, downloadExcel, ExportButton } from '@/components/analytics/export-button'
import { CreateFinancialMovementDialog } from '@/components/admin/finance/create-financial-movement-dialog'
import { FinancialMovementsTable } from '@/components/admin/finance/financial-movements-table'
import {
  FinanceProjectionCards,
  FinanceSummaryCards,
} from '@/components/admin/finance/finance-summary-cards'
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
import { financeManualCategories } from '@/schemas/finance'

type FilterState = {
  basis: 'cash' | 'accrual'
  startDate: string
  endDate: string
  direction: 'ALL' | 'INCOME' | 'EXPENSE'
  category: string
  search: string
}

function formatDateInput(value: Date) {
  return value.toISOString().split('T')[0]
}

function buildInitialFilterState(): FilterState {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    basis: 'accrual',
    startDate: formatDateInput(firstDay),
    endDate: formatDateInput(now),
    direction: 'ALL',
    category: 'all',
    search: '',
  }
}

function buildActionFilters(filters: FilterState) {
  return {
    basis: filters.basis,
    startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : undefined,
    endDate: filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : undefined,
    direction: filters.direction,
    category: filters.category === 'all' ? undefined : filters.category,
    search: filters.search || undefined,
  } as const
}

function mapRowsForExport(rows: FinancialReportRow[]) {
  return rows.map((row) => ({
    Fecha: new Date(row.effectiveDate).toLocaleDateString('es-PE'),
    Dirección: row.direction === 'INCOME' ? 'Ingreso' : 'Egreso',
    Fuente: row.sourceType,
    Categoría: row.category,
    Descripción: row.description,
    Contraparte: row.counterparty || '-',
    Neto: row.netAmount.toFixed(2),
    Moneda: row.currency,
    Devengado: new Date(row.accrualDate).toLocaleDateString('es-PE'),
    Caja: row.cashDate ? new Date(row.cashDate).toLocaleDateString('es-PE') : '-',
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
  const initialFilters = useMemo(() => buildInitialFilterState(), [])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [rows, setRows] = useState<FinancialReportRow[]>([])
  const [summary, setSummary] = useState<FinancialReportSummary | null>(null)
  const [projection, setProjection] = useState<FinancialProjection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set([
        'Facturacion',
        'Pagos a docentes',
        'Incentivos docentes',
        ...financeManualCategories,
        ...rows.map((row) => row.category),
      ])
    ).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const loadReport = async (nextFilters: FilterState) => {
    setError(null)
    const report = await getFinancialReport(buildActionFilters(nextFilters))
    setRows(report.rows)
    setSummary(report.summary)
    setProjection(report.projection)
  }

  useEffect(() => {
    void (async () => {
      try {
        const report = await getFinancialReport(buildActionFilters(initialFilters))
        setRows(report.rows)
        setSummary(report.summary)
        setProjection(report.projection)
      } catch (loadError) {
        console.error('Error loading finance report:', loadError)
        setError('No se pudo cargar el centro financiero')
      } finally {
        setLoading(false)
      }
    })()
  }, [initialFilters])

  const applyFilters = () => {
    startTransition(async () => {
      try {
        await loadReport(filters)
      } catch (loadError) {
        console.error('Error applying finance filters:', loadError)
        const message = loadError instanceof Error ? loadError.message : 'No se pudo aplicar el filtro'
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
        toast.error('No se pudo reiniciar el reporte')
      }
    })
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    const exportData = mapRowsForExport(rows)
    const filename = `centro-financiero-${filters.basis}-${new Date().toISOString().split('T')[0]}`

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
          <h1 className="text-3xl font-bold">Centro Financiero</h1>
          <p className="text-muted-foreground">
            Proyección de ganancia neta al cierre del mes y detalle financiero del período.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ExportButton onExport={handleExport} disabled={rows.length === 0 || loading} />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar movimiento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Financieros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2">
              <Label>Base</Label>
              <Select
                value={filters.basis}
                onValueChange={(value: 'cash' | 'accrual') =>
                  setFilters((current) => ({ ...current, basis: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accrual">Devengado</SelectItem>
                  <SelectItem value="cash">Caja real</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Select
                value={filters.direction}
                onValueChange={(value: 'ALL' | 'INCOME' | 'EXPENSE') =>
                  setFilters((current) => ({ ...current, direction: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INCOME">Ingresos</SelectItem>
                  <SelectItem value="EXPENSE">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters((current) => ({ ...current, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Búsqueda</Label>
              <Input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Descripción, proveedor..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetFilters} disabled={isPending || loading}>
              Limpiar
            </Button>
            <Button onClick={applyFilters} disabled={isPending || loading}>
              {isPending ? 'Aplicando...' : 'Aplicar filtros'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {projection && (
            <Card>
              <CardHeader>
                <CardTitle>Proyección de Cierre de Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FinanceProjectionCards projection={projection} />
                <div className="space-y-1 text-sm text-muted-foreground">
                  {projection.assumptions.map((assumption) => (
                    <p key={assumption}>• {assumption}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {summary && <FinanceSummaryCards summary={summary} />}
          <FinancialMovementsTable rows={rows} basis={filters.basis} />
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