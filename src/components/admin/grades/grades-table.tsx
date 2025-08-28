'use client'

import { useState, useEffect, useCallback } from 'react'
import { StudentGradeData } from '@/lib/actions/grades'
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
} from '@/components/ui/dropdown-menu'
import { ViewGradesDialog } from './view-grades-dialog'
import { StudentProgressDialog } from './student-progress-dialog'
import { MoreHorizontal, Eye, TrendingUp, User, BookOpen, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GradesTableProps {
  grades: StudentGradeData[]
}

export function GradesTable({ grades }: GradesTableProps) {
  const [filteredGrades, setFilteredGrades] = useState(grades)
  const [searchTerm, setSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter grades based on search and filters
  const handleFilter = useCallback(() => {
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

    if (languageFilter !== 'all') {
      filtered = filtered.filter((grade) => grade.courseLanguage === languageFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((grade) => grade.enrollmentStatus === statusFilter)
    }

    setFilteredGrades(filtered)
  }, [grades, searchTerm, courseFilter, languageFilter, statusFilter])

  // Apply filters when search term or filters change
  useEffect(() => {
    handleFilter()
  }, [handleFilter])

  const getUniqueCourses = () => {
    const courses = Array.from(new Set(grades.map((g) => g.courseId)))
      .map((id) => grades.find((g) => g.courseId === id)!)
      .map((g) => ({ id: g.courseId, title: g.courseTitle }))
    return courses
  }

  const getUniqueLanguages = () => {
    return Array.from(new Set(grades.map((g) => g.courseLanguage)))
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Muy Bueno</Badge>
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Bueno</Badge>
    if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Regular</Badge>
    return <Badge variant="destructive">Necesita Mejora</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Activo</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>
      case 'PAUSED':
        return <Badge variant="secondary">Pausado</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
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
          placeholder="Buscar por estudiante o curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {getUniqueCourses().map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {getUniqueLanguages().map((language) => (
              <SelectItem key={language} value={language}>
                {language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
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
      </div>

      {/* Grades List */}
      <div className="space-y-4">
        {filteredGrades.map((grade) => (
          <Card
            key={`${grade.studentId}-${grade.courseId}`}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{grade.studentName}</p>
                        <p className="text-sm text-muted-foreground">{grade.studentEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{grade.courseTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {grade.courseLanguage} - {grade.courseLevel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(grade.enrollmentStatus)}
                    <Badge variant="outline">
                      Progreso: {Math.round(grade.enrollmentProgress)}%
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Inscrito: {formatDate(grade.enrollmentDate)}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Promedio</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{grade.averageScore}%</span>
                          {getScoreBadge(grade.averageScore)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Actividades</p>
                        <p className="text-sm text-muted-foreground">
                          {grade.completedActivities} de {grade.totalActivities} completadas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ViewGradesDialog grade={grade}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver calificaciones
                      </DropdownMenuItem>
                    </ViewGradesDialog>
                    <StudentProgressDialog studentId={grade.studentId}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Reporte de progreso
                      </DropdownMenuItem>
                    </StudentProgressDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGrades.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No se encontraron calificaciones que coincidan con los filtros.
          </p>
        </div>
      )}
    </div>
  )
}
