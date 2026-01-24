'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, BookOpen, Headphones, Mic, PenTool, FileText, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Activity } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteActivity } from '@/lib/actions/activity'

// Función para obtener el label del tipo de actividad
const getActivityTypeLabel = (type: string) => {
  const types: Record<string, { label: string; color: string }> = {
    READING: { label: 'Lectura', color: 'bg-green-100 text-green-800' },
    LISTENING: { label: 'Escucha', color: 'bg-blue-100 text-blue-800' },
    SPEAKING: { label: 'Habla', color: 'bg-purple-100 text-purple-800' },
    WRITING: { label: 'Escritura', color: 'bg-orange-100 text-orange-800' },
    VOCABULARY: { label: 'Vocabulario', color: 'bg-yellow-100 text-yellow-800' },
  }

  return types[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
}

// Función para obtener el ícono del tipo de actividad
const getActivityTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    READING: <BookOpen className="h-4 w-4 text-blue-500" />,
    LISTENING: <Headphones className="h-4 w-4 text-blue-500" />,
    SPEAKING: <Mic className="h-4 w-4 text-blue-500" />,
    WRITING: <PenTool className="h-4 w-4 text-blue-500" />,
    VOCABULARY: <FileText className="h-4 w-4 text-blue-500" />,
  }

  return icons[type] || <FileText className="h-4 w-4 text-blue-500" />
}

// Componente ActionsCell para manejar el estado de React
function ActionsCell({ 
  activity, 
  onActivityDeleted 
}: { 
  activity: Activity
  onActivityDeleted: () => void
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteActivity(activity.id)
      toast.success('Actividad eliminada exitosamente')
      onActivityDeleted() // Llamar a la función de actualización
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast.error('Error al eliminar la actividad')
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/admin/activities/${activity.id}`} className="flex items-center">
              <Eye className="mr-2 h-4 w-4" />
              <span>Ver detalles</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/activities/${activity.id}/edit`} className="flex items-center">
              <Pencil className="mr-2 h-4 w-4" />
              <span>Editar</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente la actividad &quot;{activity.title}&quot; y todos sus datos asociados.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-red-600 border-l-transparent"></div>
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Función para generar las columnas con la función de actualización
export function createColumns(onActivityDeleted: () => void): ColumnDef<Activity>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="pl-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Título
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        const { label, color } = getActivityTypeLabel(type)
        const icon = getActivityTypeIcon(type)

        return (
          <div className="flex items-center gap-2">
            {icon}
            <Badge variant="outline" className={color}>
              {label}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'level',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nivel
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue('level')}</div>,
    },
    {
      accessorKey: 'points',
      header: 'Puntos',
      cell: ({ row }) => <div className="font-medium">{row.getValue('points')} XP</div>,
    },
    {
      accessorKey: 'duration',
      header: 'Duración',
      cell: ({ row }) => <div>{row.getValue('duration')} min</div>,
    },
    {
      accessorKey: 'isPublished',
      header: 'Estado',
      cell: ({ row }) => {
        const isPublished = row.getValue('isPublished') as boolean

        return (
          <Badge variant={isPublished ? 'default' : 'outline'}>
            {isPublished ? 'Publicado' : 'Borrador'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Creado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date
        return <div>{format(date, 'dd/MM/yyyy')}</div>
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const activity = row.original
        return <ActionsCell activity={activity} onActivityDeleted={onActivityDeleted} />
      },
    },
  ]
}

// Exportar las columnas por defecto para compatibilidad
export const columns = createColumns(() => {})
