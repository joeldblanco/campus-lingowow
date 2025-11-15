'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Edit, Trash2, ListTree, GripVertical } from 'lucide-react'
import { EditProductDialog } from './edit-product-dialog'
import { ProductPlansDialog } from './product-plans-dialog'
import { deleteProduct, updateProductSortOrder } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  price: number
  comparePrice: number | null
  sku: string | null
  image: string | null
  images: string[]
  isActive: boolean
  isDigital: boolean
  stock: number | null
  categoryId: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
  } | null
  _count: {
    invoiceItems: number
  }
}

interface ProductsTableProps {
  products: Product[]
}

// Sortable row component
function SortableRow({ product, onEdit, onDelete, onManagePlans }: {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onManagePlans: (product: Product) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <TableCell>
        <div className="flex items-center space-x-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              className="h-10 w-10 rounded-md object-cover"
              width={40}
              height={40}
            />
          )}
          <div>
            <div className="font-medium">{product.name}</div>
            {product.shortDesc && (
              <div className="text-sm text-muted-foreground">
                {product.shortDesc}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm font-mono">{product.sku || 'N/A'}</span>
      </TableCell>
      <TableCell>
        {product.category ? (
          <Badge variant="outline">{product.category.name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Sin categoría</span>
        )}
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{formatPrice(product.price)}</div>
          {product.comparePrice && (
            <div className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice)}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {product.stock !== null ? (
          <span className={`text-sm font-medium ${
            product.stock > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {product.stock} unidades
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Digital</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={product.isActive ? 'default' : 'secondary'}>
          {product.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </TableCell>
      <TableCell>{product._count.invoiceItems}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManagePlans(product)}>
              <ListTree className="mr-2 h-4 w-4" />
              Gestionar Planes
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(product.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [managingPlansProduct, setManagingPlansProduct] = useState<Product | null>(null)
  const [productsList, setProductsList] = useState<Product[]>(products)

  // Update products list when props change
  React.useEffect(() => {
    setProductsList(products)
  }, [products])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const result = await deleteProduct(id)
      if (result.success) {
        toast.success('Producto eliminado correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar el producto')
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = productsList.findIndex((item) => item.id === active.id)
      const newIndex = productsList.findIndex((item) => item.id === over.id)

      const newProductsList = arrayMove(productsList, oldIndex, newIndex)
      setProductsList(newProductsList)

      // Update sortOrder for all affected products
      const updates = newProductsList.map((product, index) => ({
        id: product.id,
        sortOrder: index,
      }))

      // Batch update all products
      try {
        const updatePromises = updates.map(update => 
          updateProductSortOrder(update.id, update.sortOrder)
        )
        
        await Promise.all(updatePromises)
        toast.success('Orden de productos actualizado correctamente')
      } catch {
        toast.error('Error al actualizar el orden de los productos')
        // Revert to original order on error
        setProductsList(products)
      }
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead className="w-[70px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay productos registrados
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={productsList.map(product => product.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {productsList.map((product) => (
                    <SortableRow
                      key={product.id}
                      product={product}
                      onEdit={setEditingProduct}
                      onDelete={handleDelete}
                      onManagePlans={setManagingPlansProduct}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
        />
      )}

      {managingPlansProduct && (
        <ProductPlansDialog
          productId={managingPlansProduct.id}
          productName={managingPlansProduct.name}
          open={!!managingPlansProduct}
          onOpenChange={(open) => !open && setManagingPlansProduct(null)}
        />
      )}
    </>
  )
}
