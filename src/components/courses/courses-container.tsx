'use client'

import { CourseCard } from '@/components/courses/course-card'
import { CourseFilters } from '@/components/courses/course-filters'
import { useState } from 'react'

interface Course {
  id: string
  title: string
  description: string
  language: string
  level: string
  createdBy: {
    name: string
  }
  modules: Array<{
    id: string
    title: string
    isPublished: boolean
    _count: {
      lessons: number
    }
  }>
  _count: {
    modules: number
    enrollments: number
  }
  isEnrolled: boolean
  enrollment?: {
    id: string
    status: string
    progress: number
    enrollmentDate: Date
  } | null
}

interface CoursesContainerProps {
  courses: Course[]
  isAuthenticated: boolean
}

export function CoursesContainer({ courses, isAuthenticated }: CoursesContainerProps) {
  const [filteredCourses, setFilteredCourses] = useState(courses)
  const [filters, setFilters] = useState({
    language: 'all',
    level: 'all',
    status: 'all', // all, enrolled, available
  })

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)

    const filtered = courses.filter((course) => {
      // Language filter
      if (newFilters.language !== 'all' && course.language !== newFilters.language) {
        return false
      }

      // Level filter
      if (newFilters.level !== 'all' && course.level !== newFilters.level) {
        return false
      }

      // Status filter
      if (newFilters.status === 'enrolled' && !course.isEnrolled) {
        return false
      }
      if (newFilters.status === 'available' && course.isEnrolled) {
        return false
      }

      return true
    })

    setFilteredCourses(filtered)
  }

  const enrolledCourses = courses.filter((course) => course.isEnrolled)

  return (
    <div className="space-y-8">
      <CourseFilters
        courses={courses}
        filters={filters}
        onFilterChange={handleFilterChange}
        isAuthenticated={isAuthenticated}
      />

      {/* Enrolled Courses Section */}
      {isAuthenticated && enrolledCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mis Cursos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses
              .filter((course) => {
                if (filters.language && course.language !== filters.language) return false
                if (filters.level && course.level !== filters.level) return false
                if (filters.status === 'available') return false
                return true
              })
              .map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isEnrolled={true}
                  isAuthenticated={isAuthenticated}
                />
              ))}
          </div>
        </section>
      )}

      {/* Available Courses Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {isAuthenticated && enrolledCourses.length > 0
            ? 'Cursos Disponibles'
            : 'Todos los Cursos'}
        </h2>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cursos</h3>
            <p className="text-gray-500">Intenta ajustar los filtros para ver más resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses
              .filter(() => {
                if (filters.status === 'enrolled') return false
                return true
              })
              .map((courseItem) => (
                <CourseCard
                  key={courseItem.id}
                  course={courseItem}
                  isEnrolled={courseItem.isEnrolled}
                  isAuthenticated={isAuthenticated}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
