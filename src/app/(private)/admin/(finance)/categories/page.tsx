import { getCategories } from '@/lib/actions/commercial'
import { CategoriesTable } from '@/components/admin/categories/categories-table'
import { CreateCategoryDialog } from '@/components/admin/categories/create-category-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const CategoriesAdminPage = async () => {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Categorías</h1>
          <p className="text-muted-foreground">
            Administra las categorías de productos de la tienda.
          </p>
        </div>
        <CreateCategoryDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </CreateCategoryDialog>
      </div>
      
      <CategoriesTable categories={categories} />
    </div>
  )
}

export default CategoriesAdminPage
