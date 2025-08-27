import { getCategories } from '@/lib/actions/commercial'
import { CategoriesTable } from '@/components/admin/categories/categories-table'
import { CreateCategoryDialog } from '@/components/admin/categories/create-category-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const CategoriesAdminPage = async () => {
  const categories = await getCategories()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Categorías</h1>
        <CreateCategoryDialog>
          <Button>
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
