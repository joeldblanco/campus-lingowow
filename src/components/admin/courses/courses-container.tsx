import { getAllCourses, getCourseStats } from '@/lib/actions/courses'
import { CoursesTable } from './courses-table'
import { CoursesStats } from './courses-stats'
import { CreateCourseDialog } from './create-course-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export async function CoursesContainer() {
  const [courses, stats] = await Promise.all([
    getAllCourses(),
    getCourseStats(),
  ])

  return (
    <div className="space-y-6">
      <CoursesStats stats={stats} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Cursos</h2>
        <CreateCourseDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Curso
          </Button>
        </CreateCourseDialog>
      </div>

      <CoursesTable courses={courses} />
    </div>
  )
}
