'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClassBookingWithDetails, deleteClass, updateClass } from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { EditClassDialog } from './edit-class-dialog'
import { ViewClassDialog } from './view-class-dialog'
import { RescheduleClassDialog } from './reschedule-class-dialog'
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClassesTableProps {
  classes: ClassBookingWithDetails[]
}

export function ClassesTable({ classes }: ClassesTableProps) {
  const [filteredClasses, setFilteredClasses] = useState(classes)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter classes based on search and filters
  const handleFilter = useCallback(() => {
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
      const today = new Date().toISOString().split('T')[0]
      if (dateFilter === 'past') {
        filtered = filtered.filter((classItem) => classItem.day < today)
      } else if (dateFilter === 'today') {
        filtered = filtered.filter((classItem) => classItem.day === today)
      } else if (dateFilter === 'future') {
        filtered = filtered.filter((classItem) => classItem.day > today)
      }
    }

    setFilteredClasses(filtered)
  }, [classes, searchTerm, statusFilter, teacherFilter, dateFilter])

  // Apply filters when search term or filters change
  useEffect(() => {
    handleFilter()
  }, [searchTerm, statusFilter, teacherFilter, dateFilter, classes, handleFilter])

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
      const result = await updateClass(classId, {
        status: 'COMPLETED',
        completedAt: new Date(),
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
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="default">Confirmada</Badge>
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completada
          </Badge>
        )
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'NO_SHOW':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            No asistió
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUniqueTeachers = () => {
    const teachers = Array.from(new Set(classes.map((c) => c.teacherId)))
      .map((id) => classes.find((c) => c.teacherId === id)!)
      .map((c) => ({ id: c.teacherId, name: `${c.teacher.name} ${c.teacher.lastName}` }))
    return teachers
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <Input
          placeholder="Buscar por estudiante o profesor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
            <SelectItem value="NO_SHOW">No asistió</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Profesor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los profesores</SelectItem>
            {getUniqueTeachers().map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fecha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fechas</SelectItem>
            <SelectItem value="past">Pasadas</SelectItem>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="future">Futuras</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Classes List */}
      <div className="space-y-4">
        {filteredClasses.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(classItem.day)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{classItem.timeSlot}</span>
                    </div>
                    {getStatusBadge(classItem.status)}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Estudiante</p>
                        <p className="text-sm text-muted-foreground">
                          {classItem.student.name} {classItem.student.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Profesor</p>
                        <p className="text-sm text-muted-foreground">
                          {classItem.teacher.name} {classItem.teacher.lastName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {classItem.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Notas:</strong> {classItem.notes}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ViewClassDialog classItem={classItem}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                    </ViewClassDialog>
                    <EditClassDialog classItem={classItem}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </EditClassDialog>
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
                      className="text-red-600"
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
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No se encontraron clases que coincidan con los filtros.
          </p>
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
