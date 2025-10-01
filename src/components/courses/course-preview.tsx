'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Lock, 
  User,
  ArrowLeft,
  Play,
  CheckCircle
} from 'lucide-react'

interface CoursePreviewProps {
  course: {
    id: string
    title: string
    description: string
    language: string
    level: string
    createdBy: {
      name: string
      bio?: string | null
    }
    modules: Array<{
      id: string
      title: string
      description?: string | null
      level: number
      order: number
      isPublished: boolean
      lessons: Array<{
        id: string
        title: string
        description: string
        order: number
        contents: Array<{
          id: string
          title: string
          description: string
          contentType: string
          order: number
        }>
      }>
      _count: {
        lessons: number
      }
    }>
    _count: {
      modules: number
      enrollments: number
    }
    isEnrolled: boolean
  }
  isAuthenticated: boolean
}

export function CoursePreview({ course, isAuthenticated }: CoursePreviewProps) {
  const totalLessons = course.modules.reduce((total, module) => total + module._count.lessons, 0)
  const totalContents = course.modules.reduce((total, module) => 
    total + module.lessons.reduce((lessonTotal, lesson) => lessonTotal + lesson.contents.length, 0), 0
  )

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
      default:
        return '🌐'
    }
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'GRAMMAR_CARD':
        return '📝'
      case 'LEVELED_TEXT':
        return '📖'
      case 'THEMATIC_GLOSSARY':
        return '📚'
      case 'DOWNLOADABLE_RESOURCE':
        return '📄'
      case 'ACTIVITY':
        return '🎯'
      case 'VIDEO':
        return '🎥'
      case 'PODCAST':
        return '🎧'
      default:
        return '📋'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Cursos
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getLanguageFlag(course.language)}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getLevelColor(course.level)}>
                    {course.level}
                  </Badge>
                  <Badge variant="outline">
                    {course.language}
                  </Badge>
                  {course.isEnrolled && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Inscrito
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-lg text-gray-600 max-w-2xl">
              {course.description}
            </p>

            {/* Course Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{course._count.modules} módulos</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{totalLessons} lecciones</span>
              </div>
              <div className="flex items-center gap-1">
                <Play className="w-4 h-4" />
                <span>{totalContents} contenidos</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{course._count.enrollments} estudiantes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {course.isEnrolled ? (
              <Button asChild size="lg">
                <Link href={`/courses/${course.id}`}>
                  <Play className="w-4 h-4 mr-2" />
                  Continuar Curso
                </Link>
              </Button>
            ) : isAuthenticated ? (
              <Button asChild size="lg">
                <Link href={`/courses/${course.id}/enroll`}>
                  Inscribirse al Curso
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/auth/signin">
                  <Lock className="w-4 h-4 mr-2" />
                  Iniciar Sesión para Inscribirse
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Instructor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Instructor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold">{course.createdBy.name}</h3>
              {course.createdBy.bio && (
                <p className="text-gray-600">{course.createdBy.bio}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Content Preview */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Contenido del Curso</h2>
        
        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Módulo {moduleIndex + 1}: {module.title}
                    </CardTitle>
                    {module.description && (
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{module._count.lessons} lecciones</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-0">
                  {module.lessons.slice(0, 3).map((lesson, lessonIndex) => (
                    <div key={lesson.id} className="p-4 border-b last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">
                            {lessonIndex + 1}. {lesson.title}
                          </h4>
                          <p className="text-sm text-gray-600">{lesson.description}</p>
                          
                          {/* Content Preview */}
                          <div className="flex items-center gap-2 mt-2">
                            {lesson.contents.slice(0, 3).map((content) => (
                              <div key={content.id} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                <span>{getContentTypeIcon(content.contentType)}</span>
                                <span>{content.title}</span>
                              </div>
                            ))}
                            {lesson.contents.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{lesson.contents.length - 3} más
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center text-gray-400">
                          {course.isEnrolled ? (
                            <Play className="w-5 h-5" />
                          ) : (
                            <Lock className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {module.lessons.length > 3 && (
                    <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                      +{module.lessons.length - 3} lecciones más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      {!course.isEnrolled && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">¿Listo para comenzar?</h3>
            <p className="text-gray-600 mb-4">
              Inscríbete ahora y accede a todo el contenido del curso
            </p>
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link href={`/courses/${course.id}/enroll`}>
                  Inscribirse al Curso
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/auth/signin">
                  <Lock className="w-4 h-4 mr-2" />
                  Iniciar Sesión para Inscribirse
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
