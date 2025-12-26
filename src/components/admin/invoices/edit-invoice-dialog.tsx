'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateInvoice } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { InvoiceWithDetails } from '@/types/invoice'

const invoiceSchema = z.object({
  number: z.string().min(1, 'Número de factura requerido'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface EditInvoiceDialogProps {
  invoice: InvoiceWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: '',
      status: 'DRAFT',
      dueDate: '',
      paidAt: '',
    },
  })

  useEffect(() => {
    if (invoice) {
      form.reset({
        number: invoice.invoiceNumber,
        status: invoice.status,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '',
        paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString().slice(0, 16) : '',
      })
    }
  }, [invoice, form])

  const onSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true)
    try {
      const result = await updateInvoice(invoice.id, {
        invoiceNumber: data.number,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
      })

      if (result.success) {
        toast.success('Factura actualizada correctamente')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar la factura')
      }
    } catch {
      toast.error('Error inesperado al actualizar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Factura</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la factura.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Información del Cliente</h3>
          <p><strong>Nombre:</strong> {invoice.user.name || 'Sin nombre'}</p>
          <p><strong>Email:</strong> {invoice.user.email}</p>
          {invoice.coupon && (
            <p><strong>Cupón:</strong> {invoice.coupon.code}</p>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Items de la Factura</h3>
          <div className="space-y-2">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.product?.name || item.plan?.name || item.name} x {item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-2 pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Impuestos:</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Factura</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="SENT">Enviada</SelectItem>
                      <SelectItem value="PAID">Pagada</SelectItem>
                      <SelectItem value="OVERDUE">Vencida</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('status') === 'PAID' && (
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
