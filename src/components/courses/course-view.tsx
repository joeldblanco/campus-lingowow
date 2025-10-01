'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Users, 
  Clock, 
  User,
  ArrowLeft,
  Play,
  CheckCircle,
  Calendar,
  Trophy,
  Target
} from 'lucide-react'

interface CourseViewProps {
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
    enrollment?: {
      id: string
      status: string
      progress: number
      enrollmentDate: Date
      lastAccessed?: Date | null
    } | null
  }
  progress?: {
    enrollment: {
      id: string
      status: string
      progress: number
      enrollmentDate: Date
      lastAccessed?: Date | null
    }
    totalContents: number
    completedContents: number
    progressPercentage: number
    completedContentIds: string[]
    completedActivities: Array<{
      activityId: string
      status: string
      score?: number | null
      completedAt?: Date | null
    }>
  } | null
}

export function CourseView({ course, progress }: CourseViewProps) {
  const totalLessons = course.modules.reduce((total, module) => total + module._count.lessons, 0)
  const totalContents = progress?.totalContents || 0
  const completedContents = progress?.completedContents || 0
  const progressPercentage = progress?.progressPercentage || course.enrollment?.progress || 0

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

  const isContentCompleted = (contentId: string) => {
    return progress?.completedContentIds.includes(contentId) || false
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Mis Cursos
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Inscrito
                  </Badge>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-gray-600">
              {course.description}
            </p>

            {/* Progress Overview */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Target className="w-5 h-5" />
                  Tu Progreso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Progreso General</span>
                  <span className="text-sm font-bold text-blue-900">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{completedContents} de {totalContents} completados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span>{progress?.completedActivities.length || 0} actividades</span>
                  </div>
                </div>

                {course.enrollment?.lastAccessed && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                    <Calendar className="w-4 h-4" />
                    <span>Último acceso: {new Date(course.enrollment.lastAccessed).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Módulos</span>
                </div>
                <span className="font-medium">{course._count.modules}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Lecciones</span>
                </div>
                <span className="font-medium">{totalLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Contenidos</span>
                </div>
                <span className="font-medium">{totalContents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Estudiantes</span>
                </div>
                <span className="font-medium">{course._count.enrollments}</span>
              </div>
            </CardContent>
          </Card>

          {/* Instructor */}
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
                  <p className="text-sm text-gray-600">{course.createdBy.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Modules */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Contenido del Curso</h2>
        
        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => {
            const moduleProgress = module.lessons.reduce((total, lesson) => {
              const completedInLesson = lesson.contents.filter(content => 
                isContentCompleted(content.id)
              ).length
              return total + completedInLesson
            }, 0)
            
            const totalModuleContents = module.lessons.reduce((total, lesson) => 
              total + lesson.contents.length, 0
            )
            
            const moduleProgressPercentage = totalModuleContents > 0 
              ? (moduleProgress / totalModuleContents) * 100 
              : 0

            return (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">
                        Módulo {moduleIndex + 1}: {module.title}
                      </CardTitle>
                      {module.description && (
                        <p className="text-sm text-gray-600">{module.description}</p>
                      )}
                      
                      {/* Module Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Progreso del módulo</span>
                          <span>{Math.round(moduleProgressPercentage)}%</span>
                        </div>
                        <Progress value={moduleProgressPercentage} className="h-1" />
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {moduleProgress} de {totalModuleContents}
                      </div>
                      <div className="text-xs text-gray-400">
                        {module._count.lessons} lecciones
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const lessonProgress = lesson.contents.filter(content => 
                        isContentCompleted(content.id)
                      ).length
                      const isLessonCompleted = lessonProgress === lesson.contents.length
                      
                      return (
                        <div key={lesson.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {lessonIndex + 1}. {lesson.title}
                                </h4>
                                {isLessonCompleted && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{lesson.description}</p>
                              
                              {/* Content List */}
                              <div className="space-y-1">
                                {lesson.contents.map((content) => (
                                  <div key={content.id} className="flex items-center gap-2 text-xs">
                                    <span>{getContentTypeIcon(content.contentType)}</span>
                                    <span className={`flex-1 ${isContentCompleted(content.id) ? 'line-through text-gray-400' : ''}`}>
                                      {content.title}
                                    </span>
                                    {isContentCompleted(content.id) && (
                                      <CheckCircle className="w-3 h-3 text-green-600" />
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                {lessonProgress} de {lesson.contents.length} contenidos completados
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button asChild size="sm">
                                <Link href={`/courses/${course.id}/lessons/${lesson.id}`}>
                                  <Play className="w-4 h-4 mr-2" />
                                  {lessonProgress > 0 ? 'Continuar' : 'Comenzar'}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
