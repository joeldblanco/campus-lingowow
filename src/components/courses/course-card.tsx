'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookOpen, CheckCircle, Clock, Eye, Lock, Play, Users } from 'lucide-react'
import Link from 'next/link'

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

interface CourseCardProps {
  course: Course
  isEnrolled: boolean
  isAuthenticated: boolean
}

export function CourseCard({ course, isEnrolled, isAuthenticated }: CourseCardProps) {
  const totalLessons = course.modules.reduce((total, module) => total + module._count.lessons, 0)
  const progress = course.enrollment?.progress || 0

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
      case 'principiante':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
      case 'intermedio':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
      case 'avanzado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLanguageFlag = (language: string) => {
    switch (language.toLowerCase()) {
      case 'english':
      case 'inglés':
        return '🇺🇸'
      case 'spanish':
      case 'español':
        return '🇪🇸'
      case 'french':
      case 'francés':
        return '🇫🇷'
      case 'german':
      case 'alemán':
        return '🇩🇪'
      case 'italian':
      case 'italiano':
        return '🇮🇹'
      case 'portuguese':
      case 'portugués':
        return '🇵🇹'
      default:
        return '🌐'
    }
  }

  return (
    <Card
      className={`h-full transition-all duration-200 hover:shadow-lg ${
        isEnrolled ? 'border-blue-200 bg-blue-50/30' : 'hover:border-gray-300'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getLanguageFlag(course.language)}</span>
            <Badge variant="secondary" className={getLevelColor(course.level)}>
              {course.level}
            </Badge>
            {isEnrolled && (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Inscrito
              </Badge>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-lg leading-tight line-clamp-2">{course.title}</h3>

        <p className="text-sm text-gray-600 line-clamp-3">{course.description}</p>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="space-y-3">
          {/* Progress Bar for Enrolled Students */}
          {isEnrolled && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progreso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Course Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course._count.modules} módulos</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalLessons} lecciones</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course._count.enrollments}</span>
            </div>
          </div>

          {/* Instructor */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Instructor:</span> {course.createdBy.name}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full space-y-2">
          {isEnrolled ? (
            // Enrolled Student Actions
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href={`/my-courses/${course.id}`}>
                  <Play className="w-4 h-4 mr-2" />
                  Continuar Curso
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/my-courses/${course.id}/overview`}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ) : (
            // Non-enrolled User Actions
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/my-courses/${course.id}/preview`}>
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Link>
              </Button>
              {isAuthenticated ? (
                <Button asChild>
                  <Link href={`/my-courses/${course.id}/enroll`}>Inscribirse</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/auth/signin">
                    <Lock className="w-4 h-4 mr-2" />
                    Iniciar Sesión
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
