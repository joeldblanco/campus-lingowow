'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FinancialReportRow } from '@/lib/actions/finance'
import { cn } from '@/lib/utils'
import {
  type ColumnFiltersState,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FinancialMovementsTableProps {
  title: string
  description: string
  rows: FinancialReportRow[]
  allowInlineEdit?: boolean
  emptyMessage?: string
  onInlineAmountSave?: (row: FinancialReportRow, amount: number) => Promise<void>
}

const sourceLabels: Record<string, string> = {
  MANUAL: 'Manual',
  RECURRING_RULE: 'Configuración general',
  SCHEDULED_CLASS_REVENUE: 'Ingreso por estudiante',
  AUTO_GATEWAY_FEE: 'Pasarela 6%',
  AUTO_OFFERING: 'Ofrenda 10%',
  INVOICE: 'Factura',
  TEACHER_PAYABLE: 'Pago programado',
  TEACHER_PAYMENT_CONFIRMATION: 'Pago confirmado',
  TEACHER_INCENTIVE: 'Incentivo',
  REFUND: 'Reembolso',
  ADJUSTMENT: 'Ajuste',
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function AmountCell({
  row,
  allowInlineEdit,
  onInlineAmountSave,
}: {
  row: FinancialReportRow
  allowInlineEdit: boolean
  onInlineAmountSave?: (row: FinancialReportRow, amount: number) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftAmount, setDraftAmount] = useState(row.netAmount.toFixed(2))
  const [isSaving, setIsSaving] = useState(false)

  const isEditable = allowInlineEdit && Boolean(row.editableMode && row.editableId)

  const handleSave = async () => {
    if (!onInlineAmountSave) {
      return
    }

    const nextAmount = Number(draftAmount)

    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      toast.error('Ingresa un monto valido')
      return
    }

    setIsSaving(true)
    try {
      await onInlineAmountSave(row, nextAmount)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditable) {
    return (
      <div className="text-right font-semibold">{formatCurrency(row.netAmount, row.currency)}</div>
    )
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <div className="text-right font-semibold">
          {formatCurrency(row.netAmount, row.currency)}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setDraftAmount(row.netAmount.toFixed(2))
            setIsEditing(true)
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        value={draftAmount}
        onChange={(event) => setDraftAmount(event.target.value)}
        className="h-8 w-28 text-right"
        inputMode="decimal"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void handleSave()
          }

          if (event.key === 'Escape') {
            setDraftAmount(row.netAmount.toFixed(2))
            setIsEditing(false)
          }
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => void handleSave()}
        disabled={isSaving}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          setDraftAmount(row.netAmount.toFixed(2))
          setIsEditing(false)
        }}
        disabled={isSaving}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-[170px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todos</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FinancialMovementsTable({
  title,
  description,
  rows,
  allowInlineEdit = false,
  emptyMessage = 'No hay movimientos para los filtros seleccionados.',
  onInlineAmountSave,
}: FinancialMovementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'effectiveDate', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns: ColumnDef<FinancialReportRow>[] = [
    {
      accessorKey: 'effectiveDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatDate(row.original.effectiveDate)}</div>
          <div className="text-xs text-muted-foreground">
            Devengado: {formatDate(row.original.accrualDate)}
            {row.original.cashDate ? ` • Caja: ${formatDate(row.original.cashDate)}` : ''}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'direction',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Flujo" />,
      filterFn: (row, columnId, value) => value === 'ALL' || row.getValue(columnId) === value,
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'INCOME' ? 'default' : 'secondary'}>
          {row.original.direction === 'INCOME' ? 'Ingreso' : 'Egreso'}
        </Badge>
      ),
    },
    {
      accessorKey: 'sourceType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      filterFn: (row, columnId, value) => value === 'ALL' || row.getValue(columnId) === value,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {sourceLabels[row.original.sourceType] || row.original.sourceType}
          </Badge>
          {row.original.hasMonthOverride && <Badge variant="secondary">Override mes</Badge>}
        </div>
      ),
    },
    {
      accessorKey: 'typeLabel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      filterFn: (row, columnId, value) => value === 'ALL' || row.getValue(columnId) === value,
      cell: ({ row }) => row.original.typeLabel || '-',
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Categoria" />,
      filterFn: (row, columnId, value) => value === 'ALL' || row.getValue(columnId) === value,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.category}</div>
          {row.original.subcategory && (
            <div className="text-xs text-muted-foreground">{row.original.subcategory}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Detalle" />,
      filterFn: (row, _columnId, value) => {
        const query = String(value || '').toLowerCase()
        const haystack = [
          row.original.description,
          row.original.notes || '',
          row.original.counterparty || '',
          row.original.category,
          row.original.subcategory || '',
          row.original.academicPeriodName || '',
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      },
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="max-w-[340px] whitespace-normal font-medium">
            {row.original.description}
          </div>
          {row.original.notes && (
            <div className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
              {row.original.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'counterparty',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Relacionado" />,
      cell: ({ row }) => row.original.counterparty || '-',
    },
    {
      accessorKey: 'academicPeriodName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Periodo" />,
      cell: ({ row }) => row.original.academicPeriodName || '-',
    },
    {
      accessorKey: 'netAmount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
      cell: ({ row }) => (
        <AmountCell
          row={row.original}
          allowInlineEdit={allowInlineEdit}
          onInlineAmountSave={onInlineAmountSave}
        />
      ),
      meta: {
        className: 'text-right',
      },
    },
  ]

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  const sourceOptions = Array.from(new Set(rows.map((row) => row.sourceType)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: sourceLabels[value] || value,
    }))
  const categoryOptions = Array.from(new Set(rows.map((row) => row.category)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
  const typeOptions = Array.from(
    new Set(rows.map((row) => row.typeLabel).filter(Boolean) as string[])
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
  const directionValue = (table.getColumn('direction')?.getFilterValue() as string) ?? 'ALL'
  const sourceValue = (table.getColumn('sourceType')?.getFilterValue() as string) ?? 'ALL'
  const categoryValue = (table.getColumn('category')?.getFilterValue() as string) ?? 'ALL'
  const typeValue = (table.getColumn('typeLabel')?.getFilterValue() as string) ?? 'ALL'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <DataTableToolbar
            table={table}
            searchKey="description"
            searchPlaceholder="Buscar por detalle, nota o relacionado..."
            filters={
              <>
                <FilterSelect
                  label="Flujo"
                  value={directionValue}
                  options={[
                    { value: 'INCOME', label: 'Ingreso' },
                    { value: 'EXPENSE', label: 'Egreso' },
                  ]}
                  onValueChange={(value) => table.getColumn('direction')?.setFilterValue(value)}
                />
                <FilterSelect
                  label="Origen"
                  value={sourceValue}
                  options={sourceOptions}
                  onValueChange={(value) => table.getColumn('sourceType')?.setFilterValue(value)}
                />
                <FilterSelect
                  label="Categoria"
                  value={categoryValue}
                  options={categoryOptions}
                  onValueChange={(value) => table.getColumn('category')?.setFilterValue(value)}
                />
                <FilterSelect
                  label="Tipo"
                  value={typeValue}
                  options={typeOptions}
                  onValueChange={(value) => table.getColumn('typeLabel')?.setFilterValue(value)}
                />
              </>
            }
            columnLabels={{
              effectiveDate: 'Fecha',
              direction: 'Flujo',
              sourceType: 'Origen',
              typeLabel: 'Tipo',
              category: 'Categoria',
              description: 'Detalle',
              counterparty: 'Relacionado',
              academicPeriodName: 'Periodo',
              netAmount: 'Monto',
            }}
          />

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'font-semibold text-xs uppercase text-muted-foreground',
                          header.column.id === 'netAmount' && 'text-right'
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(cell.column.id === 'netAmount' && 'align-top')}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} />
        </div>
      </CardContent>
    </Card>
  )
}
