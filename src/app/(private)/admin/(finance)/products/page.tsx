import { getProducts } from '@/lib/actions/commercial'
import { ProductsTable } from '@/components/admin/products/products-table'
import { CreateProductDialog } from '@/components/admin/products/create-product-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Productos | Admin | Lingowow',
  description: 'Administra los productos de la tienda',
}

const ProductsAdminPage = async () => {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-muted-foreground">
            Administra todos los productos disponibles en la tienda.
          </p>
        </div>
        <CreateProductDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
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
