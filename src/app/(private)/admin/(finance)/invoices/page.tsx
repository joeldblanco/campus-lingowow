import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getInvoices } from '@/lib/actions/commercial'
import { InvoicesTable } from '@/components/admin/invoices/invoices-table'
import { CreateInvoiceDialog } from '@/components/admin/invoices/create-invoice-dialog'

const InvoicesAdminPage = async () => {
  const invoicesData = await getInvoices()

  // Transform database data to match Invoice interface
  const invoices = invoicesData.map((invoice) => ({
    ...invoice,
    number: invoice.invoiceNumber || `INV-${invoice.id.slice(-6)}`,
    taxAmount: invoice.tax || 0,
    discountAmount: invoice.discount || 0,
    items: invoice.items.map((item) => ({
      id: item.id,
      productId: item.productId || 'unknown',
      planId: item.planId || undefined,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
      unitPrice: item.price,
      product: { name: item.product?.name || item.name },
    })),
  }))

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Facturas</h1>
        <CreateInvoiceDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        </CreateInvoiceDialog>
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  )
}

export default InvoicesAdminPage
