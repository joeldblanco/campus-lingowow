'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Clock, ClipboardList, Play, Target, Trophy, User } from 'lucide-react'
import Link from 'next/link'

interface CourseExam {
  id: string
  title: string
  description: string
  timeLimit: number | null
  passingScore: number
  maxAttempts: number
  questionCount: number
  totalPoints: number
  isPublished: boolean
}

interface CourseViewProps {
  course: {
    id: string
    title: string
    description: string | null
    language: string
    level: string
    isPersonalized?: boolean
    exams?: CourseExam[]
    createdBy: {
      name: string
      bio?: string | null
    }
    modules: Array<{
      id: string
      title: string
      description?: string | null
      level: string
      order: number
      isPublished: boolean
      lessons: Array<{
        id: string
        title: string
        description: string | null
        order: number
        contents: Array<{
          id: string
          title: string
          description: string | null
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
      studentLessons?: Array<{
        id: string
        title: string
        description: string | null
        order: number
        duration: number
        isPublished: boolean
        videoUrl?: string | null
        summary?: string | null
      }>
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

  
  const isContentCompleted = (contentId: string) => {
    return progress?.completedContentIds.includes(contentId) || false
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/my-courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Mis Cursos
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getLanguageFlag(course.language)}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
              <Badge variant="outline">{course.language}</Badge>
              <Badge className="bg-blue-100 text-blue-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Inscrito
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-lg text-gray-600">{course.description}</p>

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
              <span className="text-sm font-bold text-blue-900">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {completedContents} de {totalContents} completados
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span>{progress?.completedActivities.length || 0} actividades</span>
              </div>
            </div>

            {course.enrollment?.lastAccessed && (
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                <Calendar className="w-4 h-4" />
                <span>
                  Último acceso: {new Date(course.enrollment.lastAccessed).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personalized Lessons Section - Only for personalized courses */}
      {course.isPersonalized && course.enrollment?.studentLessons && course.enrollment.studentLessons.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Mis Lecciones Personalizadas
          </h2>
          <div className="space-y-4">
            {course.enrollment.studentLessons.map((lesson, index) => (
              <Card
                key={lesson.id}
                className="transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-purple-100 text-purple-700">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {lesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration} min
                          </span>
                          <Badge className="bg-purple-100 text-purple-800">
                            <User className="w-3 h-3 mr-1" />
                            Personalizado
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button asChild>
                        <Link href={`/my-courses/${course.id}/personalized/${lesson.id}`}>
                          <Play className="w-4 h-4 mr-2" />
                          Comenzar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Course Modules */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Contenido del Curso</h2>

        {course.modules.length > 0 ? (
          <div className="space-y-4">
            <Accordion type="multiple" className="space-y-4">
              {course.modules.map((module, moduleIndex) => {
                const moduleProgress = module.lessons.reduce((total, lesson) => {
                  const completedInLesson = lesson.contents.filter((content) =>
                    isContentCompleted(content.id)
                  ).length
                  return total + completedInLesson
                }, 0)

                const totalModuleContents = module.lessons.reduce(
                  (total, lesson) => total + lesson.contents.length,
                  0
                )

                const moduleProgressPercentage =
                  totalModuleContents > 0 ? (moduleProgress / totalModuleContents) * 100 : 0

                return (
                  <AccordionItem
                    key={module.id}
                    value={module.id}
                    className="border rounded-lg bg-white px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 pr-4 text-left">
                        <div className="space-y-1 flex-1">
                          <div className="font-semibold text-lg">
                            Módulo {moduleIndex + 1}: {module.title}
                          </div>
                          {module.description && (
                            <p className="text-sm text-gray-600 font-normal">{module.description}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 min-w-[200px]">
                          <div className="w-full space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Progreso</span>
                              <span>{Math.round(moduleProgressPercentage)}%</span>
                            </div>
                            <Progress value={moduleProgressPercentage} className="h-2" />
                          </div>
                          <div className="text-xs text-gray-400 font-normal">
                            {moduleProgress} de {totalModuleContents} contenidos • {module._count.lessons} lecciones
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-0 pb-4">
                      <div className="pl-4 border-l-2 border-gray-100 ml-2 space-y-0 mt-2">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const lessonProgress = lesson.contents.filter((content) =>
                            isContentCompleted(content.id)
                          ).length
                          const isLessonCompleted = lessonProgress === lesson.contents.length

                          return (
                            <div
                              key={lesson.id}
                              className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors rounded-r-lg"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">
                                      {lessonIndex + 1}. {lesson.title}
                                    </h4>
                                    {isLessonCompleted && (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                                </div>

                                <div className="shrink-0">
                                  <Button asChild size="sm" variant={lessonProgress > 0 && !isLessonCompleted ? "default" : "outline"}>
                                    <Link href={`/my-courses/${course.id}/lessons/${lesson.id}`}>
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
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Target className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">Este curso aún no tiene contenido publicado.</p>
              <p className="text-sm">Vuelve pronto para ver las lecciones.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exams Section */}
      {course.exams && course.exams.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Exámenes
          </h2>
          <div className="grid gap-4">
            {course.exams.filter(exam => exam.isPublished).map((exam) => (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {exam.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                        {exam.timeLimit && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exam.timeLimit} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {exam.questionCount} preguntas
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {exam.passingScore}% para aprobar
                        </span>
                        <Badge variant="outline">
                          {exam.maxAttempts} intento{exam.maxAttempts !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button asChild>
                        <Link href={`/exams/${exam.id}/take`}>
                          <Play className="w-4 h-4 mr-2" />
                          Comenzar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
