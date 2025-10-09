'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Eye, Send } from 'lucide-react'
import { EditInvoiceDialog } from './edit-invoice-dialog'
import { deleteInvoice } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { formatDateNumeric } from '@/lib/utils/date'

interface InvoiceItem {
  id: string
  productId: string
  planId?: string
  name: string
  price: number
  quantity: number
  total: number
  unitPrice: number
  product: {
    name: string
  }
}

interface Invoice {
  id: string
  number: string
  userId: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  dueDate: Date | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  user: {
    name: string | null
    email: string
  }
  coupon: {
    code: string
  } | null
  items: InvoiceItem[]
}

interface InvoicesTableProps {
  invoices: Invoice[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

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
    const statusConfig = {
      DRAFT: { label: 'Borrador', variant: 'secondary' as const },
      SENT: { label: 'Enviada', variant: 'default' as const },
      PAID: { label: 'Pagada', variant: 'default' as const },
      OVERDUE: { label: 'Vencida', variant: 'destructive' as const },
      CANCELLED: { label: 'Cancelada', variant: 'destructive' as const },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay facturas registradas
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-medium">{invoice.number}</div>
                    {invoice.coupon && (
                      <div className="text-sm text-muted-foreground">
                        Cupón: {invoice.coupon.code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.user.name || 'Sin nombre'}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(invoice.total)}</div>
                      {invoice.discountAmount > 0 && (
                        <div className="text-sm text-green-600">
                          Desc: -{formatCurrency(invoice.discountAmount)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {invoice.dueDate ? (
                      <div className="text-sm">
                        {formatDateNumeric(invoice.dueDate)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin vencimiento</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDateNumeric(invoice.createdAt)}
                    </div>
                    {invoice.paidAt && (
                      <div className="text-xs text-green-600">
                        Pagada: {formatDateNumeric(invoice.paidAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open: boolean) => !open && setEditingInvoice(null)}
        />
      )}
    </>
  )
}
