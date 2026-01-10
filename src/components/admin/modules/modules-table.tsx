'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Edit, Trash2, Search, FileText, Activity } from 'lucide-react'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { EditModuleDialog } from './edit-module-dialog'
import { ViewModuleDialog } from './view-module-dialog'
import { deleteModule } from '@/lib/actions/modules'
import { toast } from 'sonner'

interface ModuleWithDetails {
  id: string
  title: string
  description: string | null
  level: string
  order: number
  isPublished: boolean
  courseId: string
  createdAt: Date
  updatedAt: Date
  course: {
    id: string
    title: string
  }
  lessonsCount: number
  activitiesCount: number
}

interface ModulesTableProps {
  modules: ModuleWithDetails[]
  onModuleUpdated: () => void
}

export function ModulesTable({ modules, onModuleUpdated }: ModulesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredModules = useMemo(() => {
    return modules.filter(
      (module) =>
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [modules, searchTerm])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el módulo "${title}"?`)) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteModule(id)
      toast.success('Módulo eliminado exitosamente')
      onModuleUpdated()
    } catch (error) {
      console.error('Error deleting module:', error)
      toast.error('Error al eliminar el módulo')
    } finally {
      setIsDeleting(null)
    }
  }

  const columns: ColumnDef<ModuleWithDetails>[] = [
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
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Módulo" />,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.title}</span>
            <Badge variant={row.original.isPublished ? 'default' : 'secondary'}>
              {row.original.isPublished ? 'Publicado' : 'Borrador'}
            </Badge>
          </div>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'course',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Curso" />,
      cell: ({ row }) => <span className="text-sm">{row.original.course.title}</span>,
    },
    {
      accessorKey: 'level',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel" />,
      cell: ({ row }) => <Badge variant="outline">Nivel {row.original.level}</Badge>,
    },
    {
      accessorKey: 'order',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orden" />,
      cell: ({ row }) => <span className="text-sm">{row.original.order}</span>,
    },
    {
      accessorKey: 'lessonsCount',
      header: () => <div className="text-center">Lecciones</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1 text-sm">
          <FileText className="h-3 w-3" />
          {row.original.lessonsCount}
        </div>
      ),
    },
    {
      accessorKey: 'activitiesCount',
      header: () => <div className="text-center">Actividades</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1 text-sm">
          <Activity className="h-3 w-3" />
          {row.original.activitiesCount}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const moduleItem = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <ViewModuleDialog moduleId={moduleItem.id}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
            </ViewModuleDialog>
            <EditModuleDialog module={moduleItem} onModuleUpdated={onModuleUpdated}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </EditModuleDialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDelete(moduleItem.id, moduleItem.title)}
              disabled={isDeleting === moduleItem.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const toolbar = (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar módulos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={filteredModules}
      toolbar={toolbar}
      emptyMessage="No hay módulos"
    />
  )
}
