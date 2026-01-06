'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, Layers, GraduationCap, Sparkles } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  language: string
  level: string
  image: string | null
  isPersonalized: boolean
  isSynchronous: boolean
  studentCount: number
  moduleCount: number
  lessonCount: number
  isActive: boolean
}

interface TeacherCoursesViewProps {
  courses: Course[]
}

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
  it: '🇮🇹',
}

export function TeacherCoursesView({ courses }: TeacherCoursesViewProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tienes cursos asignados</h3>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne cursos.
        </p>
      </div>
    )
  }

  const activeCourses = courses.filter((c) => c.isActive)
  const assignedCourses = courses.filter((c) => !c.isActive)

  return (
    <div className="space-y-8">
      {activeCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Cursos Activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {assignedCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            Cursos Asignados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  const flag = languageFlags[course.language] || '🌐'

  return (
    <Link href={`/teacher/courses/${course.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{flag}</span>
              <Badge variant={course.isActive ? 'default' : 'secondary'}>
                {course.isActive ? 'Activo' : 'Asignado'}
              </Badge>
            </div>
            {course.isPersonalized && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Personalizado
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors mt-2">
            {course.title}
          </CardTitle>
          <CardDescription className="line-clamp-2">{course.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.studentCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              <span>{course.moduleCount} módulos</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.lessonCount} lecciones</span>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="outline">{course.level}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
