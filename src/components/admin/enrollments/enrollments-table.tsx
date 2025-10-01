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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteEnrollment } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EditEnrollmentDialog } from './edit-enrollment-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { EnrollmentStatus } from '@prisma/client'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEnrollmentUpdated?: () => void
}

const statusColors: Record<EnrollmentStatus, string> = {
  PENDING: 'bg-yellow-500',
  ACTIVE: 'bg-green-500',
  COMPLETED: 'bg-blue-500',
  PAUSED: 'bg-orange-500',
  CANCELLED: 'bg-gray-500',
}

const statusLabels: Record<EnrollmentStatus, string> = {
  PENDING: 'Pre-inscripción',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
}

export function EnrollmentsTable({ enrollments, onEnrollmentUpdated }: EnrollmentsTableProps) {
  const [filteredEnrollments, setFilteredEnrollments] = useState(enrollments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter enrollments based on search and filters
  const handleFilter = useCallback(() => {
    let filtered = enrollments

    if (searchTerm) {
      filtered = filtered.filter(
        (enrollment) =>
          enrollment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          enrollment.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    setFilteredEnrollments(filtered)
  }, [enrollments, searchTerm, statusFilter, courseFilter])

  // Apply filters when search term or filters change
  useEffect(() => {
    handleFilter()
  }, [handleFilter])

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
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante, email o curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDING">Pre-inscripción</SelectItem>
            <SelectItem value="ACTIVE">Activo</SelectItem>
            <SelectItem value="COMPLETED">Completado</SelectItem>
            <SelectItem value="PAUSED">Pausado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {getCourses().map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Período Académico</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Fecha de Inscripción</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEnrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron inscripciones
                </TableCell>
              </TableRow>
            ) : (
              filteredEnrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={enrollment.student.image || ''} />
                        <AvatarFallback>
                          {enrollment.student.name[0]}
                          {enrollment.student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {enrollment.student.name} {enrollment.student.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.student.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{enrollment.course.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Nivel {enrollment.course.level} • {enrollment.course._count.modules} módulos
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{enrollment.academicPeriod.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(enrollment.academicPeriod.startDate).toLocaleDateString('es-ES', {
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(enrollment.academicPeriod.endDate).toLocaleDateString('es-ES', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[enrollment.status]}>
                      {statusLabels[enrollment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={enrollment.progress} className="w-[60px]" />
                      <span className="text-sm text-muted-foreground">{enrollment.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(enrollment.enrollmentDate)}</TableCell>
                  <TableCell>
                    {enrollment.lastAccessed ? formatDate(enrollment.lastAccessed) : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditEnrollmentDialog
                          enrollment={enrollment}
                          onEnrollmentUpdated={onEnrollmentUpdated}
                        >
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </EditEnrollmentDialog>
                        <DropdownMenuSeparator />
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
