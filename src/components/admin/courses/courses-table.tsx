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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Archive, BookOpen, Edit, Eye, Globe, MoreHorizontal, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EditCourseDialog } from './edit-course-dialog'
import { ViewCourseDialog } from './view-course-dialog'

interface CoursesTableProps {
  courses: CourseWithDetails[]
  onCourseUpdated?: () => void
}

export function CoursesTable({ courses, onCourseUpdated }: CoursesTableProps) {
  const [filteredCourses, setFilteredCourses] = useState(courses)
  const [searchTerm, setSearchTerm] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter courses based on search and filters
  const handleFilter = useCallback(() => {
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

    setFilteredCourses(filtered)
  }, [courses, searchTerm, languageFilter, statusFilter])

  // Apply filters when search term or filters change
  useEffect(() => {
    handleFilter()
  }, [handleFilter])

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteCourse(courseToDelete)
      if (result.success) {
        toast.success('Curso eliminado exitosamente')
        setDeleteDialogOpen(false)
        setCourseToDelete(null)
        // Refresh the page or update the courses list
        setFilteredCourses(courses.filter((course) => course.id !== courseToDelete))
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
        window.location.reload()
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los idiomas</SelectItem>
            {getLanguages().map((language) => (
              <SelectItem key={language} value={language}>
                {language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="unpublished">No publicados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{course.language}</Badge>
                    <Badge variant="outline">{course.level}</Badge>
                    <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                      {course.isPublished ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ViewCourseDialog course={course}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                    </ViewCourseDialog>
                    <EditCourseDialog course={course} onCourseUpdated={onCourseUpdated}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </EditCourseDialog>
                    <DropdownMenuItem onClick={() => handleTogglePublished(course.id)}>
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
                      className="text-red-600"
                      onClick={() => {
                        setCourseToDelete(course.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {course.description}
              </p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course._count.modules} módulos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course._count.enrollments} estudiantes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No se encontraron cursos que coincidan con los filtros.
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el curso y todos sus
              datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
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
