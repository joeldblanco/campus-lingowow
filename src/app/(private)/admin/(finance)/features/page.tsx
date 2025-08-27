import { getFeatures } from '@/lib/actions/commercial'
import { FeaturesTable } from '@/components/admin/features/features-table'
import { CreateFeatureDialog } from '@/components/admin/features/create-feature-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const FeaturesAdminPage = async () => {
  const features = await getFeatures()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Características</h1>
        <CreateFeatureDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Característica
          </Button>
        </CreateFeatureDialog>
      </div>
      
      <FeaturesTable features={features} />
    </div>
  )
}

export default FeaturesAdminPage
