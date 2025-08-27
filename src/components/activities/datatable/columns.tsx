'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

export const columns: ColumnDef<Activity>[] = [
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

      return (
        <Badge variant="outline" className={color}>
          {label}
        </Badge>
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

      return (
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
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
