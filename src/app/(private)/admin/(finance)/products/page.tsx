import { getProducts } from '@/lib/actions/commercial'
import { ProductsTable } from '@/components/admin/products/products-table'
import { CreateProductDialog } from '@/components/admin/products/create-product-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const ProductsAdminPage = async () => {
  const products = await getProducts()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Productos</h1>
        <CreateProductDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </CreateProductDialog>
      </div>
      
      <ProductsTable products={products} />
    </div>
  )
}

export default ProductsAdminPage
