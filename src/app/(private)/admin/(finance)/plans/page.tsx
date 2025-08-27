import { getPlans } from '@/lib/actions/commercial'
import { PlansTable } from '@/components/admin/plans/plans-table'
import { CreatePlanDialog } from '@/components/admin/plans/create-plan-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const PlansAdminPage = async () => {
  const plans = await getPlans()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Planes</h1>
        <CreatePlanDialog>
          <Button>
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
