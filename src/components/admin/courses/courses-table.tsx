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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { deleteCourse, toggleCoursePublished } from '@/lib/actions/courses'
import { CourseWithDetails } from '@/types/course'
import { Archive, Edit, Eye, Globe, MoreVertical, Trash2, Settings, Search, SlidersHorizontal, BookOpen, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EditCourseDialog } from './edit-course-dialog'
import { ViewCourseDialog } from './view-course-dialog'

interface CoursesTableProps {
  courses: CourseWithDetails[]
  onCourseUpdated?: () => void
  'data-testid'?: string
}

export function CoursesTable({ courses, onCourseUpdated, 'data-testid': testId }: CoursesTableProps) {
  const [languageFilter, setLanguageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<CourseWithDetails[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const filteredCourses = useMemo(() => {
    let filtered = courses

    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter((course) => course.language === languageFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((course) =>
        statusFilter === 'published' ? course.isPublished : !course.isPublished
      )
    }

    return filtered
  }, [courses, searchTerm, languageFilter, statusFilter])

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteCourse(courseToDelete)
      if (result.success) {
        toast.success('Curso eliminado exitosamente')
        setDeleteDialogOpen(false)
        setCourseToDelete(null)
        onCourseUpdated?.()
      } else {
        toast.error(result.error || 'Error al eliminar el curso')
      }
    } catch {
      console.error('Error deleting course')
      toast.error('Failed to delete course')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePublished = async (courseId: string) => {
    try {
      const result = await toggleCoursePublished(courseId)
      if (result.success) {
        toast.success('Estado del curso actualizado')
        onCourseUpdated?.()
      } else {
        toast.error(result.error || 'Error al actualizar el curso')
      }
    } catch {
      toast.error('Error al actualizar el curso')
    }
  }

  const getLanguages = () => {
    return Array.from(new Set(courses.map((course) => course.language)))
  }

  const handleBulkPublish = async () => {
    try {
      for (const course of selectedCourses) {
        await toggleCoursePublished(course.id)
      }
      toast.success('Cursos publicados exitosamente')
      setSelectedCourses([])
      onCourseUpdated?.()
    } catch {
      toast.error('Error al publicar cursos')
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      for (const course of selectedCourses) {
        await deleteCourse(course.id)
      }
      toast.success('Cursos eliminados exitosamente')
      setBulkDeleteDialogOpen(false)
      setSelectedCourses([])
      onCourseUpdated?.()
    } catch {
      toast.error('Error al eliminar cursos')
    } finally {
      setIsDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setLanguageFilter('all')
    setStatusFilter('all')
  }

  const columns: ColumnDef<CourseWithDetails>[] = [
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
          data-testid="row-checkbox"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Curso" />,
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate">{row.original.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</div>
        </div>
      ),
    },
    {
      accessorKey: 'language',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Idioma" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.language}</Badge>,
    },
    {
      accessorKey: 'isPublished',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.isPublished ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Publicado</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 font-medium">Borrador</Badge>
        ),
    },
    {
      accessorKey: 'modules',
      header: () => <div className="text-center">Módulos</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.original._count.modules}</span>
        </div>
      ),
    },
    {
      accessorKey: 'enrollments',
      header: () => <div className="text-center">Estudiantes</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.original._count.enrollments}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const course = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <EditCourseDialog course={course} onCourseUpdated={onCourseUpdated}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="edit-button">
                <Edit className="h-4 w-4" />
              </Button>
            </EditCourseDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="course-actions-button">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ViewCourseDialog course={course}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid="view-button">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </DropdownMenuItem>
                </ViewCourseDialog>
                <DropdownMenuItem asChild>
                  <a href={`/admin/courses/${course.id}/builder`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Course Builder
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTogglePublished(course.id)}
                  data-testid={course.isPublished ? 'unpublish-button' : 'publish-button'}
                >
                  {course.isPublished ? (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Despublicar
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Publicar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setCourseToDelete(course.id)
                    setDeleteDialogOpen(true)
                  }}
                  data-testid="delete-button"
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
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="search-input"
        />
      </div>
      <Select value={languageFilter} onValueChange={setLanguageFilter}>
        <SelectTrigger className="w-[140px]" data-testid="language-filter">
          <SelectValue placeholder="Idioma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {getLanguages().map((language) => (
            <SelectItem key={language} value={language} data-testid={`language-option-${language.toLowerCase()}`}>
              {language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]" data-testid="level-filter">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="published">Publicados</SelectItem>
          <SelectItem value="unpublished">Borradores</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0" data-testid="clear-filters-button">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      {selectedCourses.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleBulkPublish}>
            <Globe className="h-4 w-4 mr-2" />
            Publicar ({selectedCourses.length})
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar ({selectedCourses.length})
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div data-testid={testId}>
      <DataTable
        columns={columns}
        data={filteredCourses}
        toolbar={toolbar}
        onRowSelectionChange={setSelectedCourses}
        emptyMessage="No se encontraron cursos que coincidan con los filtros."
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el curso y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-button"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="confirm-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente {selectedCourses.length} curso(s) y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-bulk-delete-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-bulk-delete-button"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
