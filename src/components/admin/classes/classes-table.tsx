'use client'

import { useEffect, useState, useMemo } from 'react'
import { ClassBookingWithDetails, deleteClass, updateClass } from '@/lib/actions/classes'
import { getTodayString } from '@/lib/utils/date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { EditClassDialog } from './edit-class-dialog'
import { ViewClassDialog } from './view-class-dialog'
import { RescheduleClassDialog } from './reschedule-class-dialog'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { BookingStatus } from '@prisma/client'
import { useTimezone } from '@/hooks/use-timezone'

interface ClassesTableProps {
  classes: ClassBookingWithDetails[]
}

const ITEMS_PER_PAGE = 5

export function ClassesTable({ classes }: ClassesTableProps) {
  const { timezone: userTimezone } = useTimezone()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter classes based on search and filters
  const filteredClasses = useMemo(() => {
    let filtered = classes

    if (searchTerm) {
      filtered = filtered.filter(
        (classItem) =>
          classItem.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classItem.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    // Sort by date and time using proper Date comparison
    filtered = [...filtered].sort((a, b) => {
      const timeA = a.timeSlot.split('-')[0]
      const timeB = b.timeSlot.split('-')[0]
      const dateTimeA = new Date(`${a.day}T${timeA}`).getTime()
      const dateTimeB = new Date(`${b.day}T${timeB}`).getTime()
      return sortOrder === 'asc' ? dateTimeA - dateTimeB : dateTimeB - dateTimeA
    })

    return filtered
  }, [classes, searchTerm, statusFilter, teacherFilter, dateFilter, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE)
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredClasses.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredClasses, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, teacherFilter, dateFilter])

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteClass(classToDelete)
      if (result.success) {
        toast.success('Clase eliminada exitosamente')
        setDeleteDialogOpen(false)
        setClassToDelete(null)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al eliminar la clase')
      }
    } catch {
      toast.error('Error al eliminar la clase')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkCompleted = async (classId: string) => {
    try {
      const classItem = filteredClasses.find((c) => c.id === classId)
      if (!classItem) {
        toast.error('Clase no encontrada')
        return
      }

      const result = await updateClass(classId, {
        studentId: classItem.studentId,
        teacherId: classItem.teacherId,
        day: classItem.day,
        timeSlot: classItem.timeSlot,
        status: BookingStatus.COMPLETED,
        completedAt: new Date(), // Se guardará en UTC automáticamente por Prisma
        timezone: userTimezone,
      })
      if (result.success) {
        toast.success('Clase marcada como completada')
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar la clase')
      }
    } catch {
      toast.error('Error al actualizar la clase')
    }
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
      <Badge className={`${statusStyles[status] || 'bg-gray-100 text-gray-700'} border-0 font-medium`}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const getUniqueTeachers = () => {
    const teachers = Array.from(new Set(classes.map((c) => c.teacherId)))
      .map((id) => classes.find((c) => c.teacherId === id)!)
      .map((c) => ({ id: c.teacherId, name: `${c.teacher.name} ${c.teacher.lastName || ''}` }))
    return teachers
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClasses(paginatedClasses.map(c => c.id))
    } else {
      setSelectedClasses([])
    }
  }

  const handleSelectClass = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses(prev => [...prev, id])
    } else {
      setSelectedClasses(prev => prev.filter(i => i !== id))
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setTeacherFilter('all')
    setDateFilter('all')
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
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedClasses.length === paginatedClasses.length && paginatedClasses.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Clase</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estudiante</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Profesor</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Horario</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron clases que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              paginatedClasses.map((classItem) => (
                <TableRow key={classItem.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedClasses.includes(classItem.id)}
                      onCheckedChange={(checked) => handleSelectClass(classItem.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{formatDate(classItem.day)}</div>
                      <div className="text-xs text-muted-foreground">ID: {classItem.id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        userId={classItem.student.id}
                        userName={classItem.student.name}
                        userLastName={classItem.student.lastName}
                        userImage={classItem.student.image}
                        className="h-7 w-7"
                        fallbackClassName="text-xs bg-slate-200"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {classItem.student.name} {classItem.student.lastName || ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {classItem.student.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        userId={classItem.teacher.id}
                        userName={classItem.teacher.name}
                        userLastName={classItem.teacher.lastName}
                        userImage={classItem.teacher.image}
                        className="h-7 w-7"
                        fallbackClassName="text-xs bg-slate-200"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {classItem.teacher.name} {classItem.teacher.lastName || ''}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(classItem.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{classItem.timeSlot}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <EditClassDialog classItem={classItem}>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredClasses.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredClasses.length)}</span> de{' '}
            <span className="font-medium">{filteredClasses.length}</span> resultados
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
      )}

      {/* Delete Confirmation Dialog */}
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
}
