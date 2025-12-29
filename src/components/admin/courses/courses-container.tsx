'use client'

import { useState, useEffect } from 'react'
import { getAllCourses } from '@/lib/actions/courses'
import { CourseWithDetails } from '@/types/course'
import { CoursesTable } from './courses-table'
import { CreateCourseDialog } from './create-course-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CoursesLoadingSkeleton } from './courses-loading-skeleton'

export function CoursesContainer() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const coursesData = await getAllCourses()
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading courses data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return <CoursesLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Cursos</h1>
          <p className="text-muted-foreground">
            Administra todos los cursos disponibles en la plataforma.
          </p>
        </div>
        <CreateCourseDialog onCourseCreated={() => loadData(false)}>
          <Button data-testid="create-course-button" className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Button>
        </CreateCourseDialog>
      </div>

      <CoursesTable courses={courses} onCourseUpdated={() => loadData(false)} data-testid="courses-table" />
    </div>
  )
}
