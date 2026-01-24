'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserAvatarUrl } from '@/lib/utils'
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
import { Search, Edit, MoreVertical, Plus, SlidersHorizontal, BarChart3, Eye, UserPlus, Send, EyeOff, Trash2 } from 'lucide-react'
import { CreateExamDialog } from './create-exam-dialog'
import { EditExamDialog } from './edit-exam-dialog'
import { ViewExamDialog } from './view-exam-dialog'
import { AssignExamDialog } from './assign-exam-dialog'
import { toast } from 'sonner'
import { deleteExam, updateExam } from '@/lib/actions/exams'
import { ExamWithDetails, EXAM_TYPE_LABELS, ExamTypeValue } from '@/types/exam'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, GraduationCap, Stethoscope, Dumbbell } from 'lucide-react'

interface ExamsTableProps {
  exams: ExamWithDetails[]
}

export function ExamsTable({ exams }: ExamsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [creatorFilter, setCreatorFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamWithDetails | null>(null)

  const uniqueCreators = useMemo(() => {
    const creators = exams
      .map((exam) => exam.creator)
      .filter(Boolean)
      .filter((creator, index, self) =>
        self.findIndex(c => c?.email === creator?.email) === index
      )
    return creators
  }, [exams])

  const uniqueCourses = useMemo(() => {
    const courseMap = new Map()
    exams.forEach((exam) => {
      if (exam.course) {
        courseMap.set(exam.course.id, exam.course)
      }
    })
    return Array.from(courseMap.values())
  }, [exams])

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
        if (statusFilter === 'archived') return false
        return true
      })
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.courseId === courseFilter)
    }

    if (creatorFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.creator?.email === creatorFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((exam) => exam.examType === typeFilter)
    }

    return filtered
  }, [exams, searchTerm, statusFilter, courseFilter, creatorFilter, typeFilter])

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

  const getExamTypeBadge = (examType: ExamTypeValue) => {
    const config: Record<ExamTypeValue, { icon: React.ReactNode; className: string }> = {
      COURSE_EXAM: { icon: <GraduationCap className="h-3 w-3" />, className: 'bg-blue-100 text-blue-700' },
      PLACEMENT_TEST: { icon: <ClipboardCheck className="h-3 w-3" />, className: 'bg-purple-100 text-purple-700' },
      DIAGNOSTIC: { icon: <Stethoscope className="h-3 w-3" />, className: 'bg-orange-100 text-orange-700' },
      PRACTICE: { icon: <Dumbbell className="h-3 w-3" />, className: 'bg-green-100 text-green-700' },
    }
    const { icon, className } = config[examType] || config.COURSE_EXAM
    return (
      <Badge className={`${className} hover:${className} border-0 font-medium flex items-center gap-1`}>
        {icon}
        {EXAM_TYPE_LABELS[examType]}
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

  const clearFilters = () => {
    setStatusFilter('all')
    setCreatorFilter('all')
    setCourseFilter('all')
    setTypeFilter('all')
  }

  const columns: ColumnDef<ExamWithDetails>[] = [
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
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título del Examen" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">{formatTimeAgo(row.original.updatedAt)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'creator',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creador" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.creator?.email ? getUserAvatarUrl(row.original.creator.email) : ''} />
            <AvatarFallback className="text-xs bg-slate-200">
              {getCreatorInitials(row.original.creator)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{getCreatorName(row.original.creator)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'examType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => getExamTypeBadge(row.original.examType as ExamTypeValue),
    },
    {
      accessorKey: 'isPublished',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => getStatusBadge(row.original),
    },
    {
      accessorKey: 'course',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asignado a" />,
      cell: ({ row }) =>
        row.original.course ? (
          <span className="text-sm">{row.original.course.title} - {row.original.course.level}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin asignar</span>
        ),
    },
    {
      accessorKey: 'questions',
      header: () => <div className="text-center">Preguntas</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-sm font-medium">{getTotalQuestions(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'timeLimit',
      header: () => <div className="text-center">Límite de Tiempo</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-sm font-medium">{formatDuration(row.original.timeLimit || 0)}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const exam = row.original
        return (
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
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/teacher/exams/${exam.id}/results`)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Resultados
                </DropdownMenuItem>
{/* Solo mostrar opción de asignar si el examen NO tiene curso o si el curso es personalizado */}
                                {(!exam.courseId || exam.course?.isPersonalized) && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedExam(exam)
                      setAssignDialogOpen(true)
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Asignar a Estudiantes
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleTogglePublish(exam)}>
                  {exam.isPublished ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {exam.isPublished ? 'Despublicar' : 'Publicar'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteExam(exam.id)}
                  className="text-destructive"
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
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="COURSE_EXAM">Examen de Curso</SelectItem>
          <SelectItem value="PLACEMENT_TEST">Test de Clasificación</SelectItem>
          <SelectItem value="DIAGNOSTIC">Diagnóstico</SelectItem>
          <SelectItem value="PRACTICE">Práctica</SelectItem>
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

      <DataTable
        columns={columns}
        data={filteredExams}
        toolbar={toolbar}
        emptyMessage="No se encontraron exámenes"
      />

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
