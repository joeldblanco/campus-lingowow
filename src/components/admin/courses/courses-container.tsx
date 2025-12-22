'use client'

import { useState, useEffect } from 'react'
import { getAllCourses, getCourseStats } from '@/lib/actions/courses'
import { CourseWithDetails, CourseStats } from '@/types/course'
import { CoursesTable } from './courses-table'
import { CoursesStats } from './courses-stats'
import { CreateCourseDialog } from './create-course-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CoursesLoadingSkeleton } from './courses-loading-skeleton'

export function CoursesContainer() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [stats, setStats] = useState<CourseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const [coursesData, statsData] = await Promise.all([getAllCourses(), getCourseStats()])
      console.log(statsData)
      setCourses(coursesData)
      setStats(statsData)
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
      {stats && <CoursesStats stats={stats} />}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Cursos</h2>
        <CreateCourseDialog onCourseCreated={() => loadData(false)}>
          <Button data-testid="create-course-button" className="create-course-btn">
            <Plus className="h-4 w-4 mr-2" />
            Crear Curso
          </Button>
        </CreateCourseDialog>
      </div>

      <CoursesTable courses={courses} onCourseUpdated={() => loadData(false)} data-testid="courses-table" />
    </div>
  )
}
