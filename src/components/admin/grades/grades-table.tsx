'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { StudentGradeData } from '@/lib/actions/grades'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
import { ViewGradesDialog } from './view-grades-dialog'
import { StudentProgressDialog } from './student-progress-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserAvatarUrl } from '@/lib/utils'
import { MoreVertical, Eye, TrendingUp, Search, SlidersHorizontal } from 'lucide-react'

interface GradesTableProps {
  grades: StudentGradeData[]
}

export function GradesTable({ grades }: GradesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredGrades = useMemo(() => {
    let filtered = grades

    if (searchTerm) {
      filtered = filtered.filter(
        (grade) =>
          grade.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grade.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grade.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter((grade) => grade.courseId === courseFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((grade) => grade.enrollmentStatus === statusFilter)
    }

    return filtered
  }, [grades, searchTerm, courseFilter, statusFilter])

  const getUniqueCourses = () => {
    const courses = Array.from(new Set(grades.map((g) => g.courseId)))
      .map((id) => grades.find((g) => g.courseId === id)!)
      .map((g) => ({ id: g.courseId, title: g.courseTitle }))
    return courses
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      ACTIVE: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      COMPLETED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      PAUSED: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100',
    }
    const statusLabels: Record<string, string> = {
      ACTIVE: 'Activo',
      COMPLETED: 'Completado',
      PAUSED: 'Pausado',
      CANCELLED: 'Cancelado',
    }
    return (
      <Badge className={`${statusStyles[status] || 'bg-gray-100 text-gray-700'} border-0 font-medium`}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCourseFilter('all')
    setStatusFilter('all')
  }

  const columns: ColumnDef<StudentGradeData>[] = [
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
      accessorKey: 'studentName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={getUserAvatarUrl(row.original.studentId)} />
            <AvatarFallback className="text-xs bg-slate-200">
              {row.original.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{row.original.studentName}</div>
            <div className="text-xs text-muted-foreground">{row.original.studentEmail}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'courseTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Curso" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.courseTitle}</div>
          <div className="text-xs text-muted-foreground">{row.original.courseLevel}</div>
        </div>
      ),
    },
    {
      accessorKey: 'enrollmentStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => getStatusBadge(row.original.enrollmentStatus),
    },
    {
      accessorKey: 'enrollmentProgress',
      header: () => <div className="text-center">Progreso</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Progress value={row.original.enrollmentProgress} className="w-[60px] h-2" />
          <span className="text-xs font-medium">{Math.round(row.original.enrollmentProgress)}%</span>
        </div>
      ),
    },
    {
      accessorKey: 'averageScore',
      header: () => <div className="text-center">Promedio</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className={`text-lg font-bold ${getScoreColor(row.original.averageScore)}`}>
            {row.original.averageScore}%
          </span>
          <div className="text-xs text-muted-foreground">
            {row.original.completedActivities}/{row.original.totalActivities} act.
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const grade = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <ViewGradesDialog grade={grade}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
            </ViewGradesDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <StudentProgressDialog studentId={grade.studentId}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Reporte de progreso
                  </DropdownMenuItem>
                </StudentProgressDialog>
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
          placeholder="Buscar por estudiante o curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={courseFilter} onValueChange={setCourseFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Curso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {getUniqueCourses().map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="ACTIVE">Activos</SelectItem>
          <SelectItem value="COMPLETED">Completados</SelectItem>
          <SelectItem value="PAUSED">Pausados</SelectItem>
          <SelectItem value="CANCELLED">Cancelados</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={filteredGrades}
      toolbar={toolbar}
      emptyMessage="No se encontraron calificaciones que coincidan con los filtros."
    />
  )
}
