'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DateRange } from 'react-day-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Send,
  Search,
  SlidersHorizontal,
  CreditCard,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Image from 'next/image'
import { EditInvoiceDialog } from './edit-invoice-dialog'
import { ViewInvoiceDialog } from './view-invoice-dialog'
import { deleteInvoice } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { formatDateNumeric } from '@/lib/utils/date'
import { InvoiceWithDetails } from '@/types/invoice'
import { DateRangePicker } from '@/components/analytics/date-range-picker'
import { ExportButton, downloadCSV, downloadExcel } from '@/components/analytics/export-button'

interface InvoicesTableProps {
  invoices: InvoiceWithDetails[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const filteredInvoices = useMemo(() => {
    let filtered = invoices
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((invoice) => {
        const fullName = [invoice.user.name, invoice.user.lastName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return (
          invoice.invoiceNumber.toLowerCase().includes(term) ||
          fullName.includes(term) ||
          invoice.user.email.toLowerCase().includes(term)
        )
      })
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter)
    }
    if (dateRange?.from) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.createdAt)
        const fromDate = new Date(dateRange.from!)
        fromDate.setHours(0, 0, 0, 0)
        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return invoiceDate >= fromDate && invoiceDate <= toDate
        }
        return invoiceDate >= fromDate
      })
    }
    return filtered
  }, [invoices, searchTerm, statusFilter, dateRange])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
      const result = await deleteInvoice(id)
      if (result.success) {
        toast.success('Factura eliminada correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar la factura')
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      SENT: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      OVERDUE: 'bg-red-100 text-red-700 hover:bg-red-100',
      CANCELLED: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    }
    const statusLabels: Record<string, string> = {
      DRAFT: 'Borrador',
      SENT: 'Enviada',
      PAID: 'Pagada',
      OVERDUE: 'Vencida',
      CANCELLED: 'Cancelada',
    }
    return (
      <Badge
        className={`${statusStyles[status] || 'bg-gray-100 text-gray-700'} border-0 font-medium`}
      >
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDateRange(undefined)
  }

  const getPaymentOrigin = (paymentMethod: string | null | undefined) => {
    if (!paymentMethod) return ''
    if (paymentMethod === 'paypal') return 'PAYPAL'
    if (paymentMethod === 'card' || paymentMethod === 'creditCard') return 'NIUBIZ'
    return paymentMethod.toUpperCase()
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    const exportData = filteredInvoices.map((invoice) => ({
      Número: invoice.invoiceNumber,
      Cliente: [invoice.user.name, invoice.user.lastName].filter(Boolean).join(' ') || 'Sin nombre',
      Email: invoice.user.email,
      Estado: invoice.status,
      Subtotal: invoice.subtotal,
      Descuento: invoice.discount,
      Total: invoice.total,
      Cupón: invoice.coupon?.code || '',
      'Origen de Pago': getPaymentOrigin(invoice.paymentMethod),
      País: invoice.billingCountry || '',
      Ciudad: invoice.billingCity || '',
      Dirección: invoice.billingAddress || '',
      'Código Postal': invoice.billingZipCode || '',
      Fecha: formatDateNumeric(invoice.createdAt),
    }))

    const getExportFilename = () => {
      const formatDate = (date: Date) => {
        const d = new Date(date)
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
      }

      if (dateRange?.from && dateRange?.to) {
        return `Facturas Lingowow - ${formatDate(dateRange.from)}_${formatDate(dateRange.to)}`
      } else if (dateRange?.from) {
        return `Facturas Lingowow - desde ${formatDate(dateRange.from)}`
      } else {
        return `Facturas Lingowow - ${formatDate(new Date())}`
      }
    }

    const filename = getExportFilename()
    if (format === 'csv') {
      downloadCSV(exportData, filename)
    } else {
      downloadExcel(exportData, filename)
    }
  }

  const columns: ColumnDef<InvoiceWithDetails>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'invoiceNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.invoiceNumber}</div>
          {row.original.coupon && (
            <div className="text-xs text-muted-foreground">Cupón: {row.original.coupon.code}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'user',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => {
        const fullName = [row.original.user.name, row.original.user.lastName]
          .filter(Boolean)
          .join(' ')
        return (
          <div>
            <div className="font-medium text-sm">{fullName || 'Sin nombre'}</div>
            <div className="text-xs text-muted-foreground">{row.original.user.email}</div>
          </div>
        )
      },
    },
    {
      id: 'origin',
      header: () => <div className="text-center">Origen</div>,
      cell: ({ row }) => {
        const invoice = row.original
        const isPaypal = !!invoice.paypalOrderId || invoice.paymentMethod === 'paypal'
        const isNiubiz =
          !!invoice.niubizTransactionId ||
          !!invoice.niubizOrderId ||
          invoice.paymentMethod === 'card' ||
          invoice.paymentMethod === 'creditCard'

        let label = 'Lingowow'
        let icon = (
          <Image
            src="/branding/logo.png"
            alt="Lingowow"
            width={20}
            height={20}
            className="rounded-sm"
          />
        )

        if (isPaypal) {
          label = 'PayPal'
          icon = (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.408-1.127.964L7.076 21.337Z"
                fill="#003087"
              />
              <path
                d="M18.27 7.468c-.02.126-.04.254-.066.387-.944 4.848-4.178 6.52-8.307 6.52H8.06c-.505 0-.932.37-1.01.873L5.91 22.083a.55.55 0 0 0 .543.637h3.832c.442 0 .818-.321.887-.757l.037-.19.702-4.449.045-.246a.893.893 0 0 1 .882-.753h.556c3.597 0 6.413-1.46 7.235-5.684.343-1.764.166-3.236-.742-4.272a3.548 3.548 0 0 0-1.017-.74c.02.126.037.255.05.387l.35-.348Z"
                fill="#0070E0"
              />
            </svg>
          )
        } else if (isNiubiz) {
          label = 'Niubiz'
          icon = <CreditCard className="h-5 w-5 text-orange-600" />
        }

        return (
          <div className="flex justify-center">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center cursor-default">{icon}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium text-sm">{formatCurrency(row.original.total)}</div>
          {row.original.discount > 0 && (
            <div className="text-xs text-green-600">-{formatCurrency(row.original.discount)}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <div className="text-sm">{formatDateNumeric(row.original.createdAt)}</div>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditingInvoice(invoice)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingInvoice(invoice)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </DropdownMenuItem>
                {invoice.status === 'DRAFT' && (
                  <DropdownMenuItem>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleDelete(invoice.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="DRAFT">Borrador</SelectItem>
          <SelectItem value="SENT">Enviada</SelectItem>
          <SelectItem value="PAID">Pagada</SelectItem>
          <SelectItem value="OVERDUE">Vencida</SelectItem>
          <SelectItem value="CANCELLED">Cancelada</SelectItem>
        </SelectContent>
      </Select>
      <ExportButton onExport={handleExport} disabled={filteredInvoices.length === 0} />
      <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredInvoices}
        toolbar={toolbar}
        emptyMessage="No hay facturas registradas"
      />

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open: boolean) => !open && setEditingInvoice(null)}
        />
      )}

      {viewingInvoice && (
        <ViewInvoiceDialog
          invoice={viewingInvoice}
          open={!!viewingInvoice}
          onOpenChange={(open: boolean) => !open && setViewingInvoice(null)}
        />
      )}
    </>
  )
}
