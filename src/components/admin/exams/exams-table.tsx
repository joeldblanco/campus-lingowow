'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Eye, Edit, Trash2, MoreHorizontal, Plus, Users, Clock, Send } from 'lucide-react'
import { CreateExamDialog } from './create-exam-dialog'
import { EditExamDialog } from './edit-exam-dialog'
import { ViewExamDialog } from './view-exam-dialog'
import { AssignExamDialog } from './assign-exam-dialog'
import { toast } from 'sonner'
import { deleteExam, updateExam } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'
import { calculateExamPoints } from '@/lib/utils/exam-helpers'
import { useRouter } from 'next/navigation'

interface ExamsTableProps {
  exams: ExamWithDetails[]
}

export function ExamsTable({ exams }: ExamsTableProps) {
  const router = useRouter()
  const [filteredExams, setFilteredExams] = useState(exams)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamWithDetails | null>(null)

  // Filter exams based on search and filters
  const filterExams = () => {
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
        return true
      })
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.courseId === courseFilter)
    }

    setFilteredExams(filtered)
  }

  // Apply filters when dependencies change
  useState(() => {
    filterExams()
  })

  const handleDeleteExam = async (examId: string) => {
    const result = await deleteExam(examId)
    if (result.success) {
      toast.success('Examen eliminado exitosamente')
      // Refresh the page or update state
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
      return <Badge variant="default">Publicado</Badge>
    }
    return <Badge variant="secondary">Borrador</Badge>
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const uniqueCourses = Array.from(new Set(exams.map((exam) => exam.course).filter(Boolean)))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Exámenes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Gestiona y crea exámenes para tus cursos
            </p>
          </div>
          <Button onClick={() => router.push('/admin/exams/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Examen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Buscar exámenes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              filterExams()
            }}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cursos</SelectItem>
              {uniqueCourses.map((course) => (
                <SelectItem key={course?.id} value={course?.id || ''}>
                  {course?.title} ({course?.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Puntos</TableHead>
              <TableHead>Intentos</TableHead>
              <TableHead>Tasa de Aprobación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No se encontraron exámenes
                </TableCell>
              </TableRow>
            ) : (
              filteredExams.map((exam) => {
                const totalAttempts = exam.attempts.length
                const passedAttempts = exam.attempts.filter(
                  (attempt) =>
                    attempt.status === 'COMPLETED' &&
                    (attempt.score || 0) >= exam.passingScore
                ).length
                const passRate =
                  totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0
                const totalPoints = calculateExamPoints(exam)

                return (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exam.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {exam.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {exam.course ? (
                        <div>
                          <div className="font-medium">{exam.course.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {exam.course.language} - {exam.course.level}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No se encontró curso</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(exam)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(exam.timeLimit || 0)}
                      </div>
                    </TableCell>
                    <TableCell>{totalPoints} pts</TableCell>
                    <TableCell>{totalAttempts}</TableCell>
                    <TableCell>
                      <Badge variant={passRate >= 70 ? 'default' : 'destructive'}>
                        {passRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExam(exam)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/exams/edit/${exam.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExam(exam)
                              setAssignDialogOpen(true)
                            }}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Asignar a Estudiantes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(exam)}>
                            <Send className="mr-2 h-4 w-4" />
                            {exam.isPublished ? 'Despublicar' : 'Publicar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

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
    </Card>
  )
}
