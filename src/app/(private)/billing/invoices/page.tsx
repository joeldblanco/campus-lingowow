import { auth } from '@/auth'
import { getUserInvoices } from '@/lib/actions/commercial'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { redirect } from 'next/navigation'
import { InvoicePDF } from '@/components/invoices/invoice-pdf'
import { formatDateNumeric } from '@/lib/utils/date'

export default async function StudentInvoicesPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/auth/login')
    }

    const invoices = await getUserInvoices(session.user.id)

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
            DRAFT: { label: 'Borrador', variant: 'secondary' },
            SENT: { label: 'Enviada', variant: 'default' },
            PAID: { label: 'Pagada', variant: 'default' },
            OVERDUE: { label: 'Vencida', variant: 'destructive' },
            CANCELLED: { label: 'Cancelada', variant: 'destructive' },
        }
        const config = statusConfig[status] || { label: status, variant: 'outline' }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Mis Facturas</h1>
                    <p className="text-muted-foreground">Historial de pagos y comprobantes</p>
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>N° Factura</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Detalle</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    No tienes facturas registradas aún.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell>
                                        {formatDateNumeric(invoice.paidAt || invoice.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {invoice.items.map((item) => (
                                                <span key={item.id} className="text-sm truncate max-w-[200px]" title={item.name}>
                                                    {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(invoice.total, invoice.currency)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <InvoicePDF invoice={invoice} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
