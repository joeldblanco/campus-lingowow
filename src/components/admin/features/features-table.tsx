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
import { EditFeatureDialog } from './edit-feature-dialog'
import { deleteFeature } from '@/lib/actions/commercial'
import { toast } from 'sonner'

interface Feature {
  id: string
  name: string
  description: string | null
  icon: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    planFeatures: number
  }
}

interface FeaturesTableProps {
  features: Feature[]
}

export function FeaturesTable({ features }: FeaturesTableProps) {
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredFeatures = useMemo(() => {
    let filtered = features
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((f) =>
        statusFilter === 'active' ? f.isActive : !f.isActive
      )
    }
    return filtered
  }, [features, searchTerm, statusFilter])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta característica?')) {
      const result = await deleteFeature(id)
      if (result.success) {
        toast.success('Característica eliminada correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar la característica')
      }
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const columns: ColumnDef<Feature>[] = [
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Característica" />,
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description || '-'}
        </span>
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
      accessorKey: 'planFeatures',
      header: () => <div className="text-center">Planes</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-sm font-medium">{row.original._count.planFeatures}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const feature = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingFeature(feature)}>
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDelete(feature.id)} className="text-destructive">
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
          placeholder="Buscar por nombre o descripción..."
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
        data={filteredFeatures}
        toolbar={toolbar}
        emptyMessage="No hay características registradas"
      />

      {editingFeature && (
        <EditFeatureDialog
          feature={editingFeature}
          open={!!editingFeature}
          onOpenChange={(open: boolean) => !open && setEditingFeature(null)}
        />
      )}
    </>
  )
}
