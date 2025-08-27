'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { generatePeriodsForYear, getPeriods } from '@/lib/actions/academic-period'
import { AcademicPeriod, Season } from '@prisma/client'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

const AcademicPeriodsPage = () => {
  const [isPending, startTransition] = useTransition()
  const [periods, setPeriods] = useState<(AcademicPeriod & { season: Season })[]>([])
  const [year, setYear] = useState(new Date().getFullYear())

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  // Definición de columnas
  const columns: ColumnDef<AcademicPeriod & { season: Season }>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="pl-4">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Fecha de Inicio
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const date = row.original.startDate
        return <div className="flex justify-center">{format(date, 'dd/MM/yyyy')}</div>
      },
    },
    {
      accessorKey: 'endDate',
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Fecha de Fin
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const date = row.original.endDate
        return <div className="flex justify-center">{format(date, 'dd/MM/yyyy')}</div>
      },
    },
    {
      accessorKey: 'season',
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Temporada
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="capitalize text-center">{row.original.season.name}</div>
      },
    },
    {
      accessorKey: 'year',
      header: () => <div className="flex justify-center">Año</div>,
      cell: ({ row }) => {
        const date = row.original.startDate
        return <div className="flex justify-center">{date.getFullYear()}</div>
      },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Estado
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">{row.original.isActive ? 'Activo' : 'Inactivo'}</div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: () => {
        return (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm">
              Editar
            </Button>
            <Button variant="outline" size="sm">
              Eliminar
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: periods,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  useEffect(() => {
    startTransition(async () => {
      await getPeriods(year)
        .then((response) => {
          if (!response.success || !response.periods) {
            toast.error(response.error)
            return
          }

          setPeriods(response.periods)
        })
        .catch((error) => {
          console.error('Error al obtener periodos:', error)
          toast.error('Error al obtener los periodos del año. Inténtalo nuevamente.')
        })
    })
  }, [year])

  const handleGeneratePeriods = () => {
    startTransition(async () => {
      generatePeriodsForYear(year)
        .then((response) => {
          if (!response.success) {
            toast.error(response.error)
            return
          }

          toast.success('Periodos generados correctamente')
        })
        .then(() => {
          getPeriods(year)
            .then((response) => {
              if (!response.success || !response.periods) {
                toast.error(response.error)
                return
              }

              setPeriods(response.periods)
            })
            .catch((error) => {
              console.error('Error al obtener periodos:', error)
              toast.error('Error al obtener los periodos del año. Inténtalo nuevamente.')
            })
        })
        .catch((error) => {
          console.error('Error al generar periodos:', error)
          toast.error('Error al generar los periodos del año. Inténtalo nuevamente.')
        })
    })
  }

  return (
    <div>
      <div className="flex gap-4 items-center bg-yellow-200 w-fit p-4">
        <Button className="w-34" disabled={isPending} onClick={handleGeneratePeriods}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Generar Periodos'}
        </Button>
        <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 20 }, (_, i) => i + 2020).map((yearItem) => (
              <SelectItem key={yearItem} value={yearItem.toString()}>
                {yearItem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filtrar períodos..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AcademicPeriodsPage
