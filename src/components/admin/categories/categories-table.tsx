'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { MoreVertical, Edit, Trash2, Search, SlidersHorizontal } from 'lucide-react'
import { EditCategoryDialog } from './edit-category-dialog'
import { deleteCategory } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { CategoryWithCount } from '@/types/category'

interface CategoriesTableProps {
  categories: CategoryWithCount[]
}

export function CategoriesTable({ categories }: CategoriesTableProps) {
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredCategories = useMemo(() => {
    let filtered = categories
    if (searchTerm) {
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((cat) =>
        statusFilter === 'active' ? cat.isActive : !cat.isActive
      )
    }
    return filtered
  }, [categories, searchTerm, statusFilter])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      const result = await deleteCategory(id)
      if (result.success) {
        toast.success('Categoría eliminada correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar la categoría')
      }
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const columns: ColumnDef<CategoryWithCount>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <div className="font-medium text-sm">{row.original.name}</div>,
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => (
        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{row.original.slug}</code>
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activa</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactiva</Badge>
        ),
    },
    {
      accessorKey: 'products',
      header: () => <div className="text-center">Productos</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-sm font-medium">{row.original._count.products}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(category)}>
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o slug..."
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
          <SelectItem value="active">Activa</SelectItem>
          <SelectItem value="inactive">Inactiva</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredCategories}
        toolbar={toolbar}
        emptyMessage="No hay categorías registradas"
      />

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
        />
      )}
    </>
  )
}
