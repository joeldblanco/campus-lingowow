import { getFeatures } from '@/lib/actions/commercial'
import { FeaturesTable } from '@/components/admin/features/features-table'
import { CreateFeatureDialog } from '@/components/admin/features/create-feature-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Características | Admin | Lingowow',
  description: 'Administra las características disponibles para los planes',
}

const FeaturesAdminPage = async () => {
  const features = await getFeatures()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Características</h1>
          <p className="text-muted-foreground">
            Administra las características disponibles para los planes.
          </p>
        </div>
        <CreateFeatureDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
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
