'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, User as UserIcon, Calendar, CheckCircle, Clock, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

// Tipo específico para la datatable
export interface StudentAssignment {
  id: string
  user: {
    name: string
    lastName?: string
    email: string
  }
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'
  score: number | null
  attempts: number
  assignedAt: Date
  completedAt: Date | null
}

// Función para obtener el label del estado
const getStatusLabel = (status: string) => {
  const statuses: Record<string, { label: string; color: string }> = {
    ASSIGNED: { label: 'Asignado', color: 'bg-blue-100 text-blue-800' },
    IN_PROGRESS: { label: 'En Progreso', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Completado', color: 'bg-green-100 text-green-800' },
  }

  return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
}

// Función para obtener el ícono del estado
const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    ASSIGNED: <Clock className="h-4 w-4 text-blue-500" />,
    IN_PROGRESS: <PlayCircle className="h-4 w-4 text-yellow-500" />,
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
  }

  return icons[status] || <Clock className="h-4 w-4 text-gray-500" />
}

export const studentColumns: ColumnDef<StudentAssignment>[] = [
  {
    id: 'student',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="pl-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Estudiante
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original.user
      return (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">
              {user.name}{user.lastName ? ' ' + user.lastName : ''}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const { label, color } = getStatusLabel(status)
      const icon = getStatusIcon(status)

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
    accessorKey: 'score',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Puntuación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const score = row.getValue('score') as number | null
      const status = row.getValue('status') as string
      
      if (status === 'COMPLETED' && score !== null) {
        return (
          <div className="font-medium">
            {score} XP
          </div>
        )
      }
      
      return (
        <div className="text-muted-foreground">
          -
        </div>
      )
    },
  },
  {
    accessorKey: 'attempts',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Intentos
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const attempts = row.getValue('attempts') as number
      return <div className="font-medium">{attempts}</div>
    },
  },
  {
    accessorKey: 'assignedAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Fecha de Asignación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue('assignedAt') as Date
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>{format(date, 'dd/MM/yyyy')}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'completedAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Fecha de Completado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue('completedAt') as Date | null
      const status = row.getValue('status') as string
      
      if (status === 'COMPLETED' && date) {
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>{format(date, 'dd/MM/yyyy')}</div>
          </div>
        )
      }
      
      return (
        <div className="text-muted-foreground">
          -
        </div>
      )
    },
  },
]
