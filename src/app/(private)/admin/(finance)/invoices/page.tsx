import { InvoicesTable } from '@/components/admin/invoices/invoices-table'
import { getInvoices } from '@/lib/actions/commercial'

const InvoicesAdminPage = async () => {
  const invoices = await getInvoices()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Facturas</h1>
          <p className="text-muted-foreground">
            Administra todas las facturas y pagos de la plataforma.
          </p>
        </div>
        {/* <ImportPaypalDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Importar de PayPal
          </Button>
        </ImportPaypalDialog> */}
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  )
}

export default InvoicesAdminPage
