'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MoreVertical, Edit, Trash2, ListTree, GripVertical, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
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
        {product.isActive ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activo</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactivo</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(product)}>
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onManagePlans(product)}>
                <ListTree className="mr-2 h-4 w-4" />
                Gestionar Planes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

const ITEMS_PER_PAGE = 5

export function ProductsTable({ products }: ProductsTableProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [managingPlansProduct, setManagingPlansProduct] = useState<Product | null>(null)
  const [productsList, setProductsList] = useState<Product[]>(products)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Update products list when props change
  React.useEffect(() => {
    setProductsList(products)
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = productsList
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => 
        statusFilter === 'active' ? p.isActive : !p.isActive
      )
    }
    return filtered
  }, [productsList, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(paginatedProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Producto</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Categoría</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-right">Precio</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Stock</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No hay productos registrados
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={paginatedProducts.map(product => product.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {paginatedProducts.map((product) => (
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

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> de{' '}
            <span className="font-medium">{filteredProducts.length}</span> resultados
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <Button key={index} variant={currentPage === page ? 'default' : 'outline'} size="icon" className={`h-8 w-8 ${currentPage === page ? 'bg-blue-500 hover:bg-blue-600' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 text-muted-foreground">...</span>
              )
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
