'use client'

import { useState, useEffect, useMemo } from 'react'
import { StudentGradeData } from '@/lib/actions/grades'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
} from '@/components/ui/dropdown-menu'
import { ViewGradesDialog } from './view-grades-dialog'
import { StudentProgressDialog } from './student-progress-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreVertical, Eye, TrendingUp, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

interface GradesTableProps {
  grades: StudentGradeData[]
}

const ITEMS_PER_PAGE = 5

export function GradesTable({ grades }: GradesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])

  // Filter grades based on search and filters
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

  // Pagination
  const totalPages = Math.ceil(filteredGrades.length / ITEMS_PER_PAGE)
  const paginatedGrades = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredGrades.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredGrades, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, courseFilter, statusFilter])

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGrades(paginatedGrades.map(g => `${g.studentId}-${g.courseId}`))
    } else {
      setSelectedGrades([])
    }
  }

  const handleSelectGrade = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedGrades(prev => [...prev, id])
    } else {
      setSelectedGrades(prev => prev.filter(i => i !== id))
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCourseFilter('all')
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

  return (
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedGrades.length === paginatedGrades.length && paginatedGrades.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estudiante</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Curso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Progreso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Promedio</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron calificaciones que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              paginatedGrades.map((grade) => {
                const gradeId = `${grade.studentId}-${grade.courseId}`
                return (
                  <TableRow key={gradeId} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedGrades.includes(gradeId)}
                        onCheckedChange={(checked) => handleSelectGrade(gradeId, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs bg-slate-200">
                            {grade.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{grade.studentName}</div>
                          <div className="text-xs text-muted-foreground">{grade.studentEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{grade.courseTitle}</div>
                        <div className="text-xs text-muted-foreground">{grade.courseLevel}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(grade.enrollmentStatus)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={grade.enrollmentProgress} className="w-[60px] h-2" />
                        <span className="text-xs font-medium">{Math.round(grade.enrollmentProgress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <span className={`text-lg font-bold ${getScoreColor(grade.averageScore)}`}>
                          {grade.averageScore}%
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {grade.completedActivities}/{grade.totalActivities} act.
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredGrades.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredGrades.length)}</span> de{' '}
            <span className="font-medium">{filteredGrades.length}</span> resultados
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
    </div>
  )
}
