'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { deleteEnrollment } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { Edit, MoreVertical, Search, Trash2, Plus, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { EditEnrollmentDialog } from './edit-enrollment-dialog'
import { CreateEnrollmentDialog } from './create-enrollment-dialog'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Progress } from '@/components/ui/progress'
import { EnrollmentStatus } from '@prisma/client'
import { formatDateShort } from '@/lib/utils/date'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEnrollmentUpdated?: () => void
}

const statusLabels: Record<EnrollmentStatus, string> = {
  PENDING: 'Pre-inscripción',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
}

export function EnrollmentsTable({ enrollments, onEnrollmentUpdated }: EnrollmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredEnrollments = useMemo(() => {
    let filtered = enrollments

    if (searchTerm) {
      filtered = filtered.filter(
        (enrollment) =>
          enrollment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (enrollment.student.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          enrollment.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          enrollment.course.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((enrollment) => enrollment.status === statusFilter)
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter((enrollment) => enrollment.courseId === courseFilter)
    }

    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.enrollmentDate).getTime()
      const dateB = new Date(b.enrollmentDate).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    return filtered
  }, [enrollments, searchTerm, statusFilter, courseFilter, sortOrder])

  const handleDeleteEnrollment = async () => {
    if (!enrollmentToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteEnrollment(enrollmentToDelete)
      if (result.success) {
        toast.success('Inscripción eliminada exitosamente')
        setDeleteDialogOpen(false)
        setEnrollmentToDelete(null)
        onEnrollmentUpdated?.()
      } else {
        toast.error(result.error || 'Error al eliminar la inscripción')
      }
    } catch {
      toast.error('Error al eliminar la inscripción')
    } finally {
      setIsDeleting(false)
    }
  }

  const getCourses = () => {
    const courses = Array.from(
      new Set(enrollments.map((e) => ({ id: e.courseId, title: e.course.title })))
    )
    return courses.filter(
      (course, index, self) => self.findIndex((c) => c.id === course.id) === index
    )
  }

  const getStatusBadge = (status: EnrollmentStatus) => {
    const statusStyles: Record<EnrollmentStatus, string> = {
      PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      ACTIVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      COMPLETED: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      PAUSED: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
      CANCELLED: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    }
    return (
      <Badge className={`${statusStyles[status]} border-0 font-medium`}>
        {statusLabels[status]}
      </Badge>
    )
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setCourseFilter('all')
    setSearchTerm('')
  }

  const columns: ColumnDef<EnrollmentWithDetails>[] = [
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
              {row.original.student.name} {row.original.student.lastName || ''}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.student.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'course',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Curso" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.course.title}</div>
          <div className="text-xs text-muted-foreground">Nivel {row.original.course.level}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'progress',
      header: () => <div className="text-center">Progreso</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Progress value={row.original.progress} className="w-[60px] h-2" />
          <span className="text-xs font-medium">{row.original.progress}%</span>
        </div>
      ),
    },
    {
      accessorKey: 'enrollmentDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Inscripción" />,
      cell: ({ row }) => <span className="text-sm">{formatDateShort(row.original.enrollmentDate)}</span>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const enrollment = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <EditEnrollmentDialog enrollment={enrollment} onEnrollmentUpdated={onEnrollmentUpdated}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </EditEnrollmentDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => {
                    setEnrollmentToDelete(enrollment.id)
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
          placeholder="Buscar por estudiante o curso..."
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
          <SelectItem value="PENDING">Pre-inscripción</SelectItem>
          <SelectItem value="ACTIVE">Activo</SelectItem>
          <SelectItem value="COMPLETED">Completado</SelectItem>
          <SelectItem value="PAUSED">Pausado</SelectItem>
          <SelectItem value="CANCELLED">Cancelado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={courseFilter} onValueChange={setCourseFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Curso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {getCourses().map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Inscripciones</h1>
          <p className="text-muted-foreground">
            Administra las inscripciones de estudiantes en los cursos.
          </p>
        </div>
        <CreateEnrollmentDialog onEnrollmentCreated={onEnrollmentUpdated}>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Inscripción
          </Button>
        </CreateEnrollmentDialog>
      </div>

      <DataTable
        columns={columns}
        data={filteredEnrollments}
        toolbar={toolbar}
        emptyMessage="No se encontraron inscripciones"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la inscripción del
              estudiante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEnrollment}
              disabled={isDeleting}
              className="bg-destructive"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
