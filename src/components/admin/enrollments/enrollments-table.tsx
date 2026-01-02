'use client'

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
import { deleteEnrollment } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { Edit, MoreVertical, Search, Trash2, Plus, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { EditEnrollmentDialog } from './edit-enrollment-dialog'
import { CreateEnrollmentDialog } from './create-enrollment-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { EnrollmentStatus } from '@prisma/client'
import { formatDateShort } from '@/lib/utils/date'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEnrollmentUpdated?: () => void
}

const ITEMS_PER_PAGE = 5

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
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter enrollments based on search and filters
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

    return filtered
  }, [enrollments, searchTerm, statusFilter, courseFilter])

  // Pagination
  const totalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE)
  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredEnrollments.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredEnrollments, currentPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, courseFilter])

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

  const formatDate = (date: Date) => {
    return formatDateShort(date)
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollments(paginatedEnrollments.map(e => e.id))
    } else {
      setSelectedEnrollments([])
    }
  }

  const handleSelectEnrollment = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedEnrollments(prev => [...prev, id])
    } else {
      setSelectedEnrollments(prev => prev.filter(i => i !== id))
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setCourseFilter('all')
    setSearchTerm('')
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
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search and Filters */}
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

        <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedEnrollments.length === paginatedEnrollments.length && paginatedEnrollments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estudiante</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Curso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Progreso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Fecha Inscripción</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEnrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron inscripciones
                </TableCell>
              </TableRow>
            ) : (
              paginatedEnrollments.map((enrollment) => (
                <TableRow key={enrollment.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedEnrollments.includes(enrollment.id)}
                      onCheckedChange={(checked) => handleSelectEnrollment(enrollment.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={enrollment.student.image || ''} />
                        <AvatarFallback className="text-xs bg-slate-200">
                          {enrollment.student.name[0]}{enrollment.student.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {enrollment.student.name} {enrollment.student.lastName || ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {enrollment.student.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{enrollment.course.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Nivel {enrollment.course.level}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={enrollment.progress} className="w-[60px] h-2" />
                      <span className="text-xs font-medium">{enrollment.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(enrollment.enrollmentDate)}</span>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
          <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredEnrollments.length)}</span> de{' '}
          <span className="font-medium">{filteredEnrollments.length}</span> resultados
        </p>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <Button
                key={index}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className={`h-8 w-8 ${currentPage === page ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-2 text-muted-foreground">...</span>
            )
          ))}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
