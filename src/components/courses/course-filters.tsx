'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface Course {
  id: string
  language: string
  level: string
  isEnrolled: boolean
}

interface Filters {
  language: string
  level: string
  status: string
}

interface CourseFiltersProps {
  courses: Course[]
  filters: Filters
  onFilterChange: (filters: Filters) => void
  isAuthenticated: boolean
}

export function CourseFilters({ courses, filters, onFilterChange, isAuthenticated }: CourseFiltersProps) {
  const languages = Array.from(new Set(courses.map(course => course.language)))
  const levels = Array.from(new Set(courses.map(course => course.level)))
  
  const hasActiveFilters = filters.language !== 'all' || filters.level !== 'all' || filters.status !== 'all'

  const clearFilters = () => {
    onFilterChange({
      language: 'all',
      level: 'all',
      status: 'all'
    })
  }

  const removeFilter = (filterType: keyof Filters) => {
    onFilterChange({
      ...filters,
      [filterType]: 'all'
    })
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select
          value={filters.language}
          onValueChange={(value) => onFilterChange({ ...filters, language: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los idiomas</SelectItem>
            {languages.map(language => (
              <SelectItem key={language} value={language}>
                {language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.level}
          onValueChange={(value) => onFilterChange({ ...filters, level: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {levels.map(level => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAuthenticated && (
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enrolled">Mis cursos</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.language !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Idioma: {filters.language}
              <button
                onClick={() => removeFilter('language')}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.level !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Nivel: {filters.level}
              <button
                onClick={() => removeFilter('level')}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Estado: {filters.status === 'enrolled' ? 'Mis cursos' : 'Disponibles'}
              <button
                onClick={() => removeFilter('status')}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
