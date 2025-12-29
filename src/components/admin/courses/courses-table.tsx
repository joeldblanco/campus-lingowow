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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteCourse, toggleCoursePublished } from '@/lib/actions/courses'
import { CourseWithDetails } from '@/types/course'
import { Archive, Edit, Eye, Globe, MoreVertical, Trash2, Settings, Search, ChevronLeft, ChevronRight, SlidersHorizontal, BookOpen, Users } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { EditCourseDialog } from './edit-course-dialog'
import { ViewCourseDialog } from './view-course-dialog'

interface CoursesTableProps {
  courses: CourseWithDetails[]
  onCourseUpdated?: () => void
  'data-testid'?: string
}

const ITEMS_PER_PAGE = 5

export function CoursesTable({ courses, onCourseUpdated, 'data-testid': testId }: CoursesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Filter courses based on search and filters
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

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE)
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCourses, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, languageFilter, statusFilter])

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
    const languages = Array.from(new Set(courses.map((course) => course.language)))
    return languages
  }

  const handleSelectCourse = (courseId: string, checked: boolean) => {
    if (checked) {
      setSelectedCourses([...selectedCourses, courseId])
    } else {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourses(paginatedCourses.map(c => c.id))
    } else {
      setSelectedCourses([])
    }
  }

  const handleBulkPublish = async () => {
    try {
      for (const courseId of selectedCourses) {
        await toggleCoursePublished(courseId)
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
      for (const courseId of selectedCourses) {
        await deleteCourse(courseId)
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

  const getStatusBadge = (isPublished: boolean) => {
    return isPublished ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Publicado</Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 font-medium">Borrador</Badge>
    )
  }

  return (
    <div className="space-y-4" data-testid={testId}>
      {/* Filters */}
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCourses.length === paginatedCourses.length && paginatedCourses.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Curso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Idioma</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Módulos</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Estudiantes</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron cursos que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCourses.map((course) => (
                <TableRow key={course.id} className="hover:bg-muted/30" data-course-id={course.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCourses.includes(course.id)}
                      onCheckedChange={(checked) => handleSelectCourse(course.id, !!checked)}
                      data-testid="row-checkbox"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{course.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {course.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.language}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(course.isPublished)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{course._count.modules}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{course._count.enrollments}</span>
                    </div>
                  </TableCell>
                  <TableCell>
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
                            data-testid={course.isPublished ? "unpublish-button" : "publish-button"}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredCourses.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCourses.length)}</span> de{' '}
            <span className="font-medium">{filteredCourses.length}</span> resultados
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
        <AlertDialogContent data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el curso y todos sus
              datos asociados.
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

      {/* Bulk Delete Confirmation Dialog */}
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
