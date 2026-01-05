'use client'

import { useState, useEffect, useCallback } from 'react'
import { RecordingCard } from './recording-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Calendar,
  Filter,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Video,
  Loader2
} from 'lucide-react'
import { getStudentRecordings, getStudentCoursesForFilter } from '@/lib/actions/recordings'

interface Course {
  id: string
  title: string
  language: string
  level: string
}

interface Recording {
  id: string
  bookingId: string
  status: string
  duration: number | null
  startedAt: Date | null
  endedAt: Date | null
  booking: {
    id: string
    day: string
    timeSlot: string
    student: {
      id: string
      name: string
      lastName: string | null
      image: string | null
    }
    teacher: {
      id: string
      name: string
      lastName: string | null
      image: string | null
    }
    enrollment: {
      course: {
        id: string
        title: string
        language: string
        level: string
      }
    }
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function RecordingsLibrary() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('READY')
  const [dateRange, setDateRange] = useState<string>('all')

  const fetchRecordings = useCallback(async () => {
    setLoading(true)
    try {
      const options: {
        page: number
        limit: number
        courseId?: string
        status?: string
        dateFrom?: string
        dateTo?: string
      } = {
        page: pagination.page,
        limit: pagination.limit,
      }

      if (selectedCourse !== 'all') {
        options.courseId = selectedCourse
      }

      if (selectedStatus !== 'all') {
        options.status = selectedStatus
      }

      // Calcular fechas según el rango seleccionado
      if (dateRange !== 'all') {
        const now = new Date()
        let dateFrom: Date | undefined

        switch (dateRange) {
          case 'week':
            dateFrom = new Date(now.setDate(now.getDate() - 7))
            break
          case 'month':
            dateFrom = new Date(now.setMonth(now.getMonth() - 1))
            break
          case '3months':
            dateFrom = new Date(now.setMonth(now.getMonth() - 3))
            break
        }

        if (dateFrom) {
          options.dateFrom = dateFrom.toISOString().split('T')[0]
        }
      }

      const result = await getStudentRecordings(options)
      
      if (result.success && result.data) {
        setRecordings(result.data as Recording[])
        if (result.pagination) {
          setPagination(result.pagination)
        }
      }
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, selectedCourse, selectedStatus, dateRange])

  const fetchCourses = useCallback(async () => {
    try {
      const result = await getStudentCoursesForFilter()
      if (result.success && result.data) {
        setCourses(result.data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  // Filtrar por búsqueda local
  const filteredRecordings = recordings.filter(recording => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      recording.booking.enrollment.course.title.toLowerCase().includes(query) ||
      recording.booking.teacher.name.toLowerCase().includes(query) ||
      (recording.booking.teacher.lastName?.toLowerCase().includes(query) ?? false)
    )
  })

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Grabaciones</h1>
          <p className="text-muted-foreground mt-1">
            Accede a las grabaciones de tus clases pasadas
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por curso, profesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por curso */}
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cursos</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por fecha */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fechas</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por estado */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="READY">Disponibles</SelectItem>
              <SelectItem value="PROCESSING">Procesando</SelectItem>
              <SelectItem value="ARCHIVED">Archivadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Video className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay grabaciones</h3>
          <p className="text-muted-foreground max-w-md">
            Aún no tienes grabaciones de clases disponibles. Las grabaciones aparecerán aquí después de completar tus clases.
          </p>
        </div>
      ) : (
        <>
          {/* Grid de grabaciones */}
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'flex flex-col gap-4'
          }>
            {filteredRecordings.map(recording => (
              <RecordingCard key={recording.id} recording={recording} />
            ))}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
