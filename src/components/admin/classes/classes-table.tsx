'use client'

import { useState, useMemo, memo, useEffect } from 'react'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import {
  ClassBookingWithDetails,
  deleteClass,
  updateClass,
  toggleClassPayable,
} from '@/lib/actions/classes'
import { getTodayString } from '@/lib/utils/date'
import { formatFullName } from '@/lib/utils/name-formatter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { EditClassDialog } from './edit-class-dialog'
import { ViewClassDialog } from './view-class-dialog'
import { RescheduleClassDialog } from './reschedule-class-dialog'
import { BulkActionsBar } from './bulk-actions-bar'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Search,
  SlidersHorizontal,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { BookingStatus } from '@prisma/client'

interface ClassesTableProps {
  classes: ClassBookingWithDetails[]
  userTimezone: string
}

export const ClassesTable = memo(function ClassesTable({
  classes,
  userTimezone,
}: ClassesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [localClasses, setLocalClasses] = useState<ClassBookingWithDetails[]>(() => classes)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  const filteredClasses = useMemo(() => {
    let filtered = localClasses

    if (searchTerm) {
      filtered = filtered.filter(
        (classItem) =>
          classItem.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.teacher.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((classItem) => classItem.status === statusFilter)
    }

    if (teacherFilter !== 'all') {
      filtered = filtered.filter((classItem) => classItem.teacherId === teacherFilter)
    }

    if (dateFilter !== 'all') {
      const today = getTodayString()
      if (dateFilter === 'past') {
        filtered = filtered.filter((classItem) => classItem.day < today)
      } else if (dateFilter === 'today') {
        filtered = filtered.filter((classItem) => classItem.day === today)
      } else if (dateFilter === 'future') {
        filtered = filtered.filter((classItem) => classItem.day > today)
      }
    }

    filtered = [...filtered].sort((a, b) => {
      const timeA = a.timeSlot.split('-')[0]
      const timeB = b.timeSlot.split('-')[0]
      const dateA = new Date(`${a.day}T${timeA}`)
      const dateB = new Date(`${b.day}T${timeB}`)

      const isValidA = !isNaN(dateA.getTime())
      const isValidB = !isNaN(dateB.getTime())

      if (isValidA && isValidB) {
        return sortOrder === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime()
      }

      if (isValidA !== isValidB) {
        return isValidA ? -1 : 1
      }

      const dateTimeA = `${a.day} ${timeA}`
      const dateTimeB = `${b.day} ${timeB}`
      return sortOrder === 'asc'
        ? dateTimeA.localeCompare(dateTimeB)
        : dateTimeB.localeCompare(dateTimeA)
    })

    return filtered
  }, [localClasses, searchTerm, statusFilter, teacherFilter, dateFilter, sortOrder])

  // Adjust pagination when filtered results change to avoid invalid page
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredClasses.length / pagination.pageSize) - 1)
    if (pagination.pageIndex > maxPage) {
      setPagination((prev) => ({ ...prev, pageIndex: maxPage }))
    }
  }, [filteredClasses.length, pagination.pageSize, pagination.pageIndex])

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    setIsDeleting(true)
    try {
      // Update local state optimistically
      setLocalClasses((prev) => prev.filter((classItem) => classItem.id !== classToDelete))

      const result = await deleteClass(classToDelete)
      if (result.success) {
        toast.success('Clase eliminada exitosamente')
        setDeleteDialogOpen(false)
        setClassToDelete(null)
      } else {
        // Revert on error
        setLocalClasses((prev) => {
          // Find the deleted class from original props to restore it
          const deletedClass = classes.find((c) => c.id === classToDelete)
          return deletedClass ? [...prev, deletedClass] : prev
        })
        toast.error(result.error || 'Error al eliminar la clase')
      }
    } catch {
      // Revert on error
      setLocalClasses((prev) => {
        const deletedClass = classes.find((c) => c.id === classToDelete)
        return deletedClass ? [...prev, deletedClass] : prev
      })
      toast.error('Error al eliminar la clase')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkCompleted = async (classId: string) => {
    try {
      const classItem = localClasses.find((c) => c.id === classId)
      if (!classItem) {
        toast.error('Clase no encontrada')
        return
      }

      // Store original data for potential rollback
      const originalStatus = classItem.status
      const originalCompletedAt = classItem.completedAt

      // Update local state optimistically
      setLocalClasses((prev) =>
        prev.map((c) =>
          c.id === classId ? { ...c, status: BookingStatus.COMPLETED, completedAt: new Date() } : c
        )
      )

      const result = await updateClass(classId, {
        studentId: classItem.studentId,
        teacherId: classItem.teacherId,
        day: classItem.day,
        timeSlot: classItem.timeSlot,
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
        timezone: userTimezone,
      })

      if (result.success) {
        toast.success('Clase marcada como completada')
      } else {
        // Revert on error
        setLocalClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? { ...c, status: originalStatus, completedAt: originalCompletedAt }
              : c
          )
        )
        toast.error(result.error || 'Error al actualizar la clase')
      }
    } catch {
      // Revert on error
      const originalClass = localClasses.find((c) => c.id === classId)
      if (originalClass) {
        setLocalClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? { ...c, status: originalClass.status, completedAt: originalClass.completedAt }
              : c
          )
        )
      }
      toast.error('Error al actualizar la clase')
    }
  }

  const handleTogglePayable = async (classId: string, isPayable: boolean) => {
    try {
      // Update local state optimistically
      setLocalClasses((prev) =>
        prev.map((classItem) =>
          classItem.id === classId ? { ...classItem, isPayable } : classItem
        )
      )

      const result = await toggleClassPayable(classId, isPayable)
      if (result.success) {
        toast.success(result.message)
      } else {
        // Revert on error
        setLocalClasses((prev) =>
          prev.map((classItem) =>
            classItem.id === classId ? { ...classItem, isPayable: !isPayable } : classItem
          )
        )
        toast.error(result.error || 'Error al actualizar el estado de pago')
      }
    } catch {
      // Revert on error
      setLocalClasses((prev) =>
        prev.map((classItem) =>
          classItem.id === classId ? { ...classItem, isPayable: !isPayable } : classItem
        )
      )
      toast.error('Error al actualizar el estado de pago')
    }
  }

  const handleClassUpdated = (updatedClass: ClassBookingWithDetails) => {
    setLocalClasses((prev) =>
      prev.map((classItem) => (classItem.id === updatedClass.id ? updatedClass : classItem))
    )
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      CONFIRMED: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      COMPLETED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100',
      NO_SHOW: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    }
    const statusLabels: Record<string, string> = {
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
    }
    return (
      <Badge
        className={`${statusStyles[status] || 'bg-gray-100 text-gray-700'} border-0 font-medium`}
      >
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const getUniqueTeachers = () => {
    const teachers = Array.from(new Set(classes.map((c) => c.teacherId)))
      .map((id) => classes.find((c) => c.teacherId === id)!)
      .map((c) => ({ id: c.teacherId, name: c.teacher.name, lastName: c.teacher.lastName }))
    return teachers
  }

  const selectedClasses = useMemo(() => {
    return filteredClasses.filter((_, index) => selectedRows[index])
  }, [filteredClasses, selectedRows])

  const handleClearSelection = () => {
    setSelectedRows({})
  }

  const handleBulkActionComplete = (
    updatedIds: string[],
    action: string,
    data?: {
      teacherId?: string
      teacher?: {
        id: string
        name: string
        lastName: string | null
        email: string
        image: string | null
      }
      day?: string
      timeSlot?: string
    }
  ) => {
    if (action === 'delete') {
      setLocalClasses((prev) => prev.filter((c) => !updatedIds.includes(c.id)))
    } else {
      // Refresh data for other actions - update local state optimistically
      setLocalClasses((prev) =>
        prev.map((c) => {
          if (!updatedIds.includes(c.id)) return c

          switch (action) {
            case 'mark_completed':
              return { ...c, status: 'COMPLETED' as const, completedAt: new Date() }
            case 'mark_confirmed':
              return { ...c, status: 'CONFIRMED' as const }
            case 'mark_cancelled':
              return { ...c, status: 'CANCELLED' as const, cancelledAt: new Date() }
            case 'mark_no_show':
              return { ...c, status: 'NO_SHOW' as const }
            case 'make_payable':
              return { ...c, isPayable: true }
            case 'make_non_payable':
              return { ...c, isPayable: false }
            case 'change_teacher':
              if (data?.teacherId && data?.teacher) {
                return {
                  ...c,
                  teacherId: data.teacherId,
                  teacher: data.teacher,
                }
              }
              return c
            case 'reschedule':
              if (data?.day && data?.timeSlot) {
                return {
                  ...c,
                  day: data.day,
                  timeSlot: data.timeSlot,
                }
              }
              return c
            default:
              return c
          }
        })
      )
    }
    setSelectedRows({})
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setTeacherFilter('all')
    setDateFilter('all')
    setSearchTerm('')
  }

  const columns: ColumnDef<ClassBookingWithDetails>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
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
      accessorKey: 'day',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Clase" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{formatDate(row.original.day)}</div>
          <div className="text-xs text-muted-foreground">ID: {row.original.id.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      accessorKey: 'student',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            userId={row.original.student.id}
            userName={row.original.student.name}
            userLastName={row.original.student.lastName}
            userImage={row.original.student.image}
            className="h-7 w-7"
            fallbackClassName="text-xs bg-slate-200"
          />
          <div>
            <div className="font-medium text-sm">
              {formatFullName(row.original.student.name, row.original.student.lastName)}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.student.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'teacher',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profesor" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            userId={row.original.teacher.id}
            userName={row.original.teacher.name}
            userLastName={row.original.teacher.lastName}
            userImage={row.original.teacher.image}
            className="h-7 w-7"
            fallbackClassName="text-xs bg-slate-200"
          />
          <div>
            <div className="font-medium text-sm">
              {formatFullName(row.original.teacher.name, row.original.teacher.lastName)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(row.original.status)}
          {row.original.isPayable && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 font-medium">
              <DollarSign className="h-3 w-3 mr-1" />
              Pagable
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'timeSlot',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horario" />,
      cell: ({ row }) => <div className="text-sm">{row.original.timeSlot}</div>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const classItem = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <EditClassDialog classItem={classItem} onClassUpdated={handleClassUpdated}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </EditClassDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ViewClassDialog classItem={classItem}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </DropdownMenuItem>
                </ViewClassDialog>
                <RescheduleClassDialog classItem={classItem}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Reagendar
                  </DropdownMenuItem>
                </RescheduleClassDialog>
                {classItem.status === 'CONFIRMED' && (
                  <DropdownMenuItem onClick={() => handleMarkCompleted(classItem.id)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Marcar completada
                  </DropdownMenuItem>
                )}
                {classItem.status === 'COMPLETED' && (
                  <DropdownMenuItem
                    onClick={() => handleTogglePayable(classItem.id, !classItem.isPayable)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {classItem.isPayable ? 'Desmarcar como pagable' : 'Marcar como pagable'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setClassToDelete(classItem.id)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
          placeholder="Buscar por estudiante o profesor..."
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
          <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
          <SelectItem value="COMPLETED">Completadas</SelectItem>
          <SelectItem value="CANCELLED">Canceladas</SelectItem>
          <SelectItem value="NO_SHOW">No asistió</SelectItem>
        </SelectContent>
      </Select>
      <Select value={teacherFilter} onValueChange={setTeacherFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Profesor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {getUniqueTeachers().map((teacher) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              {teacher.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Fecha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="past">Pasadas</SelectItem>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="future">Futuras</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Más antiguas</SelectItem>
          <SelectItem value="desc">Más recientes</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <BulkActionsBar
        selectedClasses={selectedClasses}
        onClearSelection={handleClearSelection}
        onActionComplete={handleBulkActionComplete}
        availableTeachers={getUniqueTeachers()}
        userTimezone={userTimezone}
      />

      <DataTable
        columns={columns}
        data={filteredClasses}
        toolbar={toolbar}
        emptyMessage="No se encontraron clases que coincidan con los filtros."
        pagination={pagination}
        onPaginationChange={setPagination}
        onRowSelectionChange={(rows) => {
          const newSelection: Record<string, boolean> = {}
          rows.forEach((row) => {
            const index = filteredClasses.findIndex((c) => c.id === row.id)
            if (index !== -1) newSelection[index] = true
          })
          setSelectedRows(newSelection)
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la clase y todos sus
              datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
