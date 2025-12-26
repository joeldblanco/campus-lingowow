import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getInvoices } from '@/lib/actions/commercial'
import { InvoicesTable } from '@/components/admin/invoices/invoices-table'
import { ImportPaypalDialog } from '@/components/admin/invoices/import-paypal-dialog'

const InvoicesAdminPage = async () => {
  const invoices = await getInvoices()

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Facturas</h1>
        <ImportPaypalDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Importar de PayPal
          </Button>
        </ImportPaypalDialog>
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  )
}

export default InvoicesAdminPage
