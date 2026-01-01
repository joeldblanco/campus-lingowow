'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Target,
  Trophy,
  User,
} from 'lucide-react'
import Link from 'next/link'
import type { StudentLessonListItem } from '@/types/student-lesson'

interface PersonalizedLessonsViewProps {
  course: {
    id: string
    title: string
    description: string | null
    language: string
    level: string
  }
  enrollment: {
    id: string
    status: string
    progress: number
    enrollmentDate: Date
    lastAccessed?: Date | null
  }
  lessons: StudentLessonListItem[]
  teacher?: {
    name: string
    lastName: string
    image?: string | null
  }
}

export function PersonalizedLessonsView({
  course,
  enrollment,
  lessons,
  teacher,
}: PersonalizedLessonsViewProps) {
  const completedLessons = lessons.filter((l) => l.progress?.completed).length
  const totalProgress =
    lessons.length > 0
      ? lessons.reduce((sum, l) => sum + (l.progress?.percentage ?? 0), 0) / lessons.length
      : 0

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
              <Badge className="bg-purple-100 text-purple-800">
                <User className="w-3 h-3 mr-1" />
                Personalizado
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-lg text-gray-600">{course.description}</p>

        {/* Teacher Info */}
        {teacher && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tu profesor(a)</p>
              <p className="font-medium">
                {teacher.name} {teacher.lastName}
              </p>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Target className="w-5 h-5" />
              Tu Progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-purple-900">Progreso General</span>
              <span className="text-sm font-bold text-purple-900">
                {Math.round(totalProgress)}%
              </span>
            </div>
            <Progress value={totalProgress} className="h-3" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {completedLessons} de {lessons.length} lecciones completadas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span>{Math.round(totalProgress)}% completado</span>
              </div>
            </div>

            {enrollment.lastAccessed && (
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                <Calendar className="w-4 h-4" />
                <span>
                  Último acceso: {new Date(enrollment.lastAccessed).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personalized Lessons */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Mis Lecciones Personalizadas
        </h2>

        {lessons.length > 0 ? (
          <div className="space-y-4">
            {lessons.map((lesson, index) => {
              const isCompleted = lesson.progress?.completed
              const progressPercentage = lesson.progress?.percentage ?? 0

              return (
                <Card
                  key={lesson.id}
                  className={`transition-all hover:shadow-md ${
                    isCompleted ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
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
                            {progressPercentage > 0 && !isCompleted && (
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {Math.round(progressPercentage)}% completado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {!isCompleted && progressPercentage > 0 && (
                          <div className="w-24 hidden sm:block">
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        )}

                        <Button
                          asChild
                          variant={isCompleted ? 'outline' : 'default'}
                          className={isCompleted ? 'border-green-500 text-green-700' : ''}
                        >
                          <Link
                            href={`/my-courses/${course.id}/personalized/${lesson.id}`}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {isCompleted
                              ? 'Revisar'
                              : progressPercentage > 0
                              ? 'Continuar'
                              : 'Comenzar'}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <BookOpen className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">Aún no tienes lecciones asignadas</p>
              <p className="text-sm">
                Tu profesor(a) creará contenido personalizado para ti muy pronto.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
