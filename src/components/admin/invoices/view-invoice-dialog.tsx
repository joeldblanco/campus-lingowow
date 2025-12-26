'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvoicePDF } from '@/components/invoices/invoice-pdf'
import { formatDateNumeric } from '@/lib/utils/date'

interface InvoiceItem {
    id: string
    name: string
    quantity: number
    price: number
    total: number
    product: {
        name: string
        sku?: string
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ViewInvoiceDialogProps {
    invoice: any // Using any to avoid strict type mapping issues between frontend/backend types for now
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ViewInvoiceDialog({ invoice, open, onOpenChange }: ViewInvoiceDialogProps) {
    if (!invoice) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-8">
                        <DialogTitle>Detalle de Factura: {invoice.number || invoice.invoiceNumber}</DialogTitle>
                        <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'}>
                            {invoice.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Cliente</h4>
                        <p className="font-medium">{invoice.user?.name} {invoice.user?.lastName}</p>
                        <p className="text-sm">{invoice.user?.email}</p>
                    </div>
                    <div className="text-right">
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Información</h4>
                        <p className="text-sm">Fecha: {formatDateNumeric(invoice.createdAt)}</p>
                        <p className="text-sm">Vencimiento: {invoice.dueDate ? formatDateNumeric(invoice.dueDate) : 'N/A'}</p>
                    </div>
                </div>

                <div className="border rounded-md mt-4">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="py-2 px-4 text-left font-medium">Descripción</th>
                                <th className="py-2 px-4 text-center font-medium">Cant.</th>
                                <th className="py-2 px-4 text-right font-medium">Precio</th>
                                <th className="py-2 px-4 text-right font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {invoice.items?.map((item: any) => (
                                <tr key={item.id} className="border-t">
                                    <td className="py-2 px-4">
                                        {item.name}
                                        {item.product?.sku && <span className="block text-xs text-muted-foreground">SKU: {item.product.sku}</span>}
                                    </td>
                                    <td className="py-2 px-4 text-center">{item.quantity}</td>
                                    <td className="py-2 px-4 text-right">${item.price.toFixed(2)}</td>
                                    <td className="py-2 px-4 text-right">${item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-4 text-right">
                    <div className="space-y-1">
                        <div className="flex justify-between gap-8 text-sm">
                            <span>Subtotal:</span>
                            <span>${invoice.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        {invoice.discountAmount > 0 && (
                            <div className="flex justify-between gap-8 text-sm text-green-600">
                                <span>Descuento:</span>
                                <span>-${invoice.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between gap-8 text-lg font-bold">
                            <span>Total:</span>
                            <span>${invoice.total?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                    <InvoicePDF invoice={invoice} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
