'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Search, Edit, MoreVertical, Plus, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { CreateExamDialog } from './create-exam-dialog'
import { EditExamDialog } from './edit-exam-dialog'
import { ViewExamDialog } from './view-exam-dialog'
import { AssignExamDialog } from './assign-exam-dialog'
import { toast } from 'sonner'
import { deleteExam, updateExam } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'
import { useRouter } from 'next/navigation'

interface ExamsTableProps {
  exams: ExamWithDetails[]
}

const ITEMS_PER_PAGE = 5

export function ExamsTable({ exams }: ExamsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [creatorFilter, setCreatorFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedExams, setSelectedExams] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamWithDetails | null>(null)

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    const creators = exams
      .map((exam) => exam.creator)
      .filter(Boolean)
      .filter((creator, index, self) => 
        self.findIndex(c => c?.email === creator?.email) === index
      )
    return creators
  }, [exams])

  // Get unique courses for filter
  const uniqueCourses = useMemo(() => {
    return Array.from(new Set(exams.map((exam) => exam.course).filter(Boolean)))
  }, [exams])

  // Filter exams based on search and filters
  const filteredExams = useMemo(() => {
    let filtered = exams

    if (searchTerm) {
      filtered = filtered.filter(
        (exam) =>
          exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exam.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((exam) => {
        if (statusFilter === 'published') return exam.isPublished
        if (statusFilter === 'draft') return !exam.isPublished
        if (statusFilter === 'archived') return false // Placeholder for archived status
        return true
      })
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.courseId === courseFilter)
    }

    if (creatorFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.creator?.email === creatorFilter)
    }

    return filtered
  }, [exams, searchTerm, statusFilter, courseFilter, creatorFilter])

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE)
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredExams.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredExams, currentPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, courseFilter, creatorFilter])

  const handleDeleteExam = async (examId: string) => {
    const result = await deleteExam(examId)
    if (result.success) {
      toast.success('Examen eliminado exitosamente')
      window.location.reload()
    } else {
      toast.error(result.error || 'Error al eliminar el examen')
    }
  }

  const handleTogglePublish = async (exam: ExamWithDetails) => {
    const result = await updateExam(exam.id, {
      isPublished: !exam.isPublished,
    })
    if (result.success) {
      toast.success(`Examen ${exam.isPublished ? 'despublicado' : 'publicado'} exitosamente`)
      window.location.reload()
    } else {
      toast.error('Error al actualizar el estado del examen')
    }
  }

  const getStatusBadge = (exam: ExamWithDetails) => {
    if (exam.isPublished) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">
          Publicado
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 font-medium">
        Borrador
      </Badge>
    )
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    if (months > 0) return `Actualizado hace ${months} ${months === 1 ? 'mes' : 'meses'}`
    if (weeks > 0) return `Actualizado hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
    if (days > 0) return `Actualizado hace ${days} ${days === 1 ? 'día' : 'días'}`
    if (hours > 0) return `Actualizado hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    return `Actualizado hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  }

  const getCreatorInitials = (creator: ExamWithDetails['creator']) => {
    if (!creator) return 'NA'
    const first = creator.name?.charAt(0) || ''
    const last = creator.lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'NA'
  }

  const getCreatorName = (creator: ExamWithDetails['creator']) => {
    if (!creator) return 'Sin asignar'
    return `${creator.name || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Sin asignar'
  }

  const getTotalQuestions = (exam: ExamWithDetails) => {
    return exam.sections?.reduce((acc, section) => acc + (section.questions?.length || 0), 0) || 0
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExams(paginatedExams.map(exam => exam.id))
    } else {
      setSelectedExams([])
    }
  }

  const handleSelectExam = (examId: string, checked: boolean) => {
    if (checked) {
      setSelectedExams(prev => [...prev, examId])
    } else {
      setSelectedExams(prev => prev.filter(id => id !== examId))
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setCreatorFilter('all')
    setCourseFilter('all')
    setTypeFilter('all')
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
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Exámenes</h1>
          <p className="text-muted-foreground">
            Administra todos los exámenes, evaluaciones y pruebas finales de la plataforma.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/admin/exams/create')}
          className="bg-primary hover:bg-primary/80 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Nuevo Examen
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título del examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="archived">Archivado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={creatorFilter} onValueChange={setCreatorFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Creador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueCreators.map((creator) => (
              <SelectItem key={creator?.email} value={creator?.email || ''}>
                {getCreatorName(creator)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueCourses.map((course) => (
              <SelectItem key={course?.id} value={course?.id || ''}>
                {course?.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="exam">Examen</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon"
          onClick={clearFilters}
          className="shrink-0"
        >
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
                  checked={selectedExams.length === paginatedExams.length && paginatedExams.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Título del Examen</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Creador</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Asignado a</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Preguntas</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Límite de Tiempo</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No se encontraron exámenes
                </TableCell>
              </TableRow>
            ) : (
              paginatedExams.map((exam) => (
                <TableRow key={exam.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox 
                      checked={selectedExams.includes(exam.id)}
                      onCheckedChange={(checked) => handleSelectExam(exam.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{exam.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(exam.updatedAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs bg-slate-200">
                          {getCreatorInitials(exam.creator)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{getCreatorName(exam.creator)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(exam)}</TableCell>
                  <TableCell>
                    {exam.course ? (
                      <span className="text-sm">
                        {exam.course.title} - {exam.course.level}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{getTotalQuestions(exam)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{formatDuration(exam.timeLimit || 0)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/admin/exams/edit/${exam.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExam(exam)
                              setViewDialogOpen(true)
                            }}
                          >
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExam(exam)
                              setAssignDialogOpen(true)
                            }}
                          >
                            Asignar a Estudiantes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(exam)}>
                            {exam.isPublished ? 'Despublicar' : 'Publicar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-destructive"
                          >
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
          <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredExams.length)}</span> de{' '}
          <span className="font-medium">{filteredExams.length}</span> resultados
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

      {/* Dialogs */}
      <CreateExamDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {selectedExam && (
        <>
          <EditExamDialog
            exam={selectedExam}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <ViewExamDialog
            exam={selectedExam}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
          />
          <AssignExamDialog
            exam={selectedExam}
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
          />
        </>
      )}
    </div>
  )
}
