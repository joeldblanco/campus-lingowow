import { getPlans } from '@/lib/actions/commercial'
import { PlansTable } from '@/components/admin/plans/plans-table'
import { CreatePlanDialog } from '@/components/admin/plans/create-plan-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Planes | Admin | Lingowow',
  description: 'Administra los planes de suscripción de la plataforma',
}

const PlansAdminPage = async () => {
  const plans = await getPlans()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Planes</h1>
          <p className="text-muted-foreground">
            Administra los planes de suscripción de la plataforma.
          </p>
        </div>
        <CreatePlanDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Plan
          </Button>
        </CreatePlanDialog>
      </div>
      
      <PlansTable plans={plans} />
    </div>
  )
}

export default PlansAdminPage
