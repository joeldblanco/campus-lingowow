'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
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
import { MoreVertical, Edit, Trash2, Eye, Send, Search, SlidersHorizontal } from 'lucide-react'
import { EditInvoiceDialog } from './edit-invoice-dialog'
import { ViewInvoiceDialog } from './view-invoice-dialog'
import { deleteInvoice } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { formatDateNumeric } from '@/lib/utils/date'
import { InvoiceWithDetails } from '@/types/invoice'

interface InvoicesTableProps {
  invoices: InvoiceWithDetails[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredInvoices = useMemo(() => {
    let filtered = invoices
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter)
    }
    return filtered
  }, [invoices, searchTerm, statusFilter])

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
      <Badge className={`${statusStyles[status] || 'bg-gray-100 text-gray-700'} border-0 font-medium`}>
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
  }

  const columns: ColumnDef<InvoiceWithDetails>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.user.name || 'Sin nombre'}</div>
          <div className="text-xs text-muted-foreground">{row.original.user.email}</div>
        </div>
      ),
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingInvoice(invoice)}>
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
                <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive">
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
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
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
